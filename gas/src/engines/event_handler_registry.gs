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
 * @depends event_bus_backend.gs, events_constants.gs, tarefa_engine.gs
 */

var EventHandlerRegistry = (function () {

  // ─── Handlers por tipo de evento ──────────────────────────────────────────
  // Cada handler recebe o evento completo: { id, tipo, entidade, entidadeId, usuario, orgId, contexto }

  var _handlers = {

    // RESERVATION_CREATED: notificar RECE (tarefas NÃO são criadas automaticamente — apenas via vínculo explícito)
    'RESERVATION_CREATED': [
      function(evt) {
        // Notificar equipe RECE se reserva for de Ação pública (Fase 6.5)
        try {
          if (typeof ReceEngine !== 'undefined') {
            ReceEngine.notificarNovaReserva(evt.entidadeId, evt.orgId);
          }
          Logger.info('event_handler_registry', 'RESERVATION_CREATED', 'Notificação RECE enviada: ' + evt.entidadeId);
        } catch (e) {
          Logger.warn('event_handler_registry', 'RESERVATION_CREATED[rece]', e.message);
        }
      }
    ],

    // ACTION_STARTED: ativar linhas de orçamento das rubricas vinculadas
    'ACTION_STARTED': [
      function(evt) {
        try {
          // FinanceiroEngine: marcar rubricas vinculadas à Ação como ativas
          // Implementação plena na Fase 4/6 quando contratos tiverem acaoId indexado
          Logger.info('event_handler_registry', 'ACTION_STARTED',
            'Ação iniciada — rubricas a ativar futuramente: ' + evt.entidadeId);
        } catch (e) {
          Logger.warn('event_handler_registry', 'ACTION_STARTED', e.message);
        }
      }
    ],

    // ACTION_COMPLETED: email de consolidação CODIP + pesquisa de satisfação (F7)
    'ACTION_COMPLETED': [
      function(evt) {
        try {
          var admins = _obterAdmins(evt.orgId);
          if (admins.length > 0) {
            var org = _getNomeOrg();
            var appUrl = _getAppUrl();
            admins.forEach(function(email) {
              try {
                GmailApp.sendEmail(
                  email,
                  '[' + org + '] Ação concluída — preencher dados CODIP: ' + evt.entidadeId,
                  'A Ação ' + evt.entidadeId + ' foi concluída.\n\n' +
                  'Acesse o sistema para registrar os dados de público e preencher o relatório CODIP/SALIC:\n' +
                  appUrl + '\n\n— ' + org
                );
              } catch(_) {}
            });
          }
          Logger.info('event_handler_registry', 'ACTION_COMPLETED', 'Email CODIP enviado: ' + evt.entidadeId);
        } catch (e) {
          Logger.warn('event_handler_registry', 'ACTION_COMPLETED', e.message);
        }
      }
    ],

    // CONTRACT_EXPIRED: criar tarefa de renovação com prazo
    'CONTRACT_EXPIRED': [
      function(evt) {
        try {
          var ctx = typeof evt.contexto === 'string' ? JSON.parse(evt.contexto || '{}') : (evt.contexto || {});
          var prazoRenovacao = _dataMaisDias(30);
          TarefaEngine.criarAutomatica('contrato_vencendo', evt.entidadeId, evt.orgId, 'sistema', {
            titulo: 'Renovar contrato: ' + (ctx.nome || evt.entidadeId),
            descricao: 'O contrato ' + evt.entidadeId + ' está vencido ou próximo do vencimento. ' +
                       'Responsável: ' + (ctx.responsavel || evt.usuario || ''),
            prioridade: 'critica',
            prazo: prazoRenovacao,
            modulo: 'contratacoes'
          });
          Logger.info('event_handler_registry', 'CONTRACT_EXPIRED', 'Tarefa de renovação criada: ' + evt.entidadeId);
        } catch (e) {
          Logger.warn('event_handler_registry', 'CONTRACT_EXPIRED', e.message);
        }
      }
    ],

    // TASK_DELAYED: notificar responsável sobre prazo vencido (disparado por verificarPrazosTarefas)
    'TASK_DELAYED': [
      function(evt) {
        try {
          var ctx = evt.contexto || {};
          var responsavel = String(ctx.responsavel || '');
          if (!responsavel || responsavel.indexOf('@') === -1) return;
          var org = _getNomeOrg();
          var appUrl = _getAppUrl();
          var titulo = String(ctx.titulo || evt.entidadeId);
          var prazo = ctx.prazo ? String(ctx.prazo).substring(0, 10).split('-').reverse().join('/') : '—';
          GmailApp.sendEmail(
            responsavel,
            '[' + org + '] Tarefa atrasada: ' + titulo,
            'A tarefa "' + titulo + '" está com prazo vencido desde ' + prazo + '.\n\n' +
            'Acesse o sistema para atualizar o status:\n' + appUrl + '\n\n— ' + org
          );
          Logger.info('event_handler_registry', 'TASK_DELAYED', 'Notificado: ' + responsavel);
        } catch(e) {
          Logger.warn('event_handler_registry', 'TASK_DELAYED', e.message);
        }
      }
    ],

    // TAREFA_CRIADA: notificar responsável quando tarefa é atribuída a outra pessoa
    'TAREFA_CRIADA': [
      function(evt) {
        try {
          var ctx = evt.contexto || {};
          var responsavel = String(ctx.responsavel || '');
          if (!responsavel || responsavel.indexOf('@') === -1) return;
          if (responsavel === evt.usuario) return; // criador = responsável — não notificar
          var org = _getNomeOrg();
          var appUrl = _getAppUrl();
          var titulo = String(ctx.titulo || evt.entidadeId);
          GmailApp.sendEmail(
            responsavel,
            '[' + org + '] Nova tarefa atribuída a você: ' + titulo,
            'Uma nova tarefa foi atribuída a você:\n\n"' + titulo + '"\n\n' +
            'Acesse o sistema para ver os detalhes:\n' + appUrl + '\n\n— ' + org
          );
          Logger.info('event_handler_registry', 'TAREFA_CRIADA', 'Notificado: ' + responsavel);
        } catch(e) {
          Logger.warn('event_handler_registry', 'TAREFA_CRIADA', e.message);
        }
      }
    ],

    // TASK_COMPLETED: verificar avanço de processo vinculado
    'TASK_COMPLETED': [
      function(evt) {
        try {
          // DemandaEngine ainda não implementado — apenas log rastreável
          Logger.info('event_handler_registry', 'TASK_COMPLETED',
            'Tarefa concluída — verificar processo vinculado: ' + evt.entidadeId);
        } catch (e) {
          Logger.warn('event_handler_registry', 'TASK_COMPLETED', e.message);
        }
      }
    ],

    // KEY_PROTOCOL_DELAYED: log apenas (tarefas de chave NÃO são criadas automaticamente)
    'KEY_PROTOCOL_DELAYED': [
      function(evt) {
        Logger.info('event_handler_registry', 'KEY_PROTOCOL_DELAYED', 'Protocolo de chave atrasado: ' + evt.entidadeId);
      }
    ],

    // ITEM_NOT_RETURNED: log apenas (tarefas de item NÃO são criadas automaticamente)
    'ITEM_NOT_RETURNED': [
      function(evt) {
        Logger.info('event_handler_registry', 'ITEM_NOT_RETURNED', 'Item não devolvido: ' + evt.entidadeId);
      }
    ]
  };

  // ─── Privados ──────────────────────────────────────────────────────────────

  function _obterAdmins(orgId) {
    try {
      var dados = lerJSON('usuarios_acesso.json', orgId) || {};
      var lista = dados.lista || [];
      return lista
        .filter(function(u) { return u.papel === 'admin' || u.papel === 'superadmin'; })
        .map(function(u) { return u.email; })
        .filter(Boolean);
    } catch(e) { return []; }
  }

  function _getNomeOrg() {
    try { return getOrgConfig().nome || 'Sistema'; } catch(e) { return 'Sistema'; }
  }

  function _getAppUrl() {
    try { return ScriptApp.getService().getUrl() || ''; } catch(_) { return ''; }
  }

  function _dataMaisDias(dias) {
    var d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().substring(0, 10);
  }

  // ─── API pública ──────────────────────────────────────────────────────────

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
    dispatch:               dispatch,
    registrar:              registrar,
    listarTiposRegistrados: listarTiposRegistrados
  };

})();

// ─── Trigger assíncrono ────────────────────────────────────────────────────────

/**
 * Processa eventos pendentes no EventLog com retry e backoff exponencial.
 * Chamado a cada 30 minutos via Time-based trigger configurado em setup.gs.
 * Função global executável diretamente no GAS Editor.
 */
function processarEventosPendentes() {
  var orgId  = getOrgConfig().orgId;
  var MAX_TENTATIVAS = 3;
  var LIMITE_ALERTA  = 100;

  try {
    var pendentes = SystemEvents.getPendentes(200);
    pendentes = pendentes.filter(function(e) { return !e.orgId || e.orgId === orgId; });

    Logger.info('event_handler_registry', 'processarEventosPendentes',
      'Processando ' + pendentes.length + ' eventos pendentes');

    // Alerta admin quando fila está grande
    if (pendentes.length >= LIMITE_ALERTA) {
      _alertarFilaGrande(pendentes.length, orgId);
    }

    pendentes.forEach(function(evt) {
      if (evt.tentativas >= MAX_TENTATIVAS) {
        SystemEvents.marcarErro(evt.id, evt.tentativas);
        return;
      }

      try {
        EventHandlerRegistry.dispatch(evt);
        SystemEvents.marcarProcessado(evt.id);
      } catch (e) {
        Logger.warn('event_handler_registry', 'processarEventosPendentes',
          'Falha ao processar ' + evt.id + ': ' + e.message);
        SystemEvents.incrementarTentativa(evt.id, (evt.tentativas || 0) + 1);
      }
    });

  } catch (e) {
    Logger.error('event_handler_registry', 'processarEventosPendentes', e.message);
  }
}

function _alertarFilaGrande(total, orgId) {
  try {
    var dados = lerJSON('usuarios_acesso.json', orgId) || {};
    var admins = (dados.lista || [])
      .filter(function(u) { return u.papel === 'admin' || u.papel === 'superadmin'; })
      .map(function(u) { return u.email; });
    var org = getOrgConfig().nome || 'Sistema';
    admins.forEach(function(email) {
      try {
        GmailApp.sendEmail(email,
          '[' + org + '] ⚠️ Fila de eventos com ' + total + ' pendentes',
          'A fila de eventos do sistema está com ' + total + ' eventos pendentes de processamento.\n\n' +
          'Verifique o painel de Observabilidade para detalhes.\n\n— ' + org);
      } catch(_) {}
    });
  } catch(e) { Logger.warn('event_handler_registry', '_alertarFilaGrande', e.message); }
}

/**
 * Verifica tarefas com prazo vencido e emite TASK_DELAYED para as ainda não notificadas.
 * Chamada diariamente pelo trigger configurado em criarTriggerVerificacaoPrazos().
 * Também pode ser executada manualmente no GAS Editor.
 */
function verificarPrazosTarefas() {
  try {
    var result = TarefaEngine.verificarPrazos();
    Logger.info('event_handler_registry', 'verificarPrazosTarefas', JSON.stringify(result));
  } catch(e) {
    Logger.error('event_handler_registry', 'verificarPrazosTarefas', e.message);
  }
}

/**
 * Cria o trigger diário de verificação de prazos de tarefas (08:00).
 * Executar uma vez no GAS Editor após o deploy.
 */
function criarTriggerVerificacaoPrazos() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'verificarPrazosTarefas') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('verificarPrazosTarefas')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
  Logger.info('event_handler_registry', 'criarTriggerVerificacaoPrazos', 'Trigger diário criado (08:00).');
}

/**
 * Cria o Time-based trigger de 30 minutos para processarEventosPendentes.
 * Executar uma vez no GAS Editor após o primeiro deploy.
 */
function criarTriggerEventosPendentes() {
  // Remove triggers duplicados antes de criar
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'processarEventosPendentes') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('processarEventosPendentes')
    .timeBased()
    .everyMinutes(30)
    .create();
  Logger.info('event_handler_registry', 'criarTriggerEventosPendentes', 'Trigger de 30 min criado.');
}
