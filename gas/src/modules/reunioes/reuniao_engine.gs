/**
 * @file modules/reunioes/reuniao_engine.gs
 * @layer modules/reunioes
 * @description Engine de Reuniões — FSM, criação de tarefas de encaminhamento, aprovação de ata.
 *
 * FSM: rascunho → agendada → em_andamento → encerrada → (cancelada a qualquer momento)
 * Ata:           rascunho_ata → em_aprovacao → aprovada (imutável após aprovação)
 *
 * @depends reuniao_repository.gs, fsm_guardian.gs, sistema_events.gs,
 *          tarefa_engine.gs, notification_engine.gs, auditoria_service.gs,
 *          CalendarApp (scope calendar em appsscript.json)
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
    dados.links      = dados.links  || [];
    dados.anexos     = dados.anexos || [];

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
                            'convocadoPor','encaminhamentos','links','anexos'];
    camposPermitidos.forEach(function(c) {
      if (dados[c] !== undefined) reuniao[c] = dados[c];
    });

    if (reuniao.googleEventId && ['agendada','em_andamento'].includes(reuniao.status)) {
      _atualizarEventoCalendar(reuniao);
    }

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

    // Ao agendar: cria o convite no Google Calendar (se ainda não existir)
    if (novoStatus === 'agendada' && !reuniao.googleEventId) {
      _criarEventoCalendar(reuniao);
    }
    // Ao cancelar: remove o convite do Calendar
    if (novoStatus === 'cancelada' && reuniao.googleEventId) {
      _excluirEventoCalendar(reuniao);
      reuniao.googleEventId = null;
    }

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
                            'ausentesJustificados','acaoVinculadaId','convocadoPor','links','anexos'];
    camposPermitidos.forEach(function(c) {
      if (dados[c] !== undefined) reuniao[c] = dados[c];
    });

    if (dados.ataTexto !== undefined) {
      if (!reuniao.ata) reuniao.ata = { rascunho: '', textoFinal: '', statusAta: 'rascunho_ata', versoes: [] };
      if (reuniao.ata.statusAta !== 'aprovada') reuniao.ata.rascunho = dados.ataTexto;
    }

    if (reuniao.googleEventId && ['agendada','em_andamento'].includes(reuniao.status)) {
      _atualizarEventoCalendar(reuniao);
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

  function concluirEncaminhamento(reuniaoId, encId, email, orgId, observacao) {
    orgId = orgId || getOrgConfig().orgId;
    if (observacao) {
      ReuniaoRepository.adicionarObservacaoEncaminhamento(orgId, reuniaoId, encId, observacao, email);
    }
    return ReuniaoRepository.atualizarEncaminhamento(orgId, reuniaoId, encId,
      { status: 'concluido' }, email);
  }

  function adicionarObservacaoEncaminhamento(reuniaoId, encId, texto, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    if (!texto) throw new Error('Texto da observação obrigatório');
    return ReuniaoRepository.adicionarObservacaoEncaminhamento(orgId, reuniaoId, encId, texto, email);
  }

  function listarEncaminhamentosGestao(filtros, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    return ReuniaoRepository.listarEncaminhamentosGestao(orgId, filtros);
  }

  function metricasEncaminhamentos(orgId) {
    orgId = orgId || getOrgConfig().orgId;
    return ReuniaoRepository.metricasEncaminhamentos(orgId);
  }

  // ─── Anexos ───────────────────────────────────────────────────────────────────

  var _PASTA_ANEXOS = 'CCBJ_Reunioes_Anexos';
  var _TAMANHO_MAX_ANEXO = 8 * 1024 * 1024; // 8MB (limite prático de google.script.run)

  /**
   * Faz upload de um anexo (qualquer tipo de arquivo) para o Google Drive.
   * @returns {{nome:string, url:string, mimeType:string}}
   */
  function uploadAnexo(base64, mimeType, nomeArquivo) {
    var bytes = Utilities.base64Decode(base64);
    if (bytes.length > _TAMANHO_MAX_ANEXO) {
      throw new Error('Arquivo maior que 8MB. Use um arquivo menor ou compartilhe por link.');
    }
    var pasta   = _obterOuCriarPastaAnexos();
    var blob    = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', nomeArquivo || ('anexo_' + Date.now()));
    var arquivo = pasta.createFile(blob);
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { nome: nomeArquivo || arquivo.getName(), url: arquivo.getUrl(), mimeType: mimeType || '' };
  }

  function _obterOuCriarPastaAnexos() {
    var pastas = DriveApp.getFoldersByName(_PASTA_ANEXOS);
    if (pastas.hasNext()) return pastas.next();
    return DriveApp.createFolder(_PASTA_ANEXOS);
  }

  // ─── Google Calendar ──────────────────────────────────────────────────────────
  // Convite hospedado no calendário da conta que publicou o app (executeAs: USER_DEPLOYING);
  // convocador e participantes são adicionados como guests e recebem convite por e-mail.

  function _listarConvidados(reuniao) {
    var emails = [];
    if (reuniao.convocadoPor && reuniao.convocadoPor.includes('@')) emails.push(reuniao.convocadoPor);
    (reuniao.presentes || []).forEach(function(e) { if (e && e.includes('@')) emails.push(e); });
    (reuniao.ausentesJustificados || []).forEach(function(e) { if (e && e.includes('@')) emails.push(e); });
    return emails.filter(function(e, i, arr) { return arr.indexOf(e) === i; });
  }

  function _criarEventoCalendar(reuniao) {
    try {
      if (!reuniao.dataHora) return;
      var inicio = new Date(reuniao.dataHora);
      var fim    = new Date(inicio.getTime() + (reuniao.duracao || 60) * 60000);
      var evento = CalendarApp.getDefaultCalendar().createEvent(reuniao.titulo, inicio, fim, {
        location:    reuniao.local || '',
        description: 'Reunião CCBJ — gerida pelo sistema. ID: ' + reuniao.id,
        guests:      _listarConvidados(reuniao).join(','),
        sendInvites: true
      });
      reuniao.googleEventId = evento.getId();
      Logger.info('reuniao_engine', '_criarEventoCalendar', 'Evento criado: ' + reuniao.googleEventId);
    } catch(e) { Logger.warn('reuniao_engine', '_criarEventoCalendar', e.message); }
  }

  function _atualizarEventoCalendar(reuniao) {
    try {
      var evento = CalendarApp.getDefaultCalendar().getEventById(reuniao.googleEventId);
      if (!evento) { _criarEventoCalendar(reuniao); return; }
      var inicio = new Date(reuniao.dataHora);
      var fim    = new Date(inicio.getTime() + (reuniao.duracao || 60) * 60000);
      evento.setTitle(reuniao.titulo);
      evento.setTime(inicio, fim);
      evento.setLocation(reuniao.local || '');
      var atuais     = evento.getGuestList().map(function(g) { return g.getEmail(); });
      var desejados  = _listarConvidados(reuniao);
      desejados.forEach(function(e) { if (atuais.indexOf(e) === -1) evento.addGuest(e); });
    } catch(e) { Logger.warn('reuniao_engine', '_atualizarEventoCalendar', e.message); }
  }

  function _excluirEventoCalendar(reuniao) {
    try {
      var evento = CalendarApp.getDefaultCalendar().getEventById(reuniao.googleEventId);
      if (evento) evento.deleteEvent();
    } catch(e) { Logger.warn('reuniao_engine', '_excluirEventoCalendar', e.message); }
  }

  // ─── Privados ─────────────────────────────────────────────────────────────────

  function _criarTarefasDeEncaminhamentos(orgId, reuniao, email) {
    if (typeof TarefaEngine === 'undefined') return;
    (reuniao.encaminhamentos || []).forEach(function(enc) {
      if (enc.status === 'pendente' && enc.responsavel && enc.texto && !enc.tarefaId) {
        try {
          var tarefa = TarefaEngine.criar({
            titulo:      '[Encaminhamento] ' + enc.texto,
            descricao:   'Encaminhamento da reunião "' + reuniao.titulo + '".',
            responsavel: enc.responsavel,
            prioridade:  'media',
            modulo:      'reunioes',
            tipo:        'encaminhamento',
            origem:      'reuniao',
            origemId:    reuniao.id,
            prazo:       enc.prazo || ''
          }, email);
          enc.tarefaId = tarefa.id; // referência real à tarefa criada (antes gravava só `true`)
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
    concluirEncaminhamento:     concluirEncaminhamento,
    adicionarObservacaoEncaminhamento: adicionarObservacaoEncaminhamento,
    listarEncaminhamentosGestao: listarEncaminhamentosGestao,
    metricasEncaminhamentos:    metricasEncaminhamentos,
    uploadAnexo:                uploadAnexo
  };

})();
