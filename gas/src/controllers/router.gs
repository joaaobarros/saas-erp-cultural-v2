/**
 * @file controllers/router.gs
 * @layer controllers
 * @description Ponto de entrada HTTP do sistema.
 *
 * SEPARAÇÃO CRÍTICA:
 *   - ?secao=app (ou ausente)  → App interno autenticado (SPA)
 *   - ?secao=pauta             → Portal público: formulário de cessão de pauta
 *   - ?secao=pauta_status      → Portal público: acompanhamento de protocolo
 *   - ?secao=inscricao         → Portal público: inscrição em ação
 *   - ?secao=aprovacao         → Aprovação via link de email (token)
 *   - ?secao=agenda            → Agenda pública de eventos
 *
 * Contextos públicos NÃO usam Session.getActiveUser().
 * Contextos públicos NÃO expõem dados internos.
 */

function doGet(e) {
  var params = e ? e.parameter || {} : {};
  var secao  = params.secao || 'app';

  try {
    switch (secao) {
      case 'app':
        return _renderAppInterno(e);

      case 'pauta':
        return _renderPortalPublico('cessao_pauta', e);

      case 'pauta_status':
        return _renderPortalPublico('pauta_status', e);

      case 'inscricao':
        return _renderPortalPublico('inscricao', e);

      case 'aprovacao':
        return _renderPortalPublico('aprovacao', e);

      case 'agenda':
        return _renderPortalPublico('agenda', e);

      case 'health':
        return _renderHealth();

      default:
        return _render404();
    }
  } catch (err) {
    Logger.error('router', 'doGet', err.message);
    return _renderErro(err.message);
  }
}

// ─── App Interno ──────────────────────────────────────────────────────────────

function _renderAppInterno(e) {
  // CAMADA 1 — Verificação de acesso em dois níveis:
  //   (a) domínio autorizado   → configurado via PropertiesService:ORG_DOMINIO
  //   (b) cadastro interno aprovado → AcessoService (usuarios_acesso.json)
  var email   = getEmailOuNull();
  var acesso  = AcessoService.verificar(email || '');

  switch (acesso.status) {

    case 'ativo':
      // Usuário aprovado — renderiza SPA normalmente
      var template = HtmlService.createTemplateFromFile('frontend/index');
      template.orgConfig = getPublicOrgConfig();
      template.usuarioEmail = email;
      return template.evaluate()
        .setTitle(getOrgConfig().titulo)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');

    case 'pendente_aprovacao':
      // Usuário do domínio sem cadastro aprovado — tela de primeiro acesso
      var tplPendente = HtmlService.createTemplateFromFile('frontend/primeiro_acesso');
      tplPendente.orgConfig  = getPublicOrgConfig();
      tplPendente.email      = email || '';
      tplPendente.mensagem   = acesso.mensagem;
      tplPendente.jaSolicitou = !!(acesso.registro && acesso.registro.status === 'pendente');
      tplPendente.setores    = SistemaConfigService.getSetores()
        .map(function(s) { return { id: s.id, label: s.label }; });
      return tplPendente.evaluate()
        .setTitle(getOrgConfig().titulo + ' — Acesso')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');

    case 'dominio_negado':
    case 'inativo':
    default:
      // Acesso negado — página de erro simples
      return HtmlService.createHtmlOutput(
        '<!DOCTYPE html><html lang="pt-BR"><head>' +
        '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>Acesso Negado — ' + getOrgConfig().titulo + '</title>' +
        '<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;' +
        'min-height:100vh;margin:0;background:#f8fafc;}' +
        '.box{text-align:center;padding:2rem;max-width:420px;}' +
        'h1{color:#dc2626;font-size:1.25rem;margin-bottom:.75rem;}' +
        'p{color:#374151;line-height:1.6;}</style>' +
        '</head><body><div class="box">' +
        '<h1>⚠️ Acesso Negado</h1>' +
        '<p>' + acesso.mensagem + '</p>' +
        '</div></body></html>'
      ).setTitle('Acesso Negado — ' + getOrgConfig().titulo);
  }
}

// ─── Portal Público ───────────────────────────────────────────────────────────

function _renderPortalPublico(secao, e) {
  // Rate limiting básico: bloquear múltiplos requests do mesmo user-agent em 1 minuto
  // Fase 7: implementar rate limiting real + CSRF token
  var template = HtmlService.createTemplateFromFile('portal/portal_' + secao);
  template.orgConfig = getPublicOrgConfig();
  template.params    = e ? e.parameter || {} : {};
  return template.evaluate()
    .setTitle(getOrgConfig().titulo + ' — Portal')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── Health Check ─────────────────────────────────────────────────────────────

function _renderHealth() {
  var status = verificarTodasAbas();
  return ContentService
    .createTextOutput(JSON.stringify({ ok: status.ok, percentual: status.percentual, timestamp: agora() }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Erros ────────────────────────────────────────────────────────────────────

function _render404() {
  return HtmlService.createHtmlOutput('<h1>Página não encontrada</h1>')
    .setTitle('404 — ' + getOrgConfig().titulo);
}

function _renderErro(mensagem) {
  return HtmlService.createHtmlOutput('<h1>Erro interno</h1><p>' + mensagem + '</p>')
    .setTitle('Erro — ' + getOrgConfig().titulo);
}

// ─── Bridge GAS (chamados pelo frontend via google.script.run) ────────────────
// REGRA: nunca expor google.script.run diretamente no frontend.
// Todas as chamadas passam pelo namespace GAS definido no frontend.
// Os controllers reais ficam em controllers/<modulo>_controller.gs

function ctrl_sistema_getBootstrap() {
  // BootService.obter() retorna a estrutura completa que o frontend espera:
  // { orgId, orgConfig, usuarioEmail, modulosAtivos, setores, espacos, itens, permissoes, timestamp }
  return GasResponse.wrap(function() {
    return BootService.obter();
  }, 'ctrl_sistema_getBootstrap');
}

function ctrl_sistema_verificarSaude() {
  return GasResponse.wrap(function() {
    return verificarTodasAbas();
  }, 'ctrl_sistema_verificarSaude');
}

// ─── Utilitário de include (usado pelos templates HtmlService) ────────────────
/**
 * Inclui o conteúdo de um arquivo HTML parcial dentro de um template GAS.
 * Uso nos templates: <?!= include('shared/btnguard'); ?>
 *
 * @param {string} arquivo — caminho relativo à raiz dos arquivos GAS (sem .html)
 * @returns {string} Conteúdo HTML do arquivo
 */
function include(arquivo) {
  return HtmlService.createTemplateFromFile(arquivo).getRawContent();
}
