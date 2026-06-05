/**
 * @file modules/contratacoes/solicitacao_compra_repository.gs
 * @layer modules/contratacoes
 * @description Repositório de Solicitações de Compra/Aquisição.
 *
 * Fluxo: pendente → aprovada → executada → recebida
 *                 → rejeitada
 *
 * Armazenamento: FINANCEIRO.SolicitacoesCompra
 *
 * @depends core/services/data_gateway.gs
 *          core/utils.gs (gerarId, agora)
 *          core/logger.gs (Logger)
 *          core/config.gs (getOrgConfig)
 */

var SolicitacaoCompraRepository = (function () {

  var _SHEET_KEY = 'SHEET_ID_FINANCEIRO';
  var _ABA       = 'SolicitacoesCompra';

  var _HEADERS = [
    'ID', 'OrgId', 'Codigo', 'Solicitante', 'Departamento',
    'TipoItem', 'Descricao', 'Categoria', 'Quantidade', 'ValorUnitarioEstimado',
    'Justificativa', 'Status', 'AprovadoPor', 'DataAprovacao', 'MotivoRejeicao',
    'ItemEstoqueId', 'NotaFiscal', 'CriadoEm', 'AtualizadoEm'
  ];
  var _COL = {};
  _HEADERS.forEach(function (h, i) { _COL[h] = i; });

  function _orgId() { return getOrgConfig().orgId; }

  function _getSheet() {
    var id = PropertiesService.getScriptProperties().getProperty(_SHEET_KEY);
    if (!id) throw new Error('[SolicitacaoCompraRepository] Planilha FINANCEIRO não configurada.');
    return SpreadsheetApp.openById(id);
  }

  function _getAba() {
    var aba = _getSheet().getSheetByName(_ABA);
    if (!aba) throw new Error('[SolicitacaoCompraRepository] Aba ' + _ABA + ' não encontrada. Execute fase76_compras_prepararIndice().');
    return aba;
  }

  function _linhaParaSol(row) {
    return {
      id:                    row[_COL.ID]                    || '',
      orgId:                 row[_COL.OrgId]                 || '',
      codigo:                row[_COL.Codigo]                || '',
      solicitante:           row[_COL.Solicitante]           || '',
      departamento:          row[_COL.Departamento]          || '',
      tipoItem:              row[_COL.TipoItem]              || 'Consumível',
      descricao:             row[_COL.Descricao]             || '',
      categoria:             row[_COL.Categoria]             || '',
      quantidade:            Number(row[_COL.Quantidade]     || 0),
      valorUnitarioEstimado: Number(row[_COL.ValorUnitarioEstimado] || 0),
      justificativa:         row[_COL.Justificativa]         || '',
      status:                row[_COL.Status]                || 'pendente',
      aprovadoPor:           row[_COL.AprovadoPor]           || '',
      dataAprovacao:         row[_COL.DataAprovacao]         || '',
      motivoRejeicao:        row[_COL.MotivoRejeicao]        || '',
      itemEstoqueId:         row[_COL.ItemEstoqueId]         || '',
      notaFiscal:            row[_COL.NotaFiscal]            || '',
      criadoEm:              row[_COL.CriadoEm]              || '',
      atualizadoEm:          row[_COL.AtualizadoEm]          || ''
    };
  }

  // ── Índice ───────────────────────────────────────────────────────────

  function prepararIndice() {
    var ss  = _getSheet();
    var aba = ss.getSheetByName(_ABA);
    if (!aba) {
      aba = ss.insertSheet(_ABA);
      Logger.info('SolicitacaoCompraRepository', 'prepararIndice', 'Aba criada: FINANCEIRO.' + _ABA);
    }
    if (aba.getLastRow() === 0) {
      aba.getRange(1, 1, 1, _HEADERS.length).setValues([_HEADERS]);
      aba.setFrozenRows(1);
    }
    return { ok: true, aba: 'FINANCEIRO.' + _ABA };
  }

  // ── CRUD ─────────────────────────────────────────────────────────────

  function criar(dados, orgId) {
    orgId   = orgId || _orgId();
    var agr = agora();
    var id  = gerarId('cmp');
    var seq = listar({}, orgId).length + 1;
    var aba = _getAba();
    var row = new Array(_HEADERS.length).fill('');
    row[_COL.ID]                    = id;
    row[_COL.OrgId]                 = orgId;
    row[_COL.Codigo]                = 'CMP-' + String(seq).padStart(4, '0');
    row[_COL.Solicitante]           = dados.solicitante           || '';
    row[_COL.Departamento]          = dados.departamento          || '';
    row[_COL.TipoItem]              = dados.tipoItem              || 'Consumível';
    row[_COL.Descricao]             = dados.descricao             || '';
    row[_COL.Categoria]             = dados.categoria             || '';
    row[_COL.Quantidade]            = dados.quantidade            || 1;
    row[_COL.ValorUnitarioEstimado] = dados.valorUnitarioEstimado || 0;
    row[_COL.Justificativa]         = dados.justificativa         || '';
    row[_COL.Status]                = 'pendente';
    row[_COL.CriadoEm]              = agr;
    row[_COL.AtualizadoEm]          = agr;
    aba.appendRow(row);
    return _linhaParaSol(row);
  }

  function listar(filtros, orgId) {
    filtros = filtros || {};
    orgId   = orgId   || _orgId();
    var aba  = _getAba();
    var last = aba.getLastRow();
    if (last < 2) return [];
    var numCols = Math.min(_HEADERS.length, aba.getLastColumn());
    var rows    = aba.getRange(2, 1, last - 1, numCols).getValues();
    return rows.map(_linhaParaSol).filter(function (r) {
      if (r.orgId !== orgId || !r.id) return false;
      if (filtros.status    && r.status    !== filtros.status)    return false;
      if (filtros.tipoItem  && r.tipoItem  !== filtros.tipoItem)  return false;
      if (filtros.solicitante && r.solicitante !== filtros.solicitante) return false;
      return true;
    });
  }

  function buscarPorId(id, orgId) {
    orgId = orgId || _orgId();
    var aba  = _getAba();
    var last = aba.getLastRow();
    if (last < 2) return null;
    var numCols = Math.min(_HEADERS.length, aba.getLastColumn());
    var rows    = aba.getRange(2, 1, last - 1, numCols).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][_COL.ID] === id && rows[i][_COL.OrgId] === orgId) {
        return _linhaParaSol(rows[i]);
      }
    }
    return null;
  }

  function atualizar(id, campos, orgId) {
    orgId   = orgId || _orgId();
    var agr = agora();
    var aba  = _getAba();
    var last = aba.getLastRow();
    if (last < 2) throw new Error('Solicitação não encontrada: ' + id);
    var numCols = Math.min(_HEADERS.length, aba.getLastColumn());
    var rows    = aba.getRange(2, 1, last - 1, numCols).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][_COL.ID] !== id || rows[i][_COL.OrgId] !== orgId) continue;
      var row = rows[i].slice();
      var campos_ = campos || {};
      if (campos_.status        !== undefined) row[_COL.Status]        = campos_.status;
      if (campos_.aprovadoPor   !== undefined) row[_COL.AprovadoPor]   = campos_.aprovadoPor;
      if (campos_.dataAprovacao !== undefined) row[_COL.DataAprovacao] = campos_.dataAprovacao;
      if (campos_.motivoRejeicao !== undefined) row[_COL.MotivoRejeicao] = campos_.motivoRejeicao;
      if (campos_.itemEstoqueId  !== undefined) row[_COL.ItemEstoqueId]  = campos_.itemEstoqueId;
      if (campos_.notaFiscal     !== undefined) row[_COL.NotaFiscal]     = campos_.notaFiscal;
      row[_COL.AtualizadoEm] = agr;
      aba.getRange(i + 2, 1, 1, numCols).setValues([row]);
      return _linhaParaSol(row);
    }
    throw new Error('Solicitação não encontrada: ' + id);
  }

  function metricas(orgId) {
    orgId = orgId || _orgId();
    var todas = listar({}, orgId);
    return {
      totalCompras:      todas.length,
      comprasPendentes:  todas.filter(function(r){ return r.status === 'pendente';   }).length,
      comprasAprovadas:  todas.filter(function(r){ return r.status === 'aprovada';   }).length,
      comprasRecebidas:  todas.filter(function(r){ return r.status === 'recebida';   }).length,
      comprasRejeitadas: todas.filter(function(r){ return r.status === 'rejeitada';  }).length
    };
  }

  // ── Migração — MASTER → FINANCEIRO (executar uma vez se houver dados antigos) ──

  function migrarDoMaster() {
    var props    = PropertiesService.getScriptProperties();
    var masterId = props.getProperty('SHEET_ID_MASTER');
    if (!masterId) return { ok: false, motivo: 'MASTER não configurada' };
    var master = SpreadsheetApp.openById(masterId);
    var abaOrigem = master.getSheetByName(_ABA);
    if (!abaOrigem || abaOrigem.getLastRow() < 2) {
      return { ok: true, migrados: 0, motivo: 'Aba MASTER.SolicitacoesCompra vazia ou inexistente' };
    }
    prepararIndice();
    var abaDestino = _getAba();
    if (abaDestino.getLastRow() > 1) {
      return { ok: false, motivo: 'FINANCEIRO.SolicitacoesCompra já tem dados — migração cancelada para evitar duplicação' };
    }
    var numCols = Math.min(_HEADERS.length, abaOrigem.getLastColumn());
    var rows = abaOrigem.getRange(2, 1, abaOrigem.getLastRow() - 1, numCols).getValues();
    var validos = rows.filter(function(r){ return r[_COL.ID] && r[_COL.OrgId]; });
    if (validos.length > 0) {
      abaDestino.getRange(2, 1, validos.length, numCols).setValues(validos);
    }
    Logger.info('SolicitacaoCompraRepository', 'migrarDoMaster', 'Migrados ' + validos.length + ' registros de MASTER → FINANCEIRO');
    return { ok: true, migrados: validos.length };
  }

  // ── API pública ───────────────────────────────────────────────────────

  return {
    prepararIndice: prepararIndice,
    migrarDoMaster: migrarDoMaster,
    criar:          criar,
    listar:         listar,
    buscarPorId:    buscarPorId,
    atualizar:      atualizar,
    metricas:       metricas
  };

})();
