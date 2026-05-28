/**
 * @file modules/aprovacoes/aprovacoes_repository.gs
 * @layer modules/aprovacoes
 * @description Camada de persistência para aprovações.
 *
 * Armazena registros em: aprovacoes.json (Drive)
 * Schema: Array de { id, tipo, status, solicitanteMail, ... }
 *
 * @depends core/data_layer.gs (readJSON, saveJSON, modifyJSON)
 */

var AprovacoesRepository = (function() {

  var ARQUIVO = 'aprovacoes.json';

  /**
   * Lê todos os registros.
   * @returns {Array}
   */
  function _lerTodos() {
    try {
      var dados = readJSON(ARQUIVO);
      return Array.isArray(dados) ? dados : [];
    } catch (e) {
      Logger.warn('aprovacoes_repository', '_lerTodos', 'Arquivo não encontrado ou vazio: ' + e.message);
      return [];
    }
  }

  /**
   * Salva todos os registros (sobrescreve).
   */
  function _salvarTodos(registros) {
    try {
      saveJSON(ARQUIVO, registros);
    } catch (e) {
      Logger.error('aprovacoes_repository', '_salvarTodos', e.message);
      throw e;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // API PÚBLICA
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Obtém um registro por ID.
   */
  function obterPorId(id) {
    var todos = _lerTodos();
    return todos.find(function(r) { return r.id === id; }) || null;
  }

  /**
   * Busca registros com filtros.
   *
   * @param {Object} filtros
   *   - tipo: string
   *   - status: string
   *   - solicitanteMail: string
   *
   * @returns {Array}
   */
  function buscar(filtros) {
    var todos = _lerTodos();
    filtros = filtros || {};

    return todos.filter(function(r) {
      if (filtros.tipo && r.tipo !== filtros.tipo) return false;
      if (filtros.status && r.status !== filtros.status) return false;
      if (filtros.solicitanteMail && r.solicitanteMail !== filtros.solicitanteMail) return false;
      return true;
    });
  }

  /**
   * Busca por solicitante, tipo e status.
   */
  function buscarPorSolicitante(mail, tipo, status) {
    return buscar({
      solicitanteMail: mail,
      tipo: tipo,
      status: status
    });
  }

  /**
   * Salva um registro (cria ou atualiza).
   */
  function salvar(registro) {
    if (!registro || !registro.id) {
      throw new Error('Registro inválido ou sem ID.');
    }

    modifyJSON(ARQUIVO, function(dados) {
      if (!Array.isArray(dados)) dados = [];
      var idx = dados.findIndex(function(r) { return r.id === registro.id; });
      if (idx === -1) {
        dados.push(registro);
      } else {
        dados[idx] = registro;
      }
      return dados;
    });
  }

  /**
   * Delete (soft delete — marcar como deleted).
   */
  function deletar(id) {
    modifyJSON(ARQUIVO, function(dados) {
      if (!Array.isArray(dados)) return dados;
      return dados.filter(function(r) { return r.id !== id; });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // API PÚBLICA (retorno)
  // ─────────────────────────────────────────────────────────────────────────

  return {
    obterPorId:          obterPorId,
    buscar:              buscar,
    buscarPorSolicitante: buscarPorSolicitante,
    salvar:              salvar,
    deletar:             deletar
  };

})();
