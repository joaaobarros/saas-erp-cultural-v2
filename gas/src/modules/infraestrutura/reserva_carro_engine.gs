/**
 * @file modules/infraestrutura/reserva_carro_engine.gs
 * @layer modules/infraestrutura
 * @description Engine de Reservas de Veículo Institucional.
 *   Regras de negócio:
 *   - TODA reserva exige aprovação.
 *   - Quem pode aprovar: habilitador, admin, superadmin, e gestor com setor 'infraestrutura'.
 *   - Criação é bloqueada se já existir reserva APROVADA com horário sobreposto no mesmo veículo.
 *   - Aprovação é bloqueada atomicamente se outra reserva for aprovada no mesmo slot/veículo.
 *   - Colaboradores comuns só veem e cancelam as próprias reservas.
 *   - Aprovadores veem todas e podem aprovar, recusar, concluir e editar a rota.
 *   - editarRota() permite ao aprovador alterar destino e paradas de uma reserva PENDENTE ou APROVADA.
 * @depends modules/infraestrutura/reserva_carro_repository.gs,
 *          modules/infraestrutura/escala_carro_engine.gs,
 *          modules/infraestrutura/veiculos_repository.gs,
 *          core/services/auditoria_service.gs,
 *          core/services/acesso_service.gs,
 *          core/events_constants.gs,
 *          shared/calendar_service.gs (CalendarService)
 */

var ReservaCarroEngine = (function() {

  var STATUS = {
    PENDENTE:  'PENDENTE',
    APROVADA:  'APROVADA',
    RECUSADA:  'RECUSADA',
    CANCELADA: 'CANCELADA',
    CONCLUIDA: 'CONCLUIDA'
  };

  var _TRANSICOES = {
    'PENDENTE':  ['APROVADA', 'RECUSADA', 'CANCELADA'],
    'APROVADA':  ['CONCLUIDA', 'CANCELADA'],
    'RECUSADA':  [],
    'CANCELADA': [],
    'CONCLUIDA': []
  };

  FsmGuardian.registrar('reservas_carro', _TRANSICOES);

  function _getOrgId() { return getOrgConfig().orgId; }

  /**
   * Verifica se o usuário pode aprovar/gerenciar reservas de veículo.
   * Habilitador, admin e superadmin têm acesso irrestrito.
   * Gestor precisa ter 'infraestrutura' em setoresGerenciados.
   * Delegado para EscalaCarroEngine.podAprovarCarro (fonte única da regra).
   */
  function _podAprovarCarro(email) {
    return EscalaCarroEngine.podAprovarCarro(email);
  }

  function _horaParaMin(hora) {
    if (!hora) return -1;
    var p = String(hora).split(':');
    var h = parseInt(p[0], 10), m = parseInt(p[1], 10);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  }

  /**
   * Verifica sobreposição de horário com reservas APROVADAS na mesma data e veículo.
   */
  function _verificarConflito(data, horaSaida, horaChegadaEst, veiculoId, orgId, ignorarId) {
    var aprovadas = ReservaCarroRepository.listarAprovadasNaData(data, veiculoId || 'default', orgId);
    var iniNovo   = _horaParaMin(horaSaida);
    var fimNovo   = _horaParaMin(horaChegadaEst);

    for (var i = 0; i < aprovadas.length; i++) {
      var r = aprovadas[i];
      if (ignorarId && r.id === ignorarId) continue;
      var ini = _horaParaMin(r.horaSaida);
      var fim = _horaParaMin(r.horaChegadaEstimada || r.horaChegada);
      if (iniNovo < fim && fimNovo > ini) return r;
    }
    return null;
  }

  function _notificar(destinatarios, assunto, corpo) {
    var nome  = getOrgConfig().nome || 'Sistema';
    var orgId = getOrgConfig().orgId;
    (destinatarios || []).forEach(function(email) {
      if (!email || email.indexOf('@') < 0) return;
      try {
        var _c = ColaboradorRepository.buscarPorEmail(orgId, email);
        if (_c && _c.status === 'desligado') return;
        GmailApp.sendEmail(email, assunto, corpo, { name: nome });
      } catch(e) { Logger.warn('reserva_carro_engine', '_notificar', e.message); }
    });
  }

  function _obterEmailsInfra() {
    try {
      var lista = readJSON('usuarios_acesso.json');
      if (!Array.isArray(lista)) return [];
      return lista
        .filter(function(u) { return u.status === 'ativo' && _podAprovarCarro(u.email); })
        .map(function(u) { return u.email; })
        .filter(function(e) { return !!e; });
    } catch(_) { return []; }
  }

  // ── API pública ──────────────────────────────────────────────────────────────

  /**
   * Cria nova solicitação de reserva de veículo (status PENDENTE).
   * horaChegadaEstimada é calculada no frontend via ctrl_carro_tempo_rota.
   * O campo horaChegada manual é aceito como fallback.
   */
  function criar(dados, email) {
    var orgId = _getOrgId();

    if (!dados.data)      throw new Error('Data da viagem é obrigatória.');
    if (!dados.horaSaida) throw new Error('Hora de saída é obrigatória.');
    if (!dados.horaChegadaEstimada && !dados.horaChegada)
      throw new Error('Hora de chegada estimada é obrigatória. Calcule a rota antes de enviar.');

    var horaChegada = dados.horaChegadaEstimada || dados.horaChegada;
    if (_horaParaMin(dados.horaSaida) >= _horaParaMin(horaChegada))
      throw new Error('Hora de chegada deve ser posterior à hora de saída.');

    var veiculoId = dados.veiculoId || 'default';
    var veiculo   = VeiculosRepository.getDefault(orgId); // garante que veículo default existe
    if (veiculoId !== 'default') veiculo = VeiculosRepository.buscarPorId(veiculoId, orgId) || veiculo;
    var capacidade = (veiculo && veiculo.capacidade) || 4;

    var qtdInt  = Array.isArray(dados.passageirosInternos) ? dados.passageirosInternos.length : 0;
    var qtdExt  = Array.isArray(dados.passageirosExternos)
      ? dados.passageirosExternos.filter(function(p) { return String(p).trim(); }).length : 0;
    if (qtdInt + qtdExt > capacidade) {
      throw new Error(
        'Número de passageiros (' + (qtdInt + qtdExt) + ') excede a capacidade do veículo (' + capacidade + ').'
      );
    }

    var conflitoAprovado = _verificarConflito(
      dados.data, dados.horaSaida, horaChegada, veiculoId, orgId, null
    );
    if (conflitoAprovado) {
      throw new Error(
        'Horário indisponível: o veículo já está reservado em ' + dados.data +
        ' das ' + conflitoAprovado.horaSaida +
        ' às ' + (conflitoAprovado.horaChegadaEstimada || conflitoAprovado.horaChegada) + '.'
      );
    }

    var rota = dados.rota || {};
    var payload = {
      veiculoId:            veiculoId,
      data:                 dados.data,
      horaSaida:            dados.horaSaida,
      horaChegadaEstimada:  horaChegada,
      solicitante:          email,
      solicitanteSetor:     dados.solicitanteSetor || '',
      passageiros:          Array.isArray(dados.passageiros)         ? dados.passageiros         : [],
      passageirosInternos:  Array.isArray(dados.passageirosInternos) ? dados.passageirosInternos : [],
      passageirosExternos:  Array.isArray(dados.passageirosExternos) ? dados.passageirosExternos : [],
      rota: {
        localSaida:       rota.localSaida   || dados.localSaida   || '',
        coordSaida:       rota.coordSaida   || null,
        localChegada:     rota.localChegada || dados.localChegada || '',
        coordChegada:     rota.coordChegada || null,
        mapaUrl:          rota.mapaUrl      || dados.mapaUrl      || '',
        paradas:          Array.isArray(rota.paradas) ? rota.paradas : [],
        tempoEstimadoMin: rota.tempoEstimadoMin || dados.tempoEstimadoMin || 0,
        distanciaKm:      rota.distanciaKm      || dados.distanciaKm      || 0
      },
      acaoId:     dados.acaoId   || '',
      acaoNome:   dados.acaoNome || '',
      observacao: dados.observacao || ''
    };

    var resultado = ReservaCarroRepository.inserir(payload, orgId);

    AuditoriaService.registrar('RESERVA_CARRO_CRIADA', 'reservas_carro', {
      entidadeId: resultado.id, orgId: orgId, usuario: email, data: dados.data
    });

    var destinos     = _obterEmailsInfra();
    var localSaida   = payload.rota.localSaida   || '—';
    var localChegada = payload.rota.localChegada || '—';
    _notificar(destinos,
      'Nova Solicitação de Veículo — ' + dados.data,
      'Uma reserva de veículo aguarda sua aprovação.\n\n' +
      'Solicitante: ' + email + '\n' +
      'Setor: '       + (dados.solicitanteSetor || '—') + '\n' +
      'Data: '        + dados.data + '\n' +
      'Saída: '       + dados.horaSaida + ' | Chegada est.: ' + horaChegada + '\n' +
      'Origem: '      + localSaida + '\n' +
      'Destino: '     + localChegada + '\n\n' +
      'Acesse o sistema para aprovar ou recusar.'
    );

    SystemEvents.emit('RESERVA_CARRO_CRIADA', { id: resultado.id, solicitante: email });
    return resultado;
  }

  function listar(filtros, email) {
    var orgId = _getOrgId();
    var lista = ReservaCarroRepository.listar(filtros || {}, orgId);
    if (_podAprovarCarro(email)) return lista;
    return lista.filter(function(r) { return r.solicitante === email; });
  }

  function aprovar(id, emailAprovador) {
    var orgId = _getOrgId();
    if (!_podAprovarCarro(emailAprovador))
      throw new Error('Sem permissão para aprovar reservas de veículo.');

    var rc = ReservaCarroRepository.buscarPorId(id, orgId);
    if (!rc) throw new Error('Reserva não encontrada: ' + id);

    FsmGuardian.assertValida('reservas_carro', rc.status, STATUS.APROVADA, id, emailAprovador);

    // Verificação com buffer: o carro precisa ter tempo hábil de retornar de reservas anteriores
    var rotaRc     = rc.rota || {};
    var disponib   = EscalaCarroEngine.calcularDisponibilidade(
      rc.data, rotaRc.localSaida || '', rc.veiculoId || 'default', orgId, id
    );
    var horaSaidaMin = _horaParaMin(rc.horaSaida);
    var dentroDeJanela = disponib.janelas.some(function(j) {
      return _horaParaMin(j.inicio) <= horaSaidaMin && horaSaidaMin < _horaParaMin(j.fim);
    });
    if (!dentroDeJanela) {
      throw new Error(
        'Aprovação bloqueada: considerando o tempo de retorno de reservas anteriores, ' +
        'o veículo não estará disponível às ' + rc.horaSaida + ' em ' + rc.data + '. ' +
        'Próximo horário possível: ' + (disponib.proximoHorario || 'indisponível no dia') + '.'
      );
    }

    var resultadoAprovacao = ReservaCarroRepository.aprovarAtomico(id, {
      status:        STATUS.APROVADA,
      aprovador:     emailAprovador,
      dataAprovacao: agora()
    }, orgId);
    if (resultadoAprovacao.conflito) {
      var c = resultadoAprovacao.conflito;
      throw new Error(
        'Conflito de horário: já existe reserva aprovada em ' + rc.data +
        ' das ' + c.horaSaida + ' às ' + (c.horaChegadaEstimada || c.horaChegada) + '.'
      );
    }
    if (!resultadoAprovacao.atualizado) throw new Error('Erro ao aprovar reserva: ' + id);
    var atualizado = resultadoAprovacao.atualizado;

    AuditoriaService.registrar('RESERVA_CARRO_APROVADA', 'reservas_carro', {
      entidadeId: id, orgId: orgId, usuario: emailAprovador, solicitante: rc.solicitante
    });

    var rota = rc.rota || {};
    _notificar([rc.solicitante],
      'Sua reserva de veículo foi APROVADA',
      'Sua reserva foi aprovada por ' + emailAprovador + '.\n\n' +
      'Data: ' + rc.data + ' | Saída: ' + rc.horaSaida +
      ' | Chegada est.: ' + (rc.horaChegadaEstimada || '—') + '\n' +
      'Origem: '  + (rota.localSaida   || '—') + '\n' +
      'Destino: ' + (rota.localChegada || '—') + '\n\n' +
      'Acesse o sistema para visualizar os detalhes.'
    );

    SystemEvents.emit('RESERVA_CARRO_APROVADA', { id: id, aprovador: emailAprovador });
    return atualizado;
  }

  function recusar(id, motivo, emailAprovador) {
    var orgId = _getOrgId();
    if (!_podAprovarCarro(emailAprovador))
      throw new Error('Sem permissão para recusar reservas de veículo.');

    var rc = ReservaCarroRepository.buscarPorId(id, orgId);
    if (!rc) throw new Error('Reserva não encontrada: ' + id);

    FsmGuardian.assertValida('reservas_carro', rc.status, STATUS.RECUSADA, id, emailAprovador);

    var atualizado = ReservaCarroRepository.atualizar(id, {
      status:        STATUS.RECUSADA,
      aprovador:     emailAprovador,
      motivoRecusa:  motivo || '',
      dataAprovacao: agora()
    }, orgId);

    AuditoriaService.registrar('RESERVA_CARRO_RECUSADA', 'reservas_carro', {
      entidadeId: id, orgId: orgId, usuario: emailAprovador, motivo: motivo
    });

    _notificar([rc.solicitante],
      'Sua reserva de veículo foi RECUSADA',
      'Sua reserva foi recusada por ' + emailAprovador + '.\n\n' +
      'Motivo: ' + (motivo || 'Não informado.') + '\n\n' +
      'Em caso de dúvidas, entre em contato com a equipe de Infraestrutura.'
    );

    SystemEvents.emit('RESERVA_CARRO_RECUSADA', { id: id, aprovador: emailAprovador });
    return atualizado;
  }

  function cancelar(id, motivo, email) {
    var orgId = _getOrgId();
    var rc    = ReservaCarroRepository.buscarPorId(id, orgId);
    if (!rc) throw new Error('Reserva não encontrada: ' + id);

    if (rc.solicitante !== email && !_podAprovarCarro(email))
      throw new Error('Sem permissão para cancelar esta reserva.');

    FsmGuardian.assertValida('reservas_carro', rc.status, STATUS.CANCELADA, id, email);

    var patch = { status: STATUS.CANCELADA, motivoRecusa: motivo || '' };
    if (rc.googleEventId) {
      try { CalendarService.excluirEvento(rc.googleEventId); }
      catch (e) { Logger.warn('reserva_carro_engine', 'cancelar', 'Calendar: ' + e.message); }
      patch.googleEventId      = '';
      patch.calendarConvidados = [];
    }

    var atualizado = ReservaCarroRepository.atualizar(id, patch, orgId);

    AuditoriaService.registrar('RESERVA_CARRO_CANCELADA', 'reservas_carro', {
      entidadeId: id, orgId: orgId, usuario: email
    });

    SystemEvents.emit('RESERVA_CARRO_CANCELADA', { id: id });
    return atualizado;
  }

  function concluir(id, email) {
    var orgId = _getOrgId();
    if (!_podAprovarCarro(email))
      throw new Error('Sem permissão para concluir reservas de veículo.');

    var rc = ReservaCarroRepository.buscarPorId(id, orgId);
    if (!rc) throw new Error('Reserva não encontrada: ' + id);

    FsmGuardian.assertValida('reservas_carro', rc.status, STATUS.CONCLUIDA, id, email);

    var atualizado = ReservaCarroRepository.atualizar(id, { status: STATUS.CONCLUIDA }, orgId);

    AuditoriaService.registrar('RESERVA_CARRO_CONCLUIDA', 'reservas_carro', {
      entidadeId: id, orgId: orgId, usuario: email
    });

    SystemEvents.emit('RESERVA_CARRO_CONCLUIDA', { id: id });
    return atualizado;
  }

  /**
   * Aprovador edita a rota de uma reserva PENDENTE ou APROVADA.
   * Pode alterar localChegada, coordChegada e/ou paradas.
   */
  function editarRota(id, dadosRota, email) {
    var orgId = _getOrgId();
    if (!_podAprovarCarro(email))
      throw new Error('Sem permissão para editar a rota desta reserva.');

    var rc = ReservaCarroRepository.buscarPorId(id, orgId);
    if (!rc) throw new Error('Reserva não encontrada: ' + id);

    if (rc.status !== STATUS.PENDENTE && rc.status !== STATUS.APROVADA)
      throw new Error('A rota só pode ser editada em reservas PENDENTE ou APROVADA.');

    var atualizado = ReservaCarroRepository.atualizarRota(id, dadosRota, orgId);

    AuditoriaService.registrar('RESERVA_CARRO_ROTA_EDITADA', 'reservas_carro', {
      entidadeId: id, orgId: orgId, usuario: email, rota: dadosRota
    });

    return atualizado;
  }

  // ── Google Calendar — vínculo manual ─────────────────────────────────
  // Vínculo opcional, acionado pelo usuário (nunca automático).

  function _envolvidosCalendar(rc) {
    var envolvidos = [];
    if (rc.solicitante && String(rc.solicitante).indexOf('@') !== -1) envolvidos.push(rc.solicitante);
    (rc.passageiros || []).forEach(function (p) { if (p && String(p).indexOf('@') !== -1) envolvidos.push(p); });
    (rc.passageirosInternos || []).forEach(function (p) { if (p && String(p).indexOf('@') !== -1) envolvidos.push(p); });
    return envolvidos.filter(function (e, i, arr) { return arr.indexOf(e) === i; });
  }

  function _resolverConvidadosCalendar(rc, opcoes) {
    opcoes = opcoes || {};
    var envolvidos = _envolvidosCalendar(rc);
    var base = opcoes.modo === 'especificos'
      ? envolvidos.filter(function (e) { return (opcoes.selecionados || []).indexOf(e) !== -1; })
      : envolvidos;
    var extras = (opcoes.extras || []).filter(function (e) { return e && String(e).indexOf('@') !== -1; });
    return base.concat(extras);
  }

  /**
   * Vincula uma reserva de veículo a um novo evento no Calendar.
   * @param {string} id
   * @param {Object} opcoes — { modo, selecionados?, extras? }
   * @param {string} email
   */
  function vincularCalendar(id, opcoes, email) {
    var orgId = _getOrgId();
    var rc = ReservaCarroRepository.buscarPorId(id, orgId);
    if (!rc) throw new Error('Reserva não encontrada: ' + id);
    if (rc.solicitante !== email && !_podAprovarCarro(email)) {
      throw new Error('Sem permissão para vincular esta reserva ao Calendar.');
    }
    if (rc.googleEventId) throw new Error('Esta reserva já está vinculada ao Calendar.');

    var horaChegada = rc.horaChegadaEstimada || rc.horaChegada;
    if (!rc.data || !rc.horaSaida || !horaChegada) {
      throw new Error('Reserva sem data/horário definidos — não é possível vincular ao Calendar.');
    }

    var rota = rc.rota || {};
    var convidados = _resolverConvidadosCalendar(rc, opcoes);
    var resultado = CalendarService.criarEvento({
      titulo:     'Reserva de veículo — ' + (rota.localChegada || rc.acaoNome || id),
      local:      rota.localSaida || '',
      descricao:  'Reserva de veículo institucional — gerida pelo sistema CCBJ. ID: ' + rc.id,
      inicio:     new Date(rc.data + 'T' + rc.horaSaida + ':00'),
      fim:        new Date(rc.data + 'T' + horaChegada + ':00'),
      convidados: convidados
    });

    var atualizado = ReservaCarroRepository.atualizar(id, {
      googleEventId:      resultado.eventoId,
      calendarConvidados: resultado.convidados
    }, orgId);

    AuditoriaService.registrar('RESERVA_CARRO_CALENDAR_VINCULADA', 'reservas_carro', {
      entidadeId: id, orgId: orgId, usuario: email, convidados: resultado.convidados
    });
    return atualizado;
  }

  /**
   * Remove o vínculo de uma reserva de veículo com o Calendar.
   * @param {string} id
   * @param {string} email
   */
  function desvincularCalendar(id, email) {
    var orgId = _getOrgId();
    var rc = ReservaCarroRepository.buscarPorId(id, orgId);
    if (!rc) throw new Error('Reserva não encontrada: ' + id);
    if (rc.solicitante !== email && !_podAprovarCarro(email)) {
      throw new Error('Sem permissão para desvincular esta reserva do Calendar.');
    }
    if (!rc.googleEventId) throw new Error('Esta reserva não está vinculada ao Calendar.');

    try { CalendarService.excluirEvento(rc.googleEventId); }
    catch (e) { Logger.warn('reserva_carro_engine', 'desvincularCalendar', e.message); }

    var atualizado = ReservaCarroRepository.atualizar(id, {
      googleEventId: '', calendarConvidados: []
    }, orgId);

    AuditoriaService.registrar('RESERVA_CARRO_CALENDAR_DESVINCULADA', 'reservas_carro', {
      entidadeId: id, orgId: orgId, usuario: email
    });
    return atualizado;
  }

  function obterMetricas(email) {
    var orgId = _getOrgId();
    var lista = _podAprovarCarro(email)
      ? ReservaCarroRepository.listar({}, orgId)
      : ReservaCarroRepository.listar({ solicitante: email }, orgId);

    return {
      total:     lista.length,
      pendentes: lista.filter(function(r) { return r.status === STATUS.PENDENTE;  }).length,
      aprovadas: lista.filter(function(r) { return r.status === STATUS.APROVADA;  }).length,
      recusadas: lista.filter(function(r) { return r.status === STATUS.RECUSADA;  }).length,
      canceladas: lista.filter(function(r) { return r.status === STATUS.CANCELADA; }).length,
      concluidas: lista.filter(function(r) { return r.status === STATUS.CONCLUIDA; }).length
    };
  }

  return {
    STATUS:        STATUS,
    criar:         criar,
    listar:        listar,
    aprovar:       aprovar,
    recusar:       recusar,
    cancelar:      cancelar,
    concluir:      concluir,
    editarRota:    editarRota,
    vincularCalendar:    vincularCalendar,
    desvincularCalendar: desvincularCalendar,
    obterMetricas: obterMetricas
  };

})();
