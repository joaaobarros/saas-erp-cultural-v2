/**
 * @file modules/voluntarios/voluntario_engine.gs
 * @layer modules/voluntarios
 * @description Engine de Voluntários.
 *
 * FSM de voluntário:
 *   cadastrado → ativo → inativo
 *   ativo → inativo | cadastrado
 *
 * FSM de alocação:
 *   alocado → confirmado → presente → concluido
 *          → cancelado (a qualquer momento antes de presente)
 *
 * @depends voluntario_repository.gs, core/services/fsm_guardian.gs,
 *          core/services/auditoria_service.gs, core/event_bus_backend.gs,
 *          core/notification_engine.gs, core/utils.gs, core/logger.gs
 */

var VoluntarioEngine = (function () {

  var _TIPO_VOL  = 'voluntario';
  var _TIPO_ALOC = 'alocacao_voluntario';

  var _FSM_VOL = {
    cadastrado: ['ativo', 'inativo'],
    ativo:      ['inativo', 'cadastrado'],
    inativo:    ['ativo']
  };

  var _FSM_ALOC = {
    alocado:   ['confirmado', 'cancelado'],
    confirmado:['presente', 'cancelado'],
    presente:  ['concluido'],
    concluido: [],
    cancelado: []
  };

  FsmGuardian.registrar(_TIPO_VOL, _FSM_VOL);
  FsmGuardian.registrar(_TIPO_ALOC, _FSM_ALOC);

  // ─── Voluntários ─────────────────────────────────────────────────────────

  function salvar(orgId, dados, emailUsuario) {
    if (!dados.nome || !dados.email) throw new Error('nome e email são obrigatórios.');
    var emailNorm = dados.email.toLowerCase().trim();
    var eh_novo   = !dados.id;
    var vol;

    if (eh_novo) {
      var dup = VoluntarioRepository.Voluntarios.buscarPorEmail(orgId, emailNorm);
      if (dup) throw new Error('Já existe voluntário cadastrado com este e-mail.');
      vol = {
        id:            gerarId('VOL'),
        orgId:         orgId,
        nome:          dados.nome.trim(),
        email:         emailNorm,
        cpf:           dados.cpf || '',
        telefone:      dados.telefone || '',
        competencias:  dados.competencias || [],
        disponibilidade: dados.disponibilidade || {},
        status:        'cadastrado',
        totalHoras:    0
      };
      SystemEvents.emit(SystemEventTypes.VOLUNTEER_CREATED, {
        voluntarioId: vol.id, orgId: orgId, emailUsuario: emailUsuario
      });
    } else {
      vol = VoluntarioRepository.Voluntarios.buscarPorId(orgId, dados.id);
      if (!vol) throw new Error('Voluntário não encontrado: ' + dados.id);
      vol.nome           = dados.nome.trim();
      vol.cpf            = dados.cpf || vol.cpf;
      vol.telefone       = dados.telefone || vol.telefone;
      vol.competencias   = dados.competencias || vol.competencias;
      vol.disponibilidade = dados.disponibilidade || vol.disponibilidade;
    }

    AuditoriaService.registrar(
      eh_novo ? 'voluntario_criado' : 'voluntario_atualizado',
      'voluntarios', { id: vol.id, emailUsuario: emailUsuario }
    );
    return VoluntarioRepository.Voluntarios.salvar(vol);
  }

  function mudarStatus(orgId, id, novoStatus, emailUsuario, motivo) {
    var vol = VoluntarioRepository.Voluntarios.buscarPorId(orgId, id);
    if (!vol) throw new Error('Voluntário não encontrado: ' + id);
    FsmGuardian.transitar(_TIPO_VOL, vol.status, novoStatus, { id: id });
    var anterior = vol.status;
    vol.status = novoStatus;
    AuditoriaService.registrar('voluntario_status_alterado', 'voluntarios', {
      id: id, de: anterior, para: novoStatus, motivo: motivo, emailUsuario: emailUsuario
    });
    SystemEvents.emit(SystemEventTypes.VOLUNTEER_STATUS_CHANGED, {
      voluntarioId: id, orgId: orgId, de: anterior, para: novoStatus
    });
    return VoluntarioRepository.Voluntarios.salvar(vol);
  }

  // ─── Alocações ────────────────────────────────────────────────────────────

  /**
   * Aloca voluntário a uma Ação.
   * Envia convite por email com link de confirmação.
   */
  function alocar(orgId, voluntarioId, acaoId, acaoNome, funcao, horario, emailUsuario) {
    var vol = VoluntarioRepository.Voluntarios.buscarPorId(orgId, voluntarioId);
    if (!vol) throw new Error('Voluntário não encontrado: ' + voluntarioId);
    if (vol.status === 'inativo') throw new Error('Voluntário inativo não pode ser alocado.');

    // Verificar duplicata ativa
    var existentes = VoluntarioRepository.Alocacoes.listar(orgId, {
      acaoId: acaoId, voluntarioId: voluntarioId
    }).filter(function(a) { return a.status !== 'cancelado'; });
    if (existentes.length) throw new Error('Voluntário já alocado nesta ação.');

    var aloc = {
      id:           gerarId('ALOC'),
      orgId:        orgId,
      voluntarioId: voluntarioId,
      voluntarioNome: vol.nome,
      voluntarioEmail: vol.email,
      acaoId:       acaoId,
      acaoNome:     acaoNome || '',
      funcao:       funcao || '',
      horario:      horario || '',
      status:       'alocado',
      horasRealizadas: 0,
      confirmadoEm: null,
      presenteEm:   null,
      concluidoEm:  null
    };

    AuditoriaService.registrar('voluntario_alocado', 'voluntarios', {
      id: aloc.id, voluntarioId: voluntarioId, acaoId: acaoId, emailUsuario: emailUsuario
    });

    SystemEvents.emit(SystemEventTypes.VOLUNTEER_ALLOCATED, {
      alocacaoId: aloc.id, voluntarioId: voluntarioId,
      acaoId: acaoId, orgId: orgId
    });

    // Email convite
    try {
      var linkConfirmacao = ScriptApp.getService().getUrl() +
        '?secao=confirmar_voluntario&alocacaoId=' + aloc.id;
      NotificationEngine.enviar({
        para: vol.email,
        assunto: 'Convite para voluntariar na ação: ' + acaoNome,
        corpo: 'Olá, ' + vol.nome + '!\n\nVocê foi convidado(a) para voluntariar como "' + funcao +
               '" na ação: ' + acaoNome + '\nHorário: ' + horario +
               '\n\nPor favor, confirme sua participação: ' + linkConfirmacao
      });
    } catch(e) {
      Logger.warn('voluntarios','alocar','Erro ao enviar convite: ' + e.message);
    }

    return VoluntarioRepository.Alocacoes.salvar(aloc);
  }

  /**
   * Confirma participação via link de email.
   */
  function confirmarAlocacao(orgId, alocacaoId) {
    var aloc = VoluntarioRepository.Alocacoes.buscarPorId(orgId, alocacaoId);
    if (!aloc) throw new Error('Alocação não encontrada: ' + alocacaoId);
    FsmGuardian.transitar(_TIPO_ALOC, aloc.status, 'confirmado', { id: alocacaoId });
    aloc.status      = 'confirmado';
    aloc.confirmadoEm = new Date().toISOString();
    AuditoriaService.registrar('voluntario_confirmado', 'voluntarios', { id: alocacaoId });
    return VoluntarioRepository.Alocacoes.salvar(aloc);
  }

  /**
   * Registra presença e horas realizadas.
   */
  function registrarPresenca(orgId, alocacaoId, horasRealizadas, emailUsuario) {
    var aloc = VoluntarioRepository.Alocacoes.buscarPorId(orgId, alocacaoId);
    if (!aloc) throw new Error('Alocação não encontrada: ' + alocacaoId);
    FsmGuardian.transitar(_TIPO_ALOC, aloc.status, 'presente', { id: alocacaoId });
    aloc.status         = 'presente';
    aloc.presenteEm     = new Date().toISOString();
    aloc.horasRealizadas = horasRealizadas || 0;

    // Atualizar total de horas do voluntário
    var vol = VoluntarioRepository.Voluntarios.buscarPorId(orgId, aloc.voluntarioId);
    if (vol) {
      vol.totalHoras = (vol.totalHoras || 0) + (horasRealizadas || 0);
      VoluntarioRepository.Voluntarios.salvar(vol);
    }

    AuditoriaService.registrar('voluntario_presenca', 'voluntarios', {
      id: alocacaoId, horas: horasRealizadas, emailUsuario: emailUsuario
    });
    return VoluntarioRepository.Alocacoes.salvar(aloc);
  }

  /**
   * Conclui alocação e gera certificado automático.
   */
  function concluirAlocacao(orgId, alocacaoId, emailUsuario) {
    var aloc = VoluntarioRepository.Alocacoes.buscarPorId(orgId, alocacaoId);
    if (!aloc) throw new Error('Alocação não encontrada: ' + alocacaoId);
    FsmGuardian.transitar(_TIPO_ALOC, aloc.status, 'concluido', { id: alocacaoId });
    aloc.status     = 'concluido';
    aloc.concluidoEm = new Date().toISOString();

    AuditoriaService.registrar('voluntario_concluido', 'voluntarios', {
      id: alocacaoId, emailUsuario: emailUsuario
    });
    SystemEvents.emit(SystemEventTypes.VOLUNTEER_COMPLETED, {
      alocacaoId: alocacaoId, orgId: orgId,
      voluntarioId: aloc.voluntarioId, acaoId: aloc.acaoId,
      horas: aloc.horasRealizadas
    });

    // Email certificado
    try {
      NotificationEngine.enviar({
        para: aloc.voluntarioEmail,
        assunto: 'Certificado de Voluntariado — ' + aloc.acaoNome,
        corpo: 'Olá, ' + aloc.voluntarioNome + '!\n\nParabéns! Você concluiu seu voluntariado na ação "' +
               aloc.acaoNome + '" como ' + aloc.funcao + '.\n\nHoras realizadas: ' + aloc.horasRealizadas +
               'h\n\nAgradecemos muito sua contribuição!'
      });
    } catch(e) {
      Logger.warn('voluntarios','concluirAlocacao','Erro no email: ' + e.message);
    }

    return VoluntarioRepository.Alocacoes.salvar(aloc);
  }

  function cancelarAlocacao(orgId, alocacaoId, motivo, emailUsuario) {
    var aloc = VoluntarioRepository.Alocacoes.buscarPorId(orgId, alocacaoId);
    if (!aloc) throw new Error('Alocação não encontrada: ' + alocacaoId);
    FsmGuardian.transitar(_TIPO_ALOC, aloc.status, 'cancelado', { id: alocacaoId });
    aloc.status = 'cancelado';
    aloc.motivoCancelamento = motivo || '';
    AuditoriaService.registrar('voluntario_alocacao_cancelada', 'voluntarios', {
      id: alocacaoId, motivo: motivo, emailUsuario: emailUsuario
    });
    return VoluntarioRepository.Alocacoes.salvar(aloc);
  }

  // ─── API Pública ──────────────────────────────────────────────────────────

  return {
    salvar:             salvar,
    mudarStatus:        mudarStatus,
    alocar:             alocar,
    confirmarAlocacao:  confirmarAlocacao,
    registrarPresenca:  registrarPresenca,
    concluirAlocacao:   concluirAlocacao,
    cancelarAlocacao:   cancelarAlocacao
  };

})();
