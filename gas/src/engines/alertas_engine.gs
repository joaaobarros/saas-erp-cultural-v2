/**
 * @file engines/alertas_engine.gs
 * @layer engines
 * @description Engine centralizada de alertas operacionais do sistema.
 *
 * STATUS: Fase 0 — catálogo de tipos definido, lógica de verificação é stub.
 * Fase 10: implementar todas as verificações + notificações + escalação.
 *
 * TIPOS DE ALERTA (25+):
 *
 * RESERVAS / ESPAÇOS
 *   - RESERVA_PENDENTE_APROVACAO        — reserva aguardando aprovação há mais de N horas
 *   - RESERVA_SEM_RESPONSAVEL           — reserva confirmada sem responsável designado
 *   - CONFLITO_RESERVA_DETECTADO        — sobreposição não bloqueada (não deveria ocorrer)
 *   - CHAVE_NAO_DEVOLVIDA               — protocolo de chave em atraso
 *   - ITEM_NAO_DEVOLVIDO                — empréstimo de item em atraso
 *   - MANUTENCAO_VENCENDO               — manutenção programada em < 7 dias sem responsável
 *
 * AÇÕES / PROGRAMAÇÃO
 *   - ACAO_SEM_RESPONSAVEL              — ação sem responsável designado
 *   - ACAO_ATRASADA                     — ação com data de início passada sem transição
 *   - ACAO_SEM_ORCAMENTO                — ação aprovada sem rubrica vinculada
 *   - HABILITACAO_VENCENDO              — habilitação de colaborador vence em < 30 dias
 *   - CODIP_PENDENTE                    — ação concluída há > 30 dias sem CODIP preenchido
 *
 * FINANCEIRO / CONTRATOS
 *   - CONTRATO_VENCENDO                 — contrato vence em < 30 dias sem renovação
 *   - CONTRATO_VENCIDO                  — contrato vencido ainda ativo
 *   - ORCAMENTO_ESTOURADO               — rubrica ultrapassa limite aprovado
 *   - PAGAMENTO_ATRASADO                — pagamento com data passada não confirmado
 *   - FONTE_RECURSO_EXPIRANDO           — fonte de recurso vence em < 60 dias
 *
 * PESSOAS / RH
 *   - FERIAS_NAO_PROGRAMADAS            — colaborador com férias vencidas sem programação
 *   - ESCALA_DESCOBERTA                 — turno sem colaborador escalado
 *   - AFASTAMENTO_SEM_SUBSTITUTO        — afastamento aprovado sem substituto na escala
 *
 * SISTEMA
 *   - EVENTO_PENDENTE_EXCESSIVO         — EventLog com > 100 eventos não processados
 *   - AUDITORIA_FALHA                   — operação crítica sem registro de auditoria
 *   - HEALTH_CHECK_FAIL                 — verificarTodasAbas() retorna < 100%
 *   - LOCK_TIMEOUT                      — LockService timeout recorrente
 *
 * REUNIÕES / DEMANDAS
 *   - ENCAMINHAMENTO_VENCIDO            — encaminhamento sem conclusão após prazo
 *   - DEMANDA_COMUNICACAO_SLA           — demanda de comunicação ultrapassou SLA configurado
 *   - SOLICITACAO_SEM_ANALISE           — solicitação de espaço aguardando análise > 48h
 *
 * @depends core/config.gs, core/logger.gs, core/notification_engine.gs,
 *          core/event_bus_backend.gs, core/events_constants.gs
 */

var AlertasEngine = (function () {

  var SEVERIDADE = {
    INFO:    'INFO',
    ATENCAO: 'ATENCAO',
    URGENTE: 'URGENTE'
  };

  var TIPOS = {
    // Reservas / Espaços
    RESERVA_PENDENTE_APROVACAO:    { severidade: SEVERIDADE.ATENCAO, modulo: 'espacos' },
    RESERVA_SEM_RESPONSAVEL:       { severidade: SEVERIDADE.ATENCAO, modulo: 'espacos' },
    CONFLITO_RESERVA_DETECTADO:    { severidade: SEVERIDADE.URGENTE, modulo: 'espacos' },
    CHAVE_NAO_DEVOLVIDA:           { severidade: SEVERIDADE.ATENCAO, modulo: 'espacos' },
    ITEM_NAO_DEVOLVIDO:            { severidade: SEVERIDADE.ATENCAO, modulo: 'espacos' },
    MANUTENCAO_VENCENDO:           { severidade: SEVERIDADE.ATENCAO, modulo: 'espacos' },
    // Ações / Programação
    ACAO_SEM_RESPONSAVEL:          { severidade: SEVERIDADE.ATENCAO, modulo: 'acoes' },
    ACAO_ATRASADA:                 { severidade: SEVERIDADE.URGENTE, modulo: 'acoes' },
    ACAO_SEM_ORCAMENTO:            { severidade: SEVERIDADE.ATENCAO, modulo: 'acoes' },
    HABILITACAO_VENCENDO:          { severidade: SEVERIDADE.ATENCAO, modulo: 'acoes' },
    CODIP_PENDENTE:                { severidade: SEVERIDADE.ATENCAO, modulo: 'relatorios' },
    // Financeiro / Contratos
    CONTRATO_VENCENDO:             { severidade: SEVERIDADE.ATENCAO, modulo: 'financeiro' },
    CONTRATO_VENCIDO:              { severidade: SEVERIDADE.URGENTE, modulo: 'financeiro' },
    ORCAMENTO_ESTOURADO:           { severidade: SEVERIDADE.URGENTE, modulo: 'financeiro' },
    PAGAMENTO_ATRASADO:            { severidade: SEVERIDADE.ATENCAO, modulo: 'financeiro' },
    FONTE_RECURSO_EXPIRANDO:       { severidade: SEVERIDADE.ATENCAO, modulo: 'financeiro' },
    // Pessoas / RH
    FERIAS_NAO_PROGRAMADAS:        { severidade: SEVERIDADE.ATENCAO, modulo: 'pessoas' },
    ESCALA_DESCOBERTA:             { severidade: SEVERIDADE.URGENTE, modulo: 'pessoas' },
    AFASTAMENTO_SEM_SUBSTITUTO:    { severidade: SEVERIDADE.URGENTE, modulo: 'pessoas' },
    // Sistema
    EVENTO_PENDENTE_EXCESSIVO:     { severidade: SEVERIDADE.URGENTE, modulo: 'sistema' },
    AUDITORIA_FALHA:               { severidade: SEVERIDADE.URGENTE, modulo: 'sistema' },
    HEALTH_CHECK_FAIL:             { severidade: SEVERIDADE.URGENTE, modulo: 'sistema' },
    LOCK_TIMEOUT:                  { severidade: SEVERIDADE.ATENCAO, modulo: 'sistema' },
    // Reuniões / Demandas
    ENCAMINHAMENTO_VENCIDO:        { severidade: SEVERIDADE.ATENCAO, modulo: 'reunioes' },
    DEMANDA_COMUNICACAO_SLA:       { severidade: SEVERIDADE.ATENCAO, modulo: 'comunicacao' },
    SOLICITACAO_SEM_ANALISE:       { severidade: SEVERIDADE.ATENCAO, modulo: 'espacos' }
  };

  /**
   * Emite um alerta.
   * Persiste em AlertasLog e notifica destinatários via NotificationEngine.
   *
   * @param {string} tipo — chave de TIPOS
   * @param {string} mensagem
   * @param {object} contexto — { entidadeId, entidade, orgId, destinatarios[] }
   */
  function emitir(tipo, mensagem, contexto) {
    var orgId = (contexto && contexto.orgId) || getOrgConfig().orgId;
    var meta  = TIPOS[tipo] || { severidade: SEVERIDADE.INFO, modulo: 'sistema' };

    var alerta = {
      id:           gerarId('alrt'),
      tipo:         tipo,
      severidade:   meta.severidade,
      modulo:       meta.modulo,
      mensagem:     mensagem,
      entidade:     (contexto && contexto.entidade)   || null,
      entidadeId:   (contexto && contexto.entidadeId) || null,
      orgId:        orgId,
      criadoEm:     agora(),
      lido:         false,
      resolvido:    false
    };

    _persistir(alerta, orgId);

    if (meta.severidade === SEVERIDADE.URGENTE) {
      _notificarAdmins(alerta, contexto && contexto.destinatarios);
    }

    Logger.warn('alertas_engine', 'emitir', '[' + meta.severidade + '] ' + tipo + ': ' + mensagem);
    return alerta;
  }

  /**
   * Retorna alertas não resolvidos do orgId.
   * Fase 10: filtrar por módulo, severidade, período.
   */
  function listarAtivos(orgId) {
    // Fase 10: implementar consulta real ao AlertasLog
    Logger.info('alertas_engine', 'listarAtivos', 'Stub Fase 10 — orgId: ' + orgId);
    return [];
  }

  /**
   * Marca alerta como resolvido.
   */
  function resolver(alertaId, email) {
    // Fase 10: atualizar AlertasLog
    Logger.info('alertas_engine', 'resolver', 'Stub Fase 10 — id: ' + alertaId);
    return true;
  }

  /**
   * Executa verificação completa de todos os alertas automáticos.
   * Chamado pelo trigger assíncrono de 30 min (junto com processarEventosPendentes).
   * Fase 10: implementar todas as verificações.
   */
  function verificarTodosAutomaticos() {
    var orgId = getOrgConfig().orgId;
    try {
      _verificarSaude(orgId);
      _verificarEventosPendentes(orgId);
      // Fase 10: chamar verificações de cada módulo
      Logger.info('alertas_engine', 'verificarTodosAutomaticos', 'Verificação automática concluída (Fase 0 — só health/eventos)');
    } catch(e) {
      Logger.error('alertas_engine', 'verificarTodosAutomaticos', e.message);
    }
  }

  // ─── Verificações stub ────────────────────────────────────────────────────

  function _verificarSaude(orgId) {
    try {
      var resultado = verificarTodasAbas();
      if (!resultado.ok) {
        emitir('HEALTH_CHECK_FAIL',
          'Sistema com ' + resultado.percentual + '% das abas presentes.',
          { orgId: orgId, entidade: 'sistema', entidadeId: 'health' });
      }
    } catch(e) {
      Logger.warn('alertas_engine', '_verificarSaude', e.message);
    }
  }

  function _verificarEventosPendentes(orgId) {
    try {
      var eventos = SystemEvents.getRecentes(200);
      var pendentes = eventos.filter(function(e) {
        return !e.processado && e.orgId === orgId;
      });
      if (pendentes.length > 100) {
        emitir('EVENTO_PENDENTE_EXCESSIVO',
          pendentes.length + ' eventos pendentes no EventLog.',
          { orgId: orgId, entidade: 'sistema', entidadeId: 'event_log' });
      }
    } catch(e) {
      Logger.warn('alertas_engine', '_verificarEventosPendentes', e.message);
    }
  }

  // ─── Persistência e notificação ────────────────────────────────────────────

  function _persistir(alerta, orgId) {
    try {
      var props   = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty('SHEET_ID_MASTER');
      if (!sheetId) return;
      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName('AlertasLog');
      if (!aba) return;
      aba.appendRow([
        alerta.id, alerta.tipo, alerta.severidade, alerta.modulo,
        alerta.mensagem, alerta.entidade || '', alerta.entidadeId || '',
        alerta.criadoEm, orgId, false, false
      ]);
    } catch(e) {
      Logger.warn('alertas_engine', '_persistir', e.message);
    }
  }

  function _notificarAdmins(alerta, destinatariosExtra) {
    try {
      if (typeof NotificationEngine === 'undefined') return;
      NotificationEngine.notificarAdmins({
        tipo:      'ALERTA_URGENTE',
        assunto:   '[URGENTE] ' + alerta.tipo,
        mensagem:  alerta.mensagem,
        orgId:     alerta.orgId,
        contexto:  { alertaId: alerta.id, modulo: alerta.modulo }
      });
    } catch(e) {
      Logger.warn('alertas_engine', '_notificarAdmins', e.message);
    }
  }

  return {
    emitir:                  emitir,
    listarAtivos:            listarAtivos,
    resolver:                resolver,
    verificarTodosAutomaticos: verificarTodosAutomaticos,
    SEVERIDADE:              SEVERIDADE,
    TIPOS:                   TIPOS
  };

})();
