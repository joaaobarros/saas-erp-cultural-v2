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
   * Prioridade: setores_config.json (persistência primária) → config_org.json.setores → defaults.
   * @returns {Array<{ id, label, descricao, cor, ativo, modulosPrioritarios, dashboardWidgets, permissaoBase }>}
   */
  function getSetores() {
    // Fonte primária: setores_config.json (escrita por ConfigAdminService.salvarSetor)
    try {
      var orgId = getOrgConfig().orgId;
      var lista = readJSON('setores_config.json');
      if (Array.isArray(lista) && lista.length > 0) {
        return lista.filter(function(s) { return s.ativo !== false && s.orgId === orgId; })
                    .map(function(s) { return s.label ? s : Object.assign({}, s, { label: s.nome }); });
      }
    } catch(e) {
      Logger.warn('config_service', 'getSetores', 'setores_config.json indisponível: ' + e.message);
    }
    // Fallback: config_org.json legado ou defaults
    var cfg = _getConfigOrg();
    return (cfg.setores || _defaultSetores()).filter(function(s) { return s.ativo !== false; });
  }

  function getSetor(id) {
    return getSetores().find(function(s) { return s.id === id; }) || null;
  }

  // ── Espaços ───────────────────────────────────────────────────────────────

  /**
   * Retorna todos os espaços ativos configurados via ConfigAdminService.
   * Fonte: espacos_config.json (Drive). Nunca lança exceção.
   * @returns {Array<object>}
   */
  function getEspacos() {
    try {
      var dados = readJSON('espacos_config.json');
      return Array.isArray(dados)
        ? dados.filter(function(e) { return e.ativo !== false; })
        : [];
    } catch(e) {
      Logger.warn('config_service', 'getEspacos', e.message);
      return [];
    }
  }

  /**
   * Retorna configuração de espaço pelo ID.
   * Inclui horários de funcionamento, responsáveis por turno, bloqueios de datas.
   */
  function getEspaco(id) {
    return getEspacos().find(function(e) { return e.id === id; }) || null;
  }

  function getHorarioEspaco(espacoId, diaSemana) {
    var espaco = getEspaco(espacoId);
    if (!espaco || !espaco.horariosFuncionamento) return null;
    return espaco.horariosFuncionamento[diaSemana] || null;
  }

  /**
   * Resolve os responsáveis de um espaço para um dia e turno específicos.
   * Retorna a entrada de prioridade que cobre esse slot, ou null se não houver.
   *
   * @param {string} espacoId
   * @param {number} diaNum    — 0=dom … 6=sáb
   * @param {string} turnoId   — 'manha' | 'tarde' | 'noite' | 'manha_tarde' | 'tarde_noite' | 'integral'
   * @returns {{ emails: string[], setorId: string } | null}
   */
  function resolverResponsaveis(espacoId, diaNum, turnoId) {
    var espaco = getEspaco(espacoId);
    if (!espaco) return null;

    // Suporte ao campo novo (responsaveis) e ao legado (responsaveisPorTurno)
    var lista = espaco.responsaveis || espaco.responsaveisPorTurno || [];
    if (!lista.length) return null;

    // Turno cobre quais ids? Ex: 'manha_tarde' cobre 'manha' e 'tarde'
    var turnosCobertosPeloSlot = _expandirTurnos(turnoId);

    var entrada = null;
    for (var i = 0; i < lista.length; i++) {
      var r = lista[i];

      // Compatibilidade legado: entry pode ter { email } (string) ou { emails } (array)
      var emails = Array.isArray(r.emails)
        ? r.emails
        : (r.email ? [r.email] : []);
      if (!emails.length) continue;

      // Verificar cobertura de dia
      var diasOk = !r.dias || !r.dias.length || r.dias.indexOf(diaNum) >= 0;
      if (!diasOk) continue;

      // Verificar cobertura de turno: a entrada deve cobrir pelo menos um turno do slot
      var turnosEntrada = Array.isArray(r.turnos) && r.turnos.length
        ? r.turnos
        : (r.turno ? [r.turno] : []);

      var turnoOk = !turnosEntrada.length; // sem restrição de turno → cobre tudo
      if (!turnoOk) {
        // Expandir os turnos da entrada e verificar interseção
        for (var ti = 0; ti < turnosEntrada.length; ti++) {
          var turnosExpandidos = _expandirTurnos(turnosEntrada[ti]);
          for (var tj = 0; tj < turnosCobertosPeloSlot.length; tj++) {
            if (turnosExpandidos.indexOf(turnosCobertosPeloSlot[tj]) >= 0) {
              turnoOk = true;
              break;
            }
          }
          if (turnoOk) break;
        }
      }
      if (!turnoOk) continue;

      entrada = { emails: emails, setorId: r.setorId || null };
      break;
    }
    return entrada;
  }

  /**
   * Expande um turnoId composto em turnos base.
   * 'manha_tarde' → ['manha','tarde'] | 'integral' → ['manha','tarde','noite']
   */
  function _expandirTurnos(turnoId) {
    var mapa = {
      'manha':       ['manha'],
      'tarde':       ['tarde'],
      'noite':       ['noite'],
      'manha_tarde': ['manha','tarde'],
      'tarde_noite': ['tarde','noite'],
      'integral':    ['manha','tarde','noite']
    };
    return mapa[turnoId] || [turnoId];
  }

  /** @deprecated — usar resolverResponsaveis() */
  function getResponsavelTurno(espacoId, turno, diaSemana) {
    var resultado = resolverResponsaveis(espacoId, diaSemana, turno);
    if (!resultado) return null;
    return { email: resultado.emails[0] || null, emails: resultado.emails, setorId: resultado.setorId };
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
    // Fonte primária: turnos_config.json (escrita por ConfigAdminService.salvarTurno)
    try {
      var orgId = getOrgConfig().orgId;
      var lista = readJSON('turnos_config.json');
      if (Array.isArray(lista) && lista.length > 0) {
        return lista.filter(function(t) { return t.ativo !== false && t.orgId === orgId; });
      }
    } catch(e) {
      Logger.warn('config_service', 'getTurnos', 'turnos_config.json indisponível: ' + e.message);
    }
    // Fallback: config_org.json legado ou defaults
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
   * Retorna lista de módulos ativos.
   * Prioridade: ModulosRegistryService (dinâmico) → config_org.json → todos ativos.
   */
  function getModulosAtivos() {
    if (typeof ModulosRegistryService !== 'undefined') {
      try { return ModulosRegistryService.listarAtivos(); } catch(_) {}
    }
    var cfg = _getConfigOrg();
    if (Array.isArray(cfg.modulosAtivos) && cfg.modulosAtivos.length) {
      return cfg.modulosAtivos;
    }
    // fallback: todos os 20 módulos do catálogo atual
    return ['ADMIN','DASHBOARD','TAREFAS','ESTRATEGIA','PESSOAS','PONTO','ESCUTA','VOLUNTARIOS',
            'ACOES','AGENTES','PUBLICO','ACERVO','FINANCEIRO','PARCERIAS',
            'ESPACOS','REUNIOES','COMUNICACAO','BALCAO','TASKHUB','AUDITORIA'];
  }

  /**
   * Delega ao ModulosRegistryService (não duplicar lógica).
   */
  function moduloAtivo(id) {
    if (typeof ModulosRegistryService !== 'undefined') {
      return ModulosRegistryService.estaAtivo(id);
    }
    var ativos = getModulosAtivos();
    return ativos.indexOf(String(id).toUpperCase()) !== -1;
  }

  // ── Feature Flags ─────────────────────────────────────────────────────────

  /**
   * Catálogo de feature flags disponíveis com descrição e default.
   * Cada flag pode ser ativada/desativada por organização em config_org.json.features.
   */
  var FEATURE_FLAGS_CATALOGO = [
    { id: 'ia_assistente',       label: 'Assistente IA',           descricao: 'Respostas e sugestões da IA embutida (Bêjotinha)',       default: true,  grupo: 'core' },
    { id: 'portal_publico',      label: 'Portal Público',          descricao: 'Inscrições, cesão de pauta e agenda pública',             default: true,  grupo: 'portal' },
    { id: 'rece',                label: 'RECE',                    descricao: 'Agenda da Rede de Espaços Culturais',                      default: true,  grupo: 'comunicacao' },
    { id: 'agentes_culturais',   label: 'Agentes Culturais',       descricao: 'Cadastro, credenciamento e rider técnico de agentes',     default: true,  grupo: 'memoria' },
    { id: 'acervo',              label: 'Acervo Digital',          descricao: 'Gestão de fotos, vídeos e registros de ações',            default: true,  grupo: 'memoria' },
    { id: 'voluntarios',         label: 'Voluntários',             descricao: 'Cadastro, alocação e certificação de voluntários',        default: true,  grupo: 'memoria' },
    { id: 'parcerias',           label: 'Parcerias',               descricao: 'Gestão de parcerias e vínculos com ações',                default: true,  grupo: 'memoria' },
    { id: 'exportacao_codip',    label: 'Exportação CODIP',        descricao: 'Geração do arquivo de prestação de contas CODIP (28 campos)', default: true, grupo: 'exportacao' },
    { id: 'exportacao_salic',    label: 'Exportação SALIC',        descricao: 'Geração do XML SALIC para Lei Rouanet',                   default: true,  grupo: 'exportacao' },
    { id: 'exportacao_sniic',    label: 'Exportação SNIIC',        descricao: 'Indicadores anuais para o Sistema Nacional de Informações Culturais', default: true, grupo: 'exportacao' },
    { id: 'wizard_setup',        label: 'Wizard de Setup',         descricao: 'Fluxo guiado de configuração inicial para novas organizações', default: true, grupo: 'admin' },
    { id: 'painel_orgs',         label: 'Painel de Orgs (SaaS)',   descricao: 'Visualização de todas as organizações provisionadas (superadmin)', default: false, grupo: 'admin' },
    { id: 'alertas_email',       label: 'Alertas por Email',       descricao: 'Envio de notificações e alertas via email institucional', default: true,  grupo: 'notificacoes' },
    { id: 'alertas_inapp',       label: 'Alertas In-App',          descricao: 'Badge e painel de alertas dentro da plataforma',          default: true,  grupo: 'notificacoes' },
    { id: 'aprovacao_por_token', label: 'Aprovação por Token',     descricao: 'Links de aprovação/recusa por email com TTL 72h',         default: true,  grupo: 'notificacoes' },
    { id: 'mapa_interativo',     label: 'Mapa Interativo',         descricao: 'Mapa visual do campus com reservas em tempo real',        default: true,  grupo: 'espacos' },
    { id: 'diagrama_gantt',      label: 'Diagrama Gantt',          descricao: 'Visualização de reservas em linha do tempo Gantt',        default: true,  grupo: 'espacos' },
    { id: 'modo_sandbox',        label: 'Modo Sandbox',            descricao: 'Dados de demonstração — não afeta dados reais',           default: false, grupo: 'admin' }
  ];

  /**
   * Retorna catálogo completo de feature flags com o valor atual de cada uma.
   * @returns {Array<{id, label, descricao, default, grupo, ativo}>}
   */
  function getFeatureFlagsCatalogo() {
    var cfg = _getConfigOrg();
    var features = (cfg && cfg.features) ? cfg.features : {};
    return FEATURE_FLAGS_CATALOGO.map(function(flag) {
      var ativo = features.hasOwnProperty(flag.id) ? features[flag.id] !== false : flag['default'];
      return {
        id:       flag.id,
        label:    flag.label,
        descricao: flag.descricao,
        grupo:    flag.grupo,
        ativo:    ativo
      };
    });
  }

  /**
   * Verifica se uma feature flag está ativa.
   * Default: true (não bloqueia nada em ambiente sem config).
   * @param {string} flagId — ex: 'ia_assistente', 'portal_publico'
   * @returns {boolean}
   */
  function getFeatureFlag(flagId) {
    try {
      var cfg      = _getConfigOrg();
      var features = (cfg && cfg.features) ? cfg.features : {};
      if (features.hasOwnProperty(flagId)) return features[flagId] !== false;
      // fallback: buscar default no catálogo
      var entrada = FEATURE_FLAGS_CATALOGO.find(function(f) { return f.id === flagId; });
      return entrada ? entrada['default'] : true;
    } catch(e) {
      return true; // fail-open
    }
  }

  /**
   * Ativa ou desativa uma feature flag em config_org.json.
   * @param {string} flagId
   * @param {boolean} ativo
   * @param {string} emailSessao — para auditoria
   */
  function setFeatureFlag(flagId, ativo, emailSessao) {
    var entrada = FEATURE_FLAGS_CATALOGO.find(function(f) { return f.id === flagId; });
    if (!entrada) throw new Error('Feature flag desconhecida: ' + flagId);

    // config_org.json é um objeto único (não array) — lê, altera e regrava
    try {
      var arquivo  = getFile('config_org.json');
      var conteudo = arquivo.getBlob().getDataAsString();
      var obj      = JSON.parse(conteudo);
      if (!obj.features) obj.features = {};
      obj.features[flagId] = ativo === true;
      arquivo.setContent(JSON.stringify(obj));
      invalidarCache(); // limpa _cache para próxima leitura pegar o novo valor
    } catch(e) {
      Logger.error('config_service', 'setFeatureFlag', e.message);
      throw e;
    }

    Logger.info('config_service', 'setFeatureFlag',
      flagId + ' → ' + ativo + ' | por: ' + (emailSessao || '?'));
    return { ok: true, flagId: flagId, ativo: ativo };
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

  // ── Tipos de Ocorrência e Afastamento ────────────────────────────────────

  function getTiposOcorrencia() {
    var cfg = _getConfigOrg();
    return (cfg.tiposOcorrencia || []).filter(function(t) { return t.ativo !== false; });
  }

  function getTiposAfastamento() {
    var cfg = _getConfigOrg();
    return (cfg.tiposAfastamento || []).filter(function(t) { return t.ativo !== false; });
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
      { id: 'manha',       label: 'Manhã',       ini: '08:00', fim: '12:00' },
      { id: 'tarde',       label: 'Tarde',       ini: '12:00', fim: '18:00' },
      { id: 'noite',       label: 'Noite',       ini: '18:00', fim: '22:00' },
      { id: 'manha_tarde', label: 'Manhã/Tarde', ini: '08:00', fim: '18:00' },
      { id: 'tarde_noite', label: 'Tarde/Noite', ini: '12:00', fim: '22:00' },
      { id: 'integral',    label: 'Integral',    ini: '08:00', fim: '22:00' }
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
    getEspacos:               getEspacos,
    getEspaco:                getEspaco,
    getHorarioEspaco:         getHorarioEspaco,
    resolverResponsaveis:     resolverResponsaveis,
    getResponsavelTurno:      getResponsavelTurno,   // @deprecated
    verificarBloqueioData:    verificarBloqueioData,
    getTurnos:                getTurnos,
    getReservaHorario:        getReservaHorario,
    getModulosAtivos:         getModulosAtivos,
    moduloAtivo:              moduloAtivo,
    getFeatureFlag:           getFeatureFlag,
    setFeatureFlag:           setFeatureFlag,
    getFeatureFlagsCatalogo:  getFeatureFlagsCatalogo,
    getPermissao:             getPermissao,
    getTiposProcesso:         getTiposProcesso,
    getTiposRubrica:          getTiposRubrica,
    getRegrasEdital:          getRegrasEdital,
    getLabel:                 getLabel,
    getCamposCustom:          getCamposCustom,
    getParametrosRH:          getParametrosRH,
    getTemplateNotificacao:   getTemplateNotificacao,
    getTiposOcorrencia:       getTiposOcorrencia,
    getTiposAfastamento:      getTiposAfastamento,
    getLogoUrl:               getLogoUrl,
    getPaleta:                getPaleta,
    invalidarCache:           invalidarCache
  };

})();
