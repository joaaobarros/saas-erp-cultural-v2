/**
 * @file modules/pessoas/contratado_engine.gs
 * @layer modules/pessoas
 * @description Engine de Contratados Externos (PF + PJ unificado).
 *
 * Entidade ContratadoExterno: agentes culturais, fornecedores,
 * prestadores de serviço — NÃO são colaboradores (empregados).
 *
 * FSM — Status do Contratado:
 *   cadastrado → habilitado, suspenso, descredenciado
 *   habilitado → suspenso, descredenciado
 *   suspenso   → habilitado, descredenciado
 *   descredenciado → [] (terminal)
 *
 * HabilitacoesEngine (integrado): processo de vetting/qualificação.
 *
 * FSM — Habilitação:
 *   submetido → em_analise, cancelado
 *   em_analise → aprovado, reprovado, devolvido
 *   devolvido  → submetido, cancelado
 *   aprovado   → suspenso, cancelado   (aprovado = ContratadoExterno habilitado)
 *   reprovado  → [] (terminal)
 *   cancelado  → [] (terminal)
 *   suspenso   → aprovado, cancelado   (suspensão temporária da habilitação)
 *
 * @depends modules/pessoas/contratado_repository.gs (ContratadoRepository)
 *          core/services/fsm_guardian.gs (FsmGuardian)
 *          core/services/auditoria_service.gs (AuditoriaService)
 *          core/event_bus_backend.gs (SystemEvents)
 *          core/events_constants.gs (SystemEventTypes)
 *          core/logger.gs (Logger)
 */

// ── Constantes ───────────────────────────────────────────────────

var STATUS_CONTRATADO = Object.freeze({
  CADASTRADO:      'cadastrado',
  HABILITADO:      'habilitado',
  SUSPENSO:        'suspenso',
  DESCREDENCIADO:  'descredenciado'
});

var TIPO_PESSOA = Object.freeze({
  PF: 'pf',
  PJ: 'pj'
});

var STATUS_HABILITACAO = Object.freeze({
  SUBMETIDO:  'submetido',
  EM_ANALISE: 'em_analise',
  APROVADO:   'aprovado',
  REPROVADO:  'reprovado',
  DEVOLVIDO:  'devolvido',
  SUSPENSO:   'suspenso',
  CANCELADO:  'cancelado'
});

var _TRANSICOES_CONTRATADO = {
  cadastrado:     ['habilitado', 'suspenso', 'descredenciado'],
  habilitado:     ['suspenso', 'descredenciado'],
  suspenso:       ['habilitado', 'descredenciado'],
  descredenciado: []
};

var _TRANSICOES_HABILITACAO = {
  submetido:  ['em_analise', 'cancelado'],
  em_analise: ['aprovado', 'reprovado', 'devolvido'],
  devolvido:  ['submetido', 'cancelado'],
  aprovado:   ['suspenso', 'cancelado'],
  reprovado:  [],
  cancelado:  [],
  suspenso:   ['aprovado', 'cancelado']
};

if (typeof FsmGuardian !== 'undefined') {
  FsmGuardian.registrar('contratado_status',   _TRANSICOES_CONTRATADO);
  FsmGuardian.registrar('habilitacao_status',  _TRANSICOES_HABILITACAO);
}

// ── Engine ────────────────────────────────────────────────────────

var ContratadoEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  function _audit(evento, dados) {
    try {
      if (typeof AuditoriaService !== 'undefined')
        AuditoriaService.registrar(evento, 'contratados', dados || {});
    } catch (_) {}
  }

  function _emit(tipo, payload) {
    try {
      if (typeof SystemEvents !== 'undefined')
        SystemEvents.emit(tipo, payload || {});
    } catch (_) {}
  }

  function _transitarContratado(contratado, novoStatus, emailOperador) {
    var atual = contratado.status || 'cadastrado';
    if (typeof FsmGuardian !== 'undefined') {
      FsmGuardian.validarTransicao('contratado_status', atual, novoStatus);
    }
    contratado.status = novoStatus;
    ContratadoRepository.salvar(contratado.orgId || _orgId(), contratado);
    _audit('CONTRATADO_STATUS_ALTERADO', {
      id: contratado.id, de: atual, para: novoStatus, operador: emailOperador
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // CONTRATADOS
  // ──────────────────────────────────────────────────────────────────

  function listar(filtros, orgId) {
    return ContratadoRepository.listar(orgId || _orgId(), filtros || {});
  }

  function buscarPorId(id, orgId) {
    return ContratadoRepository.buscarPorId(orgId || _orgId(), id);
  }

  function buscarPorDocumento(documento, orgId) {
    return ContratadoRepository.buscarPorDocumento(orgId || _orgId(), documento);
  }

  function salvar(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    dados = dados || {};
    if (!dados.nome) throw new Error('Nome é obrigatório.');
    if (!dados.tipoPessoa) throw new Error('tipoPessoa (pf/pj) é obrigatório.');
    if (dados.tipoPessoa === 'pf' && !dados.cpf)   throw new Error('CPF é obrigatório para Pessoa Física.');
    if (dados.tipoPessoa === 'pj' && !dados.cnpj)  throw new Error('CNPJ é obrigatório para Pessoa Jurídica.');

    // Verificar duplicidade por documento
    if (!dados.id) {
      var doc = dados.cpf || dados.cnpj;
      var existente = ContratadoRepository.buscarPorDocumento(orgId, doc);
      if (existente) throw new Error('Já existe um contratado com este CPF/CNPJ cadastrado: ' + existente.nome);
    }

    var r = ContratadoRepository.salvar(orgId, dados);
    var evento = r.isNovo ? 'CONTRATADO_CADASTRADO' : 'CONTRATADO_ATUALIZADO';
    _audit(evento, { id: r.id, nome: dados.nome, operador: emailOperador || '' });
    return r.id;
  }

  function mudarStatus(id, novoStatus, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var c = ContratadoRepository.buscarPorId(orgId, id);
    if (!c) throw new Error('Contratado não encontrado: ' + id);
    _transitarContratado(c, novoStatus, emailOperador);
    return { ok: true, id: id, status: novoStatus };
  }

  function obterMetricas(orgId) {
    orgId = orgId || _orgId();
    var lista = ContratadoRepository.listar(orgId);
    var porStatus = {};
    var porTipo   = {};
    lista.forEach(function (c) {
      var s = c.status || 'cadastrado';
      porStatus[s] = (porStatus[s] || 0) + 1;
      var t = c.tipoPessoa || 'nao_informado';
      porTipo[t]   = (porTipo[t]   || 0) + 1;
    });
    return {
      total:          lista.length,
      habilitados:    porStatus['habilitado']    || 0,
      cadastrados:    porStatus['cadastrado']    || 0,
      suspensos:      porStatus['suspenso']      || 0,
      descredenciados:porStatus['descredenciado']|| 0,
      pf:             porTipo['pf']              || 0,
      pj:             porTipo['pj']              || 0,
      geradoEm:       new Date().toISOString()
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // HABILITAÇÕES
  // ──────────────────────────────────────────────────────────────────

  function _transitarHabilitacao(habilitacao, novoStatus, emailOperador, dadosExtras) {
    var atual = habilitacao.status || 'submetido';
    if (typeof FsmGuardian !== 'undefined') {
      FsmGuardian.validarTransicao('habilitacao_status', atual, novoStatus);
    }
    dadosExtras = dadosExtras || {};
    habilitacao.status = novoStatus;
    habilitacao[novoStatus + 'Em']  = new Date().toISOString();
    habilitacao[novoStatus + 'Por'] = emailOperador || '';
    if (dadosExtras.parecer)     habilitacao.parecer     = dadosExtras.parecer;
    if (dadosExtras.observacao)  habilitacao.observacao  = dadosExtras.observacao;
    ContratadoRepository.salvarHabilitacao(habilitacao);
    _audit('HABILITACAO_' + novoStatus.toUpperCase(), {
      id: habilitacao.id, idContratado: habilitacao.idContratado,
      de: atual, para: novoStatus, operador: emailOperador
    });
    _emit(SystemEventTypes
      ? SystemEventTypes['QUALIFICATION_' + novoStatus.toUpperCase()] || 'QUALIFICATION_UPDATED'
      : 'QUALIFICATION_UPDATED',
      { idHabilitacao: habilitacao.id, idContratado: habilitacao.idContratado }
    );
    return habilitacao;
  }

  function listarHabilitacoes(filtros, orgId) {
    orgId   = orgId || _orgId();
    filtros = Object.assign({ orgId: orgId }, filtros || {});
    return ContratadoRepository.listarHabilitacoes(filtros);
  }

  function submeterHabilitacao(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    dados = dados || {};
    if (!dados.idContratado) throw new Error('idContratado é obrigatório.');
    var c = ContratadoRepository.buscarPorId(orgId, dados.idContratado);
    if (!c) throw new Error('Contratado não encontrado: ' + dados.idContratado);

    dados.orgId        = orgId;
    dados.submetidoPor = emailOperador || '';
    dados.status       = STATUS_HABILITACAO.SUBMETIDO;

    var r = ContratadoRepository.salvarHabilitacao(dados);
    _audit('HABILITACAO_SUBMETIDA', {
      id: r.id, idContratado: dados.idContratado, operador: emailOperador || ''
    });
    _emit(SystemEventTypes ? SystemEventTypes.QUALIFICATION_SUBMITTED : 'QUALIFICATION_SUBMITTED', {
      idHabilitacao: r.id, idContratado: dados.idContratado
    });
    return r.id;
  }

  function iniciarAnalise(id, emailAnalista) {
    var h = ContratadoRepository.buscarHabilitacaoPorId(id);
    if (!h) throw new Error('Habilitação não encontrada: ' + id);
    _transitarHabilitacao(h, STATUS_HABILITACAO.EM_ANALISE, emailAnalista, {});
    return { ok: true, id: id };
  }

  function aprovarHabilitacao(id, parecer, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var h = ContratadoRepository.buscarHabilitacaoPorId(id);
    if (!h) throw new Error('Habilitação não encontrada: ' + id);
    _transitarHabilitacao(h, STATUS_HABILITACAO.APROVADO, emailOperador, { parecer: parecer });

    // Promover ContratadoExterno para 'habilitado'
    try {
      var c = ContratadoRepository.buscarPorId(orgId, h.idContratado);
      if (c && c.status !== 'habilitado') {
        _transitarContratado(c, STATUS_CONTRATADO.HABILITADO, emailOperador);
      }
    } catch (e) {
      Logger.warn('contratado_engine', 'aprovarHabilitacao', e.message);
    }
    return { ok: true, id: id };
  }

  function reprovarHabilitacao(id, parecer, emailOperador) {
    var h = ContratadoRepository.buscarHabilitacaoPorId(id);
    if (!h) throw new Error('Habilitação não encontrada: ' + id);
    // Snapshot antes de reprovar (padrão Skill.md)
    _audit('HABILITACAO_SNAPSHOT_REPROVAR', {
      snapshot: JSON.parse(JSON.stringify(h)), operador: emailOperador || ''
    });
    _transitarHabilitacao(h, STATUS_HABILITACAO.REPROVADO, emailOperador, { parecer: parecer });
    return { ok: true, id: id };
  }

  function devolverHabilitacao(id, observacao, emailOperador) {
    var h = ContratadoRepository.buscarHabilitacaoPorId(id);
    if (!h) throw new Error('Habilitação não encontrada: ' + id);
    _transitarHabilitacao(h, STATUS_HABILITACAO.DEVOLVIDO, emailOperador, { observacao: observacao });
    return { ok: true, id: id };
  }

  function cancelarHabilitacao(id, motivo, emailOperador) {
    var h = ContratadoRepository.buscarHabilitacaoPorId(id);
    if (!h) throw new Error('Habilitação não encontrada: ' + id);
    _transitarHabilitacao(h, STATUS_HABILITACAO.CANCELADO, emailOperador, { observacao: motivo });
    return { ok: true, id: id };
  }

  function suspenderHabilitacao(id, motivo, emailOperador) {
    var h = ContratadoRepository.buscarHabilitacaoPorId(id);
    if (!h) throw new Error('Habilitação não encontrada: ' + id);
    _transitarHabilitacao(h, STATUS_HABILITACAO.SUSPENSO, emailOperador, { observacao: motivo });
    // Suspender também o contratado
    try {
      var c = ContratadoRepository.buscarPorId(h.orgId, h.idContratado);
      if (c && c.status === 'habilitado') {
        _transitarContratado(c, STATUS_CONTRATADO.SUSPENSO, emailOperador);
      }
    } catch (e) {
      Logger.warn('contratado_engine', 'suspenderHabilitacao', e.message);
    }
    return { ok: true, id: id };
  }

  function reinstaurarHabilitacao(id, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var h = ContratadoRepository.buscarHabilitacaoPorId(id);
    if (!h) throw new Error('Habilitação não encontrada: ' + id);
    _transitarHabilitacao(h, STATUS_HABILITACAO.APROVADO, emailOperador, {});
    // Reabilitar contratado
    try {
      var c = ContratadoRepository.buscarPorId(orgId, h.idContratado);
      if (c && c.status === 'suspenso') {
        _transitarContratado(c, STATUS_CONTRATADO.HABILITADO, emailOperador);
      }
    } catch (e) {
      Logger.warn('contratado_engine', 'reinstaurarHabilitacao', e.message);
    }
    return { ok: true, id: id };
  }

  // ──────────────────────────────────────────────────────────────────
  // DADOS BANCÁRIOS E DOCUMENTOS DE HABILITAÇÃO (Fase 11)
  // ──────────────────────────────────────────────────────────────────

  function salvarDadosBancarios(id, dadosBancarios, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!id) throw new Error('id é obrigatório.');
    var c = ContratadoRepository.buscarPorId(orgId, id);
    if (!c) throw new Error('Contratado não encontrado: ' + id);
    c.dadosBancarios = dadosBancarios || {};
    ContratadoRepository.salvar(orgId, c);
    _audit('CONTRATADO_DADOS_BANCARIOS_ATUALIZADOS', {
      id: id, operador: emailOperador || ''
    });
    return { ok: true };
  }

  function adicionarDocumentoContratado(id, doc, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!id || !doc || !doc.tipo || !doc.url) throw new Error('id, doc.tipo e doc.url são obrigatórios.');
    var c = ContratadoRepository.buscarPorId(orgId, id);
    if (!c) throw new Error('Contratado não encontrado: ' + id);
    if (!c.documentos) c.documentos = [];
    doc.id           = gerarId('dct');
    doc.uploadadoPor = emailOperador || '';
    doc.uploadadoEm  = new Date().toISOString();
    doc.ativo        = true;
    c.documentos.push(doc);
    ContratadoRepository.salvar(orgId, c);
    _audit('CONTRATADO_DOCUMENTO_ADICIONADO', {
      id: id, docTipo: doc.tipo, operador: emailOperador || ''
    });
    return { ok: true, docId: doc.id };
  }

  function removerDocumentoContratado(id, docId, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var c = ContratadoRepository.buscarPorId(orgId, id);
    if (!c) throw new Error('Contratado não encontrado: ' + id);
    c.documentos = (c.documentos || []).filter(function (d) { return d.id !== docId; });
    ContratadoRepository.salvar(orgId, c);
    _audit('CONTRATADO_DOCUMENTO_REMOVIDO', { id: id, docId: docId, operador: emailOperador || '' });
    return { ok: true };
  }

  function verificarHabilitacao(id, orgId) {
    orgId = orgId || _orgId();
    var c = ContratadoRepository.buscarPorId(orgId, id);
    if (!c) return { habilitado: false, motivo: 'Contratado não encontrado.' };

    var habilitado = c.status === 'habilitado';
    var hoje = new Date();
    var docsVencidos = [];
    var docsPendentes = [];

    (c.documentos || []).forEach(function (d) {
      if (!d.ativo) return;
      if (d.validade) {
        var venc = new Date(d.validade);
        if (venc < hoje) docsVencidos.push({ tipo: d.tipo, nome: d.nome, validade: d.validade });
      }
    });

    return {
      habilitado:       habilitado,
      status:           c.status,
      documentosVencidos: docsVencidos,
      temDocumentosVencidos: docsVencidos.length > 0
    };
  }

  // ── API pública ───────────────────────────────────────────────────

  return {
    STATUS_CONTRATADO:  STATUS_CONTRATADO,
    TIPO_PESSOA:        TIPO_PESSOA,
    STATUS_HABILITACAO: STATUS_HABILITACAO,

    // Contratados
    listar:             listar,
    buscarPorId:        buscarPorId,
    buscarPorDocumento: buscarPorDocumento,
    salvar:             salvar,
    mudarStatus:        mudarStatus,
    obterMetricas:      obterMetricas,

    // Habilitações
    listarHabilitacoes:     listarHabilitacoes,
    submeterHabilitacao:    submeterHabilitacao,
    iniciarAnalise:         iniciarAnalise,
    aprovarHabilitacao:     aprovarHabilitacao,
    reprovarHabilitacao:    reprovarHabilitacao,
    devolverHabilitacao:    devolverHabilitacao,
    cancelarHabilitacao:    cancelarHabilitacao,
    suspenderHabilitacao:   suspenderHabilitacao,
    reinstaurarHabilitacao: reinstaurarHabilitacao,

    // Dados bancários e documentos (Fase 11)
    salvarDadosBancarios:          salvarDadosBancarios,
    adicionarDocumentoContratado:  adicionarDocumentoContratado,
    removerDocumentoContratado:    removerDocumentoContratado,
    verificarHabilitacao:          verificarHabilitacao
  };

})();
