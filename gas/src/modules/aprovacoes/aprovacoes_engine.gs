/**
 * @file modules/aprovacoes/aprovacoes_engine.gs
 * @layer modules/aprovacoes
 * @description Motor central de aprovações para TODOS os tipos de solicitações do sistema.
 *
 * RESPONSABILIDADES:
 *   1. Criar registros de aprovação com FSM robusto
 *   2. Transitar entre estados (pendente → em_analise → aprovada/rejeitada)
 *   3. Emitir eventos para triggers (notificações, auditoria, etc)
 *   4. Garantir idempotência (não duplicar aprovações)
 *   5. Manter rastreabilidade completa (quem, quando, por quê)
 *
 * TIPOS DE APROVAÇÃO SUPORTADOS:
 *   - 'primeiro_acesso'   : nova solicitação de acesso ao sistema
 *   - 'reserva'           : solicitação de reserva de espaço
 *   - 'permissao'         : solicitação de permissão/papel novo
 *   - 'contratacao'       : solicitação de contrato/vínculo
 *   - 'documento'         : solicitação de assinatura de documento
 *   - 'outro'             : aprovações futuras
 *
 * @depends core/services/fsm_guardian.gs, core/services/auditoria_service.gs,
 *          core/event_bus_backend.gs, core/notification_engine.gs,
 *          modules/aprovacoes/aprovacoes_repository.gs
 */

var AprovacoesEngine = (function() {

  var TIPOS_VALIDOS = ['primeiro_acesso', 'reserva', 'permissao', 'contratacao', 'documento', 'outro'];
  var STATUS_VALIDOS = ['pendente', 'em_analise', 'aprovada', 'rejeitada'];

  // ─────────────────────────────────────────────────────────────────────────
  // FSM (Finite State Machine) — transições permitidas
  // ─────────────────────────────────────────────────────────────────────────

  var FSM_TRANSITIONS = {
    'pendente':    ['em_analise', 'rejeitada'],
    'em_analise':  ['aprovada', 'rejeitada'],
    'aprovada':    [],                       // estado final
    'rejeitada':   ['em_analise']             // permite re-análise
  };

  /**
   * Valida transição de estado usando FsmGuardian.
   */
  function _validarTransicao(tipoAprovacao, statusAtual, statusNovo) {
    if (!FSM_TRANSITIONS[statusAtual] || FSM_TRANSITIONS[statusAtual].indexOf(statusNovo) === -1) {
      throw new Error(
        'Transição inválida: ' + tipoAprovacao + ' de "' + statusAtual + '" para "' + statusNovo + '"'
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // API PÚBLICA
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Cria uma nova solicitação de aprovação.
   *
   * @param {Object} params
   *   - tipo: string (uma de TIPOS_VALIDOS)
   *   - solicitanteMail: string (email do solicitante)
   *   - solicitanteNome: string (nome do solicitante)
   *   - payload: object (dados específicos do tipo)
   *   - tags: Array<string> (optional, ex: ['urgente', 'rh'])
   *
   * @returns {{ ok: boolean, id: string|null, mensagem: string }}
   */
  function criar(params) {
    try {
      params = params || {};
      var tipo = String(params.tipo || '').toLowerCase().trim();
      var solicitanteMail = String(params.solicitanteMail || '').toLowerCase().trim();
      var solicitanteNome = String(params.solicitanteNome || '').trim();
      var payload = params.payload || {};
      var tags = Array.isArray(params.tags) ? params.tags : [];

      // Validações
      if (!tipo || TIPOS_VALIDOS.indexOf(tipo) === -1) {
        throw new Error('Tipo inválido. Válidos: ' + TIPOS_VALIDOS.join(', '));
      }
      if (!solicitanteMail || solicitanteMail.indexOf('@') === -1) {
        throw new Error('Email do solicitante é obrigatório e deve ser válido.');
      }
      if (!solicitanteNome || solicitanteNome.length < 3) {
        throw new Error('Nome do solicitante é obrigatório (mín 3 caracteres).');
      }

      // Verificar se já existe uma aprovação idêntica (idempotência)
      var existente = AprovacoesRepository.buscarPorSolicitante(solicitanteMail, tipo, 'pendente');
      if (existente && existente.length > 0) {
        var prim = existente[0];
        Logger.warn('aprovacoes_engine', 'criar',
          'Aprovação já existe para ' + solicitanteMail + ' | tipo: ' + tipo + ' | id: ' + prim.id);
        return {
          ok: true,
          id: prim.id,
          mensagem: 'Solicitação já foi registrada anteriormente. Aguarde análise.'
        };
      }

      // Criar novo registro
      var novaAprovacao = {
        id:              'aprov_' + gerarId(),
        tipo:            tipo,
        status:          'pendente',
        solicitanteMail: solicitanteMail,
        solicitanteNome: solicitanteNome,
        payload:        payload,
        tags:           tags,
        solicitadoEm:   new Date().toISOString(),
        analisadoPor:   null,
        analisadoEm:    null,
        motivoRejeicao: null,
        processoId:     null,
        tarefaId:       null,
        vinculado_a:    []
      };

      // Persistir
      AprovacoesRepository.salvar(novaAprovacao);

      // Registrar auditoria
      AuditoriaService.registrar('APROVACAO_CRIADA', 'aprovacoes', {
        id: novaAprovacao.id,
        tipo: tipo,
        solicitante: solicitanteMail,
        tags: tags
      });

      // Emitir evento para trigger de notificações
      SystemEvents.emit(SystemEventTypes.SOLICITACAO_CRIADA, {
        id: novaAprovacao.id,
        tipo: tipo,
        solicitante: solicitanteMail,
        timestamp: agora()
      });

      Logger.info('aprovacoes_engine', 'criar',
        'Aprovação criada: ' + novaAprovacao.id + ' | tipo: ' + tipo + ' | solicitante: ' + solicitanteMail);

      return {
        ok: true,
        id: novaAprovacao.id,
        mensagem: 'Solicitação registrada com sucesso. Aguarde análise.'
      };

    } catch (e) {
      Logger.error('aprovacoes_engine', 'criar', e.message);
      return {
        ok: false,
        id: null,
        mensagem: 'Erro ao criar aprovação: ' + e.message
      };
    }
  }

  /**
   * Obtém uma aprovação pelo ID.
   *
   * @param {string} id
   * @returns {Object|null}
   */
  function obter(id) {
    try {
      return AprovacoesRepository.obterPorId(id);
    } catch (e) {
      Logger.error('aprovacoes_engine', 'obter', e.message);
      return null;
    }
  }

  /**
   * Lista aprovações com filtros opcionais.
   *
   * @param {Object} filtros (optional)
   *   - tipo: string
   *   - status: string
   *   - solicitanteMail: string
   *   - tags: Array<string> (busca OR)
   *
   * @returns {Array<Object>}
   */
  function listar(filtros) {
    try {
      filtros = filtros || {};
      return AprovacoesRepository.buscar(filtros);
    } catch (e) {
      Logger.error('aprovacoes_engine', 'listar', e.message);
      return [];
    }
  }

  /**
   * Aprova uma solicitação.
   *
   * @param {Object} params
   *   - id: string (ID da aprovação)
   *   - analisadoPor: string (email do admin que aprova)
   *   - notas: string (optional, notas adicionais)
   *
   * @returns {{ ok: boolean, mensagem: string }}
   */
  function aprovar(params) {
    try {
      params = params || {};
      var id = String(params.id || '').trim();
      var analisadoPor = String(params.analisadoPor || '').toLowerCase().trim();
      var notas = String(params.notas || '').trim();

      if (!id) throw new Error('ID da aprovação é obrigatório.');
      if (!analisadoPor || analisadoPor.indexOf('@') === -1) {
        throw new Error('Email do analisador é obrigatório.');
      }

      var aprovacao = obter(id);
      if (!aprovacao) throw new Error('Aprovação não encontrada: ' + id);

      // Validar transição FSM
      _validarTransicao(aprovacao.tipo, aprovacao.status, 'aprovada');

      // Usar FsmGuardian para registrar transição
      FsmGuardian.transitar('aprovacao', aprovacao.status, 'aprovada', {
        id: id,
        tipo: aprovacao.tipo,
        analisadoPor: analisadoPor
      });

      // Atualizar registro
      aprovacao.status = 'aprovada';
      aprovacao.analisadoPor = analisadoPor;
      aprovacao.analisadoEm = new Date().toISOString();
      if (notas) aprovacao.notas = notas;

      AprovacoesRepository.salvar(aprovacao);

      // Registrar auditoria
      AuditoriaService.registrar('APROVACAO_CONCEDIDA', 'aprovacoes', {
        id: id,
        tipo: aprovacao.tipo,
        solicitante: aprovacao.solicitanteMail,
        analisadoPor: analisadoPor,
        notas: notas
      });

      // Emitir evento
      SystemEvents.emit(SystemEventTypes.SOLICITACAO_APROVADA, {
        id: id,
        tipo: aprovacao.tipo,
        solicitante: aprovacao.solicitanteMail,
        analisadoPor: analisadoPor,
        timestamp: agora()
      });

      Logger.info('aprovacoes_engine', 'aprovar',
        'Aprovação concedida: ' + id + ' por ' + analisadoPor);

      return {
        ok: true,
        mensagem: 'Solicitação aprovada com sucesso.'
      };

    } catch (e) {
      Logger.error('aprovacoes_engine', 'aprovar', e.message);
      return {
        ok: false,
        mensagem: 'Erro ao aprovar: ' + e.message
      };
    }
  }

  /**
   * Rejeita uma solicitação.
   *
   * @param {Object} params
   *   - id: string
   *   - analisadoPor: string (email do admin)
   *   - motivoRejeicao: string (motivo obrigatório)
   *   - notas: string (optional)
   *
   * @returns {{ ok: boolean, mensagem: string }}
   */
  function rejeitar(params) {
    try {
      params = params || {};
      var id = String(params.id || '').trim();
      var analisadoPor = String(params.analisadoPor || '').toLowerCase().trim();
      var motivo = String(params.motivoRejeicao || '').trim();

      if (!id) throw new Error('ID da aprovação é obrigatório.');
      if (!analisadoPor || analisadoPor.indexOf('@') === -1) {
        throw new Error('Email do analisador é obrigatório.');
      }
      if (!motivo || motivo.length < 5) {
        throw new Error('Motivo da rejeição é obrigatório (mín 5 caracteres).');
      }

      var aprovacao = obter(id);
      if (!aprovacao) throw new Error('Aprovação não encontrada: ' + id);

      // Validar transição FSM
      _validarTransicao(aprovacao.tipo, aprovacao.status, 'rejeitada');

      // Usar FsmGuardian
      FsmGuardian.transitar('aprovacao', aprovacao.status, 'rejeitada', {
        id: id,
        tipo: aprovacao.tipo,
        analisadoPor: analisadoPor,
        motivo: motivo
      });

      // Atualizar registro
      aprovacao.status = 'rejeitada';
      aprovacao.analisadoPor = analisadoPor;
      aprovacao.analisadoEm = new Date().toISOString();
      aprovacao.motivoRejeicao = motivo;

      AprovacoesRepository.salvar(aprovacao);

      // Auditoria
      AuditoriaService.registrar('APROVACAO_REJEITADA', 'aprovacoes', {
        id: id,
        tipo: aprovacao.tipo,
        solicitante: aprovacao.solicitanteMail,
        analisadoPor: analisadoPor,
        motivo: motivo
      });

      // Evento
      SystemEvents.emit(SystemEventTypes.SOLICITACAO_DEVOLVIDA, {
        id: id,
        tipo: aprovacao.tipo,
        solicitante: aprovacao.solicitanteMail,
        analisadoPor: analisadoPor,
        motivo: motivo,
        timestamp: agora()
      });

      Logger.info('aprovacoes_engine', 'rejeitar',
        'Aprovação rejeitada: ' + id + ' por ' + analisadoPor + ' | motivo: ' + motivo);

      return {
        ok: true,
        mensagem: 'Solicitação rejeitada. Notificação enviada ao solicitante.'
      };

    } catch (e) {
      Logger.error('aprovacoes_engine', 'rejeitar', e.message);
      return {
        ok: false,
        mensagem: 'Erro ao rejeitar: ' + e.message
      };
    }
  }

  /**
   * Altera status para "em_analise".
   *
   * @param {Object} params { id, analisadoPor }
   * @returns {{ ok: boolean, mensagem: string }}
   */
  function iniciarAnalise(params) {
    try {
      params = params || {};
      var id = String(params.id || '').trim();
      var analisadoPor = String(params.analisadoPor || '').toLowerCase().trim();

      if (!id) throw new Error('ID é obrigatório.');
      if (!analisadoPor || analisadoPor.indexOf('@') === -1) {
        throw new Error('Email do analisador é obrigatório.');
      }

      var aprovacao = obter(id);
      if (!aprovacao) throw new Error('Aprovação não encontrada.');

      _validarTransicao(aprovacao.tipo, aprovacao.status, 'em_analise');

      FsmGuardian.transitar('aprovacao', aprovacao.status, 'em_analise', {
        id: id,
        analisadoPor: analisadoPor
      });

      aprovacao.status = 'em_analise';
      AprovacoesRepository.salvar(aprovacao);

      AuditoriaService.registrar('APROVACAO_EM_ANALISE', 'aprovacoes', {
        id: id,
        tipo: aprovacao.tipo,
        analisadoPor: analisadoPor
      });

      return { ok: true, mensagem: 'Análise iniciada.' };

    } catch (e) {
      Logger.error('aprovacoes_engine', 'iniciarAnalise', e.message);
      return { ok: false, mensagem: 'Erro: ' + e.message };
    }
  }

  /**
   * Retorna métricas de aprovações pendentes.
   *
   * @returns {Object} { total, por_tipo: { primeiro_acesso: N, ... } }
   */
  function obterMetricas() {
    try {
      var pendentes = listar({ status: 'pendente' });
      var metricas = { total: pendentes.length, por_tipo: {} };
      
      TIPOS_VALIDOS.forEach(function(tipo) {
        metricas.por_tipo[tipo] = pendentes.filter(function(a) { return a.tipo === tipo; }).length;
      });

      return metricas;
    } catch (e) {
      Logger.error('aprovacoes_engine', 'obterMetricas', e.message);
      return { total: 0, por_tipo: {} };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // API PÚBLICA (retorno)
  // ─────────────────────────────────────────────────────────────────────────

  return {
    criar:             criar,
    obter:             obter,
    listar:            listar,
    aprovar:           aprovar,
    rejeitar:          rejeitar,
    iniciarAnalise:    iniciarAnalise,
    obterMetricas:     obterMetricas
  };

})();
