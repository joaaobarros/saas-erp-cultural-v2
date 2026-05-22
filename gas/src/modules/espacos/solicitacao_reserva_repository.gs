/**
 * @file modules/espacos/solicitacao_reserva_repository.gs
 * @layer modules/espacos
 * @description CRUD da Sheet ESPACOS.Solicitacoes — workflow de aprovação de reservas.
 *
 * Colaboradores sem papel de infraestrutura/gestor/admin não criam reservas
 * diretamente — geram uma Solicitação que um aprovador aceita ou recusa.
 *
 * @depends core/data_layer.gs, core/utils.gs
 */

var SolicitacaoReservaRepository = (function() {

  var SHEET_KEY    = 'SHEET_ID_ESPACOS';
  var ABA          = 'Solicitacoes';
  var HEADERS      = [
    'id','orgId','tipo','idReserva','espacoId','solicitante',
    'justificativa','payload','status','aprovador','motivoRecusa',
    'dataSolicitacao','dataAcao','criadoEm','atualizadoEm','versao'
  ];

  function _getSheet() {
    var id = PropertiesService.getScriptProperties().getProperty(SHEET_KEY);
    if (!id) throw new Error('SHEET_ID_ESPACOS não configurado.');
    var ss = SpreadsheetApp.openById(id);
    return ss.getSheetByName(ABA) || ss.insertSheet(ABA);
  }

  function prepararIndice() {
    var sheet = _getSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }
    return true;
  }

  function _rowToObj(row) {
    var obj = {};
    HEADERS.forEach(function(h, i) { obj[h] = row[i] !== undefined ? row[i] : ''; });
    try { if (obj.payload) obj.payload = JSON.parse(obj.payload); } catch(_) {}
    obj.versao = Number(obj.versao) || 0;
    return obj;
  }

  function _objToRow(obj) {
    var payload = typeof obj.payload === 'object'
      ? JSON.stringify(obj.payload) : (obj.payload || '');
    return HEADERS.map(function(h) {
      return h === 'payload' ? payload : (obj[h] !== undefined ? obj[h] : '');
    });
  }

  function _lerTodos(orgId) {
    var sheet = _getSheet();
    var lr = sheet.getLastRow();
    if (lr < 2) return [];
    var values = sheet.getRange(2, 1, lr - 1, HEADERS.length).getValues();
    return values
      .filter(function(r) { return String(r[0]).trim() && r[1] === orgId; })
      .map(_rowToObj);
  }

  function inserir(obj, orgId) {
    var sheet = _getSheet();
    if (sheet.getLastRow() === 0) prepararIndice();
    var agora_ = agora();
    obj.id             = obj.id || gerarId('sol');
    obj.orgId          = orgId;
    obj.criadoEm       = agora_;
    obj.atualizadoEm   = agora_;
    obj.versao         = 1;
    obj.dataSolicitacao = agora_;
    sheet.appendRow(_objToRow(obj));
    return obj;
  }

  function atualizar(id, campos, orgId) {
    var sheet = _getSheet();
    var lr = sheet.getLastRow();
    if (lr < 2) throw new Error('Nenhuma solicitação encontrada.');
    var values = sheet.getRange(2, 1, lr - 1, HEADERS.length).getValues();
    var idx = values.findIndex(function(r) { return r[0] === id && r[1] === orgId; });
    if (idx < 0) throw new Error('Solicitação não encontrada: ' + id);
    var obj = _rowToObj(values[idx]);
    Object.assign(obj, campos);
    obj.atualizadoEm = agora();
    obj.versao = (obj.versao || 0) + 1;
    sheet.getRange(idx + 2, 1, 1, HEADERS.length).setValues([_objToRow(obj)]);
    return obj;
  }

  function buscarPorId(id, orgId) {
    return _lerTodos(orgId).find(function(s) { return s.id === id; }) || null;
  }

  function listarPorStatus(status, orgId) {
    var todos = _lerTodos(orgId);
    if (!status || status === 'TODOS') return todos;
    return todos.filter(function(s) { return s.status === status; });
  }

  function listarPorEspaco(espacoId, orgId) {
    return _lerTodos(orgId).filter(function(s) { return s.espacoId === espacoId; });
  }

  function listarPorSolicitante(email, orgId) {
    return _lerTodos(orgId).filter(function(s) { return s.solicitante === email; });
  }

  return {
    prepararIndice:    prepararIndice,
    inserir:           inserir,
    atualizar:         atualizar,
    buscarPorId:       buscarPorId,
    listarPorStatus:   listarPorStatus,
    listarPorEspaco:   listarPorEspaco,
    listarPorSolicitante: listarPorSolicitante
  };

})();
