/**
 * @file modules/parcerias/parceria_repository.gs
 * @layer modules/parcerias
 * @description Repositório de Parcerias e Co-Produções.
 *
 * Fonte de verdade: parcerias.json (Drive)
 * Índice Sheet:     ACOES.Parcerias
 *
 * Tipos: coproducao | patrocinio | cessao | intercambio | apoio
 * Status FSM: proposta → negociacao → ativa → encerrada → cancelada
 *
 * @depends core/data_layer.gs, core/utils.gs, core/logger.gs
 */

var ParceriaRepository = (function () {

  var _ARQ       = 'parcerias.json';
  var _SHEET_KEY = 'SHEET_ID_ACOES';
  var _ABA       = 'Parcerias';

  var _HDR = [
    'ID','OrgId','Nome','CNPJ','Tipo','Status','Responsavel','Email',
    'Telefone','AcoesVinculadas','ValorTotal','CriadoEm','AtualizadoEm'
  ];

  var _TIPOS   = ['coproducao','patrocinio','cessao','intercambio','apoio'];
  var _STATUSES = ['proposta','negociacao','ativa','encerrada','cancelada'];

  // ─── Leitura ──────────────────────────────────────────────────────────────

  function listar(orgId, filtros) {
    filtros = filtros || {};
    return readJSON(_ARQ).filter(function(p) {
      if (p.orgId !== orgId) return false;
      if (filtros.status && p.status !== filtros.status) return false;
      if (filtros.tipo   && p.tipo !== filtros.tipo) return false;
      if (filtros.q) {
        var q = filtros.q.toLowerCase();
        if ((p.nome||'').toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function buscarPorId(orgId, id) {
    return readJSON(_ARQ).find(function(p) {
      return p.id === id && p.orgId === orgId;
    }) || null;
  }

  function listarPorAcao(orgId, acaoId) {
    return readJSON(_ARQ).filter(function(p) {
      return p.orgId === orgId &&
             (p.acoesVinculadas||[]).some(function(v){ return v.acaoId === acaoId; });
    });
  }

  function metricas(orgId) {
    var lista = readJSON(_ARQ).filter(function(p) { return p.orgId === orgId; });
    var porStatus = {}, porTipo = {};
    var totalValor = 0;
    lista.forEach(function(p) {
      porStatus[p.status] = (porStatus[p.status]||0) + 1;
      porTipo[p.tipo]     = (porTipo[p.tipo]||0) + 1;
      totalValor += (p.valorTotal || 0);
    });
    return { total: lista.length, porStatus: porStatus, porTipo: porTipo, totalValor: totalValor };
  }

  // ─── Escrita ──────────────────────────────────────────────────────────────

  function salvar(parceria) {
    var lista = readJSON(_ARQ);
    var agora = new Date().toISOString();
    var idx = lista.findIndex(function(p) { return p.id === parceria.id; });
    if (idx >= 0) {
      parceria.atualizadoEm = agora;
      lista[idx] = parceria;
    } else {
      parceria.criadoEm    = agora;
      parceria.atualizadoEm = agora;
      lista.push(parceria);
    }
    saveJSON(_ARQ, lista);
    _sincronizarSheet(parceria);
    return parceria;
  }

  function excluir(orgId, id) {
    saveJSON(_ARQ, readJSON(_ARQ).filter(function(p) {
      return !(p.id === id && p.orgId === orgId);
    }));
    _removerDaSheet(id);
  }

  // ─── Índice Sheet ─────────────────────────────────────────────────────────

  function prepararIndice() {
    var props  = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty(_SHEET_KEY);
    if (!sheetId) { Logger.warn('parcerias','prepararIndice','SHEET_ID_ACOES não configurado.'); return; }
    var ss  = SpreadsheetApp.openById(sheetId);
    var aba = ss.getSheetByName(_ABA) || ss.insertSheet(_ABA);
    var hdr = aba.getRange(1, 1, 1, _HDR.length);
    hdr.setValues([_HDR]);
    hdr.setFontWeight('bold');
    hdr.setBackground('#dbeafe');
    Logger.info('parcerias','prepararIndice','Aba ' + _ABA + ' pronta.');
  }

  function _sincronizarSheet(p) {
    try {
      var props  = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty(_SHEET_KEY);
      if (!sheetId) return;
      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName(_ABA);
      if (!aba) return;
      var dados = aba.getDataRange().getValues();
      var linha = -1;
      for (var i = 1; i < dados.length; i++) {
        if (dados[i][0] === p.id) { linha = i + 1; break; }
      }
      var acoes = (p.acoesVinculadas||[]).map(function(v){ return v.acaoId; }).join(', ');
      var row = [
        p.id, p.orgId, p.nome||'', p.cnpj||'',
        p.tipo||'', p.status||'',
        p.responsavel||'', p.email||'', p.telefone||'',
        acoes, p.valorTotal||0,
        p.criadoEm||'', p.atualizadoEm||''
      ];
      if (linha > 0) {
        aba.getRange(linha, 1, 1, row.length).setValues([row]);
      } else {
        aba.appendRow(row);
      }
    } catch(e) { Logger.warn('parcerias','_sincronizarSheet', e.message); }
  }

  function _removerDaSheet(id) {
    try {
      var props  = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty(_SHEET_KEY);
      if (!sheetId) return;
      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName(_ABA);
      if (!aba) return;
      var dados = aba.getDataRange().getValues();
      for (var i = dados.length - 1; i >= 1; i--) {
        if (dados[i][0] === id) { aba.deleteRow(i + 1); break; }
      }
    } catch(e) { Logger.warn('parcerias','_removerDaSheet', e.message); }
  }

  // ─── API Pública ──────────────────────────────────────────────────────────

  return {
    listar:        listar,
    buscarPorId:   buscarPorId,
    listarPorAcao: listarPorAcao,
    metricas:      metricas,
    salvar:        salvar,
    excluir:       excluir,
    prepararIndice:prepararIndice,
    TIPOS:         _TIPOS,
    STATUSES:      _STATUSES
  };

})();
