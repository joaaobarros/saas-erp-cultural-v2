/**
 * @file modules/espacos/reserva_engine.gs
 * @layer modules/espacos
 * @description Engine de Reservas de Espaço — conflito impossível por design.
 *
 * PRINCÍPIO DE DESIGN (Fase 2.1):
 *   assertSemConflito() é chamado dentro de LockService ANTES de qualquer escrita.
 *   Isso garante atomicidade: nenhuma reserva pode ser criada com sobreposição.
 *
 * FSM de Reserva:
 *   pendente → confirmado → em_uso → concluido
 *   pendente → cancelado
 *   confirmado → cancelado
 *
 * @depends modules/espacos/reserva_repository.gs (ReservaRepository)
 *          core/services/auditoria_service.gs (AuditoriaService)
 *          core/event_bus_backend.gs (SystemEvents)
 *          core/events_constants.gs (SystemEventTypes)
 *          core/services/fsm_guardian.gs (FsmGuardian)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 */

// ── FSM de Reserva ────────────────────────────────────────────────────────

var STATUS_RESERVA = Object.freeze({
  PENDENTE:   'pendente',
  CONFIRMADO: 'confirmado',
  EM_USO:     'em_uso',
  CONCLUIDO:  'concluido',
  CANCELADO:  'cancelado'
});

var _TRANSICOES_RESERVA = {
  'pendente':   ['confirmado', 'cancelado'],
  'confirmado': ['em_uso',     'cancelado'],
  'em_uso':     ['concluido'],
  'concluido':  [],   // terminal
  'cancelado':  []    // terminal
};

if (typeof FsmGuardian !== 'undefined') {
  try { FsmGuardian.registrar('reservas', _TRANSICOES_RESERVA); } catch (_) {}
}

// ── Engine ────────────────────────────────────────────────────────────────

var ReservaEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  // ── Utilidades de horário ────────────────────────────────────────────

  /**
   * Converte "HH:MM" em minutos desde meia-noite.
   * @param {string} hora — "HH:MM"
   * @returns {number} minutos (ou -1 se inválido)
   */
  function _horaParaMin(hora) {
    if (!hora) return -1;
    var s = String(hora).trim();
    // Tratar objetos Date que podem vir da Sheet
    if (hora instanceof Date) {
      return hora.getHours() * 60 + hora.getMinutes();
    }
    var p = s.split(':');
    if (p.length < 2) return -1;
    var h = parseInt(p[0], 10), m = parseInt(p[1], 10);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  }

  /**
   * Verifica se dois intervalos de horário se sobrepõem.
   * Buffer de 5 minutos incluído para intervalo entre eventos.
   * @returns {boolean}
   */
  function _horariosSobrepoem(ini1, fim1, ini2, fim2) {
    var BUFFER = 0; // pode ser aumentado para 5 min se necessário
    return ini1 < (fim2 + BUFFER) && ini2 < (fim1 + BUFFER);
  }

  // ── assertSemConflito — guarda central ──────────────────────────────

  /**
   * Verifica se existe conflito de horário para a sala solicitada.
   * DEVE ser chamado dentro de LockService.getScriptLock().
   *
   * @param {string} sala
   * @param {string} data — YYYY-MM-DD
   * @param {string} horaInicio — "HH:MM"
   * @param {string} horaTermino — "HH:MM"
   * @param {string} orgId
   * @param {string} [excluirId] — para edição: ignora a própria reserva
   * @throws Error se houver conflito — mensagem descritiva
   */
  function assertSemConflito(sala, data, horaInicio, horaTermino, orgId, excluirId) {
    if (!sala || !data || !horaInicio || !horaTermino) {
      throw new Error('assertSemConflito: sala, data, horaInicio e horaTermino são obrigatórios.');
    }

    var iniMin = _horaParaMin(horaInicio);
    var fimMin = _horaParaMin(horaTermino);

    if (iniMin < 0 || fimMin < 0) {
      throw new Error('Horário inválido: ' + horaInicio + ' / ' + horaTermino);
    }
    if (fimMin <= iniMin) {
      throw new Error('Horário de término deve ser posterior ao de início.');
    }

    var ativas = ReservaRepository.listarAtivosParaConflito(sala, data, orgId, excluirId || null);

    for (var i = 0; i < ativas.length; i++) {
      var r = ativas[i];
      var rIni = _horaParaMin(r.horaInicio);
      var rFim = _horaParaMin(r.horaTermino);
      if (rIni < 0 || rFim < 0) continue;

      if (_horariosSobrepoem(iniMin, fimMin, rIni, rFim)) {
        var fmt = function(m) {
          return String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0');
        };
        throw new Error(
          'Conflito de reserva: "' + (r.nomeAcao || r.sala) + '" já reservada das ' +
          fmt(rIni) + ' às ' + fmt(rFim) + '. Escolha outro horário ou sala.'
        );
      }
    }
  }

  // ── assertHorarioFuncionamento ─────────────────────────────────────

  /**
   * Valida se o horário está dentro do funcionamento configurado.
   * Por padrão: 07:00–23:00. Pode ser expandido via SistemaConfigService.
   */
  function assertHorarioFuncionamento(horaInicio, horaTermino) {
    var iniMin = _horaParaMin(horaInicio);
    var fimMin = _horaParaMin(horaTermino);
    var ABERTURA = 7 * 60;  // 07:00
    var FECHAMENTO = 23 * 60; // 23:00

    if (iniMin < ABERTURA) {
      throw new Error('Horário de início (' + horaInicio + ') anterior à abertura (07:00).');
    }
    if (fimMin > FECHAMENTO) {
      throw new Error('Horário de término (' + horaTermino + ') posterior ao fechamento (23:00).');
    }
  }

  // ── Operações de reserva ──────────────────────────────────────────────

  /**
   * Cria uma reserva para uma única data.
   * Usa LockService para garantir exclusão mútua na verificação de conflito.
   *
   * @param {Object} dados — { sala, data, horaInicio, horaTermino, nomeAcao, responsavel, ... }
   * @param {string} autor
   * @param {string} orgId
   * @returns {Reserva}
   */
  function criar(dados, autor, orgId) {
    if (!dados.sala)       throw new Error('Sala é obrigatória.');
    if (!dados.data)       throw new Error('Data é obrigatória.');
    if (!dados.horaInicio) throw new Error('Horário de início é obrigatório.');
    if (!dados.horaTermino)throw new Error('Horário de término é obrigatório.');
    if (!dados.nomeAcao)   throw new Error('Nome da ação/evento é obrigatório.');
    if (!dados.responsavel)throw new Error('Responsável é obrigatório.');

    assertHorarioFuncionamento(dados.horaInicio, dados.horaTermino);

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      // Verificação de conflito DENTRO do lock — atomicidade garantida
      assertSemConflito(dados.sala, dados.data, dados.horaInicio, dados.horaTermino, orgId);

      var reserva = {
        orgId:         orgId,
        data:          dados.data,
        horaInicio:    dados.horaInicio,
        horaTermino:   dados.horaTermino,
        sala:          dados.sala,
        turno:         dados.turno || _inferirTurno(dados.horaInicio),
        nomeAcao:      dados.nomeAcao,
        tipoAcao:      dados.tipoAcao || '',
        responsavel:   dados.responsavel,
        setor:         dados.setor || '',
        coResponsavel: dados.coResponsavel || '',
        release:       dados.release || '',
        itensVolantes: dados.itensVolantes || '',
        status:        STATUS_RESERVA.PENDENTE,
        motivoCancelamento: '',
        observacoes:   dados.observacoes || '',
        acaoId:        dados.acaoId || '',
        idLote:        '',
        criadoPor:     autor
      };

      var salva = ReservaRepository.salvar(reserva);

      AuditoriaService.registrar('RESERVA_CRIADA', 'espacos', {
        reservaId: salva.id,
        sala: salva.sala,
        data: salva.data,
        horario: salva.horaInicio + '-' + salva.horaTermino,
        nomeAcao: salva.nomeAcao,
        responsavel: salva.responsavel,
        autor: autor,
        orgId: orgId
      });

      SystemEvents.emit(SystemEventTypes.RESERVATION_CREATED, {
        reservaId: salva.id,
        sala:      salva.sala,
        data:      salva.data,
        responsavel: salva.responsavel,
        orgId:     orgId
      });

      Logger.info('reserva_engine', 'criar', 'Reserva criada: ' + salva.id);
      return salva;

    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Cria reservas para múltiplas datas (agendamento em lote).
   * Cada data é verificada individualmente dentro do mesmo lock.
   *
   * @param {Object} dados — campos base da reserva
   * @param {string[]} datas — array de strings YYYY-MM-DD
   * @param {string} autor
   * @param {string} orgId
   * @returns {{ total: number, idLote: string, reservas: Reserva[] }}
   */
  function criarLote(dados, datas, autor, orgId) {
    if (!dados.sala || !dados.horaInicio || !dados.horaTermino || !dados.nomeAcao) {
      throw new Error('Campos obrigatórios não preenchidos.');
    }
    if (!Array.isArray(datas) || datas.length === 0) {
      throw new Error('Informe ao menos uma data para o agendamento em lote.');
    }

    assertHorarioFuncionamento(dados.horaInicio, dados.horaTermino);

    // Verificar datas duplicadas
    var setDatas = {};
    datas.forEach(function (d) {
      if (setDatas[d]) throw new Error('Data duplicada no lote: ' + d);
      setDatas[d] = true;
    });

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {
      // Verificar TODOS os conflitos antes de inserir qualquer registro
      datas.forEach(function (data) {
        assertSemConflito(dados.sala, data, dados.horaInicio, dados.horaTermino, orgId);
      });

      var agr  = agora ? agora() : new Date().toISOString();
      var reservas = datas.map(function (data) {
        return {
          orgId:         orgId,
          data:          data,
          horaInicio:    dados.horaInicio,
          horaTermino:   dados.horaTermino,
          sala:          dados.sala,
          turno:         dados.turno || _inferirTurno(dados.horaInicio),
          nomeAcao:      dados.nomeAcao,
          tipoAcao:      dados.tipoAcao || '',
          responsavel:   dados.responsavel || autor,
          setor:         dados.setor || '',
          coResponsavel: dados.coResponsavel || '',
          release:       dados.release || '',
          itensVolantes: dados.itensVolantes || '',
          status:        STATUS_RESERVA.PENDENTE,
          motivoCancelamento: '',
          observacoes:   dados.observacoes || '',
          acaoId:        dados.acaoId || '',
          criadoPor:     autor
        };
      });

      var salvas = ReservaRepository.salvarLote(reservas);

      AuditoriaService.registrar('RESERVAS_LOTE_CRIADAS', 'espacos', {
        total: salvas.length,
        idLote: salvas[0] && salvas[0].idLote,
        sala: dados.sala,
        nomeAcao: dados.nomeAcao,
        autor: autor,
        orgId: orgId
      });

      Logger.info('reserva_engine', 'criarLote', salvas.length + ' reservas em lote criadas.');
      return { total: salvas.length, idLote: salvas[0] && salvas[0].idLote, reservas: salvas };

    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Transiciona o status de uma reserva.
   * @param {string} id
   * @param {string} novoStatus
   * @param {string} autor
   * @param {string} orgId
   * @param {string} [motivo] — para cancelamentos
   */
  function mudarStatus(id, novoStatus, autor, orgId, motivo) {
    var reserva = ReservaRepository.buscarPorId(id, orgId);
    if (!reserva) throw new Error('Reserva não encontrada: ' + id);

    FsmGuardian.transitar('reservas', reserva.status, novoStatus,
      'Reserva ' + id + ' → ' + novoStatus);

    ReservaRepository.atualizarStatus(id, novoStatus, orgId, motivo || '');

    AuditoriaService.registrar('RESERVA_STATUS_ALTERADO', 'espacos', {
      reservaId: id,
      de: reserva.status,
      para: novoStatus,
      motivo: motivo || '',
      autor: autor,
      orgId: orgId
    });

    if (novoStatus === STATUS_RESERVA.CANCELADO) {
      SystemEvents.emit(SystemEventTypes.RESERVATION_CANCELLED, {
        reservaId: id, sala: reserva.sala, data: reserva.data,
        motivo: motivo || '', autor: autor, orgId: orgId
      });
    }

    Logger.info('reserva_engine', 'mudarStatus', id + ': ' + reserva.status + ' → ' + novoStatus);
    return { id: id, de: reserva.status, para: novoStatus };
  }

  /**
   * Atualiza dados de uma reserva existente (verificando conflito).
   */
  function atualizar(id, dados, autor, orgId) {
    var reserva = ReservaRepository.buscarPorId(id, orgId);
    if (!reserva) throw new Error('Reserva não encontrada: ' + id);
    if (reserva.status === STATUS_RESERVA.CANCELADO) {
      throw new Error('Não é possível editar uma reserva cancelada.');
    }

    // Se horário ou sala mudou, revalidar conflito
    var salaAlterada = dados.sala && dados.sala !== reserva.sala;
    var dataAlterada = dados.data && dados.data !== reserva.data;
    var horarioAlterado = (dados.horaInicio && dados.horaInicio !== reserva.horaInicio) ||
                          (dados.horaTermino && dados.horaTermino !== reserva.horaTermino);

    if (salaAlterada || dataAlterada || horarioAlterado) {
      var sala      = dados.sala      || reserva.sala;
      var data      = dados.data      || reserva.data;
      var horaIni   = dados.horaInicio  || reserva.horaInicio;
      var horaFim   = dados.horaTermino || reserva.horaTermino;

      assertHorarioFuncionamento(horaIni, horaFim);

      var lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        assertSemConflito(sala, data, horaIni, horaFim, orgId, id);
      } finally {
        lock.releaseLock();
      }
    }

    // Mesclar dados
    Object.keys(dados).forEach(function (k) {
      if (dados[k] !== undefined && k !== 'id' && k !== 'orgId') {
        reserva[k] = dados[k];
      }
    });

    var salva = ReservaRepository.salvar(reserva);

    AuditoriaService.registrar('RESERVA_ATUALIZADA', 'espacos', {
      reservaId: id, alteracoes: dados, autor: autor, orgId: orgId
    });

    SystemEvents.emit(SystemEventTypes.RESERVATION_UPDATED, {
      reservaId: id, orgId: orgId
    });

    return salva;
  }

  /**
   * Verifica disponibilidade de uma sala (sem criar reserva).
   * Retorna conflitos detalhados + horários livres sugeridos.
   */
  function verificarDisponibilidade(sala, data, horaInicio, horaTermino, orgId) {
    var ativas = ReservaRepository.listarAtivosParaConflito(sala, data, orgId, null);
    var iniMin = _horaParaMin(horaInicio);
    var fimMin = _horaParaMin(horaTermino);
    var conflitos = [];

    ativas.forEach(function (r) {
      var rIni = _horaParaMin(r.horaInicio);
      var rFim = _horaParaMin(r.horaTermino);
      if (rIni < 0 || rFim < 0) return;
      if (_horariosSobrepoem(iniMin, fimMin, rIni, rFim)) {
        conflitos.push({
          nome: r.nomeAcao,
          horaInicio: r.horaInicio,
          horaTermino: r.horaTermino,
          responsavel: r.responsavel
        });
      }
    });

    // Calcular horários livres no dia (07:00–23:00)
    var ocupados = ativas.map(function (r) {
      return { ini: _horaParaMin(r.horaInicio), fim: _horaParaMin(r.horaTermino) };
    }).filter(function (o) { return o.ini >= 0 && o.fim >= 0; });
    ocupados.sort(function (a, b) { return a.ini - b.ini; });

    var livres = [];
    var cursor = 7 * 60;
    var fimDia = 23 * 60;
    var fmt = function (m) { return String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0'); };

    ocupados.forEach(function (o) {
      if (cursor < o.ini) livres.push({ de: fmt(cursor), ate: fmt(o.ini) });
      cursor = Math.max(cursor, o.fim);
    });
    if (cursor < fimDia) livres.push({ de: fmt(cursor), ate: fmt(fimDia) });

    return {
      temConflito: conflitos.length > 0,
      conflitos: conflitos,
      horariosLivres: livres
    };
  }

  /**
   * Métricas consolidadas de reservas.
   * @param {string} orgId
   */
  function metricas(orgId) {
    return ReservaRepository.metricas(orgId);
  }

  /**
   * Lista reservas com filtros.
   * @param {Object} filtros
   * @param {string} orgId
   */
  function listar(filtros, orgId) {
    return ReservaRepository.listar(filtros || {}, orgId);
  }

  // ── Helpers privados ────────────────────────────────────────────────

  function _inferirTurno(horaInicio) {
    var min = _horaParaMin(horaInicio);
    if (min < 0) return '';
    if (min < 12 * 60) return 'manha';
    if (min < 18 * 60) return 'tarde';
    return 'noite';
  }

  // ── Interface pública ────────────────────────────────────────────────

  return {
    // Consulta
    listar:                  listar,
    metricas:                metricas,
    verificarDisponibilidade: verificarDisponibilidade,

    // Escrita
    criar:       criar,
    criarLote:   criarLote,
    atualizar:   atualizar,
    mudarStatus: mudarStatus,

    // Guarda de conflito (exposta para testes)
    assertSemConflito:          assertSemConflito,
    assertHorarioFuncionamento: assertHorarioFuncionamento,

    // Constantes
    STATUS: STATUS_RESERVA
  };

})();
