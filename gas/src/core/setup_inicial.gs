/**
 * @file core/setup_inicial.gs
 * @description Configuração inicial one-time para o CCBJ.
 *
 * USAR UMA VEZ APENAS: Executar no editor GAS antes da primeira implantação.
 *
 * O que faz:
 *  1. Define todas as Script Properties obrigatórias para o CCBJ
 *  2. Chama inicializarSistema() — cria abas, registra superadmin
 *  3. Exibe resultado no log (View > Logs ou Ctrl+Enter)
 *
 * COMO EXECUTAR:
 *  Abrir editor GAS → selecionar função "setupInicialCCBJ" → ▶ Executar
 *
 * SEGURANÇA: este arquivo pode ser excluído após a execução bem-sucedida.
 * As Properties ficam persistidas no PropertiesService mesmo sem o arquivo.
 */

/**
 * Executa PRIMEIRO se setupInicialCCBJ falhar com erro de DriveApp.
 * Força a re-autorização dos escopos Drive — necessário quando os scopes foram
 * adicionados ao appsscript.json APÓS a primeira autorização do script.
 *
 * Como usar: selecionar esta função → ▶ Executar → aceitar as permissões.
 * Depois rodar setupInicialCCBJ() novamente.
 */
function autorizarDrive() {
  var pasta = DriveApp.getRootFolder();
  console.log('[autorizarDrive] OK — pasta raiz: ' + pasta.getName());
  console.log('[autorizarDrive] Autorização Drive concluída. Execute setupInicialCCBJ() agora.');
}

/**
 * Setup inicial completo para o CCBJ.
 * Executa UMA vez no editor GAS antes do primeiro deploy.
 * Se falhar com erro de DriveApp: executar autorizarDrive() primeiro.
 */
function setupInicialCCBJ() {
  var props = PropertiesService.getScriptProperties();

  // ── 1. Definir propriedades organizacionais CCBJ ───────────────────────
  var config = {
    'ORG_NOME':           'CCBJ',
    'ORG_NOME_COMPLETO':  'Centro Cultural Bom Jardim',
    'ORG_SISTEMA_TITULO': 'Sistema CCBJ',
    'ORG_DOMINIO':        'idm.org.br',
    'ADMIN_EMAIL':        'joao.barros@idm.org.br',
    'IA_ASSISTENTE_NOME': 'Bêjotinha',
    'ORG_TIMEZONE':       'America/Fortaleza',
    // Template de planta arquitetônica do campus CCBJ
    'ORG_MAPA_TEMPLATE':  'shared/mapa_ccbj',
    // ORG_LOGO_URL e GROQ_API_KEY: definir manualmente depois
  };

  props.setProperties(config);
  console.log('[setup] Script Properties definidas: ' + Object.keys(config).join(', '));

  // ── 2. Inicializar sistema ──────────────────────────────────────────────
  console.log('[setup] Chamando inicializarSistema()...');
  try {
    var resultado = inicializarSistema();
    console.log('[setup] inicializarSistema() concluído:');
    console.log(JSON.stringify(resultado, null, 2));
  } catch (e) {
    console.error('[setup] Erro em inicializarSistema(): ' + e.message);
    throw e;
  }

  // ── 3. Verificar abas ──────────────────────────────────────────────────
  console.log('[setup] Verificando abas...');
  try {
    var verificacao = verificarTodasAbas();
    console.log('[setup] verificarTodasAbas(): ' + verificacao.percentual + '% (' + verificacao.ok + ')');
    if (!verificacao.ok) {
      console.warn('[setup] ATENÇÃO: algumas abas não passaram na verificação:');
      (verificacao.falhas || []).forEach(function(f) { console.warn('  ✗ ' + f); });
    } else {
      console.log('[setup] ✅ Todas as abas verificadas com sucesso!');
    }
  } catch (e) {
    console.warn('[setup] verificarTodasAbas() falhou: ' + e.message);
  }

  // ── 4. Seeds específicos do CCBJ ──────────────────────────────────────
  // Esses seeds são exclusivos do CCBJ e não fazem parte do inicializarSistema()
  // genérico. Idempotentes: ignoram registros já existentes.
  console.log('[setup] Aplicando seeds CCBJ...');
  try { setup_espacos_iniciais();             console.log('[setup] ✅ Espaços do campus.'); }
  catch(e) { console.warn('[setup] Espaços: ' + e.message); }
  try { setup_pccs_inicial();                 console.log('[setup] ✅ PCC/IDM 2025.'); }
  catch(e) { console.warn('[setup] PCC: ' + e.message); }
  try { setup_categorias_itens_iniciais();    console.log('[setup] ✅ Categorias de itens.'); }
  catch(e) { console.warn('[setup] Categorias: ' + e.message); }
  try { setup_itens_almoxarifado_iniciais();  console.log('[setup] ✅ Itens de almoxarifado.'); }
  catch(e) { console.warn('[setup] Almoxarifado: ' + e.message); }

  console.log('[setup] ✅ Setup inicial CCBJ concluído.');
}

/**
 * Define ORG_MAPA_TEMPLATE para o CCBJ (idempotente).
 * Executar no GAS Editor uma vez após este deploy para ativar o mapa.
 */
function setarMapaTemplateCCBJ() {
  PropertiesService.getScriptProperties().setProperty('ORG_MAPA_TEMPLATE', 'shared/mapa_ccbj');
  console.log('[setup] ORG_MAPA_TEMPLATE = shared/mapa_ccbj');
  return { ok: true };
}

/**
 * Registra joao.barros@idm.org.br como superadmin explicitamente.
 * Seguro chamar múltiplas vezes (idempotente).
 * Executar no GAS Editor sempre que precisar garantir acesso do superadmin.
 */
function registrarSuperAdminCCBJ() {
  var email = 'joao.barros@idm.org.br';

  // Garante criação do registro (status ativo, papel admin)
  AcessoService.registrarSuperAdmin(email);

  // Eleva papel para 'superadmin' e preenche nome canônico
  modifyJSON('usuarios_acesso.json', function(lista) {
    if (!Array.isArray(lista)) return lista;
    var usr = lista.find(function(u) {
      return String(u.email || '').toLowerCase().trim() === email;
    });
    if (usr) {
      usr.papel = 'superadmin';
      if (!usr.nome || usr.nome === 'Administrador') usr.nome = 'João Barros';
    }
    return lista;
  });

  // Garante ADMIN_EMAIL no PropertiesService (fallback de auth)
  PropertiesService.getScriptProperties().setProperty('ADMIN_EMAIL', email);

  Logger.info('setup_inicial', 'registrarSuperAdminCCBJ', 'SuperAdmin registrado: ' + email);
  console.log('[setup] ✅ SuperAdmin registrado: ' + email + ' | papel: superadmin');
  return { ok: true, email: email, papel: 'superadmin' };
}
