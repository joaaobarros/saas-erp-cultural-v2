/**
 * @file core/services/bcb_service.gs
 * @layer core/services
 * @description Integração com a API pública do Banco Central do Brasil (BCB/SGS).
 *
 *   Consome o webservice SGS (Sistema Gerenciador de Séries Temporais) do BCB.
 *   Documentação: https://dadosabertos.bcb.gov.br/dataset/sgs-sistema-gerenciador-de-series-temporais
 *
 *   Séries relevantes para o sistema:
 *     1619  — Salário Mínimo (R$ mensal)
 *     13522 — IPCA acumulado 12 meses (%)
 *     4391  — INPC acumulado 12 meses (%)
 *     432   — Taxa Selic meta (% a.a.)
 *
 *   Limite da API: 20 períodos por requisição.
 *   Disponibilidade: pública, sem autenticação, sem rate-limit documentado.
 *
 * @depends (nenhum — usa apenas UrlFetchApp nativo do GAS)
 */

var BcbService = (function () {

  var BASE_URL   = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.';
  var MAX_PERIODOS = 20;

  // ── Core ─────────────────────────────────────────────────────────────────────

  /**
   * Busca os últimos N valores de uma série temporal do BCB/SGS.
   * @param {number} serie    — código numérico da série (ex: 1619)
   * @param {number} periodos — quantidade de registros (1–20)
   * @returns {Array<{data: string, valor: string}>|null} null em caso de falha
   */
  function buscarSerie(serie, periodos) {
    var n   = Math.min(Number(periodos) || 1, MAX_PERIODOS);
    var url = BASE_URL + serie + '/dados/ultimos/' + n + '?formato=json';
    try {
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      var code = resp.getResponseCode();
      if (code !== 200) {
        Logger.warn('bcb_service', 'buscarSerie',
          'HTTP ' + code + ' ao consultar série ' + serie);
        return null;
      }
      var dados = JSON.parse(resp.getContentText());
      if (!Array.isArray(dados) || !dados.length) return null;
      return dados;
    } catch (e) {
      Logger.warn('bcb_service', 'buscarSerie',
        'Série ' + serie + ': ' + e.message);
      return null;
    }
  }

  /**
   * Retorna o valor numérico mais recente de uma série.
   * @param {number} serie
   * @returns {{ valor: number, data: string, serie: number }|null}
   */
  function buscarUltimoValor(serie) {
    var dados = buscarSerie(serie, 1);
    if (!dados) return null;
    var v = parseFloat(dados[0].valor);
    if (isNaN(v)) return null;
    return { valor: v, data: dados[0].data, serie: serie };
  }

  // ── Atalhos semânticos ────────────────────────────────────────────────────────

  /**
   * Salário Mínimo nacional atual (série 1619).
   * Fonte: Decretos presidenciais; publicado mensalmente no SGS.
   * @returns {{ valor: number, data: string }|null}
   */
  function buscarSalarioMinimo() {
    var r = buscarUltimoValor(1619);
    if (!r) return null;
    return { valor: r.valor, data: r.data, fonte: 'Banco Central do Brasil — SGS Série 1619' };
  }

  /**
   * IPCA acumulado 12 meses (série 13522), em percentual (ex: 4.83 = 4,83%).
   * Útil para reajustes salariais e projeções financeiras.
   * @returns {{ valor: number, data: string }|null}
   */
  function buscarIPCA12Meses() {
    return buscarUltimoValor(13522);
  }

  /**
   * INPC acumulado 12 meses (série 4391), em percentual.
   * Índice de referência para reajuste do salário mínimo.
   * @returns {{ valor: number, data: string }|null}
   */
  function buscarINPC12Meses() {
    return buscarUltimoValor(4391);
  }

  // ── API pública ───────────────────────────────────────────────────────────────

  return {
    buscarSerie:         buscarSerie,
    buscarUltimoValor:   buscarUltimoValor,
    buscarSalarioMinimo: buscarSalarioMinimo,
    buscarIPCA12Meses:   buscarIPCA12Meses,
    buscarINPC12Meses:   buscarINPC12Meses
  };

})();
