/**
 * @file modules/financeiro/fonte_recurso_engine.gs
 * @layer modules/financeiro
 * @description Repositório e Engine de Fontes de Recurso.
 *
 * Fonte de verdade: fontes_recurso.json (Drive)
 *
 * FSM de status:
 *   ativo     → suspenso, encerrado
 *   suspenso  → ativo, encerrado
 *   encerrado → [] (terminal)
 *
 * @depends core/data_layer.gs (readJSON, modifyJSON)
 *          core/services/fsm_guardian.gs (FsmGuardian)
 *          core/services/auditoria_service.gs (AuditoriaService)
 *          core/event_bus_backend.gs (SystemEvents)
 *          core/events_constants.gs (SystemEventTypes)
 *          core/utils.gs (gerarId, agora)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 */

// ── Constantes ────────────────────────────────────────────────────

var STATUS_FONTE = Object.freeze({
  ATIVO:     'ativo',
  SUSPENSO:  'suspenso',
  ENCERRADO: 'encerrado'
});

var TIPO_FONTE = Object.freeze({
  CONTRATO_GESTAO: 'contrato_gestao',
  LEI_ROUANET:     'lei_rouanet',
  PROCULTURA:      'procultura',
  EDITAL_MUNICIPAL:'edital_municipal',
  EDITAL_FEDERAL:  'edital_federal',
  FUNDO_SETORIAL:  'fundo_setorial',
  RECEITA_PROPRIA: 'receita_propria',
  OUTRO:           'outro'
});

// ── FSM ───────────────────────────────────────────────────────────

var _TRANSICOES_FONTE = {
  ativo:     ['suspenso', 'encerrado'],
  suspenso:  ['ativo',    'encerrado'],
  encerrado: []
};

if (typeof FsmGuardian !== 'undefined') {
  try { FsmGuardian.registrar('fontes_recurso', _TRANSICOES_FONTE); } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════
// REPOSITÓRIO
// ═══════════════════════════════════════════════════════════════

var FonteRecursoRepository = (function () {

  var _ARQUIVO = 'fontes_recurso.json';

  function _orgId(orgId) { return orgId || getOrgConfig().orgId; }

  function listar(orgId, filtros) {
    orgId   = _orgId(orgId);
    filtros = filtros || {};
    var todos = readJSON(_ARQUIVO) || [];
    return todos.filter(function (f) {
      if (f.orgId && f.orgId !== orgId) return false;
      if (filtros.status && f.status !== filtros.status) return false;
      if (filtros.tipo   && f.tipo   !== filtros.tipo)   return false;
      return true;
    }).sort(function (a, b) {
      return String(b.atualizadoEm || '').localeCompare(String(a.atualizadoEm || ''));
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
    orgId        = _orgId(orgId);
    dados        = dados || {};
    dados.orgId  = orgId;
    var agr      = agora ? agora() : new Date().toISOString();
    var isNovo   = !dados.id;
    if (isNovo) {
      dados.id        = gerarId('frc');
      dados.criadoEm  = agr;
      dados.versao    = 1;
      if (!dados.status) dados.status = STATUS_FONTE.ATIVO;
      if (!dados.cronogramaDesembolso) dados.cronogramaDesembolso = [];
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

  function excluir(orgId, id) {
    orgId = _orgId(orgId);
    var removido = false;
    modifyJSON(_ARQUIVO, function (lista) {
      var nova = lista.filter(function (f) {
        if (f.id === id && (f.orgId === orgId || !f.orgId)) { removido = true; return false; }
        return true;
      });
      return nova;
    });
    return removido;
  }

  return { listar: listar, buscarPorId: buscarPorId, salvar: salvar, excluir: excluir };
})();

// ═══════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════

var FonteRecursoEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  function _audit(evento, dados) {
    try { if (typeof AuditoriaService !== 'undefined') AuditoriaService.registrar(evento, 'financeiro', dados || {}); } catch (_) {}
  }

  function _emit(tipo, payload) {
    try { if (typeof SystemEvents !== 'undefined') SystemEvents.emit(tipo, payload || {}); } catch (_) {}
  }

  function listar(filtros, orgId) {
    return FonteRecursoRepository.listar(orgId || _orgId(), filtros || {});
  }

  function buscarPorId(id, orgId) {
    return FonteRecursoRepository.buscarPorId(orgId || _orgId(), id);
  }

  function salvar(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!dados || !String(dados.nome || '').trim()) throw new Error('Nome da fonte de recurso é obrigatório.');
    if (!dados.tipo || Object.values(TIPO_FONTE).indexOf(dados.tipo) === -1)
      throw new Error('Tipo de fonte inválido. Válidos: ' + Object.values(TIPO_FONTE).join(', '));

    var resultado = FonteRecursoRepository.salvar(orgId, dados);
    _audit(resultado.isNovo ? 'FONTE_RECURSO_CRIADA' : 'FONTE_RECURSO_ATUALIZADA', {
      id: resultado.id, nome: dados.nome, operador: emailOperador || ''
    });
    _emit(resultado.isNovo ? 'CONTRATO_CREATED' : 'CONTRATO_UPDATED',
      { entidade: 'fonte_recurso', entidadeId: resultado.id, usuario: emailOperador || '', orgId: orgId });
    return resultado.id;
  }

  function excluir(id, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var f = FonteRecursoRepository.buscarPorId(orgId, id);
    if (!f) throw new Error('Fonte de recurso não encontrada: ' + id);
    if (f.status !== STATUS_FONTE.ENCERRADO)
      throw new Error('Apenas fontes ENCERRADAS podem ser excluídas. Status atual: ' + f.status);
    FonteRecursoRepository.excluir(orgId, id);
    _audit('FONTE_RECURSO_EXCLUIDA', { id: id, operador: emailOperador || '' });
    return { ok: true };
  }

  function aplicarTransicao(id, novoStatus, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var f = FonteRecursoRepository.buscarPorId(orgId, id);
    if (!f) throw new Error('Fonte de recurso não encontrada: ' + id);
    var atual = f.status || STATUS_FONTE.ATIVO;

    if (typeof FsmGuardian !== 'undefined') {
      FsmGuardian.validarTransicao('fontes_recurso', atual, novoStatus);
    } else {
      var perm = _TRANSICOES_FONTE[atual] || [];
      if (perm.indexOf(novoStatus) === -1)
        throw new Error('Transição inválida: "' + atual + '" → "' + novoStatus + '".');
    }

    f.status = novoStatus;
    FonteRecursoRepository.salvar(orgId, f);
    _audit('FONTE_RECURSO_STATUS_' + novoStatus.toUpperCase(), {
      id: id, de: atual, para: novoStatus, operador: emailOperador || ''
    });
    return { id: id, statusAnterior: atual, statusNovo: novoStatus };
  }

  function obterMetricas(orgId) {
    orgId = orgId || _orgId();
    var lista = FonteRecursoRepository.listar(orgId);
    var valorTotal = 0;
    var valorAtivos = 0;
    lista.forEach(function (f) {
      valorTotal += f.valorTotal || 0;
      if (f.status === STATUS_FONTE.ATIVO) valorAtivos += f.valorTotal || 0;
    });
    return {
      total:       lista.length,
      ativos:      lista.filter(function(f){ return f.status === STATUS_FONTE.ATIVO; }).length,
      suspensos:   lista.filter(function(f){ return f.status === STATUS_FONTE.SUSPENSO; }).length,
      encerrados:  lista.filter(function(f){ return f.status === STATUS_FONTE.ENCERRADO; }).length,
      valorTotal:  valorTotal,
      valorAtivos: valorAtivos,
      geradoEm:    new Date().toISOString()
    };
  }

  return {
    STATUS_FONTE:     STATUS_FONTE,
    TIPO_FONTE:       TIPO_FONTE,
    listar:           listar,
    buscarPorId:      buscarPorId,
    salvar:           salvar,
    excluir:          excluir,
    aplicarTransicao: aplicarTransicao,
    obterMetricas:    obterMetricas
  };
})();
