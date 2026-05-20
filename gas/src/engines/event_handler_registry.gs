/**
 * @file engines/event_handler_registry.gs
 * @layer engines
 * @description Registro e despacho de handlers por tipo de evento.
 *
 * Torna o EventBus reativo: cada tipo de evento tem handlers registrados que
 * executam automaticamente quando o trigger assíncrono processa eventos pendentes.
 *
 * DIFERENÇA DO IntegracaoOrquestrador:
 *   - IntegracaoOrquestrador: consequências síncronas e críticas (dentro da transação)
 *   - EventHandlerRegistry: consequências assíncronas e secundárias (processadas a cada 30min)
 *
 * STATUS: handlers stubs implementados (Fase 0) — lógica real nas fases correspondentes.
 *
 * @depends event_bus_backend.gs, events_constants.gs
 */

var EventHandlerRegistry = (function () {

  // Mapa de handlers por tipo de evento.
  // Cada handler recebe o evento completo: { id, tipo, entidade, entidadeId, usuario, orgId, contexto }
  var _handlers = {

    // RESERVATION_CREATED: criar tarefa de prep + notificar comunicação para RECE (Fase 2/6)
    'RESERVATION_CREATED': [
      function(evt) {
        // Fase 2: TarefaEngine.criarAutomatica('reserva_aprovada', evt.entidadeId, evt.orgId, evt.usuario);
        Logger.info('event_handler_registry', 'RESERVATION_CREATED', 'Stub: tarefa de preparação (Fase 2)');
      },
      function(evt) {
        // Fase 6: ComunicacaoEngine.notificarAgendaRece(evt.entidadeId, evt.orgId);
        Logger.info('event_handler_registry', 'RESERVATION_CREATED', 'Stub: notificação RECE (Fase 6)');
      }
    ],

    // ACTION_STARTED: ativar linhas de orçamento (Fase 4)
    'ACTION_STARTED': [
      function(evt) {
        // Fase 4: FinanceiroEngine.ativarLinhasOrcamento(evt.entidadeId, evt.orgId);
        Logger.info('event_handler_registry', 'ACTION_STARTED', 'Stub: ativar orçamento (Fase 4)');
      }
    ],

    // ACTION_COMPLETED: solicitar CODIP + pesquisa satisfação (Fase 6/7)
    'ACTION_COMPLETED': [
      function(evt) {
        // Fase 6: RelatoriosEngine.solicitarPreenchimentoCODIP(evt.entidadeId, evt.orgId);
        Logger.info('event_handler_registry', 'ACTION_COMPLETED', 'Stub: solicitar CODIP (Fase 6)');
      },
      function(evt) {
        // Fase 7: PublicoEngine.enviarPesquisaSatisfacao(evt.entidadeId, evt.orgId);
        Logger.info('event_handler_registry', 'ACTION_COMPLETED', 'Stub: pesquisa satisfação (Fase 7)');
      }
    ],

    // CONTRACT_EXPIRED: criar tarefa de renovação (Fase 4)
    'CONTRACT_EXPIRED': [
      function(evt) {
        // Fase 4: TarefaEngine.criarAutomatica('contrato_vencendo', evt.entidadeId, evt.orgId, evt.usuario);
        Logger.info('event_handler_registry', 'CONTRACT_EXPIRED', 'Stub: tarefa renovação (Fase 4)');
      }
    ],

    // TASK_COMPLETED: verificar avanço de processo (Fase 6)
    'TASK_COMPLETED': [
      function(evt) {
        // Fase 6: DemandaEngine.verificarAvancoPorTarefa(evt.entidadeId, evt.orgId);
        Logger.info('event_handler_registry', 'TASK_COMPLETED', 'Stub: verificar processo (Fase 6)');
      }
    ],

    // KEY_PROTOCOL_DELAYED: cobrar devolução de chave (Fase 2)
    'KEY_PROTOCOL_DELAYED': [
      function(evt) {
        // Fase 2: TarefaEngine.criarAutomatica('chave_atrasada', evt.entidadeId, evt.orgId, evt.usuario);
        Logger.info('event_handler_registry', 'KEY_PROTOCOL_DELAYED', 'Stub: cobrar chave (Fase 2)');
      }
    ],

    // ITEM_NOT_RETURNED: cobrar devolução de item (Fase 2)
    'ITEM_NOT_RETURNED': [
      function(evt) {
        // Fase 2: TarefaEngine.criarAutomatica('item_nao_devolvido', evt.entidadeId, evt.orgId, evt.usuario);
        Logger.info('event_handler_registry', 'ITEM_NOT_RETURNED', 'Stub: cobrar item (Fase 2)');
      }
    ]
  };

  /**
   * Despacha todos os handlers de um evento.
   * Falhas em handlers individuais são logadas e nunca bloqueiam outros handlers.
   */
  function dispatch(evt) {
    var handlers = _handlers[evt.tipo] || [];
    handlers.forEach(function(handler) {
      try {
        handler(evt);
      } catch (e) {
        Logger.warn('event_handler_registry', 'dispatch',
          'Handler falhou para ' + evt.tipo + ': ' + e.message);
      }
    });
  }

  /**
   * Registra um handler adicional para um tipo de evento.
   * Útil para módulos que precisam adicionar handlers sem modificar este arquivo.
   */
  function registrar(tipoEvento, handler) {
    if (typeof handler !== 'function') return;
    if (!_handlers[tipoEvento]) _handlers[tipoEvento] = [];
    _handlers[tipoEvento].push(handler);
  }

  /**
   * Lista todos os tipos de evento com handlers registrados.
   */
  function listarTiposRegistrados() {
    return Object.keys(_handlers).filter(function(k) { return _handlers[k].length > 0; });
  }

  return {
    dispatch:              dispatch,
    registrar:             registrar,
    listarTiposRegistrados: listarTiposRegistrados
  };

})();

// ─── Trigger assíncrono ────────────────────────────────────────────────────────
// Chamado a cada 30 minutos via Time-based trigger configurado em setup.gs

/**
 * Processa eventos pendentes no EventLog.
 * Fase 6: implementar retry com backoff exponencial + alerta para admin.
 */
function processarEventosPendentes() {
  try {
    var orgId  = getOrgConfig().orgId;
    var eventos = SystemEvents.getRecentes(100);

    var pendentes = eventos.filter(function(e) {
      return !e.processado && e.orgId === orgId;
    });

    Logger.info('event_handler_registry', 'processarEventosPendentes',
      'Processando ' + pendentes.length + ' eventos pendentes');

    pendentes.forEach(function(evt) {
      EventHandlerRegistry.dispatch(evt);
      // Fase 6: marcar como processado no EventLog + retry com backoff
    });
  } catch (e) {
    Logger.error('event_handler_registry', 'processarEventosPendentes', e.message);
  }
}
