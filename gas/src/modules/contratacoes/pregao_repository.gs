/**
 * @file modules/contratacoes/pregao_repository.gs
 * @layer modules/contratacoes
 * @description Repositório de Pregões / Atas de Registro de Preços.
 *
 * @depends repositories/i_repository.gs (modifyJSON, lerJSON)
 *          core/utils.gs (ABA_PARA_MODULO, _getSheet)
 *          core/config.gs (getOrgConfig)
 */

var PregaoRepository = (function () {

  var _SHEET_KEY = 'SHEET_ID_FINANCEIRO';
  var _FONTE     = 'pregoes.json';
  var _ABA       = 'Pregoes';
  var _COLUNAS   = [
    'id','numero','orgao','objeto','tipo','vigenciaInicio','vigenciaFim',
    'status','urlDocumento','totalItens','criadoPor','criadoEm','atualizadoEm'
  ];

  function _orgId() { return getOrgConfig().orgId; }

  function _getAba() {
    var props   = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty(_SHEET_KEY);
    if (!sheetId) throw new Error('Planilha não configurada: ' + _SHEET_KEY);
    var ss  = SpreadsheetApp.openById(sheetId);
    return ss.getSheetByName(_ABA) || ss.insertSheet(_ABA);
  }

  // ── CRUD JSON ──────────────────────────────────────────────────────────────

  function listar(filtros, orgId) {
    var lista = lerJSON(_FONTE, orgId || _orgId()) || [];
    if (!filtros) return lista;
    if (filtros.status) lista = lista.filter(function(p){ return p.status === filtros.status; });
    return lista;
  }

  function buscarPorId(id, orgId) {
    var lista = lerJSON(_FONTE, orgId || _orgId()) || [];
    return lista.find(function(p){ return p.id === id; }) || null;
  }

  function inserir(pregao, orgId) {
    var oid = orgId || _orgId();
    modifyJSON(_FONTE, oid, function(lista) {
      lista.push(pregao);
      return lista;
    });
    _sincronizarSheet(pregao);
    return pregao;
  }

  function atualizar(id, dados, orgId) {
    var oid = orgId || _orgId();
    var atualizado = null;
    modifyJSON(_FONTE, oid, function(lista) {
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === id) {
          Object.keys(dados).forEach(function(k){ lista[i][k] = dados[k]; });
          atualizado = lista[i];
          break;
        }
      }
      return lista;
    });
    if (atualizado) _sincronizarSheet(atualizado);
    return atualizado;
  }

  function excluir(id, orgId) {
    var oid = orgId || _orgId();
    modifyJSON(_FONTE, oid, function(lista) {
      return lista.filter(function(p){ return p.id !== id; });
    });
  }

  // ── Índice em planilha ─────────────────────────────────────────────────────

  function prepararIndice() {
    try {
      var aba = _getAba();
      var primeira = aba.getRange(1, 1, 1, 1).getValue();
      if (!primeira || primeira !== 'id') {
        aba.getRange(1, 1, 1, _COLUNAS.length).setValues([_COLUNAS])
          .setFontWeight('bold').setBackground('#f0f4ff');
        aba.setFrozenRows(1);
      }
      return { ok: true, aba: 'FINANCEIRO.' + _ABA };
    } catch (e) {
      return { ok: false, motivo: e.message };
    }
  }

  function _sincronizarSheet(pregao) {
    try {
      var aba   = _getAba();
      var dados = aba.getDataRange().getValues();
      var rowIdx = -1;
      for (var r = 1; r < dados.length; r++) {
        if (dados[r][0] === pregao.id) { rowIdx = r + 1; break; }
      }
      var linha = _COLUNAS.map(function(c) {
        if (c === 'totalItens') return (pregao.itens || []).length;
        return pregao[c] !== undefined ? pregao[c] : '';
      });
      if (rowIdx > 0) {
        aba.getRange(rowIdx, 1, 1, linha.length).setValues([linha]);
      } else {
        aba.appendRow(linha);
      }
    } catch (e) {
      Logger.warn('pregao_repository', '_sincronizarSheet', e.message);
    }
  }

  return {
    listar:         listar,
    buscarPorId:    buscarPorId,
    inserir:        inserir,
    atualizar:      atualizar,
    excluir:        excluir,
    prepararIndice: prepararIndice
  };
})();
