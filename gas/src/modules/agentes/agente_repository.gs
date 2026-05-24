/**
 * @file modules/agentes/agente_repository.gs
 * @layer modules/agentes
 * @description Repositório de Agentes Culturais.
 *
 * Fonte de verdade: agentes_culturais.json (Drive)
 * Índice Sheet:     MASTER.AgentesCulturais
 *
 * Entidade AgenteCultural:
 *   id, orgId, tipo (pf|pj), nome, nomeArtistico, email, cpfCnpj, telefone
 *   areasArtisticas[], linguagens[], portfolio[], riderTecnico{}
 *   disponibilidade{}, status, consentimentoId, observacoes
 *   historico[], criadoEm, atualizadoEm
 *
 * @depends core/data_layer.gs, core/utils.gs, core/logger.gs
 */

var AgenteCulturalRepository = (function () {

  var _ARQ        = 'agentes_culturais.json';
  var _SHEET_KEY  = 'SHEET_ID_MASTER';
  var _ABA        = 'AgentesCulturais';

  var _HDR = [
    'ID','OrgId','Tipo','Nome','NomeArtistico','Email','CpfCnpj','Telefone',
    'AreasArtisticas','Linguagens','Portfolio','Status','ConsentimentoId',
    'CriadoEm','AtualizadoEm'
  ];

  // ─── Leitura ──────────────────────────────────────────────────────────────

  function listar(orgId, filtros) {
    filtros = filtros || {};
    return readJSON(_ARQ).filter(function(a) {
      if (a.orgId !== orgId) return false;
      if (filtros.status && a.status !== filtros.status) return false;
      if (filtros.area   && (a.areasArtisticas || []).indexOf(filtros.area) === -1) return false;
      if (filtros.tipo   && a.tipo !== filtros.tipo) return false;
      if (filtros.q) {
        var q = filtros.q.toLowerCase();
        var campos = [(a.nome||''),(a.nomeArtistico||''),(a.email||'')].join(' ').toLowerCase();
        if (campos.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function buscarPorId(orgId, id) {
    return readJSON(_ARQ).find(function(a) {
      return a.id === id && a.orgId === orgId;
    }) || null;
  }

  function buscarPorEmail(orgId, email) {
    var norm = (email || '').toLowerCase().trim();
    return readJSON(_ARQ).find(function(a) {
      return a.orgId === orgId && a.email === norm;
    }) || null;
  }

  function metricas(orgId) {
    var lista = readJSON(_ARQ).filter(function(a) { return a.orgId === orgId; });
    var por = { rascunho:0, ativo:0, suspenso:0, descredenciado:0 };
    var areas = {};
    lista.forEach(function(a) {
      por[a.status] = (por[a.status]||0) + 1;
      (a.areasArtisticas || []).forEach(function(ar) {
        areas[ar] = (areas[ar]||0) + 1;
      });
    });
    return { total: lista.length, porStatus: por, porArea: areas };
  }

  // ─── Escrita ──────────────────────────────────────────────────────────────

  function salvar(agente) {
    var lista = readJSON(_ARQ);
    var agora = new Date().toISOString();
    var existente = lista.findIndex(function(a) { return a.id === agente.id; });

    if (existente >= 0) {
      agente.atualizadoEm = agora;
      lista[existente] = agente;
    } else {
      agente.criadoEm    = agora;
      agente.atualizadoEm = agora;
      agente.historico   = agente.historico || [];
      lista.push(agente);
    }
    saveJSON(_ARQ, lista);
    _sincronizarSheet(agente);
    return agente;
  }

  function excluir(orgId, id) {
    var lista = readJSON(_ARQ).filter(function(a) {
      return !(a.id === id && a.orgId === orgId);
    });
    saveJSON(_ARQ, lista);
    _removerDaSheet(id);
  }

  // ─── Índice Sheet ─────────────────────────────────────────────────────────

  function prepararIndice() {
    var props  = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty(_SHEET_KEY);
    if (!sheetId) { Logger.warn('agentes','prepararIndice','SHEET_ID_MASTER não configurado.'); return; }
    var ss  = SpreadsheetApp.openById(sheetId);
    var aba = ss.getSheetByName(_ABA) || ss.insertSheet(_ABA);
    var hdr = aba.getRange(1, 1, 1, _HDR.length);
    hdr.setValues([_HDR]);
    hdr.setFontWeight('bold');
    hdr.setBackground('#f3e8ff');
    Logger.info('agentes','prepararIndice','Aba ' + _ABA + ' pronta com ' + _HDR.length + ' colunas.');
  }

  function _sincronizarSheet(agente) {
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
        if (dados[i][0] === agente.id) { linha = i + 1; break; }
      }
      var row = [
        agente.id, agente.orgId, agente.tipo||'pf',
        agente.nome||'', agente.nomeArtistico||'', agente.email||'',
        agente.cpfCnpj||'', agente.telefone||'',
        (agente.areasArtisticas||[]).join(', '),
        (agente.linguagens||[]).join(', '),
        (agente.portfolio||[]).map(function(p){return p.url||p;}).join(', '),
        agente.status||'rascunho',
        agente.consentimentoId||'',
        agente.criadoEm||'', agente.atualizadoEm||''
      ];
      if (linha > 0) {
        aba.getRange(linha, 1, 1, row.length).setValues([row]);
      } else {
        aba.appendRow(row);
      }
    } catch(e) {
      Logger.warn('agentes','_sincronizarSheet', e.message);
    }
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
    } catch(e) {
      Logger.warn('agentes','_removerDaSheet', e.message);
    }
  }

  // ─── API Pública ──────────────────────────────────────────────────────────

  return {
    listar:        listar,
    buscarPorId:   buscarPorId,
    buscarPorEmail:buscarPorEmail,
    metricas:      metricas,
    salvar:        salvar,
    excluir:       excluir,
    prepararIndice:prepararIndice
  };

})();
