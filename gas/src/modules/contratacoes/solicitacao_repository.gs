/**
 * @file modules/contratacoes/solicitacao_repository.gs
 * @layer modules/contratacoes
 * @description Repositório de Solicitações de Contratação.
 *
 * Entidade: SolicitacaoContratacao — fluxo de aprovação multinível
 * para contratar serviços externos ao CCBJ.
 *
 * Fonte de verdade: solicitacoes_contratacao.json (Drive)
 * Índice auxiliar: FINANCEIRO.SolicitacoesContratacao (Sheet — read-only)
 *
 * REGRA: nenhum outro módulo lê/escreve diretamente.
 * Todo acesso via SolicitacaoRepository ou SolicitacaoEngine.
 *
 * @depends core/data_layer.gs (lerJSON, salvarJSON, modifyJSON)
 *          core/services/data_gateway.gs (DataGateway)
 *          core/logger.gs (Logger)
 *          core/config.gs (getOrgConfig)
 */

var SolicitacaoRepository = (function () {

  var _ARQUIVO = 'solicitacoes_contratacao.json';
  var _SHEET_KEY = 'SHEET_ID_FINANCEIRO';
  var _ABA       = 'SolicitacoesContratacao';

  var _HEADERS = [
    'ID', 'OrgId', 'Numero', 'Objeto', 'TipoServico', 'Solicitante',
    'Status', 'SetorSolicitante', 'ValorEstimado', 'ContratoId', 'CriadoEm', 'AtualizadoEm'
  ];

  function _orgIdPadrao(orgId) { return orgId || getOrgConfig().orgId; }
  function _agora() { return new Date().toISOString(); }

  function _garantirCabecalhoIndice() {
    try {
      var aba = DataGateway.obterAba(_SHEET_KEY, _ABA);
      if (!aba) return;
      var atual = aba.getLastRow() > 0
        ? aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), _HEADERS.length)).getValues()[0]
        : [];
      var vazio = atual.every(function (v) { return !v; });
      if (vazio || String(atual[0] || '').trim() !== 'ID') {
        aba.getRange(1, 1, 1, _HEADERS.length).setValues([_HEADERS]);
        aba.setFrozenRows(1);
      }
    } catch (e) {
      Logger.warn('solicitacao_repository', '_garantirCabecalhoIndice', e.message);
    }
  }

  function _indexar(s) {
    try {
      _garantirCabecalhoIndice();
      var linha = [
        s.id               || '',
        s.orgId            || '',
        s.numero           || '',
        s.objeto           || '',
        s.tipoServico      || '',
        s.solicitante      || '',
        s.status           || '',
        s.setorSolicitante || '',
        s.valorEstimado    || 0,
        s.contratoId       || '',
        s.criadoEm         || '',
        s.atualizadoEm     || ''
      ];
      var atualizado = DataGateway.atualizarLinhaPorColuna(_SHEET_KEY, _ABA, 0, s.id, linha);
      if (!atualizado) DataGateway.salvarLinha(_SHEET_KEY, _ABA, linha);
    } catch (e) {
      Logger.warn('solicitacao_repository', '_indexar', e.message);
    }
  }

  function _gerarNumero(orgId) {
    var todos = lerJSON(_ARQUIVO) || [];
    var orgSols = todos.filter(function (s) { return s.orgId === orgId; });
    var ano = new Date().getFullYear();
    var seq = String(orgSols.length + 1).padStart(4, '0');
    return 'SC-' + ano + '-' + seq;
  }

  // ── CRUD ──────────────────────────────────────────────────────────

  function listar(orgId, filtros) {
    orgId   = _orgIdPadrao(orgId);
    filtros = filtros || {};
    var todos = lerJSON(_ARQUIVO) || [];
    return todos.filter(function (s) {
      if (s.orgId && s.orgId !== orgId) return false;
      if (filtros.status           && s.status           !== filtros.status)           return false;
      if (filtros.solicitante      && s.solicitante      !== filtros.solicitante)      return false;
      if (filtros.setorSolicitante && s.setorSolicitante !== filtros.setorSolicitante) return false;
      if (filtros.tipoServico      && s.tipoServico      !== filtros.tipoServico)      return false;
      if (filtros.contratoId       && s.contratoId       !== filtros.contratoId)       return false;
      return true;
    }).sort(function (a, b) {
      return String(b.criadoEm || '').localeCompare(String(a.criadoEm || ''));
    });
  }

  function buscarPorId(orgId, id) {
    orgId = _orgIdPadrao(orgId);
    var todos = lerJSON(_ARQUIVO) || [];
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].id === id && (todos[i].orgId === orgId || !todos[i].orgId)) return todos[i];
    }
    return null;
  }

  function salvar(orgId, dados) {
    orgId = _orgIdPadrao(orgId);
    dados = dados || {};
    dados.orgId = orgId;
    var agr    = _agora();
    var isNovo = !dados.id;
    if (isNovo) {
      dados.id       = 'sol_' + Date.now();
      dados.numero   = _gerarNumero(orgId);
      dados.criadoEm = agr;
      if (!dados.status) dados.status = 'rascunho';
    }
    dados.atualizadoEm = agr;
    modifyJSON(_ARQUIVO, function (lista) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === dados.id) { idx = i; break; }
      }
      if (idx >= 0) lista[idx] = dados; else lista.push(dados);
      return lista;
    });
    _indexar(dados);
    return { id: dados.id, numero: dados.numero, isNovo: isNovo };
  }

  function obterMetricasPorStatus(orgId) {
    orgId = _orgIdPadrao(orgId);
    var todos = lerJSON(_ARQUIVO) || [];
    var porStatus = {};
    var valorTotal = 0;
    todos.filter(function (s) { return s.orgId === orgId; }).forEach(function (s) {
      var st = s.status || 'rascunho';
      porStatus[st] = (porStatus[st] || 0) + 1;
      if (s.status !== 'cancelada' && s.status !== 'rejeitada') {
        valorTotal += Number(s.valorEstimado) || 0;
      }
    });
    return { porStatus: porStatus, valorTotal: valorTotal };
  }

  // ── Manutenção ────────────────────────────────────────────────────

  function garantirIndice() {
    _garantirCabecalhoIndice();
    return { ok: true };
  }

  return {
    listar:              listar,
    buscarPorId:         buscarPorId,
    salvar:              salvar,
    obterMetricasPorStatus: obterMetricasPorStatus,
    garantirIndice:      garantirIndice
  };

})();
