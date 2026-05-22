/**
 * @file modules/espacos/solicitacao_reserva_engine.gs
 * @layer modules/espacos
 * @description Engine de Solicitações de Reserva — workflow de aprovação.
 *
 * Papéis que criam reserva diretamente (sem solicitação):
 *   infraestrutura, gestor, admin, superadmin, habilitador
 *
 * Demais colaboradores geram uma Solicitação → admin/dono aprova → reserva criada.
 *
 * @depends modules/espacos/solicitacao_reserva_repository.gs,
 *          modules/espacos/reserva_engine.gs,
 *          core/services/auditoria_service.gs,
 *          core/services/notificacao_service.gs (se disponível)
 */

var SolicitacaoReservaEngine = (function() {

  var PAPEIS_APROVACAO_DIRETA = ['infraestrutura','gestor','admin','superadmin','habilitador'];

  function _getOrgId() { return getOrgConfig().orgId; }

  function _notificar(destinatarios, assunto, corpo) {
    if (!Array.isArray(destinatarios) || !destinatarios.length) return;
    destinatarios.forEach(function(email) {
      if (!email || !email.includes('@')) return;
      try {
        GmailApp.sendEmail(email, assunto, corpo, {
          name: getOrgConfig().nome || 'Sistema'
        });
      } catch(e) {
        Logger.warn('solicitacao_engine', '_notificar', e.message);
      }
    });
  }

  function _obterAprovadoresPorEspaco(espacoId) {
    var aprovadores = [];
    try {
      var esp = SistemaConfigService.getEspacos().find(function(e) { return e.id === espacoId; });
      if (esp && Array.isArray(esp.responsaveisPorTurno)) {
        esp.responsaveisPorTurno.forEach(function(r) {
          if (r.email && aprovadores.indexOf(r.email) === -1) aprovadores.push(r.email);
        });
      }
    } catch(_) {}
    return aprovadores;
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

  // ── API pública ──────────────────────────────────────────────────────────

  /**
   * Verifica se um usuário pode criar reserva diretamente (sem solicitação).
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

    // Notifica aprovadores (responsáveis do espaço + admins)
    var destinatarios = _obterAprovadoresPorEspaco(sol.espacoId).concat(_obterAdmins());
    _notificar(
      destinatarios,
      '[Sistema] Nova Solicitação de Reserva — ' + sol.espacoId,
      'Solicitante: ' + email + '\nEspaço: ' + sol.espacoId +
      '\nJustificativa: ' + sol.justificativa +
      '\nAcesse o sistema para aprovar ou recusar.'
    );

    SystemEvents.emit('SOLICITACAO_RESERVA_CRIADA', { id: resultado.id, solicitante: email });
    return resultado;
  }

  /**
   * Lista solicitações visíveis para o usuário.
   * Admin/superadmin: todas PENDENTES do org.
   * Responsável de espaço: pendentes dos seus espaços.
   * Colaborador: próprias solicitações.
   */
  function listarPendentes(email) {
    var orgId  = _getOrgId();
    try {
      var acesso = AcessoService.verificar(email);
      var papel  = acesso && acesso.registro ? (acesso.registro.papel || 'colaborador') : 'colaborador';

      if (papel === 'admin' || papel === 'superadmin') {
        return SolicitacaoReservaRepository.listarPorStatus('PENDENTE', orgId);
      }

      var espacosDoResponsavel = SistemaConfigService.getEspacos().filter(function(e) {
        return (e.responsaveisPorTurno || []).some(function(r) { return r.email === email; });
      }).map(function(e) { return e.id; });

      if (espacosDoResponsavel.length > 0) {
        return SolicitacaoReservaRepository.listarPorStatus('PENDENTE', orgId).filter(function(s) {
          return espacosDoResponsavel.indexOf(s.espacoId) >= 0 || s.solicitante === email;
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
    var acesso = AcessoService.verificar(email);
    var papel  = acesso && acesso.registro ? (acesso.registro.papel || 'colaborador') : 'colaborador';
    if (papel !== 'admin' && papel !== 'superadmin')
      throw new Error('Apenas admins podem listar todas as solicitações.');
    return SolicitacaoReservaRepository.listarPorStatus('TODOS', orgId);
  }

  /**
   * Aprova uma solicitação e executa a ação do payload.
   */
  function aprovar(id, emailAprovador) {
    var orgId = _getOrgId();
    var sol   = SolicitacaoReservaRepository.buscarPorId(id, orgId);
    if (!sol)    throw new Error('Solicitação não encontrada: ' + id);
    if (sol.status !== 'PENDENTE') throw new Error('Solicitação não está pendente: ' + sol.status);

    var reservaCriada = null;
    if (sol.tipo === 'RESERVA') {
      var payload = typeof sol.payload === 'object' ? sol.payload : {};
      reservaCriada = ReservaEngine.criar(payload, emailAprovador, true);
    } else if (sol.tipo === 'CANCELAMENTO' && sol.idReserva) {
      ReservaEngine.cancelar(sol.idReserva, 'Solicitação ' + id + ' aprovada.', emailAprovador);
    }

    var atualizado = SolicitacaoReservaRepository.atualizar(id, {
      status:   'APROVADO',
      aprovador: emailAprovador,
      dataAcao: agora()
    }, orgId);

    AuditoriaService.registrar('SOLICITACAO_APROVADA', 'solicitacao_reserva',
      { entidadeId: id, orgId: orgId, usuario: emailAprovador, solicitante: sol.solicitante });

    _notificar([sol.solicitante],
      '[Sistema] Sua Solicitação foi APROVADA',
      'Sua solicitação de reserva (' + sol.espacoId + ') foi aprovada por ' + emailAprovador + '.'
    );

    SystemEvents.emit('SOLICITACAO_RESERVA_APROVADA', { id: id, aprovador: emailAprovador });
    return { solicitacao: atualizado, reserva: reservaCriada };
  }

  /**
   * Recusa uma solicitação.
   */
  function recusar(id, motivoRecusa, emailAprovador) {
    var orgId = _getOrgId();
    var sol   = SolicitacaoReservaRepository.buscarPorId(id, orgId);
    if (!sol)    throw new Error('Solicitação não encontrada: ' + id);
    if (sol.status !== 'PENDENTE') throw new Error('Solicitação não está pendente: ' + sol.status);

    var atualizado = SolicitacaoReservaRepository.atualizar(id, {
      status:       'RECUSADO',
      aprovador:    emailAprovador,
      motivoRecusa: motivoRecusa || '',
      dataAcao:     agora()
    }, orgId);

    AuditoriaService.registrar('SOLICITACAO_RECUSADA', 'solicitacao_reserva',
      { entidadeId: id, orgId: orgId, usuario: emailAprovador, motivo: motivoRecusa });

    _notificar([sol.solicitante],
      '[Sistema] Sua Solicitação foi RECUSADA',
      'Sua solicitação de reserva (' + sol.espacoId + ') foi recusada por ' + emailAprovador +
      '.\nMotivo: ' + (motivoRecusa || 'Não informado.')
    );

    SystemEvents.emit('SOLICITACAO_RESERVA_RECUSADA', { id: id, aprovador: emailAprovador });
    return atualizado;
  }

  return {
    podeReservarDiretamente: podeReservarDiretamente,
    criar:           criar,
    listarPendentes: listarPendentes,
    listarTodas:     listarTodas,
    aprovar:         aprovar,
    recusar:         recusar
  };

})();
