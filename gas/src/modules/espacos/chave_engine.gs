/**
 * @file modules/espacos/chave_engine.gs
 * @layer modules/espacos
 * @description Engine de Protocolo de Chaves — rastreabilidade de uso de espaços.
 *
 * FSM de Protocolo de Chave:
 *   aberto → devolvido   (devolução normal)
 *   aberto → atrasado → devolvido   (atraso detectado por trigger)
 *
 * Integração:
 *   - Emite KEY_PROTOCOL_CREATED ao abrir protocolo
 *   - Emite KEY_PROTOCOL_RETURNED ao devolver
 *   - Emite KEY_PROTOCOL_DELAYED quando verificarAtrasos() detecta atraso
 *
 * @depends modules/espacos/chave_repository.gs (ChaveRepository)
 *          core/services/auditoria_service.gs (AuditoriaService)
 *          core/event_bus_backend.gs (SystemEvents)
 *          core/events_constants.gs (SystemEventTypes)
 *          core/services/fsm_guardian.gs (FsmGuardian)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 */

// ── FSM de Protocolo de Chave ─────────────────────────────────────────────

var STATUS_PROTOCOLO = Object.freeze({
  ABERTO:    'aberto',
  ATRASADO:  'atrasado',
  DEVOLVIDO: 'devolvido'
});

var _TRANSICOES_PROTOCOLO = {
  'aberto':    ['devolvido', 'atrasado'],
  'atrasado':  ['devolvido'],
  'devolvido': []  // terminal
};

if (typeof FsmGuardian !== 'undefined') {
  try { FsmGuardian.registrar('protocolo_chave', _TRANSICOES_PROTOCOLO); } catch (_) {}
}

// ── Engine ────────────────────────────────────────────────────────────────

var ChaveEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  // ── Operações ────────────────────────────────────────────────────────

  /**
   * Abre um protocolo de retirada de chave.
   * @param {Object} dados — { nomeSala, responsavel, nomeResponsavel, setor, turno,
   *                            dataRetirada, dataDevolucao (prevista), reservaId }
   * @param {string} autor
   * @param {string} orgId
   * @returns {Protocolo}
   */
  function abrirProtocolo(dados, autor, orgId) {
    if (!dados.nomeSala)    throw new Error('Nome da sala é obrigatório.');
    if (!dados.responsavel) throw new Error('Responsável é obrigatório.');
    if (!dados.dataRetirada)throw new Error('Data de retirada é obrigatória.');

    var protocolo = {
      orgId:             orgId,
      nomeSala:          dados.nomeSala,
      responsavel:       dados.responsavel,
      nomeResponsavel:   dados.nomeResponsavel || '',
      setor:             dados.setor   || '',
      turno:             dados.turno   || _inferirTurnoAtual(),
      dataRetirada:      dados.dataRetirada,
      dataDevolucao:     dados.dataDevolucao || '',
      dataDevolucaoReal: '',
      reservaId:         dados.reservaId || '',
      status:            STATUS_PROTOCOLO.ABERTO,
      observacoes:       dados.observacoes || '',
      criadoPor:         autor
    };

    var salvo = ChaveRepository.salvar(protocolo);

    AuditoriaService.registrar('PROTOCOLO_CHAVE_ABERTO', 'espacos', {
      protocoloId: salvo.id, sala: salvo.nomeSala, responsavel: salvo.responsavel,
      autor: autor, orgId: orgId
    });

    SystemEvents.emit(SystemEventTypes.KEY_PROTOCOL_CREATED, {
      protocoloId: salvo.id, sala: salvo.nomeSala, responsavel: salvo.responsavel,
      dataRetirada: salvo.dataRetirada, orgId: orgId
    });

    Logger.info('chave_engine', 'abrirProtocolo', 'Protocolo aberto: ' + salvo.id);
    return salvo;
  }

  /**
   * Registra devolução de chave.
   * @param {string} protocoloId
   * @param {string} ator
   * @param {string} observacao
   * @param {string} orgId
   */
  function registrarDevolucao(protocoloId, ator, observacao, orgId) {
    var protocolo = ChaveRepository.buscarPorId(protocoloId, orgId);
    if (!protocolo) throw new Error('Protocolo não encontrado: ' + protocoloId);

    FsmGuardian.assertValida('protocolo_chave', protocolo.status, STATUS_PROTOCOLO.DEVOLVIDO,
      protocoloId, ator);

    var agr = agora ? agora() : new Date().toISOString();
    ChaveRepository.atualizarStatus(protocoloId, STATUS_PROTOCOLO.DEVOLVIDO, orgId, {
      DataDevolucaoReal: agr,
      Observacoes: observacao || ''
    });

    AuditoriaService.registrar('PROTOCOLO_CHAVE_DEVOLVIDO', 'espacos', {
      protocoloId: protocoloId, sala: protocolo.nomeSala, responsavel: protocolo.responsavel,
      ator: ator, dataDevolucao: agr, orgId: orgId
    });

    SystemEvents.emit(SystemEventTypes.KEY_PROTOCOL_RETURNED, {
      protocoloId: protocoloId, sala: protocolo.nomeSala,
      responsavel: protocolo.responsavel, ator: ator, orgId: orgId
    });

    Logger.info('chave_engine', 'registrarDevolucao', 'Devolvido: ' + protocoloId);
    return { id: protocoloId, status: STATUS_PROTOCOLO.DEVOLVIDO, dataDevolucaoReal: agr };
  }

  /**
   * Verifica protocolos em atraso e os marca como atrasados.
   * Deve ser chamado por trigger periódico via EventHandlerRegistry.
   * @param {string} orgId
   * @returns {{ verificados: number, atrasados: number }}
   */
  function verificarAtrasos(orgId) {
    var hoje = new Date().toISOString().substring(0, 10);
    var protocolos = ChaveRepository.listar({ status: STATUS_PROTOCOLO.ABERTO }, orgId || _orgId());
    var atrasados = 0;

    protocolos.forEach(function (p) {
      if (!p.dataDevolucao) return;
      // Normalizar dataDevolucao para comparação
      var datadev = String(p.dataDevolucao).substring(0, 10);
      if (datadev < hoje) {
        try {
          FsmGuardian.assertValida('protocolo_chave', p.status, STATUS_PROTOCOLO.ATRASADO,
            p.id, 'sistema');
          ChaveRepository.atualizarStatus(p.id, STATUS_PROTOCOLO.ATRASADO, orgId || _orgId(), {});
          atrasados++;

          SystemEvents.emit(SystemEventTypes.KEY_PROTOCOL_DELAYED, {
            protocoloId: p.id, sala: p.nomeSala, responsavel: p.responsavel,
            dataDevolucaoPrevista: p.dataDevolucao, orgId: orgId
          });

          AuditoriaService.registrar('PROTOCOLO_CHAVE_ATRASADO', 'espacos', {
            protocoloId: p.id, sala: p.nomeSala, responsavel: p.responsavel, orgId: orgId
          });
        } catch (e) {
          Logger.warn('chave_engine', 'verificarAtrasos',
            'Erro ao marcar atraso em ' + p.id + ': ' + e.message);
        }
      }
    });

    Logger.info('chave_engine', 'verificarAtrasos',
      'Verificados: ' + protocolos.length + ', atrasados: ' + atrasados);
    return { verificados: protocolos.length, atrasados: atrasados };
  }

  /**
   * Lista protocolos com filtros.
   * @param {Object} filtros — { status, nomeSala, responsavel }
   * @param {string} orgId
   */
  function listar(filtros, orgId) {
    return ChaveRepository.listar(filtros || {}, orgId || _orgId());
  }

  /**
   * Métricas do módulo de chaves.
   * @param {string} orgId
   */
  function metricas(orgId) {
    return ChaveRepository.metricas(orgId || _orgId());
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  function _inferirTurnoAtual() {
    var hora = new Date().getHours();
    if (hora < 12) return 'manha';
    if (hora < 18) return 'tarde';
    return 'noite';
  }

  // ── Interface pública ────────────────────────────────────────────────

  return {
    abrirProtocolo:     abrirProtocolo,
    registrarDevolucao: registrarDevolucao,
    verificarAtrasos:   verificarAtrasos,
    listar:             listar,
    metricas:           metricas,
    STATUS:             STATUS_PROTOCOLO
  };

})();
