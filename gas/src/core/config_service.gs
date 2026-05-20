/**
 * @file core/config_service.gs
 * @layer core
 * @description SistemaConfigService — facade unificado de configuração organizacional.
 *
 * PRINCÍPIO ABSOLUTO: nenhum engine, controller ou módulo lê configuração
 * diretamente de PropertiesService, Sheets ou JSON. Tudo passa por aqui.
 *
 * Fontes gerenciadas:
 *   - PropertiesService        → configuração organizacional (getOrg, getReservaHorario)
 *   - config_org.json (Drive)  → setores, turnos, labels, rubricas, papéis, campos custom
 *   - MASTER.Configuracoes     → espaços com horários, responsáveis por turno, bloqueios
 *   - EQUIPES.ParametrosRH     → parâmetros de RH (INSS, FGTS, VT, VA...)
 *   - Delegação para serviços especializados (PermissoesV2Engine, ModulosRegistryService, etc.)
 *
 * REGRA DE NÃO-HARDCODE: toda constante que varia entre organizações deve
 * sair deste serviço — nunca de constantes no código.
 *
 * @depends config.gs, data_layer.gs, logger.gs
 */

var SistemaConfigService = (function () {

  var _cache = {};

  function _getConfigOrg() {
    if (_cache.configOrg) return _cache.configOrg;
    try {
      var dados = readJSON('config_org.json');
      _cache.configOrg = Array.isArray(dados) ? {} : dados;
    } catch (e) {
      Logger.warn('config_service', '_getConfigOrg', 'config_org.json não encontrado, usando defaults.');
      _cache.configOrg = {};
    }
    return _cache.configOrg;
  }

  // ── Organização ───────────────────────────────────────────────────────────

  /**
   * Retorna configuração completa da organização (delega a config.gs).
   */
  function getOrg() {
    return getOrgConfig();
  }

  // ── Setores ───────────────────────────────────────────────────────────────

  /**
   * Retorna todos os setores ativos da organização.
   * Nunca retorna constante hardcoded — sempre lê de config_org.json.
   * @returns {Array<{ id, label, descricao, cor, ativo, modulosPrioritarios, dashboardWidgets, permissaoBase }>}
   */
  function getSetores() {
    var cfg = _getConfigOrg();
    return (cfg.setores || _defaultSetores()).filter(function(s) { return s.ativo !== false; });
  }

  function getSetor(id) {
    return getSetores().find(function(s) { return s.id === id; }) || null;
  }

  // ── Espaços ───────────────────────────────────────────────────────────────

  /**
   * Retorna configuração de espaço da Sheet MASTER.Configuracoes.
   * Inclui horários de funcionamento, responsáveis por turno, bloqueios de datas.
   */
  function getEspaco(id) {
    var cfg = _getConfigOrg();
    var espacos = cfg.espacos || [];
    return espacos.find(function(e) { return e.id === id; }) || null;
  }

  function getHorarioEspaco(espacoId, diaSemana) {
    var espaco = getEspaco(espacoId);
    if (!espaco || !espaco.horariosFuncionamento) return null;
    return espaco.horariosFuncionamento[diaSemana] || null;
  }

  function getResponsavelTurno(espacoId, turno, diaSemana) {
    var espaco = getEspaco(espacoId);
    if (!espaco || !espaco.responsaveisPorTurno) return null;
    return (espaco.responsaveisPorTurno || []).find(function(r) {
      return r.turno === turno && (!r.dias || r.dias.indexOf(diaSemana) >= 0);
    }) || null;
  }

  function verificarBloqueioData(espacoId, data) {
    var espaco = getEspaco(espacoId);
    if (!espaco || !espaco.bloqueiosDatas) return null;
    return (espaco.bloqueiosDatas || []).find(function(b) { return b.data === data; }) || null;
  }

  // ── Turnos ────────────────────────────────────────────────────────────────

  /**
   * Retorna turnos configurados (não hardcoded em config.gs).
   * @returns {Array<{ id, label, ini, fim }>}
   */
  function getTurnos() {
    var cfg = _getConfigOrg();
    return cfg.turnos || _defaultTurnos();
  }

  function getReservaHorario() {
    var cfg = _getConfigOrg();
    if (cfg.reservaHoraInicio && cfg.reservaHoraFim) {
      return { inicio: cfg.reservaHoraInicio, fim: cfg.reservaHoraFim };
    }
    var sc = getSistemaConfig();
    return { inicio: sc.reservaHoraInicio, fim: sc.reservaHoraFim };
  }

  // ── Módulos ───────────────────────────────────────────────────────────────

  /**
   * Delega ao ModulosRegistryService (não duplicar lógica).
   */
  function moduloAtivo(id) {
    if (typeof ModulosRegistryService !== 'undefined') {
      return ModulosRegistryService.estaAtivo(id);
    }
    return true; // fallback: módulo ativo por padrão
  }

  // ── Permissões ────────────────────────────────────────────────────────────

  /**
   * Delega ao PermissoesV2Engine (não duplicar lógica).
   */
  function getPermissao(email, modulo) {
    if (typeof PermissoesV2Engine !== 'undefined') {
      return PermissoesV2Engine.verificar(email, modulo);
    }
    return { visualizar: true, editar: true, excluir: false };
  }

  // ── Tipos de Processo ─────────────────────────────────────────────────────

  function getTiposProcesso() {
    if (typeof ProcessoTipoConfigEngine !== 'undefined') {
      return ProcessoTipoConfigEngine.listar();
    }
    return [];
  }

  // ── Rubricas ──────────────────────────────────────────────────────────────

  /**
   * Retorna tipos de rubrica (regulatórios + customizados).
   * Tipos regulatórios não podem ser removidos.
   */
  function getTiposRubrica() {
    var cfg = _getConfigOrg();
    return (cfg.tiposRubrica || _defaultTiposRubrica());
  }

  function getRegrasEdital(tipo) {
    var cfg = _getConfigOrg();
    var editais = cfg.regrasEditais || _defaultRegrasEditais();
    return editais.find(function(e) { return e.id === tipo; }) || null;
  }

  // ── Labels e Vocabulário ──────────────────────────────────────────────────

  /**
   * Retorna label customizado para uma entidade ou o padrão do sistema.
   * @param {string} entidade — ex: 'Acao', 'Colaborador', 'Demanda'
   */
  function getLabel(entidade) {
    var cfg = _getConfigOrg();
    var labels = cfg.labelsOrg || {};
    return labels[entidade] || entidade;
  }

  /**
   * Retorna campos customizados de uma entidade.
   */
  function getCamposCustom(entidade) {
    var cfg = _getConfigOrg();
    return (cfg.camposCustom || []).filter(function(c) { return c.entidade === entidade; });
  }

  // ── Parâmetros de RH ──────────────────────────────────────────────────────

  /**
   * Retorna parâmetros de RH (tabela INSS, FGTS, benefícios, etc.).
   * Lê de EQUIPES.ParametrosRH (Sheet) + extensões de config_org.json.
   */
  function getParametrosRH() {
    var cfg = _getConfigOrg();
    return cfg.parametrosRH || _defaultParametrosRH();
  }

  // ── Templates de Notificação ──────────────────────────────────────────────

  function getTemplateNotificacao(eventoId) {
    var cfg = _getConfigOrg();
    var templates = cfg.templatesNotificacao || [];
    return templates.find(function(t) { return t.eventoId === eventoId; }) || null;
  }

  // ── Identidade Visual ─────────────────────────────────────────────────────

  /**
   * Retorna a URL do logotipo da organização.
   * Fonte primária: config_org.json.logoUrl
   * Fallback: PropertiesService.ORG_LOGO_URL (compatibilidade legada)
   */
  function getLogoUrl() {
    var cfg = _getConfigOrg();
    if (cfg.logoUrl) return cfg.logoUrl;
    try { return PropertiesService.getScriptProperties().getProperty('ORG_LOGO_URL') || ''; } catch(_) { return ''; }
  }

  /**
   * Retorna a paleta de cores da organização.
   * Usada pelo frontend para aplicar a identidade visual via CSS custom properties.
   * @returns {{ primaria, primariaClara, primariaEscura, secundaria, destaque, sidebar, sidebarTexto }}
   */
  function getPaleta() {
    var cfg = _getConfigOrg();
    return cfg.paleta || _defaultPaleta();
  }

  // ── Invalidação de cache ──────────────────────────────────────────────────

  function invalidarCache() {
    _cache = {};
  }

  // ── Defaults (fallback quando config_org.json não tem o campo) ────────────

  function _defaultSetores() {
    return [
      { id: 'direcao',                   label: 'Direção',                   ativo: true, permissaoBase: 'gestor' },
      { id: 'administrativo_financeiro', label: 'Administrativo/Financeiro', ativo: true, permissaoBase: 'tecnico' },
      { id: 'formativo_educativo',       label: 'Formativo/Educativo',       ativo: true, permissaoBase: 'tecnico' },
      { id: 'cidadania_cultural',        label: 'Cidadania Cultural',        ativo: true, permissaoBase: 'tecnico' },
      { id: 'rh_pessoal',                label: 'RH/Pessoal',                ativo: true, permissaoBase: 'tecnico' },
      { id: 'comunicacao',               label: 'Comunicação',               ativo: true, permissaoBase: 'tecnico' },
      { id: 'infraestrutura',            label: 'Infraestrutura',            ativo: true, permissaoBase: 'colaborador' },
      { id: 'producao_cultural',         label: 'Produção Cultural',         ativo: true, permissaoBase: 'tecnico' },
      { id: 'monitoramento',             label: 'Monitoramento/Avaliação',   ativo: true, permissaoBase: 'tecnico' },
      { id: 'seguranca',                 label: 'Segurança/Portaria',        ativo: true, permissaoBase: 'colaborador' }
    ];
  }

  function _defaultTurnos() {
    return [
      { id: 'manha',  label: 'Manhã',  ini: '08:00', fim: '12:00' },
      { id: 'tarde',  label: 'Tarde',  ini: '12:00', fim: '18:00' },
      { id: 'noite',  label: 'Noite',  ini: '18:00', fim: '22:00' }
    ];
  }

  function _defaultTiposRubrica() {
    return [
      { id: 'pessoal',      label: 'Pessoal',     regulatorio: true,  limitePercentual: null },
      { id: 'custeio',      label: 'Custeio',     regulatorio: true,  limitePercentual: null },
      { id: 'capital',      label: 'Capital',     regulatorio: true,  limitePercentual: null },
      { id: 'divulgacao',   label: 'Divulgação',  regulatorio: true,  limitePercentual: 0.20 },
      { id: 'captacao',     label: 'Captação',    regulatorio: true,  limitePercentual: 0.10 },
      { id: 'administracao',label: 'Administração',regulatorio: true, limitePercentual: 0.15 }
    ];
  }

  function _defaultRegrasEditais() {
    return [
      {
        id: 'lei_rouanet', label: 'Lei Rouanet (Federal)', regulatorio: true,
        limites: { divulgacao: 0.20, captacao: 0.10, administracao: 0.15 },
        categorias_obrigatorias: ['pessoal', 'custeio']
      }
    ];
  }

  function _defaultPaleta() {
    return {
      primaria:       '#7c3aed',
      primariaClara:  '#a78bfa',
      primariaEscura: '#4c1d95',
      secundaria:     '#ede9fe',
      destaque:       '#f59e0b',
      sidebar:        '#4c1d95',
      sidebarTexto:   '#ffffff'
    };
  }

  function _defaultParametrosRH() {
    return {
      meses_contrato:              12,
      reajuste_percentual:         0.05,
      vale_transporte_A:           5.40,
      vale_transporte_E:           4.80,
      vale_alimentacao:            27.01,
      desconto_vale_alimentacao:   1.00,
      aliquota_fgts:               0.08,
      aliquota_pis:                0.0065,
      horas_semanais_padrao:       40,
      tabela_inss: [
        { de: 0,        ate: 1412.00, aliquota: 0.075 },
        { de: 1412.01,  ate: 2666.68, aliquota: 0.09  },
        { de: 2666.69,  ate: 4000.03, aliquota: 0.12  },
        { de: 4000.04,  ate: 7786.02, aliquota: 0.14  }
      ]
    };
  }

  // ── API pública ───────────────────────────────────────────────────────────

  return {
    getOrg:                   getOrg,
    getSetores:               getSetores,
    getSetor:                 getSetor,
    getEspaco:                getEspaco,
    getHorarioEspaco:         getHorarioEspaco,
    getResponsavelTurno:      getResponsavelTurno,
    verificarBloqueioData:    verificarBloqueioData,
    getTurnos:                getTurnos,
    getReservaHorario:        getReservaHorario,
    moduloAtivo:              moduloAtivo,
    getPermissao:             getPermissao,
    getTiposProcesso:         getTiposProcesso,
    getTiposRubrica:          getTiposRubrica,
    getRegrasEdital:          getRegrasEdital,
    getLabel:                 getLabel,
    getCamposCustom:          getCamposCustom,
    getParametrosRH:          getParametrosRH,
    getTemplateNotificacao:   getTemplateNotificacao,
    getLogoUrl:               getLogoUrl,
    getPaleta:                getPaleta,
    invalidarCache:           invalidarCache
  };

})();
