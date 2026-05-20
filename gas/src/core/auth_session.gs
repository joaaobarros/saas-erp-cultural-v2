/**
 * @file core/auth_session.gs
 * @layer core
 * @description Sessão e autenticação do usuário interno.
 *
 * MODELO DE AUTENTICAÇÃO:
 *   webapp: executeAs=USER_DEPLOYING + access=DOMAIN
 *
 *   Por que USER_DEPLOYING (não USER_ACCESSING)?
 *   - USER_ACCESSING exige que cada usuário autorize os OAuth scopes — cria fricção.
 *   - Com USER_DEPLOYING em um Google Workspace (G Suite) de domínio + access:DOMAIN,
 *     Session.getActiveUser().getEmail() retorna o email do VISITANTE (não do deployer),
 *     pois o Workspace autentica o usuário antes de servir o webapp.
 *   - O script roda com as permissões do deployer (acesso total aos dados), mas a
 *     identidade do visitante é rastreada corretamente pelo Google.
 *
 *   Controle de acesso em 2 camadas (AcessoService):
 *   1. Domínio: email deve ser do domínio configurado (ORG_DOMINIO, ex: @idm.org.br)
 *   2. Cadastro: usuário deve ter registro aprovado em usuarios_acesso.json
 *      - Primeiro acesso → tela "solicitar acesso"
 *      - Admin aprova → acesso completo com perfil/setor atribuído
 *
 * REGRA: todo controller deve obter o email via getEmailSessao() antes de qualquer operação.
 * Contexto do portal externo (sem autenticação) NÃO usa esta função — usa token anônimo.
 */

/**
 * Retorna email do usuário autenticado. Lança erro se sessão inválida.
 * @returns {string} email
 */
function getEmailSessao() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) throw new Error('Sessão inválida — email não disponível.');
    return email;
  } catch (e) {
    Logger.error('auth_session', 'getEmailSessao', e.message);
    throw new Error('Não foi possível identificar o usuário. Faça login novamente.');
  }
}

/**
 * Retorna email ou null (sem lançar exceção). Útil para contextos opcionais.
 */
function getEmailOuNull() {
  try {
    return Session.getActiveUser().getEmail() || null;
  } catch (e) {
    return null;
  }
}

/**
 * Verifica se o email pertence ao domínio autorizado da organização.
 * @param {string} email
 * @returns {boolean}
 */
function emailDoDominiAutorizado(email) {
  var dominio = getOrgConfig().dominio;
  if (!dominio) return true; // sem restrição de domínio configurada
  return (email || '').toLowerCase().endsWith('@' + dominio.toLowerCase());
}
