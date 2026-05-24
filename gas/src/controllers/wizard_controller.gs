/**
 * @file controllers/wizard_controller.gs
 * @layer controllers
 * @description Controllers do Wizard de Setup inicial — guia uma nova organização
 *              pelo provisionamento completo em menos de 30 minutos.
 *
 * Todas as funções são chamadas pelo wizard_setup.html via google.script.run.
 * Acesso: admin/superadmin apenas (protegido por _assertWizardAcesso).
 *
 * @depends core/config.gs, core/setup.gs, modules/admin/org_registry_service.gs,
 *          core/config_service.gs, modules/admin/admin_controller.gs
 */

// ─── Guard de acesso ──────────────────────────────────────────────────────────

function _assertWizardAcesso() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  var papel  = acesso && acesso.registro ? (acesso.registro.papel || '') : '';
  var ehAdmin = papel === 'admin' || papel === 'superadmin';
  if (!ehAdmin) {
    var adminEmail = (PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '').toLowerCase();
    ehAdmin = adminEmail && email.toLowerCase() === adminEmail;
  }
  if (!ehAdmin) throw new Error('Acesso negado: wizard restrito a administradores.');
  return email;
}

// ─── Passo 0 — Obter estado atual do wizard ────────────────────────────────────

/**
 * Retorna estado completo para o wizard carregar dados existentes.
 * Permite retomar de onde parou.
 */
function ctrl_wizard_obterEstado() {
  return GasResponse.wrap(function() {
    _assertWizardAcesso();
    var org    = getOrgConfig();
    var orgId  = org.orgId;

    var setores  = [];
    var turnos   = [];
    var espacos  = [];
    var modulos  = [];
    try { setores = SistemaConfigService.getSetores();    } catch(_) {}
    try { turnos  = SistemaConfigService.getTurnos();    } catch(_) {}
    try { espacos = SistemaConfigService.getEspacos ? SistemaConfigService.getEspacos() : []; } catch(_) {}
    try { modulos = ModulosRegistryService.listarTodos(); } catch(_) {}

    var checklist = OrgRegistryService.checarProvisionamento(orgId);

    return {
      orgId:        orgId,
      nome:         org.nome,
      nomeCompleto: org.nomeCompleto,
      dominio:      org.dominio,
      titulo:       org.titulo,
      setores:      setores,
      turnos:       turnos,
      espacos:      espacos,
      modulos:      modulos,
      checklist:    checklist,
      passoAtual:   _calcularPassoAtual(checklist),
      versao:       '9.0'
    };
  }, 'ctrl_wizard_obterEstado');
}

function _calcularPassoAtual(checklist) {
  var checks = checklist.checks || [];
  for (var i = 0; i < checks.length; i++) {
    if (!checks[i].ok) return i + 1;
  }
  return checks.length + 1; // completo
}

// ─── Passo 1 — Informações da Organização ────────────────────────────────────

/**
 * Salva informações básicas da organização (nome, domínio, logo, etc.).
 * @param {object} dados — { nome, nomeCompleto, dominio, titulo, timezone }
 */
function ctrl_wizard_salvarOrg(dados) {
  return GasResponse.wrap(function() {
    var email  = _assertWizardAcesso();
    var orgId  = getOrgConfig().orgId;
    dados = dados || {};

    if (!dados.nome)         throw new Error('Nome da organização é obrigatório.');
    if (!dados.nomeCompleto) throw new Error('Nome completo é obrigatório.');

    var props = PropertiesService.getScriptProperties();
    if (dados.nome)         props.setProperty('ORG_NOME',           dados.nome.trim());
    if (dados.nomeCompleto) props.setProperty('ORG_NOME_COMPLETO',   dados.nomeCompleto.trim());
    if (dados.dominio)      props.setProperty('ORG_DOMINIO',         dados.dominio.trim().toLowerCase());
    if (dados.titulo)       props.setProperty('ORG_SISTEMA_TITULO',  dados.titulo.trim());
    if (dados.timezone)     props.setProperty('ORG_TIMEZONE',        dados.timezone.trim());
    if (dados.adminEmail)   props.setProperty('ADMIN_EMAIL',         dados.adminEmail.trim().toLowerCase());

    // Invalida cache para próxima leitura pegar novo valor
    invalidarCacheOrgConfig();

    AuditoriaService.registrar('WIZARD_PASSO1_ORG', 'admin',
      { orgId: orgId, usuario: email, nome: dados.nome });

    return { ok: true, orgId: orgId, passo: 1 };
  }, 'ctrl_wizard_salvarOrg');
}

// ─── Passo 2 — Setores ────────────────────────────────────────────────────────

/**
 * Salva lista de setores em lote (substitui setores atuais).
 * @param {Array} setores — [{ id, label, descricao, cor }]
 */
function ctrl_wizard_salvarSetores(setores) {
  return GasResponse.wrap(function() {
    var email = _assertWizardAcesso();
    var orgId = getOrgConfig().orgId;
    if (!Array.isArray(setores) || setores.length === 0) {
      throw new Error('Ao menos um setor é obrigatório.');
    }
    setores = setores.map(function(s, i) {
      return {
        id:            s.id   || 'setor_' + (i + 1),
        label:         s.label || s.nome || ('Setor ' + (i + 1)),
        descricao:     s.descricao || '',
        cor:           s.cor || '#64748b',
        ativo:         true,
        permissaoBase: s.permissaoBase || 'colaborador'
      };
    });

    // Atualizar config_org.json — setores
    try {
      var arquivo  = getFile('config_org.json');
      var conteudo = arquivo.getBlob().getDataAsString();
      var obj      = JSON.parse(conteudo);
      obj.setores  = setores;
      arquivo.setContent(JSON.stringify(obj));
      SistemaConfigService.invalidarCache();
    } catch(e) {
      Logger.error('wizard_controller', 'ctrl_wizard_salvarSetores', e.message);
      throw e;
    }

    AuditoriaService.registrar('WIZARD_PASSO2_SETORES', 'admin',
      { orgId: orgId, usuario: email, total: setores.length });
    return { ok: true, total: setores.length, passo: 2 };
  }, 'ctrl_wizard_salvarSetores');
}

// ─── Passo 3 — Turnos ─────────────────────────────────────────────────────────

/**
 * Salva lista de turnos em lote (substitui turnos atuais).
 * @param {Array} turnos — [{ id, nome, inicio, fim, dias }]
 */
function ctrl_wizard_salvarTurnos(turnos) {
  return GasResponse.wrap(function() {
    var email = _assertWizardAcesso();
    var orgId = getOrgConfig().orgId;
    if (!Array.isArray(turnos) || turnos.length === 0) {
      throw new Error('Ao menos um turno é obrigatório.');
    }

    try {
      var arquivo  = getFile('config_org.json');
      var conteudo = arquivo.getBlob().getDataAsString();
      var obj      = JSON.parse(conteudo);
      obj.turnos   = turnos.map(function(t, i) {
        return {
          id:     t.id    || 'turno_' + (i + 1),
          nome:   t.nome  || t.label || ('Turno ' + (i + 1)),
          inicio: t.inicio || '08:00',
          fim:    t.fim    || '18:00',
          dias:   t.dias  || ['seg','ter','qua','qui','sex']
        };
      });
      arquivo.setContent(JSON.stringify(obj));
      SistemaConfigService.invalidarCache();
    } catch(e) {
      Logger.error('wizard_controller', 'ctrl_wizard_salvarTurnos', e.message);
      throw e;
    }

    AuditoriaService.registrar('WIZARD_PASSO3_TURNOS', 'admin',
      { orgId: orgId, usuario: email, total: turnos.length });
    return { ok: true, total: turnos.length, passo: 3 };
  }, 'ctrl_wizard_salvarTurnos');
}

// ─── Passo 4 — Espaços ───────────────────────────────────────────────────────

/**
 * Cria espaços físicos em lote via ConfigAdminService.
 * Idempotente: pula espaços com ID já existente.
 * @param {Array} espacos — [{ id, nome, tipoEspaco, capacidade, aceitaReserva }]
 */
function ctrl_wizard_salvarEspacos(espacos) {
  return GasResponse.wrap(function() {
    var email  = _assertWizardAcesso();
    var orgId  = getOrgConfig().orgId;
    if (!Array.isArray(espacos)) throw new Error('Lista de espaços inválida.');

    var criados = 0;
    var pulados = 0;
    var existentes = [];
    try {
      existentes = ConfigAdminService.listarEspacos().map(function(e) { return e.id; });
    } catch(_) {}

    espacos.forEach(function(esp) {
      if (!esp.nome) return;
      if (existentes.indexOf(esp.id) !== -1) { pulados++; return; }
      try {
        ConfigAdminService.salvarEspaco({
          id:            esp.id   || null,
          nome:          esp.nome,
          tipoEspaco:    esp.tipoEspaco || 'multiuso',
          capacidade:    esp.capacidade || 0,
          aceitaReserva: esp.aceitaReserva !== false,
          possuiChaves:  esp.possuiChaves  || false,
          descricao:     esp.descricao     || '',
          ativo:         true,
          orgId:         orgId
        });
        criados++;
      } catch(e) {
        Logger.warn('wizard_controller', 'salvarEspacos', esp.nome + ': ' + e.message);
      }
    });

    AuditoriaService.registrar('WIZARD_PASSO4_ESPACOS', 'admin',
      { orgId: orgId, usuario: email, criados: criados, pulados: pulados });
    return { ok: true, criados: criados, pulados: pulados, passo: 4 };
  }, 'ctrl_wizard_salvarEspacos');
}

// ─── Passo 5 — Módulos ───────────────────────────────────────────────────────

/**
 * Define quais módulos estão ativos para esta organização.
 * @param {Array<string>} modulosAtivos — ex: ['ADMIN','TAREFAS','ACOES']
 */
function ctrl_wizard_salvarModulos(modulosAtivos) {
  return GasResponse.wrap(function() {
    var email = _assertWizardAcesso();
    var orgId = getOrgConfig().orgId;
    if (!Array.isArray(modulosAtivos)) throw new Error('Lista de módulos inválida.');

    // Garante que ADMIN sempre está ativo
    if (modulosAtivos.indexOf('ADMIN') === -1) modulosAtivos.unshift('ADMIN');

    // Atualiza via ModulosRegistryService
    var todos = ModulosRegistryService.listarTodos();
    todos.forEach(function(mod) {
      var deveEstarAtivo = modulosAtivos.indexOf(mod.id) !== -1;
      ModulosRegistryService.setAtivo(mod.id, deveEstarAtivo, orgId);
    });

    AuditoriaService.registrar('WIZARD_PASSO5_MODULOS', 'admin',
      { orgId: orgId, usuario: email, modulosAtivos: modulosAtivos });
    return { ok: true, modulosAtivos: modulosAtivos, passo: 5 };
  }, 'ctrl_wizard_salvarModulos');
}

// ─── Passo 6 — Finalizar Wizard ───────────────────────────────────────────────

/**
 * Finaliza o wizard: registra a org no OrgRegistry, executa migração de orgId
 * e marca o provisionamento como concluído.
 * @param {object} dados — { plano, adminEmail }
 */
function ctrl_wizard_finalizar(dados) {
  return GasResponse.wrap(function() {
    var email  = _assertWizardAcesso();
    var org    = getOrgConfig();
    var orgId  = org.orgId;
    dados = dados || {};

    // 1. Migrar orgId em dados existentes
    var migRes = fase9_migrarOrgId();

    // 2. Registrar org no registry
    OrgRegistryService.registrarOuAtualizar(orgId, org, {
      plano:       dados.plano      || 'gratuito',
      adminEmail:  dados.adminEmail || email,
      status:      'provisionado'
    });

    // 3. Checklist final
    var checklist = OrgRegistryService.checarProvisionamento(orgId);

    AuditoriaService.registrar('WIZARD_FINALIZADO', 'admin', {
      orgId: orgId, usuario: email, plano: dados.plano || 'gratuito',
      migrados: migRes.migrados, checklist: checklist.percentual + '%'
    });

    Logger.info('wizard_controller', 'finalizar',
      'Wizard concluído para org: ' + org.nome + ' (' + orgId + ')');

    return {
      ok:        true,
      orgId:     orgId,
      nome:      org.nome,
      checklist: checklist,
      migrados:  migRes.migrados,
      passo:     6
    };
  }, 'ctrl_wizard_finalizar');
}
