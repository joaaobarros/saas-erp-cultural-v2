/**
 * @file modules/estrategia/estrategia_repository.gs
 * @layer modules/estrategia
 * @description Repositório de Objetivos Estratégicos.
 *
 * Fonte de verdade: objetivos_estrategicos.json
 * Índice auxiliar: ACOES.Estrategia (read-only operacional)
 *
 * @depends core/data_layer.gs, core/services/data_gateway.gs, core/utils.gs
 */

var EstrategiaRepository = (function () {

  var _ARQUIVO = 'objetivos_estrategicos.json';
  var _SHEET_KEY = 'SHEET_ID_ACOES';
  var _ABA = 'Estrategia';
  var _HEADERS = [
    'ID', 'OrgId', 'Titulo', 'Horizonte', 'Status',
    'Responsavel', 'DataInicio', 'DataFim',
    'TotalAcoes', 'AcoesConcluidas', 'PercentualExecucao',
    'CriadoEm', 'AtualizadoEm', 'CriadoPor', 'Versao'
  ];

  function _orgIdPadrao(orgId) {
    return orgId || getOrgConfig().orgId;
  }

  function _garantirCabecalhoIndice() {
    try {
      var aba = _getSheet(_SHEET_KEY, _ABA);
      var atual = aba.getLastRow() > 0
        ? aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), _HEADERS.length)).getValues()[0]
        : [];
      var vazio = atual.every(function(v) { return !v; });
      if (vazio || String(atual[0] || '').trim() !== 'ID') {
        aba.getRange(1, 1, 1, _HEADERS.length).setValues([_HEADERS]);
        aba.setFrozenRows(1);
      }
    } catch (e) {
      Logger.warn('estrategia_repository', '_garantirCabecalhoIndice', e.message);
    }
  }

  function _serializarIndice(obj) {
    var acoes   = obj.acoesVinculadas || [];
    var concl   = acoes.filter(function(a) { return a.status === 'concluida'; }).length;
    var pct     = acoes.length > 0 ? Math.round((concl / acoes.length) * 100) : 0;
    return [
      obj.id                    || '',
      obj.orgId                 || '',
      obj.titulo                || '',
      obj.horizonte             || '',
      obj.status                || '',
      obj.responsavel           || '',
      obj.dataInicio            || '',
      obj.dataFim               || '',
      acoes.length,
      concl,
      pct,
      obj.criadoEm              || '',
      obj.atualizadoEm          || '',
      obj.criadoPor             || '',
      obj.versao                || 1
    ];
  }

  function _indexar(orgId, obj) {
    try {
      _garantirCabecalhoIndice();
      var linha = _serializarIndice(obj);
      var atualizado = DataGateway.atualizarLinhaPorColuna(_SHEET_KEY, _ABA, 0, obj.id, linha);
      if (!atualizado) DataGateway.salvarLinha(_SHEET_KEY, _ABA, linha);
    } catch (e) {
      Logger.warn('estrategia_repository', '_indexar', e.message);
    }
  }

  var _base = criarJsonRepository(_ARQUIVO, _indexar);

  // ─── LEITURA ──────────────────────────────────────────────────────────────

  function listar(orgId, filtros) {
    orgId = _orgIdPadrao(orgId);
    filtros = filtros || {};
    var lista = _base.listar(orgId, filtros);
    return _ordenar(lista);
  }

  function buscarPorId(orgId, id) {
    if (id === undefined) { id = orgId; orgId = _orgIdPadrao(); }
    return _base.buscarPorId(_orgIdPadrao(orgId), id);
  }

  function listarPorHorizonte(orgId, horizonte) {
    return listar(orgId, { horizonte: horizonte });
  }

  function listarAtivos(orgId) {
    var lista = listar(orgId);
    return lista.filter(function(o) {
      return ['ativo', 'em_revisao'].indexOf(o.status) !== -1;
    });
  }

  // ─── ESCRITA ──────────────────────────────────────────────────────────────

  function salvar(orgId, obj) {
    if (obj === undefined && orgId && typeof orgId === 'object') {
      obj   = orgId;
      orgId = obj.orgId || _orgIdPadrao();
    }
    orgId    = _orgIdPadrao(orgId);
    obj.orgId = orgId;
    return _base.salvar(orgId, obj);
  }

  function excluir(orgId, id) {
    if (id === undefined) { id = orgId; orgId = _orgIdPadrao(); }
    orgId = _orgIdPadrao(orgId);
    var removido = _base.excluir(orgId, id);
    if (removido) {
      try { DataGateway.removerLinhaPorColuna(_SHEET_KEY, _ABA, 0, id); } catch(e) {}
    }
    return removido;
  }

  // ─── MÉTRICAS ─────────────────────────────────────────────────────────────

  function obterMetricas(orgId) {
    var lista = listar(_orgIdPadrao(orgId));
    var m = { total: 0, ativo: 0, em_revisao: 0, concluido: 0, cancelado: 0,
               curto_prazo: 0, medio_prazo: 0, longo_prazo: 0,
               totalAcoesVinculadas: 0, acoesConcluidasVinculadas: 0 };
    lista.forEach(function(o) {
      m.total++;
      if (m[o.status] !== undefined) m[o.status]++;
      if (o.horizonte === 'curto_prazo')  m.curto_prazo++;
      if (o.horizonte === 'medio_prazo')  m.medio_prazo++;
      if (o.horizonte === 'longo_prazo')  m.longo_prazo++;
      var acoes = o.acoesVinculadas || [];
      m.totalAcoesVinculadas += acoes.length;
      m.acoesConcluidasVinculadas += acoes.filter(function(a) {
        return a.status === 'concluida';
      }).length;
    });
    m.percentualExecucaoGlobal = m.totalAcoesVinculadas > 0
      ? Math.round((m.acoesConcluidasVinculadas / m.totalAcoesVinculadas) * 100)
      : 0;
    return m;
  }

  // ─── SETUP ────────────────────────────────────────────────────────────────

  function prepararIndice() {
    _garantirCabecalhoIndice();
    try {
      var aba = _getSheet(_SHEET_KEY, _ABA);
      var protecoes = aba.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      var existe = protecoes.some(function(p) {
        return p.getDescription && p.getDescription() === 'Indice read-only: objetivos_estrategicos.json';
      });
      if (!existe) {
        var prot = aba.protect().setDescription('Indice read-only: objetivos_estrategicos.json');
        prot.setWarningOnly(true);
      }
    } catch(e) {
      Logger.warn('estrategia_repository', 'prepararIndice', e.message);
    }
    return { ok: true, mensagem: 'Índice ACOES.Estrategia preparado.' };
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  function _ordenar(lista) {
    var pesoHorizonte = { curto_prazo: 1, medio_prazo: 2, longo_prazo: 3 };
    var pesoStatus    = { ativo: 1, em_revisao: 2, concluido: 3, cancelado: 4 };
    return lista.sort(function(a, b) {
      var s = (pesoStatus[a.status] || 9) - (pesoStatus[b.status] || 9);
      if (s !== 0) return s;
      return (pesoHorizonte[a.horizonte] || 9) - (pesoHorizonte[b.horizonte] || 9);
    });
  }

  return {
    listar:               listar,
    buscarPorId:          buscarPorId,
    listarPorHorizonte:   listarPorHorizonte,
    listarAtivos:         listarAtivos,
    salvar:               salvar,
    excluir:              excluir,
    obterMetricas:        obterMetricas,
    prepararIndice:       prepararIndice,
    garantirCabecalhoIndice: _garantirCabecalhoIndice
  };

})();

function fase11_estrategia_prepararIndice() {
  return EstrategiaRepository.prepararIndice();
}
