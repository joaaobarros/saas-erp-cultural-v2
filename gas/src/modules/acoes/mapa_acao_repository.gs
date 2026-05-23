/**
 * @file modules/acoes/mapa_acao_repository.gs
 * @layer modules/acoes
 * @description Repositório de Mapas de Evento vinculados a Ações.
 *
 * Cada Ação pode ter N MapaAcao (um por local de execução).
 * Cada MapaAcao contém: layers configuráveis + elementos (espaços e objetos).
 *
 * Fonte de verdade: mapaAcoes.json (Drive)
 * Sem índice Sheet — estrutura aninhada inviabiliza serialização tabular.
 *
 * @depends core/data_layer.gs, repositories/i_repository.gs, core/utils.gs
 */

var MapaAcaoRepository = (function () {

  var _ARQUIVO = 'mapaAcoes.json';

  var _base = criarJsonRepository(_ARQUIVO, null);

  // ─── LEITURA ──────────────────────────────────────────────────────────────

  function listar(orgId, filtros) {
    orgId   = orgId   || getOrgConfig().orgId;
    filtros = filtros || {};
    var lista = _base.listar(orgId, filtros);
    return lista.sort(function(a, b) {
      return (a.ordem || 0) - (b.ordem || 0);
    });
  }

  function buscarPorId(orgId, id) {
    if (id === undefined) { id = orgId; orgId = getOrgConfig().orgId; }
    return _base.buscarPorId(orgId || getOrgConfig().orgId, id);
  }

  function buscarPorAcao(orgId, acaoId) {
    orgId = orgId || getOrgConfig().orgId;
    return listar(orgId, { acaoId: acaoId });
  }

  // ─── ESCRITA ──────────────────────────────────────────────────────────────

  function salvar(orgId, mapa) {
    if (mapa === undefined && orgId && typeof orgId === 'object') {
      mapa  = orgId;
      orgId = mapa.orgId || getOrgConfig().orgId;
    }
    orgId     = orgId || getOrgConfig().orgId;
    mapa.orgId = orgId;
    return _base.salvar(orgId, mapa);
  }

  function excluir(orgId, id) {
    if (id === undefined) { id = orgId; orgId = getOrgConfig().orgId; }
    return _base.excluir(orgId || getOrgConfig().orgId, id);
  }

  // ─── SETUP ────────────────────────────────────────────────────────────────

  function prepararIndice() {
    try {
      readJSON(_ARQUIVO);
    } catch(e) {
      modifyJSON(_ARQUIVO, function() { return []; });
    }
    return { ok: true, mensagem: 'Repositório mapaAcoes.json inicializado.' };
  }

  // ─── API pública ─────────────────────────────────────────────────────────

  return {
    listar:          listar,
    buscarPorId:     buscarPorId,
    buscarPorAcao:   buscarPorAcao,
    salvar:          salvar,
    excluir:         excluir,
    prepararIndice:  prepararIndice
  };

})();

/**
 * Wrapper global executável no GAS Editor para inicialização.
 * @returns {{ ok: boolean }}
 */
function fase1_mapaAcao_prepararIndice() {
  return MapaAcaoRepository.prepararIndice();
}
