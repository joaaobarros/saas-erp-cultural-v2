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
  // Fase 0: retorna shell HTML da SPA
  // Fase 0: verificar módulos ativos via ModulosRegistryService
  var template = HtmlService.createTemplateFromFile('frontend/index');
  template.orgConfig = getPublicOrgConfig();
  return template.evaluate()
    .setTitle(getOrgConfig().titulo)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.SAMEORIGIN)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
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
  return GasResponse.wrap(function() {
    return {
      orgConfig:   getPublicOrgConfig(),
      modulosAtivos: typeof ModulosRegistryService !== 'undefined'
        ? ModulosRegistryService.listarAtivos()
        : [],
      usuario: {
        email:   getEmailOuNull(),
        setores: []
      }
    };
  }, 'ctrl_sistema_getBootstrap');
}

function ctrl_sistema_verificarSaude() {
  return GasResponse.wrap(function() {
    return verificarTodasAbas();
  }, 'ctrl_sistema_verificarSaude');
}
