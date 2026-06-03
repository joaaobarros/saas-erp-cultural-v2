/**
 * @file modules/acoes/acao_engine.gs
 * @layer modules/acoes
 * @description Engine da entidade central Ação Institucional.
 *
 * A Ação representa qualquer iniciativa executada pela organização:
 * curso, oficina, espetáculo, evento, campanha, laboratório,
 * projeto formativo, difusão, atividade territorial.
 *
 * FSM: planejada → em_producao → em_execucao → concluida → arquivada
 *      Qualquer estado não-terminal → cancelada
 *
 * REGRA: toda transição de status passa por FsmGuardian.assertValida().
 *
 * @depends acao_repository.gs, fsm_guardian.gs, auditoria_service.gs,
 *          event_bus_backend.gs, events_constants.gs, utils.gs
 */

var AcaoEngine = (function () {

  // ─── Constantes ──────────────────────────────────────────────────────────

  var ESTADOS = Object.freeze({
    PLANEJADA:    'planejada',
    EM_PRODUCAO:  'em_producao',
    EM_EXECUCAO:  'em_execucao',
    CONCLUIDA:    'concluida',
    ARQUIVADA:    'arquivada',
    CANCELADA:    'cancelada'
  });

  var TIPOS = Object.freeze({
    CURSO:               'curso',
    OFICINA:             'oficina',
    ESPETACULO:          'espetaculo',
    EVENTO:              'evento',
    CAMPANHA:            'campanha',
    LABORATORIO:         'laboratorio',
    PROJETO_FORMATIVO:   'projeto_formativo',
    DIFUSAO:             'difusao',
    ATIVIDADE_TERRITORIAL:'atividade_territorial',
    OUTRO:               'outro'
  });

  var _TRANSICOES = {
    planejada:   ['em_producao', 'cancelada'],
    em_producao: ['em_execucao', 'planejada', 'cancelada'],
    em_execucao: ['concluida',   'cancelada'],
    concluida:   ['arquivada'],
    arquivada:   [],
    cancelada:   []
  };

  var _TIPO_EVENTO = {
    planejada:   null,
    em_producao: SystemEventTypes.ACTION_UPDATED,
    em_execucao: SystemEventTypes.ACTION_STARTED,
    concluida:   SystemEventTypes.ACTION_COMPLETED,
    arquivada:   SystemEventTypes.ACTION_ARCHIVED,
    cancelada:   SystemEventTypes.ACTION_STATUS_CHANGED
  };

  // Registrar FSM no FsmGuardian
  try {
    FsmGuardian.registrar('acoes', _TRANSICOES);
  } catch(e) {
    Logger.warn('acao_engine', 'FsmGuardian.registrar', e.message);
  }

  // ─── Criar / Atualizar ────────────────────────────────────────────────────

  /**
   * Cria ou atualiza uma Ação.
   * Se dados.id existir → atualiza; caso contrário → cria.
   * @param {Object} dados
   * @param {string} emailUsuario
   * @param {string} orgId
   * @returns {{ ok: boolean, id?: string, erro?: string }}
   */
  function salvar(dados, emailUsuario, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    try {
      _validar(dados);
      var agora = new Date().toISOString();

      if (dados.id) {
        // ─── Atualizar ────────────────────────────────────────────────────
        var existente = AcaoRepository.buscarPorId(orgId, dados.id);
        if (!existente) throw new Error('Ação não encontrada: ' + dados.id);

        var atualizado = _merge(existente, dados);
        atualizado.atualizadoEm = agora;
        atualizado.versao       = (existente.versao || 1) + 1;

        AcaoRepository.salvar(orgId, atualizado);

        _auditoria('ACAO_ATUALIZADA', atualizado.id, emailUsuario, { nome: atualizado.nome });
        SystemEvents.emit(SystemEventTypes.ACTION_UPDATED, {
          entidade: 'acao', entidadeId: atualizado.id,
          usuario: emailUsuario, orgId: orgId, origem: 'acao_engine'
        });

        return { ok: true, id: atualizado.id };

      } else {
        // ─── Criar ────────────────────────────────────────────────────────
        var id   = 'acao_' + new Date().getTime() + '_' + Math.random().toString(36).slice(2, 6);
        var nova = {
          id:                  id,
          orgId:               orgId,
          nome:                (dados.nome || '').trim(),
          tipo:                dados.tipo || TIPOS.OUTRO,
          descricao:           (dados.descricao || '').trim(),
          descricaoPublica:    (dados.descricaoPublica || '').trim(),
          visibilidadePublica: !!dados.visibilidadePublica,
          status:              ESTADOS.PLANEJADA,
          responsavel:         (dados.responsavel || emailUsuario || '').trim(),
          setor:               (dados.setor || '').trim(),
          equipe:              dados.equipe || [],
          dataInicio:          dados.dataInicio || '',
          dataFim:             dados.dataFim    || '',
          publicoPrevisto:     parseInt(dados.publicoPrevisto || 0, 10),
          metaExecucao:        dados.metaExecucao || null,
          riderTecnico:        dados.riderTecnico || [],
          criadoEm:            agora,
          atualizadoEm:        agora,
          criadoPor:           emailUsuario || '',
          versao:              1
        };

        AcaoRepository.salvar(orgId, nova);

        _auditoria('ACAO_CRIADA', id, emailUsuario, { nome: nova.nome, tipo: nova.tipo });
        SystemEvents.emit(SystemEventTypes.ACTION_CREATED, {
          entidade: 'acao', entidadeId: id,
          usuario: emailUsuario, orgId: orgId, origem: 'acao_engine',
          contexto: { nome: nova.nome, tipo: nova.tipo }
        });

        return { ok: true, id: id };
      }

    } catch(e) {
      Logger.error('acao_engine', 'salvar', e.message);
      return { ok: false, erro: e.message };
    }
  }

  // ─── Transição de Status ──────────────────────────────────────────────────

  /**
   * Muda o status de uma Ação respeitando a FSM.
   * @param {string} id
   * @param {string} novoStatus
   * @param {string} emailUsuario
   * @param {string} [motivo]
   * @param {string} [orgId]
   * @param {Object} [encerramento] — dados de resultado ao concluir (publicoAtingido, realizacoes, observacoes, comprovacoes)
   * @returns {{ ok: boolean, erro?: string }}
   */
  function mudarStatus(id, novoStatus, emailUsuario, motivo, orgId, encerramento) {
    orgId = orgId || getOrgConfig().orgId;
    try {
      var acao = AcaoRepository.buscarPorId(orgId, id);
      if (!acao) throw new Error('Ação não encontrada: ' + id);

      // Snapshot antes de transição crítica (padrão Skill.md)
      var snapshot = JSON.stringify({ status: acao.status, atualizadoEm: acao.atualizadoEm });

      FsmGuardian.assertValida('acoes', acao.status, novoStatus, {
        entidadeId: id, usuario: emailUsuario
      });

      acao.status       = novoStatus;
      acao.atualizadoEm = new Date().toISOString();
      acao.versao       = (acao.versao || 1) + 1;
      if (motivo) acao.ultimoMotivo = motivo;
      if (novoStatus === ESTADOS.CONCLUIDA && encerramento) {
        encerramento.registradoEm = new Date().toISOString();
        acao.encerramento = encerramento;
      }

      AcaoRepository.salvar(orgId, acao);

      _auditoria('ACAO_STATUS_' + novoStatus.toUpperCase(), id, emailUsuario, {
        de: JSON.parse(snapshot).status, para: novoStatus, motivo: motivo || ''
      });

      var tipoEvento = _TIPO_EVENTO[novoStatus] || SystemEventTypes.ACTION_STATUS_CHANGED;
      SystemEvents.emit(tipoEvento, {
        entidade: 'acao', entidadeId: id,
        usuario: emailUsuario, orgId: orgId, origem: 'acao_engine',
        contexto: { statusAnterior: JSON.parse(snapshot).status, novoStatus: novoStatus, motivo: motivo || '' }
      });

      // Integração: ao concluir → disparar evento para relatórios
      if (novoStatus === ESTADOS.CONCLUIDA) {
        try { IntegracaoOrquestrador.onAcaoConcluida(id, orgId, emailUsuario); } catch(_) {}
      }
      // Integração: ao iniciar execução → ativar linhas de orçamento
      if (novoStatus === ESTADOS.EM_EXECUCAO) {
        try { IntegracaoOrquestrador.onAcaoIniciada(id, orgId, emailUsuario); } catch(_) {}
      }

      return { ok: true };

    } catch(e) {
      Logger.error('acao_engine', 'mudarStatus', e.message);
      return { ok: false, erro: e.message };
    }
  }

  // ─── Excluir ─────────────────────────────────────────────────────────────

  /**
   * Exclui uma Ação (soft delete via cancelamento, ou hard delete para admins).
   * @param {string} id
   * @param {string} emailUsuario
   * @param {string} [orgId]
   * @returns {{ ok: boolean, erro?: string }}
   */
  function excluir(id, emailUsuario, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    try {
      var acao = AcaoRepository.buscarPorId(orgId, id);
      if (!acao) throw new Error('Ação não encontrada: ' + id);
      if (acao.status === ESTADOS.EM_EXECUCAO || acao.status === ESTADOS.CONCLUIDA) {
        throw new Error('Não é possível excluir ação em execução ou concluída. Cancele-a primeiro.');
      }
      var removido = AcaoRepository.excluir(orgId, id);
      _auditoria('ACAO_EXCLUIDA', id, emailUsuario, { nome: acao.nome });
      return { ok: removido };
    } catch(e) {
      Logger.error('acao_engine', 'excluir', e.message);
      return { ok: false, erro: e.message };
    }
  }

  // ─── Painel Integrado ─────────────────────────────────────────────────────

  /**
   * Painel integrado de uma Ação: agrega tarefas, reservas e contratos vinculados.
   * @param {string} acaoId
   * @param {string} [orgId]
   * @returns {Object}
   */
  function obterPainelIntegrado(acaoId, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var acao = AcaoRepository.buscarPorId(orgId, acaoId);
    if (!acao) return null;

    var painel = {
      acao:      acao,
      tarefas:   [],
      reservas:  [],
      contratos: [],
      financeiro:{ previsto: 0, executado: 0, saldo: 0 }
    };

    // Tarefas vinculadas
    try {
      if (typeof TarefaRepository !== 'undefined') {
        painel.tarefas = TarefaRepository.listar(orgId, { acaoId: acaoId });
      }
    } catch(e) { Logger.warn('acao_engine', 'painel.tarefas', e.message); }

    // Reservas vinculadas
    try {
      if (typeof ReservaRepository !== 'undefined') {
        painel.reservas = ReservaRepository.listar(orgId).filter(function(r) {
          return r.acaoId === acaoId;
        });
      }
    } catch(e) { Logger.warn('acao_engine', 'painel.reservas', e.message); }

    // Contratos vinculados
    try {
      if (typeof ContratoRepository !== 'undefined') {
        var contratos = ContratoRepository.listar(orgId, { acaoId: acaoId });
        painel.contratos = contratos;
        contratos.forEach(function(c) {
          painel.financeiro.previsto   += (c.valorTotal || 0);
          painel.financeiro.executado  += (c.valorExecutado || 0);
        });
        painel.financeiro.saldo = painel.financeiro.previsto - painel.financeiro.executado;
      }
    } catch(e) { Logger.warn('acao_engine', 'painel.contratos', e.message); }

    return painel;
  }

  // ─── Métricas ─────────────────────────────────────────────────────────────

  /**
   * Retorna métricas consolidadas das ações.
   * @param {string} [orgId]
   * @returns {Object}
   */
  function obterMetricas(orgId) {
    return AcaoRepository.obterMetricas(orgId || getOrgConfig().orgId);
  }

  // ─── Helpers internos ────────────────────────────────────────────────────

  function _validar(dados) {
    if (!dados) throw new Error('Dados obrigatórios.');
    if (!dados.nome || !String(dados.nome).trim()) throw new Error('Nome da ação é obrigatório.');
    if (!dados.responsavel && !dados.id) throw new Error('Responsável é obrigatório.');
    var tiposValidos = Object.values ? Object.values(TIPOS) :
      Object.keys(TIPOS).map(function(k) { return TIPOS[k]; });
    if (dados.tipo && tiposValidos.indexOf(dados.tipo) === -1) {
      throw new Error('Tipo inválido: ' + dados.tipo);
    }
  }

  function _merge(existente, novos) {
    var campos = [
      'nome', 'tipo', 'descricao', 'descricaoPublica', 'visibilidadePublica',
      'responsavel', 'setor', 'equipe', 'dataInicio', 'dataFim',
      'publicoPrevisto', 'metaExecucao', 'riderTecnico'
    ];
    campos.forEach(function(c) {
      if (novos[c] !== undefined && novos[c] !== null) {
        existente[c] = novos[c];
      }
    });
    return existente;
  }

  function _auditoria(acao, id, email, detalhes) {
    try {
      AuditoriaService.registrar({
        acao: acao, entidade: 'acao', entidadeId: id,
        usuario: email, detalhes: detalhes
      });
    } catch(_) {}
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  return {
    salvar:              salvar,
    mudarStatus:         mudarStatus,
    excluir:             excluir,
    obterPainelIntegrado: obterPainelIntegrado,
    obterMetricas:       obterMetricas,
    ESTADOS:             ESTADOS,
    TIPOS:               TIPOS
  };

})();
