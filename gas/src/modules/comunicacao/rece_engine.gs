/**
 * @file modules/comunicacao/rece_engine.gs
 * @layer modules/comunicacao
 * @description Engine da Agenda RECE (Rede de Equipamentos Culturais do Ceará).
 *
 * FSM: rascunho → submetida → publicada → encerrada
 *                           ↘ cancelada (de qualquer estado antes de encerrada)
 *
 * Responsabilidades:
 *   - CRUD de registros RECE com validação dos 25 campos Secult/CE
 *   - Sincronização automática com Reserva Geral vinculada
 *   - Upload de imagem para Google Drive (pasta CCBJ_RECE_Imagens)
 *   - Convites Google Calendar para convidados internos/externos
 *   - Email institucional com branding CCBJ ao publicar
 *
 * @depends rece_repository.gs, fsm_guardian.gs, auditoria_service.gs
 */

var STATUS_RECE = Object.freeze({
  RASCUNHO:   'rascunho',
  SUBMETIDA:  'submetida',
  PUBLICADA:  'publicada',
  ENCERRADA:  'encerrada',
  CANCELADA:  'cancelada'
});

var _TRANSICOES_RECE = {
  rascunho:  ['submetida', 'cancelada'],
  submetida: ['publicada', 'cancelada'],
  publicada: ['encerrada', 'cancelada'],
  encerrada: [],
  cancelada: []
};

if (typeof FsmGuardian !== 'undefined') {
  FsmGuardian.registrar('rece', _TRANSICOES_RECE);
}

var ReceEngine = (function () {

  var PASTA_IMAGENS = 'CCBJ_RECE_Imagens';

  // ─── Criação / Edição ─────────────────────────────────────────────────────

  function criar(dados, email, orgId) {
    _validar(dados);

    var id       = ReceRepository.proximoId(orgId);
    var agoraIso = new Date().toISOString();

    var registro = _normalizar(dados, orgId);
    registro.id            = id;
    registro.status        = STATUS_RECE.RASCUNHO;
    registro.responsavelRece = dados.responsavelRece || email;
    registro.dataSolicitacao = dados.dataSolicitacao || agoraIso.substring(0, 10);
    registro.criadoEm      = agoraIso;
    registro.atualizadoEm  = agoraIso;

    ReceRepository.salvar(orgId, registro);
    AuditoriaService.registrar('RECE_CRIADO', 'comunicacao', { id: id, titulo: registro.titulo, usuario: email });

    return registro;
  }

  function atualizar(id, dados, email, orgId) {
    var existente = ReceRepository.buscarPorId(orgId, id);
    if (!existente) throw new Error('Registro RECE não encontrado: ' + id);
    if (existente.status === STATUS_RECE.ENCERRADA) {
      throw new Error('Não é possível editar um registro RECE encerrado.');
    }

    var atualizado = Object.assign({}, existente, _normalizar(dados, orgId), {
      id:           existente.id,
      orgId:        orgId,
      status:       existente.status,
      criadoEm:     existente.criadoEm,
      atualizadoEm: new Date().toISOString()
    });

    ReceRepository.salvar(orgId, atualizado);
    AuditoriaService.registrar('RECE_ATUALIZADO', 'comunicacao', { id: id, usuario: email });

    return atualizado;
  }

  // ─── Transições de Status ─────────────────────────────────────────────────

  function submeter(id, email, orgId) {
    return _transitar(id, STATUS_RECE.SUBMETIDA, email, orgId, 'RECE_SUBMETIDO');
  }

  function publicar(id, email, orgId) {
    var registro = _transitar(id, STATUS_RECE.PUBLICADA, email, orgId, 'RECE_PUBLICADO');
    _enviarConvitesCalendar(registro, orgId);
    _enviarEmailPublicacao(registro, orgId);
    return registro;
  }

  function encerrar(id, email, orgId) {
    return _transitar(id, STATUS_RECE.ENCERRADA, email, orgId, 'RECE_ENCERRADO');
  }

  function cancelar(id, email, orgId, motivo) {
    var registro = _transitar(id, STATUS_RECE.CANCELADA, email, orgId, 'RECE_CANCELADO');
    AuditoriaService.registrar('RECE_CANCELADO_MOTIVO', 'comunicacao', { id: id, motivo: motivo });
    return registro;
  }

  // ─── Sincronização com Reserva Geral ─────────────────────────────────────

  /**
   * Chamado pelo EventHandlerRegistry quando RESERVATION_CREATED ou RESERVATION_UPDATED.
   * Se existe registro RECE vinculado à reserva, atualiza datas/espaço automaticamente.
   */
  function notificarNovaReserva(reservaId, orgId) {
    try {
      var vinculados = ReceRepository.buscarPorReservaId(orgId, reservaId);
      if (vinculados.length === 0) return;

      var reserva = _obterReserva(reservaId, orgId);
      if (!reserva) return;

      vinculados.forEach(function(r) {
        if (r.status === STATUS_RECE.ENCERRADA || r.status === STATUS_RECE.CANCELADA) return;
        var atualizado = Object.assign({}, r, {
          dataInicio:   reserva.data         || r.dataInicio,
          dataTermino:  reserva.dataTermino  || r.dataTermino,
          horaInicio:   reserva.horaInicio   || r.horaInicio,
          horaTermino:  reserva.horaTermino  || r.horaTermino,
          espacoId:     reserva.sala         || r.espacoId,
          espacoNome:   reserva.salaNome     || r.espacoNome,
          atualizadoEm: new Date().toISOString()
        });
        ReceRepository.salvar(orgId, atualizado);
      });

      Logger.info('rece_engine', 'notificarNovaReserva',
        'RECE sincronizado com reserva ' + reservaId + ': ' + vinculados.length + ' registros');
    } catch(e) {
      Logger.warn('rece_engine', 'notificarNovaReserva', e.message);
    }
  }

  // ─── Upload de Imagem ─────────────────────────────────────────────────────

  /**
   * Faz upload de imagem base64 para Google Drive e retorna a URL pública.
   * @param {string} base64  — conteúdo da imagem em base64
   * @param {string} mimeType — ex: 'image/jpeg'
   * @param {string} nomeArquivo — nome do arquivo
   * @returns {string} URL pública do arquivo no Drive
   */
  function uploadImagem(base64, mimeType, nomeArquivo) {
    try {
      var pasta = _obterOuCriarPasta(PASTA_IMAGENS);
      var blob  = Utilities.newBlob(
        Utilities.base64Decode(base64),
        mimeType || 'image/jpeg',
        nomeArquivo || ('rece_img_' + Date.now() + '.jpg')
      );
      var arquivo = pasta.createFile(blob);
      arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return 'https://drive.google.com/uc?id=' + arquivo.getId();
    } catch(e) {
      Logger.warn('rece_engine', 'uploadImagem', e.message);
      return '';
    }
  }

  // ─── Convites Google Calendar ─────────────────────────────────────────────

  function _enviarConvitesCalendar(registro, orgId) {
    try {
      if (!registro.dataInicio || !registro.horaInicio) return;

      var inicio  = _parseDateTime(registro.dataInicio, registro.horaInicio);
      var termino = _parseDateTime(registro.dataTermino || registro.dataInicio, registro.horaTermino || registro.horaInicio);
      if (termino <= inicio) termino = new Date(inicio.getTime() + 3600000);

      var titulo = registro.titulo + (registro.artistaGrupo ? ' — ' + registro.artistaGrupo : '');
      var local  = registro.espacoNome || '';
      var desc   = (registro.descricaoPublica || '') + '\n\nID RECE: ' + registro.id;

      var convidados = _listarConvidados(registro);
      if (convidados.length === 0) return;

      var evento = CalendarApp.getDefaultCalendar().createEvent(titulo, inicio, termino, {
        location:    local,
        description: desc,
        guests:      convidados.join(','),
        sendInvites: true
      });

      Logger.info('rece_engine', '_enviarConvitesCalendar',
        'Evento criado: ' + evento.getId() + ' com ' + convidados.length + ' convidados');
    } catch(e) {
      Logger.warn('rece_engine', '_enviarConvitesCalendar', e.message);
    }
  }

  // ─── Email institucional ──────────────────────────────────────────────────

  function _enviarEmailPublicacao(registro, orgId) {
    try {
      var org  = getOrgConfig().nome || 'CCBJ';
      var convidados = _listarConvidados(registro);
      if (convidados.length === 0) return;

      var assunto = '[' + org + '] Evento publicado na Agenda RECE: ' + registro.titulo;
      var corpo   = 'O evento a seguir foi publicado na Agenda RECE:\n\n' +
                    'Título: '       + registro.titulo         + '\n' +
                    'Artista/Grupo: '+ (registro.artistaGrupo || '—') + '\n' +
                    'Data: '         + registro.dataInicio + (registro.dataTermino && registro.dataTermino !== registro.dataInicio ? ' a ' + registro.dataTermino : '') + '\n' +
                    'Horário: '      + (registro.horaInicio || '') + ' – ' + (registro.horaTermino || '') + '\n' +
                    'Local: '        + (registro.espacoNome || '—') + '\n' +
                    'Acesso: '       + (registro.acesso || '—') + '\n\n' +
                    (registro.descricaoPublica ? registro.descricaoPublica + '\n\n' : '') +
                    '— ' + org;

      convidados.forEach(function(email) {
        try { GmailApp.sendEmail(email, assunto, corpo); } catch(_) {}
      });
    } catch(e) {
      Logger.warn('rece_engine', '_enviarEmailPublicacao', e.message);
    }
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  function _transitar(id, novoStatus, email, orgId, eventoAuditoria) {
    var registro = ReceRepository.buscarPorId(orgId, id);
    if (!registro) throw new Error('Registro RECE não encontrado: ' + id);

    FsmGuardian.transitar('rece', registro.status, novoStatus, { id: id, usuario: email });

    registro.status       = novoStatus;
    registro.atualizadoEm = new Date().toISOString();

    ReceRepository.salvar(orgId, registro);
    AuditoriaService.registrar(eventoAuditoria, 'comunicacao', { id: id, usuario: email });

    return registro;
  }

  function _validar(dados) {
    if (!dados.titulo || !String(dados.titulo).trim()) {
      throw new Error('Título é obrigatório para registro RECE.');
    }
    if (!dados.dataInicio) {
      throw new Error('Data de início é obrigatória para registro RECE.');
    }
  }

  function _normalizar(dados, orgId) {
    return {
      orgId:               orgId,
      titulo:              String(dados.titulo             || '').trim(),
      dataInicio:          dados.dataInicio                || '',
      dataTermino:         dados.dataTermino               || dados.dataInicio || '',
      horaInicio:          dados.horaInicio                || '',
      horaTermino:         dados.horaTermino               || '',
      espacoId:            dados.espacoId                  || '',
      espacoNome:          dados.espacoNome                || '',
      categorias:          _normalizeArray(dados.categorias),
      parceiros:           String(dados.parceiros          || '').trim(),
      acessibilidades:     _normalizeArray(dados.acessibilidades),
      classificacaoEtaria: dados.classificacaoEtaria       || 'livre',
      publicoAlvo:         String(dados.publicoAlvo        || '').trim(),
      artistaGrupo:        String(dados.artistaGrupo       || '').trim(),
      linkInscricao:       String(dados.linkInscricao      || '').trim(),
      acesso:              dados.acesso                    || 'gratuito',
      descricaoPublica:    String(dados.descricaoPublica   || '').trim(),
      observacoesInternas: String(dados.observacoesInternas|| '').trim(),
      responsavelRece:     dados.responsavelRece           || '',
      dataSolicitacao:     dados.dataSolicitacao           || '',
      imagemUrl:           dados.imagemUrl                 || '',
      convidadosInternos:  _normalizeArray(dados.convidadosInternos),
      eventoInstitucional: dados.eventoInstitucional === true || dados.eventoInstitucional === 'S' ? 'S' : 'N',
      convidadosExternos:  _normalizeArray(dados.convidadosExternos),
      reservaGeralId:      dados.reservaGeralId            || ''
    };
  }

  function _normalizeArray(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim()) return v.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    return [];
  }

  function _listarConvidados(registro) {
    var emails = [];
    (registro.convidadosInternos || []).forEach(function(e) { if (e && e.includes('@')) emails.push(e); });
    (registro.convidadosExternos || []).forEach(function(e) { if (e && e.includes('@')) emails.push(e); });
    return emails;
  }

  function _obterReserva(reservaId, orgId) {
    try {
      return ReservaRepository.buscarPorId(orgId, reservaId);
    } catch(e) { return null; }
  }

  function _obterOuCriarPasta(nome) {
    var pastas = DriveApp.getFoldersByName(nome);
    if (pastas.hasNext()) return pastas.next();
    return DriveApp.createFolder(nome);
  }

  function _parseDateTime(data, hora) {
    try {
      var partes = (hora || '00:00').split(':');
      var d = new Date(data + 'T' + (partes[0] || '00') + ':' + (partes[1] || '00') + ':00');
      return isNaN(d.getTime()) ? new Date() : d;
    } catch(e) { return new Date(); }
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  return {
    criar:               criar,
    atualizar:           atualizar,
    submeter:            submeter,
    publicar:            publicar,
    encerrar:            encerrar,
    cancelar:            cancelar,
    notificarNovaReserva:notificarNovaReserva,
    uploadImagem:        uploadImagem
  };

})();
