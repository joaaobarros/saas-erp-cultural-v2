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
 *          event_bus_backend.gs, events_constants.gs, utils.gs,
 *          shared/calendar_service.gs (CalendarService)
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

        var vinculoAnterior = existente.vinculo || null;
        var atualizado = _merge(existente, dados);
        atualizado.atualizadoEm = agora;
        atualizado.versao       = (existente.versao || 1) + 1;

        AcaoRepository.salvar(orgId, atualizado);

        _auditoria('ACAO_ATUALIZADA', atualizado.id, emailUsuario, { nome: atualizado.nome });
        SystemEvents.emit(SystemEventTypes.ACTION_UPDATED, {
          entidade: 'acao', entidadeId: atualizado.id,
          usuario: emailUsuario, orgId: orgId, origem: 'acao_engine'
        });
        _recalcularVinculo(atualizado.vinculo || null, vinculoAnterior, orgId);

        return { ok: true, id: atualizado.id };

      } else {
        // ─── Criar ────────────────────────────────────────────────────────
        var id   = 'acao_' + new Date().getTime() + '_' + Math.random().toString(36).slice(2, 6);
        var nova = {
          id:                    id,
          orgId:                 orgId,
          nome:                  (dados.nome || '').trim(),
          tipo:                  dados.tipo || TIPOS.OUTRO,
          descricao:             (dados.descricao || '').trim(),
          descricaoPublica:      (dados.descricaoPublica || '').trim(),
          visibilidadePublica:   !!dados.visibilidadePublica,
          status:                ESTADOS.PLANEJADA,
          responsavel:           (dados.responsavel || emailUsuario || '').trim(),
          setor:                 (dados.setor || '').trim(),
          equipe:                dados.equipe || [],
          dataInicio:            dados.dataInicio || '',
          dataFim:               dados.dataFim    || '',
          publicoPrevisto:       parseInt(dados.publicoPrevisto || 0, 10),
          metaExecucao:          dados.metaExecucao || null,
          vinculo:               dados.vinculo || null,
          quantitativoRealizado: Number(dados.quantitativoRealizado) || 0,
          riderTecnico:          dados.riderTecnico || [],
          fases:                 dados.fases || [],
          googleEventId:         '',
          calendarConvidados:    [],
          criadoEm:              agora,
          atualizadoEm:          agora,
          criadoPor:             emailUsuario || '',
          versao:                1
        };

        AcaoRepository.salvar(orgId, nova);

        _auditoria('ACAO_CRIADA', id, emailUsuario, { nome: nova.nome, tipo: nova.tipo });
        SystemEvents.emit(SystemEventTypes.ACTION_CREATED, {
          entidade: 'acao', entidadeId: id,
          usuario: emailUsuario, orgId: orgId, origem: 'acao_engine',
          contexto: { nome: nova.nome, tipo: nova.tipo }
        });
        if (nova.vinculo && nova.vinculo.indicadorId) {
          _recalcularVinculo(nova.vinculo, null, orgId);
        }

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
      // Ao cancelar: remove o vínculo com o Calendar (se houver)
      if (novoStatus === ESTADOS.CANCELADA && acao.googleEventId) {
        try { CalendarService.excluirEvento(acao.googleEventId); } catch(_) {}
        acao.googleEventId      = '';
        acao.calendarConvidados = [];
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

      // Integração: ao concluir → disparar evento para relatórios + recalcular indicador
      if (novoStatus === ESTADOS.CONCLUIDA) {
        try { IntegracaoOrquestrador.onAcaoConcluida(id, orgId, emailUsuario); } catch(_) {}
      }
      // Integração: ao iniciar execução → ativar linhas de orçamento
      if (novoStatus === ESTADOS.EM_EXECUCAO) {
        try { IntegracaoOrquestrador.onAcaoIniciada(id, orgId, emailUsuario); } catch(_) {}
      }
      // Ao cancelar: ação sai do cálculo → recalcular indicador vinculado
      if (novoStatus === ESTADOS.CANCELADA && acao.vinculo && acao.vinculo.indicadorId) {
        try { ContratosEngine.recalcularRealizadoDeAcoes(acao.vinculo.contratoId, acao.vinculo.metaId, acao.vinculo.indicadorId, orgId); } catch(_) {}
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

  function _recalcularVinculo(vinculoNovo, vinculoAnterior, orgId) {
    try {
      if (typeof ContratosEngine === 'undefined') return;
      if (vinculoNovo && vinculoNovo.indicadorId) {
        ContratosEngine.recalcularRealizadoDeAcoes(vinculoNovo.contratoId, vinculoNovo.metaId, vinculoNovo.indicadorId, orgId);
      }
      // Se o vínculo mudou, recalcular o indicador anterior também (para zerar sua contribuição)
      if (vinculoAnterior && vinculoAnterior.indicadorId &&
          (!vinculoNovo || vinculoAnterior.indicadorId !== vinculoNovo.indicadorId)) {
        ContratosEngine.recalcularRealizadoDeAcoes(vinculoAnterior.contratoId, vinculoAnterior.metaId, vinculoAnterior.indicadorId, orgId);
      }
    } catch(e) {
      Logger.warn('acao_engine', '_recalcularVinculo', e.message);
    }
  }

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
      'publicoPrevisto', 'metaExecucao', 'quantitativoRealizado', 'riderTecnico', 'fases'
    ];
    campos.forEach(function(c) {
      if (novos[c] !== undefined && novos[c] !== null) {
        existente[c] = novos[c];
      }
    });
    // vinculo aceita null explícito para remover o vínculo
    if (novos.vinculo !== undefined) existente.vinculo = novos.vinculo || null;
    return existente;
  }

  // ─── Google Calendar — vínculo manual ──────────────────────────────────────
  // Vínculo opcional, acionado pelo usuário (nunca automático). Como Ação tem
  // apenas dataInicio/dataFim (sem horário), o evento é criado como dia-todo.

  function _envolvidosCalendar(acao) {
    var envolvidos = [];
    if (acao.responsavel && String(acao.responsavel).indexOf('@') !== -1) envolvidos.push(acao.responsavel);
    (acao.equipe || []).forEach(function(p) {
      var email = typeof p === 'string' ? p : (p && p.email);
      if (email && String(email).indexOf('@') !== -1) envolvidos.push(email);
    });
    return envolvidos.filter(function(e, i, arr) { return arr.indexOf(e) === i; });
  }

  function _resolverConvidadosCalendar(acao, opcoes) {
    opcoes = opcoes || {};
    var envolvidos = _envolvidosCalendar(acao);
    var base = opcoes.modo === 'especificos'
      ? envolvidos.filter(function(e) { return (opcoes.selecionados || []).indexOf(e) !== -1; })
      : envolvidos;
    var extras = (opcoes.extras || []).filter(function(e) { return e && String(e).indexOf('@') !== -1; });
    return base.concat(extras);
  }

  /**
   * Vincula uma Ação a um novo evento (dia-todo) no Calendar.
   * @param {string} id
   * @param {Object} opcoes — { modo, selecionados?, extras? }
   * @param {string} emailUsuario
   * @param {string} [orgId]
   * @returns {{ ok: boolean, erro?: string }}
   */
  function vincularCalendar(id, opcoes, emailUsuario, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    try {
      var acao = AcaoRepository.buscarPorId(orgId, id);
      if (!acao) throw new Error('Ação não encontrada: ' + id);
      if (acao.googleEventId) throw new Error('Esta ação já está vinculada ao Calendar.');
      if (!acao.dataInicio) throw new Error('Ação sem data de início — não é possível vincular ao Calendar.');

      var inicio = new Date(acao.dataInicio + 'T00:00:00');
      var fimRef = acao.dataFim && acao.dataFim >= acao.dataInicio ? acao.dataFim : acao.dataInicio;
      var fim    = new Date(fimRef + 'T00:00:00');
      fim.setDate(fim.getDate() + 1); // fim é exclusivo em evento de dia-todo

      var convidados = _resolverConvidadosCalendar(acao, opcoes);
      var resultado = CalendarService.criarEvento({
        titulo:     acao.nome,
        descricao:  'Ação institucional — gerida pelo sistema CCBJ. ID: ' + acao.id,
        inicio:     inicio,
        fim:        fim,
        convidados: convidados,
        diaTodo:    true
      });

      acao.googleEventId      = resultado.eventoId;
      acao.calendarConvidados = resultado.convidados;
      acao.atualizadoEm       = new Date().toISOString();
      acao.versao             = (acao.versao || 1) + 1;
      AcaoRepository.salvar(orgId, acao);

      _auditoria('ACAO_CALENDAR_VINCULADA', id, emailUsuario, { convidados: resultado.convidados });
      return { ok: true };
    } catch(e) {
      Logger.error('acao_engine', 'vincularCalendar', e.message);
      return { ok: false, erro: e.message };
    }
  }

  /**
   * Remove o vínculo de uma Ação com o Calendar.
   * @param {string} id
   * @param {string} emailUsuario
   * @param {string} [orgId]
   * @returns {{ ok: boolean, erro?: string }}
   */
  function desvincularCalendar(id, emailUsuario, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    try {
      var acao = AcaoRepository.buscarPorId(orgId, id);
      if (!acao) throw new Error('Ação não encontrada: ' + id);
      if (!acao.googleEventId) throw new Error('Esta ação não está vinculada ao Calendar.');

      try { CalendarService.excluirEvento(acao.googleEventId); }
      catch(e) { Logger.warn('acao_engine', 'desvincularCalendar', e.message); }

      acao.googleEventId      = '';
      acao.calendarConvidados = [];
      acao.atualizadoEm       = new Date().toISOString();
      acao.versao             = (acao.versao || 1) + 1;
      AcaoRepository.salvar(orgId, acao);

      _auditoria('ACAO_CALENDAR_DESVINCULADA', id, emailUsuario, {});
      return { ok: true };
    } catch(e) {
      Logger.error('acao_engine', 'desvincularCalendar', e.message);
      return { ok: false, erro: e.message };
    }
  }

  // ─── Fases do Projeto ─────────────────────────────────────────────────────

  /**
   * Cria ou atualiza uma fase dentro de uma Ação.
   * @param {string} acaoId
   * @param {Object} fase — { id?, nome*, status?, dataInicio?, dataFim?, descricao?, ordem? }
   * @param {string} emailUsuario
   * @param {string} [orgId]
   * @returns {{ ok: boolean, faseId?: string, erro?: string }}
   */
  function salvarFase(acaoId, fase, emailUsuario, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    try {
      var acao = AcaoRepository.buscarPorId(orgId, acaoId);
      if (!acao) throw new Error('Ação não encontrada: ' + acaoId);
      if (!fase || !String(fase.nome || '').trim()) throw new Error('Nome da fase é obrigatório.');

      var agora = new Date().toISOString();
      acao.fases = acao.fases || [];

      var faseId;
      if (fase.id) {
        // Atualizar fase existente
        var idx = -1;
        for (var i = 0; i < acao.fases.length; i++) {
          if (acao.fases[i].id === fase.id) { idx = i; break; }
        }
        if (idx === -1) throw new Error('Fase não encontrada: ' + fase.id);
        acao.fases[idx] = _mergeFase(acao.fases[idx], fase);
        acao.fases[idx].atualizadoEm = agora;
        faseId = fase.id;
      } else {
        // Criar nova fase
        faseId = 'fase_' + new Date().getTime() + '_' + Math.random().toString(36).slice(2, 5);
        var novaFase = {
          id:          faseId,
          nome:        String(fase.nome).trim(),
          status:      fase.status || 'pendente',
          dataInicio:  fase.dataInicio || '',
          dataFim:     fase.dataFim    || '',
          descricao:   (fase.descricao || '').trim(),
          ordem:       typeof fase.ordem === 'number' ? fase.ordem : acao.fases.length,
          criadoEm:    agora,
          atualizadoEm: agora,
          criadoPor:   emailUsuario || ''
        };
        acao.fases.push(novaFase);
      }

      acao.atualizadoEm = agora;
      acao.versao = (acao.versao || 1) + 1;
      AcaoRepository.salvar(orgId, acao);

      _auditoria('FASE_' + (fase.id ? 'ATUALIZADA' : 'CRIADA'), acaoId, emailUsuario, {
        faseId: faseId, faseNome: fase.nome
      });

      return { ok: true, faseId: faseId };
    } catch(e) {
      Logger.error('acao_engine', 'salvarFase', e.message);
      return { ok: false, erro: e.message };
    }
  }

  /**
   * Remove uma fase de uma Ação.
   * @param {string} acaoId
   * @param {string} faseId
   * @param {string} emailUsuario
   * @param {string} [orgId]
   * @returns {{ ok: boolean, erro?: string }}
   */
  function excluirFase(acaoId, faseId, emailUsuario, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    try {
      var acao = AcaoRepository.buscarPorId(orgId, acaoId);
      if (!acao) throw new Error('Ação não encontrada: ' + acaoId);
      acao.fases = (acao.fases || []).filter(function(f) { return f.id !== faseId; });
      acao.atualizadoEm = new Date().toISOString();
      acao.versao = (acao.versao || 1) + 1;
      AcaoRepository.salvar(orgId, acao);
      _auditoria('FASE_EXCLUIDA', acaoId, emailUsuario, { faseId: faseId });
      return { ok: true };
    } catch(e) {
      Logger.error('acao_engine', 'excluirFase', e.message);
      return { ok: false, erro: e.message };
    }
  }

  function _mergeFase(existente, novos) {
    ['nome', 'status', 'dataInicio', 'dataFim', 'descricao', 'ordem'].forEach(function(c) {
      if (novos[c] !== undefined && novos[c] !== null) existente[c] = novos[c];
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
    salvarFase:          salvarFase,
    excluirFase:         excluirFase,
    vincularCalendar:    vincularCalendar,
    desvincularCalendar: desvincularCalendar,
    ESTADOS:             ESTADOS,
    TIPOS:               TIPOS
  };

})();
