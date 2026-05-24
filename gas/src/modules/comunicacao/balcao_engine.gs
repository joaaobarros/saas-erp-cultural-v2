/**
 * @file modules/comunicacao/balcao_engine.gs
 * @layer modules/comunicacao
 * @description Engine do Balcão de Demandas — FSM, SLA, versionamento, notificações.
 *
 * FSM: rascunho → submetida → em_analise → em_execucao → revisao → aprovada → concluida
 *      Cancelada a qualquer momento por admin/gestor.
 *      Rejeição em revisao → volta para em_execucao.
 *
 * @depends balcao_repository.gs, fsm_guardian.gs, notification_engine.gs,
 *          auditoria_service.gs, alertas_engine.gs
 */

var BalcaoEngine = (function () {

  var _TRANSICOES = {
    rascunho:    ['submetida', 'cancelada'],
    submetida:   ['em_analise', 'cancelada'],
    em_analise:  ['em_execucao', 'cancelada'],
    em_execucao: ['revisao', 'cancelada'],
    revisao:     ['aprovada', 'em_execucao', 'cancelada'],
    aprovada:    ['concluida'],
    concluida:   [],
    cancelada:   []
  };

  (function _registrarFSM() {
    try { FsmGuardian.registrar('balcao', _TRANSICOES); } catch(e) { /* ignorar */ }
  })();

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

  function criar(dados, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    if (!dados.titulo) throw new Error('Título obrigatório');
    if (!dados.tipo)   throw new Error('Tipo obrigatório');
    dados.status         = 'rascunho';
    dados.demandante     = dados.demandante || email;
    dados.slaHoras       = BalcaoRepository.calcularSla(dados.tipo, dados.urgencia || 'media');
    var demanda = BalcaoRepository.salvar(orgId, dados, email);
    AuditoriaService.registrar('DEMANDA_CRIADA', 'comunicacao', { id: demanda.id, tipo: demanda.tipo, email: email });
    return demanda;
  }

  function atualizar(id, dados, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var demanda = BalcaoRepository.buscarPorId(orgId, id);
    if (!demanda) throw new Error('Demanda não encontrada: ' + id);
    if (demanda.status === 'concluida') throw new Error('Demanda concluída não pode ser editada.');

    var camposPermitidos = ['titulo','descricao','tipo','urgencia','acaoVinculadaId',
                            'executor','demandanteSetor','arquivos'];
    camposPermitidos.forEach(function(c) {
      if (dados[c] !== undefined) demanda[c] = dados[c];
    });
    // Recalcular SLA se tipo ou urgência mudaram
    if (dados.tipo || dados.urgencia) {
      demanda.slaHoras = BalcaoRepository.calcularSla(demanda.tipo, demanda.urgencia);
    }

    return BalcaoRepository.salvar(orgId, demanda, email);
  }

  function mudarStatus(id, novoStatus, dados, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var demanda = BalcaoRepository.buscarPorId(orgId, id);
    if (!demanda) throw new Error('Demanda não encontrada: ' + id);

    FsmGuardian.transitar('balcao', demanda.status, novoStatus,
      { id: id, tipo: dados && dados.tipo, email: email });

    var agora_ = agora();
    demanda.status = novoStatus;

    if (novoStatus === 'submetida') {
      demanda.dataSubmissao = agora_;
      // Calcular dataLimite a partir do SLA
      var sla = demanda.slaHoras || 72;
      demanda.dataLimite = new Date(new Date(agora_).getTime() + sla * 3600000).toISOString().slice(0,16);
      _notificarEquipeComunicacao(demanda, 'Nova demanda: ' + demanda.titulo);
    }
    if (novoStatus === 'em_execucao' && !demanda.inicioExecucao) {
      demanda.inicioExecucao = agora_;
      if (demanda.executor) _notificarExecucao(demanda);
    }
    if (novoStatus === 'revisao') {
      demanda.revisaoEnviadaEm = agora_;
      _notificarDemandante(demanda, 'Entrega enviada para revisão: ' + demanda.titulo);
    }
    if (novoStatus === 'aprovada') {
      demanda.aprovadaEm = agora_;
      _notificarExecucaoAprovada(demanda);
    }
    if (novoStatus === 'concluida') {
      demanda.dataConclusao = agora_;
      AuditoriaService.registrar('DEMANDA_CONCLUIDA', 'comunicacao',
        { id: id, email: email, rodadas: (demanda.versoes || []).length });
    }
    if (novoStatus === 'cancelada') {
      demanda.canceladaEm       = agora_;
      demanda.motivoCancelamento = (dados && dados.motivo) || '';
    }
    if (novoStatus === 'em_execucao' && demanda.status === 'revisao') {
      // Rejeição: adicionar motivo como comentário
      if (dados && dados.motivoRejeicao) {
        BalcaoRepository.adicionarComentario(orgId, id,
          '❌ Entrega rejeitada: ' + dados.motivoRejeicao, email, 'demandante');
      }
    }

    var atualizada = BalcaoRepository.salvar(orgId, demanda, email);
    AuditoriaService.registrar('DEMANDA_STATUS_ALTERADO', 'comunicacao',
      { id: id, para: novoStatus, email: email });
    return atualizada;
  }

  function adicionarComentario(id, texto, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var demanda = BalcaoRepository.buscarPorId(orgId, id);
    if (!demanda) throw new Error('Demanda não encontrada: ' + id);

    var tipo = (email === demanda.executor) ? 'executor' : 'demandante';
    var atualizada = BalcaoRepository.adicionarComentario(orgId, id, texto, email, tipo);
    AuditoriaService.registrar('DEMANDA_COMENTARIO', 'comunicacao', { id: id, email: email });
    return atualizada;
  }

  function enviarVersao(id, versaoObj, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var demanda = BalcaoRepository.buscarPorId(orgId, id);
    if (!demanda) throw new Error('Demanda não encontrada: ' + id);

    var atualizada = BalcaoRepository.adicionarVersao(orgId, id, versaoObj, email);
    // Avançar status para revisão se em execução
    if (demanda.status === 'em_execucao') {
      atualizada = mudarStatus(id, 'revisao', {}, email, orgId);
    }
    AuditoriaService.registrar('DEMANDA_VERSAO_ENVIADA', 'comunicacao',
      { id: id, versao: (atualizada.versoes || []).length, email: email });
    return atualizada;
  }

  // ─── Notificações ─────────────────────────────────────────────────────────────

  function _notificarEquipeComunicacao(demanda, assunto) {
    try {
      if (typeof NotificationEngine === 'undefined') return;
      NotificationEngine.notificarPorPapel('comunicacao', {
        assunto: '[CCBJ] ' + assunto,
        corpo: 'Nova demanda recebida: "' + demanda.titulo + '" (Tipo: ' + demanda.tipo + ', Urgência: ' + demanda.urgencia + '). Prazo: ' + demanda.dataLimite + '.'
      });
    } catch(e) { Logger.warn('balcao_engine', '_notificarEquipeComunicacao', e.message); }
  }

  function _notificarDemandante(demanda, assunto) {
    try {
      if (!demanda.demandante || typeof NotificationEngine === 'undefined') return;
      NotificationEngine.enviarEmail(demanda.demandante, {
        assunto: '[CCBJ] ' + assunto,
        corpo: 'Sua demanda "' + demanda.titulo + '" foi encaminhada para revisão. Acesse o sistema para avaliar.'
      });
    } catch(e) { Logger.warn('balcao_engine', '_notificarDemandante', e.message); }
  }

  function _notificarExecucao(demanda) {
    try {
      if (!demanda.executor || typeof NotificationEngine === 'undefined') return;
      NotificationEngine.enviarEmail(demanda.executor, {
        assunto: '[CCBJ] Demanda atribuída: ' + demanda.titulo,
        corpo: 'A demanda "' + demanda.titulo + '" foi atribuída a você. Prazo: ' + demanda.dataLimite + '.'
      });
    } catch(e) { Logger.warn('balcao_engine', '_notificarExecucao', e.message); }
  }

  function _notificarExecucaoAprovada(demanda) {
    try {
      if (!demanda.executor || typeof NotificationEngine === 'undefined') return;
      NotificationEngine.enviarEmail(demanda.executor, {
        assunto: '[CCBJ] Entrega aprovada: ' + demanda.titulo,
        corpo: 'Sua entrega para "' + demanda.titulo + '" foi aprovada pelo demandante!'
      });
    } catch(e) { Logger.warn('balcao_engine', '_notificarExecucaoAprovada', e.message); }
  }

  return {
    criar:             criar,
    atualizar:         atualizar,
    mudarStatus:       mudarStatus,
    adicionarComentario: adicionarComentario,
    enviarVersao:      enviarVersao
  };

})();
