/**
 * @file modules/infraestrutura/reserva_carro_engine.gs
 * @layer modules/infraestrutura
 * @description Engine de Reservas de Veículo Institucional.
 *   Regras de negócio:
 *   - TODA reserva exige aprovação de infraestrutura/gestor/admin/superadmin.
 *   - Criação é bloqueada se já existir reserva APROVADA com horário sobreposto (slot ocupado).
 *   - Aprovação é bloqueada atomicamente se outra reserva for aprovada no mesmo slot (race-safe).
 *   - Colaboradores comuns só veem e cancelam as próprias reservas.
 *   - Equipe infra/gestor/admin vê todas e pode aprovar, recusar ou concluir.
 * @depends modules/infraestrutura/reserva_carro_repository.gs,
 *          core/services/auditoria_service.gs,
 *          core/services/acesso_service.gs,
 *          core/events_constants.gs
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

  var PAPEIS_APROVACAO = ['habilitador', 'gestor', 'admin', 'superadmin'];

  FsmGuardian.registrar('reservas_carro', _TRANSICOES);

  function _getOrgId() { return getOrgConfig().orgId; }

  function _getRegistro(email) {
    try {
      var a = AcessoService.verificar(email);
      return (a && a.registro) ? a.registro : {};
    } catch(_) { return {}; }
  }

  function _getPapel(email) {
    return _getRegistro(email).papel || 'colaborador';
  }

  function _podAprovar(email) {
    var papel = (_getRegistro(email).papel || '').toLowerCase();
    return PAPEIS_APROVACAO.indexOf(papel) >= 0;
  }

  function _horaParaMin(hora) {
    if (!hora) return -1;
    var p = String(hora).split(':');
    var h = parseInt(p[0], 10), m = parseInt(p[1], 10);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  }

  /**
   * Verifica sobreposição de horário com reservas APROVADAS na mesma data.
   * Retorna o objeto de conflito ou null.
   * @param {string} ignorarId — ID da própria reserva (para edições futuras)
   */
  function _verificarConflito(data, horaSaida, horaChegada, orgId, ignorarId) {
    var aprovadas = ReservaCarroRepository.listarAprovadasNaData(data, orgId);
    var iniNovo   = _horaParaMin(horaSaida);
    var fimNovo   = _horaParaMin(horaChegada);

    for (var i = 0; i < aprovadas.length; i++) {
      var r = aprovadas[i];
      if (ignorarId && r.id === ignorarId) continue;
      var ini = _horaParaMin(r.horaSaida);
      var fim = _horaParaMin(r.horaChegada);
      // Sobreposição: iniNovo < fim E fimNovo > ini
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
        .filter(function(u) {
          return u.status === 'ativo' && PAPEIS_APROVACAO.indexOf(u.papel) >= 0;
        })
        .map(function(u) { return u.email; })
        .filter(function(e) { return !!e; });
    } catch(_) { return []; }
  }

  // ── API pública ──────────────────────────────────────────────────────────────

  /**
   * Cria nova solicitação de reserva de veículo (status PENDENTE).
   */
  function criar(dados, email) {
    var orgId = _getOrgId();

    if (!dados.data)        throw new Error('Data da viagem é obrigatória.');
    if (!dados.horaSaida)   throw new Error('Hora de saída é obrigatória.');
    if (!dados.horaChegada) throw new Error('Hora de chegada é obrigatória.');
    if (_horaParaMin(dados.horaSaida) >= _horaParaMin(dados.horaChegada))
      throw new Error('Hora de chegada deve ser posterior à hora de saída.');

    var conflitoAprovado = _verificarConflito(dados.data, dados.horaSaida, dados.horaChegada, orgId, null);
    if (conflitoAprovado) {
      throw new Error(
        'Horário indisponível: o veículo já está reservado em ' + dados.data +
        ' das ' + conflitoAprovado.horaSaida + ' às ' + conflitoAprovado.horaChegada + '.'
      );
    }

    var payload = {
      data:             dados.data,
      horaSaida:        dados.horaSaida,
      horaChegada:      dados.horaChegada,
      solicitante:      email,
      solicitanteSetor: dados.solicitanteSetor || '',
      passageiros:      Array.isArray(dados.passageiros) ? dados.passageiros : [],
      rota: {
        localSaida:   dados.localSaida   || '',
        localChegada: dados.localChegada || '',
        mapaUrl:      dados.mapaUrl      || ''
      },
      acaoId:     dados.acaoId   || '',
      acaoNome:   dados.acaoNome || '',
      observacao: dados.observacao || ''
    };

    var resultado = ReservaCarroRepository.inserir(payload, orgId);

    AuditoriaService.registrar('RESERVA_CARRO_CRIADA', 'reservas_carro', {
      entidadeId: resultado.id, orgId: orgId, usuario: email, data: dados.data
    });

    var destinos = _obterEmailsInfra();
    _notificar(destinos,
      'Nova Solicitação de Veículo — ' + dados.data,
      'Uma reserva de veículo aguarda sua aprovação.\n\n' +
      'Solicitante: ' + email + '\n' +
      'Setor: '       + (dados.solicitanteSetor || '—') + '\n' +
      'Data: '        + dados.data + '\n' +
      'Saída: '       + dados.horaSaida + ' | Chegada: ' + dados.horaChegada + '\n' +
      'Origem: '      + (dados.localSaida   || '—') + '\n' +
      'Destino: '     + (dados.localChegada || '—') + '\n' +
      'Passageiros: ' + ((Array.isArray(dados.passageiros) ? dados.passageiros : []).join(', ') || '—') + '\n\n' +
      'Acesse o sistema para aprovar ou recusar.'
    );

    SystemEvents.emit('RESERVA_CARRO_CRIADA', { id: resultado.id, solicitante: email });
    return resultado;
  }

  /**
   * Lista reservas visíveis para o usuário.
   * Equipe infra/gestor/admin vê todas.
   * Demais: apenas as próprias.
   */
  function listar(filtros, email) {
    var orgId = _getOrgId();
    var lista = ReservaCarroRepository.listar(filtros || {}, orgId);
    if (_podAprovar(email)) return lista;
    return lista.filter(function(r) { return r.solicitante === email; });
  }

  /**
   * Aprova uma reserva. Bloqueia se houver conflito de horário.
   */
  function aprovar(id, emailAprovador) {
    var orgId = _getOrgId();
    if (!_podAprovar(emailAprovador))
      throw new Error('Sem permissão para aprovar reservas de veículo.');

    var rc = ReservaCarroRepository.buscarPorId(id, orgId);
    if (!rc) throw new Error('Reserva não encontrada: ' + id);

    FsmGuardian.assertValida('reservas_carro', rc.status, STATUS.APROVADA,
      id, emailAprovador);

    var resultadoAprovacao = ReservaCarroRepository.aprovarAtomico(id, {
      status:        STATUS.APROVADA,
      aprovador:     emailAprovador,
      dataAprovacao: agora()
    }, orgId);
    if (resultadoAprovacao.conflito) {
      var c = resultadoAprovacao.conflito;
      throw new Error(
        'Conflito de horário: já existe reserva aprovada em ' + rc.data +
        ' das ' + c.horaSaida + ' às ' + c.horaChegada + '.'
      );
    }
    if (!resultadoAprovacao.atualizado) throw new Error('Erro ao aprovar reserva: ' + id);
    var atualizado = resultadoAprovacao.atualizado;

    AuditoriaService.registrar('RESERVA_CARRO_APROVADA', 'reservas_carro', {
      entidadeId: id, orgId: orgId, usuario: emailAprovador, solicitante: rc.solicitante
    });

    _notificar([rc.solicitante],
      'Sua reserva de veículo foi APROVADA',
      'Sua reserva foi aprovada por ' + emailAprovador + '.\n\n' +
      'Data: ' + rc.data + ' | Saída: ' + rc.horaSaida + ' | Chegada: ' + rc.horaChegada + '\n' +
      'Origem: '  + ((rc.rota || {}).localSaida   || '—') + '\n' +
      'Destino: ' + ((rc.rota || {}).localChegada || '—') + '\n\n' +
      'Acesse o sistema para visualizar os detalhes.'
    );

    SystemEvents.emit('RESERVA_CARRO_APROVADA', { id: id, aprovador: emailAprovador });
    return atualizado;
  }

  /**
   * Recusa uma reserva (com motivo obrigatório).
   */
  function recusar(id, motivo, emailAprovador) {
    var orgId = _getOrgId();
    if (!_podAprovar(emailAprovador))
      throw new Error('Sem permissão para recusar reservas de veículo.');

    var rc = ReservaCarroRepository.buscarPorId(id, orgId);
    if (!rc) throw new Error('Reserva não encontrada: ' + id);

    FsmGuardian.assertValida('reservas_carro', rc.status, STATUS.RECUSADA,
      id, emailAprovador);

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

  /**
   * Cancela uma reserva. Solicitante cancela a própria; infra/admin cancela qualquer.
   */
  function cancelar(id, motivo, email) {
    var orgId = _getOrgId();
    var rc    = ReservaCarroRepository.buscarPorId(id, orgId);
    if (!rc) throw new Error('Reserva não encontrada: ' + id);

    if (rc.solicitante !== email && !_podAprovar(email))
      throw new Error('Sem permissão para cancelar esta reserva.');

    FsmGuardian.assertValida('reservas_carro', rc.status, STATUS.CANCELADA,
      id, email);

    var atualizado = ReservaCarroRepository.atualizar(id, {
      status:       STATUS.CANCELADA,
      motivoRecusa: motivo || ''
    }, orgId);

    AuditoriaService.registrar('RESERVA_CARRO_CANCELADA', 'reservas_carro', {
      entidadeId: id, orgId: orgId, usuario: email
    });

    SystemEvents.emit('RESERVA_CARRO_CANCELADA', { id: id });
    return atualizado;
  }

  /**
   * Conclui uma reserva após a viagem (apenas infra/gestor/admin).
   */
  function concluir(id, email) {
    var orgId = _getOrgId();
    if (!_podAprovar(email))
      throw new Error('Sem permissão para concluir reservas de veículo.');

    var rc = ReservaCarroRepository.buscarPorId(id, orgId);
    if (!rc) throw new Error('Reserva não encontrada: ' + id);

    FsmGuardian.assertValida('reservas_carro', rc.status, STATUS.CONCLUIDA,
      id, email);

    var atualizado = ReservaCarroRepository.atualizar(id, {
      status: STATUS.CONCLUIDA
    }, orgId);

    AuditoriaService.registrar('RESERVA_CARRO_CONCLUIDA', 'reservas_carro', {
      entidadeId: id, orgId: orgId, usuario: email
    });

    SystemEvents.emit('RESERVA_CARRO_CONCLUIDA', { id: id });
    return atualizado;
  }

  function obterMetricas(email) {
    var orgId = _getOrgId();
    var lista = _podAprovar(email)
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
    obterMetricas: obterMetricas
  };

})();
