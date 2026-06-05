/**
 * @file modules/estoque/solicitacao_material_repository.gs
 * @layer modules/estoque
 * @description Repositório de Solicitações de Material.
 *
 * Duas fontes de dados:
 *   - JSON: solicitacoes_material.json (fonte canônica — suporta itens aninhados)
 *   - Sheet: ESPACOS.SolicitacoesMaterial (índice simplificado para visibilidade da equipe)
 *
 * Schema da SolicitacaoMaterial (JSON canônico):
 *   { id, orgId, codigo (SOL-NNNN),
 *     solicitante, setorDestino, subsetorDestino,
 *     status: 'pendente'|'separada'|'finalizada'|'cancelada',
 *     itens: [{ itemId, descricao, unidade, qtdSolicitada, qtdAtendida, valorUnitario }],
 *     observacoes, reservaId?,
 *     separadaPor, finalizadaPor, receptorFinal, motivoCancelamento,
 *     dataSolicitacao, dataFinalizacao, criadoEm, atualizadoEm, criadoPor }
 *
 * FSM: pendente → separada → finalizada
 *      pendente → cancelada
 *      separada → cancelada (com devolução ao estoque)
 *
 * @depends core/services/data_gateway.gs (readJSON, modifyJSON)
 *          core/utils.gs (gerarId, agora)
 *          core/logger.gs (Logger)
 *          core/config.gs (getOrgConfig)
 */

var SolicitacaoMaterialRepository = (function () {

  var _SHEET_KEY = 'SHEET_ID_ESPACOS';
  var _ABA_SOL   = 'SolicitacoesMaterial';

  // Índice Sheet: 12 colunas (simplificado — dados completos no JSON)
  var _HEADERS_SOL = [
    'ID', 'OrgId', 'Codigo', 'Solicitante', 'SetorDestino', 'SubsetorDestino',
    'Status', 'ReservaId', 'TotalItens', 'DataSolicitacao', 'CriadoEm', 'AtualizadoEm'
  ];
  var _COL = {};
  _HEADERS_SOL.forEach(function (h, i) { _COL[h] = i; });

  function _orgId() { return getOrgConfig().orgId; }

  function _getSheetIdx() {
    var id = PropertiesService.getScriptProperties().getProperty(_SHEET_KEY);
    if (!id) throw new Error('[SolicitacaoMaterialRepository] ESPACOS não registrada.');
    var aba = SpreadsheetApp.openById(id).getSheetByName(_ABA_SOL);
    if (!aba) throw new Error('[SolicitacaoMaterialRepository] Aba SolicitacoesMaterial não encontrada. Execute fase73_estoque_prepararIndice().');
    return aba;
  }

  // ── Índice ───────────────────────────────────────────────────────────

  function prepararIndice() {
    var id = PropertiesService.getScriptProperties().getProperty(_SHEET_KEY);
    if (!id) throw new Error('[SolicitacaoMaterialRepository] ESPACOS não registrada.');
    var ss  = SpreadsheetApp.openById(id);
    var aba = ss.getSheetByName(_ABA_SOL);
    if (!aba) {
      aba = ss.insertSheet(_ABA_SOL);
      Logger.info('SolicitacaoMaterialRepository', 'prepararIndice', 'Aba criada: ESPACOS.' + _ABA_SOL);
    }
    if (aba.getLastRow() === 0) {
      aba.getRange(1, 1, 1, _HEADERS_SOL.length).setValues([_HEADERS_SOL]);
      aba.setFrozenRows(1);
    }
    return { ok: true, aba: 'ESPACOS.' + _ABA_SOL };
  }

  // ── Helpers privados ─────────────────────────────────────────────────

  function _lerTodas(orgId) {
    orgId = orgId || _orgId();
    try {
      var lista = readJSON('solicitacoes_material.json');
      if (!Array.isArray(lista)) return [];
      return lista.filter(function (s) { return s.orgId === orgId; });
    } catch (e) { return []; }
  }

  function _paraLinhaIdx(sol) {
    var row = new Array(_HEADERS_SOL.length).fill('');
    row[_COL.ID]              = sol.id              || '';
    row[_COL.OrgId]           = sol.orgId           || '';
    row[_COL.Codigo]          = sol.codigo          || '';
    row[_COL.Solicitante]     = sol.solicitante      || '';
    row[_COL.SetorDestino]    = sol.setorDestino    || '';
    row[_COL.SubsetorDestino] = sol.subsetorDestino || '';
    row[_COL.Status]          = sol.status          || '';
    row[_COL.ReservaId]       = sol.reservaId       || '';
    row[_COL.TotalItens]      = Array.isArray(sol.itens) ? sol.itens.length : 0;
    row[_COL.DataSolicitacao] = sol.dataSolicitacao || sol.criadoEm || '';
    row[_COL.CriadoEm]        = sol.criadoEm        || '';
    row[_COL.AtualizadoEm]    = sol.atualizadoEm    || '';
    return row;
  }

  function _atualizarIndice(sol) {
    try {
      var aba  = _getSheetIdx();
      var last = aba.getLastRow();
      if (last >= 2) {
        var ids = aba.getRange(2, 1, last - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) {
          if (ids[i][0] === sol.id) {
            aba.getRange(i + 2, 1, 1, _HEADERS_SOL.length).setValues([_paraLinhaIdx(sol)]);
            return;
          }
        }
      }
      aba.appendRow(_paraLinhaIdx(sol));
    } catch (e) {
      Logger.warn('SolicitacaoMaterialRepository', '_atualizarIndice', e.message);
    }
  }

  // ── Código sequencial ────────────────────────────────────────────────

  function proximoCodigo(orgId) {
    orgId = orgId || _orgId();
    var todas = _lerTodas(orgId);
    var max   = 0;
    todas.forEach(function (s) {
      var n = parseInt(String(s.codigo || '').replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    var num = String(max + 1);
    while (num.length < 4) num = '0' + num;
    return 'SOL-' + num;
  }

  // ── CRUD ─────────────────────────────────────────────────────────────

  function listar(filtros, orgId) {
    filtros = filtros || {};
    orgId   = orgId   || _orgId();
    return _lerTodas(orgId).filter(function (s) {
      if (filtros.status      && s.status      !== filtros.status)      return false;
      if (filtros.setor       && s.setorDestino !== filtros.setor)       return false;
      if (filtros.solicitante && s.solicitante  !== filtros.solicitante) return false;
      if (filtros.reservaId   && s.reservaId    !== filtros.reservaId)   return false;
      if (filtros.dataInicio  && s.criadoEm < filtros.dataInicio)        return false;
      if (filtros.dataFim     && s.criadoEm > filtros.dataFim + 'T23:59:59') return false;
      return true;
    });
  }

  function buscarPorId(id, orgId) {
    orgId = orgId || _orgId();
    return _lerTodas(orgId).reduce(function (acc, s) { return s.id === id ? s : acc; }, null);
  }

  function salvar(sol, orgId) {
    orgId = orgId || _orgId();
    var agr = agora();
    var resultado = null;

    modifyJSON('solicitacoes_material.json', function (lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = -1;
      if (sol.id) {
        for (var i = 0; i < lista.length; i++) {
          if (lista[i].id === sol.id && lista[i].orgId === orgId) { idx = i; break; }
        }
      }
      if (idx >= 0) {
        lista[idx] = Object.assign({}, lista[idx], sol, { atualizadoEm: agr });
        resultado  = lista[idx];
      } else {
        var novo = Object.assign({ criadoEm: agr, atualizadoEm: agr }, sol, {
          id:    sol.id || gerarId('solm'),
          orgId: orgId
        });
        lista.push(novo);
        resultado = novo;
      }
      return lista;
    });

    if (resultado) _atualizarIndice(resultado);
    return resultado;
  }

  // ── Métricas ─────────────────────────────────────────────────────────

  function metricas(orgId) {
    orgId = orgId || _orgId();
    var todas = _lerTodas(orgId);
    return {
      total:       todas.length,
      pendentes:   todas.filter(function (s) { return s.status === 'pendente';   }).length,
      separadas:   todas.filter(function (s) { return s.status === 'separada';   }).length,
      finalizadas: todas.filter(function (s) { return s.status === 'finalizada'; }).length,
      canceladas:  todas.filter(function (s) { return s.status === 'cancelada';  }).length
    };
  }

  // ── API pública ───────────────────────────────────────────────────────

  return {
    prepararIndice: prepararIndice,
    listar:         listar,
    buscarPorId:    buscarPorId,
    salvar:         salvar,
    proximoCodigo:  proximoCodigo,
    metricas:       metricas
  };

})();
