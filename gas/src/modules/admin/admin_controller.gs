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

// ── Níveis do Mapa ───────────────────────────────────────────────────────────

function ctrl_admin_lerNiveisMapa() {
  return GasResponse.wrap(function() {
    return ConfigAdminService.lerNiveisMapa();
  }, 'ctrl_admin_lerNiveisMapa');
}

function ctrl_admin_salvarNiveisMapa(params) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.salvarNiveisMapa(params);
  }, 'ctrl_admin_salvarNiveisMapa');
}

function ctrl_admin_alternarReservaEspaco(espacoId) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.alternarReservaEspaco(espacoId);
  }, 'ctrl_admin_alternarReservaEspaco');
}

function ctrl_admin_desativarEspaco(espacoId) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.desativarEspaco(espacoId);
  }, 'ctrl_admin_desativarEspaco');
}

/**
 * Alterna o campo emManutencao de um espaço.
 * Papéis permitidos: admin, gestor, infraestrutura, superadmin.
 */
function ctrl_admin_alternarManutencaoEspaco(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    var papel  = acesso && acesso.registro ? acesso.registro.papel : 'colaborador';
    var papeis = ['superadmin', 'admin', 'gestor', 'infraestrutura'];
    if (papeis.indexOf(papel) === -1) throw new Error('Acesso negado.');

    var id = params && params.espacoId;
    if (!id) throw new Error('espacoId é obrigatório.');

    var orgId  = getOrgConfig().orgId;
    var novoStatus = false;

    modifyJSON('espacos_config.json', function(lista) {
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === id && lista[i].orgId === orgId) {
          novoStatus = !lista[i].emManutencao;
          lista[i].emManutencao  = novoStatus;
          lista[i].atualizadoEm  = agora();
          lista[i].versao        = (lista[i].versao || 0) + 1;
          break;
        }
      }
      return lista;
    });

    if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();

    AuditoriaService.registrar('ESPACO_MANUTENCAO_ALTERADO', 'espaco', {
      entidadeId: id, orgId: orgId, usuario: email, emManutencao: novoStatus
    });

    return { espacoId: id, emManutencao: novoStatus };
  }, 'ctrl_admin_alternarManutencaoEspaco');
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
    var resultado = ConfigAdminService.toggleModulo(moduloId, ativo === true || ativo === 'true');
    // Invalida cache de bootstrap para todos os usuários ao mudar estado de módulo
    try { CacheService.getScriptCache().removeAll(); } catch(_) {}
    return resultado;
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

// ─── Banco de Dados — Estrutura Drive ────────────────────────────────────────

/**
 * Metadados descritivos de cada planilha do sistema (para exibição no UI).
 * Chave = nome da planilha em PROP_SHEETS / SCHEMA_ABAS.
 */
var _PLANILHA_META = {
  MASTER:      { label: 'MASTER',      icone: 'table_chart', descricao: 'Configurações, Itens, Auditoria, LogAcessos, Funcionários, Acesso' },
  ACOES:       { label: 'AÇÕES',       icone: 'event',       descricao: 'Ações, Habilitações, Acervo, Parcerias, Indicadores, Metas, Estratégia' },
  ESPACOS:     { label: 'ESPAÇOS',     icone: 'meeting_room',descricao: 'Reservas, Chaves, Ativos, Manutenções, Patrimônio, Alertas' },
  PESSOAL:     { label: 'PESSOAL',     icone: 'task',        descricao: 'Tarefas, Demandas, Processos' },
  EQUIPES:     { label: 'EQUIPES / RH',icone: 'group',       descricao: 'Funcionários, Vínculos, Escalas, Férias, Ocorrências, Avaliações, Ponto' },
  FINANCEIRO:  { label: 'FINANCEIRO',  icone: 'payments',    descricao: 'Contratos, Pagamentos, Rubricas, Orçamentos, Fontes de Recurso' },
  RELATORIOS:  { label: 'RELATÓRIOS',  icone: 'bar_chart',   descricao: 'CODIP, Relatório Gerencial, Exportações' },
  REUNIOES:    { label: 'REUNIÕES',    icone: 'groups',      descricao: 'Reuniões, Encaminhamentos, Atas' },
  COMUNICACAO: { label: 'COMUNICAÇÃO', icone: 'campaign',    descricao: 'Demandas Balcão, Entregas RECE, Agenda RECE' },
  PUBLICO:     { label: 'PÚBLICO',     icone: 'people',      descricao: 'Inscrições, Presenças, Pesquisas de Satisfação, Certificados' },
  ESCUTA:      { label: 'ESCUTA',      icone: 'hearing',     descricao: 'Pesquisas de Clima, Respostas, Indicadores' }
};

/**
 * Garante a hierarquia de pastas ERP no Google Drive.
 * Cria (ou localiza) pasta-mãe ERP, sub-pasta JSON e sub-pasta Planilhas.
 * Move JSON e planilhas para seus destinos se ainda não estiverem lá.
 * Idempotente — seguro chamar múltiplas vezes.
 *
 * @returns {{ pastaErp, pastaJson, pastaPlanilhas }}
 */
function _garantirEstruturaDrive() {
  var props = PropertiesService.getScriptProperties();
  var org   = getOrgConfig();

  // ── 1. Pasta-mãe ERP ──────────────────────────────────────────────────────
  var erpId  = props.getProperty('FOLDER_ID_ERP');
  var pastaErp;
  if (erpId) {
    try { pastaErp = DriveApp.getFolderById(erpId); } catch(e) { pastaErp = null; }
  }
  if (!pastaErp) {
    var nomeErp  = org.nome + ' — ERP';
    var iterErp  = DriveApp.getFoldersByName(nomeErp);
    pastaErp     = iterErp.hasNext() ? iterErp.next() : DriveApp.createFolder(nomeErp);
    props.setProperty('FOLDER_ID_ERP', pastaErp.getId());
    Logger.info('admin', '_garantirEstruturaDrive', 'Pasta ERP: ' + pastaErp.getId());
  }

  // ── 2. Sub-pasta JSON — mover para dentro da pasta ERP se necessário ──────
  var pastaJson = getDataFolder();
  _moverParaPasta(pastaJson.getId(), pastaErp, true /*isFolder*/);

  // ── 3. Sub-pasta Planilhas ─────────────────────────────────────────────────
  var planId = props.getProperty('FOLDER_ID_PLANILHAS');
  var pastaPlanilhas;
  if (planId) {
    try { pastaPlanilhas = DriveApp.getFolderById(planId); } catch(e) { pastaPlanilhas = null; }
  }
  if (!pastaPlanilhas) {
    var iterPlan = pastaErp.getFoldersByName('Planilhas');
    pastaPlanilhas = iterPlan.hasNext()
      ? iterPlan.next()
      : pastaErp.createFolder('Planilhas');
    props.setProperty('FOLDER_ID_PLANILHAS', pastaPlanilhas.getId());
    Logger.info('admin', '_garantirEstruturaDrive', 'Pasta Planilhas: ' + pastaPlanilhas.getId());
  }

  // ── 4. Mover cada planilha para sub-pasta Planilhas ───────────────────────
  Object.keys(PROP_SHEETS).forEach(function(nome) {
    var sheetId = props.getProperty(PROP_SHEETS[nome]);
    if (!sheetId) return;
    try {
      _moverParaPasta(sheetId, pastaPlanilhas, false /*isFile*/);
    } catch(e) {
      Logger.warn('admin', '_garantirEstruturaDrive', nome + ': ' + e.message);
    }
  });

  return { pastaErp: pastaErp, pastaJson: pastaJson, pastaPlanilhas: pastaPlanilhas };
}

/**
 * Move um arquivo ou pasta para dentroEm de uma pasta-destino, se ainda não estiver lá.
 * @param {string}  itemId      — ID do arquivo ou pasta
 * @param {Folder}  destino     — pasta-destino
 * @param {boolean} isPasta     — true se for pasta, false se for arquivo
 */
function _moverParaPasta(itemId, destino, isPasta) {
  try {
    var item = isPasta ? DriveApp.getFolderById(itemId) : DriveApp.getFileById(itemId);
    // Verificar se já está no destino
    var parents = item.getParents();
    while (parents.hasNext()) {
      if (parents.next().getId() === destino.getId()) return; // já está lá
    }
    item.moveTo(destino);
    if (isPasta) _dataFolderCache = null; // invalida cache da pasta de dados
    Logger.info('admin', '_moverParaPasta', (isPasta ? 'Pasta' : 'Arquivo') + ' movido: ' + itemId);
  } catch(e) {
    Logger.warn('admin', '_moverParaPasta', 'Erro ao mover ' + itemId + ': ' + e.message);
  }
}

/**
 * Retorna informação completa do banco de dados: pasta ERP, pasta JSON e
 * todas as planilhas do sistema com URLs e descrições.
 * Garante a estrutura de pastas no Drive na primeira chamada.
 * Acesso: superadmin apenas.
 */
function ctrl_admin_obterInfoBancoDados() {
  return GasResponse.wrap(function() {
    _assertAdmin();
    var props  = PropertiesService.getScriptProperties();
    var org    = getOrgConfig();

    // Garante estrutura de pastas
    var estrutura = _garantirEstruturaDrive();

    // URLs base
    function _folderUrl(id) { return 'https://drive.google.com/drive/folders/' + id; }
    function _sheetUrl(id)  { return 'https://docs.google.com/spreadsheets/d/' + id; }

    // Monta lista de planilhas
    var planilhas = Object.keys(PROP_SHEETS).map(function(chave) {
      var sheetId = props.getProperty(PROP_SHEETS[chave]);
      var meta    = _PLANILHA_META[chave] || { label: chave, icone: 'table_chart', descricao: '' };
      return {
        chave:    chave,
        label:    meta.label,
        icone:    meta.icone,
        descricao:meta.descricao,
        url:      sheetId ? _sheetUrl(sheetId) : null,
        ok:       !!sheetId
      };
    });

    return {
      orgId:     org.orgId,
      orgNome:   org.nome,
      pastaErp: {
        url:  _folderUrl(estrutura.pastaErp.getId()),
        nome: estrutura.pastaErp.getName(),
        id:   estrutura.pastaErp.getId()
      },
      pastaJson: {
        url:  _folderUrl(estrutura.pastaJson.getId()),
        nome: estrutura.pastaJson.getName(),
        id:   estrutura.pastaJson.getId()
      },
      pastaPlanilhas: {
        url:  _folderUrl(estrutura.pastaPlanilhas.getId()),
        nome: estrutura.pastaPlanilhas.getName(),
        id:   estrutura.pastaPlanilhas.getId()
      },
      planilhas: planilhas
    };
  }, 'ctrl_admin_obterInfoBancoDados');
}

/**
 * Compatibilidade retroativa — redireciona para a pasta ERP raiz.
 * @returns {{ url: string, nome: string, orgId: string }}
 */
function ctrl_admin_obterUrlPastaDados() {
  return GasResponse.wrap(function() {
    _assertAdmin();
    var props  = PropertiesService.getScriptProperties();
    var erpId  = props.getProperty('FOLDER_ID_ERP');
    if (erpId) {
      try {
        var pasta = DriveApp.getFolderById(erpId);
        return {
          url:   'https://drive.google.com/drive/folders/' + pasta.getId(),
          nome:  pasta.getName(),
          orgId: getOrgConfig().orgId
        };
      } catch(e) {}
    }
    // Fallback: pasta JSON pura (comportamento anterior)
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
  var ehAdmin = (papel === 'superadmin' || papel === 'admin');
  if (!ehAdmin) {
    var superAdmin = (PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '').toLowerCase();
    ehAdmin = superAdmin && email.toLowerCase() === superAdmin;
  }
  if (!ehAdmin) throw new Error('Acesso negado: operação restrita a administradores.');
}

// ─── Usuários ativos (para selects de executor/convocador) ─────────────────

/**
 * Lista usuários ativos (status !== 'pendente') para popular selects no frontend.
 * Retorna apenas email e nome — sem dados sensíveis.
 */
function ctrl_admin_listarUsuariosAtivos() {
  return GasResponse.wrap(function() {
    var _auEmail  = getEmailSessao();
    var _auAcesso = AcessoService.verificar(_auEmail);
    if (!_auAcesso || _auAcesso.status !== 'ativo') throw new Error('Acesso negado.');
    return AcessoService.listarUsuarios()
      .filter(function(u) { return u.status !== 'pendente'; })
      .map(function(u) { return {
        email:       u.email,
        nome:        u.nome        || u.email,
        nomeApelido: u.nomeApelido || '',
        pronomes:    u.pronomes    || '',
        setor:       u.setor       || ''
      }; });
  }, 'ctrl_admin_listarUsuariosAtivos');
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

// ── Datas Comemorativas ───────────────────────────────────────────────────────

/** Leitura pública — retorna datas ativas para a home page. */
function ctrl_home_datasComemorativas() {
  return GasResponse.wrap(function() {
    return ConfigAdminService.getDatasComemorativas();
  }, 'ctrl_home_datasComemorativas');
}

/** Lista todas (inclusive inativas) para o painel admin. */
function ctrl_admin_listarDatasComemorativas() {
  return GasResponse.wrap(function() {
    return ConfigAdminService.listarDatasComemorativas();
  }, 'ctrl_admin_listarDatasComemorativas');
}

function ctrl_admin_salvarDataComemorativa(dados) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.salvarDataComemorativa(dados);
  }, 'ctrl_admin_salvarDataComemorativa');
}

function ctrl_admin_excluirDataComemorativa(id) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.excluirDataComemorativa(id);
  }, 'ctrl_admin_excluirDataComemorativa');
}

function ctrl_admin_toggleDataComemorativa(id, ativo) {
  return GasResponse.wrap(function() {
    return ConfigAdminService.toggleDataComemorativa(id, ativo);
  }, 'ctrl_admin_toggleDataComemorativa');
}
