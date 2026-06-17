/**
 * @file modules/reunioes/reuniao_engine.gs
 * @layer modules/reunioes
 * @description Engine de Reuniões — FSM, criação de tarefas de encaminhamento, aprovação de ata.
 *
 * FSM: rascunho → agendada → em_andamento → encerrada → (cancelada a qualquer momento)
 * Ata:           rascunho_ata → em_aprovacao → aprovada (imutável após aprovação)
 *
 * @depends reuniao_repository.gs, fsm_guardian.gs, sistema_events.gs,
 *          tarefa_engine.gs, notification_engine.gs, auditoria_service.gs
 */

var ReuniaoEngine = (function () {

  // ─── FSM de Reunião ───────────────────────────────────────────────────────────

  var _TRANSICOES = {
    rascunho:     ['agendada', 'cancelada'],
    agendada:     ['em_andamento', 'cancelada'],
    em_andamento: ['encerrada', 'cancelada'],
    encerrada:    [],
    cancelada:    []
  };

  var _TRANSICOES_ATA = {
    rascunho_ata:    ['em_aprovacao'],
    em_aprovacao:    ['aprovada', 'rascunho_ata'],
    aprovada:        []
  };

  (function _registrarFSMs() {
    try {
      if (typeof FsmGuardian === 'undefined') return;
      FsmGuardian.registrar('reuniao',     _TRANSICOES);
      FsmGuardian.registrar('reuniao_ata', _TRANSICOES_ATA);
    } catch(e) { /* ignorar se não disponível */ }
  })();

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

  function criar(dados, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    if (!dados.titulo) throw new Error('Título obrigatório');
    if (!dados.dataHora) throw new Error('Data/hora obrigatória');

    dados.status     = 'rascunho';
    dados.ata        = { rascunho: '', textoFinal: '', statusAta: 'rascunho_ata', versoes: [] };
    dados.encaminhamentos = [];
    dados.presentes  = dados.presentes || [];
    dados.pauta      = dados.pauta || [];

    var reuniao = ReuniaoRepository.salvar(orgId, dados, email);
    AuditoriaService.registrar('REUNIAO_CRIADA', 'reunioes', { id: reuniao.id, titulo: reuniao.titulo, email: email });
    SystemEvents.emit('REUNIAO_CRIADA', { reuniaoId: reuniao.id, titulo: reuniao.titulo, orgId: orgId }, email);
    return reuniao;
  }

  function atualizar(id, dados, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var reuniao = ReuniaoRepository.buscarPorId(orgId, id);
    if (!reuniao) throw new Error('Reunião não encontrada: ' + id);
    if (reuniao.status === 'encerrada' && dados.status !== 'encerrada') {
      throw new Error('Reunião encerrada não pode ser editada (exceto ata).');
    }

    // Mesclar campos permitidos
    var camposPermitidos = ['titulo','tipo','local','dataHora','duracao','pauta','presentes',
                            'ausentesJustificados','ausentesNaoJustificados','acaoVinculadaId',
                            'convocadoPor','encaminhamentos'];
    camposPermitidos.forEach(function(c) {
      if (dados[c] !== undefined) reuniao[c] = dados[c];
    });

    var atualizada = ReuniaoRepository.salvar(orgId, reuniao, email);
    AuditoriaService.registrar('REUNIAO_ATUALIZADA', 'reunioes', { id: id, email: email });
    return atualizada;
  }

  function mudarStatus(id, novoStatus, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var reuniao = ReuniaoRepository.buscarPorId(orgId, id);
    if (!reuniao) throw new Error('Reunião não encontrada: ' + id);

    FsmGuardian.assertValida('reuniao', reuniao.status, novoStatus, id, email);

    reuniao.status = novoStatus;
    if (novoStatus === 'em_andamento' && !reuniao.inicioEm) reuniao.inicioEm = agora();
    if (novoStatus === 'encerrada'   && !reuniao.encerradaEm) reuniao.encerradaEm = agora();
    if (novoStatus === 'cancelada')   reuniao.canceladaEm = agora();

    // Ao encerrar: transformar encaminhamentos pendentes em tarefas automáticas
    if (novoStatus === 'encerrada') {
      _criarTarefasDeEncaminhamentos(orgId, reuniao, email);
    }

    var atualizada = ReuniaoRepository.salvar(orgId, reuniao, email);
    AuditoriaService.registrar('REUNIAO_STATUS_ALTERADO', 'reunioes',
      { id: id, de: reuniao.status, para: novoStatus, email: email });
    SystemEvents.emit('REUNIAO_STATUS_ALTERADO',
      { reuniaoId: id, status: novoStatus, orgId: orgId }, email);
    return atualizada;
  }

  // ─── Ata ──────────────────────────────────────────────────────────────────────

  function salvarRascunhoAta(id, textoRascunho, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var reuniao = ReuniaoRepository.buscarPorId(orgId, id);
    if (!reuniao) throw new Error('Reunião não encontrada: ' + id);

    if (!reuniao.ata) reuniao.ata = { versoes: [] };
    if (reuniao.ata.statusAta === 'aprovada') throw new Error('Ata aprovada é imutável.');

    // Versionar rascunho
    reuniao.ata.versoes = reuniao.ata.versoes || [];
    reuniao.ata.versoes.push({
      versao: (reuniao.ata.versoes.length + 1),
      texto:  reuniao.ata.rascunho || '',
      editadoEm: agora(),
      editadoPor: email
    });
    reuniao.ata.rascunho   = textoRascunho;
    reuniao.ata.statusAta  = reuniao.ata.statusAta || 'rascunho_ata';

    AuditoriaService.registrar('ATA_RASCUNHO_SALVO', 'reunioes', { id: id, email: email });
    return ReuniaoRepository.salvar(orgId, reuniao, email);
  }

  function submeterAtaParaAprovacao(id, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var reuniao = ReuniaoRepository.buscarPorId(orgId, id);
    if (!reuniao) throw new Error('Reunião não encontrada: ' + id);
    if (!reuniao.ata || !reuniao.ata.rascunho) throw new Error('Rascunho da ata não preenchido.');

    FsmGuardian.assertValida('reuniao_ata', reuniao.ata.statusAta || 'rascunho_ata', 'em_aprovacao', id, email);

    reuniao.ata.statusAta      = 'em_aprovacao';
    reuniao.ata.submetidaEm    = agora();
    reuniao.ata.submetidaPor   = email;
    reuniao.ata.textoFinal     = reuniao.ata.rascunho;

    // Notificar convocador para aprovação
    try {
      if (reuniao.convocadoPor && typeof NotificationEngine !== 'undefined') {
        NotificationEngine.enviarEmail(reuniao.convocadoPor, {
          assunto: '[CCBJ] Ata da reunião "' + reuniao.titulo + '" aguarda sua aprovação',
          corpo: 'A ata da reunião "' + reuniao.titulo + '" foi submetida para sua aprovação.'
        });
      }
    } catch(e) { /* silencioso */ }

    AuditoriaService.registrar('ATA_SUBMETIDA', 'reunioes', { id: id, email: email });
    return ReuniaoRepository.salvar(orgId, reuniao, email);
  }

  function aprovarAta(id, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var reuniao = ReuniaoRepository.buscarPorId(orgId, id);
    if (!reuniao) throw new Error('Reunião não encontrada: ' + id);

    FsmGuardian.assertValida('reuniao_ata', reuniao.ata && reuniao.ata.statusAta, 'aprovada', id, email);

    reuniao.ata.statusAta   = 'aprovada';
    reuniao.ata.aprovadaEm  = agora();
    reuniao.ata.aprovadaPor = email;

    AuditoriaService.registrar('ATA_APROVADA', 'reunioes', { id: id, email: email });
    SystemEvents.emit('ATA_APROVADA', { reuniaoId: id, orgId: orgId }, email);
    return ReuniaoRepository.salvar(orgId, reuniao, email);
  }

  // ─── Auto-salvamento ──────────────────────────────────────────────────────────

  /**
   * Auto-salvamento de rascunho (dados + pauta + presença + texto da ata).
   * Diferente de salvarRascunhoAta(): não versiona a ata a cada chamada — é uma
   * rede de segurança contra queda de energia/internet, não um checkpoint deliberado.
   */
  function autoSalvar(id, dados, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var reuniao = ReuniaoRepository.buscarPorId(orgId, id);
    if (!reuniao) throw new Error('Reunião não encontrada: ' + id);

    var camposPermitidos = ['titulo','tipo','local','dataHora','duracao','pauta','presentes',
                            'ausentesJustificados','acaoVinculadaId','convocadoPor'];
    camposPermitidos.forEach(function(c) {
      if (dados[c] !== undefined) reuniao[c] = dados[c];
    });

    if (dados.ataTexto !== undefined) {
      if (!reuniao.ata) reuniao.ata = { rascunho: '', textoFinal: '', statusAta: 'rascunho_ata', versoes: [] };
      if (reuniao.ata.statusAta !== 'aprovada') reuniao.ata.rascunho = dados.ataTexto;
    }

    reuniao.autoSalvoEm = agora();
    return ReuniaoRepository.salvar(orgId, reuniao, email);
  }

  // ─── Encaminhamentos ──────────────────────────────────────────────────────────

  function adicionarEncaminhamento(id, encaminhamento, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var reuniao = ReuniaoRepository.buscarPorId(orgId, id);
    if (!reuniao) throw new Error('Reunião não encontrada: ' + id);

    encaminhamento.id        = gerarId('enc');
    encaminhamento.status    = 'pendente';
    encaminhamento.criadoEm  = agora();
    encaminhamento.criadoPor = email;
    encaminhamento.ordem     = (reuniao.encaminhamentos || []).length + 1;

    reuniao.encaminhamentos = reuniao.encaminhamentos || [];
    reuniao.encaminhamentos.push(encaminhamento);

    var atualizada = ReuniaoRepository.salvar(orgId, reuniao, email);
    AuditoriaService.registrar('ENCAMINHAMENTO_ADICIONADO', 'reunioes',
      { reuniaoId: id, texto: encaminhamento.texto, responsavel: encaminhamento.responsavel });
    try { NotificationEngine.enviarNotificacaoEncaminhamento(encaminhamento, reuniao); } catch(e) { /* silencioso */ }
    return atualizada;
  }

  function concluirEncaminhamento(reuniaoId, encId, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    return ReuniaoRepository.atualizarEncaminhamento(orgId, reuniaoId, encId,
      { status: 'concluido' }, email);
  }

  // ─── Privados ─────────────────────────────────────────────────────────────────

  function _criarTarefasDeEncaminhamentos(orgId, reuniao, email) {
    if (typeof TarefaEngine === 'undefined') return;
    (reuniao.encaminhamentos || []).forEach(function(enc) {
      if (enc.status === 'pendente' && enc.responsavel && enc.texto) {
        try {
          TarefaEngine.criarAutomatica({
            titulo:       '[Encaminhamento] ' + enc.texto,
            responsavel:  enc.responsavel,
            prazo:        enc.prazo || null,
            prioridade:   'media',
            origemTipo:   'reuniao',
            origemId:     reuniao.id,
            orgId:        orgId
          }, email);
          enc.tarefaId = true; // marca que foi criada
        } catch(e) { Logger.warn('reuniao_engine', '_criarTarefas', e.message); }
      }
    });
  }

  return {
    criar:                      criar,
    atualizar:                  atualizar,
    autoSalvar:                 autoSalvar,
    mudarStatus:                mudarStatus,
    salvarRascunhoAta:          salvarRascunhoAta,
    submeterAtaParaAprovacao:   submeterAtaParaAprovacao,
    aprovarAta:                 aprovarAta,
    adicionarEncaminhamento:    adicionarEncaminhamento,
    concluirEncaminhamento:     concluirEncaminhamento
  };

})();
