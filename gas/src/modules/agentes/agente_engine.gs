/**
 * @file modules/agentes/agente_engine.gs
 * @layer modules/agentes
 * @description Engine de Agentes Culturais.
 *
 * FSM de status:
 *   rascunho → ativo (aprovar cadastro)
 *   ativo → suspenso (suspensão temporária)
 *   suspenso → ativo (reativar)
 *   ativo | suspenso → descredenciado (desligar definitivamente)
 *
 * Integrações:
 *   - HabilitacoesEngine: agente ativo pode ser vinculado como EntidadeContratavel
 *   - NotificationEngine: email de boas-vindas ao ativar
 *   - SystemEvents: emite AGENT_* eventos
 *   - AuditoriaService: toda escrita auditada
 *
 * @depends agente_repository.gs, core/services/fsm_guardian.gs,
 *          core/services/auditoria_service.gs, core/event_bus_backend.gs,
 *          core/events_constants.gs, core/utils.gs, core/logger.gs
 */

var AgenteCulturalEngine = (function () {

  // ─── FSM ──────────────────────────────────────────────────────────────────

  var _FSM = {
    rascunho:      ['ativo'],
    ativo:         ['suspenso', 'descredenciado'],
    suspenso:      ['ativo', 'descredenciado'],
    descredenciado:[]
  };

  var _TIPO = 'agente_cultural';

  FsmGuardian.registrar(_TIPO, _FSM);

  // ─── Criação / Edição ─────────────────────────────────────────────────────

  /**
   * Cria ou atualiza um agente cultural.
   * @param {string} orgId
   * @param {Object} dados — campos do agente
   * @param {string} emailUsuario — quem está salvando
   * @returns {Object} agente salvo
   */
  function salvar(orgId, dados, emailUsuario) {
    if (!dados.nome || !dados.email) throw new Error('nome e email são obrigatórios.');

    var emailNorm = dados.email.toLowerCase().trim();
    var agente;
    var eh_novo = !dados.id;

    if (eh_novo) {
      // Verificar duplicata por email
      var existente = AgenteCulturalRepository.buscarPorEmail(orgId, emailNorm);
      if (existente) throw new Error('Já existe agente cadastrado com este e-mail.');

      agente = {
        id:               gerarId('AGT'),
        orgId:            orgId,
        tipo:             dados.tipo || 'pf',
        nome:             dados.nome.trim(),
        nomeArtistico:    dados.nomeArtistico || '',
        email:            emailNorm,
        cpfCnpj:          dados.cpfCnpj || '',
        telefone:         dados.telefone || '',
        areasArtisticas:  dados.areasArtisticas || [],
        linguagens:       dados.linguagens || [],
        portfolio:        dados.portfolio || [],
        riderTecnico:     dados.riderTecnico || {},
        disponibilidade:  dados.disponibilidade || {},
        status:           'rascunho',
        consentimentoId:  dados.consentimentoId || '',
        observacoes:      dados.observacoes || '',
        historico:        []
      };

      SystemEvents.emit(SystemEventTypes.AGENT_CREATED, {
        agenteId: agente.id, nome: agente.nome, email: agente.email,
        orgId: orgId, emailUsuario: emailUsuario
      });

    } else {
      agente = AgenteCulturalRepository.buscarPorId(orgId, dados.id);
      if (!agente) throw new Error('Agente não encontrado: ' + dados.id);

      // Campos editáveis (não alterar status/id/orgId via edição genérica)
      agente.nome            = dados.nome.trim();
      agente.nomeArtistico   = dados.nomeArtistico || agente.nomeArtistico;
      agente.tipo            = dados.tipo || agente.tipo;
      agente.cpfCnpj         = dados.cpfCnpj || agente.cpfCnpj;
      agente.telefone        = dados.telefone || agente.telefone;
      agente.areasArtisticas = dados.areasArtisticas || agente.areasArtisticas;
      agente.linguagens      = dados.linguagens || agente.linguagens;
      agente.portfolio       = dados.portfolio || agente.portfolio;
      agente.riderTecnico    = dados.riderTecnico || agente.riderTecnico;
      agente.disponibilidade = dados.disponibilidade || agente.disponibilidade;
      agente.observacoes     = dados.observacoes || agente.observacoes;

      SystemEvents.emit(SystemEventTypes.AGENT_UPDATED, {
        agenteId: agente.id, orgId: orgId, emailUsuario: emailUsuario
      });
    }

    AuditoriaService.registrar(
      eh_novo ? 'agente_criado' : 'agente_atualizado',
      'agentes', { id: agente.id, nome: agente.nome, emailUsuario: emailUsuario }
    );

    return AgenteCulturalRepository.salvar(agente);
  }

  // ─── Transições de Status ─────────────────────────────────────────────────

  /**
   * Ativa o agente (rascunho → ativo).
   * Envia email de boas-vindas.
   */
  function ativar(orgId, id, emailUsuario, motivo) {
    return _transitar(orgId, id, 'ativo', emailUsuario, motivo || 'Cadastro aprovado.');
  }

  /**
   * Suspende o agente temporariamente (ativo → suspenso).
   */
  function suspender(orgId, id, emailUsuario, motivo) {
    if (!motivo) throw new Error('Motivo obrigatório para suspensão.');
    return _transitar(orgId, id, 'suspenso', emailUsuario, motivo);
  }

  /**
   * Reativa agente suspenso (suspenso → ativo).
   */
  function reativar(orgId, id, emailUsuario, motivo) {
    return _transitar(orgId, id, 'ativo', emailUsuario, motivo || 'Suspensão encerrada.');
  }

  /**
   * Descredencia o agente definitivamente.
   */
  function descredenciar(orgId, id, emailUsuario, motivo) {
    if (!motivo) throw new Error('Motivo obrigatório para descredenciamento.');
    return _transitar(orgId, id, 'descredenciado', emailUsuario, motivo);
  }

  function _transitar(orgId, id, novoStatus, emailUsuario, motivo) {
    var agente = AgenteCulturalRepository.buscarPorId(orgId, id);
    if (!agente) throw new Error('Agente não encontrado: ' + id);

    FsmGuardian.transitar(_TIPO, agente.status, novoStatus, {
      id: id, orgId: orgId, emailUsuario: emailUsuario
    });

    var statusAnterior = agente.status;
    agente.status = novoStatus;
    agente.historico = agente.historico || [];
    agente.historico.push({
      de: statusAnterior, para: novoStatus,
      motivo: motivo || '', em: new Date().toISOString(), por: emailUsuario
    });

    AuditoriaService.registrar('agente_status_alterado', 'agentes', {
      id: id, de: statusAnterior, para: novoStatus,
      motivo: motivo, emailUsuario: emailUsuario
    });

    SystemEvents.emit(SystemEventTypes.AGENT_STATUS_CHANGED, {
      agenteId: id, orgId: orgId,
      de: statusAnterior, para: novoStatus,
      emailUsuario: emailUsuario
    });

    // Boas-vindas ao ativar
    if (novoStatus === 'ativo' && statusAnterior === 'rascunho') {
      try {
        NotificationEngine.enviar({
          para: agente.email,
          assunto: 'Seu cadastro como agente cultural foi aprovado!',
          corpo: 'Olá, ' + agente.nome + '!\n\nSeu cadastro como agente cultural foi aprovado e está ativo em nossa base.\n\nFique à disposição para novas oportunidades.'
        });
      } catch(e) {
        Logger.warn('agentes', 'ativar', 'Erro ao enviar email de boas-vindas: ' + e.message);
      }
    }

    return AgenteCulturalRepository.salvar(agente);
  }

  // ─── Portal Público (auto-cadastro) ──────────────────────────────────────

  /**
   * Cria pré-cadastro via portal público (sem autenticação).
   * Status inicial: rascunho — requer aprovação interna.
   */
  function autoCadastro(orgId, dados, consentimentoId) {
    if (!dados.nome || !dados.email) throw new Error('nome e email são obrigatórios.');
    dados.status         = 'rascunho';
    dados.consentimentoId = consentimentoId || '';
    return salvar(orgId, dados, dados.email);
  }

  // ─── Rider Técnico ────────────────────────────────────────────────────────

  /**
   * Atualiza o rider técnico do agente.
   * @param {Object} rider — { equipamentos:[], iluminacao:'', som:'', palco:'', camarim:'' }
   */
  function salvarRider(orgId, id, rider, emailUsuario) {
    var agente = AgenteCulturalRepository.buscarPorId(orgId, id);
    if (!agente) throw new Error('Agente não encontrado: ' + id);
    if (agente.status === 'descredenciado') throw new Error('Agente descredenciado não pode ser editado.');
    agente.riderTecnico = rider || {};
    AuditoriaService.registrar('agente_rider_atualizado', 'agentes', {
      id: id, emailUsuario: emailUsuario
    });
    return AgenteCulturalRepository.salvar(agente);
  }

  // ─── Histórico de Vínculos ────────────────────────────────────────────────

  /**
   * Registra vínculo do agente com uma Ação (para histórico institucional).
   */
  function registrarVinculo(orgId, agenteId, acaoId, acaoNome, papel) {
    var agente = AgenteCulturalRepository.buscarPorId(orgId, agenteId);
    if (!agente) return;
    agente.historico = agente.historico || [];
    agente.historico.push({
      tipo: 'vinculo_acao', acaoId: acaoId, acaoNome: acaoNome,
      papel: papel || '', em: new Date().toISOString()
    });
    AgenteCulturalRepository.salvar(agente);
  }

  // ─── API Pública ──────────────────────────────────────────────────────────

  return {
    salvar:          salvar,
    autoCadastro:    autoCadastro,
    ativar:          ativar,
    suspender:       suspender,
    reativar:        reativar,
    descredenciar:   descredenciar,
    salvarRider:     salvarRider,
    registrarVinculo:registrarVinculo
  };

})();
