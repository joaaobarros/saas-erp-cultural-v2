/**
 * @file modules/admin/org_registry_service.gs
 * @layer modules/admin
 * @description Registro de organizações provisionadas — painel SaaS superadmin.
 *
 * Cada deployment do script representa uma organização. O OrgRegistry
 * mantém um catálogo central (orgs_registry.json) de todas as orgs que
 * já passaram pelo wizard de setup, com status, plano e última atividade.
 *
 * ACESSO: restrito a superadmin. Zero dados de outras orgs expostos ao
 * próprio usuário da org (isolamento por orgId em todas as consultas).
 *
 * Fonte canônica: orgs_registry.json (Drive — pasta desta organização).
 * Índice auxiliar: MASTER.Orgs (Sheet).
 *
 * @depends core/data_layer.gs, core/config.gs, core/services/auditoria_service.gs
 */

var OrgRegistryService = (function() {

  var _ARQUIVO = 'orgs_registry.json';

  var STATUS_PROVISIONED = 'provisionado';
  var STATUS_SETUP       = 'em_setup';
  var STATUS_SUSPENDED   = 'suspenso';
  var STATUS_DEMO        = 'demo';

  var PLANOS = [
    { id: 'gratuito',    label: 'Gratuito',     modulosMax: 3,  usuariosMax: 10  },
    { id: 'essencial',   label: 'Essencial',    modulosMax: 6,  usuariosMax: 30  },
    { id: 'completo',    label: 'Completo',      modulosMax: 99, usuariosMax: 100 },
    { id: 'demo',        label: 'Demonstração',  modulosMax: 99, usuariosMax: 5   }
  ];

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _lerTodos() {
    try {
      var lista = readJSON(_ARQUIVO);
      return Array.isArray(lista) ? lista : [];
    } catch(_) { return []; }
  }

  function _indexarSheet(org) {
    try {
      var aba = _getSheet('SHEET_ID_MASTER', 'Orgs');
      if (!aba) return;
      var linha = [
        org.orgId      || '',
        org.nome       || '',
        org.nomeCompleto || '',
        org.dominio    || '',
        org.status     || STATUS_SETUP,
        org.plano      || 'gratuito',
        org.provisionadoEm || '',
        org.ultimaAtividadeEm || '',
        org.adminEmail || '',
        org.versaoSistema || ''
      ];
      // Garantir cabeçalho
      if (aba.getLastRow() === 0) {
        aba.getRange(1,1,1,10).setValues([[
          'OrgId','Nome','NomeCompleto','Dominio','Status',
          'Plano','ProvisionadoEm','UltimaAtividade','AdminEmail','VersaoSistema'
        ]]);
        aba.setFrozenRows(1);
      }
      var atualizado = DataGateway.atualizarLinhaPorColuna('SHEET_ID_MASTER', 'Orgs', 0, org.orgId, linha);
      if (!atualizado) DataGateway.salvarLinha('SHEET_ID_MASTER', 'Orgs', linha);
    } catch(e) {
      Logger.warn('org_registry', '_indexarSheet', e.message);
    }
  }

  // ── API pública ──────────────────────────────────────────────────────────

  /**
   * Registra ou atualiza o registro desta organização.
   * Chamado em fase9_prepararIndice() e no wizard de setup.
   * @param {string} orgId
   * @param {object} cfg — getOrgConfig() desta org
   * @param {object} [extras] — plano, status, adminEmail, etc.
   */
  function registrarOuAtualizar(orgId, cfg, extras) {
    extras = extras || {};
    var agora_ = agora();
    var registro = {
      orgId:            orgId,
      nome:             cfg.nome             || extras.nome      || '',
      nomeCompleto:     cfg.nomeCompleto      || extras.nomeCompleto || '',
      dominio:          cfg.dominio           || extras.dominio   || '',
      adminEmail:       extras.adminEmail     || '',
      status:           extras.status         || STATUS_PROVISIONED,
      plano:            extras.plano          || 'gratuito',
      provisionadoEm:   extras.provisionadoEm || agora_,
      ultimaAtividadeEm: agora_,
      versaoSistema:    '9.0',
      modulosAtivos:    extras.modulosAtivos  || [],
      usuariosCount:    extras.usuariosCount  || 0,
      atualizadoEm:     agora_
    };

    modifyJSON(_ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(o) { return o.orgId === orgId; });
      if (idx >= 0) {
        // preserva provisionadoEm original
        registro.provisionadoEm = lista[idx].provisionadoEm || registro.provisionadoEm;
        lista[idx] = registro;
      } else {
        lista.push(registro);
      }
      return lista;
    });

    _indexarSheet(registro);
    Logger.info('org_registry', 'registrarOuAtualizar', 'Org registrada: ' + orgId);
    return registro;
  }

  /**
   * Lista todas as organizações registradas.
   * ACESSO: apenas superadmin (verificar no controller).
   * @returns {Array<OrgRegistro>}
   */
  function listarTodas() {
    return _lerTodos().sort(function(a, b) {
      return String(b.provisionadoEm || '').localeCompare(String(a.provisionadoEm || ''));
    });
  }

  /**
   * Retorna o registro de uma organização específica.
   * @param {string} orgId
   */
  function obter(orgId) {
    return _lerTodos().find(function(o) { return o.orgId === orgId; }) || null;
  }

  /**
   * Atualiza o status de uma organização (ex: suspenso, demo).
   * @param {string} orgId
   * @param {string} novoStatus — STATUS_PROVISIONED | STATUS_SUSPENDED | STATUS_DEMO
   */
  function atualizarStatus(orgId, novoStatus) {
    var statusValidos = [STATUS_PROVISIONED, STATUS_SETUP, STATUS_SUSPENDED, STATUS_DEMO];
    if (statusValidos.indexOf(novoStatus) === -1) throw new Error('Status inválido: ' + novoStatus);

    modifyJSON(_ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) return lista;
      var idx = lista.findIndex(function(o) { return o.orgId === orgId; });
      if (idx >= 0) {
        lista[idx].status = novoStatus;
        lista[idx].atualizadoEm = agora();
      }
      return lista;
    });

    Logger.info('org_registry', 'atualizarStatus', orgId + ' → ' + novoStatus);
    return { ok: true, orgId: orgId, status: novoStatus };
  }

  /**
   * Atualiza o plano de uma organização.
   */
  function atualizarPlano(orgId, plano) {
    var ids = PLANOS.map(function(p) { return p.id; });
    if (ids.indexOf(plano) === -1) throw new Error('Plano inválido: ' + plano);

    modifyJSON(_ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) return lista;
      var idx = lista.findIndex(function(o) { return o.orgId === orgId; });
      if (idx >= 0) {
        lista[idx].plano = plano;
        lista[idx].atualizadoEm = agora();
      }
      return lista;
    });

    Logger.info('org_registry', 'atualizarPlano', orgId + ' → ' + plano);
    return { ok: true, orgId: orgId, plano: plano };
  }

  /**
   * Registra a última atividade desta org (chamado no boot do frontend).
   * Fire-and-forget — nunca lança exceção.
   */
  function marcarAtividade(orgId) {
    try {
      modifyJSON(_ARQUIVO, function(lista) {
        if (!Array.isArray(lista)) return lista;
        var idx = lista.findIndex(function(o) { return o.orgId === orgId; });
        if (idx >= 0) lista[idx].ultimaAtividadeEm = agora();
        return lista;
      });
    } catch(_) {}
  }

  /**
   * Gera checklist de provisionamento para uma org.
   * Verifica se cada etapa do wizard foi concluída.
   */
  function checarProvisionamento(orgId) {
    var cfg    = getOrgConfig();
    var checks = [];

    // 1. PropertiesService configurado
    checks.push({
      id:    'properties',
      label: 'PropertiesService configurado',
      ok:    !!(cfg.orgId && cfg.nome && cfg.nomeCompleto),
      detalhe: cfg.orgId ? 'orgId: ' + cfg.orgId : 'ORG_ID não definido'
    });

    // 2. Pastas Drive criadas
    var folderOk = false;
    try { getDataFolder(); folderOk = true; } catch(_) {}
    checks.push({
      id:    'drive_folder',
      label: 'Pasta de dados criada no Drive',
      ok:    folderOk,
      detalhe: folderOk ? cfg.dataFolder : 'Pasta não encontrada'
    });

    // 3. Planilhas criadas
    var sheetsOk = false;
    try {
      var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID_MASTER');
      sheetsOk = !!id;
    } catch(_) {}
    checks.push({
      id:    'sheets',
      label: 'Planilhas Google Sheets criadas',
      ok:    sheetsOk,
      detalhe: sheetsOk ? 'SHEET_ID_MASTER: OK' : 'SHEET_ID_MASTER não encontrado'
    });

    // 4. SuperAdmin registrado
    var adminOk = false;
    try {
      var lista = AcessoService ? AcessoService.listarUsuarios() : [];
      adminOk = lista.some(function(u) { return u.papel === 'superadmin'; });
    } catch(_) {}
    checks.push({
      id:    'superadmin',
      label: 'SuperAdmin registrado',
      ok:    adminOk,
      detalhe: adminOk ? 'Pelo menos 1 superadmin' : 'Nenhum superadmin encontrado'
    });

    // 5. Setores configurados
    var setores = [];
    try { setores = SistemaConfigService.getSetores(); } catch(_) {}
    checks.push({
      id:    'setores',
      label: 'Setores configurados',
      ok:    setores.length > 0,
      detalhe: setores.length + ' setor(es) configurado(s)'
    });

    // 6. Espaços configurados
    var espacos = [];
    try { espacos = SistemaConfigService.getEspacos ? SistemaConfigService.getEspacos() : []; } catch(_) {}
    checks.push({
      id:    'espacos',
      label: 'Espaços cadastrados',
      ok:    espacos.length > 0,
      detalhe: espacos.length + ' espaço(s) cadastrado(s)'
    });

    // 7. Identidade visual configurada
    var logoOk = false;
    try { logoOk = !!SistemaConfigService.getLogoUrl(); } catch(_) {}
    checks.push({
      id:    'identidade',
      label: 'Identidade visual (logo/paleta)',
      ok:    logoOk,
      detalhe: logoOk ? 'Logo URL configurada' : 'Logo URL não definida (opcional)'
    });

    // 8. orgId migrado nos dados
    var migOk = false;
    try {
      var tarefas = readJSON('tarefas.json');
      migOk = tarefas.length === 0 || tarefas.every(function(t) { return !!t.orgId; });
    } catch(_) { migOk = true; } // arquivo não existe = OK
    checks.push({
      id:    'orgid_migration',
      label: 'orgId migrado em todos os registros',
      ok:    migOk,
      detalhe: migOk ? 'Todos os registros têm orgId' : 'Executar fase9_migrarOrgId() no GAS Editor'
    });

    var total   = checks.length;
    var passou  = checks.filter(function(c) { return c.ok; }).length;
    return {
      orgId:      orgId,
      passou:     passou,
      total:      total,
      completo:   passou === total,
      percentual: Math.round((passou / total) * 100),
      checks:     checks
    };
  }

  return {
    registrarOuAtualizar: registrarOuAtualizar,
    listarTodas:          listarTodas,
    obter:                obter,
    atualizarStatus:      atualizarStatus,
    atualizarPlano:       atualizarPlano,
    marcarAtividade:      marcarAtividade,
    checarProvisionamento: checarProvisionamento,
    PLANOS:               PLANOS
  };

})();
