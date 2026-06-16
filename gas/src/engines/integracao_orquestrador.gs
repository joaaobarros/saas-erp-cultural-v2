/**
 * @file engines/integracao_orquestrador.gs
 * @layer engines
 * @description Orquestrador síncrono de consequências entre domínios.
 *
 * PRINCÍPIO: este é o ÚNICO lugar do sistema com conhecimento de múltiplos domínios.
 * Engines individuais nunca chamam engines de outros domínios diretamente.
 * Toda consequência cross-domínio obrigatória e síncrona passa por aqui.
 *
 * QUANDO USAR:
 *   - Consequências críticas que DEVEM acontecer na mesma transação (ex: confirmar reserva → criar tarefa de prep)
 *   - Consequências que não podem ser adiadas para o trigger assíncrono de 30min
 *
 * QUANDO NÃO USAR (usar EventHandlerRegistry):
 *   - Consequências secundárias que podem ser adiadas (ex: notificar RECE após reserva)
 *   - Automações não-críticas disparadas por eventos
 *
 * STATUS: Fase 15 — onReservaConfirmada, onAcaoConcluida, onContratoVencendo e onProtocoloChaveAtrasado ativos.
 *
 * @depends event_bus_backend.gs, events_constants.gs
 */

var IntegracaoOrquestrador = (function () {

  // ─── Reservas ─────────────────────────────────────────────────────────────

  /**
   * Executado após confirmação de reserva de espaço.
   * Fase 2: criar tarefa de preparação de espaço.
   * Fase 6: notificar comunicação para agenda RECE.
   */
  function onReservaConfirmada(reservaId, orgId, email) {
    try {
      SystemEvents.emit(SystemEventTypes.RESERVATION_CREATED, {
        entidade: 'reserva', entidadeId: reservaId, usuario: email, orgId: orgId,
        origem: 'IntegracaoOrquestrador.onReservaConfirmada'
      });
      // Tarefas de reserva NÃO são criadas automaticamente — apenas via vínculo explícito pelo usuário.
    } catch (e) {
      Logger.warn('integracao_orquestrador', 'onReservaConfirmada', e.message);
    }
  }

  // ─── Ações ────────────────────────────────────────────────────────────────

  /**
   * Executado quando Ação entra em execução.
   * Fase 4: ativar linhas de orçamento.
   */
  function onAcaoIniciada(acaoId, orgId, email) {
    try {
      SystemEvents.emit(SystemEventTypes.ACTION_STARTED, {
        entidade: 'acao', entidadeId: acaoId, usuario: email, orgId: orgId,
        origem: 'IntegracaoOrquestrador.onAcaoIniciada'
      });
      // Fase 4: FinanceiroEngine.ativarLinhasOrcamento(acaoId, orgId);
    } catch (e) {
      Logger.warn('integracao_orquestrador', 'onAcaoIniciada', e.message);
    }
  }

  /**
   * Executado quando Ação é concluída.
   * Fase 6: solicitar preenchimento CODIP, disparar pesquisa de satisfação.
   */
  function onAcaoConcluida(acaoId, orgId, email) {
    try {
      SystemEvents.emit(SystemEventTypes.ACTION_COMPLETED, {
        entidade: 'acao', entidadeId: acaoId, usuario: email, orgId: orgId,
        origem: 'IntegracaoOrquestrador.onAcaoConcluida'
      });
      // Gerar alerta de CODIP pendente para gestores financeiros (best-effort)
      try {
        if (typeof AlertasEngine !== 'undefined') {
          AlertasEngine.gerarAlerta({
            tipo: 'CODIP_PENDENTE',
            modulo: 'acoes',
            entidadeId: acaoId,
            orgId: orgId,
            mensagem: 'Ação concluída — verifique exportação CODIP no módulo Financeiro'
          });
        }
      } catch (eAlerta) {
        Logger.warn('integracao_orquestrador', 'onAcaoConcluida:alerta', eAlerta.message);
      }
      // Recalcular realizado do indicador vinculado (best-effort)
      try {
        if (typeof AcaoRepository !== 'undefined' && typeof ContratosEngine !== 'undefined') {
          var acaoConcluida = AcaoRepository.buscarPorId(orgId, acaoId);
          if (acaoConcluida && acaoConcluida.vinculo && acaoConcluida.vinculo.indicadorId) {
            ContratosEngine.recalcularRealizadoDeAcoes(
              acaoConcluida.vinculo.contratoId,
              acaoConcluida.vinculo.metaId,
              acaoConcluida.vinculo.indicadorId,
              orgId
            );
          }
        }
      } catch (eInd) {
        Logger.warn('integracao_orquestrador', 'onAcaoConcluida:indicador', eInd.message);
      }
    } catch (e) {
      Logger.warn('integracao_orquestrador', 'onAcaoConcluida', e.message);
    }
  }

  // ─── Contratos ────────────────────────────────────────────────────────────

  /**
   * Executado quando contrato vence ou está próximo de vencer.
   * Fase 4: criar tarefa de renovação.
   */
  function onContratoVencendo(contratoId, orgId, email) {
    try {
      SystemEvents.emit(SystemEventTypes.CONTRACT_EXPIRED, {
        entidade: 'contrato', entidadeId: contratoId, usuario: email, orgId: orgId,
        origem: 'IntegracaoOrquestrador.onContratoVencendo'
      });
      // Criar tarefa de renovação (best-effort)
      try {
        if (typeof TarefaEngine !== 'undefined') {
          TarefaEngine.criarAutomatica('contrato_vencendo', contratoId, orgId, email, {
            modulo: 'financeiro', prioridade: 'alta'
          });
        }
      } catch (eTarefa) {
        Logger.warn('integracao_orquestrador', 'onContratoVencendo:tarefa', eTarefa.message);
      }
    } catch (e) {
      Logger.warn('integracao_orquestrador', 'onContratoVencendo', e.message);
    }
  }

  // ─── Tarefas ──────────────────────────────────────────────────────────────

  /**
   * Executado quando tarefa é concluída.
   * Fase 6: verificar avanço de processo vinculado.
   */
  function onTarefaConcluida(tarefaId, orgId, email) {
    try {
      SystemEvents.emit(SystemEventTypes.TASK_COMPLETED, {
        entidade: 'tarefa', entidadeId: tarefaId, usuario: email, orgId: orgId,
        origem: 'IntegracaoOrquestrador.onTarefaConcluida'
      });
      // Fase 6: DemandaEngine.verificarAvanco(tarefaId, orgId);
    } catch (e) {
      Logger.warn('integracao_orquestrador', 'onTarefaConcluida', e.message);
    }
  }

  // ─── Chaves ───────────────────────────────────────────────────────────────

  /**
   * Executado quando protocolo de chave está atrasado.
   * Fase 2: criar tarefa de cobrança.
   */
  function onProtocoloChaveAtrasado(protocoloId, orgId, email) {
    try {
      SystemEvents.emit(SystemEventTypes.KEY_PROTOCOL_DELAYED, {
        entidade: 'protocolo_chave', entidadeId: protocoloId, usuario: email, orgId: orgId,
        origem: 'IntegracaoOrquestrador.onProtocoloChaveAtrasado'
      });
      // Tarefas de chave atrasada NÃO são criadas automaticamente — apenas via vínculo explícito.
    } catch (e) {
      Logger.warn('integracao_orquestrador', 'onProtocoloChaveAtrasado', e.message);
    }
  }

  /**
   * Executado quando item de almoxarifado não foi devolvido no prazo.
   * Fase 2: criar tarefa de cobrança de item.
   */
  function onItemNaoDevolvido(reservaItemId, orgId, email) {
    try {
      SystemEvents.emit(SystemEventTypes.ITEM_NOT_RETURNED || 'ITEM_NOT_RETURNED', {
        entidade: 'reserva_item', entidadeId: reservaItemId, usuario: email, orgId: orgId,
        origem: 'IntegracaoOrquestrador.onItemNaoDevolvido'
      });
      // Fase 2: TarefaEngine.criarAutomatica('item_nao_devolvido', reservaItemId, orgId, email);
    } catch (e) {
      Logger.warn('integracao_orquestrador', 'onItemNaoDevolvido', e.message);
    }
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  return {
    onReservaConfirmada:       onReservaConfirmada,
    onAcaoIniciada:            onAcaoIniciada,
    onAcaoConcluida:           onAcaoConcluida,
    onContratoVencendo:        onContratoVencendo,
    onTarefaConcluida:         onTarefaConcluida,
    onProtocoloChaveAtrasado:  onProtocoloChaveAtrasado,
    onItemNaoDevolvido:        onItemNaoDevolvido
  };

})();
