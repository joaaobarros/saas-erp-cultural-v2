/**
 * @file modules/voluntarios/voluntario_repository.gs
 * @layer modules/voluntarios
 * @description Repositório de Voluntários e Alocações a Ações.
 *
 * Fontes de verdade:
 *   voluntarios.json          → cadastro de voluntários
 *   alocacoes_voluntarios.json → alocações de voluntários a Ações
 *
 * Índice Sheet: MASTER.Voluntarios
 *
 * @depends core/data_layer.gs, core/utils.gs, core/logger.gs
 */

var VoluntarioRepository = (function () {

  var _ARQ_VOL   = 'voluntarios.json';
  var _ARQ_ALOC  = 'alocacoes_voluntarios.json';
  var _SHEET_KEY = 'SHEET_ID_MASTER';
  var _ABA       = 'Voluntarios';

  var _HDR = [
    'ID','OrgId','Nome','Email','CPF','Telefone','Competencias',
    'Disponibilidade','Status','TotalHoras','CriadoEm','AtualizadoEm'
  ];

  // ─── Voluntários ─────────────────────────────────────────────────────────

  var Voluntarios = {

    listar: function(orgId, filtros) {
      filtros = filtros || {};
      return readJSON(_ARQ_VOL).filter(function(v) {
        if (v.orgId !== orgId) return false;
        if (filtros.status && v.status !== filtros.status) return false;
        if (filtros.q) {
          var q = filtros.q.toLowerCase();
          if ((v.nome||'').toLowerCase().indexOf(q) === -1 &&
              (v.email||'').toLowerCase().indexOf(q) === -1) return false;
        }
        return true;
      });
    },

    buscarPorId: function(orgId, id) {
      return readJSON(_ARQ_VOL).find(function(v) {
        return v.id === id && v.orgId === orgId;
      }) || null;
    },

    buscarPorEmail: function(orgId, email) {
      var norm = (email||'').toLowerCase().trim();
      return readJSON(_ARQ_VOL).find(function(v) {
        return v.orgId === orgId && v.email === norm;
      }) || null;
    },

    metricas: function(orgId) {
      var lista = readJSON(_ARQ_VOL).filter(function(v) { return v.orgId === orgId; });
      var por = {};
      lista.forEach(function(v) { por[v.status] = (por[v.status]||0) + 1; });
      var totalHoras = lista.reduce(function(s, v) { return s + (v.totalHoras||0); }, 0);
      return { total: lista.length, porStatus: por, totalHoras: totalHoras };
    },

    salvar: function(voluntario) {
      var lista = readJSON(_ARQ_VOL);
      var agora = new Date().toISOString();
      var idx = lista.findIndex(function(v) { return v.id === voluntario.id; });
      if (idx >= 0) {
        voluntario.atualizadoEm = agora;
        lista[idx] = voluntario;
      } else {
        voluntario.criadoEm     = agora;
        voluntario.atualizadoEm = agora;
        lista.push(voluntario);
      }
      saveJSON(_ARQ_VOL, lista);
      _sincronizarSheet(voluntario);
      return voluntario;
    },

    excluir: function(orgId, id) {
      saveJSON(_ARQ_VOL, readJSON(_ARQ_VOL).filter(function(v) {
        return !(v.id === id && v.orgId === orgId);
      }));
    }
  };

  // ─── Alocações ────────────────────────────────────────────────────────────

  var Alocacoes = {

    listar: function(orgId, filtros) {
      filtros = filtros || {};
      return readJSON(_ARQ_ALOC).filter(function(a) {
        if (a.orgId !== orgId) return false;
        if (filtros.acaoId       && a.acaoId !== filtros.acaoId) return false;
        if (filtros.voluntarioId && a.voluntarioId !== filtros.voluntarioId) return false;
        if (filtros.status       && a.status !== filtros.status) return false;
        return true;
      });
    },

    buscarPorId: function(orgId, id) {
      return readJSON(_ARQ_ALOC).find(function(a) {
        return a.id === id && a.orgId === orgId;
      }) || null;
    },

    salvar: function(alocacao) {
      var lista = readJSON(_ARQ_ALOC);
      var agora = new Date().toISOString();
      var idx = lista.findIndex(function(a) { return a.id === alocacao.id; });
      if (idx >= 0) {
        alocacao.atualizadoEm = agora;
        lista[idx] = alocacao;
      } else {
        alocacao.criadoEm    = agora;
        alocacao.atualizadoEm = agora;
        lista.push(alocacao);
      }
      saveJSON(_ARQ_ALOC, lista);
      return alocacao;
    },

    excluir: function(orgId, id) {
      saveJSON(_ARQ_ALOC, readJSON(_ARQ_ALOC).filter(function(a) {
        return !(a.id === id && a.orgId === orgId);
      }));
    }
  };

  // ─── Índice Sheet ─────────────────────────────────────────────────────────

  function prepararIndice() {
    var props  = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty(_SHEET_KEY);
    if (!sheetId) { Logger.warn('voluntarios','prepararIndice','SHEET_ID_MASTER não configurado.'); return; }
    var ss  = SpreadsheetApp.openById(sheetId);
    var aba = ss.getSheetByName(_ABA) || ss.insertSheet(_ABA);
    var hdr = aba.getRange(1, 1, 1, _HDR.length);
    hdr.setValues([_HDR]);
    hdr.setFontWeight('bold');
    hdr.setBackground('#d1fae5');
    Logger.info('voluntarios','prepararIndice','Aba ' + _ABA + ' pronta.');
  }

  function _sincronizarSheet(v) {
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
        if (dados[i][0] === v.id) { linha = i + 1; break; }
      }
      var row = [
        v.id, v.orgId, v.nome||'', v.email||'', v.cpf||'', v.telefone||'',
        (v.competencias||[]).join(', '),
        JSON.stringify(v.disponibilidade||{}),
        v.status||'cadastrado', v.totalHoras||0,
        v.criadoEm||'', v.atualizadoEm||''
      ];
      if (linha > 0) {
        aba.getRange(linha, 1, 1, row.length).setValues([row]);
      } else {
        aba.appendRow(row);
      }
    } catch(e) { Logger.warn('voluntarios','_sincronizarSheet', e.message); }
  }

  // ─── API Pública ──────────────────────────────────────────────────────────

  return {
    Voluntarios:   Voluntarios,
    Alocacoes:     Alocacoes,
    prepararIndice:prepararIndice
  };

})();
