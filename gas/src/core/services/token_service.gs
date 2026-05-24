/**
 * @file core/services/token_service.gs
 * @layer core/services
 * @description Serviço de tokens de ação para aprovação por link de email.
 *
 * Gera tokens únicos persistidos em MASTER.Tokens (aba do Sheet).
 * Cada token tem TTL de 72h e é idempotente: usado duas vezes retorna "já processado".
 *
 * Fluxo:
 *   1. Engine/controller gera token via TokenService.gerar(dados)
 *   2. NotificationEngine inclui link ?secao=token_acao&token=X&acao=Y no email
 *   3. Usuário clica → doGet → router chama TokenService.validar(token)
 *   4. Se válido: executa a ação correspondente; TokenService.marcarUsado(token)
 *
 * Tipos suportados:
 *   - aprovacao_ferias          → AcessoService / PessoasEngine
 *   - aprovacao_remanejamento   → RemanejamentoEngine
 *   - aprovacao_aditivo         → AditivoEngine
 *   - aprovacao_solicitacao     → SolicitacaoEngine
 *   - aprovacao_cessao_pauta    → SolicitacaoReservaEngine
 *
 * @depends core/data_layer.gs (lerJSON/salvarJSON), core/logger.gs
 */

var TokenService = (function () {

  var ABA_TOKENS   = 'Tokens';
  var TTL_HORAS    = 72;

  // ─── Geração ──────────────────────────────────────────────────────────────

  /**
   * Gera um token de ação e persiste na aba MASTER.Tokens.
   *
   * @param {Object} dados — { tipo, entidadeId, acao, emailDestinatario, orgId, extras }
   * @returns {string} token gerado
   */
  function gerar(dados) {
    dados = dados || {};
    var token     = _gerarCodigo();
    var agora     = new Date();
    var expira    = new Date(agora.getTime() + TTL_HORAS * 3600 * 1000);

    try {
      var sheet = _getSheet();
      if (!sheet) throw new Error('Aba Tokens não encontrada');
      sheet.appendRow([
        token,
        dados.tipo         || '',
        dados.entidadeId   || '',
        dados.acao         || '',
        dados.emailDestinatario || '',
        dados.orgId        || '',
        JSON.stringify(dados.extras || {}),
        agora.toISOString(),
        expira.toISOString(),
        ''  // usadoEm — vazio enquanto não utilizado
      ]);
      Logger.info('token_service', 'gerar', 'Token gerado: ' + token + ' / tipo: ' + dados.tipo);
    } catch (e) {
      Logger.warn('token_service', 'gerar', e.message);
    }

    return token;
  }

  // ─── Validação ────────────────────────────────────────────────────────────

  /**
   * Valida um token recebido por link.
   *
   * @param {string} token
   * @returns {{ valido: boolean, expirado: boolean, jaUsado: boolean, dados: Object }}
   */
  function validar(token) {
    var resultado = { valido: false, expirado: false, jaUsado: false, dados: null };
    if (!token) return resultado;

    try {
      var linha = _encontrarLinha(token);
      if (!linha) return resultado;

      var expira   = new Date(linha[8]);
      var usadoEm  = linha[9] ? String(linha[9]) : '';

      if (usadoEm) {
        resultado.jaUsado = true;
        return resultado;
      }

      if (new Date() > expira) {
        resultado.expirado = true;
        return resultado;
      }

      resultado.valido = true;
      resultado.dados  = {
        token:             linha[0],
        tipo:              linha[1],
        entidadeId:        linha[2],
        acao:              linha[3],
        emailDestinatario: linha[4],
        orgId:             linha[5],
        extras:            _parseJSON(linha[6]),
        criadoEm:          linha[7],
        expiraEm:          linha[8]
      };
    } catch (e) {
      Logger.warn('token_service', 'validar', e.message);
    }

    return resultado;
  }

  /**
   * Marca token como usado (idempotente).
   * @param {string} token
   */
  function marcarUsado(token) {
    try {
      var sheet = _getSheet();
      if (!sheet || sheet.getLastRow() < 2) return;
      var tokens = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < tokens.length; i++) {
        if (String(tokens[i][0]) === String(token)) {
          sheet.getRange(i + 2, 10).setValue(new Date().toISOString());
          return;
        }
      }
    } catch (e) {
      Logger.warn('token_service', 'marcarUsado', e.message);
    }
  }

  // ─── Setup ────────────────────────────────────────────────────────────────

  /**
   * Garante aba Tokens na planilha MASTER.
   * Chamado por setup.gs durante inicializarSistema().
   */
  function garantirAbaTokens() {
    try {
      var sheet = _getSheet();
      if (sheet && sheet.getLastRow() >= 1) return;
      if (!sheet) return;
      sheet.appendRow(['token', 'tipo', 'entidade_id', 'acao', 'email_destinatario',
                       'org_id', 'extras_json', 'criado_em', 'expira_em', 'usado_em']);
      sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
      Logger.info('token_service', 'garantirAbaTokens', 'Aba Tokens criada.');
    } catch (e) {
      Logger.warn('token_service', 'garantirAbaTokens', e.message);
    }
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  function _getSheet() {
    try {
      var prop = PropertiesService.getScriptProperties().getProperty('SHEET_ID_MASTER');
      if (!prop) return null;
      var ss = SpreadsheetApp.openById(prop);
      return ss.getSheetByName(ABA_TOKENS) ||
             ss.insertSheet(ABA_TOKENS);
    } catch (e) {
      Logger.warn('token_service', '_getSheet', e.message);
      return null;
    }
  }

  function _encontrarLinha(token) {
    var sheet = _getSheet();
    if (!sheet || sheet.getLastRow() < 2) return null;
    var dados = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
    for (var i = 0; i < dados.length; i++) {
      if (String(dados[i][0]) === String(token)) return dados[i];
    }
    return null;
  }

  function _gerarCodigo() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    var resultado = '';
    for (var i = 0; i < 32; i++) {
      resultado += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return resultado;
  }

  function _parseJSON(str) {
    try { return JSON.parse(str || '{}'); } catch(_) { return {}; }
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  return {
    gerar:           gerar,
    validar:         validar,
    marcarUsado:     marcarUsado,
    garantirAbaTokens: garantirAbaTokens
  };

})();
