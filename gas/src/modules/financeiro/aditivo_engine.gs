/**
 * @file modules/financeiro/aditivo_engine.gs
 * @layer modules/financeiro
 * @description Repositório e Engine de Aditivos Contratuais.
 *
 * Fonte de verdade: aditivos_contratos.json (Drive)
 *
 * FSM de status:
 *   elaborando → submetido_interno
 *   submetido_interno → aprovado_interno | rejeitado
 *   aprovado_interno → submetido_fundador
 *   submetido_fundador → aprovado_fundador | rejeitado
 *   aprovado_fundador → efetivado
 *   efetivado → [] (terminal)
 *   rejeitado → [] (terminal)
 *
 * Efetivação automática: atualiza valorTotal e vigenciaFim em contratos.json.
 *
 * @depends core/data_layer.gs (readJSON, modifyJSON)
 *          core/services/fsm_guardian.gs (FsmGuardian)
 *          core/services/auditoria_service.gs (AuditoriaService)
 *          core/event_bus_backend.gs (SystemEvents)
 *          core/utils.gs (gerarId, agora)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 */

// ── Constantes ────────────────────────────────────────────────────

var STATUS_ADITIVO = Object.freeze({
  ELABORANDO:          'elaborando',
  SUBMETIDO_INTERNO:   'submetido_interno',
  APROVADO_INTERNO:    'aprovado_interno',
  SUBMETIDO_FUNDADOR:  'submetido_fundador',
  APROVADO_FUNDADOR:   'aprovado_fundador',
  EFETIVADO:           'efetivado',
  REJEITADO:           'rejeitado'
});

var TIPO_ADITIVO = Object.freeze({
  VALOR:      'valor',
  PRAZO:      'prazo',
  ESCOPO:     'escopo',
  METAS:      'metas',
  RUBRICAS:   'rubricas',
  MISTO:      'misto'
});

// ── FSM ───────────────────────────────────────────────────────────

var _TRANSICOES_ADITIVO = {
  elaborando:         ['submetido_interno'],
  submetido_interno:  ['aprovado_interno', 'rejeitado'],
  aprovado_interno:   ['submetido_fundador'],
  submetido_fundador: ['aprovado_fundador', 'rejeitado'],
  aprovado_fundador:  ['efetivado'],
  efetivado:          [],
  rejeitado:          []
};

if (typeof FsmGuardian !== 'undefined') {
  try { FsmGuardian.registrar('aditivos', _TRANSICOES_ADITIVO); } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════
// REPOSITÓRIO
// ═══════════════════════════════════════════════════════════════

var AditivoRepository = (function () {

  var _ARQUIVO = 'aditivos_contratos.json';

  function _orgId(orgId) { return orgId || getOrgConfig().orgId; }

  function listar(orgId, filtros) {
    orgId   = _orgId(orgId);
    filtros = filtros || {};
    var todos = readJSON(_ARQUIVO) || [];
    return todos.filter(function (a) {
      if (a.orgId && a.orgId !== orgId) return false;
      if (filtros.status    && a.status    !== filtros.status)    return false;
      if (filtros.contratoId && a.contratoId !== filtros.contratoId) return false;
      if (filtros.tipo      && a.tipo      !== filtros.tipo)      return false;
      return true;
    }).sort(function (a, b) {
      return String(b.criadoEm || '').localeCompare(String(a.criadoEm || ''));
    });
  }

  function buscarPorId(orgId, id) {
    orgId = _orgId(orgId);
    var todos = readJSON(_ARQUIVO) || [];
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].id === id && (todos[i].orgId === orgId || !todos[i].orgId)) return todos[i];
    }
    return null;
  }

  function salvar(orgId, dados) {
    orgId       = _orgId(orgId);
    dados       = dados || {};
    dados.orgId = orgId;
    var agr     = agora ? agora() : new Date().toISOString();
    var isNovo  = !dados.id;
    if (isNovo) {
      dados.id          = gerarId('adt');
      dados.numero      = dados.numero || ('ADT-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4));
      dados.criadoEm    = agr;
      dados.versao      = 1;
      if (!dados.status)      dados.status      = STATUS_ADITIVO.ELABORANDO;
      if (!dados.alteracoes)  dados.alteracoes  = [];
      if (!dados.aprovacoes)  dados.aprovacoes  = [];
    } else {
      dados.versao = (dados.versao || 0) + 1;
    }
    dados.atualizadoEm = agr;

    modifyJSON(_ARQUIVO, function (lista) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === dados.id) { idx = i; break; }
      }
      if (idx >= 0) lista[idx] = dados;
      else lista.push(dados);
      return lista;
    });
    return { id: dados.id, isNovo: isNovo };
  }

  return { listar: listar, buscarPorId: buscarPorId, salvar: salvar };
})();

// ═══════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════

var AditivoEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  function _audit(evento, dados) {
    try { if (typeof AuditoriaService !== 'undefined') AuditoriaService.registrar(evento, 'financeiro', dados || {}); } catch (_) {}
  }

  function _emit(tipo, payload) {
    try { if (typeof SystemEvents !== 'undefined') SystemEvents.emit(tipo, payload || {}); } catch (_) {}
  }

  function _transitar(adi, novoStatus, emailOperador, orgId) {
    var atual = adi.status || STATUS_ADITIVO.ELABORANDO;
    if (typeof FsmGuardian !== 'undefined') {
      FsmGuardian.validarTransicao('aditivos', atual, novoStatus);
    } else {
      var perm = _TRANSICOES_ADITIVO[atual] || [];
      if (perm.indexOf(novoStatus) === -1)
        throw new Error('Transição inválida: "' + atual + '" → "' + novoStatus + '".');
    }
    // Snapshot antes de rejeição
    if (novoStatus === STATUS_ADITIVO.REJEITADO) {
      _audit('ADITIVO_SNAPSHOT_REJEITADO', {
        snapshot: JSON.parse(JSON.stringify(adi)), operador: emailOperador || ''
      });
    }
    adi.status = novoStatus;
    adi[novoStatus + 'Em']  = new Date().toISOString();
    adi[novoStatus + 'Por'] = emailOperador || '';
    AditivoRepository.salvar(orgId, adi);
    _audit('ADITIVO_' + novoStatus.toUpperCase(), {
      id: adi.id, numero: adi.numero, de: atual, para: novoStatus, operador: emailOperador || ''
    });
    return adi;
  }

  // ── CRUD ─────────────────────────────────────────────────────

  function listar(filtros, orgId) {
    return AditivoRepository.listar(orgId || _orgId(), filtros || {});
  }

  function buscarPorId(id, orgId) {
    return AditivoRepository.buscarPorId(orgId || _orgId(), id);
  }

  function salvar(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!dados || !dados.contratoId) throw new Error('contratoId é obrigatório.');
    if (!dados.tipo || Object.values(TIPO_ADITIVO).indexOf(dados.tipo) === -1)
      throw new Error('Tipo de aditivo inválido. Válidos: ' + Object.values(TIPO_ADITIVO).join(', '));
    if (!dados.objeto || !String(dados.objeto).trim())
      throw new Error('Objeto / justificativa do aditivo é obrigatório.');
    if (dados.status && [STATUS_ADITIVO.ELABORANDO].indexOf(dados.status) === -1)
      throw new Error('Apenas aditivos em ELABORANDO podem ser editados.');

    if (!dados.id) dados.criadoPor = emailOperador || '';
    var resultado = AditivoRepository.salvar(orgId, dados);
    _audit(resultado.isNovo ? 'ADITIVO_CRIADO' : 'ADITIVO_ATUALIZADO', {
      id: resultado.id, numero: dados.numero, tipo: dados.tipo, operador: emailOperador || ''
    });
    return resultado.id;
  }

  // ── FLUXO DE APROVAÇÃO ────────────────────────────────────────

  function submeterInterno(id, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var adi = AditivoRepository.buscarPorId(orgId, id);
    if (!adi) throw new Error('Aditivo não encontrado: ' + id);
    _transitar(adi, STATUS_ADITIVO.SUBMETIDO_INTERNO, emailOperador, orgId);
    return { ok: true, id: id, numero: adi.numero };
  }

  function aprovarInterno(id, parecer, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var adi = AditivoRepository.buscarPorId(orgId, id);
    if (!adi) throw new Error('Aditivo não encontrado: ' + id);
    adi.aprovacoes = adi.aprovacoes || [];
    adi.aprovacoes.push({
      etapa: 'interno', papel: 'financeiro', email: emailOperador || '',
      parecer: parecer || '', decisao: 'aprovado', timestamp: new Date().toISOString()
    });
    _transitar(adi, STATUS_ADITIVO.APROVADO_INTERNO, emailOperador, orgId);
    return { ok: true, id: id };
  }

  function submeterFundador(id, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var adi = AditivoRepository.buscarPorId(orgId, id);
    if (!adi) throw new Error('Aditivo não encontrado: ' + id);
    if (!adi.documentoUrl || !String(adi.documentoUrl).trim())
      throw new Error('URL do documento assinado é obrigatório antes de submeter ao fundador.');
    _transitar(adi, STATUS_ADITIVO.SUBMETIDO_FUNDADOR, emailOperador, orgId);
    return { ok: true, id: id, numero: adi.numero };
  }

  function aprovarFundador(id, parecer, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var adi = AditivoRepository.buscarPorId(orgId, id);
    if (!adi) throw new Error('Aditivo não encontrado: ' + id);
    adi.aprovacoes = adi.aprovacoes || [];
    adi.aprovacoes.push({
      etapa: 'fundador', papel: 'fundador', email: emailOperador || '',
      parecer: parecer || '', decisao: 'aprovado', timestamp: new Date().toISOString()
    });
    _transitar(adi, STATUS_ADITIVO.APROVADO_FUNDADOR, emailOperador, orgId);
    return { ok: true, id: id };
  }

  function rejeitar(id, parecer, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!parecer) throw new Error('Parecer de rejeição é obrigatório.');
    var adi = AditivoRepository.buscarPorId(orgId, id);
    if (!adi) throw new Error('Aditivo não encontrado: ' + id);
    adi.aprovacoes = adi.aprovacoes || [];
    adi.aprovacoes.push({
      etapa: adi.status, email: emailOperador || '', parecer: parecer,
      decisao: 'rejeitado', timestamp: new Date().toISOString()
    });
    _transitar(adi, STATUS_ADITIVO.REJEITADO, emailOperador, orgId);
    return { ok: true, id: id };
  }

  /**
   * Efetivar: aplica as alterações do aditivo em contratos.json.
   * Suporta alterações de valor e de prazo automaticamente.
   * Só executa com status APROVADO_FUNDADOR.
   */
  function efetivar(id, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var adi = AditivoRepository.buscarPorId(orgId, id);
    if (!adi) throw new Error('Aditivo não encontrado: ' + id);
    if (adi.status !== STATUS_ADITIVO.APROVADO_FUNDADOR)
      throw new Error('Apenas aditivos APROVADOS PELO FUNDADOR podem ser efetivados. Status: ' + adi.status);

    // Aplica alterações no contrato
    modifyJSON('contratos.json', function (contratos) {
      for (var i = 0; i < contratos.length; i++) {
        var c = contratos[i];
        if (c.id !== adi.contratoId) continue;

        if (adi.novoValorTotal && adi.novoValorTotal > 0)
          c.valorTotal = adi.novoValorTotal;
        if (adi.novoPrazoVigencia)
          c.vigenciaFim = adi.novoPrazoVigencia;
        if (adi.valorAdicional && adi.valorAdicional !== 0)
          c.valorTotal = (c.valorTotal || 0) + adi.valorAdicional;

        c.atualizadoEm = new Date().toISOString();
        c.versao = (c.versao || 0) + 1;
        contratos[i] = c;
        break;
      }
      return contratos;
    });

    _transitar(adi, STATUS_ADITIVO.EFETIVADO, emailOperador, orgId);
    _emit('CONTRATO_UPDATED', {
      entidade: 'aditivo_efetivado', entidadeId: adi.contratoId,
      aditivoId: id, usuario: emailOperador || '', orgId: orgId
    });
    return { ok: true, id: id, numero: adi.numero };
  }

  // ── Métricas ──────────────────────────────────────────────────

  function obterMetricas(orgId) {
    orgId = orgId || _orgId();
    var lista = AditivoRepository.listar(orgId);
    var valorAditivado = 0;
    lista.forEach(function (a) {
      if (a.status === STATUS_ADITIVO.EFETIVADO && a.valorAdicional) valorAditivado += a.valorAdicional || 0;
    });
    return {
      total:            lista.length,
      emElaboracao:     lista.filter(function(a){ return a.status === STATUS_ADITIVO.ELABORANDO; }).length,
      pendentes:        lista.filter(function(a){
        return [STATUS_ADITIVO.SUBMETIDO_INTERNO, STATUS_ADITIVO.APROVADO_INTERNO,
                STATUS_ADITIVO.SUBMETIDO_FUNDADOR].indexOf(a.status) !== -1;
      }).length,
      efetivados:       lista.filter(function(a){ return a.status === STATUS_ADITIVO.EFETIVADO; }).length,
      rejeitados:       lista.filter(function(a){ return a.status === STATUS_ADITIVO.REJEITADO; }).length,
      valorAditivado:   valorAditivado,
      geradoEm:         new Date().toISOString()
    };
  }

  return {
    STATUS_ADITIVO:    STATUS_ADITIVO,
    TIPO_ADITIVO:      TIPO_ADITIVO,
    listar:            listar,
    buscarPorId:       buscarPorId,
    salvar:            salvar,
    submeterInterno:   submeterInterno,
    aprovarInterno:    aprovarInterno,
    submeterFundador:  submeterFundador,
    aprovarFundador:   aprovarFundador,
    rejeitar:          rejeitar,
    efetivar:          efetivar,
    obterMetricas:     obterMetricas
  };
})();
