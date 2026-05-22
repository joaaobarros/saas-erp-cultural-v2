/**
 * @file modules/espacos/reservas_itens_repository.gs
 * @layer modules/espacos
 * @description Repositório de Itens do Almoxarifado e seus Empréstimos.
 *
 * DUAS fontes distintas:
 *   - MASTER.Itens — catálogo de itens disponíveis para empréstimo
 *   - ESPACOS.EmprestimosItens — registros de empréstimos (transações)
 *
 * Schema de Item (catálogo):
 *   { id, orgId, nome, descricao, quantidadeTotal, localizacao, categoria,
 *     criadoEm, atualizadoEm }
 *
 * Schema de Emprestimo:
 *   { id, orgId, itemId, nomeItem, quantidade,
 *     acaoId, reservaId, responsavel, setor,
 *     dataRetirada, dataDevolucao, dataRetiradaReal, dataDevolucaoReal,
 *     status, aprovadoPor, motivoCancelamento, observacoes,
 *     criadoEm, atualizadoEm, criadoPor, versao }
 *
 * @depends core/services/data_gateway.gs (DataGateway)
 *          core/utils.gs (gerarId, agora)
 *          core/logger.gs (Logger)
 *          core/config.gs (getOrgConfig)
 */

var ReservasItensRepository = (function () {

  var _SHEET_KEY_MASTER  = 'SHEET_ID_MASTER';
  var _SHEET_KEY_ESPACOS = 'SHEET_ID_ESPACOS';
  var _ABA_ITENS         = 'Itens';
  var _ABA_EMPRESTIMOS   = 'EmprestimosItens';

  // ── Schema: Catálogo de Itens (MASTER.Itens) ─────────────────────────

  var _HEADERS_ITENS = [
    'ID', 'OrgId', 'Nome', 'Descricao', 'QuantidadeTotal',
    'Localizacao', 'Categoria', 'CriadoEm', 'AtualizadoEm'
  ];
  var _COL_ITENS = {};
  _HEADERS_ITENS.forEach(function (h, i) { _COL_ITENS[h] = i; });

  // ── Schema: Empréstimos (ESPACOS.EmprestimosItens) ───────────────────

  var _HEADERS_EMP = [
    'ID', 'OrgId', 'ItemId', 'NomeItem', 'Quantidade',
    'AcaoId', 'ReservaId', 'Responsavel', 'Setor',
    'DataRetirada', 'DataDevolucao', 'DataRetiradaReal', 'DataDevolucaoReal',
    'Status', 'AprovadoPor', 'MotivoCancelamento', 'Observacoes',
    'CriadoEm', 'AtualizadoEm', 'CriadoPor', 'Versao'
  ];
  var _COL_EMP = {};
  _HEADERS_EMP.forEach(function (h, i) { _COL_EMP[h] = i; });

  // ── Helpers ──────────────────────────────────────────────────────────

  function _orgId() { return getOrgConfig().orgId; }

  function _getSheetItens() {
    var props   = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty(_SHEET_KEY_MASTER);
    if (!sheetId) throw new Error('[ReservasItensRepository] MASTER não registrada nas PropertiesService.');
    return SpreadsheetApp.openById(sheetId).getSheetByName(_ABA_ITENS);
  }

  function _getSheetEmprestimos() {
    var props   = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty(_SHEET_KEY_ESPACOS);
    if (!sheetId) throw new Error('[ReservasItensRepository] ESPACOS não registrada nas PropertiesService.');
    return SpreadsheetApp.openById(sheetId).getSheetByName(_ABA_EMPRESTIMOS);
  }

  function _linhaParaItem(row) {
    return {
      id:              row[_COL_ITENS.ID]              || '',
      orgId:           row[_COL_ITENS.OrgId]           || '',
      nome:            row[_COL_ITENS.Nome]            || '',
      descricao:       row[_COL_ITENS.Descricao]       || '',
      quantidadeTotal: Number(row[_COL_ITENS.QuantidadeTotal] || 0),
      localizacao:     row[_COL_ITENS.Localizacao]     || '',
      categoria:       row[_COL_ITENS.Categoria]       || '',
      criadoEm:        row[_COL_ITENS.CriadoEm]        || '',
      atualizadoEm:    row[_COL_ITENS.AtualizadoEm]    || ''
    };
  }

  function _linhaParaEmprestimo(row) {
    return {
      id:                row[_COL_EMP.ID]                || '',
      orgId:             row[_COL_EMP.OrgId]             || '',
      itemId:            row[_COL_EMP.ItemId]            || '',
      nomeItem:          row[_COL_EMP.NomeItem]          || '',
      quantidade:        Number(row[_COL_EMP.Quantidade]  || 1),
      acaoId:            row[_COL_EMP.AcaoId]            || '',
      reservaId:         row[_COL_EMP.ReservaId]         || '',
      responsavel:       row[_COL_EMP.Responsavel]       || '',
      setor:             row[_COL_EMP.Setor]             || '',
      dataRetirada:      row[_COL_EMP.DataRetirada]      || '',
      dataDevolucao:     row[_COL_EMP.DataDevolucao]     || '',
      dataRetiradaReal:  row[_COL_EMP.DataRetiradaReal]  || '',
      dataDevolucaoReal: row[_COL_EMP.DataDevolucaoReal] || '',
      status:            row[_COL_EMP.Status]            || 'solicitado',
      aprovadoPor:       row[_COL_EMP.AprovadoPor]       || '',
      motivoCancelamento:row[_COL_EMP.MotivoCancelamento]|| '',
      observacoes:       row[_COL_EMP.Observacoes]       || '',
      criadoEm:          row[_COL_EMP.CriadoEm]          || '',
      atualizadoEm:      row[_COL_EMP.AtualizadoEm]      || '',
      criadoPor:         row[_COL_EMP.CriadoPor]         || '',
      versao:            Number(row[_COL_EMP.Versao]     || 1)
    };
  }

  function _emprestimoParaLinha(e) {
    return [
      e.id                || '',
      e.orgId             || '',
      e.itemId            || '',
      e.nomeItem          || '',
      e.quantidade        || 1,
      e.acaoId            || '',
      e.reservaId         || '',
      e.responsavel       || '',
      e.setor             || '',
      e.dataRetirada      || '',
      e.dataDevolucao     || '',
      e.dataRetiradaReal  || '',
      e.dataDevolucaoReal || '',
      e.status            || 'solicitado',
      e.aprovadoPor       || '',
      e.motivoCancelamento|| '',
      e.observacoes       || '',
      e.criadoEm          || '',
      e.atualizadoEm      || '',
      e.criadoPor         || '',
      e.versao            || 1
    ];
  }

  // ── Catálogo de Itens ────────────────────────────────────────────────

  /**
   * Garante cabeçalhos nas abas MASTER.Itens e ESPACOS.EmprestimosItens.
   */
  function prepararIndice() {
    var resultados = [];
    try {
      var abaItens = _getSheetItens();
      if (abaItens) {
        var existente = abaItens.getRange(1, 1, 1, _HEADERS_ITENS.length).getValues()[0];
        if (existente.every(function (v) { return !v; })) {
          abaItens.getRange(1, 1, 1, _HEADERS_ITENS.length).setValues([_HEADERS_ITENS]);
          abaItens.setFrozenRows(1);
        }
        resultados.push('MASTER.Itens ok');
      }
    } catch (e) {
      resultados.push('MASTER.Itens erro: ' + e.message);
    }
    try {
      var abaEmp = _getSheetEmprestimos();
      if (abaEmp) {
        var existenteEmp = abaEmp.getRange(1, 1, 1, _HEADERS_EMP.length).getValues()[0];
        if (existenteEmp.every(function (v) { return !v; })) {
          abaEmp.getRange(1, 1, 1, _HEADERS_EMP.length).setValues([_HEADERS_EMP]);
          abaEmp.setFrozenRows(1);
        }
        resultados.push('ESPACOS.EmprestimosItens ok');
      }
    } catch (e) {
      resultados.push('ESPACOS.EmprestimosItens erro: ' + e.message);
    }
    return { ok: true, abas: resultados };
  }

  /**
   * Lista itens do catálogo.
   * @param {string} orgId
   * @returns {Item[]}
   */
  function listarItens(orgId) {
    try {
      var aba = _getSheetItens();
      if (!aba || aba.getLastRow() < 2) return [];
      var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS_ITENS.length).getValues();
      return dados
        .filter(function (row) { return row[_COL_ITENS.ID] && row[_COL_ITENS.OrgId] === orgId; })
        .map(_linhaParaItem);
    } catch (e) {
      Logger.error('reservas_itens_repository', 'listarItens', e.message);
      return [];
    }
  }

  /**
   * Busca item do catálogo por ID.
   */
  function buscarItem(itemId, orgId) {
    var itens = listarItens(orgId);
    return itens.filter(function (i) { return i.id === itemId; })[0] || null;
  }

  /**
   * Salva (cria ou atualiza) um item no catálogo.
   */
  function salvarItem(item, orgId) {
    var aba = _getSheetItens();
    if (!aba) throw new Error('[ReservasItensRepository.salvarItem] Aba Itens não encontrada.');
    var agr = agora ? agora() : new Date().toISOString();

    if (item.id) {
      var dados = aba.getLastRow() > 1 ?
        aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS_ITENS.length).getValues() : [];
      for (var i = 0; i < dados.length; i++) {
        if (String(dados[i][_COL_ITENS.ID]).trim() === String(item.id).trim() &&
            dados[i][_COL_ITENS.OrgId] === orgId) {
          item.atualizadoEm = agr;
          aba.getRange(i + 2, 1, 1, _HEADERS_ITENS.length).setValues([[
            item.id, item.orgId || orgId, item.nome || '',
            item.descricao || '', item.quantidadeTotal || 0,
            item.localizacao || '', item.categoria || '',
            item.criadoEm || agr, agr
          ]]);
          return item;
        }
      }
    }
    // Criar
    item.id          = gerarId('ITEM');
    item.orgId       = orgId;
    item.criadoEm    = agr;
    item.atualizadoEm= agr;
    aba.appendRow([
      item.id, item.orgId, item.nome || '',
      item.descricao || '', item.quantidadeTotal || 0,
      item.localizacao || '', item.categoria || '',
      item.criadoEm, item.atualizadoEm
    ]);
    return item;
  }

  // ── Empréstimos ──────────────────────────────────────────────────────

  /**
   * Lista empréstimos com filtros.
   * @param {Object} filtros — { status, itemId, responsavel }
   * @param {string} orgId
   */
  function listarEmprestimos(filtros, orgId) {
    try {
      var aba = _getSheetEmprestimos();
      if (!aba || aba.getLastRow() < 2) return [];
      var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS_EMP.length).getValues();
      var f = filtros || {};
      return dados
        .filter(function (row) {
          if (!row[_COL_EMP.ID]) return false;
          if (row[_COL_EMP.OrgId] !== orgId) return false;
          if (f.status      && row[_COL_EMP.Status]      !== f.status)      return false;
          if (f.itemId      && row[_COL_EMP.ItemId]      !== f.itemId)      return false;
          if (f.responsavel && row[_COL_EMP.Responsavel] !== f.responsavel) return false;
          return true;
        })
        .map(_linhaParaEmprestimo);
    } catch (e) {
      Logger.error('reservas_itens_repository', 'listarEmprestimos', e.message);
      return [];
    }
  }

  /**
   * Busca empréstimo por ID.
   */
  function buscarEmprestimo(id, orgId) {
    var emp = listarEmprestimos({}, orgId);
    return emp.filter(function (e) { return e.id === id; })[0] || null;
  }

  /**
   * Salva um empréstimo (cria ou atualiza).
   */
  function salvarEmprestimo(emp) {
    var aba = _getSheetEmprestimos();
    if (!aba) throw new Error('[ReservasItensRepository.salvarEmprestimo] Aba EmprestimosItens não encontrada.');
    var agr = agora ? agora() : new Date().toISOString();

    if (emp.id) {
      var dados = aba.getLastRow() > 1 ?
        aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS_EMP.length).getValues() : [];
      for (var i = 0; i < dados.length; i++) {
        if (String(dados[i][_COL_EMP.ID]).trim() === String(emp.id).trim() &&
            dados[i][_COL_EMP.OrgId] === emp.orgId) {
          emp.atualizadoEm = agr;
          emp.versao = Number(dados[i][_COL_EMP.Versao] || 1) + 1;
          aba.getRange(i + 2, 1, 1, _HEADERS_EMP.length).setValues([_emprestimoParaLinha(emp)]);
          return emp;
        }
      }
      throw new Error('[ReservasItensRepository.salvarEmprestimo] Empréstimo não encontrado: ' + emp.id);
    }

    emp.id           = gerarId('EMP');
    emp.criadoEm     = agr;
    emp.atualizadoEm = agr;
    emp.versao       = 1;
    aba.appendRow(_emprestimoParaLinha(emp));
    return emp;
  }

  /**
   * Atualiza status de um empréstimo.
   */
  function atualizarStatusEmprestimo(id, novoStatus, orgId, campos) {
    var aba = _getSheetEmprestimos();
    if (!aba || aba.getLastRow() < 2) throw new Error('Empréstimo não encontrado: ' + id);
    var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS_EMP.length).getValues();
    for (var i = 0; i < dados.length; i++) {
      if (String(dados[i][_COL_EMP.ID]).trim() === String(id).trim() &&
          dados[i][_COL_EMP.OrgId] === orgId) {
        var agr = agora ? agora() : new Date().toISOString();
        aba.getRange(i + 2, _COL_EMP.Status + 1).setValue(novoStatus);
        aba.getRange(i + 2, _COL_EMP.AtualizadoEm + 1).setValue(agr);
        aba.getRange(i + 2, _COL_EMP.Versao + 1).setValue(Number(dados[i][_COL_EMP.Versao] || 1) + 1);
        if (campos) {
          Object.keys(campos).forEach(function (k) {
            if (_COL_EMP[k] !== undefined) {
              aba.getRange(i + 2, _COL_EMP[k] + 1).setValue(campos[k]);
            }
          });
        }
        return;
      }
    }
    throw new Error('[ReservasItensRepository.atualizarStatusEmprestimo] Não encontrado: ' + id);
  }

  /**
   * Calcula quantos itens estão em uso ativo no período informado.
   * Usado por assertItemDisponivel() — deve ser chamado dentro de LockService.
   *
   * @param {string} itemId
   * @param {string} dataRetirada — ISO date
   * @param {string} dataDevolucao — ISO date
   * @param {string} orgId
   * @returns {number} quantidade em uso no período
   */
  function quantidadeEmUsoPeriodo(itemId, dataRetirada, dataDevolucao, orgId) {
    try {
      var aba = _getSheetEmprestimos();
      if (!aba || aba.getLastRow() < 2) return 0;
      var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS_EMP.length).getValues();
      var total = 0;
      dados.forEach(function (row) {
        if (row[_COL_EMP.OrgId] !== orgId)          return;
        if (row[_COL_EMP.ItemId] !== itemId)         return;
        var status = String(row[_COL_EMP.Status] || '').toLowerCase();
        if (status === 'cancelado' || status === 'devolvido') return;
        // Verifica sobreposição de período
        var rIni = row[_COL_EMP.DataRetirada]  || '';
        var rFim = row[_COL_EMP.DataDevolucao] || '';
        if (rIni && rFim) {
          var sobrepoem = String(rIni) <= String(dataDevolucao) &&
                          String(rFim) >= String(dataRetirada);
          if (sobrepoem) total += Number(row[_COL_EMP.Quantidade] || 1);
        }
      });
      return total;
    } catch (e) {
      Logger.error('reservas_itens_repository', 'quantidadeEmUsoPeriodo', e.message);
      return 0;
    }
  }

  /**
   * Métricas do almoxarifado.
   */
  function metricas(orgId) {
    try {
      var emp = listarEmprestimos({}, orgId);
      var m = {
        itensNoCatalogo:    listarItens(orgId).length,
        emprestimosAtivos:  0,
        emprestimosPendentes: 0,
        emprestimosAtrasados: 0,
        emprestimosTotal:   emp.length
      };
      emp.forEach(function (e) {
        if (e.status === 'retirado')   m.emprestimosAtivos++;
        if (e.status === 'aprovado' || e.status === 'solicitado') m.emprestimosPendentes++;
        if (e.status === 'atrasado')   m.emprestimosAtrasados++;
      });
      return m;
    } catch (e) {
      Logger.error('reservas_itens_repository', 'metricas', e.message);
      return { itensNoCatalogo:0, emprestimosAtivos:0, emprestimosPendentes:0, emprestimosAtrasados:0, emprestimosTotal:0 };
    }
  }

  return {
    prepararIndice:          prepararIndice,
    listarItens:             listarItens,
    buscarItem:              buscarItem,
    salvarItem:              salvarItem,
    listarEmprestimos:       listarEmprestimos,
    buscarEmprestimo:        buscarEmprestimo,
    salvarEmprestimo:        salvarEmprestimo,
    atualizarStatusEmprestimo: atualizarStatusEmprestimo,
    quantidadeEmUsoPeriodo:  quantidadeEmUsoPeriodo,
    metricas:                metricas
  };

})();

// ── Wrapper global para GAS Editor ────────────────────────────────────────
function fase2_emprestimos_prepararIndice() {
  return ReservasItensRepository.prepararIndice();
}
