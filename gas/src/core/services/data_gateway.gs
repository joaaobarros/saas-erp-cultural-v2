/**
 * @file core/services/data_gateway.gs
 * @layer core/services
 * @description Abstração de acesso a Google Sheets.
 *
 * Nenhum engine ou controller acessa SpreadsheetApp diretamente.
 * Toda leitura/escrita em Sheets passa por aqui.
 *
 * ASSINATURA: usa (spreadsheetKey, nomeAba) em vez de apenas (nomeAba).
 * spreadsheetKey corresponde à chave em PropertiesService (ex: 'SHEET_ID_MASTER').
 *
 * USO:
 *   var rows = DataGateway.obterTodos('SHEET_ID_ESPACOS', 'Reservas');
 *   DataGateway.salvarLinha('SHEET_ID_ESPACOS', 'Reservas', [dados]);
 */

var DataGateway = (function () {

  var _cache = {};

  function _aba(spreadsheetKey, nomeAba) {
    var cacheKey = spreadsheetKey + ':' + nomeAba;
    if (_cache[cacheKey]) return _cache[cacheKey];
    var aba = _getSheet(spreadsheetKey, nomeAba);
    _cache[cacheKey] = aba;
    return aba;
  }

  function _limparCache() {
    _cache = {};
  }

  // ── Leitura ──────────────────────────────────────────────────────────────

  function obterTodos(spreadsheetKey, nomeAba) {
    try {
      var aba = _aba(spreadsheetKey, nomeAba);
      if (aba.getLastRow() < 2) return [];
      return aba.getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn()).getValues();
    } catch (e) {
      Logger.error('data_gateway', 'obterTodos', nomeAba + ': ' + e.message);
      return [];
    }
  }

  function buscarPorColuna(spreadsheetKey, nomeAba, indiceColuna, valor) {
    var linhas = obterTodos(spreadsheetKey, nomeAba);
    for (var i = 0; i < linhas.length; i++) {
      if (String(linhas[i][indiceColuna] || '') === String(valor)) return linhas[i];
    }
    return null;
  }

  function filtrarPorColuna(spreadsheetKey, nomeAba, indiceColuna, valor) {
    return obterTodos(spreadsheetKey, nomeAba).filter(function(l) {
      return String(l[indiceColuna] || '') === String(valor);
    });
  }

  // ── Escrita ──────────────────────────────────────────────────────────────

  function salvarLinha(spreadsheetKey, nomeAba, dadosLinha) {
    try {
      _aba(spreadsheetKey, nomeAba).appendRow(dadosLinha);
    } catch (e) {
      Logger.error('data_gateway', 'salvarLinha', nomeAba + ': ' + e.message);
      throw e;
    }
  }

  function salvarLinhas(spreadsheetKey, nomeAba, linhas) {
    if (!linhas || linhas.length === 0) return;
    try {
      var aba = _aba(spreadsheetKey, nomeAba);
      aba.getRange(aba.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
    } catch (e) {
      Logger.error('data_gateway', 'salvarLinhas', nomeAba + ': ' + e.message);
      throw e;
    }
  }

  function atualizarLinhaPorColuna(spreadsheetKey, nomeAba, indiceColuna, valorChave, novosDados) {
    try {
      var aba   = _aba(spreadsheetKey, nomeAba);
      var dados = aba.getDataRange().getValues();
      for (var i = 1; i < dados.length; i++) {
        if (String(dados[i][indiceColuna] || '') === String(valorChave)) {
          aba.getRange(i + 1, 1, 1, novosDados.length).setValues([novosDados]);
          return true;
        }
      }
      return false;
    } catch (e) {
      Logger.error('data_gateway', 'atualizarLinhaPorColuna', nomeAba + ': ' + e.message);
      throw e;
    }
  }

  function removerLinhaPorColuna(spreadsheetKey, nomeAba, indiceColuna, valorChave) {
    try {
      var aba   = _aba(spreadsheetKey, nomeAba);
      var dados = aba.getDataRange().getValues();
      for (var i = 1; i < dados.length; i++) {
        if (String(dados[i][indiceColuna] || '') === String(valorChave)) {
          aba.deleteRow(i + 1);
          return true;
        }
      }
      return false;
    } catch (e) {
      Logger.error('data_gateway', 'removerLinhaPorColuna', nomeAba + ': ' + e.message);
      return false;
    }
  }

  return {
    obterTodos:              obterTodos,
    buscarPorColuna:         buscarPorColuna,
    filtrarPorColuna:        filtrarPorColuna,
    salvarLinha:             salvarLinha,
    salvarLinhas:            salvarLinhas,
    atualizarLinhaPorColuna: atualizarLinhaPorColuna,
    removerLinhaPorColuna:   removerLinhaPorColuna,
    limparCache:             _limparCache
  };

})();
