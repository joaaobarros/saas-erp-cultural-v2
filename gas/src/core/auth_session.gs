/**
 * @file core/auth_session.gs
 * @layer core
 * @description Sessão e autenticação do usuário interno.
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
