/**
 * @file modules/espacos/chave_repository.gs
 * @layer modules/espacos
 * @description Repositório de Protocolos de Chave.
 *
 * Fonte de verdade: ESPACOS.Chaves (Sheet canônica — tabular, visível à equipe)
 *
 * Schema de Protocolo:
 *   { id, orgId, nomeSala, responsavel, nomeResponsavel, setor, turno,
 *     dataRetirada, dataDevolucao, dataDevolucaoReal,
 *     reservaId, status, observacoes,
 *     criadoEm, atualizadoEm, criadoPor, versao }
 *
 * FSM: aberto → devolvido
 *      aberto → atrasado → devolvido
 *
 * @depends core/utils.gs (gerarId, agora)
 *          core/logger.gs (Logger)
 *          core/config.gs (getOrgConfig)
 */

var ChaveRepository = (function () {

  var _SHEET_KEY = 'SHEET_ID_ESPACOS';
  var _ABA       = 'Chaves';

  var _HEADERS = [
    'ID', 'OrgId', 'NomeSala', 'Responsavel', 'NomeResponsavel',
    'Setor', 'Turno', 'DataRetirada', 'DataDevolucao', 'DataDevolucaoReal',
    'ReservaId', 'Status', 'Observacoes',
    'CriadoEm', 'AtualizadoEm', 'CriadoPor', 'Versao'
  ];

  var _COL = {};
  _HEADERS.forEach(function (h, i) { _COL[h] = i; });

  // ── Helpers ──────────────────────────────────────────────────────────

  function _orgId() { return getOrgConfig().orgId; }

  function _getSheet() {
    var props   = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty(_SHEET_KEY);
    if (!sheetId) throw new Error('[ChaveRepository] ESPACOS não registrada nas PropertiesService.');
    return SpreadsheetApp.openById(sheetId).getSheetByName(_ABA);
  }

  function _linhaParaProtocolo(row) {
    return {
      id:                row[_COL.ID]                || '',
      orgId:             row[_COL.OrgId]             || '',
      nomeSala:          row[_COL.NomeSala]          || '',
      responsavel:       row[_COL.Responsavel]       || '',
      nomeResponsavel:   row[_COL.NomeResponsavel]   || '',
      setor:             row[_COL.Setor]             || '',
      turno:             row[_COL.Turno]             || '',
      dataRetirada:      row[_COL.DataRetirada]      ? String(row[_COL.DataRetirada]) : '',
      dataDevolucao:     row[_COL.DataDevolucao]     ? String(row[_COL.DataDevolucao]) : '',
      dataDevolucaoReal: row[_COL.DataDevolucaoReal] ? String(row[_COL.DataDevolucaoReal]) : '',
      reservaId:         row[_COL.ReservaId]         || '',
      status:            row[_COL.Status]            || 'aberto',
      observacoes:       row[_COL.Observacoes]       || '',
      criadoEm:          row[_COL.CriadoEm]          || '',
      atualizadoEm:      row[_COL.AtualizadoEm]      || '',
      criadoPor:         row[_COL.CriadoPor]         || '',
      versao:            Number(row[_COL.Versao]     || 1)
    };
  }

  function _protocoloParaLinha(p) {
    return [
      p.id                || '',
      p.orgId             || '',
      p.nomeSala          || '',
      p.responsavel       || '',
      p.nomeResponsavel   || '',
      p.setor             || '',
      p.turno             || '',
      p.dataRetirada      || '',
      p.dataDevolucao     || '',
      p.dataDevolucaoReal || '',
      p.reservaId         || '',
      p.status            || 'aberto',
      p.observacoes       || '',
      p.criadoEm          || '',
      p.atualizadoEm      || '',
      p.criadoPor         || '',
      p.versao            || 1
    ];
  }

  // ── Operações públicas ────────────────────────────────────────────────

  /**
   * Garante cabeçalho na aba ESPACOS.Chaves.
   */
  function prepararIndice() {
    try {
      var aba = _getSheet();
      if (!aba) throw new Error('Aba Chaves não encontrada.');
      var existente = aba.getRange(1, 1, 1, _HEADERS.length).getValues()[0];
      if (existente.every(function (v) { return !v; })) {
        aba.getRange(1, 1, 1, _HEADERS.length).setValues([_HEADERS]);
        aba.setFrozenRows(1);
        Logger.info('chave_repository', 'prepararIndice', 'Cabeçalho criado em ESPACOS.Chaves');
      }
      return { ok: true, aba: 'ESPACOS.Chaves' };
    } catch (e) {
      Logger.error('chave_repository', 'prepararIndice', e.message);
      return { ok: false, erro: e.message };
    }
  }

  /**
   * Lista protocolos de chave com filtros.
   * @param {Object} filtros — { status, nomeSala, responsavel }
   * @param {string} orgId
   * @returns {Protocolo[]}
   */
  function listar(filtros, orgId) {
    try {
      var aba = _getSheet();
      if (!aba || aba.getLastRow() < 2) return [];
      var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS.length).getValues();
      var f = filtros || {};
      return dados
        .filter(function (row) {
          if (!row[_COL.ID]) return false;
          if (row[_COL.OrgId] !== orgId) return false;
          if (f.status      && row[_COL.Status]      !== f.status)      return false;
          if (f.nomeSala    && row[_COL.NomeSala]    !== f.nomeSala)    return false;
          if (f.responsavel && row[_COL.Responsavel] !== f.responsavel) return false;
          return true;
        })
        .map(_linhaParaProtocolo);
    } catch (e) {
      Logger.error('chave_repository', 'listar', e.message);
      return [];
    }
  }

  /**
   * Busca protocolo por ID.
   */
  function buscarPorId(id, orgId) {
    try {
      var aba = _getSheet();
      if (!aba || aba.getLastRow() < 2) return null;
      var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS.length).getValues();
      for (var i = 0; i < dados.length; i++) {
        if (String(dados[i][_COL.ID]).trim() === String(id).trim() &&
            dados[i][_COL.OrgId] === orgId) {
          return _linhaParaProtocolo(dados[i]);
        }
      }
      return null;
    } catch (e) {
      Logger.error('chave_repository', 'buscarPorId', e.message);
      return null;
    }
  }

  /**
   * Salva um protocolo de chave.
   */
  function salvar(protocolo) {
    var aba = _getSheet();
    if (!aba) throw new Error('[ChaveRepository.salvar] Aba Chaves não encontrada.');
    var agr = agora ? agora() : new Date().toISOString();

    if (protocolo.id) {
      var dados = aba.getLastRow() > 1 ?
        aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS.length).getValues() : [];
      for (var i = 0; i < dados.length; i++) {
        if (String(dados[i][_COL.ID]).trim() === String(protocolo.id).trim() &&
            dados[i][_COL.OrgId] === protocolo.orgId) {
          protocolo.atualizadoEm = agr;
          protocolo.versao = Number(dados[i][_COL.Versao] || 1) + 1;
          aba.getRange(i + 2, 1, 1, _HEADERS.length).setValues([_protocoloParaLinha(protocolo)]);
          return protocolo;
        }
      }
      throw new Error('[ChaveRepository.salvar] Protocolo não encontrado: ' + protocolo.id);
    }

    protocolo.id          = gerarId('CHV');
    protocolo.criadoEm    = agr;
    protocolo.atualizadoEm= agr;
    protocolo.versao      = 1;
    aba.appendRow(_protocoloParaLinha(protocolo));
    return protocolo;
  }

  /**
   * Atualiza apenas o status de um protocolo.
   */
  function atualizarStatus(id, novoStatus, orgId, campos) {
    var aba = _getSheet();
    if (!aba || aba.getLastRow() < 2) throw new Error('Protocolo não encontrado: ' + id);
    var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS.length).getValues();
    for (var i = 0; i < dados.length; i++) {
      if (String(dados[i][_COL.ID]).trim() === String(id).trim() &&
          dados[i][_COL.OrgId] === orgId) {
        var agr = agora ? agora() : new Date().toISOString();
        aba.getRange(i + 2, _COL.Status + 1).setValue(novoStatus);
        aba.getRange(i + 2, _COL.AtualizadoEm + 1).setValue(agr);
        aba.getRange(i + 2, _COL.Versao + 1).setValue(Number(dados[i][_COL.Versao] || 1) + 1);
        if (campos) {
          if (campos.DataDevolucaoReal) aba.getRange(i + 2, _COL.DataDevolucaoReal + 1).setValue(campos.DataDevolucaoReal);
          if (campos.Observacoes)       aba.getRange(i + 2, _COL.Observacoes + 1).setValue(campos.Observacoes);
        }
        return;
      }
    }
    throw new Error('[ChaveRepository.atualizarStatus] Protocolo não encontrado: ' + id);
  }

  /**
   * Métricas rápidas.
   */
  function metricas(orgId) {
    try {
      var aba = _getSheet();
      if (!aba || aba.getLastRow() < 2) return { total:0, abertos:0, atrasados:0, devolvidos:0 };
      var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS.length).getValues();
      var m = { total:0, abertos:0, atrasados:0, devolvidos:0 };
      dados.forEach(function (row) {
        if (!row[_COL.ID]) return;
        if (row[_COL.OrgId] !== orgId) return;
        var s = String(row[_COL.Status] || 'aberto').toLowerCase();
        m.total++;
        if (s === 'aberto')    m.abertos++;
        if (s === 'atrasado')  m.atrasados++;
        if (s === 'devolvido') m.devolvidos++;
      });
      return m;
    } catch (e) {
      Logger.error('chave_repository', 'metricas', e.message);
      return { total:0, abertos:0, atrasados:0, devolvidos:0 };
    }
  }

  return {
    prepararIndice: prepararIndice,
    listar:         listar,
    buscarPorId:    buscarPorId,
    salvar:         salvar,
    atualizarStatus:atualizarStatus,
    metricas:       metricas
  };

})();

// ── Wrapper global para GAS Editor ────────────────────────────────────────
function fase2_chaves_prepararIndice() {
  return ChaveRepository.prepararIndice();
}
