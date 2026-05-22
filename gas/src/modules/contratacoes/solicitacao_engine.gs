/**
 * @file modules/contratacoes/solicitacao_engine.gs
 * @layer modules/contratacoes
 * @description Engine de Solicitações de Contratação com aprovação multinível.
 *
 * FSM — SolicitacaoContratacao:
 *   rascunho      → submetida, cancelada
 *   submetida     → aprovada_gestor, rejeitada, devolvida, cancelada
 *   devolvida     → submetida, cancelada
 *   aprovada_gestor  → aprovada_financeiro, rejeitada, devolvida, cancelada
 *   aprovada_financeiro → em_execucao, rejeitada, cancelada
 *   em_execucao   → concluida, cancelada
 *   concluida     → [] (terminal)
 *   rejeitada     → [] (terminal)
 *   cancelada     → [] (terminal)
 *
 * Notificações assíncronas a cada transição (via SystemEvents).
 *
 * OrcamentoGuard — validação orçamentária antes de submeter.
 * Fase 3: stub com aviso (não bloqueia).
 * Fase 4: check real contra contratos.json saldos.
 *
 * Skill.md aplicado:
 *   - Snapshot antes de rejeição/cancelamento (reversibilidade auditável)
 *   - CQRS: listar usa cache, salvar/transitar invalida cache (em contratacoes_controller.gs)
 *
 * @depends modules/contratacoes/solicitacao_repository.gs (SolicitacaoRepository)
 *          core/services/fsm_guardian.gs (FsmGuardian)
 *          core/services/auditoria_service.gs (AuditoriaService)
 *          core/event_bus_backend.gs (SystemEvents)
 *          core/events_constants.gs (SystemEventTypes)
 *          core/logger.gs (Logger)
 */

// ── Constantes ─────────────────────────────────────────────────

var STATUS_SOLICITACAO = Object.freeze({
  RASCUNHO:            'rascunho',
  SUBMETIDA:           'submetida',
  DEVOLVIDA:           'devolvida',
  APROVADA_GESTOR:     'aprovada_gestor',
  APROVADA_FINANCEIRO: 'aprovada_financeiro',
  EM_EXECUCAO:         'em_execucao',
  CONCLUIDA:           'concluida',
  REJEITADA:           'rejeitada',
  CANCELADA:           'cancelada'
});

var TIPO_SERVICO_CONTRATACAO = Object.freeze({
  PRESTACAO:   'prestacao_servico',
  FORNECIMENTO:'fornecimento',
  LOCACAO:     'locacao',
  CONSULTORIA: 'consultoria',
  CACHÊ:       'cache_artistico',
  OUTRO:       'outro'
});

var _TRANSICOES_SOLICITACAO = {
  rascunho:             ['submetida', 'cancelada'],
  submetida:            ['aprovada_gestor', 'rejeitada', 'devolvida', 'cancelada'],
  devolvida:            ['submetida', 'cancelada'],
  aprovada_gestor:      ['aprovada_financeiro', 'rejeitada', 'devolvida', 'cancelada'],
  aprovada_financeiro:  ['em_execucao', 'rejeitada', 'cancelada'],
  em_execucao:          ['concluida', 'cancelada'],
  concluida:            [],
  rejeitada:            [],
  cancelada:            []
};

if (typeof FsmGuardian !== 'undefined') {
  FsmGuardian.registrar('solicitacao_status', _TRANSICOES_SOLICITACAO);
}

// ── OrcamentoGuard ────────────────────────────────────────────────
// Fase 3: stub com log. Fase 4: implementação real contra contratos.json.

var OrcamentoGuard = (function () {
  function assertDisponivel(contratoId, rubricaId, valor, orgId) {
    // Stub Fase 3 — não bloqueia, apenas loga para auditoria
    Logger.info('orcamento_guard', 'assertDisponivel',
      'STUB F3 — contratoId:' + contratoId +
      ' rubricaId:'           + rubricaId  +
      ' valor:'               + valor +
      ' [F4: verificar saldo real]'
    );
    try {
      if (typeof AuditoriaService !== 'undefined') {
        AuditoriaService.registrar('ORCAMENTO_VERIFICACAO_STUB', 'contratacoes', {
          contratoId: contratoId, rubricaId: rubricaId,
          valor: valor, orgId: orgId,
          aviso: 'Verificação real implementada na Fase 4'
        });
      }
    } catch (_) {}
    // Fase 4: lerJSON('contratos.json'), encontrar rubrica, calcular saldo
    // e lançar Error se valor > saldo
    return { ok: true, aviso: 'Verificação orçamentária pendente (Fase 4)' };
  }

  return { assertDisponivel: assertDisponivel };
})();

// ── Engine ────────────────────────────────────────────────────────

var SolicitacaoEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  function _audit(evento, dados) {
    try {
      if (typeof AuditoriaService !== 'undefined')
        AuditoriaService.registrar(evento, 'contratacoes', dados || {});
    } catch (_) {}
  }

  function _emit(tipo, payload) {
    try {
      if (typeof SystemEvents !== 'undefined')
        SystemEvents.emit(tipo, payload || {});
    } catch (_) {}
  }

  function _notificar(emailsDestino, solicitacao, transicao) {
    // Async: emite evento para NotificationEngine processar
    _emit('CONTRATACAO_NOTIFICACAO', {
      emails:      emailsDestino,
      transicao:   transicao,
      numero:      solicitacao.numero,
      objeto:      solicitacao.objeto,
      idSolicitacao: solicitacao.id
    });
  }

  function _transitarSolicitacao(solicitacao, novoStatus, emailOperador, dadosExtras) {
    var atual = solicitacao.status || 'rascunho';
    if (typeof FsmGuardian !== 'undefined') {
      FsmGuardian.validarTransicao('solicitacao_status', atual, novoStatus);
    }
    dadosExtras = dadosExtras || {};

    // Snapshot antes de transições terminais ou irreversíveis (Skill.md)
    if (novoStatus === 'rejeitada' || novoStatus === 'cancelada') {
      _audit('SOLICITACAO_SNAPSHOT_' + novoStatus.toUpperCase(), {
        snapshot: JSON.parse(JSON.stringify(solicitacao)),
        operador: emailOperador || ''
      });
    }

    solicitacao.status = novoStatus;
    solicitacao[novoStatus + 'Em']  = new Date().toISOString();
    solicitacao[novoStatus + 'Por'] = emailOperador || '';
    if (dadosExtras.parecer)    solicitacao['parecer_' + novoStatus]  = dadosExtras.parecer;
    if (dadosExtras.observacao) solicitacao.observacaoUltima           = dadosExtras.observacao;

    SolicitacaoRepository.salvar(solicitacao.orgId || _orgId(), solicitacao);
    _audit('SOLICITACAO_' + novoStatus.toUpperCase(), {
      id: solicitacao.id, numero: solicitacao.numero,
      de: atual, para: novoStatus, operador: emailOperador
    });
    return solicitacao;
  }

  // ──────────────────────────────────────────────────────────────────
  // CRUD + LEITURA
  // ──────────────────────────────────────────────────────────────────

  function listar(filtros, orgId) {
    return SolicitacaoRepository.listar(orgId || _orgId(), filtros || {});
  }

  function buscarPorId(id, orgId) {
    return SolicitacaoRepository.buscarPorId(orgId || _orgId(), id);
  }

  function obterMetricas(orgId) {
    orgId = orgId || _orgId();
    var m = SolicitacaoRepository.obterMetricasPorStatus(orgId);
    return Object.assign(m, {
      total:       Object.keys(m.porStatus).reduce(function(acc, k) { return acc + m.porStatus[k]; }, 0),
      pendentes:   (m.porStatus['submetida'] || 0) + (m.porStatus['aprovada_gestor'] || 0),
      emExecucao:  m.porStatus['em_execucao'] || 0,
      concluidas:  m.porStatus['concluida']   || 0,
      geradoEm:    new Date().toISOString()
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // MUTAÇÕES + APROVAÇÃO
  // ──────────────────────────────────────────────────────────────────

  /**
   * Cria ou atualiza solicitação em rascunho.
   * Apenas rascunho pode ser editado.
   */
  function salvar(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    dados = dados || {};
    if (!dados.objeto)          throw new Error('objeto da contratação é obrigatório.');
    if (!dados.tipoServico)     throw new Error('tipoServico é obrigatório.');
    if (!dados.solicitante)     dados.solicitante = emailOperador || '';
    if (!dados.setorSolicitante) throw new Error('setorSolicitante é obrigatório.');

    if (dados.id) {
      var existente = SolicitacaoRepository.buscarPorId(orgId, dados.id);
      if (existente && existente.status !== 'rascunho' && existente.status !== 'devolvida')
        throw new Error('Apenas solicitações em rascunho ou devolvidas podem ser editadas.');
    }

    var r = SolicitacaoRepository.salvar(orgId, dados);
    _audit(r.isNovo ? 'SOLICITACAO_CRIADA' : 'SOLICITACAO_ATUALIZADA', {
      id: r.id, numero: r.numero, operador: emailOperador || ''
    });
    return { id: r.id, numero: r.numero };
  }

  /**
   * Submete solicitação para aprovação.
   * Executa OrcamentoGuard (stub Fase 3) antes de transitar.
   */
  function submeter(id, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);

    // OrcamentoGuard — stub Fase 3 (não bloqueia, mas loga)
    OrcamentoGuard.assertDisponivel(
      s.contratoId || '', s.rubricaId || '', s.valorEstimado || 0, orgId
    );

    _transitarSolicitacao(s, STATUS_SOLICITACAO.SUBMETIDA, emailOperador, {});

    // Notificar gestor do setor (async)
    try {
      var emailsGestores = typeof PessoasEngine !== 'undefined'
        ? PessoasEngine.listarPorFuncao('gestor', orgId)
        : [];
      if (s.emailGestor) emailsGestores = [s.emailGestor];
      _notificar(emailsGestores, s, 'submetida_aguardando_gestor');
    } catch (e) {
      Logger.warn('solicitacao_engine', 'submeter', 'Falha ao notificar: ' + e.message);
    }
    return { ok: true, id: id, numero: s.numero };
  }

  /**
   * Aprovação pelo Gestor do Setor.
   */
  function aprovarGestor(id, parecer, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);
    _transitarSolicitacao(s, STATUS_SOLICITACAO.APROVADA_GESTOR, emailOperador, { parecer: parecer });

    // Notificar financeiro (async)
    try {
      var emailsFinanceiro = typeof PessoasEngine !== 'undefined'
        ? PessoasEngine.listarPorFuncao('financeiro', orgId)
        : [];
      _notificar(emailsFinanceiro, s, 'aprovada_gestor_aguardando_financeiro');
    } catch (e) {
      Logger.warn('solicitacao_engine', 'aprovarGestor', 'Falha ao notificar: ' + e.message);
    }
    return { ok: true, id: id };
  }

  /**
   * Aprovação pelo Financeiro.
   */
  function aprovarFinanceiro(id, parecer, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);
    _transitarSolicitacao(s, STATUS_SOLICITACAO.APROVADA_FINANCEIRO, emailOperador, { parecer: parecer });

    // Notificar solicitante (async)
    _notificar([s.solicitante], s, 'aprovada_financeiro_liberar_execucao');
    return { ok: true, id: id };
  }

  /**
   * Marca solicitação como em execução (após emissão de NF/documento).
   */
  function iniciarExecucao(id, dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);
    if (dados && dados.numeroNF) s.numeroNF = dados.numeroNF;
    if (dados && dados.idContratado) s.idContratado = dados.idContratado;
    _transitarSolicitacao(s, STATUS_SOLICITACAO.EM_EXECUCAO, emailOperador, {});
    return { ok: true, id: id };
  }

  /**
   * Conclui a execução (serviço prestado, nota aceita).
   */
  function concluir(id, dadosConclusao, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);
    _transitarSolicitacao(s, STATUS_SOLICITACAO.CONCLUIDA, emailOperador, dadosConclusao || {});
    _emit('CONTRATACAO_CONCLUIDA', { id: id, numero: s.numero, orgId: orgId });
    return { ok: true, id: id };
  }

  /**
   * Rejeita solicitação (snapshot automático antes).
   */
  function rejeitar(id, parecer, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);
    if (!parecer) throw new Error('Parecer de rejeição é obrigatório.');
    _transitarSolicitacao(s, STATUS_SOLICITACAO.REJEITADA, emailOperador, { parecer: parecer });

    // Notificar solicitante
    _notificar([s.solicitante], s, 'rejeitada');
    return { ok: true, id: id };
  }

  /**
   * Devolve para ajuste (não rejeita — volta ao rascunho após correção).
   */
  function devolver(id, observacao, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);
    if (!observacao) throw new Error('Observação de devolução é obrigatória.');
    _transitarSolicitacao(s, STATUS_SOLICITACAO.DEVOLVIDA, emailOperador, { observacao: observacao });
    _notificar([s.solicitante], s, 'devolvida_para_ajuste');
    return { ok: true, id: id };
  }

  /**
   * Cancela solicitação (snapshot automático antes).
   */
  function cancelar(id, motivo, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);
    _transitarSolicitacao(s, STATUS_SOLICITACAO.CANCELADA, emailOperador, { observacao: motivo });
    return { ok: true, id: id };
  }

  // ── API pública ───────────────────────────────────────────────────

  return {
    STATUS_SOLICITACAO:     STATUS_SOLICITACAO,
    TIPO_SERVICO:           TIPO_SERVICO_CONTRATACAO,

    // Leitura
    listar:        listar,
    buscarPorId:   buscarPorId,
    obterMetricas: obterMetricas,

    // Escrita / Aprovação
    salvar:             salvar,
    submeter:           submeter,
    aprovarGestor:      aprovarGestor,
    aprovarFinanceiro:  aprovarFinanceiro,
    iniciarExecucao:    iniciarExecucao,
    concluir:           concluir,
    rejeitar:           rejeitar,
    devolver:           devolver,
    cancelar:           cancelar
  };

})();
