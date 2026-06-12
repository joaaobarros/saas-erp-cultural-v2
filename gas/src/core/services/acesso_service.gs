/**
 * @file core/services/acesso_service.gs
 * @layer core/services
 * @description Controle de acesso em dois níveis para domínios compartilhados.
 *
 * PROBLEMA QUE RESOLVE:
 *   O domínio autorizado (ex: @idm.org.br) pode ser compartilhado por múltiplas
 *   instituições. Apenas usuários EXPLICITAMENTE cadastrados e APROVADOS
 *   internamente devem ter acesso completo ao sistema.
 *
 * FLUXO:
 *   1. Usuário acessa o webapp (Google autentica pelo domínio — access:DOMAIN)
 *   2. AcessoService.verificar(email) retorna o status:
 *      - 'dominio_negado':      email fora do domínio autorizado → tela de erro
 *      - 'pendente_aprovacao':  email no domínio, mas sem cadastro aprovado → tela de espera
 *      - 'ativo':               cadastro aprovado → SPA completa
 *      - 'inativo':             acesso revogado → tela de erro
 *   3. Na tela de espera, o usuário preenche nome + setor → solicitarAcesso()
 *   4. Admin aprova via painel → aprovarAcesso()
 *
 * ARMAZENAMENTO: usuarios_acesso.json (Drive, pasta de dados da org)
 * Schema por item: { email, nome, status, papel, setor, setoresGerenciados, solicitadoEm, aprovadoEm, aprovadoPor }
 *   setoresGerenciados: array de setores que um 'gestor' gerencia (ex: ['infraestrutura']).
 *   Determina permissões especializadas dentro do módulo correspondente.
 *
 * REGRA DE NÃO-HARDCODE:
 *   - Domínio lido de getOrgConfig().dominio (PropertiesService:ORG_DOMINIO)
 *   - Email do admin lido de getOrgConfig() ou PropertiesService:ADMIN_EMAIL
 *
 * @depends core/config.gs (getOrgConfig), core/data_layer.gs (readJSON/saveJSON),
 *          core/logger.gs (Logger), core/services/auditoria_service.gs
 */

var AcessoService = (function () {

  var _ARQUIVO = 'usuarios_acesso.json';

  // ── Leitura ────────────────────────────────────────────────────────────────

  function _lerRegistros() {
    try {
      var dados = readJSON(_ARQUIVO);
      return Array.isArray(dados) ? dados : [];
    } catch (e) {
      return [];
    }
  }

  function _salvarRegistros(registros) {
    saveJSON(_ARQUIVO, registros);
  }

  function _encontrar(email) {
    var emailNorm = String(email || '').toLowerCase().trim();
    return _lerRegistros().find(function (r) {
      return String(r.email || '').toLowerCase().trim() === emailNorm;
    }) || null;
  }

  // ── Validação de domínio ───────────────────────────────────────────────────

  /**
   * Verifica se o email pertence ao domínio autorizado configurado.
   * NUNCA hardcode o domínio — lê de getOrgConfig().dominio.
   */
  function _emailNoDominio(email) {
    var dominio = (getOrgConfig().dominio || '').toLowerCase().trim();
    if (!dominio) return true; // sem restrição: qualquer email autenticado acessa
    return String(email || '').toLowerCase().trim().endsWith('@' + dominio);
  }

  // ── API principal ──────────────────────────────────────────────────────────

  /**
   * Ponto central de verificação de acesso.
   * Deve ser chamado no início de doGet() para decidir qual tela renderizar.
   *
   * @param {string} email — email da sessão ativa (Session.getActiveUser().getEmail())
   * @returns {{ status: string, registro: object|null, mensagem: string }}
   *   status possíveis: 'dominio_negado' | 'pendente_aprovacao' | 'ativo' | 'inativo'
   */
  function verificar(email) {
    if (!email || email.indexOf('@') === -1) {
      return { status: 'dominio_negado', registro: null,
               mensagem: 'Email de sessão inválido. Faça login com sua conta institucional.' };
    }

    if (!_emailNoDominio(email)) {
      Logger.warn('acesso_service', 'verificar',
        'Acesso negado — email fora do domínio: ' + email);
      return { status: 'dominio_negado', registro: null,
               mensagem: 'Acesso restrito. Use sua conta institucional (' +
                         (getOrgConfig().dominio || 'domínio autorizado') + ').' };
    }

    var registro = _encontrar(email);

    if (!registro) {
      // Email no domínio, mas sem cadastro — primeira visita
      Logger.info('acesso_service', 'verificar', 'Primeiro acesso: ' + email);
      return { status: 'pendente_aprovacao', registro: null,
               mensagem: 'Primeira visita detectada. Solicite seu acesso ao administrador.' };
    }

    if (registro.status === 'ativo') {
      return { status: 'ativo', registro: registro, mensagem: '' };
    }

    if (registro.status === 'pendente') {
      return { status: 'pendente_aprovacao', registro: registro,
               mensagem: 'Sua solicitação de acesso está sendo analisada. Aguarde a aprovação.' };
    }

    if (registro.status === 'inativo') {
      Logger.warn('acesso_service', 'verificar', 'Acesso inativo: ' + email);
      return { status: 'inativo', registro: registro,
               mensagem: 'Seu acesso está desativado. Entre em contato com a administração.' };
    }

    return { status: 'dominio_negado', registro: null,
             mensagem: 'Status de acesso desconhecido. Contate o administrador.' };
  }

  /**
   * Registra uma solicitação de primeiro acesso.
   * Chamado pelo usuário na tela de "aguardando aprovação".
   *
   * @param {{ email, nome, setorDesejado }} dados
   * @returns {{ ok: boolean, mensagem: string }}
   */
  function solicitarAcesso(dados) {
    try {
      var email = String(dados.email || '').toLowerCase().trim();
      var nome  = String(dados.nome  || '').trim();

      if (!email || !nome) {
        return { ok: false, mensagem: 'Email e nome são obrigatórios.' };
      }
      if (!_emailNoDominio(email)) {
        return { ok: false, mensagem: 'Email fora do domínio autorizado.' };
      }

      var registros = _lerRegistros();
      var existente = registros.find(function(r) {
        return String(r.email || '').toLowerCase() === email;
      });

      if (existente && existente.status === 'ativo') {
        return { ok: true, mensagem: 'Seu acesso já está ativo.' };
      }
      if (existente && existente.status === 'pendente') {
        return { ok: true, mensagem: 'Sua solicitação já está em análise. Aguarde a aprovação.' };
      }
      if (existente && existente.status === 'inativo') {
        return { ok: false, mensagem: 'Seu acesso foi desativado. Contate o administrador.' };
      }

      var novoRegistro = {
        email:        email,
        nome:         nome,
        setorDesejado: String(dados.setorDesejado || '').trim(),
        status:       'pendente',
        papel:        '',
        setor:        '',
        solicitadoEm: new Date().toISOString(),
        aprovadoEm:   null,
        aprovadoPor:  null
      };

      registros.push(novoRegistro);
      _salvarRegistros(registros);

      // Notificar admin
      _notificarAdmin(novoRegistro);

      Logger.info('acesso_service', 'solicitarAcesso',
        'Solicitação registrada: ' + email + ' | ' + nome);

      return { ok: true, mensagem: 'Solicitação enviada! Você receberá um email quando seu acesso for liberado.' };

    } catch (e) {
      Logger.error('acesso_service', 'solicitarAcesso', e.message);
      return { ok: false, mensagem: 'Erro ao registrar solicitação: ' + e.message };
    }
  }

  /**
   * Admin aprova acesso de um usuário pendente.
   *
   * @param {{ emailAlvo, papel, setor, emailAdmin }} params
   * @returns {{ ok: boolean, mensagem: string }}
   */
  function aprovarAcesso(params) {
    try {
      var emailAlvo = String(params.emailAlvo || '').toLowerCase().trim();
      var emailAdmin = String(params.emailAdmin || '').toLowerCase().trim();

      if (!emailAlvo || !emailAdmin) {
        return { ok: false, mensagem: 'emailAlvo e emailAdmin são obrigatórios.' };
      }

      // Admin deve estar ativo e possuir papel administrativo
      var adminStatus = verificar(emailAdmin);

      var superAdminEmail =
        (PropertiesService.getScriptProperties()
          .getProperty('ADMIN_EMAIL') || '')
          .toLowerCase();

      var ehSuperAdmin =
        superAdminEmail &&
        emailAdmin === superAdminEmail;

      var papelAdmin =
        adminStatus.registro &&
        adminStatus.registro.papel
          ? String(adminStatus.registro.papel).toLowerCase()
          : '';

      var ehAdmin =
        papelAdmin === 'admin' ||
        papelAdmin === 'superadmin';

      if (!ehSuperAdmin && !ehAdmin) {
        return {
          ok: false,
          mensagem: 'Apenas Admin ou SuperAdmin podem executar esta operação.'
        };
      }

      var registros = _lerRegistros();
      var idx = registros.findIndex(function(r) {
        return String(r.email || '').toLowerCase() === emailAlvo;
      });

      if (idx === -1) {
        return { ok: false, mensagem: 'Usuário não encontrado na fila de solicitações.' };
      }

      registros[idx].status             = 'ativo';
      registros[idx].papel              = String(params.papel || 'colaborador').trim();
      registros[idx].setor              = String(params.setor || '').trim();
      registros[idx].setoresGerenciados = Array.isArray(params.setoresGerenciados)
        ? params.setoresGerenciados
        : (registros[idx].setoresGerenciados || []);
      registros[idx].aprovadoEm  = new Date().toISOString();
      registros[idx].aprovadoPor = emailAdmin;

      _salvarRegistros(registros);

      // Notificar usuário aprovado
      _notificarAprovado(registros[idx]);

      Logger.info('acesso_service', 'aprovarAcesso',
        emailAlvo + ' aprovado por ' + emailAdmin + ' | papel: ' + params.papel + ' | setor: ' + params.setor);

      return { ok: true, mensagem: 'Acesso de ' + emailAlvo + ' ativado com sucesso.' };

    } catch (e) {
      Logger.error('acesso_service', 'aprovarAcesso', e.message);
      return { ok: false, mensagem: 'Erro ao aprovar acesso: ' + e.message };
    }
  }

  /**
   * Admin revoga acesso de um usuário.
   *
   * @param {{ emailAlvo, emailAdmin }} params
   * @returns {{ ok: boolean, mensagem: string }}
   */
  function revogarAcesso(params) {
    try {
      var emailAlvo  = String(params.emailAlvo  || '').toLowerCase().trim();
      var emailAdmin = String(params.emailAdmin || '').toLowerCase().trim();
      var registros  = _lerRegistros();
      var idx = registros.findIndex(function(r) {
        return String(r.email || '').toLowerCase() === emailAlvo;
      });
      if (idx === -1) return { ok: false, mensagem: 'Usuário não encontrado.' };
      registros[idx].status = 'inativo';
      _salvarRegistros(registros);
      Logger.info('acesso_service', 'revogarAcesso', emailAlvo + ' revogado por ' + emailAdmin);
      return { ok: true, mensagem: 'Acesso de ' + emailAlvo + ' revogado.' };
    } catch (e) {
      return { ok: false, mensagem: 'Erro: ' + e.message };
    }
  }

  /**
   * Lista todos os usuários (para painel admin).
   * @returns {Array}
   */
  function listarUsuarios() {
    return _lerRegistros();
  }

  /**
   * Retorna usuários pendentes de aprovação (para badge no painel admin).
   * @returns {Array}
   */
  function listarPendentes() {
    return _lerRegistros().filter(function(r) { return r.status === 'pendente'; });
  }

  /**
   * Registra o superadmin inicial (primeiro usuário do sistema).
   * Chamado durante inicializarSistema(). Seguro chamar múltiplas vezes.
   *
   * @param {string} emailAdmin
   */
  function registrarSuperAdmin(emailAdmin) {
    if (!emailAdmin) return;
    var emailNorm = String(emailAdmin).toLowerCase().trim();
    var registros = _lerRegistros();
    var existente = registros.find(function(r) {
      return String(r.email || '').toLowerCase() === emailNorm;
    });
    if (existente) {
      var changed = false;
      if (existente.status !== 'ativo') { existente.status = 'ativo'; changed = true; }
      if (existente.papel !== 'admin' && existente.papel !== 'superadmin') { existente.papel = 'admin'; changed = true; }
      if (changed) _salvarRegistros(registros);
      return;
    }
    registros.push({
      email:        emailNorm,
      nome:         'Administrador',
      setorDesejado: 'direcao',
      status:       'ativo',
      papel:        'admin',
      setor:        'direcao',
      solicitadoEm: new Date().toISOString(),
      aprovadoEm:   new Date().toISOString(),
      aprovadoPor:  'sistema'
    });
    _salvarRegistros(registros);
    Logger.info('acesso_service', 'registrarSuperAdmin', 'SuperAdmin registrado: ' + emailNorm);
  }

  // ── Notificações internas ─────────────────────────────────────────────────

  function _notificarAdmin(registro) {
    try {
      var adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '';
      if (!adminEmail || !adminEmail.includes('@')) return;
      var org = getOrgConfig();
      var assunto = '[' + org.nome + '] Solicitação de acesso — ' + registro.nome;
      var corpo = 'Nova solicitação de acesso ao sistema:\n\n' +
        'Email: '         + registro.email        + '\n' +
        'Nome: '          + registro.nome          + '\n' +
        'Setor desejado: '+ (registro.setorDesejado || 'não informado') + '\n' +
        'Data/hora: '     + registro.solicitadoEm  + '\n\n' +
        'Acesse o painel administrativo para aprovar ou rejeitar.\n\n— ' + org.nome;
      GmailApp.sendEmail(adminEmail, assunto, corpo);
    } catch (e) {
      Logger.warn('acesso_service', '_notificarAdmin', 'Falha ao notificar admin: ' + e.message);
    }
  }

  function _notificarAprovado(registro) {
    try {
      if (!registro.email || !registro.email.includes('@')) return;
      if (typeof EMAILS_BLOQUEADOS_DESLIGAMENTO_ATIVO !== 'undefined' &&
          Array.isArray(EMAILS_BLOQUEADOS_DESLIGAMENTO_ATIVO) &&
          EMAILS_BLOQUEADOS_DESLIGAMENTO_ATIVO.indexOf(String(registro.email).toLowerCase().trim()) !== -1) return;
      var org = getOrgConfig();
      var assunto = '[' + org.nome + '] Seu acesso foi liberado!';
      var corpo = 'Olá, ' + registro.nome + '!\n\n' +
        'Seu acesso ao sistema ' + org.nome + ' foi aprovado.\n\n' +
        'Papel: '  + (registro.papel || 'colaborador') + '\n' +
        'Setor: '  + (registro.setor  || 'a definir')  + '\n\n' +
        'Acesse o sistema normalmente — seu login já está ativo.\n\n— ' + org.nome;
      GmailApp.sendEmail(registro.email, assunto, corpo);
    } catch (e) {
      Logger.warn('acesso_service', '_notificarAprovado', 'Falha ao notificar usuário: ' + e.message);
    }
  }

  // ── API pública ─────────────────────────────────────────────────────────────

  return {
    verificar:          verificar,
    solicitarAcesso:    solicitarAcesso,
    aprovarAcesso:      aprovarAcesso,
    revogarAcesso:      revogarAcesso,
    listarUsuarios:     listarUsuarios,
    listarPendentes:    listarPendentes,
    registrarSuperAdmin:registrarSuperAdmin
  };

})();

// ── Bridge global (chamadas via google.script.run) ─────────────────────────────

function ctrl_acesso_verificar() {
  return GasResponse.wrap(function () {
    var email = getEmailSessao();
    return AcessoService.verificar(email);
  }, 'ctrl_acesso_verificar');
}

function ctrl_acesso_solicitar(dados) {
  return GasResponse.wrap(function () {
    var email = getEmailSessao();
    return AcessoService.solicitarAcesso(Object.assign(dados || {}, { email: email }));
  }, 'ctrl_acesso_solicitar');
}

function ctrl_acesso_listarPendentes() {
  return GasResponse.wrap(function () {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);

    if (acesso.status !== 'ativo') {
      throw new Error('Acesso negado: usuário não está ativo no sistema.');
    }

    // Verificar papel admin diretamente no registro do AcessoService (funciona mesmo sem PermissoesV2Engine)
    var papel   = acesso.registro && acesso.registro.papel ? acesso.registro.papel : '';
    var ehAdmin = (papel === 'admin' || papel === 'superadmin');

    // Fallback: PermissoesService (depende de PermissoesV2Engine — pode não estar disponível)
    if (!ehAdmin && typeof PermissoesService !== 'undefined') {
      try { ehAdmin = PermissoesService.isAdmin(email); } catch(e) {}
    }

    // Último fallback: superadmin configurado em PropertiesService
    if (!ehAdmin) {
      var superAdmin = (PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '').toLowerCase();
      ehAdmin = superAdmin && email.toLowerCase() === superAdmin;
    }

    if (!ehAdmin) {
      throw new Error('Acesso negado: apenas administradores podem listar pendentes.');
    }

    return AcessoService.listarPendentes();
  }, 'ctrl_acesso_listarPendentes');
}

function ctrl_acesso_aprovar(params) {
  return GasResponse.wrap(function () {
    var emailAdmin = getEmailSessao();
    return AcessoService.aprovarAcesso(Object.assign(params || {}, { emailAdmin: emailAdmin }));
  }, 'ctrl_acesso_aprovar');
}

function ctrl_acesso_revogar(params) {
  return GasResponse.wrap(function () {
    var emailAdmin = getEmailSessao();
    var acessoCaller = AcessoService.verificar(emailAdmin);
    var papelCaller  = acessoCaller && acessoCaller.registro ? (acessoCaller.registro.papel || '') : '';

    // Admin não pode revogar admin nem superadmin
    if (papelCaller !== 'superadmin' && (papelCaller === 'admin' || papelCaller !== '')) {
      var listaAtual = AcessoService.listarUsuarios();
      var alvoAtual  = listaAtual.find(function(u) { return u.email === (params && params.emailAlvo); });
      var alvoPapel  = alvoAtual ? (alvoAtual.papel || 'colaborador') : 'colaborador';
      if (alvoPapel === 'admin' || alvoPapel === 'superadmin') {
        throw new Error('Apenas SuperAdmin pode revogar usuários com papel admin ou superadmin.');
      }
    }
    return AcessoService.revogarAcesso(Object.assign(params || {}, { emailAdmin: emailAdmin }));
  }, 'ctrl_acesso_revogar');
}

function ctrl_acesso_listarTodos() {
  return GasResponse.wrap(function () {
    var email = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    var papel  = acesso && acesso.registro ? (acesso.registro.papel || '') : '';
    var ehAdmin = (papel === 'admin' || papel === 'superadmin');
    if (!ehAdmin) {
      var superAdmin = (PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '').toLowerCase();
      ehAdmin = superAdmin && email.toLowerCase() === superAdmin;
    }
    if (!ehAdmin) throw new Error('Acesso negado: apenas administradores podem listar todos os usuários.');
    return AcessoService.listarUsuarios();
  }, 'ctrl_acesso_listarTodos');
}

function ctrl_acesso_editarPapel(params) {
  return GasResponse.wrap(function () {
    var emailAdmin = getEmailSessao();
    var acesso = AcessoService.verificar(emailAdmin);
    var papel  = acesso && acesso.registro ? (acesso.registro.papel || '') : '';
    var ehAdmin = (papel === 'admin' || papel === 'superadmin');
    if (!ehAdmin) {
      var superAdmin = (PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '').toLowerCase();
      ehAdmin = superAdmin && emailAdmin.toLowerCase() === superAdmin;
    }
    if (!ehAdmin) throw new Error('Acesso negado: apenas administradores podem editar papéis.');
    if (!params || !params.email) throw new Error('Email do usuário é obrigatório.');

    var PAPEIS_VALIDOS = [
      'colaborador', 'habilitador', 'rh', 'financeiro',
      'comunicacao', 'coordenador', 'gestor', 'admin', 'superadmin'
    ];
    if (params.papel && PAPEIS_VALIDOS.indexOf(params.papel) === -1)
      throw new Error('Papel inválido: ' + params.papel + '. Válidos: ' + PAPEIS_VALIDOS.join(', '));

    // Hierarquia: admin não pode editar admin/superadmin; só superadmin pode
    var papelCaller = acesso && acesso.registro ? (acesso.registro.papel || '') : '';
    if (papelCaller !== 'superadmin') {
      var PAPEIS_RESTRITOS = ['admin', 'superadmin'];
      // Verificar papel atual do alvo antes de permitir edição
      var listaAtual = AcessoService.listarUsuarios();
      var alvoAtual  = listaAtual.find(function(u) { return u.email === params.email; });
      var alvoPapel  = alvoAtual ? (alvoAtual.papel || 'colaborador') : 'colaborador';
      if (PAPEIS_RESTRITOS.indexOf(alvoPapel) !== -1) {
        throw new Error('Apenas SuperAdmin pode editar usuários com papel admin ou superadmin.');
      }
      if (params.papel && PAPEIS_RESTRITOS.indexOf(params.papel) !== -1) {
        throw new Error('Apenas SuperAdmin pode atribuir papel admin ou superadmin.');
      }
    }

    modifyJSON('usuarios_acesso.json', function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var usr = lista.find(function(u) { return u.email === params.email; });
      if (!usr) throw new Error('Usuário não encontrado: ' + params.email);
      if (params.papel)  usr.papel  = params.papel;
      if (params.setor !== undefined) usr.setor = params.setor || '';
      if (params.setoresGerenciados !== undefined) {
        usr.setoresGerenciados = Array.isArray(params.setoresGerenciados)
          ? params.setoresGerenciados
          : [];
      }
      if (params.status) usr.status = params.status;
      // permissoesOverride: null ou {} remove overrides, objeto define overrides por módulo
      if (params.permissoesOverride !== undefined) {
        usr.permissoesOverride = (params.permissoesOverride && Object.keys(params.permissoesOverride).length > 0)
          ? params.permissoesOverride
          : null;
      }
      // featuresOverride: null ou {} remove overrides, objeto define features por módulo
      if (params.featuresOverride !== undefined) {
        usr.featuresOverride = (params.featuresOverride && Object.keys(params.featuresOverride).length > 0)
          ? params.featuresOverride
          : null;
      }
      usr.atualizadoEm = agora();
      usr.atualizadoPor = emailAdmin;
      return lista;
    });

    // Invalida o cache de boot do usuário editado para refletir novas permissões
    try { BootService.limparCache(params.email); } catch(_e) {}

    // Propagar setor para colaboradores.json (fonte canônica de RH)
    if (params.setor !== undefined && typeof ColaboradorRepository !== 'undefined') {
      try {
        var _orgCfg = getOrgConfig();
        var _colabs = ColaboradorRepository.listar(_orgCfg.orgId);
        var _emailAlvoLower = (params.email || '').toLowerCase();
        var _colab = _colabs.filter(function(c){
          return (c.emailInstitucional||c.email||'').toLowerCase() === _emailAlvoLower;
        })[0];
        if (_colab && _colab.setor !== (params.setor || '')) {
          _colab.setor = params.setor || '';
          ColaboradorRepository.atualizar(_orgCfg.orgId, _colab.id, _colab);
        }
      } catch(_e) {}
    }

    AuditoriaService.registrar('USUARIO_PAPEL_EDITADO', 'acesso',
      { email: params.email, papel: params.papel, setor: params.setor, admin: emailAdmin });
    return { ok: true, email: params.email, papel: params.papel };
  }, 'ctrl_acesso_editarPapel');
}
