/**
 * @file modules/admin/admin_controller.gs
 * @layer modules/admin
 * @description Controllers globais do módulo Admin: espaços, turnos, setores,
 *              categorias de itens, módulos, aprovações de solicitações de reserva.
 *
 * Todos os métodos são chamados via google.script.run (GAS bridge).
 * Toda resposta passa por GasResponse.wrap().
 *
 * @depends core/auth_session.gs, core/config_service.gs,
 *          modules/admin/config_admin_service.gs,
 *          modules/admin/modulos_registry_service.gs,
 *          modules/espacos/solicitacao_reserva_engine.gs
 */

// ── Espaços ──────────────────────────────────────────────────────────────────

function ctrl_admin_listarEspacos() {
  return GasResponse.wrap(function() {
    return ConfigAdminService.listarEspacos();
  }, 'ctrl_admin_listarEspacos');
}

function ctrl_admin_listarEspacosPublicos() {
  return GasResponse.wrap(function() {
    var espacos = SistemaConfigService.getEspacos();
    return espacos.filter(function(e) {
      return e.ativo !== false;
    }).map(function(e) {
      return {
        id:           e.id,
        nome:         e.nome,
        tipoEspaco:   e.tipoEspaco || 'multiuso',
        capacidade:   e.capacidade || 0,
        aceitaReserva: e.aceitaReserva !== false,
        possuiChaves: e.possuiChaves === true,
        itensFixos:   e.itensFixos || {}
      };
    });
  }, 'ctrl_admin_listarEspacosPublicos');
}

function ctrl_admin_salvarEspaco(dados) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.salvarEspaco(dados);
  }, 'ctrl_admin_salvarEspaco');
}

/**
 * Atualiza apenas o campo mapaConfig de um espaço,
 * preservando todos os demais campos da configuração.
 *
 * @param {Object} params  { id: string, mapaConfig: Object|null }
 */
function ctrl_admin_salvarMapaEspaco(params) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.salvarMapaEspaco(params);
  }, 'ctrl_admin_salvarMapaEspaco');
}

// ── Terreno do Mapa ──────────────────────────────────────────────────────────

/**
 * Lê a configuração do terreno (contorno do campus).
 */
function ctrl_admin_lerTerreno() {
  return GasResponse.wrap(function() {
    return ConfigAdminService.lerTerreno();
  }, 'ctrl_admin_lerTerreno');
}

/**
 * Salva a configuração do terreno (contorno do campus).
 * @param {{ pontos: Array, svgPath: string }} params
 */
function ctrl_admin_salvarTerreno(params) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.salvarTerreno(params);
  }, 'ctrl_admin_salvarTerreno');
}

function ctrl_admin_desativarEspaco(espacoId) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.desativarEspaco(espacoId);
  }, 'ctrl_admin_desativarEspaco');
}

function ctrl_admin_excluirEspaco(espacoId) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.excluirEspaco(espacoId);
  }, 'ctrl_admin_excluirEspaco');
}

function ctrl_admin_alternarItemFixo(dados) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.alternarItemFixo(dados);
  }, 'ctrl_admin_alternarItemFixo');
}

/**
 * Retorna dados para popular modais de configuração.
 * aba: 'Itens' | 'Setores' | 'Espacos' | 'CategoriasItens'
 */
function ctrl_admin_obterDadosParaConfig(aba) {
  return GasResponse.wrap(function() {
    var orgId = getOrgConfig().orgId;
    switch (String(aba || '').trim()) {
      case 'Itens':
        var itens = [];
        try {
          var raw = readJSON('itens_config.json');
          itens = Array.isArray(raw)
            ? raw.filter(function(i) { return i.orgId === orgId && i.ativo !== false; })
            : [];
        } catch(_) {}
        return { itens: itens };
      case 'CategoriasItens':
        return { categorias: ConfigAdminService.listarCategoriasItens() };
      case 'Setores':
        return { setores: SistemaConfigService.getSetores() };
      case 'Espacos':
        return { espacos: ConfigAdminService.listarEspacos() };
      default:
        return {};
    }
  }, 'ctrl_admin_obterDadosParaConfig');
}

// ── Turnos ────────────────────────────────────────────────────────────────────

function ctrl_admin_listarTurnos() {
  return GasResponse.wrap(function() {
    return ConfigAdminService.listarTurnos();
  }, 'ctrl_admin_listarTurnos');
}

function ctrl_admin_salvarTurno(dados) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.salvarTurno(dados);
  }, 'ctrl_admin_salvarTurno');
}

function ctrl_admin_excluirTurno(id) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.excluirTurno(id);
  }, 'ctrl_admin_excluirTurno');
}

// ── Setores ───────────────────────────────────────────────────────────────────

function ctrl_admin_listarSetores() {
  return GasResponse.wrap(function() {
    return ConfigAdminService.listarSetores();
  }, 'ctrl_admin_listarSetores');
}

function ctrl_admin_salvarSetor(dados) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.salvarSetor(dados);
  }, 'ctrl_admin_salvarSetor');
}

function ctrl_admin_excluirSetor(id) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.excluirSetor(id);
  }, 'ctrl_admin_excluirSetor');
}

// ── Categorias de Itens ───────────────────────────────────────────────────────

function ctrl_admin_listarCategoriasItens() {
  return GasResponse.wrap(function() {
    return ConfigAdminService.listarCategoriasItens();
  }, 'ctrl_admin_listarCategoriasItens');
}

function ctrl_admin_salvarCategoriaItem(dados) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.salvarCategoriaItem(dados);
  }, 'ctrl_admin_salvarCategoriaItem');
}

function ctrl_admin_excluirCategoriaItem(id) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.excluirCategoriaItem(id);
  }, 'ctrl_admin_excluirCategoriaItem');
}

// ── Módulos ───────────────────────────────────────────────────────────────────

function ctrl_admin_listarModulos() {
  return GasResponse.wrap(function() {
    return ConfigAdminService.listarModulos();
  }, 'ctrl_admin_listarModulos');
}

function ctrl_admin_toggleModulo(moduloId, ativo) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.toggleModulo(moduloId, ativo === true || ativo === 'true');
  }, 'ctrl_admin_toggleModulo');
}

// ── Solicitações de Reserva ───────────────────────────────────────────────────

function ctrl_solicitacoes_criar(tipo, dados, justificativa) {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    return SolicitacaoReservaEngine.criar({ tipo: tipo, payload: dados,
      justificativa: justificativa }, email);
  }, 'ctrl_solicitacoes_criar');
}

function ctrl_solicitacoes_listar() {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    return SolicitacaoReservaEngine.listarPendentes(email);
  }, 'ctrl_solicitacoes_listar');
}

function ctrl_solicitacoes_listar_todas() {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    return SolicitacaoReservaEngine.listarTodas(email);
  }, 'ctrl_solicitacoes_listar_todas');
}

function ctrl_solicitacoes_aprovar(id) {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    return SolicitacaoReservaEngine.aprovar(id, email);
  }, 'ctrl_solicitacoes_aprovar');
}

function ctrl_solicitacoes_recusar(id, motivoRecusa) {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    return SolicitacaoReservaEngine.recusar(id, motivoRecusa, email);
  }, 'ctrl_solicitacoes_recusar');
}

function ctrl_solicitacoes_contarPendentes() {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    var pendentes = SolicitacaoReservaEngine.listarPendentes(email);
    return { count: pendentes.length };
  }, 'ctrl_solicitacoes_contarPendentes');
}

// ── Configurações de Expediente ───────────────────────────────────────────────

function ctrl_admin_obterConfigExpediente() {
  return GasResponse.wrap(function() {
    _assertAdmin();
    // Lê diretamente de config_org.json, pois é lá que salvarConfigExpediente persiste.
    // getOrgConfig() lê apenas de PropertiesService e não contém esses campos.
    var cfg = {};
    try { cfg = readJSON('config_org.json') || {}; } catch(_) {}
    return {
      reservaHoraInicio: cfg.reservaHoraInicio || '08:00',
      reservaHoraFim:    cfg.reservaHoraFim    || '22:00'
    };
  }, 'ctrl_admin_obterConfigExpediente');
}

function ctrl_admin_salvarConfigExpediente(dados) {
  return GasResponse.wrap(function() {
    _assertAdmin();
    if (!dados || !dados.reservaHoraInicio || !dados.reservaHoraFim)
      throw new Error('Horários de início e fim são obrigatórios.');

    var _HH_MM = /^\d{2}:\d{2}$/;
    if (!_HH_MM.test(dados.reservaHoraInicio) || !_HH_MM.test(dados.reservaHoraFim))
      throw new Error('Formato inválido. Use HH:MM (ex: 08:00).');

    var email = getEmailSessao();
    var orgId = getOrgConfig().orgId;

    modifyJSON('config_org.json', function(cfg) {
      cfg.reservaHoraInicio = dados.reservaHoraInicio;
      cfg.reservaHoraFim    = dados.reservaHoraFim;
      return cfg;
    });

    if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();
    if (typeof BootService !== 'undefined') BootService.limparCache(email);

    AuditoriaService.registrar('EXPEDIENTE_SALVO', 'admin',
      { orgId: orgId, usuario: email,
        inicio: dados.reservaHoraInicio, fim: dados.reservaHoraFim });

    return { reservaHoraInicio: dados.reservaHoraInicio, reservaHoraFim: dados.reservaHoraFim };
  }, 'ctrl_admin_salvarConfigExpediente');
}

// ─── Banco de Dados — URL da pasta no Drive ──────────────────────────────────

/**
 * Retorna a URL e metadados da pasta de dados da organização no Google Drive.
 * Acesso: superadmin apenas.
 * @returns {{ url: string, nome: string, orgId: string }}
 */
function ctrl_admin_obterUrlPastaDados() {
  return GasResponse.wrap(function() {
    _assertAdmin();
    var pasta = getDataFolder();
    return {
      url:   'https://drive.google.com/drive/folders/' + pasta.getId(),
      nome:  pasta.getName(),
      orgId: getOrgConfig().orgId
    };
  }, 'ctrl_admin_obterUrlPastaDados');
}

// ─── helper de RBAC local ────────────────────────────────────────────────────
function _assertAdmin() {
  var email = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  var papel  = acesso && acesso.registro ? (acesso.registro.papel || '') : '';
  var ehSuperAdmin = papel === 'superadmin';
  if (!ehSuperAdmin) {
    var superAdmin = (PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '').toLowerCase();
    ehSuperAdmin = superAdmin && email.toLowerCase() === superAdmin;
  }
  if (!ehSuperAdmin) throw new Error('Acesso negado: operação restrita a superadmin.');
}

// ─── Fase 9: Feature Flags ─────────────────────────────────────────────────

/**
 * Lista todas as feature flags com status atual.
 * Acesso: admin/superadmin.
 */
function ctrl_admin_listarFeatureFlags() {
  return GasResponse.wrap(function() {
    _assertAdmin();
    return SistemaConfigService.getFeatureFlagsCatalogo();
  }, 'ctrl_admin_listarFeatureFlags');
}

/**
 * Ativa ou desativa uma feature flag.
 * @param {string} flagId
 * @param {boolean} ativo
 */
function ctrl_admin_setFeatureFlag(flagId, ativo) {
  return GasResponse.wrap(function() {
    _assertAdmin();
    var email = getEmailSessao();
    var orgId = getOrgConfig().orgId;
    var res = SistemaConfigService.setFeatureFlag(flagId, ativo === true || ativo === 'true', email);
    AuditoriaService.registrar('FEATURE_FLAG_ALTERADA', 'admin',
      { orgId: orgId, usuario: email, flagId: flagId, ativo: ativo });
    return res;
  }, 'ctrl_admin_setFeatureFlag');
}

// ─── Fase 9: Checklist de Provisionamento ─────────────────────────────────

/**
 * Retorna o checklist de provisionamento desta organização.
 * Acesso: admin/superadmin.
 */
function ctrl_admin_checarProvisionamento() {
  return GasResponse.wrap(function() {
    _assertAdmin();
    var orgId = getOrgConfig().orgId;
    return OrgRegistryService.checarProvisionamento(orgId);
  }, 'ctrl_admin_checarProvisionamento');
}

// ─── Fase 9: Painel de Orgs (superadmin) ──────────────────────────────────

/**
 * Lista todas as orgs registradas.
 * Acesso: superadmin apenas.
 */
function ctrl_orgs_listar() {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    var papel  = acesso && acesso.registro ? acesso.registro.papel : '';
    if (papel !== 'superadmin') throw new Error('Acesso negado: restrito a superadmin.');
    return OrgRegistryService.listarTodas();
  }, 'ctrl_orgs_listar');
}

/**
 * Atualiza status de uma org (superadmin).
 */
function ctrl_orgs_atualizarStatus(orgId, status) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    var papel  = acesso && acesso.registro ? acesso.registro.papel : '';
    if (papel !== 'superadmin') throw new Error('Acesso negado: restrito a superadmin.');
    return OrgRegistryService.atualizarStatus(orgId, status);
  }, 'ctrl_orgs_atualizarStatus');
}

/**
 * Atualiza plano de uma org (superadmin).
 */
function ctrl_orgs_atualizarPlano(orgId, plano) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    var papel  = acesso && acesso.registro ? acesso.registro.papel : '';
    if (papel !== 'superadmin') throw new Error('Acesso negado: restrito a superadmin.');
    return OrgRegistryService.atualizarPlano(orgId, plano);
  }, 'ctrl_orgs_atualizarPlano');
}
