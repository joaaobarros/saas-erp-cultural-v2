/**
 * @file modules/espacos/almoxarifado_engine.gs
 * @layer modules/espacos
 * @description Engine de Almoxarifado — controle de empréstimos de itens.
 *
 * FASE ATUAL (1.4): Stub com FSM e interfaces definidas.
 * Implementação completa: Fase 2.2 — Sistema de Empréstimo de Itens.
 *
 * FSM de empréstimo de item:
 *   solicitado → aprovado → retirado → devolvido
 *   solicitado → cancelado
 *   aprovado   → cancelado
 *   retirado   → atrasado → devolvido
 *
 * RESPONSABILIDADES (Fase 2+):
 *   - Catálogo de itens emprestáveis (MASTER.Itens)
 *   - Controle de disponibilidade com lock exclusivo (assertItemDisponivel)
 *   - Empréstimos com aprovação e prazo
 *   - Alertas de atraso via EventHandlerRegistry
 *   - Integração com Ações (acaoId no empréstimo)
 *
 * @depends modules/espacos/ativos_repository.gs (AtivoRepository)
 *          core/services/auditoria_service.gs (AuditoriaService)
 *          core/event_bus_backend.gs (SystemEvents)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 *
 * @todo Fase 2.2: implementar assertItemDisponivel com LockService
 * @todo Fase 2.2: criar reservas_itens_repository.gs
 * @todo Fase 2.2: conectar alertas de atraso via EventHandlerRegistry
 */

// ── Constantes de domínio ─────────────────────────────────────────────

var STATUS_EMPRESTIMO = Object.freeze({
  SOLICITADO: 'solicitado',
  APROVADO:   'aprovado',
  RETIRADO:   'retirado',
  ATRASADO:   'atrasado',
  DEVOLVIDO:  'devolvido',
  CANCELADO:  'cancelado'
});

// ── FSM de empréstimo ─────────────────────────────────────────────────

var _TRANSICOES_EMPRESTIMO = {
  'solicitado': ['aprovado', 'cancelado'],
  'aprovado':   ['retirado', 'cancelado'],
  'retirado':   ['devolvido', 'atrasado'],
  'atrasado':   ['devolvido'],
  'devolvido':  [],   // terminal
  'cancelado':  []    // terminal
};

if (typeof FsmGuardian !== 'undefined') {
  try { FsmGuardian.registrar('emprestimos', _TRANSICOES_EMPRESTIMO); } catch (_) {}
}

// ── Engine ────────────────────────────────────────────────────────────

var AlmoxarifadoEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  function _notImplemented(metodo) {
    Logger.warn('almoxarifado_engine', metodo, 'Stub — implementar na Fase 2.2');
    throw new Error('[AlmoxarifadoEngine.' + metodo + '] Não implementado. Previsto para Fase 2.2.');
  }

  // ──────────────────────────────────────────────────────────────────
  // CATÁLOGO DE ITENS (referência em MASTER.Itens)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Lista itens disponíveis para empréstimo.
   * Fase 2.2: ler de MASTER.Itens + calcular disponibilidade real.
   * @stub
   */
  function listarItens(filtros, orgId) {
    Logger.info('almoxarifado_engine', 'listarItens', 'Stub — retorna lista vazia até Fase 2.2');
    return [];
  }

  /**
   * Verifica se um item está disponível para empréstimo no período.
   * Fase 2.2: usar LockService + verificar ESPACOS.EmprestimosItens.
   *
   * @param {string} itemId
   * @param {string} dataInicio — ISO date
   * @param {string} dataFim — ISO date
   * @param {string} orgId
   * @throws Error se item indisponível (Fase 2.2+)
   * @stub
   */
  function assertItemDisponivel(itemId, dataInicio, dataFim, orgId) {
    // Fase 2.2: implementar verificação real com LockService
    Logger.info('almoxarifado_engine', 'assertItemDisponivel',
      'Stub — item ' + itemId + ' assumido disponível até Fase 2.2');
    return true;
  }

  // ──────────────────────────────────────────────────────────────────
  // EMPRÉSTIMOS
  // Fase 2.2: persistência em ESPACOS.EmprestimosItens
  // ──────────────────────────────────────────────────────────────────

  /**
   * Registra uma solicitação de empréstimo de item.
   * @stub Fase 2.2
   */
  function solicitarEmprestimo(dados, autor, orgId) {
    _notImplemented('solicitarEmprestimo');
  }

  /**
   * Aprova uma solicitação de empréstimo.
   * @stub Fase 2.2
   */
  function aprovarEmprestimo(emprestimoId, ator, orgId) {
    _notImplemented('aprovarEmprestimo');
  }

  /**
   * Registra retirada do item (empréstimo efetivado).
   * @stub Fase 2.2
   */
  function registrarRetirada(emprestimoId, ator, orgId) {
    _notImplemented('registrarRetirada');
  }

  /**
   * Registra devolução do item.
   * @stub Fase 2.2
   */
  function registrarDevolucao(emprestimoId, ator, observacao, orgId) {
    _notImplemented('registrarDevolucao');
  }

  /**
   * Cancela um empréstimo pendente.
   * @stub Fase 2.2
   */
  function cancelarEmprestimo(emprestimoId, ator, motivo, orgId) {
    _notImplemented('cancelarEmprestimo');
  }

  /**
   * Verifica empréstimos vencidos e marca como atrasados.
   * Fase 2.2: disparado por trigger de tempo via EventHandlerRegistry.
   * @stub Fase 2.2
   */
  function verificarAtrasos(orgId) {
    Logger.info('almoxarifado_engine', 'verificarAtrasos', 'Stub — implementar na Fase 2.2');
    return { verificados: 0, atrasados: 0 };
  }

  /**
   * Métricas do almoxarifado.
   * @stub Fase 2.2
   */
  function metricas(orgId) {
    Logger.info('almoxarifado_engine', 'metricas', 'Stub — retorna zeros até Fase 2.2');
    return {
      itensDisponiveis: 0,
      emprestimosAtivos: 0,
      emprestimosPendentes: 0,
      emprestimosAtrasados: 0
    };
  }

  // ── Interface pública ─────────────────────────────────────────────

  return {
    // Catálogo
    listarItens:          listarItens,
    assertItemDisponivel: assertItemDisponivel,

    // Fluxo de empréstimo (Fase 2.2)
    solicitarEmprestimo:  solicitarEmprestimo,
    aprovarEmprestimo:    aprovarEmprestimo,
    registrarRetirada:    registrarRetirada,
    registrarDevolucao:   registrarDevolucao,
    cancelarEmprestimo:   cancelarEmprestimo,

    // Operações
    verificarAtrasos:     verificarAtrasos,
    metricas:             metricas,

    // Constantes
    STATUS:               STATUS_EMPRESTIMO
  };

})();

// ─────────────────────────────────────────────────────────────────────────────
// NOTA: almoxarifado.json legado (se existir no Drive da organização)
// deve ser tratado como APENAS LEITURA até Fase 2.2.
// Nenhum módulo do v2 grava em almoxarifado.json.
// A migração formal para ESPACOS.EmprestimosItens será realizada na Fase 2.2.
// ─────────────────────────────────────────────────────────────────────────────
