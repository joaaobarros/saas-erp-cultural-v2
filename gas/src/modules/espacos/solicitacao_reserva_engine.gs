/**
 * @file modules/espacos/solicitacao_reserva_engine.gs
 * @layer modules/espacos
 * @description Engine de Solicitações de Reserva — workflow de aprovação.
 *
 * Papéis que criam reserva diretamente (sem solicitação por papel):
 *   infraestrutura, gestor, admin, superadmin, habilitador
 *
 * Regra de prioridade de setor:
 *   Se o espaço tiver responsáveis configurados para aquele dia/turno
 *   E o setor do solicitante for diferente do setor prioritário
 *   → forçar Solicitação, independente do papel (exceto admin/superadmin)
 *
 * Regra de aprovação:
 *   • admin / superadmin → sempre podem aprovar (soberanos)
 *   • email ∈ responsaveis[].emails para aquele slot → pode aprovar
 *   Quando admin aprova no lugar do responsável → notifica os responsáveis do slot.
 *
 * @depends modules/espacos/solicitacao_reserva_repository.gs,
 *          modules/espacos/reserva_engine.gs,
 *          core/services/auditoria_service.gs,
 *          core/config_service.gs (SistemaConfigService.resolverResponsaveis)
 */

var SolicitacaoReservaEngine = (function() {

  var PAPEIS_APROVACAO_DIRETA = ['gestor','admin','superadmin','habilitador'];
  // Papéis soberanos: ignoram verificação de prioridade de setor ao criar E podem aprovar qualquer solicitação
  var PAPEIS_SOBERANOS        = ['admin','superadmin','gestor','habilitador'];

  function _getOrgId() { return getOrgConfig().orgId; }

  // ── Helpers de notificação ───────────────────────────────────────────────

  function _notificar(destinatarios, assunto, corpo) {
    if (!Array.isArray(destinatarios) || !destinatarios.length) return;
    var nome  = getOrgConfig().nome || 'Sistema';
    var orgId = getOrgConfig().orgId;
    destinatarios.forEach(function(email) {
      if (!email || email.indexOf('@') < 0) return;
      try {
        var _c = ColaboradorRepository.buscarPorEmail(orgId, email);
        if (_c && _c.status === 'desligado') return;
        GmailApp.sendEmail(email, assunto, corpo, { name: nome });
      } catch(e) {
        Logger.warn('solicitacao_engine', '_notificar', e.message);
      }
    });
  }

  // ── Helpers de acesso ──────────────────────────────────────��─────────────

  function _getPapel(email) {
    try {
      var acesso = AcessoService.verificar(email);
      if (acesso && acesso.registro && acesso.registro.papel)
        return acesso.registro.papel;
    } catch(_) {}
    return 'colaborador';
  }

  function _ehAdmin(email) {
    var papel = _getPapel(email);
    return papel === 'admin' || papel === 'superadmin';
  }

  // Soberanos: podem aprovar qualquer solicitação e ignoram restrição de setor prioritário
  function _ehSoberano(email) {
    return PAPEIS_SOBERANOS.indexOf(_getPapel(email)) >= 0;
  }

  function _obterAdmins() {
    try {
      var raw = readJSON('usuarios_acesso.json');
      if (!Array.isArray(raw)) return [];
      return raw
        .filter(function(u) { return u.status === 'ativo' && (u.papel === 'admin' || u.papel === 'superadmin'); })
        .map(function(u) { return u.email; });
    } catch(_) { return []; }
  }

  // ���─ Resolução de responsáveis ────────────────────────────────────────────

  /**
   * Deriva dia da semana (0=dom…6=sáb) e turnoId a partir da data e horário.
   * Retorna { diaNum, turnoId }.
   */
  function _resolverDiaTurno(dataStr, horaInicio, horaTermino) {
    var diaNum = 0;
    try {
      var d = new Date(String(dataStr) + 'T12:00:00');
      diaNum = d.getDay();
    } catch(_) {}
    // Reutiliza _inferirTurno do ReservaEngine se disponível, senão faz cálculo local
    var turnoId = '';
    if (typeof ReservaEngine !== 'undefined' && ReservaEngine._inferirTurnoPublico) {
      turnoId = ReservaEngine._inferirTurnoPublico(horaInicio, horaTermino);
    } else {
      turnoId = _inferirTurnoLocal(horaInicio, horaTermino);
    }
    return { diaNum: diaNum, turnoId: turnoId };
  }

  function _horaParaMinLocal(hora) {
    if (!hora) return -1;
    var p = String(hora).split(':');
    if (p.length < 2) return -1;
    var h = parseInt(p[0], 10), m = parseInt(p[1], 10);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  }

  function _inferirTurnoLocal(horaInicio, horaTermino) {
    var iniMin = _horaParaMinLocal(horaInicio);
    if (iniMin < 0) return '';
    var fimMin = _horaParaMinLocal(horaTermino);
    if (fimMin <= 0) {
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

  /**
   * Resolve responsáveis para o slot de uma solicitação.
   * Extrai data/hora do payload da solicitação.
   * @returns {{ emails: string[], setorId: string } | null}
   */
  function _resolverResponsaveisDaSolicitacao(sol) {
    try {
      var payload = sol.payload || {};
      var dataStr     = payload.data      || '';
      var horaInicio  = payload.horaInicio || '';
      var horaTermino = payload.horaTermino || '';
      if (!dataStr) return null;
      var dt = _resolverDiaTurno(dataStr, horaInicio, horaTermino);
      return SistemaConfigService.resolverResponsaveis(sol.espacoId, dt.diaNum, dt.turnoId);
    } catch(_) { return null; }
  }

  // ── Verificação de permissão para aprovar ────────────────────��───────────

  /**
   * Lança erro se emailAprovador não puder aprovar/recusar esta solicitação.
   */
  function _assertPodeAprovar(emailAprovador, sol) {
    // Soberanos (admin, superadmin, gestor, habilitador) aprovam qualquer solicitação
    if (_ehSoberano(emailAprovador)) return;

    var resp = _resolverResponsaveisDaSolicitacao(sol);
    if (resp && resp.emails.length) {
      var emailNorm = String(emailAprovador).toLowerCase().trim();
      var ehResponsavel = resp.emails.some(function(e) {
        return String(e).toLowerCase().trim() === emailNorm;
      });
      if (ehResponsavel) return;
      throw new Error('Sem permiss��o: você não é responsável por este espaço/período.');
    }

    throw new Error('Sem permissão para aprovar esta solicitação.');
  }

  // ── API pública ──────────────────────────────────────────────────────────

  /**
   * Verifica se um usuário pode criar reserva diretamente (sem solicitação por papel).
   * Nota: mesmo que retorne true, pode haver verificação adicional de prioridade de setor.
   */
  function podeReservarDiretamente(email) {
    try {
      var acesso = AcessoService.verificar(email);
      if (!acesso || acesso.status !== 'ativo') return false;
      var papel = acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador';
      return PAPEIS_APROVACAO_DIRETA.indexOf(papel) >= 0;
    } catch(_) { return false; }
  }

  /**
   * Verifica se uma reserva enfrenta bloqueio de prioridade de setor.
   * Chamado pelo ReservaEngine antes de criar diretamente.
   *
   * @param {string} espacoId
   * @param {string} dataStr       — YYYY-MM-DD
   * @param {string} horaInicio
   * @param {string} horaTermino
   * @param {string} setorSolicitante — setor do solicitante (pode ser '' ou null)
   * @param {string} emailSolicitante — para verificar se é admin (soberano)
   * @returns {{ exigeSolicitacao: boolean, responsaveis: string[] }}
   */
  function verificarPrioridadeSetor(espacoId, dataStr, horaInicio, horaTermino, setorSolicitante, emailSolicitante) {
    // Soberanos (admin, superadmin, gestor, habilitador) nunca são bloqueados por prioridade de setor
    if (_ehSoberano(emailSolicitante)) return { exigeSolicitacao: false, responsaveis: [] };

    try {
      var dt   = _resolverDiaTurno(dataStr, horaInicio, horaTermino);
      var resp = SistemaConfigService.resolverResponsaveis(espacoId, dt.diaNum, dt.turnoId);
      if (!resp || !resp.emails.length) return { exigeSolicitacao: false, responsaveis: [] };

      // Mesmo setor → sem bloqueio de prioridade
      if (resp.setorId && setorSolicitante &&
          String(resp.setorId).trim() === String(setorSolicitante).trim()) {
        return { exigeSolicitacao: false, responsaveis: resp.emails };
      }

      // Setor diferente (ou setor não informado) → exige solicitação
      return { exigeSolicitacao: true, responsaveis: resp.emails };
    } catch(_) {
      return { exigeSolicitacao: false, responsaveis: [] };
    }
  }

  /**
   * Cria uma nova solicitação de reserva.
   * @param {object} dados — { tipo, espacoId, justificativa, payload }
   * @param {string} email — solicitante
   */
  function criar(dados, email) {
    var orgId = _getOrgId();
    if (!dados.espacoId) throw new Error('espacoId é obrigatório na Solicitação.');

    var sol = {
      tipo:          dados.tipo || 'RESERVA',
      idReserva:     dados.idReserva || '',
      espacoId:      dados.espacoId,
      solicitante:   email,
      justificativa: dados.justificativa || '',
      payload:       dados.payload || {},
      status:        'PENDENTE',
      aprovador:     '',
      motivoRecusa:  '',
      dataAcao:      ''
    };

    var resultado = SolicitacaoReservaRepository.inserir(sol, orgId);

    AuditoriaService.registrar('SOLICITACAO_CRIADA', 'solicitacao_reserva',
      { entidadeId: resultado.id, orgId: orgId, usuario: email,
        tipo: sol.tipo, espacoId: sol.espacoId });

    // Notifica: responsáveis do slot + admins
    var payload = sol.payload || {};
    var dt = _resolverDiaTurno(payload.data || '', payload.horaInicio || '', payload.horaTermino || '');
    var resp = SistemaConfigService.resolverResponsaveis(sol.espacoId, dt.diaNum, dt.turnoId);
    var emailsResponsaveis = resp ? resp.emails : [];

    var destinatarios = emailsResponsaveis.concat(_obterAdmins());
    // Deduplica
    var seen = {};
    destinatarios = destinatarios.filter(function(e) {
      if (!e || seen[e]) return false;
      seen[e] = true; return true;
    });

    var espNome = sol.espacoId;
    try {
      var esp = SistemaConfigService.getEspaco(sol.espacoId);
      if (esp) espNome = esp.nome || espNome;
    } catch(_) {}

    var dataFmt   = payload.data || '—';
    var horarioFmt = (payload.horaInicio || '—') + '–' + (payload.horaTermino || '—');
    var setorFmt  = payload.setor || '—';

    _notificar(
      destinatarios,
      '📋 Nova Solicitação de Reserva — ' + espNome,
      'Uma reserva foi solicitada e aguarda aprovação.\n\n' +
      'Espaço: ' + espNome + '\n' +
      'Solicitante: ' + email + '\n' +
      'Setor: ' + setorFmt + '\n' +
      'Data: ' + dataFmt + ' | Horário: ' + horarioFmt + '\n' +
      'Ação/Evento: ' + (payload.nomeAcao || '—') + '\n' +
      'Justificativa: ' + (sol.justificativa || '—') + '\n\n' +
      'Acesse o sistema para aprovar ou recusar.'
    );

    SystemEvents.emit('SOLICITACAO_RESERVA_CRIADA', { id: resultado.id, solicitante: email });
    return resultado;
  }

  /**
   * Lista solicitações visíveis para o usuário.
   * Admin/superadmin: todas PENDENTES do org.
   * Responsável de espaço (email ∈ responsaveis[].emails): pendentes dos seus espaços.
   * Colaborador: próprias solicitações.
   */
  function listarPendentes(email) {
    var orgId  = _getOrgId();
    try {
      var papel = _getPapel(email);

      // Soberanos veem todas as pendentes
      if (PAPEIS_SOBERANOS.indexOf(papel) >= 0) {
        return SolicitacaoReservaRepository.listarPorStatus('PENDENTE', orgId);
      }

      // Coletar IDs de espaços onde este email é responsável em qualquer entrada
      var emailNorm = String(email).toLowerCase().trim();
      var espacosComoResponsavel = SistemaConfigService.getEspacos().filter(function(e) {
        var lista = e.responsaveis || e.responsaveisPorTurno || [];
        return lista.some(function(r) {
          var emails = Array.isArray(r.emails) ? r.emails
            : (r.email ? [r.email] : []);
          return emails.some(function(em) {
            return String(em).toLowerCase().trim() === emailNorm;
          });
        });
      }).map(function(e) { return e.id; });

      if (espacosComoResponsavel.length > 0) {
        return SolicitacaoReservaRepository.listarPorStatus('PENDENTE', orgId).filter(function(s) {
          return espacosComoResponsavel.indexOf(s.espacoId) >= 0 || s.solicitante === email;
        });
      }

      return SolicitacaoReservaRepository.listarPorSolicitante(email, orgId).filter(function(s) {
        return s.status === 'PENDENTE';
      });
    } catch(_) {
      return SolicitacaoReservaRepository.listarPorSolicitante(email, orgId);
    }
  }

  /**
   * Lista todas as solicitações. Restrito a admin/superadmin.
   */
  function listarTodas(email) {
    var orgId  = _getOrgId();
    var papel  = _getPapel(email);
    if (PAPEIS_SOBERANOS.indexOf(papel) === -1)
      throw new Error('Sem permissão para listar todas as solicitações.');
    return SolicitacaoReservaRepository.listarPorStatus('TODOS', orgId);
  }

  /**
   * Aprova uma solicitação e executa a ação do payload.
   * Se o aprovador for admin (e não responsável do slot), notifica os responsáveis.
   */
  function aprovar(id, emailAprovador) {
    var orgId = _getOrgId();
    var sol   = SolicitacaoReservaRepository.buscarPorId(id, orgId);
    if (!sol)    throw new Error('Solicitação não encontrada: ' + id);
    if (sol.status !== 'PENDENTE') throw new Error('Solicitação não está pendente: ' + sol.status);

    _assertPodeAprovar(emailAprovador, sol);

    var reservaCriada = null;
    if (sol.tipo === 'RESERVA') {
      var payload = typeof sol.payload === 'object' ? sol.payload : {};
      reservaCriada = ReservaEngine.criar(payload, emailAprovador, true);
    } else if (sol.tipo === 'CANCELAMENTO' && sol.idReserva) {
      ReservaEngine.cancelar(sol.idReserva, 'Solicitação ' + id + ' aprovada.', emailAprovador);
    }

    var atualizado = SolicitacaoReservaRepository.atualizar(id, {
      status:    'APROVADO',
      aprovador: emailAprovador,
      dataAcao:  agora()
    }, orgId);

    AuditoriaService.registrar('SOLICITACAO_APROVADA', 'solicitacao_reserva',
      { entidadeId: id, orgId: orgId, usuario: emailAprovador, solicitante: sol.solicitante });

    // Notifica solicitante
    _notificar([sol.solicitante],
      '✅ Sua solicitação de reserva foi APROVADA',
      'Sua solicitação de reserva foi aprovada por ' + emailAprovador + '.\n\n' +
      'Espaço: ' + (sol.espacoId || '—') + '\n' +
      'Acesse o sistema para verificar os detalhes.'
    );

    // Se foi admin aprovando no lugar do responsável → notifica os responsáveis do slot
    var resp = _resolverResponsaveisDaSolicitacao(sol);
    if (resp && resp.emails.length && _ehAdmin(emailAprovador)) {
      var emailNorm = String(emailAprovador).toLowerCase().trim();
      var ehResponsavelTambem = resp.emails.some(function(e) {
        return String(e).toLowerCase().trim() === emailNorm;
      });
      if (!ehResponsavelTambem) {
        var payload2 = sol.payload || {};
        var espNome2 = sol.espacoId;
        try {
          var esp2 = SistemaConfigService.getEspaco(sol.espacoId);
          if (esp2) espNome2 = esp2.nome || espNome2;
        } catch(_) {}
        _notificar(resp.emails,
          '⚠️ Reserva aprovada pelo administrador em seu espaço — ' + espNome2,
          'Atenção: uma reserva no espaço sob sua responsabilidade foi aprovada pelo administrador ' + emailAprovador + '.\n\n' +
          'Espaço: ' + espNome2 + '\n' +
          'Solicitante: ' + sol.solicitante + '\n' +
          'Setor: ' + (payload2.setor || '—') + '\n' +
          'Data: ' + (payload2.data || '—') + ' | Horário: ' + (payload2.horaInicio || '—') + '–' + (payload2.horaTermino || '—') + '\n' +
          'Ação/Evento: ' + (payload2.nomeAcao || '—') + '\n\n' +
          'Nenhuma ação é necessária da sua parte — esta mensagem é apenas informativa.'
        );
      }
    }

    SystemEvents.emit('SOLICITACAO_RESERVA_APROVADA', { id: id, aprovador: emailAprovador });
    return { solicitacao: atualizado, reserva: reservaCriada };
  }

  /**
   * Recusa uma solicitação.
   * Notifica apenas o solicitante.
   */
  function recusar(id, motivoRecusa, emailAprovador) {
    var orgId = _getOrgId();
    var sol   = SolicitacaoReservaRepository.buscarPorId(id, orgId);
    if (!sol)    throw new Error('Solicitação não encontrada: ' + id);
    if (sol.status !== 'PENDENTE') throw new Error('Solicitação não está pendente: ' + sol.status);

    _assertPodeAprovar(emailAprovador, sol);

    var atualizado = SolicitacaoReservaRepository.atualizar(id, {
      status:       'RECUSADO',
      aprovador:    emailAprovador,
      motivoRecusa: motivoRecusa || '',
      dataAcao:     agora()
    }, orgId);

    AuditoriaService.registrar('SOLICITACAO_RECUSADA', 'solicitacao_reserva',
      { entidadeId: id, orgId: orgId, usuario: emailAprovador, motivo: motivoRecusa });

    var espNome3 = sol.espacoId;
    try {
      var esp3 = SistemaConfigService.getEspaco(sol.espacoId);
      if (esp3) espNome3 = esp3.nome || espNome3;
    } catch(_) {}

    _notificar([sol.solicitante],
      '❌ Sua solicitação de reserva foi RECUSADA',
      'Sua solicitação de reserva foi recusada por ' + emailAprovador + '.\n\n' +
      'Espaço: ' + espNome3 + '\n' +
      'Motivo: ' + (motivoRecusa || 'Não informado.') + '\n\n' +
      'Em caso de dúvidas, entre em contacto com o responsável pelo espaço.'
    );

    SystemEvents.emit('SOLICITACAO_RESERVA_RECUSADA', { id: id, aprovador: emailAprovador });
    return atualizado;
  }

  return {
    podeReservarDiretamente:    podeReservarDiretamente,
    verificarPrioridadeSetor:   verificarPrioridadeSetor,
    criar:                      criar,
    listarPendentes:            listarPendentes,
    listarTodas:                listarTodas,
    aprovar:                    aprovar,
    recusar:                    recusar
  };

})();
