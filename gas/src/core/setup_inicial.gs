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

  // ── 1. Definir propriedades organizacionais ─────────────────────────────
  var config = {
    'ORG_NOME':           'CCBJ',
    'ORG_NOME_COMPLETO':  'Centro Cultural Bom Jardim',
    'ORG_SISTEMA_TITULO': 'Sistema CCBJ',
    'ORG_DOMINIO':        'idm.org.br',
    'ADMIN_EMAIL':        'joao.barros@idm.org.br',
    'IA_ASSISTENTE_NOME': 'Bêjotinha',
    'ORG_TIMEZONE':       'America/Fortaleza',
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

  console.log('[setup] ✅ Setup inicial concluído. Próximo passo: deployar como Web App.');
}
