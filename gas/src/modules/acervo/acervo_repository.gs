/**
 * @file modules/acervo/acervo_repository.gs
 * @layer modules/acervo
 * @description Repositório de Acervo Digital — arquivos e evidências por Ação.
 *
 * Fonte de verdade: acervo.json (Drive)
 * Índice Sheet:     ACOES.Acervo
 *
 * Tipos de arquivo: foto | video | release | poster | folder | ata | outro
 * Status LGPD:      nao_verificado | autorizado | restrito | sem_pessoas
 *
 * @depends core/data_layer.gs, core/utils.gs, core/logger.gs
 */

var AcervoRepository = (function () {

  var _ARQ       = 'acervo.json';
  var _SHEET_KEY = 'SHEET_ID_ACOES';
  var _ABA       = 'Acervo';

  var _HDR = [
    'ID','OrgId','AcaoId','AcaoNome','Tipo','Descricao','Tags',
    'StatusLGPD','AutorizadoPor','UrlDrive','Thumbnail',
    'Tamanho','MimeType','CriadoEm','CriadoPor','AtualizadoEm'
  ];

  var _TIPOS_VALIDOS  = ['foto','video','release','poster','folder','ata','outro'];
  var _STATUS_LGPD    = ['nao_verificado','autorizado','restrito','sem_pessoas'];

  // ─── Leitura ──────────────────────────────────────────────────────────────

  function listar(orgId, filtros) {
    filtros = filtros || {};
    return readJSON(_ARQ).filter(function(a) {
      if (a.orgId !== orgId) return false;
      if (filtros.acaoId      && a.acaoId !== filtros.acaoId) return false;
      if (filtros.tipo        && a.tipo !== filtros.tipo) return false;
      if (filtros.statusLGPD  && a.statusLGPD !== filtros.statusLGPD) return false;
      if (filtros.q) {
        var q = filtros.q.toLowerCase();
        if ((a.descricao||'').toLowerCase().indexOf(q) === -1 &&
            (a.tags||[]).join(' ').toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function buscarPorId(orgId, id) {
    return readJSON(_ARQ).find(function(a) {
      return a.id === id && a.orgId === orgId;
    }) || null;
  }

  function listarPorAcao(orgId, acaoId) {
    return listar(orgId, { acaoId: acaoId });
  }

  /**
   * Retorna checklist de evidências de uma Ação (quantos itens de cada tipo existem).
   */
  function checklistEvidencias(orgId, acaoId) {
    var lista = listarPorAcao(orgId, acaoId);
    var tipos = { foto:0, video:0, release:0, poster:0, folder:0, ata:0, outro:0 };
    lista.forEach(function(a) { tipos[a.tipo] = (tipos[a.tipo]||0) + 1; });
    return {
      acaoId: acaoId,
      total: lista.length,
      porTipo: tipos,
      pendentesLGPD: lista.filter(function(a){ return a.statusLGPD === 'nao_verificado'; }).length,
      completo: tipos.foto > 0 && tipos.release > 0
    };
  }

  function metricas(orgId) {
    var lista = readJSON(_ARQ).filter(function(a) { return a.orgId === orgId; });
    var porTipo   = {};
    var porStatus = {};
    lista.forEach(function(a) {
      porTipo[a.tipo]         = (porTipo[a.tipo]||0) + 1;
      porStatus[a.statusLGPD] = (porStatus[a.statusLGPD]||0) + 1;
    });
    return { total: lista.length, porTipo: porTipo, porStatusLGPD: porStatus };
  }

  // ─── Escrita ──────────────────────────────────────────────────────────────

  function salvar(item) {
    var lista = readJSON(_ARQ);
    var agora = new Date().toISOString();
    var idx = lista.findIndex(function(a) { return a.id === item.id; });

    if (idx >= 0) {
      item.atualizadoEm = agora;
      lista[idx] = item;
    } else {
      item.criadoEm    = agora;
      item.atualizadoEm = agora;
      lista.push(item);
    }
    saveJSON(_ARQ, lista);
    _sincronizarSheet(item);
    return item;
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
    if (!sheetId) { Logger.warn('acervo','prepararIndice','SHEET_ID_ACOES não configurado.'); return; }
    var ss  = SpreadsheetApp.openById(sheetId);
    var aba = ss.getSheetByName(_ABA) || ss.insertSheet(_ABA);
    var hdr = aba.getRange(1, 1, 1, _HDR.length);
    hdr.setValues([_HDR]);
    hdr.setFontWeight('bold');
    hdr.setBackground('#fef3c7');
    Logger.info('acervo','prepararIndice','Aba ' + _ABA + ' pronta.');
  }

  function _sincronizarSheet(item) {
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
        if (dados[i][0] === item.id) { linha = i + 1; break; }
      }
      var row = [
        item.id, item.orgId, item.acaoId||'', item.acaoNome||'',
        item.tipo||'outro', item.descricao||'',
        (item.tags||[]).join(', '),
        item.statusLGPD||'nao_verificado',
        item.autorizadoPor||'', item.urlDrive||'', item.thumbnail||'',
        item.tamanho||0, item.mimeType||'',
        item.criadoEm||'', item.criadoPor||'', item.atualizadoEm||''
      ];
      if (linha > 0) {
        aba.getRange(linha, 1, 1, row.length).setValues([row]);
      } else {
        aba.appendRow(row);
      }
    } catch(e) {
      Logger.warn('acervo','_sincronizarSheet', e.message);
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
    } catch(e) { Logger.warn('acervo','_removerDaSheet', e.message); }
  }

  // ─── API Pública ──────────────────────────────────────────────────────────

  return {
    listar:              listar,
    buscarPorId:         buscarPorId,
    listarPorAcao:       listarPorAcao,
    checklistEvidencias: checklistEvidencias,
    metricas:            metricas,
    salvar:              salvar,
    excluir:             excluir,
    prepararIndice:      prepararIndice,
    TIPOS_VALIDOS:       _TIPOS_VALIDOS,
    STATUS_LGPD:         _STATUS_LGPD
  };

})();
