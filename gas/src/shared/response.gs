/**
 * @file shared/response.gs
 * @layer shared
 * @description Contrato canônico de resposta para toda camada de controllers.
 *
 * REGRA ARQUITETURAL:
 *   Toda função exposta via google.script.run DEVE retornar GasResponse.ok() ou GasResponse.error().
 *   Elimina: booleano solto, string arbitrária, null silencioso, throw imprevisível.
 *
 * Estrutura canônica:
 *   { ok: true,  data: <resultado>,                       metadata: { timestamp, origem } }
 *   { ok: false, error: { message, code, details: null }, metadata: { timestamp, origem } }
 *
 * Códigos de erro semânticos: 'CONFLITO', 'PERMISSAO', 'NAO_ENCONTRADO', 'VALIDACAO', 'ERRO_INTERNO'
 */

var GasResponse = (function () {

  function _meta(origem) {
    return { timestamp: new Date().toISOString(), origem: origem || 'sistema' };
  }

  function ok(data, origem) {
    return { ok: true, data: data !== undefined ? data : null, metadata: _meta(origem) };
  }

  function error(message, code, details, origem) {
    return {
      ok:    false,
      error: { message: message || 'Erro desconhecido', code: code || 'ERRO_INTERNO', details: details || null },
      metadata: _meta(origem)
    };
  }

  /**
   * Executa fn() e converte resultado automaticamente em GasResponse.
   * Qualquer throw vira GasResponse.error(). Retorno vira GasResponse.ok(retorno).
   *
   * Uso em controllers:
   *   function ctrl_reservas_listar() {
   *     return GasResponse.wrap(function() { return ReservaEngine.listar(orgId); }, 'ctrl_reservas_listar');
   *   }
   */
  function wrap(fn, origem) {
    try {
      return ok(fn(), origem);
    } catch (e) {
      if (typeof Logger !== 'undefined') Logger.error(origem || 'gas_response', 'wrap', e.message);
      return error(e.message, e.code || 'ERRO_INTERNO', e.details || null, origem);
    }
  }

  return { ok: ok, error: error, wrap: wrap };

})();
