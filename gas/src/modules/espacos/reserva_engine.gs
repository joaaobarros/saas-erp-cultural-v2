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
  PENDENTE:    'pendente',
  CONFIRMADO:  'confirmado',
  HABILITADO:  'habilitado',
  EM_USO:      'em_uso',
  CONCLUIDO:   'concluido',
  CANCELADO:   'cancelado'
});

var _TRANSICOES_RESERVA = {
  'pendente':   ['confirmado', 'cancelado'],
  'confirmado': ['habilitado', 'em_uso', 'cancelado'],
  'habilitado': ['em_uso',     'cancelado'],
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
    var BUFFER = 5; // 5 minutos de margem entre reservas
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
        var _msgConflito = 'Conflito de horário: "' + (r.nomeAcao || r.sala) +
          '" já ocupa ' + fmt(rIni) + '–' + fmt(rFim) + ' neste espaço.';
        var _errConflito = new Error(_msgConflito);
        _errConflito.code = 'CONFLITO_RESERVA';
        // Resolve nome legível do espaço (SistemaConfigService já usado neste arquivo)
        var _salaNome = r.sala;
        try {
          var _esps = SistemaConfigService.getEspacos ? SistemaConfigService.getEspacos() : [];
          for (var _ei = 0; _ei < _esps.length; _ei++) {
            if (_esps[_ei].id === sala) { _salaNome = _esps[_ei].nome || sala; break; }
          }
        } catch (_) {}
        _errConflito.details = {
          sala:        r.sala,
          salaNome:    _salaNome,
          nomeAcao:    r.nomeAcao    || '—',
          horaInicio:  fmt(rIni),
          horaTermino: fmt(rFim),
          responsavel: r.responsavel || '',
          setor:       r.setor       || ''
        };
        throw _errConflito;
      }
    }
  }

  // ── assertHorarioFuncionamento ─────────────────────────────────────

  /**
   * Valida se o horário está dentro do funcionamento configurado.
   * Lê abertura/fechamento de ConfigService.getReservaHorario() — sem hardcode.
   */
  function assertHorarioFuncionamento(horaInicio, horaTermino) {
    var iniMin = _horaParaMin(horaInicio);
    var fimMin = _horaParaMin(horaTermino);
    var hor = ConfigService.getReservaHorario();
    var ABERTURA   = _horaParaMin(hor.inicio);
    var FECHAMENTO = _horaParaMin(hor.fim);

    if (iniMin < ABERTURA) {
      throw new Error('Horário de início (' + horaInicio + ') anterior à abertura (' + hor.inicio + ').');
    }
    if (fimMin > FECHAMENTO) {
      throw new Error('Horário de término (' + horaTermino + ') posterior ao fechamento (' + hor.fim + ').');
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
  function criar(dados, autor, orgId, _bypassSolicitacao) {
    if (!dados.sala)       throw new Error('Sala é obrigatória.');
    if (!dados.data)       throw new Error('Data é obrigatória.');
    if (!dados.horaInicio) throw new Error('Horário de início é obrigatório.');
    if (!dados.horaTermino)throw new Error('Horário de término é obrigatório.');
    if (!dados.nomeAcao)   throw new Error('Nome da ação/evento é obrigatório.');
    if (!dados.responsavel)throw new Error('Responsável é obrigatório.');

    // Validar sala contra catálogo (se catálogo tiver dados)
    var espacos = SistemaConfigService.getEspacos ? SistemaConfigService.getEspacos() : [];
    if (espacos && espacos.length > 0) {
      var esp = espacos.find(function(e) {
        return e.id === dados.sala && e.ativo !== false && e.aceitaReserva !== false;
      });
      if (!esp) throw new Error('Espaço inválido ou não reservável: ' + dados.sala);
      dados._espacoNome = esp.nome;
      dados.salaNome    = esp.nome;
    }

    // Roteamento: colaboradores sem permissão direta geram Solicitação
    if (!_bypassSolicitacao &&
        typeof SolicitacaoReservaEngine !== 'undefined' &&
        !SolicitacaoReservaEngine.podeReservarDiretamente(autor)) {
      return SolicitacaoReservaEngine.criar({
        tipo:          'RESERVA',
        espacoId:      dados.sala,
        justificativa: dados.justificativa || '',
        payload:       dados
      }, autor);
    }

    // Verificação de prioridade de setor — mesmo papéis privilegiados
    // (exceto admin/superadmin) são forçados a solicitar se o setor do solicitante
    // for diferente do setor prioritário para aquele espaço/dia/turno.
    if (!_bypassSolicitacao && typeof SolicitacaoReservaEngine !== 'undefined') {
      var _prio = SolicitacaoReservaEngine.verificarPrioridadeSetor(
        dados.sala, dados.data, dados.horaInicio, dados.horaTermino,
        dados.setor || '', autor
      );
      if (_prio.exigeSolicitacao) {
        return SolicitacaoReservaEngine.criar({
          tipo:          'RESERVA',
          espacoId:      dados.sala,
          justificativa: dados.justificativa || '',
          payload:       dados
        }, autor);
      }
    }

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
        salaNome:      dados.salaNome || dados.sala,
        turno:         dados.turno || _inferirTurno(dados.horaInicio, dados.horaTermino),
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

    // Coletar conflitos sem lançar erro imediatamente
    var datasComConflito = [];
    var datasLivres = [];
    datas.forEach(function(data) {
      try {
        assertSemConflito(dados.sala, data, dados.horaInicio, dados.horaTermino, orgId);
        datasLivres.push(data);
      } catch(e) {
        datasComConflito.push({ data: data, motivo: e.message });
      }
    });

    // Sem a flag criarApenasValidas: retorna info para o frontend pedir confirmação
    if (datasComConflito.length > 0 && !dados.criarApenasValidas) {
      return {
        pendente: true,
        conflitos: datasComConflito,
        datasValidas: datasLivres,
        total: 0
      };
    }

    // Com a flag ou sem conflitos: usa apenas as datas válidas
    var datasParaCriar = datasLivres;
    if (!datasParaCriar.length) {
      throw new Error('Todas as datas selecionadas têm conflito de horário. Não há datas disponíveis para criar.');
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {

      var agr  = agora ? agora() : new Date().toISOString();
      var reservas = datasParaCriar.map(function (data) {
        return {
          orgId:         orgId,
          data:          data,
          horaInicio:    dados.horaInicio,
          horaTermino:   dados.horaTermino,
          sala:          dados.sala,
          turno:         dados.turno || _inferirTurno(dados.horaInicio, dados.horaTermino),
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
      return { total: salvas.length, idLote: salvas[0] && salvas[0].idLote, reservas: salvas, conflitosIgnorados: datasComConflito.length };

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

    FsmGuardian.assertValida('reservas', reserva.status, novoStatus, id, autor);

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

      // Notificação urgente para admins quando cancelamento ocorre no próprio dia
      var _hojeCanc = new Date().toISOString().slice(0, 10);
      if (reserva.data === _hojeCanc) {
        try {
          var _todosUsuarios = (typeof AcessoService !== 'undefined' && AcessoService.listarUsuarios)
            ? AcessoService.listarUsuarios() : [];
          _todosUsuarios
            .filter(function(u) {
              return (u.papel === 'admin' || u.papel === 'superadmin') && u.email && u.email !== autor;
            })
            .forEach(function(u) {
              GmailApp.sendEmail(
                u.email,
                '⚠️ Reserva cancelada HOJE — ' + (reserva.salaNome || reserva.sala || '') + ' ' + (reserva.horaInicio || ''),
                'Cancelamento no próprio dia.\n\nEspaço: ' + (reserva.salaNome || reserva.sala) +
                '\nEvento: ' + (reserva.nomeAcao || '') +
                '\nHorário: ' + (reserva.horaInicio || '') + '–' + (reserva.horaTermino || '') +
                '\nCancelado por: ' + autor +
                '\nMotivo: ' + (motivo || 'não informado')
              );
            });
        } catch (_e) {
          Logger.warn('reserva_engine', 'mudarStatus', 'Email urgente cancelamento mesmo dia falhou: ' + (_e.message || ''));
        }
      }
    }

    // Chamar orquestrador para reserva confirmada (cria tarefa de preparação)
    if (novoStatus === 'confirmada' || novoStatus === STATUS_RESERVA.CONFIRMADO) {
      try { IntegracaoOrquestrador.onReservaConfirmada(id, orgId, autor); } catch (_) {}
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

  // ── CCBJ Fechado — Bloqueio institucional ───────────────────────────

  /**
   * Cancela reservas ativas que conflitam com um bloqueio CCBJ Fechado.
   * Não cancela reservas já do tipo BLOQUEIO (bloqueio não cancela bloqueio).
   * Para cada cancelamento: AuditoriaService + SystemEvents + email ao responsável.
   *
   * @param {string} sala
   * @param {string} data — YYYY-MM-DD
   * @param {string} horaInicio — "HH:MM"
   * @param {string} horaTermino — "HH:MM"
   * @param {string} motivo
   * @param {string} emailAdmin
   * @param {string} orgId
   * @returns {{ id, nomeAcao, responsavel }[]} array dos registros cancelados
   */
  function _cancelarConflitantes(sala, data, horaInicio, horaTermino, motivo, emailAdmin, orgId) {
    var ativas = ReservaRepository.listarAtivosParaConflito(sala, data, orgId, null);
    var iniMin = _horaParaMin(horaInicio);
    var fimMin = _horaParaMin(horaTermino);
    var cancelados = [];

    ativas.forEach(function (r) {
      // Não cancela outros bloqueios
      if (String(r.tipoAcao || '').toUpperCase() === 'BLOQUEIO') return;

      var rIni = _horaParaMin(r.horaInicio);
      var rFim = _horaParaMin(r.horaTermino);
      if (rIni < 0 || rFim < 0) return;
      if (!_horariosSobrepoem(iniMin, fimMin, rIni, rFim)) return;

      // Cancela diretamente — bloqueio tem prioridade máxima, bypassa FSM
      ReservaRepository.atualizarStatus(r.id, STATUS_RESERVA.CANCELADO, orgId,
        'CCBJ Fechado — ' + motivo);

      cancelados.push({ id: r.id, nomeAcao: r.nomeAcao, responsavel: r.responsavel });

      AuditoriaService.registrar('RESERVA_CANCELADA_BLOQUEIO_CCBJ', 'espacos', {
        reservaId: r.id, sala: sala, data: data,
        motivo: 'CCBJ Fechado — ' + motivo,
        emailAdmin: emailAdmin, orgId: orgId
      });

      try {
        SystemEvents.emit(SystemEventTypes.RESERVATION_CANCELLED, {
          reservaId: r.id, sala: sala, data: data,
          motivo: 'CCBJ Fechado — ' + motivo,
          autor: emailAdmin, orgId: orgId, automatico: true
        });
      } catch (_) {}

      // Notifica o responsável por email
      try {
        if (r.responsavel && r.responsavel.indexOf('@') !== -1 && r.responsavel !== emailAdmin) {
          GmailApp.sendEmail(
            r.responsavel,
            '❌ Sua reserva foi cancelada — CCBJ Fechado',
            'Olá,\n\nSua reserva "' + r.nomeAcao + '" em ' + data +
            ' (' + horaInicio + '–' + horaTermino + ') foi cancelada automaticamente.' +
            '\n\nMotivo: CCBJ estará fechado nesse período — ' + motivo + '.' +
            '\n\nEntre em contato com a equipe de gestão para mais informações.'
          );
        }
      } catch (e) {
        Logger.warn('reserva_engine', '_cancelarConflitantes',
          'Email ao responsável falhou: ' + (e.message || ''));
      }
    });

    return cancelados;
  }

  /**
   * Cria um bloqueio CCBJ Fechado em múltiplas datas para uma sala.
   * Bypassa assertSemConflito: cancela conflitos automaticamente.
   * Deve ser chamado em loop por sala (o controller itera todas as salas).
   *
   * @param {Object} dados — { sala, horaInicio, horaTermino, motivo, turno? }
   * @param {string[]} datas — YYYY-MM-DD[]
   * @param {string} emailAdmin
   * @param {string} orgId
   * @returns {{ total, idLote, cancelados, ids }}
   */
  function criarBloqueio(dados, datas, emailAdmin, orgId) {
    if (!dados.sala || !dados.horaInicio || !dados.horaTermino) {
      throw new Error('sala, horaInicio e horaTermino são obrigatórios para bloqueio.');
    }
    if (!Array.isArray(datas) || datas.length === 0) {
      throw new Error('Informe ao menos uma data para o bloqueio.');
    }

    var motivo = dados.motivo || 'CCBJ Fechado';
    var agr    = agora ? agora() : new Date().toISOString();
    var idLote = gerarId('BLQ');
    var linhas = [];
    var totalCancelados = 0;

    // Verificar datas duplicadas
    var setDatas = {};
    datas.forEach(function (d) {
      if (setDatas[d]) throw new Error('Data duplicada: ' + d);
      setDatas[d] = true;
    });

    datas.forEach(function (data) {
      // 1. Cancela conflitos nesta sala/data
      var cancelados = _cancelarConflitantes(
        dados.sala, data, dados.horaInicio, dados.horaTermino,
        motivo, emailAdmin, orgId
      );
      totalCancelados += cancelados.length;

      // 2. Monta o registro de bloqueio
      linhas.push({
        orgId:              orgId,
        data:               data,
        horaInicio:         dados.horaInicio,
        horaTermino:        dados.horaTermino,
        sala:               dados.sala,
        turno:              dados.turno || _inferirTurno(dados.horaInicio, dados.horaTermino),
        nomeAcao:           '🔒 CCBJ FECHADO — ' + motivo.toUpperCase(),
        tipoAcao:           'BLOQUEIO',
        responsavel:        emailAdmin,
        setor:              'GESTÃO',
        coResponsavel:      '',
        release:            motivo,
        itensVolantes:      '',
        status:             STATUS_RESERVA.CONFIRMADO,
        motivoCancelamento: '',
        observacoes:        '',
        acaoId:             '',
        criadoPor:          emailAdmin
      });
    });

    var salvas = ReservaRepository.salvarLote(linhas);

    AuditoriaService.registrar('BLOQUEIO_CCBJ_CRIADO', 'espacos', {
      sala: dados.sala, datas: datas, motivo: motivo,
      total: salvas.length, totalCancelados: totalCancelados,
      idLote: idLote, autor: emailAdmin, orgId: orgId
    });

    Logger.info('reserva_engine', 'criarBloqueio',
      salvas.length + ' bloqueios, ' + totalCancelados + ' cancelados — ' + dados.sala);

    return {
      total:     salvas.length,
      idLote:    idLote,
      cancelados: totalCancelados,
      ids:       salvas.map(function (r) { return r.id; })
    };
  }

  // ── Pós-evento ────────────────────────────────────────────────────────

  /**
   * Calcula duração total de uma reserva em minutos (horaTermino − horaInicio).
   * @param {Reserva} r
   * @returns {number} minutos (0 se inválido)
   */
  function _duracaoMin(r) {
    var ini = _horaParaMin(r.horaInicio);
    var fim = _horaParaMin(r.horaTermino);
    return (ini >= 0 && fim > ini) ? fim - ini : 0;
  }

  /**
   * Registra ou atualiza o bloco pós-evento de uma reserva.
   * Calcula tempoAtividadeMin = duração − montagem − encerramento.
   *
   * @param {string} id — ID da reserva
   * @param {Object} dados — { realizado, contabilizar, publicoPresente, observacoes, comprovacoes[] }
   * @param {string} emailUsuario
   * @param {string} [orgId]
   * @returns {{ ok, posEvento }}
   */
  function registrarPosEvento(id, dados, emailUsuario, orgId) {
    orgId = orgId || _orgId();
    var reserva = ReservaRepository.buscarPorId(id, orgId);
    if (!reserva) throw new Error('Reserva não encontrada: ' + id);

    var anterior = reserva.posEvento || {};
    var posEvento = {
      realizado:         dados.realizado         !== undefined ? !!dados.realizado        : (anterior.realizado !== false ? true : false),
      contabilizar:      dados.contabilizar       !== undefined ? !!dados.contabilizar     : (anterior.contabilizar !== false ? true : false),
      publicoPresente:   dados.publicoPresente    !== undefined ? Number(dados.publicoPresente || 0) : (anterior.publicoPresente || 0),
      observacoes:       dados.observacoes        !== undefined ? (dados.observacoes || '') : (anterior.observacoes || ''),
      comprovacoes:      dados.comprovacoes       !== undefined ? (dados.comprovacoes  || []) : (anterior.comprovacoes || []),
      registradoPor:     emailUsuario || '',
      registradoEm:      agora ? agora() : new Date().toISOString()
    };

    // Calcular tempo real de atividade (excluindo montagem e encerramento)
    var duracaoTotal = _duracaoMin(reserva);
    var montagemMin  = Number(reserva.minutosMontagem     || 0);
    var encerrMin    = Number(reserva.minutosEncerramento  || 0);
    posEvento.tempoAtividadeMin = Math.max(0, duracaoTotal - montagemMin - encerrMin);

    ReservaRepository.atualizarPosEvento(id, orgId, posEvento);

    AuditoriaService.registrar('POS_EVENTO_REGISTRADO', 'espacos', {
      reservaId: id, realizado: posEvento.realizado,
      publicoPresente: posEvento.publicoPresente,
      tempoAtividadeMin: posEvento.tempoAtividadeMin,
      autor: emailUsuario, orgId: orgId
    });

    Logger.info('reserva_engine', 'registrarPosEvento',
      id + ' — realizado=' + posEvento.realizado + ' público=' + posEvento.publicoPresente);

    return { ok: true, posEvento: posEvento };
  }

  // ── Helpers privados ────────────────────────────────────────────────

  function _inferirTurno(horaInicio, horaTermino) {
    var iniMin = _horaParaMin(horaInicio);
    if (iniMin < 0) return '';
    var fimMin = _horaParaMin(horaTermino);
    if (fimMin <= 0) {
      // sem horário fim: inferir pelo início
      if (iniMin < 12 * 60) return 'manha';
      if (iniMin < 18 * 60) return 'tarde';
      return 'noite';
    }
    var cobManha = iniMin < 12 * 60 && fimMin > 8  * 60;
    var cobTarde = iniMin < 18 * 60 && fimMin > 12 * 60;
    var cobNoite = iniMin < 22 * 60 && fimMin > 18 * 60;
    if (cobManha && cobTarde && cobNoite) return 'integral';
    if (cobTarde && cobNoite) return 'tarde_noite';
    if (cobManha && cobTarde) return 'manha_tarde';
    if (cobNoite) return 'noite';
    if (cobTarde) return 'tarde';
    return 'manha';
  }

  // ── Interface pública ────────────────────────────────────────────────

  return {
    // Consulta
    listar:                  listar,
    metricas:                metricas,
    verificarDisponibilidade: verificarDisponibilidade,

    // Escrita
    criar:               criar,
    criarLote:           criarLote,
    criarBloqueio:       criarBloqueio,
    atualizar:           atualizar,
    mudarStatus:         mudarStatus,
    registrarPosEvento:  registrarPosEvento,

    // Guarda de conflito (exposta para testes)
    assertSemConflito:          assertSemConflito,
    assertHorarioFuncionamento: assertHorarioFuncionamento,

    // Constantes
    STATUS: STATUS_RESERVA
  };

})();
