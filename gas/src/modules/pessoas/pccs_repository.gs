/**
 * @file modules/pessoas/pccs_repository.gs
 * @layer modules/pessoas
 * @description CRUD do Plano de Cargos, Carreiras e Salários (PCCS).
 *
 * Fonte canônica: pccs.json (Drive — JSON hierárquico).
 * Entidade hierárquica: PCCS → Cargos → Tabela Salarial (nivel/classe/referencia).
 *
 * Colaborador.pccs = { cargoId, nivel, classe, referencia } aponta para
 * uma posição na tabela do PCCS ativo, e salarioBase é preenchido automaticamente.
 *
 * @depends core/data_layer.gs, core/config.gs, core/services/auditoria_service.gs
 */

var PCCSRepository = (function() {

  var ARQUIVO = 'pccs.json';

  function _getOrgId() { return getOrgConfig().orgId; }

  function _lerTodos() {
    try {
      var raw = readJSON(ARQUIVO);
      return Array.isArray(raw) ? raw : [];
    } catch(_) { return []; }
  }

  // ── Leitura ─────────────────────────────────────────────────────────────

  /**
   * Retorna o PCCS ativo da organização.
   * @returns {object|null}
   */
  function listarAtivo() {
    var orgId = _getOrgId();
    var todos = _lerTodos().filter(function(p) { return p.orgId === orgId; });
    var ativo = todos.find(function(p) { return p.ativo === true; });
    return ativo || (todos.length > 0 ? todos[todos.length - 1] : null);
  }

  /**
   * Retorna todos os PCCS da organização.
   */
  function listarTodos() {
    var orgId = _getOrgId();
    return _lerTodos().filter(function(p) { return p.orgId === orgId; });
  }

  /**
   * Retorna lista plana de cargos para popular <select> em formulários.
   * Fonte: PCCS ativo.
   * @returns {Array<{ cargoId, nome, tipo, niveis: [{nivel,classe,referencia,salarioBase}] }>}
   */
  function listarCargosParaSelect() {
    var pccs = listarAtivo();
    if (!pccs || !Array.isArray(pccs.cargos)) return [];
    return pccs.cargos.map(function(c) {
      return { cargoId: c.id, nome: c.nome, tipo: c.tipo, tabela: c.tabela || [] };
    });
  }

  /**
   * Retorna salárioBase para uma posição específica.
   * @returns {number|null}
   */
  function obterSalarioPorPosicao(cargoId, nivel, classe, referencia) {
    var pccs = listarAtivo();
    if (!pccs || !Array.isArray(pccs.cargos)) return null;
    var cargo = pccs.cargos.find(function(c) { return c.id === cargoId; });
    if (!cargo || !Array.isArray(cargo.tabela)) return null;
    var pos = cargo.tabela.find(function(t) {
      return t.nivel === nivel && t.classe === classe && t.referencia === referencia;
    });
    return pos ? pos.salarioBase : null;
  }

  // ── Escrita ──────────────────────────────────────────────────────────────

  /**
   * Cria ou atualiza um PCCS completo (nome, vigência, cargos).
   */
  function salvar(dados, email) {
    var orgId = _getOrgId();
    var id = dados.id || gerarId('pcs');
    var agora_ = agora();

    var registro;
    modifyJSON(ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(p) { return p.id === id && p.orgId === orgId; });
      var existing = idx >= 0 ? lista[idx] : null;
      registro = {
        id:             id,
        orgId:          orgId,
        nome:           String(dados.nome || '').trim(),
        vigencia:       dados.vigencia || (existing && existing.vigencia) || { inicio: null, fim: null },
        parametros:     dados.parametros || (existing && existing.parametros) || null,
        ativo:          dados.ativo !== false,
        tabelaSalarial: dados.tabelaSalarial || (existing && existing.tabelaSalarial) || null,
        cargos:         Array.isArray(dados.cargos) ? dados.cargos : (existing ? existing.cargos || [] : []),
        criadoEm:       (existing && existing.criadoEm) || dados.criadoEm || agora_,
        atualizadoEm:   agora_,
        criadoPor:      (existing && existing.criadoPor) || dados.criadoPor || email,
        versao:         ((existing && existing.versao) || dados.versao || 0) + 1
      };
      if (idx >= 0) lista[idx] = registro; else lista.push(registro);
      return lista;
    });

    AuditoriaService.registrar('PCCS_SALVO', 'pessoas',
      { entidadeId: id, orgId: orgId, usuario: email, nome: registro.nome });
    Logger.info('pccs_repository', 'salvar', id + ': ' + registro.nome);
    return registro;
  }

  /**
   * Adiciona ou atualiza um cargo dentro do PCCS ativo.
   */
  function salvarCargo(pccsId, cargo, email) {
    var orgId = _getOrgId();
    var cargoId = cargo.id || gerarId('crg');
    var agora_ = agora();

    modifyJSON(ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var pccs = lista.find(function(p) { return p.id === pccsId && p.orgId === orgId; });
      if (!pccs) throw new Error('PCCS não encontrado: ' + pccsId);
      if (!Array.isArray(pccs.cargos)) pccs.cargos = [];
      var registro = {
        id:        cargoId,
        nome:      String(cargo.nome || '').trim(),
        area:      String(cargo.area  || '').trim(),
        tipo:      cargo.tipo  || 'operacional',
        grupo:     cargo.grupo || '',
        descricao: String(cargo.descricao || '').trim(),
        tabela:    Array.isArray(cargo.tabela) ? cargo.tabela : []
      };
      var idx = pccs.cargos.findIndex(function(c) { return c.id === cargoId; });
      if (idx >= 0) pccs.cargos[idx] = registro; else pccs.cargos.push(registro);
      pccs.atualizadoEm = agora_;
      return lista;
    });

    AuditoriaService.registrar('CARGO_SALVO', 'pessoas',
      { pccsId: pccsId, cargoId: cargoId, orgId: orgId, usuario: email, nome: cargo.nome });
    return cargoId;
  }

  /**
   * Remove (desativa) um cargo do PCCS.
   */
  function excluirCargo(pccsId, cargoId, email) {
    var orgId = _getOrgId();
    modifyJSON(ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var pccs = lista.find(function(p) { return p.id === pccsId && p.orgId === orgId; });
      if (!pccs) throw new Error('PCCS não encontrado: ' + pccsId);
      pccs.cargos = (pccs.cargos || []).filter(function(c) { return c.id !== cargoId; });
      pccs.atualizadoEm = agora();
      return lista;
    });
    AuditoriaService.registrar('CARGO_EXCLUIDO', 'pessoas',
      { pccsId: pccsId, cargoId: cargoId, orgId: orgId, usuario: email });
    return true;
  }

  /**
   * Aplica reajuste percentual a todos os steps de todos os cargos do plano.
   */
  function aplicarReajuste(pccsId, percentual, email) {
    var orgId = _getOrgId();
    var pct = parseFloat(percentual);
    if (isNaN(pct) || pct <= 0) throw new Error('Percentual inválido.');
    var fator = 1 + pct / 100;

    modifyJSON(ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var pccs = lista.find(function(p) { return p.id === pccsId && p.orgId === orgId; });
      if (!pccs) throw new Error('PCCS não encontrado: ' + pccsId);
      (pccs.cargos || []).forEach(function(cargo) {
        (cargo.tabela || []).forEach(function(pos) {
          if (pos.salarioBase) pos.salarioBase = Math.round(pos.salarioBase * fator * 100) / 100;
        });
      });
      if (pccs.tabelaSalarial && typeof pccs.tabelaSalarial === 'object') {
        Object.keys(pccs.tabelaSalarial).forEach(function(key) {
          var arr = pccs.tabelaSalarial[key];
          if (Array.isArray(arr)) {
            pccs.tabelaSalarial[key] = arr.map(function(v) {
              return typeof v === 'number' ? Math.round(v * fator * 100) / 100 : v;
            });
          }
        });
      }
      pccs.atualizadoEm = agora();
      return lista;
    });

    AuditoriaService.registrar('PCCS_REAJUSTE_APLICADO', 'pessoas',
      { pccsId: pccsId, percentual: pct, orgId: orgId, usuario: email });
    Logger.info('pccs_repository', 'aplicarReajuste', pccsId + ': ' + pct + '%');
    return true;
  }

  return {
    listarAtivo:            listarAtivo,
    listarTodos:            listarTodos,
    listarCargosParaSelect: listarCargosParaSelect,
    obterSalarioPorPosicao: obterSalarioPorPosicao,
    salvar:                 salvar,
    salvarCargo:            salvarCargo,
    excluirCargo:           excluirCargo,
    aplicarReajuste:        aplicarReajuste
  };

})();
