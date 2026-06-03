/**
 * @file modules/contratacoes/pregao_repository.gs
 * @layer modules/contratacoes
 * @description Repositório de Pregões / Atas de Registro de Preços.
 *
 * Cada pregão contém itens com preço pré-negociado e saldo disponível,
 * permitindo que contratações referenciem esses valores sem digitação manual.
 *
 * @depends repositories/i_repository.gs (modifyJSON, lerJSON)
 *          core/utils.gs (ABA_PARA_MODULO)
 *          core/config.gs (getOrgConfig)
 */

var PregaoRepository = (function () {

  var _FONTE     = 'pregoes.json';
  var _PLANILHA  = 'FINANCEIRO';
  var _ABA       = 'Pregoes';
  var _COLUNAS   = [
    'id','numero','orgao','objeto','tipo','vigenciaInicio','vigenciaFim',
    'status','urlDocumento','totalItens','criadoPor','criadoEm','atualizadoEm'
  ];

  function _orgId() { return getOrgConfig().orgId; }

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
    _sincronizarSheet(pregao, oid);
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
    if (atualizado) _sincronizarSheet(atualizado, oid);
    return atualizado;
  }

  function excluir(id, orgId) {
    var oid = orgId || _orgId();
    modifyJSON(_FONTE, oid, function(lista) {
      return lista.filter(function(p){ return p.id !== id; });
    });
  }

  // ── Índice em planilha ─────────────────────────────────────────────────────

  function prepararIndice(orgId) {
    var oid = orgId || _orgId();
    var aba = garantirAba(_PLANILHA, _ABA, oid);
    if (aba.getLastRow() === 0 || aba.getRange(1,1).getValue() !== 'id') {
      aba.getRange(1, 1, 1, _COLUNAS.length).setValues([_COLUNAS])
        .setFontWeight('bold').setBackground('#f0f4ff');
    }
    return { ok: true, aba: _PLANILHA + '.' + _ABA };
  }

  function _sincronizarSheet(pregao, orgId) {
    try {
      var aba = garantirAba(_PLANILHA, _ABA, orgId);
      var dados = aba.getDataRange().getValues();
      var headers = dados.length ? dados[0] : _COLUNAS;
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
