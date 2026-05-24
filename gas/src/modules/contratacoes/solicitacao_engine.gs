/**
 * @file modules/contratacoes/solicitacao_engine.gs
 * @layer modules/contratacoes
 * @description Engine de Solicitações de Contratação — schema operacional completo (Fase 11).
 *
 * FSM — SERVICO/BOLSA:
 *   rascunho → submetida → aprovada_gestor → aprovada_financeiro → em_instrucao → em_execucao → concluida
 *
 * FSM — COMPRA:
 *   rascunho → submetida → aprovada_gestor → aguard_cotacoes → cotacoes_recebidas
 *           → aprovada_financeiro → em_instrucao → em_execucao → concluida
 *
 * Terminais: rejeitada, cancelada. devolvida ↔ submetida.
 *
 * OrcamentoGuard: bloqueia submissão se saldo insuficiente (rubricaId preenchido).
 * Portal do Contratado: tokenPortal gerado ao entrar em em_execucao.
 *
 * @depends modules/contratacoes/solicitacao_repository.gs (SolicitacaoRepository)
 *          modules/financeiro/orcamento_guard.gs (OrcamentoGuard)
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
  AGUARD_COTACOES:     'aguard_cotacoes',
  COTACOES_RECEBIDAS:  'cotacoes_recebidas',
  APROVADA_FINANCEIRO: 'aprovada_financeiro',
  EM_INSTRUCAO:        'em_instrucao',
  EM_EXECUCAO:         'em_execucao',
  CONCLUIDA:           'concluida',
  REJEITADA:           'rejeitada',
  CANCELADA:           'cancelada'
});

var TIPO_PROCESSO_CONTRATACAO = Object.freeze({
  SERVICO: 'servico',
  COMPRA:  'compra',
  BOLSA:   'bolsa'
});

var NATUREZA_CONTRATACAO = Object.freeze({
  CACHE_ARTISTICO: 'cache_artistico',
  PRESTACAO_PF:    'prestacao_pf',
  PRESTACAO_PJ:    'prestacao_pj',
  CURSO_OFICINA:   'curso_oficina',
  PROFESSOR:       'professor',
  EQUIPE:          'equipe',
  COMPRAS:         'compras',
  CONSULTORIA:     'consultoria',
  BOLSA_FOMENTO:   'bolsa_fomento',
  OUTRO:           'outro'
});

// Mantido por compatibilidade com código existente
var TIPO_SERVICO_CONTRATACAO = NATUREZA_CONTRATACAO;

var _TRANSICOES_SOLICITACAO = {
  rascunho:            ['submetida', 'cancelada'],
  submetida:           ['aprovada_gestor', 'rejeitada', 'devolvida', 'cancelada'],
  devolvida:           ['submetida', 'cancelada'],
  aprovada_gestor:     ['aprovada_financeiro', 'aguard_cotacoes', 'rejeitada', 'devolvida', 'cancelada'],
  aguard_cotacoes:     ['cotacoes_recebidas', 'rejeitada', 'cancelada'],
  cotacoes_recebidas:  ['aprovada_financeiro', 'rejeitada', 'cancelada'],
  aprovada_financeiro: ['em_instrucao', 'em_execucao', 'rejeitada', 'cancelada'],
  em_instrucao:        ['em_execucao', 'rejeitada', 'cancelada'],
  em_execucao:         ['concluida', 'cancelada'],
  concluida:           [],
  rejeitada:           [],
  cancelada:           []
};

if (typeof FsmGuardian !== 'undefined') {
  FsmGuardian.registrar('solicitacao_status', _TRANSICOES_SOLICITACAO);
}

// OrcamentoGuard definido em modules/financeiro/orcamento_guard.gs (Fase 4).

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
    if (!dados.objeto)            throw new Error('objeto da contratação é obrigatório.');
    if (!dados.solicitante)       dados.solicitante = emailOperador || '';
    if (!dados.setorSolicitante)  throw new Error('setorSolicitante é obrigatório.');

    // Aceita tipoServico legado ou nova natureza
    if (!dados.natureza && dados.tipoServico) dados.natureza = dados.tipoServico;
    if (!dados.natureza) throw new Error('natureza (tipo de serviço) é obrigatória.');

    // tipoProcesso com fallback para legado
    if (!dados.tipoProcesso) dados.tipoProcesso = 'servico';

    if (dados.id) {
      var existente = SolicitacaoRepository.buscarPorId(orgId, dados.id);
      if (existente && existente.status !== 'rascunho' && existente.status !== 'devolvida')
        throw new Error('Apenas solicitações em rascunho ou devolvidas podem ser editadas.');
    }

    // Normaliza arrays
    if (!dados.parcelas)   dados.parcelas   = [];
    if (!dados.documentos) dados.documentos = [];
    if (!dados.cotacoes)   dados.cotacoes   = [];

    var r = SolicitacaoRepository.salvar(orgId, dados);
    _audit(r.isNovo ? 'SOLICITACAO_CRIADA' : 'SOLICITACAO_ATUALIZADA', {
      id: r.id, numero: r.numero, tipoProcesso: dados.tipoProcesso, operador: emailOperador || ''
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

    // Bloqueio orçamentário real — lança Error se saldo insuficiente
    var guardResult = OrcamentoGuard.assertDisponivel(
      s.contratoId || '', s.rubricaId || '', s.valorEstimado || 0, orgId
    );
    if (guardResult && guardResult.aviso) {
      Logger.warn('solicitacao_engine', 'submeter', guardResult.aviso);
    }

    _transitarSolicitacao(s, STATUS_SOLICITACAO.SUBMETIDA, emailOperador, {});
    _emit('CONTRATACAO_NOTIFICACAO', {
      emails: s.emailGestor ? [s.emailGestor] : [],
      transicao: 'submetida_aguardando_gestor',
      numero: s.numero, objeto: s.objeto, idSolicitacao: s.id
    });
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

    // COMPRA: redireciona para coleta de cotações
    if (s.tipoProcesso === 'compra') {
      _transitarSolicitacao(s, STATUS_SOLICITACAO.AGUARD_COTACOES, emailOperador, {});
      _emit('CONTRATACAO_NOTIFICACAO', {
        emails: [], transicao: 'aguard_cotacoes',
        numero: s.numero, objeto: s.objeto, idSolicitacao: s.id
      });
    } else {
      _emit('CONTRATACAO_NOTIFICACAO', {
        emails: [], transicao: 'aprovada_gestor_aguardando_financeiro',
        numero: s.numero, objeto: s.objeto, idSolicitacao: s.id
      });
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

    // Comprometer saldo ao aprovar financeiramente
    if (s.contratoId && s.rubricaId && s.valorEstimado) {
      try {
        OrcamentoGuard.comprometer(s.contratoId, s.rubricaId, s.valorEstimado, s.numero, orgId);
      } catch (e) {
        Logger.warn('solicitacao_engine', 'aprovarFinanceiro', 'OrcamentoGuard.comprometer: ' + e.message);
      }
    }

    _transitarSolicitacao(s, STATUS_SOLICITACAO.APROVADA_FINANCEIRO, emailOperador, { parecer: parecer });
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
    if (dados && dados.numeroNF)     s.numeroNF    = dados.numeroNF;
    if (dados && dados.idContratado) s.idContratado = dados.idContratado;

    // Gerar token do portal para o contratado acompanhar
    s.tokenPortal    = Utilities.getUuid();
    var expiracao    = new Date();
    expiracao.setDate(expiracao.getDate() + 90);
    s.tokenExpiracao = expiracao.toISOString();

    _transitarSolicitacao(s, STATUS_SOLICITACAO.EM_EXECUCAO, emailOperador, {});

    _audit('CONTRATACAO_TOKEN_GERADO', { id: s.id, orgId: orgId });
    _emit('CONTRATACAO_TOKEN_GERADO', { id: s.id, numero: s.numero, orgId: orgId });

    return { ok: true, id: id, tokenPortal: s.tokenPortal };
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

  // ──────────────────────────────────────────────────────────────────
  // INSTRUÇÃO ADMINISTRATIVA (Fase 11)
  // ──────────────────────────────────────────────────────────────────

  function instruir(id, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);

    // Valida docs obrigatórios da etapa instrução
    var obrigatorios = _docObrigatoriosPorTipo(s.tipoProcesso || 'servico', 'instrucao');
    var docsEnviados = (s.documentos || []).map(function(d) { return d.tipo; });
    var faltando = obrigatorios.filter(function(t) { return docsEnviados.indexOf(t) === -1; });
    if (faltando.length > 0)
      throw new Error('Documentos obrigatórios ausentes para instrução: ' + faltando.join(', '));

    _transitarSolicitacao(s, STATUS_SOLICITACAO.EM_INSTRUCAO, emailOperador, {});
    _emit('CONTRATACAO_INSTRUIDA', { id: s.id, numero: s.numero, orgId: orgId });
    return { ok: true, id: id };
  }

  function _docObrigatoriosPorTipo(tipoProcesso, etapa) {
    var mapa = {
      servico: { instrucao: ['contrato', 'rpa'], conclusao: ['comprovante_pagamento'] },
      compra:  { instrucao: [], execucao: ['nf'], conclusao: ['comprovante_pagamento'] },
      bolsa:   { instrucao: ['termo_compromisso', 'plano_trabalho'], conclusao: ['comprovante_pagamento'] }
    };
    var tipo = mapa[tipoProcesso] || mapa.servico;
    return tipo[etapa] || [];
  }

  // ──────────────────────────────────────────────────────────────────
  // PARCELAS (Fase 11)
  // ──────────────────────────────────────────────────────────────────

  function gerarCronograma(id, qtd, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!qtd || qtd < 1 || qtd > 12) throw new Error('qtd deve ser entre 1 e 12.');
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);
    var novas = [];
    for (var i = 1; i <= qtd; i++) {
      novas.push({ numero: i, atividade: '', valor: 0, dataPrevista: '', dataPaga: null, status: 'previsto' });
    }
    s.parcelas   = novas;
    s.qtdParcelas = qtd;
    SolicitacaoRepository.salvar(orgId, s);
    return { ok: true, id: id, qtd: qtd };
  }

  function salvarParcela(id, parcela, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);
    if (!parcela || !parcela.numero) throw new Error('parcela.numero é obrigatório.');
    s.parcelas = s.parcelas || [];
    var idx = -1;
    for (var i = 0; i < s.parcelas.length; i++) {
      if (s.parcelas[i].numero === parcela.numero) { idx = i; break; }
    }
    if (idx >= 0) s.parcelas[idx] = Object.assign(s.parcelas[idx], parcela);
    else          s.parcelas.push(parcela);
    s.qtdParcelas = s.parcelas.length;
    SolicitacaoRepository.salvar(orgId, s);
    return { ok: true };
  }

  function marcarPago(id, numeroParcela, dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);
    s.parcelas = s.parcelas || [];
    var parcela = null;
    for (var i = 0; i < s.parcelas.length; i++) {
      if (s.parcelas[i].numero === numeroParcela) { parcela = s.parcelas[i]; break; }
    }
    if (!parcela) throw new Error('Parcela ' + numeroParcela + ' não encontrada.');
    if (parcela.status === 'pago') throw new Error('Parcela já registrada como paga.');

    parcela.status   = 'pago';
    parcela.dataPaga = (dados && dados.dataPaga) ? dados.dataPaga : new Date().toISOString().slice(0, 10);
    if (dados && dados.relatorioUrl) parcela.relatorioUrl = dados.relatorioUrl;

    // Atualizar totalPago
    s.totalPago = s.parcelas.reduce(function(acc, p) {
      return acc + (p.status === 'pago' ? (p.valor || 0) : 0);
    }, 0);

    // Efetivar no OrcamentoGuard
    if (s.contratoId && s.rubricaId && parcela.valor) {
      try {
        OrcamentoGuard.efetivarPagamento(s.contratoId, s.rubricaId, parcela.valor, orgId);
      } catch (e) {
        Logger.warn('solicitacao_engine', 'marcarPago', 'OrcamentoGuard: ' + e.message);
      }
    }

    SolicitacaoRepository.salvar(orgId, s);
    _audit('CONTRATACAO_PARCELA_PAGA', {
      id: s.id, numero: s.numero, parcela: numeroParcela, valor: parcela.valor, operador: emailOperador || ''
    });
    _emit('CONTRATACAO_PARCELA_PAGA', { id: s.id, numero: s.numero, parcela: numeroParcela });

    // Verificar quitação total
    var todasPagas = s.parcelas.every(function(p) { return p.status === 'pago'; });
    if (todasPagas && s.parcelas.length > 0) {
      _emit('CONTRATACAO_QUITADA', { id: s.id, numero: s.numero, orgId: orgId });
      _audit('CONTRATACAO_QUITADA', { id: s.id, numero: s.numero });
    }

    return { ok: true, totalPago: s.totalPago, quitada: todasPagas };
  }

  function _marcarAtrasadas(s) {
    var hoje = new Date().toISOString().slice(0, 10);
    (s.parcelas || []).forEach(function (p) {
      if (p.status === 'previsto' && p.dataPrevista && p.dataPrevista < hoje)
        p.status = 'atrasado';
    });
    return s;
  }

  function obterSaldoRubrica(contratoId, rubricaId, orgId) {
    orgId = orgId || _orgId();
    if (!contratoId || !rubricaId) return null;
    try { return OrcamentoGuard.snapshotSaldo(contratoId, rubricaId, orgId); } catch (_) { return null; }
  }

  // ──────────────────────────────────────────────────────────────────
  // DOCUMENTOS DO PROCESSO (Fase 11)
  // ──────────────────────────────────────────────────────────────────

  function adicionarDocumento(id, doc, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);
    if (!doc || !doc.tipo || !doc.url) throw new Error('doc.tipo e doc.url são obrigatórios.');
    s.documentos = s.documentos || [];
    doc.id          = gerarId('doc');
    doc.uploadadoPor = emailOperador || '';
    doc.uploadadoEm  = new Date().toISOString();
    s.documentos.push(doc);
    SolicitacaoRepository.salvar(orgId, s);
    _audit('CONTRATACAO_DOCUMENTO_ADICIONADO', { id: s.id, docTipo: doc.tipo, operador: emailOperador || '' });
    _emit('CONTRATACAO_DOCUMENTO_ADICIONADO', { id: s.id, docId: doc.id });
    return { ok: true, docId: doc.id };
  }

  function removerDocumento(id, docId, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);
    if (['em_instrucao', 'em_execucao', 'concluida'].indexOf(s.status) !== -1)
      throw new Error('Documentos não podem ser removidos após instrução do processo.');
    s.documentos = (s.documentos || []).filter(function(d) { return d.id !== docId; });
    SolicitacaoRepository.salvar(orgId, s);
    _audit('CONTRATACAO_DOCUMENTO_REMOVIDO', { id: s.id, docId: docId, operador: emailOperador || '' });
    return { ok: true };
  }

  // ──────────────────────────────────────────────────────────────────
  // COTAÇÕES — COMPRA (Fase 11)
  // ──────────────────────────────────────────────────────────────────

  function registrarCotacao(id, cotacao, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);
    if (s.tipoProcesso !== 'compra') throw new Error('Cotações só se aplicam a processos de COMPRA.');
    if (!cotacao || !cotacao.fornecedor || !cotacao.valor) throw new Error('cotacao.fornecedor e cotacao.valor são obrigatórios.');
    s.cotacoes = s.cotacoes || [];
    if (s.cotacoes.length >= 5) throw new Error('Máximo de 5 cotações permitidas.');
    s.cotacoes.push({ fornecedor: cotacao.fornecedor, valor: cotacao.valor,
      arquivo: cotacao.arquivo || '', dataColeta: cotacao.dataColeta || new Date().toISOString().slice(0, 10),
      selecionada: false
    });
    // Ao atingir 3 cotações, avança para cotacoes_recebidas
    if (s.cotacoes.length >= 3 && s.status === 'aguard_cotacoes') {
      _transitarSolicitacao(s, STATUS_SOLICITACAO.COTACOES_RECEBIDAS, emailOperador, {});
      _emit('CONTRATACAO_COTACAO_RECEBIDA', { id: s.id, qtdCotacoes: s.cotacoes.length });
    } else {
      SolicitacaoRepository.salvar(orgId, s);
    }
    _audit('COTACAO_REGISTRADA', { id: s.id, fornecedor: cotacao.fornecedor, valor: cotacao.valor });
    return { ok: true, qtdCotacoes: s.cotacoes.length };
  }

  function selecionarCotacao(id, indexCotacao, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var s = SolicitacaoRepository.buscarPorId(orgId, id);
    if (!s) throw new Error('Solicitação não encontrada: ' + id);
    if (!s.cotacoes || !s.cotacoes[indexCotacao]) throw new Error('Cotação ' + indexCotacao + ' não encontrada.');
    s.cotacoes.forEach(function(c, i) { c.selecionada = (i === indexCotacao); });
    SolicitacaoRepository.salvar(orgId, s);
    _audit('COTACAO_SELECIONADA', { id: s.id, index: indexCotacao, operador: emailOperador || '' });
    return { ok: true };
  }

  // ──────────────────────────────────────────────────────────────────
  // PORTAL DO CONTRATADO (Fase 11)
  // ──────────────────────────────────────────────────────────────────

  function obterPorToken(token) {
    if (!token) return null;
    try {
      var lista = SolicitacaoRepository.listar(null, {});
      for (var i = 0; i < lista.length; i++) {
        var s = lista[i];
        if (s.tokenPortal === token) {
          if (s.tokenExpiracao && new Date(s.tokenExpiracao) < new Date()) return null;
          return _visaoPublica(s);
        }
      }
      return null;
    } catch (e) {
      Logger.error('solicitacao_engine', 'obterPorToken', e.message);
      return null;
    }
  }

  function _visaoPublica(s) {
    var s2 = _marcarAtrasadas(JSON.parse(JSON.stringify(s)));
    return {
      numero:   s2.numero,
      objeto:   s2.objeto,
      programa: s2.programa || '',
      status:   s2.status,
      timeline: _timelinePublica(s2),
      parcelas: (s2.parcelas || []).map(function(p) {
        return { numero: p.numero, valor: p.valor, dataPrevista: p.dataPrevista,
          dataPaga: p.dataPaga, status: p.status };
      })
    };
  }

  function _timelinePublica(s) {
    var etapas = [
      { key: 'criadoEm',              label: 'Recebido' },
      { key: 'submetidaEm',           label: 'Submetido' },
      { key: 'aprovada_gestorEm',     label: 'Aprovado pelo setor' },
      { key: 'aprovada_financeiroEm', label: 'Aprovado financeiramente' },
      { key: 'em_instrucaoEm',        label: 'Em instrução' },
      { key: 'em_execucaoEm',         label: 'Em execução' },
      { key: 'concluidaEm',           label: 'Concluído' }
    ];
    return etapas.filter(function(e) { return !!s[e.key]; }).map(function(e) {
      return { label: e.label, data: s[e.key] };
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // VARREDURA DIÁRIA E AGENDA (Fase 11)
  // ──────────────────────────────────────────────────────────────────

  function varreduraPendencias(orgId) {
    orgId = orgId || _orgId();
    var hoje = new Date();
    var hojeStr = hoje.toISOString().slice(0, 10);
    var lista = SolicitacaoRepository.listar(orgId, {});
    var alertas = [];

    lista.forEach(function (s) {
      // Parcelas vencidas
      (s.parcelas || []).forEach(function (p) {
        if (p.status !== 'pago' && p.dataPrevista && p.dataPrevista < hojeStr) {
          var dias = Math.floor((hoje - new Date(p.dataPrevista)) / 86400000);
          var prio = dias > 3 ? 'critico' : 'alto';
          _registrarAlerta('CONTRATACAO_PARCELA_VENCIDA', {
            idSolicitacao: s.id, numero: s.numero, objeto: s.objeto,
            parcela: p.numero, dataPrevista: p.dataPrevista, diasAtraso: dias,
            valor: p.valor, prioridade: prio,
            acaoSugerida: 'Confirmar pagamento ou registrar pendência', orgId: orgId
          });
          alertas.push({ tipo: 'PARCELA_VENCIDA', id: s.id, parcela: p.numero });
        }
      });

      // Aprovações paradas
      var statusesParados = ['submetida', 'aprovada_gestor', 'aguard_cotacoes', 'em_instrucao'];
      if (statusesParados.indexOf(s.status) !== -1) {
        var ultimaEm = s[(s.status + 'Em')] || s.criadoEm;
        if (ultimaEm) {
          var diasParado = Math.floor((hoje - new Date(ultimaEm)) / 86400000);
          var limDias = 3;
          if (diasParado > limDias) {
            var prio2 = diasParado > 5 ? 'critico' : 'alto';
            _registrarAlerta('CONTRATACAO_APROVACAO_PARADA', {
              idSolicitacao: s.id, numero: s.numero, objeto: s.objeto,
              status: s.status, diasParado: diasParado, prioridade: prio2,
              acaoSugerida: 'Verificar aprovador responsável', orgId: orgId
            });
            alertas.push({ tipo: 'APROVACAO_PARADA', id: s.id, dias: diasParado });
          }
        }
      }
    });

    Logger.info('solicitacao_engine', 'varreduraPendencias',
      'Varredura concluída — alertas: ' + alertas.length);
    return { ok: true, alertas: alertas.length, detalhes: alertas };
  }

  function _registrarAlerta(tipo, dados) {
    try {
      if (typeof AlertasEngine !== 'undefined')
        AlertasEngine.registrar(tipo, dados);
      else
        _audit(tipo, dados);
    } catch (_) {
      _audit(tipo, dados);
    }
  }

  function obterAgendaDesembolsos(mes, ano, orgId) {
    orgId = orgId || _orgId();
    var lista = SolicitacaoRepository.listar(orgId, {});
    var agenda = [];
    var mesStr  = String(ano) + '-' + (mes < 10 ? '0' : '') + String(mes);
    lista.forEach(function (s) {
      (s.parcelas || []).forEach(function (p) {
        if (p.dataPrevista && p.dataPrevista.slice(0, 7) === mesStr) {
          agenda.push({
            data: p.dataPrevista, valor: p.valor, status: p.status,
            numero: s.numero, objeto: s.objeto, idSolicitacao: s.id,
            parcela: p.numero, dataPaga: p.dataPaga || null
          });
        }
      });
    });
    agenda.sort(function (a, b) { return String(a.data).localeCompare(String(b.data)); });
    var totalPrevisto = agenda.reduce(function(acc, i) { return acc + (i.valor || 0); }, 0);
    var totalPago     = agenda.reduce(function(acc, i) { return acc + (i.status === 'pago' ? (i.valor || 0) : 0); }, 0);
    return { mes: mes, ano: ano, agenda: agenda, totalPrevisto: totalPrevisto, totalPago: totalPago };
  }

  function obterProdutividade(periodo, orgId) {
    orgId = orgId || _orgId();
    var lista = SolicitacaoRepository.listar(orgId, {});
    var hoje = new Date();
    var dataCorte = new Date(hoje);
    if (periodo === 'trimestre') dataCorte.setMonth(dataCorte.getMonth() - 3);
    else if (periodo === 'ano')  dataCorte.setFullYear(dataCorte.getFullYear() - 1);
    else dataCorte.setMonth(dataCorte.getMonth() - 1); // mês

    var filtrada = lista.filter(function(s) {
      return s.criadoEm && new Date(s.criadoEm) >= dataCorte;
    });

    var contar = function(st) {
      return filtrada.filter(function(s) { return s.status === st; }).length;
    };

    // Tempos médios por etapa (dias)
    var tempos = { submParaGestor: [], gestorParaFin: [], totalSubmExec: [] };
    filtrada.forEach(function(s) {
      if (s.submetidaEm && s.aprovada_gestorEm)
        tempos.submParaGestor.push((new Date(s.aprovada_gestorEm) - new Date(s.submetidaEm)) / 86400000);
      if (s.aprovada_gestorEm && s.aprovada_financeiroEm)
        tempos.gestorParaFin.push((new Date(s.aprovada_financeiroEm) - new Date(s.aprovada_gestorEm)) / 86400000);
      if (s.submetidaEm && s.em_execucaoEm)
        tempos.totalSubmExec.push((new Date(s.em_execucaoEm) - new Date(s.submetidaEm)) / 86400000);
    });
    var media = function(arr) {
      return arr.length ? Math.round(arr.reduce(function(a, b) { return a + b; }, 0) / arr.length * 10) / 10 : null;
    };

    var devolvidas = filtrada.filter(function(s) {
      return s.devolvidaEm;
    }).length;

    return {
      periodo:          periodo || 'mes',
      abertas:          filtrada.length,
      emExecucao:       contar('em_execucao'),
      concluidas:       contar('concluida'),
      devolvidas:       devolvidas,
      canceladas:       contar('cancelada'),
      rejeitadas:       contar('rejeitada'),
      taxaDevolucao:    filtrada.length ? Math.round(devolvidas / filtrada.length * 100) : 0,
      tempoMedioEtapas: {
        submParaGestor: media(tempos.submParaGestor),
        gestorParaFin:  media(tempos.gestorParaFin),
        totalSubmExec:  media(tempos.totalSubmExec)
      },
      funil: {
        abertas:    filtrada.length,
        submetidas: filtrada.filter(function(s) { return !!s.submetidaEm; }).length,
        aprovGestor:filtrada.filter(function(s) { return !!s.aprovada_gestorEm; }).length,
        aprovFin:   filtrada.filter(function(s) { return !!s.aprovada_financeiroEm; }).length,
        emExec:     filtrada.filter(function(s) { return !!s.em_execucaoEm; }).length
      },
      geradoEm: new Date().toISOString()
    };
  }

  // ── API pública ───────────────────────────────────────────────────

  return {
    STATUS_SOLICITACAO:     STATUS_SOLICITACAO,
    TIPO_SERVICO:           TIPO_SERVICO_CONTRATACAO,

    // Leitura
    listar:        listar,
    buscarPorId:   buscarPorId,
    obterMetricas: obterMetricas,

    TIPO_PROCESSO:          TIPO_PROCESSO_CONTRATACAO,
    NATUREZA:               NATUREZA_CONTRATACAO,

    // Escrita / Aprovação
    salvar:             salvar,
    submeter:           submeter,
    aprovarGestor:      aprovarGestor,
    aprovarFinanceiro:  aprovarFinanceiro,
    iniciarExecucao:    iniciarExecucao,
    concluir:           concluir,
    rejeitar:           rejeitar,
    devolver:           devolver,
    cancelar:           cancelar,

    // Instrução
    instruir:           instruir,

    // Parcelas
    gerarCronograma:    gerarCronograma,
    salvarParcela:      salvarParcela,
    marcarPago:         marcarPago,
    obterSaldoRubrica:  obterSaldoRubrica,

    // Documentos
    adicionarDocumento: adicionarDocumento,
    removerDocumento:   removerDocumento,

    // Cotações (COMPRA)
    registrarCotacao:   registrarCotacao,
    selecionarCotacao:  selecionarCotacao,

    // Portal
    obterPorToken:      obterPorToken,

    // Varredura e agenda
    varreduraPendencias:     varreduraPendencias,
    obterAgendaDesembolsos:  obterAgendaDesembolsos,
    obterProdutividade:      obterProdutividade
  };

})();
