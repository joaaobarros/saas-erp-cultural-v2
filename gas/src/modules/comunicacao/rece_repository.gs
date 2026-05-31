/**
 * @file modules/comunicacao/rece_repository.gs
 * @layer modules/comunicacao
 * @description Repositório da Agenda RECE (Rede de Equipamentos Culturais do Ceará).
 *
 * Fonte canônica: aba COMUNICACAO.AgendaRECE (25 colunas).
 * JSON auxiliar: rece_agenda.json (índice de busca rápida).
 *
 * O RECE é o principal canal de prestação de contas institucional para a Secult/CE.
 * 28 equipamentos culturais enviam dados mensalmente.
 *
 * @depends core/data_layer.gs, core/services/data_gateway.gs
 */

var ReceRepository = (function () {

  var JSON_KEY    = 'rece_agenda.json';
  var SHEET_ABA   = 'COMUNICACAO.AgendaRECE';
  var ID_PREFIXO  = 'RECE-';

  // Schema de 25 campos da Agenda RECE (Secult/CE)
  var CABECALHOS_RECE = [
    'id', 'orgId', 'titulo', 'dataInicio', 'dataTermino', 'horaInicio', 'horaTermino',
    'espacoId', 'espacoNome', 'categorias', 'parceiros', 'acessibilidades',
    'classificacaoEtaria', 'publicoAlvo', 'artistaGrupo', 'linkInscricao',
    'acesso', 'descricaoPublica', 'observacoesInternas', 'status',
    'responsavelRece', 'dataSolicitacao', 'imagemUrl', 'convidadosInternos',
    'eventoInstitucional', 'convidadosExternos', 'reservaGeralId', 'criadoEm', 'atualizadoEm'
  ];

  // ─── Leitura ──────────────────────────────────────────────────────────────

  function listar(orgId, filtros) {
    filtros = filtros || {};
    var dados  = _lerDados(orgId);
    var lista  = dados.lista || [];

    if (filtros.status)    lista = lista.filter(function(r) { return r.status === filtros.status; });
    if (filtros.espacoId)  lista = lista.filter(function(r) { return r.espacoId === filtros.espacoId; });
    if (filtros.responsavel) lista = lista.filter(function(r) { return r.responsavelRece === filtros.responsavel; });
    if (filtros.dataInicio) {
      lista = lista.filter(function(r) { return r.dataInicio >= filtros.dataInicio; });
    }
    if (filtros.dataTermino) {
      lista = lista.filter(function(r) { return r.dataTermino <= filtros.dataTermino; });
    }

    lista.sort(function(a, b) {
      return (a.dataInicio || '').localeCompare(b.dataInicio || '');
    });

    return lista;
  }

  function buscarPorId(orgId, id) {
    var dados = _lerDados(orgId);
    var lista = dados.lista || [];
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === id) return lista[i];
    }
    return null;
  }

  function buscarPorReservaId(orgId, reservaGeralId) {
    var dados = _lerDados(orgId);
    return (dados.lista || []).filter(function(r) {
      return r.reservaGeralId === reservaGeralId;
    });
  }

  function metricas(orgId) {
    var lista = ((_lerDados(orgId)).lista || []);
    var acc = { total: 0, rascunho: 0, submetida: 0, publicada: 0, encerrada: 0, cancelada: 0 };
    lista.forEach(function(r) {
      acc.total++;
      if (acc[r.status] !== undefined) acc[r.status]++;
    });
    return acc;
  }

  // ─── Escrita ──────────────────────────────────────────────────────────────

  function salvar(orgId, registro) {
    modifyJSON(JSON_KEY, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(r) { return r.id === registro.id; });
      if (idx >= 0) lista[idx] = registro;
      else lista.push(registro);
      return lista;
    });
  }

  function excluir(orgId, id) {
    modifyJSON(JSON_KEY, function(lista) {
      if (!Array.isArray(lista)) return [];
      return lista.filter(function(r) { return r.id !== id; });
    });
  }

  // ─── Geração de ID ────────────────────────────────────────────────────────

  function proximoId(orgId) {
    var dados = _lerDados(orgId);
    var lista = dados.lista || [];
    var nums  = lista.map(function(r) {
      var m = String(r.id || '').match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
    var prox = nums.length > 0 ? Math.max.apply(null, nums) + 1 : 1;
    return ID_PREFIXO + String(prox).padStart(4, '0');
  }

  // ─── Setup ────────────────────────────────────────────────────────────────

  function prepararIndice(orgId) {
    orgId = orgId || (typeof getOrgConfig === 'function' ? getOrgConfig().orgId : '');
    try {
      // Garante JSON
      var dados = readJSON(JSON_KEY);
      if (!Array.isArray(dados)) writeJSON(JSON_KEY, []);
      // Garante aba na Sheet COMUNICACAO
      var prop = PropertiesService.getScriptProperties().getProperty('SHEET_ID_COMUNICACAO') ||
                 PropertiesService.getScriptProperties().getProperty('SHEET_ID_MASTER');
      if (prop) {
        var ss    = SpreadsheetApp.openById(prop);
        var sheet = ss.getSheetByName(SHEET_ABA);
        if (!sheet) {
          sheet = ss.insertSheet(SHEET_ABA);
          sheet.appendRow(CABECALHOS_RECE);
          sheet.getRange(1, 1, 1, CABECALHOS_RECE.length).setFontWeight('bold');
        }
      }
      Logger.info('rece_repository', 'prepararIndice', 'Índice RECE preparado para ' + orgId);
    } catch (e) {
      Logger.warn('rece_repository', 'prepararIndice', e.message);
    }
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  function _lerDados(orgId) {
    return { lista: readJSON(JSON_KEY) };
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  return {
    listar:              listar,
    buscarPorId:         buscarPorId,
    buscarPorReservaId:  buscarPorReservaId,
    metricas:            metricas,
    salvar:              salvar,
    excluir:             excluir,
    proximoId:           proximoId,
    prepararIndice:      prepararIndice
  };

})();
