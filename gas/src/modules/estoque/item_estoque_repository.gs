/**
 * @file modules/estoque/item_estoque_repository.gs
 * @layer modules/estoque
 * @description Repositório de Itens de Estoque, Saldo por Depósito e Movimentações.
 *
 * Três fontes de dados (todas em MASTER):
 *   - MASTER.ItensEstoque (16 col)         — catálogo canônico de itens
 *   - MASTER.SaldoEstoque (8 col)           — qty por item × depósito × local
 *   - MASTER.MovimentacoesEstoque (16 col)  — log imutável (append-only)
 *
 * Depósitos são configurados em depositos_config.json (Drive).
 *
 * @depends core/services/data_gateway.gs (DataGateway — readJSON/modifyJSON)
 *          core/utils.gs (gerarId, agora)
 *          core/logger.gs (Logger)
 *          core/config.gs (getOrgConfig)
 */

var ItemEstoqueRepository = (function () {

  var _SHEET_KEY = 'SHEET_ID_MASTER';
  var _ABA_ITENS = 'ItensEstoque';
  var _ABA_SALDO = 'SaldoEstoque';
  var _ABA_MOV   = 'MovimentacoesEstoque';

  // ── Schema: ItensEstoque (16 colunas) ────────────────────────────────

  var _HEADERS_ITENS = [
    'ID', 'OrgId', 'Descricao', 'Referencia', 'Tamanho', 'Cor', 'MarcaFabricante',
    'Categoria', 'Situacao', 'UnidadeMedida', 'ValorUnitario', 'DescricaoPregao',
    'VisivelSolicitantes', 'Critico', 'CriadoEm', 'AtualizadoEm'
  ];
  var _COL_I = {};
  _HEADERS_ITENS.forEach(function (h, i) { _COL_I[h] = i; });

  // ── Schema: SaldoEstoque (8 colunas) ────────────────────────────────

  var _HEADERS_SALDO = [
    'ID', 'OrgId', 'ItemId', 'DepositoId', 'Local',
    'Quantidade', 'QuantidadeAlocada', 'AtualizadoEm'
  ];
  var _COL_S = {};
  _HEADERS_SALDO.forEach(function (h, i) { _COL_S[h] = i; });

  // ── Schema: MovimentacoesEstoque (16 colunas) ────────────────────────

  var _HEADERS_MOV = [
    'ID', 'OrgId', 'Tipo', 'ItemId', 'DescricaoItem', 'DepositoId', 'Local',
    'Quantidade', 'ValorUnitario', 'CustoTotal', 'Referencia', 'Fornecedor',
    'NotaFiscal', 'Ator', 'Observacoes', 'CriadoEm'
  ];
  var _COL_M = {};
  _HEADERS_MOV.forEach(function (h, i) { _COL_M[h] = i; });

  // ── Helpers privados ─────────────────────────────────────────────────

  function _orgId() { return getOrgConfig().orgId; }

  function _getMaster() {
    var id = PropertiesService.getScriptProperties().getProperty(_SHEET_KEY);
    if (!id) throw new Error('[ItemEstoqueRepository] MASTER não registrada nas PropertiesService.');
    return SpreadsheetApp.openById(id);
  }

  function _getAba(nome) {
    var aba = _getMaster().getSheetByName(nome);
    if (!aba) throw new Error('[ItemEstoqueRepository] Aba "' + nome + '" não encontrada. Execute fase73_estoque_prepararIndice().');
    return aba;
  }

  function _linhaParaItem(row) {
    return {
      id:                   row[_COL_I.ID]                   || '',
      orgId:                row[_COL_I.OrgId]                || '',
      descricao:            row[_COL_I.Descricao]            || '',
      referencia:           row[_COL_I.Referencia]           || '',
      tamanho:              row[_COL_I.Tamanho]              || '',
      cor:                  row[_COL_I.Cor]                  || '',
      marcaFabricante:      row[_COL_I.MarcaFabricante]      || '',
      categoria:            row[_COL_I.Categoria]            || '',
      situacao:             row[_COL_I.Situacao]             || 'Ativo',
      unidadeMedida:        row[_COL_I.UnidadeMedida]        || '',
      valorUnitario:        Number(row[_COL_I.ValorUnitario] || 0),
      descricaoPregao:      row[_COL_I.DescricaoPregao]      || '',
      visivelSolicitantes:  String(row[_COL_I.VisivelSolicitantes]).toLowerCase() !== 'false',
      critico:              String(row[_COL_I.Critico]).toLowerCase() === 'true',
      criadoEm:             row[_COL_I.CriadoEm]             || '',
      atualizadoEm:         row[_COL_I.AtualizadoEm]         || ''
    };
  }

  function _linhaParaSaldo(row) {
    return {
      id:                row[_COL_S.ID]                 || '',
      orgId:             row[_COL_S.OrgId]              || '',
      itemId:            row[_COL_S.ItemId]             || '',
      depositoId:        row[_COL_S.DepositoId]         || '',
      local:             row[_COL_S.Local]              || '',
      quantidade:        Number(row[_COL_S.Quantidade]        || 0),
      quantidadeAlocada: Number(row[_COL_S.QuantidadeAlocada] || 0),
      atualizadoEm:      row[_COL_S.AtualizadoEm]       || ''
    };
  }

  function _linhaParaMovimentacao(row) {
    return {
      id:            row[_COL_M.ID]            || '',
      orgId:         row[_COL_M.OrgId]         || '',
      tipo:          row[_COL_M.Tipo]          || '',
      itemId:        row[_COL_M.ItemId]        || '',
      descricaoItem: row[_COL_M.DescricaoItem] || '',
      depositoId:    row[_COL_M.DepositoId]    || '',
      local:         row[_COL_M.Local]         || '',
      quantidade:    Number(row[_COL_M.Quantidade]    || 0),
      valorUnitario: Number(row[_COL_M.ValorUnitario] || 0),
      custoTotal:    Number(row[_COL_M.CustoTotal]    || 0),
      referencia:    row[_COL_M.Referencia]    || '',
      fornecedor:    row[_COL_M.Fornecedor]    || '',
      notaFiscal:    row[_COL_M.NotaFiscal]    || '',
      ator:          row[_COL_M.Ator]          || '',
      observacoes:   row[_COL_M.Observacoes]   || '',
      criadoEm:      row[_COL_M.CriadoEm]      || ''
    };
  }

  // ── Índice ───────────────────────────────────────────────────────────

  function prepararIndice() {
    var ss  = _getMaster();
    var res = { ok: true, abas: [] };

    [[_ABA_ITENS, _HEADERS_ITENS], [_ABA_SALDO, _HEADERS_SALDO], [_ABA_MOV, _HEADERS_MOV]]
      .forEach(function (par) {
        var nome = par[0], headers = par[1];
        var aba  = ss.getSheetByName(nome);
        if (!aba) {
          aba = ss.insertSheet(nome);
          Logger.info('ItemEstoqueRepository', 'prepararIndice', 'Aba criada: MASTER.' + nome);
        }
        if (aba.getLastRow() === 0) {
          aba.getRange(1, 1, 1, headers.length).setValues([headers]);
          aba.setFrozenRows(1);
        }
        res.abas.push('MASTER.' + nome);
      });

    return res;
  }

  // ── Itens — CRUD ──────────────────────────────────────────────────────

  function listar(filtros, orgId) {
    filtros = filtros || {};
    orgId   = orgId   || _orgId();
    var aba  = _getAba(_ABA_ITENS);
    var last = aba.getLastRow();
    if (last < 2) return [];
    var rows = aba.getRange(2, 1, last - 1, _HEADERS_ITENS.length).getValues();
    return rows.map(_linhaParaItem).filter(function (r) {
      if (r.orgId !== orgId || !r.id) return false;
      if (filtros.situacao            && r.situacao            !== filtros.situacao)            return false;
      if (filtros.categoria           && r.categoria           !== filtros.categoria)           return false;
      if (filtros.critico !== undefined && r.critico           !== filtros.critico)             return false;
      if (filtros.visivelSolicitantes !== undefined && r.visivelSolicitantes !== filtros.visivelSolicitantes) return false;
      if (filtros.busca) {
        var b = filtros.busca.toLowerCase();
        if (r.descricao.toLowerCase().indexOf(b) === -1 &&
            r.referencia.toLowerCase().indexOf(b) === -1 &&
            r.categoria.toLowerCase().indexOf(b)  === -1) return false;
      }
      return true;
    });
  }

  function buscarPorId(id, orgId) {
    orgId = orgId || _orgId();
    var aba  = _getAba(_ABA_ITENS);
    var last = aba.getLastRow();
    if (last < 2) return null;
    var rows = aba.getRange(2, 1, last - 1, _HEADERS_ITENS.length).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][_COL_I.ID] === id && rows[i][_COL_I.OrgId] === orgId) {
        return _linhaParaItem(rows[i]);
      }
    }
    return null;
  }

  function criar(dados, orgId) {
    orgId    = orgId || _orgId();
    var agr  = agora();
    var id   = gerarId('itme');
    var aba  = _getAba(_ABA_ITENS);
    var row  = new Array(_HEADERS_ITENS.length).fill('');
    row[_COL_I.ID]                  = id;
    row[_COL_I.OrgId]               = orgId;
    row[_COL_I.Descricao]           = dados.descricao         || '';
    row[_COL_I.Referencia]          = dados.referencia         || '';
    row[_COL_I.Tamanho]             = dados.tamanho            || '';
    row[_COL_I.Cor]                 = dados.cor                || '';
    row[_COL_I.MarcaFabricante]     = dados.marcaFabricante    || '';
    row[_COL_I.Categoria]           = dados.categoria          || '';
    row[_COL_I.Situacao]            = dados.situacao           || 'Ativo';
    row[_COL_I.UnidadeMedida]       = dados.unidadeMedida      || '';
    row[_COL_I.ValorUnitario]       = dados.valorUnitario      || 0;
    row[_COL_I.DescricaoPregao]     = dados.descricaoPregao    || '';
    row[_COL_I.VisivelSolicitantes] = dados.visivelSolicitantes !== false;
    row[_COL_I.Critico]             = dados.critico === true;
    row[_COL_I.CriadoEm]            = agr;
    row[_COL_I.AtualizadoEm]        = agr;
    aba.appendRow(row);
    return Object.assign({}, dados, { id: id, orgId: orgId, criadoEm: agr, atualizadoEm: agr });
  }

  function atualizar(id, dados, orgId) {
    orgId    = orgId || _orgId();
    var agr  = agora();
    var aba  = _getAba(_ABA_ITENS);
    var last = aba.getLastRow();
    if (last < 2) throw new Error('Item não encontrado: ' + id);
    var rows = aba.getRange(2, 1, last - 1, _HEADERS_ITENS.length).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][_COL_I.ID] !== id || rows[i][_COL_I.OrgId] !== orgId) continue;
      var row = rows[i].slice();
      if (dados.descricao           !== undefined) row[_COL_I.Descricao]           = dados.descricao;
      if (dados.referencia          !== undefined) row[_COL_I.Referencia]          = dados.referencia;
      if (dados.tamanho             !== undefined) row[_COL_I.Tamanho]             = dados.tamanho;
      if (dados.cor                 !== undefined) row[_COL_I.Cor]                 = dados.cor;
      if (dados.marcaFabricante     !== undefined) row[_COL_I.MarcaFabricante]     = dados.marcaFabricante;
      if (dados.categoria           !== undefined) row[_COL_I.Categoria]           = dados.categoria;
      if (dados.situacao            !== undefined) row[_COL_I.Situacao]            = dados.situacao;
      if (dados.unidadeMedida       !== undefined) row[_COL_I.UnidadeMedida]       = dados.unidadeMedida;
      if (dados.valorUnitario       !== undefined) row[_COL_I.ValorUnitario]       = dados.valorUnitario;
      if (dados.descricaoPregao     !== undefined) row[_COL_I.DescricaoPregao]     = dados.descricaoPregao;
      if (dados.visivelSolicitantes !== undefined) row[_COL_I.VisivelSolicitantes] = dados.visivelSolicitantes;
      if (dados.critico             !== undefined) row[_COL_I.Critico]             = dados.critico;
      row[_COL_I.AtualizadoEm] = agr;
      aba.getRange(i + 2, 1, 1, _HEADERS_ITENS.length).setValues([row]);
      return _linhaParaItem(row);
    }
    throw new Error('Item não encontrado: ' + id);
  }

  // ── Saldo ────────────────────────────────────────────────────────────

  function getSaldo(itemId, orgId) {
    orgId = orgId || _orgId();
    var aba  = _getAba(_ABA_SALDO);
    var last = aba.getLastRow();
    if (last < 2) return [];
    var rows = aba.getRange(2, 1, last - 1, _HEADERS_SALDO.length).getValues();
    return rows.map(_linhaParaSaldo).filter(function (r) {
      return r.orgId === orgId && r.itemId === itemId && r.id;
    });
  }

  function getSaldoTotal(itemId, orgId) {
    return getSaldo(itemId, orgId).reduce(function (s, r) { return s + r.quantidade; }, 0);
  }

  function getSaldoDisponivel(itemId, orgId) {
    return getSaldo(itemId, orgId).reduce(function (s, r) {
      return s + Math.max(0, r.quantidade - r.quantidadeAlocada);
    }, 0);
  }

  /**
   * Atualiza o saldo de um item em um depósito/local específico.
   * Cria a linha se não existir. Deve ser chamado dentro de LockService.
   *
   * @param {string} itemId
   * @param {string} depositoId
   * @param {string} local        — código de prateleira (livre formato)
   * @param {number} deltaQtd     — delta em quantidade real (negativo = saída)
   * @param {number} deltaAlocada — delta em quantidade alocada (negativo = liberação)
   * @param {string} orgId
   */
  function atualizarSaldo(itemId, depositoId, local, deltaQtd, deltaAlocada, orgId) {
    orgId    = orgId || _orgId();
    var agr  = agora();
    var aba  = _getAba(_ABA_SALDO);
    var last = aba.getLastRow();
    var rows = last >= 2
      ? aba.getRange(2, 1, last - 1, _HEADERS_SALDO.length).getValues()
      : [];

    for (var i = 0; i < rows.length; i++) {
      if (rows[i][_COL_S.OrgId]      !== orgId     ||
          rows[i][_COL_S.ItemId]     !== itemId    ||
          rows[i][_COL_S.DepositoId] !== depositoId ||
          rows[i][_COL_S.Local]      !== (local || '')) continue;

      var novaQtd     = Math.max(0, Number(rows[i][_COL_S.Quantidade]        || 0) + (deltaQtd     || 0));
      var novaAlocada = Math.max(0, Number(rows[i][_COL_S.QuantidadeAlocada]  || 0) + (deltaAlocada || 0));
      rows[i][_COL_S.Quantidade]        = novaQtd;
      rows[i][_COL_S.QuantidadeAlocada] = novaAlocada;
      rows[i][_COL_S.AtualizadoEm]      = agr;
      aba.getRange(i + 2, 1, 1, _HEADERS_SALDO.length).setValues([rows[i]]);
      return;
    }

    // Linha não encontrada — cria nova
    var nova = new Array(_HEADERS_SALDO.length).fill('');
    nova[_COL_S.ID]                = gerarId('sald');
    nova[_COL_S.OrgId]             = orgId;
    nova[_COL_S.ItemId]            = itemId;
    nova[_COL_S.DepositoId]        = depositoId;
    nova[_COL_S.Local]             = local || '';
    nova[_COL_S.Quantidade]        = Math.max(0, deltaQtd     || 0);
    nova[_COL_S.QuantidadeAlocada] = Math.max(0, deltaAlocada || 0);
    nova[_COL_S.AtualizadoEm]      = agr;
    aba.appendRow(nova);
  }

  // ── Movimentações (append-only) ──────────────────────────────────────

  function registrarMovimentacao(dados, orgId) {
    orgId   = orgId || _orgId();
    var agr = agora();
    var id  = gerarId('mov');
    var aba = _getAba(_ABA_MOV);
    var row = new Array(_HEADERS_MOV.length).fill('');
    row[_COL_M.ID]            = id;
    row[_COL_M.OrgId]         = orgId;
    row[_COL_M.Tipo]          = dados.tipo           || '';
    row[_COL_M.ItemId]        = dados.itemId         || '';
    row[_COL_M.DescricaoItem] = dados.descricaoItem  || '';
    row[_COL_M.DepositoId]    = dados.depositoId     || '';
    row[_COL_M.Local]         = dados.local          || '';
    row[_COL_M.Quantidade]    = dados.quantidade      || 0;
    row[_COL_M.ValorUnitario] = dados.valorUnitario   || 0;
    row[_COL_M.CustoTotal]    = (dados.quantidade || 0) * (dados.valorUnitario || 0);
    row[_COL_M.Referencia]    = dados.referencia     || '';
    row[_COL_M.Fornecedor]    = dados.fornecedor     || '';
    row[_COL_M.NotaFiscal]    = dados.notaFiscal     || '';
    row[_COL_M.Ator]          = dados.ator           || '';
    row[_COL_M.Observacoes]   = dados.observacoes    || '';
    row[_COL_M.CriadoEm]      = agr;
    aba.appendRow(row);
    return { id: id, criadoEm: agr };
  }

  function listarMovimentacoes(filtros, orgId) {
    filtros = filtros || {};
    orgId   = orgId   || _orgId();
    var aba  = _getAba(_ABA_MOV);
    var last = aba.getLastRow();
    if (last < 2) return [];
    var rows = aba.getRange(2, 1, last - 1, _HEADERS_MOV.length).getValues();
    return rows.map(_linhaParaMovimentacao).filter(function (r) {
      if (r.orgId !== orgId || !r.id) return false;
      if (filtros.itemId     && r.itemId     !== filtros.itemId)     return false;
      if (filtros.tipo       && r.tipo       !== filtros.tipo)       return false;
      if (filtros.depositoId && r.depositoId !== filtros.depositoId) return false;
      if (filtros.dataInicio && r.criadoEm < filtros.dataInicio)     return false;
      if (filtros.dataFim    && r.criadoEm > filtros.dataFim + 'T23:59:59') return false;
      return true;
    });
  }

  // ── Depósitos (depositos_config.json) ────────────────────────────────

  function listarDepositos(orgId) {
    orgId = orgId || _orgId();
    try {
      var lista = readJSON('depositos_config.json');
      if (!Array.isArray(lista)) return [];
      return lista.filter(function (d) { return d.orgId === orgId && d.ativo !== false; });
    } catch (e) { return []; }
  }

  function salvarDeposito(dados, orgId) {
    orgId = orgId || _orgId();
    var agr = agora();
    var resultado = null;
    modifyJSON('depositos_config.json', function (lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = -1;
      if (dados.id) {
        for (var i = 0; i < lista.length; i++) {
          if (lista[i].id === dados.id && lista[i].orgId === orgId) { idx = i; break; }
        }
      }
      if (idx >= 0) {
        lista[idx] = Object.assign({}, lista[idx], dados, { atualizadoEm: agr });
        resultado  = lista[idx];
      } else {
        var novo = Object.assign({ ativo: true, criadoEm: agr, atualizadoEm: agr }, dados, {
          id:    dados.id || gerarId('dep'),
          orgId: orgId
        });
        lista.push(novo);
        resultado = novo;
      }
      return lista;
    });
    return resultado;
  }

  // ── Métricas ─────────────────────────────────────────────────────────

  function metricas(orgId) {
    orgId = orgId || _orgId();
    var itens = listar({}, orgId);

    var saldoRows = [];
    try {
      var abaS = _getAba(_ABA_SALDO);
      var lastS = abaS.getLastRow();
      if (lastS >= 2) {
        saldoRows = abaS.getRange(2, 1, lastS - 1, _HEADERS_SALDO.length).getValues()
          .map(_linhaParaSaldo)
          .filter(function (r) { return r.orgId === orgId && r.id; });
      }
    } catch (e) { /* aba pode estar vazia */ }

    var totalValor = 0, criticos0 = 0, criticosBaixo = 0;
    itens.forEach(function (item) {
      var qtd = saldoRows
        .filter(function (s) { return s.itemId === item.id; })
        .reduce(function (a, s) { return a + s.quantidade; }, 0);
      totalValor += qtd * item.valorUnitario;
      if (item.critico) {
        if (qtd === 0) criticos0++;
        else if (qtd <= 5) criticosBaixo++;
      }
    });

    return {
      totalItens:           itens.length,
      totalValorEstoque:    totalValor,
      itensCriticosZerados: criticos0,
      itensCriticosBaixo:   criticosBaixo
    };
  }

  // ── API pública ───────────────────────────────────────────────────────

  return {
    prepararIndice:        prepararIndice,
    listar:                listar,
    buscarPorId:           buscarPorId,
    criar:                 criar,
    atualizar:             atualizar,
    getSaldo:              getSaldo,
    getSaldoTotal:         getSaldoTotal,
    getSaldoDisponivel:    getSaldoDisponivel,
    atualizarSaldo:        atualizarSaldo,
    registrarMovimentacao: registrarMovimentacao,
    listarMovimentacoes:   listarMovimentacoes,
    listarDepositos:       listarDepositos,
    salvarDeposito:        salvarDeposito,
    metricas:              metricas
  };

})();
