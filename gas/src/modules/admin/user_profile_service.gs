/**
 * @file modules/admin/user_profile_service.gs
 * @layer modules/admin
 * @description Perfil do usuário: setor, preferências e identidade.
 *
 * DIFERENÇA do legado:
 *   - usa _getSheet(spreadsheetKey, nomeAba) com chave de PropertiesService
 *   - verifica permissão via PermissoesService em vez de consulta direta à aba Administradores
 *   - orgId em todas as operações
 *
 * @depends core/auth_session.gs, core/utils.gs, core/services/permissoes_service.gs
 */

var UserProfileService = (function () {

  // ─── Setor ────────────────────────────────────────────────────────────────

  /**
   * Retorna o setor do usuário.
   * Busca em PreferenciasUsuarios; fallback ao setor registrado em PermissoesService.
   */
  function obterSetor(email) {
    if (!email || email.indexOf('@') === -1) return '';
    var emailNorm = String(email).trim().toLowerCase();

    var prefSetor = obterPreferencia('setor_usuario', email);
    if (prefSetor) return prefSetor;

    try {
      if (typeof PermissoesService !== 'undefined') {
        var orgId = getOrgConfig().orgId;
        var info  = PermissoesService.obterPermissoesUsuario(emailNorm, orgId);
        if (info && info.setor) return info.setor;
      }
    } catch(e) {}

    return '';
  }

  /**
   * Salva setor do usuário em PreferenciasUsuarios.
   * Admin pode alterar setor de qualquer usuário. Usuário comum só o próprio.
   */
  function salvarSetor(emailAlvo, setor, emailSolicitante) {
    _assertEmailValido(emailAlvo, 'emailAlvo');
    _assertEmailValido(emailSolicitante, 'emailSolicitante');

    var orgId       = getOrgConfig().orgId;
    var ehAdmin     = typeof PermissoesService !== 'undefined'
      ? PermissoesService.ehAdmin(emailSolicitante, orgId)
      : false;
    var mesmoUsuario = String(emailAlvo).toLowerCase() === String(emailSolicitante).toLowerCase();

    if (!ehAdmin && !mesmoUsuario)
      throw new Error('Sem permissão para alterar setor de outro usuário.');

    salvarPreferencia('setor_usuario', String(setor || '').trim(), emailAlvo);

    Logger.info('user_profile_service', 'salvarSetor',
      emailAlvo + ' → ' + setor + ' (por: ' + emailSolicitante + ')');
    return true;
  }

  // ─── Preferências ─────────────────────────────────────────────────────────

  /**
   * Salva preferência chave/valor para o usuário.
   * @param {string} chave
   * @param {*} valor
   * @param {string} [emailOverride] — usa sessão ativa se ausente
   */
  function salvarPreferencia(chave, valor, emailOverride) {
    var email = emailOverride
      ? String(emailOverride).trim().toLowerCase()
      : getEmailSessao().toLowerCase();
    if (!email || !chave) return;

    var aba   = _getSheet('SHEET_ID_MASTER', 'PreferenciasUsuarios');
    if (!aba) throw new Error('Aba PreferenciasUsuarios não encontrada.');

    var valorStr = typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
    var dados    = aba.getLastRow() > 1 ? aba.getDataRange().getValues() : [[]];

    for (var i = 1; i < dados.length; i++) {
      if (String(dados[i][0]).toLowerCase() === email && String(dados[i][1]) === chave) {
        aba.getRange(i + 1, 3).setValue(valorStr);
        aba.getRange(i + 1, 4).setValue(agora());
        return;
      }
    }
    aba.appendRow([email, chave, valorStr, agora()]);
  }

  /**
   * Lê preferência chave para o usuário.
   * @param {string} chave
   * @param {string} [emailOverride]
   * @returns {string|null}
   */
  function obterPreferencia(chave, emailOverride) {
    var email = emailOverride
      ? String(emailOverride).trim().toLowerCase()
      : getEmailOuNull();
    if (!email || !chave) return null;

    var aba   = _getSheet('SHEET_ID_MASTER', 'PreferenciasUsuarios');
    if (!aba || aba.getLastRow() < 2) return null;

    var dados = aba.getDataRange().getValues();
    for (var i = 1; i < dados.length; i++) {
      if (String(dados[i][0]).toLowerCase() === email && String(dados[i][1]) === chave) {
        return String(dados[i][2] || '') || null;
      }
    }
    return null;
  }

  // ─── Perfil de identidade ─────────────────────────────────────────────────

  /**
   * Retorna nome e foto do usuário via Google People API.
   * Nunca lança erro — retorna perfil mínimo em caso de falha.
   */
  function obterPerfil() {
    try {
      var email = getEmailSessao();
      var nome  = email.split('@')[0];
      var foto  = null;
      try {
        var res  = UrlFetchApp.fetch(
          'https://people.googleapis.com/v1/people/me?personFields=names,photos',
          { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }
        );
        var data = JSON.parse(res.getContentText());
        nome = (data.names && data.names[0] && data.names[0].displayName) || nome;
        foto = (data.photos && data.photos[0] && data.photos[0].url) || null;
      } catch(e) {}
      return { email: email, nome: nome, foto: foto };
    } catch(e) {
      throw new Error('Perfil indisponível: ' + e.message);
    }
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  function _assertEmailValido(email, campo) {
    if (!email || String(email).indexOf('@') === -1)
      throw new Error(campo + ' inválido: ' + email);
  }

  return {
    obterSetor:        obterSetor,
    salvarSetor:       salvarSetor,
    salvarPreferencia: salvarPreferencia,
    obterPreferencia:  obterPreferencia,
    obterPerfil:       obterPerfil
  };

})();
