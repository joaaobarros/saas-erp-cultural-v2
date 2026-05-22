/**
 * @file modules/pessoas/contratado_repository.gs
 * @layer modules/pessoas
 * @description Repositório de Contratados Externos (PF e PJ).
 *
 * Entidade: ContratadoExterno — agentes culturais, fornecedores,
 * consultores e prestadores de serviço que podem ser contratados
 * mas NÃO são colaboradores (empregados) da organização.
 *
 * Fonte de verdade: contratados_registry.json (Drive)
 * Índice auxiliar: MASTER.Contratados (Sheet — read-only operacional)
 * Sub-coleção: habilitacoes.json — processo de vetting/qualificação
 *
 * REGRA: nenhum outro módulo lê/escreve esses arquivos diretamente.
 * Todo acesso passa por ContratadoRepository ou ContratadoEngine.
 *
 * @depends core/data_layer.gs (lerJSON, salvarJSON, modifyJSON)
 *          core/services/data_gateway.gs (DataGateway)
 *          core/logger.gs (Logger)
 *          core/config.gs (getOrgConfig)
 */

var ContratadoRepository = (function () {

  var _ARQUIVO_CONTRATADOS  = 'contratados_registry.json';
  var _ARQUIVO_HABILITACOES = 'habilitacoes.json';

  var _SHEET_KEY = 'SHEET_ID_MASTER';
  var _ABA       = 'Contratados';

  var _HEADERS = [
    'ID', 'OrgId', 'Nome', 'TipoPessoa', 'DocumentoMascarado',
    'Email', 'Telefone', 'Status', 'TipoAtuacao', 'CriadoEm', 'AtualizadoEm'
  ];

  function _orgIdPadrao(orgId) { return orgId || getOrgConfig().orgId; }
  function _agora() { return new Date().toISOString(); }

  function _mascarar(doc) {
    if (!doc) return '';
    var s = String(doc).replace(/\D/g, '');
    if (s.length === 11) return s.slice(0, 3) + '.***.***-' + s.slice(9); // CPF
    if (s.length === 14) return s.slice(0, 2) + '.***.***/****-' + s.slice(12); // CNPJ
    return '***';
  }

  // ── Índice Sheet ──────────────────────────────────────────────────

  function _garantirCabecalhoIndice() {
    try {
      var aba = DataGateway.obterAba(_SHEET_KEY, _ABA);
      if (!aba) return;
      var atual = aba.getLastRow() > 0
        ? aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), _HEADERS.length)).getValues()[0]
        : [];
      var vazio = atual.every(function (v) { return !v; });
      if (vazio || String(atual[0] || '').trim() !== 'ID') {
        aba.getRange(1, 1, 1, _HEADERS.length).setValues([_HEADERS]);
        aba.setFrozenRows(1);
      }
    } catch (e) {
      Logger.warn('contratado_repository', '_garantirCabecalhoIndice', e.message);
    }
  }

  function _indexar(c) {
    try {
      _garantirCabecalhoIndice();
      var linha = [
        c.id            || '',
        c.orgId         || '',
        c.nome          || '',
        c.tipoPessoa    || '',
        _mascarar(c.cpf || c.cnpj),
        c.email         || '',
        c.telefone      || '',
        c.status        || '',
        (c.tiposAtuacao || []).join(','),
        c.criadoEm      || '',
        c.atualizadoEm  || ''
      ];
      var atualizado = DataGateway.atualizarLinhaPorColuna(_SHEET_KEY, _ABA, 0, c.id, linha);
      if (!atualizado) DataGateway.salvarLinha(_SHEET_KEY, _ABA, linha);
    } catch (e) {
      Logger.warn('contratado_repository', '_indexar', e.message);
    }
  }

  // ── Contratados (CRUD) ────────────────────────────────────────────

  function listar(orgId, filtros) {
    orgId   = _orgIdPadrao(orgId);
    filtros = filtros || {};
    var todos = lerJSON(_ARQUIVO_CONTRATADOS) || [];
    return todos.filter(function (c) {
      if (c.orgId  && c.orgId  !== orgId)           return false;
      if (filtros.status      && c.status      !== filtros.status)      return false;
      if (filtros.tipoPessoa  && c.tipoPessoa  !== filtros.tipoPessoa)  return false;
      if (filtros.tipoAtuacao && (c.tiposAtuacao || []).indexOf(filtros.tipoAtuacao) === -1) return false;
      if (filtros.busca) {
        var b = String(filtros.busca).toLowerCase();
        var match = String(c.nome || '').toLowerCase().indexOf(b) !== -1 ||
                    String(c.email || '').toLowerCase().indexOf(b) !== -1 ||
                    String(c.cpf || c.cnpj || '').indexOf(b) !== -1;
        if (!match) return false;
      }
      return true;
    }).sort(function (a, b) { return (a.nome || '').localeCompare(b.nome || ''); });
  }

  function buscarPorId(orgId, id) {
    orgId = _orgIdPadrao(orgId);
    var todos = lerJSON(_ARQUIVO_CONTRATADOS) || [];
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].id === id && (todos[i].orgId === orgId || !todos[i].orgId)) return todos[i];
    }
    return null;
  }

  function buscarPorDocumento(orgId, documento) {
    if (!documento) return null;
    orgId = _orgIdPadrao(orgId);
    var doc = String(documento).replace(/\D/g, '');
    var todos = lerJSON(_ARQUIVO_CONTRATADOS) || [];
    for (var i = 0; i < todos.length; i++) {
      var c = todos[i];
      if (c.orgId && c.orgId !== orgId) continue;
      var cpfLimpo  = String(c.cpf  || '').replace(/\D/g, '');
      var cnpjLimpo = String(c.cnpj || '').replace(/\D/g, '');
      if (cpfLimpo === doc || cnpjLimpo === doc) return c;
    }
    return null;
  }

  function salvar(orgId, dados) {
    orgId = _orgIdPadrao(orgId);
    dados = dados || {};
    dados.orgId = orgId;
    var agr    = _agora();
    var isNovo = !dados.id;
    if (isNovo) {
      dados.id       = 'ctr_' + Date.now();
      dados.criadoEm = agr;
      if (!dados.status) dados.status = 'cadastrado';
    }
    dados.atualizadoEm = agr;
    modifyJSON(_ARQUIVO_CONTRATADOS, function (lista) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === dados.id) { idx = i; break; }
      }
      if (idx >= 0) lista[idx] = dados; else lista.push(dados);
      return lista;
    });
    _indexar(dados);
    return { id: dados.id, isNovo: isNovo };
  }

  // ── Habilitações ──────────────────────────────────────────────────

  function listarHabilitacoes(filtros) {
    var todos = lerJSON(_ARQUIVO_HABILITACOES) || [];
    filtros = filtros || {};
    return todos.filter(function (h) {
      if (filtros.orgId            && h.orgId            !== filtros.orgId)            return false;
      if (filtros.idContratado     && h.idContratado     !== filtros.idContratado)     return false;
      if (filtros.status           && h.status           !== filtros.status)           return false;
      return true;
    }).sort(function (a, b) { return String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')); });
  }

  function buscarHabilitacaoPorId(id) {
    var todos = lerJSON(_ARQUIVO_HABILITACOES) || [];
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].id === id) return todos[i];
    }
    return null;
  }

  function salvarHabilitacao(dados) {
    dados = dados || {};
    var isNovo = !dados.id;
    var agr    = _agora();
    if (isNovo) {
      dados.id       = 'hab_' + Date.now();
      dados.criadoEm = agr;
      if (!dados.status) dados.status = 'submetido';
    }
    dados.atualizadoEm = agr;
    modifyJSON(_ARQUIVO_HABILITACOES, function (lista) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === dados.id) { idx = i; break; }
      }
      if (idx >= 0) lista[idx] = dados; else lista.push(dados);
      return lista;
    });
    return { id: dados.id, isNovo: isNovo };
  }

  // ── Manutenção ────────────────────────────────────────────────────

  function garantirIndice() {
    _garantirCabecalhoIndice();
    return { ok: true };
  }

  // ── API pública ───────────────────────────────────────────────────

  return {
    // Contratados
    listar:              listar,
    buscarPorId:         buscarPorId,
    buscarPorDocumento:  buscarPorDocumento,
    salvar:              salvar,

    // Habilitações
    listarHabilitacoes:      listarHabilitacoes,
    buscarHabilitacaoPorId:  buscarHabilitacaoPorId,
    salvarHabilitacao:       salvarHabilitacao,

    // Manutenção
    garantirIndice: garantirIndice
  };

})();
