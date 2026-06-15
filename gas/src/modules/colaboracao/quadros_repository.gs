/**
 * @file modules/colaboracao/quadros_repository.gs
 * @layer modules/colaboracao
 * @description Repositório de Quadros Visuais (TLDraw canvas).
 *
 * Cada quadro armazena o snapshot JSON do tldraw editor.
 * Fonte canônica: quadros_{orgId}.json no Drive.
 * Índice: COLABORACAO.Quadros (Sheet dedicada — separada de ACOES).
 *
 * @depends DataLayer.gs, setup.gs
 */

var QuadrosRepository = (function() {

  function _fileName(orgId) { return 'quadros_' + orgId + '.json'; }

  function _gerarId() {
    return 'QDR_' + Date.now() + '_' + Math.random().toString(36).slice(2,8).toUpperCase();
  }

  function listar(orgId, filtros) {
    filtros = filtros || {};
    var lista = readJSON(_fileName(orgId)) || [];
    if (filtros.acaoId) lista = lista.filter(function(q) { return q.acaoId === filtros.acaoId; });
    if (filtros.criadoPor) lista = lista.filter(function(q) { return q.criadoPor === filtros.criadoPor; });
    return lista.map(function(q) {
      // Não retornar o snapshot completo na listagem — só metadados
      return { id: q.id, titulo: q.titulo, orgId: q.orgId, criadoPor: q.criadoPor,
               acaoId: q.acaoId || null, criadoEm: q.criadoEm, atualizadoEm: q.atualizadoEm,
               temSnapshot: !!(q.snapshotTldraw) };
    });
  }

  function buscarPorId(orgId, id) {
    var lista = readJSON(_fileName(orgId)) || [];
    return lista.find(function(q) { return q.id === id; }) || null;
  }

  function salvar(orgId, dados, emailUsuario) {
    var agora = new Date().toISOString();
    var resultado;
    modifyJSON(_fileName(orgId), function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(q) { return q.id === dados.id; });
      if (idx >= 0) {
        lista[idx] = Object.assign({}, lista[idx], {
          titulo:         dados.titulo || lista[idx].titulo,
          snapshotTldraw: dados.snapshotTldraw !== undefined ? dados.snapshotTldraw : lista[idx].snapshotTldraw,
          acaoId:         dados.acaoId !== undefined ? dados.acaoId : lista[idx].acaoId,
          atualizadoEm:   agora,
          atualizadoPor:  emailUsuario
        });
        resultado = lista[idx];
      } else {
        var novo = {
          id:             _gerarId(),
          titulo:         dados.titulo || 'Quadro sem título',
          orgId:          orgId,
          criadoPor:      emailUsuario,
          acaoId:         dados.acaoId || null,
          snapshotTldraw: dados.snapshotTldraw || null,
          criadoEm:       agora,
          atualizadoEm:   agora
        };
        lista.push(novo);
        resultado = novo;
      }
      return lista;
    });
    _atualizarIndice(orgId, resultado);
    return resultado;
  }

  function excluir(orgId, id) {
    modifyJSON(_fileName(orgId), function(lista) {
      return (lista || []).filter(function(q) { return q.id !== id; });
    });
    _removerDoIndice(orgId, id);
    return { excluido: true, id: id };
  }

  function _atualizarIndice(orgId, quadro) {
    try {
      var props   = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty('SHEET_ID_COLABORACAO');
      if (!sheetId) return;
      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName('Quadros');
      if (!aba) return;
      var data = aba.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === quadro.id) {
          aba.getRange(i + 1, 1, 1, 6).setValues([[quadro.id, quadro.titulo, quadro.orgId,
            quadro.criadoPor, quadro.acaoId || '', quadro.atualizadoEm]]);
          return;
        }
      }
      aba.appendRow([quadro.id, quadro.titulo, quadro.orgId, quadro.criadoPor,
                     quadro.acaoId || '', quadro.criadoEm]);
    } catch(e) { console.warn('[QuadrosRepository] Falha no índice: ' + e.message); }
  }

  function _removerDoIndice(orgId, id) {
    try {
      var props   = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty('SHEET_ID_COLABORACAO');
      if (!sheetId) return;
      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName('Quadros');
      if (!aba) return;
      var data = aba.getDataRange().getValues();
      for (var i = data.length - 1; i >= 1; i--) {
        if (data[i][0] === id) { aba.deleteRow(i + 1); break; }
      }
    } catch(e) {}
  }

  function prepararIndice() {
    try {
      var props   = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty('SHEET_ID_COLABORACAO');
      if (!sheetId) return;
      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName('Quadros');
      if (!aba) { aba = ss.insertSheet('Quadros'); }
      if (aba.getLastRow() === 0) {
        aba.appendRow(['id','titulo','orgId','criadoPor','acaoId','criadoEm']);
      }
    } catch(e) { console.warn('[QuadrosRepository.prepararIndice] ' + e.message); }
  }

  return { listar: listar, buscarPorId: buscarPorId, salvar: salvar, excluir: excluir, prepararIndice: prepararIndice };
})();
