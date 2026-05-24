/**
 * @file modules/admin/modulos_registry_service.gs
 * @layer modules/admin
 * @description Engine de ativação/desativação de módulos por organização.
 *
 * Referenciado em config_service.gs e config_admin_service.gs mas nunca
 * implementado — esta é a implementação canônica.
 *
 * Fonte canônica: modulos_config.json (Drive).
 * Catálogo de módulos é fixo; apenas o flag ativo é configurável por org.
 *
 * @depends core/data_layer.gs, core/config.gs, core/services/auditoria_service.gs
 */

var ModulosRegistryService = (function() {

  // Catálogo completo — 20 módulos reais do sistema (expandido em 2026-05-24)
  // Removido: RELATORIOS (não existe view correspondente; exportações ficam em Financeiro)
  var CATALOGO = [
    // ── Núcleo institucional ──────────────────────────────────────────────
    { id: 'ADMIN',         label: 'Administração',          descricao: 'Configurações e cadastros base do sistema' },
    { id: 'DASHBOARD',     label: 'Dashboard Executivo',    descricao: 'KPIs, alertas, visão consolidada da instituição' },
    { id: 'TAREFAS',       label: 'Tarefas',                descricao: 'Gestão de tarefas e processos internos' },
    { id: 'ESTRATEGIA',    label: 'Estratégia',             descricao: 'OKRs, objetivos estratégicos, metas institucionais' },
    // ── Pessoas e RH ─────────────────────────────────────────────────────
    { id: 'PESSOAS',       label: 'Pessoas / RH',           descricao: 'Colaboradores, vínculos, PCCS, escalas, férias' },
    { id: 'PONTO',         label: 'Ponto Eletrônico',       descricao: 'Registros de ponto, espelho, AFD, custo CLT' },
    { id: 'ESCUTA',        label: 'Escuta Institucional',   descricao: 'Clima organizacional, pesquisas NR-1, UWES' },
    { id: 'VOLUNTARIOS',   label: 'Voluntários',            descricao: 'Cadastro e gestão de voluntários culturais' },
    // ── Programação cultural ──────────────────────────────────────────────
    { id: 'ACOES',         label: 'Ações',                  descricao: 'Programação cultural, habilitações, agentes' },
    { id: 'AGENTES',       label: 'Agentes Culturais',      descricao: 'Cadastro de agentes e produtores culturais' },
    { id: 'PUBLICO',       label: 'Público / Inscrições',   descricao: 'Inscrições, presenças, certificados, SNIIC' },
    { id: 'ACERVO',        label: 'Acervo',                 descricao: 'Acervo institucional, patrimônio cultural' },
    // ── Financeiro e contratos ────────────────────────────────────────────
    { id: 'FINANCEIRO',    label: 'Financeiro',             descricao: 'Contratos, rubricas, orçamentos, SALIC, CODIP' },
    { id: 'PARCERIAS',     label: 'Parcerias',              descricao: 'Convênios, parcerias institucionais, cessões' },
    // ── Infraestrutura ───────────────────────────────────────────────────
    { id: 'ESPACOS',       label: 'Infraestrutura',         descricao: 'Reservas, chaves, ativos, almoxarifado' },
    { id: 'REUNIOES',      label: 'Reuniões',               descricao: 'Atas, pautas, encaminhamentos, decisões' },
    // ── Comunicação ──────────────────────────────────────────────────────
    { id: 'COMUNICACAO',   label: 'Comunicação',            descricao: 'Demandas criativas, RECE, coberturas' },
    { id: 'BALCAO',        label: 'Balcão de Comunicação',  descricao: 'Atendimento de demandas de cobertura externa' },
    { id: 'TASKHUB',       label: 'TaskHub',                descricao: 'Hub centralizado de tarefas cross-módulo' },
    // ── Governança ───────────────────────────────────────────────────────
    { id: 'AUDITORIA',     label: 'Auditoria',              descricao: 'Log de auditoria, rastreabilidade, trilha de acesso' }
  ];

  function _lerConfig(orgId) {
    try {
      var lista = readJSON('modulos_config.json');
      if (!Array.isArray(lista)) return [];
      return lista.filter(function(m) { return m.orgId === orgId; });
    } catch(_) { return []; }
  }

  function _getOrgId() {
    return getOrgConfig().orgId;
  }

  // ── API pública ─────────────────────────────────────────────────────────

  /**
   * Retorna todos os módulos com seu status ativo/inativo para a org.
   * @returns {Array<{ id, label, descricao, ativo }>}
   */
  function listarTodos() {
    var orgId = _getOrgId();
    var config = _lerConfig(orgId);
    return CATALOGO.map(function(mod) {
      var entrada = config.find(function(c) { return c.moduloId === mod.id; });
      return {
        id:       mod.id,
        label:    mod.label,
        descricao: mod.descricao,
        ativo:    entrada ? entrada.ativo !== false : true
      };
    });
  }

  /**
   * Retorna apenas os IDs dos módulos ativos.
   * @returns {string[]}
   */
  function listarAtivos() {
    return listarTodos().filter(function(m) { return m.ativo; }).map(function(m) { return m.id; });
  }

  /**
   * Verifica se um módulo está ativo.
   * @param {string} id
   * @returns {boolean}
   */
  function estaAtivo(id) {
    var orgId = _getOrgId();
    var config = _lerConfig(orgId);
    var entrada = config.find(function(c) { return c.moduloId === String(id).toUpperCase(); });
    return entrada ? entrada.ativo !== false : true;
  }

  /**
   * Ativa ou desativa um módulo para uma organização.
   * @param {string} moduloId
   * @param {boolean} ativo
   * @param {string} orgId
   */
  function setAtivo(moduloId, ativo, orgId) {
    moduloId = String(moduloId).toUpperCase();
    var existe = CATALOGO.some(function(m) { return m.id === moduloId; });
    if (!existe) throw new Error('Módulo desconhecido: ' + moduloId);

    var email = getEmailSessao();
    var agora_ = agora();

    modifyJSON('modulos_config.json', function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(m) { return m.orgId === orgId && m.moduloId === moduloId; });
      var registro = {
        moduloId:      moduloId,
        orgId:         orgId,
        ativo:         ativo === true,
        atualizadoPor: email,
        atualizadoEm:  agora_
      };
      if (idx >= 0) lista[idx] = registro; else lista.push(registro);
      return lista;
    });

    Logger.info('modulos_registry', 'setAtivo', moduloId + ' → ' + (ativo ? 'ativo' : 'inativo'));
  }

  return {
    listarTodos:  listarTodos,
    listarAtivos: listarAtivos,
    estaAtivo:    estaAtivo,
    setAtivo:     setAtivo
  };

})();
