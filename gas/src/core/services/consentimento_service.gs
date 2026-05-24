/**
 * @file core/services/consentimento_service.gs
 * @layer core/services
 * @description Gerenciamento de consentimentos LGPD por titular.
 *
 * Registra base legal de cada coleta, histórico de consentimento, revogações
 * e log de acesso a dados sensíveis, conforme Lei nº 13.709/2018.
 *
 * Fonte de verdade: consentimentos.json
 *
 * @depends core/data_layer.gs, core/utils.gs, core/logger.gs
 */

var ConsentimentoService = (function () {

  var _ARQUIVO = 'consentimentos.json';

  // Finalidades suportadas
  var FINALIDADES = {
    INSCRICAO_ACAO:    'inscricao_acao',
    CESSAO_PAUTA:      'cessao_pauta',
    PESQUISA_SATISF:   'pesquisa_satisfacao',
    ACERVO_IMAGEM:     'acervo_imagem',
    MARKETING:         'marketing',
    CONTRATACAO:       'contratacao'
  };

  // Bases legais LGPD (Art. 7º)
  var BASES_LEGAIS = {
    CONSENTIMENTO:        'consentimento',
    LEGITIMO_INTERESSE:   'legitimo_interesse',
    OBRIGACAO_LEGAL:      'obrigacao_legal',
    EXECUCAO_CONTRATO:    'execucao_contrato'
  };

  // ─── Registro de consentimento ─────────────────────────────────────────────

  /**
   * Registra consentimento explícito de um titular.
   *
   * @param {Object} dados — { email, finalidade, baseLegal, origem, orgId, extras }
   * @returns {string} id do consentimento registrado
   */
  function registrar(dados) {
    dados = dados || {};
    if (!dados.email)      throw new Error('email obrigatório para consentimento.');
    if (!dados.finalidade) throw new Error('finalidade obrigatória para consentimento.');

    var id   = gerarId('CON');
    var agora = new Date().toISOString();

    var registro = {
      id:          id,
      orgId:       dados.orgId || getOrgConfig().orgId,
      email:       dados.email.toLowerCase().trim(),
      finalidade:  dados.finalidade,
      baseLegal:   dados.baseLegal  || BASES_LEGAIS.CONSENTIMENTO,
      origem:      dados.origem     || 'desconhecido',
      ativo:       true,
      consentidoEm: agora,
      revogadoEm:  null,
      extras:      dados.extras || {}
    };

    modifyJSON(_ARQUIVO, function(lista) {
      lista.push(registro);
      return lista;
    });

    Logger.info('consentimento_service', 'registrar',
      'Consentimento ' + id + ' para ' + dados.email + ' / ' + dados.finalidade);
    return id;
  }

  /**
   * Verifica se há consentimento ativo para email + finalidade.
   *
   * @param {string} email
   * @param {string} finalidade
   * @returns {boolean}
   */
  function verificarAtivo(email, finalidade) {
    if (!email || !finalidade) return false;
    var emailNorm = email.toLowerCase().trim();
    var lista = readJSON(_ARQUIVO);
    return lista.some(function(c) {
      return c.email === emailNorm && c.finalidade === finalidade && c.ativo;
    });
  }

  /**
   * Revoga consentimento de um titular para uma finalidade.
   * Dados existentes ficam anonimizados (responsabilidade do engine que os criou).
   *
   * @param {string} email
   * @param {string} finalidade
   * @param {string} [orgId]
   */
  function revogar(email, finalidade, orgId) {
    if (!email || !finalidade) return;
    var emailNorm = email.toLowerCase().trim();
    var agora     = new Date().toISOString();
    var orgIdFinal = orgId || getOrgConfig().orgId;

    modifyJSON(_ARQUIVO, function(lista) {
      lista.forEach(function(c) {
        if (c.email === emailNorm && c.finalidade === finalidade &&
            c.orgId === orgIdFinal && c.ativo) {
          c.ativo      = false;
          c.revogadoEm = agora;
        }
      });
      return lista;
    });

    Logger.info('consentimento_service', 'revogar',
      'Consentimento revogado: ' + email + ' / ' + finalidade);
  }

  /**
   * Retorna histórico de consentimentos de um titular.
   *
   * @param {string} email
   * @param {string} [orgId]
   * @returns {Array}
   */
  function historico(email, orgId) {
    if (!email) return [];
    var emailNorm  = email.toLowerCase().trim();
    var orgIdFinal = orgId || getOrgConfig().orgId;
    return readJSON(_ARQUIVO).filter(function(c) {
      return c.email === emailNorm && c.orgId === orgIdFinal;
    });
  }

  /**
   * Prepara índice (aba MASTER.Consentimentos) — chamado no setup.
   */
  function prepararIndice() {
    try {
      var ss    = SpreadsheetApp.openById(_getSheetId('SHEET_ID_MASTER'));
      var abaNome = 'Consentimentos';
      var aba   = ss.getSheetByName(abaNome) || ss.insertSheet(abaNome);
      var hdrs  = ['ID','OrgId','Email','Finalidade','BaseLegal','Origem',
                   'Ativo','ConsentidoEm','RevogadoEm'];
      var atual = aba.getLastRow() > 0
        ? aba.getRange(1,1,1,Math.max(aba.getLastColumn(),hdrs.length)).getValues()[0]
        : [];
      if (atual.every(function(v){return !v;}) || String(atual[0]||'').trim() !== 'ID') {
        aba.getRange(1,1,1,hdrs.length).setValues([hdrs]);
        aba.setFrozenRows(1);
      }
      Logger.info('consentimento_service','prepararIndice','Índice Consentimentos OK');
    } catch(e) {
      Logger.warn('consentimento_service','prepararIndice', e.message);
    }
  }

  // ─── Privados ──────────────────────────────────────────────────────────────

  function _getSheetId(chave) {
    var props = PropertiesService.getScriptProperties();
    var id    = props.getProperty(chave);
    if (!id) throw new Error('Propriedade não encontrada: ' + chave);
    return id;
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  return {
    registrar:      registrar,
    verificarAtivo: verificarAtivo,
    revogar:        revogar,
    historico:      historico,
    prepararIndice: prepararIndice,
    FINALIDADES:    FINALIDADES,
    BASES_LEGAIS:   BASES_LEGAIS
  };

})();
