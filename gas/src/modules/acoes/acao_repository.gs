/**
 * @file modules/acoes/acao_repository.gs
 * @layer modules/acoes
 * @description Repositório canônico de Ações Institucionais.
 *
 * Ação é a ENTIDADE CENTRAL do sistema — tudo orbita ela:
 * reservas, tarefas, contratos, contratações, equipe, acervo.
 *
 * Fonte de verdade: acoes.json
 * Índice auxiliar: ACOES.Acoes (read-only operacional)
 *
 * @depends core/data_layer.gs, core/services/data_gateway.gs, core/utils.gs
 */

var AcaoRepository = (function () {

  var _ARQUIVO = 'acoes.json';
  var _SHEET_KEY = 'SHEET_ID_ACOES';
  var _ABA = 'Acoes';
  var _HEADERS = [
    'ID', 'OrgId', 'Nome', 'Tipo', 'Status',
    'Responsavel', 'Setor', 'DataInicio', 'DataFim',
    'PublicoPrevisto', 'VisibilidadePublica',
    'CriadoEm', 'AtualizadoEm', 'CriadoPor', 'Versao'
  ];

  var _NIVEIS_AMPLOS = ['admin', 'superadmin'];
  var _NIVEIS_GESTOR = ['admin', 'superadmin', 'gestor', 'financeiro'];

  function _orgIdPadrao(orgId) {
    return orgId || getOrgConfig().orgId;
  }

  function _garantirCabecalhoIndice() {
    try {
      var aba = _getSheet(_SHEET_KEY, _ABA);
      var atual = aba.getLastRow() > 0
        ? aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), _HEADERS.length)).getValues()[0]
        : [];
      var vazio = atual.every(function (v) { return !v; });
      if (vazio || String(atual[0] || '').trim() !== 'ID') {
        aba.getRange(1, 1, 1, _HEADERS.length).setValues([_HEADERS]);
        aba.setFrozenRows(1);
      }
    } catch (e) {
      Logger.warn('acao_repository', '_garantirCabecalhoIndice', e.message);
    }
  }

  function _serializarIndice(acao) {
    return [
      acao.id            || '',
      acao.orgId         || '',
      acao.nome          || '',
      acao.tipo          || '',
      acao.status        || '',
      acao.responsavel   || '',
      acao.setor         || '',
      acao.dataInicio    || '',
      acao.dataFim       || '',
      acao.publicoPrevisto || 0,
      acao.visibilidadePublica ? 'SIM' : 'NÃO',
      acao.criadoEm      || '',
      acao.atualizadoEm  || '',
      acao.criadoPor     || '',
      acao.versao        || 1
    ];
  }

  function _indexar(orgId, acao) {
    try {
      _garantirCabecalhoIndice();
      var linha = _serializarIndice(acao);
      var atualizado = DataGateway.atualizarLinhaPorColuna(_SHEET_KEY, _ABA, 0, acao.id, linha);
      if (!atualizado) DataGateway.salvarLinha(_SHEET_KEY, _ABA, linha);
    } catch (e) {
      Logger.warn('acao_repository', '_indexar', 'Falha ao atualizar índice: ' + e.message);
    }
  }

  var _base = criarJsonRepository(_ARQUIVO, _indexar);

  // ─── LEITURA ──────────────────────────────────────────────────────────────

  function listar(orgId, filtros) {
    orgId = _orgIdPadrao(orgId);
    filtros = filtros || {};
    var lista = _base.listar(orgId, filtros);
    // Filtros extras não suportados pelo base
    if (filtros.visibilidadePublica !== undefined) {
      lista = lista.filter(function(a) {
        return !!a.visibilidadePublica === !!filtros.visibilidadePublica;
      });
    }
    return _ordenar(lista);
  }

  function buscarPorId(orgId, id) {
    if (id === undefined) { id = orgId; orgId = _orgIdPadrao(); }
    return _base.buscarPorId(_orgIdPadrao(orgId), id);
  }

  function listarPorStatus(orgId, status) {
    return listar(orgId, { status: status });
  }

  function listarAtivas(orgId) {
    var lista = listar(orgId);
    return lista.filter(function(a) {
      return ['planejada', 'em_producao', 'em_execucao'].indexOf(a.status) !== -1;
    });
  }

  function listarPublicas(orgId) {
    return listar(orgId, { visibilidadePublica: true });
  }

  // ─── ESCRITA ──────────────────────────────────────────────────────────────

  function salvar(orgId, acao) {
    if (acao === undefined && orgId && typeof orgId === 'object') {
      acao  = orgId;
      orgId = acao.orgId || _orgIdPadrao();
    }
    orgId     = _orgIdPadrao(orgId);
    acao.orgId = orgId;
    return _base.salvar(orgId, acao);
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
    var metricas = {
      total: lista.length,
      planejada: 0, em_producao: 0, em_execucao: 0,
      concluida: 0, arquivada: 0, cancelada: 0
    };
    lista.forEach(function(a) {
      var s = a.status || 'planejada';
      if (metricas[s] !== undefined) metricas[s]++;
    });
    metricas.ativas = metricas.planejada + metricas.em_producao + metricas.em_execucao;
    return metricas;
  }

  // ─── SETUP ────────────────────────────────────────────────────────────────

  function prepararIndice() {
    _garantirCabecalhoIndice();
    try {
      var aba = _getSheet(_SHEET_KEY, _ABA);
      var protecoes = aba.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      var existe = protecoes.some(function(p) {
        return p.getDescription && p.getDescription() === 'Indice read-only: acoes.json e a fonte canonica';
      });
      if (!existe) {
        var p = aba.protect().setDescription('Indice read-only: acoes.json e a fonte canonica');
        p.setWarningOnly(true);
      }
    } catch(e) {
      Logger.warn('acao_repository', 'prepararIndice', e.message);
    }
    return { ok: true, mensagem: 'Índice ACOES.Acoes preparado.' };
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  function _ordenar(lista) {
    var pesoStatus = {
      em_execucao: 1, em_producao: 2, planejada: 3,
      concluida: 4, arquivada: 5, cancelada: 6
    };
    return lista.sort(function(a, b) {
      var s = (pesoStatus[a.status] || 99) - (pesoStatus[b.status] || 99);
      if (s !== 0) return s;
      var dA = String(a.dataInicio || '9999');
      var dB = String(b.dataInicio || '9999');
      return dA.localeCompare(dB);
    });
  }

  return {
    listar:           listar,
    buscarPorId:      buscarPorId,
    salvar:           salvar,
    excluir:          excluir,
    listarPorStatus:  listarPorStatus,
    listarAtivas:     listarAtivas,
    listarPublicas:   listarPublicas,
    obterMetricas:    obterMetricas,
    prepararIndice:   prepararIndice,
    garantirCabecalhoIndice: _garantirCabecalhoIndice,
    indexar:          _indexar
  };

})();

/**
 * Wrapper global executável no GAS Editor.
 * @returns {{ ok: boolean }}
 */
function fase5_acoes_prepararIndice() {
  return AcaoRepository.prepararIndice();
}
