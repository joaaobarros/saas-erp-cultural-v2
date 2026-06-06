/**
 * @file modules/tarefas/tarefa_engine.gs
 * @layer modules/tarefas
 * @description Engine de Tarefas com FSM canônica e persistência em tarefas.json.
 */

var STATUS_TAREFA = Object.freeze({
  PENDENTE:      'pendente',
  EM_ANDAMENTO: 'em_andamento',
  BLOQUEADA:    'bloqueada',
  CONCLUIDA:    'concluida',
  CANCELADA:    'cancelada'
});

var PRIORIDADE_TAREFA = Object.freeze({
  BAIXA:   'baixa',
  MEDIA:   'media',
  ALTA:    'alta',
  CRITICA: 'critica'
});

var _TRANSICOES_TAREFA = {
  pendente:      ['em_andamento', 'bloqueada', 'cancelada'],
  em_andamento: ['concluida', 'bloqueada', 'cancelada'],
  bloqueada:    ['em_andamento', 'cancelada'],
  concluida:    [],
  cancelada:    []
};

if (typeof FsmGuardian !== 'undefined') {
  FsmGuardian.registrar('tarefas', _TRANSICOES_TAREFA);
}

var TarefaEngine = (function () {

  function _orgId() {
    return getOrgConfig().orgId;
  }

  function _emailAtual() {
    try { return getEmailSessao(); } catch(e) { return ''; }
  }

  function _papel(email) {
    try {
      var acesso = AcessoService.verificar(email);
      return acesso && acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador';
    } catch (e) {
      return 'colaborador';
    }
  }

  function _normalizarPrioridade(valor) {
    valor = String(valor || PRIORIDADE_TAREFA.MEDIA).toLowerCase();
    return PRIORIDADE_TAREFA[valor.toUpperCase()] || PRIORIDADE_TAREFA.MEDIA;
  }

  function _normalizarStatus(valor) {
    valor = String(valor || STATUS_TAREFA.PENDENTE).toLowerCase();
    var permitidos = Object.keys(STATUS_TAREFA).map(function (k) { return STATUS_TAREFA[k]; });
    return permitidos.indexOf(valor) !== -1 ? valor : STATUS_TAREFA.PENDENTE;
  }

  function _novaTarefa(dados, emailCriador) {
    dados = dados || {};
    var agoraIso = agora();
    return {
      id: '',
      orgId: _orgId(),
      titulo: String(dados.titulo || '').trim(),
      descricao: String(dados.descricao || '').trim(),
      status: _normalizarStatus(dados.status),
      prioridade: _normalizarPrioridade(dados.prioridade),
      responsavel: String(dados.responsavel || '').toLowerCase().trim(),
      executores: Array.isArray(dados.executores) ? dados.executores : [],
      setor: String(dados.setor || '').trim(),
      modulo: String(dados.modulo || 'manual').trim(),
      tipo: String(dados.tipo || 'operacional').trim(),
      prazo: dados.prazo || '',
      concluidoEm: '',
      acaoId: dados.acaoId || dados.idAcao || '',
      processoId: dados.processoId || '',
      reservaId: dados.reservaId || '',
      contratoId: dados.contratoId || '',
      origem: dados.origem || '',
      origemId: dados.origemId || dados.idOrigem || '',
      criadoPor: emailCriador || _emailAtual() || 'sistema',
      criadoEm: agoraIso,
      atualizadoEm: agoraIso,
      versao: 1,
      historico: [{
        data: agoraIso,
        ator: emailCriador || _emailAtual() || 'sistema',
        campo: 'status',
        de: '',
        para: _normalizarStatus(dados.status),
        comentario: 'Tarefa criada'
      }],
      comentarios: [],
      metadados: dados.metadados || {}
    };
  }

  function _validarTarefa(tarefa) {
    if (!tarefa.titulo) throw new Error('Titulo da tarefa e obrigatorio.');
    if (tarefa.responsavel && !validarEmail(tarefa.responsavel)) {
      throw new Error('Responsavel deve ser um email valido.');
    }
    if (tarefa.prazo && isNaN(new Date(tarefa.prazo).getTime())) {
      throw new Error('Prazo invalido.');
    }
  }

  function _emitir(tipo, tarefa, ator, extra) {
    try {
      SystemEvents.emit(tipo, {
        entidade: 'tarefa',
        entidadeId: tarefa.id,
        usuario: ator || 'sistema',
        origem: 'TarefaEngine',
        contexto: Object.assign({
          titulo: tarefa.titulo,
          status: tarefa.status,
          prioridade: tarefa.prioridade
        }, extra || {})
      });
    } catch (e) {
      Logger.warn('tarefa_engine', '_emitir', tipo + ': ' + e.message);
    }
  }

  function _registrarAuditoria(tipo, tarefa, ator, dados) {
    try {
      AuditoriaService.registrar(tipo, 'tarefas', Object.assign({
        tarefaId: tarefa.id,
        titulo: tarefa.titulo,
        ator: ator || 'sistema'
      }, dados || {}));
    } catch (e) {
      Logger.warn('tarefa_engine', '_registrarAuditoria', e.message);
    }
  }

  function criar(dados, emailCriador) {
    var tarefa = _novaTarefa(dados, emailCriador);
    _validarTarefa(tarefa);
    tarefa = TarefaRepository.salvar(tarefa.orgId, tarefa);
    _emitir(SystemEventTypes.TASK_CREATED || 'TASK_CREATED', tarefa, emailCriador);
    _emitir(SystemEventTypes.TAREFA_CRIADA || 'TAREFA_CRIADA', tarefa, emailCriador);
    _registrarAuditoria('TAREFA_CRIADA', tarefa, emailCriador);
    return tarefa;
  }

  function editar(id, campos, emailEditor) {
    var orgId = _orgId();
    var tarefa = TarefaRepository.buscarPorId(orgId, id);
    if (!tarefa) throw new Error('Tarefa nao encontrada: ' + id);

    var editaveis = ['titulo', 'descricao', 'prioridade', 'responsavel', 'executores',
      'setor', 'modulo', 'tipo', 'prazo', 'acaoId', 'idAcao', 'processoId',
      'reservaId', 'contratoId', 'metadados'];
    var alteracoes = [];
    editaveis.forEach(function (campo) {
      if (campos.hasOwnProperty(campo)) {
        var destino = campo === 'idAcao' ? 'acaoId' : campo;
        if (JSON.stringify(tarefa[destino]) !== JSON.stringify(campos[campo])) {
          alteracoes.push({ campo: destino, de: tarefa[destino], para: campos[campo] });
          tarefa[destino] = campos[campo];
        }
      }
    });

    if (!alteracoes.length) return tarefa;
    _validarTarefa(tarefa);
    tarefa.atualizadoEm = agora();
    tarefa.historico = tarefa.historico || [];
    alteracoes.forEach(function (a) {
      tarefa.historico.push({
        data: agora(),
        ator: emailEditor || _emailAtual() || 'sistema',
        campo: a.campo,
        de: a.de,
        para: a.para,
        comentario: ''
      });
    });

    tarefa = TarefaRepository.salvar(orgId, tarefa);
    _emitir(SystemEventTypes.TASK_UPDATED || 'TASK_UPDATED', tarefa, emailEditor, { alteracoes: alteracoes });
    _registrarAuditoria('TAREFA_ATUALIZADA', tarefa, emailEditor, { alteracoes: alteracoes });
    return tarefa;
  }

  function mudarStatus(id, novoStatus, comentario, emailAtor) {
    var orgId = _orgId();
    var tarefa = TarefaRepository.buscarPorId(orgId, id);
    if (!tarefa) throw new Error('Tarefa nao encontrada: ' + id);
    novoStatus = _normalizarStatus(novoStatus);

    FsmGuardian.assertValida('tarefas', tarefa.status, novoStatus, tarefa.id, emailAtor);

    var anterior = tarefa.status;
    tarefa.status = novoStatus;
    tarefa.atualizadoEm = agora();
    if (novoStatus === STATUS_TAREFA.CONCLUIDA) tarefa.concluidoEm = agora();
    tarefa.historico = tarefa.historico || [];
    tarefa.historico.push({
      data: agora(),
      ator: emailAtor || _emailAtual() || 'sistema',
      campo: 'status',
      de: anterior,
      para: novoStatus,
      comentario: comentario || ''
    });

    tarefa = TarefaRepository.salvar(orgId, tarefa);
    _emitir(SystemEventTypes.TASK_COMPLETED && novoStatus === STATUS_TAREFA.CONCLUIDA
      ? SystemEventTypes.TASK_COMPLETED
      : SystemEventTypes.TAREFA_STATUS_ALTERADO || 'TAREFA_STATUS_ALTERADO',
      tarefa, emailAtor, { de: anterior, para: novoStatus });
    _registrarAuditoria('TAREFA_STATUS_ALTERADO', tarefa, emailAtor, { de: anterior, para: novoStatus });
    return tarefa;
  }

  function comentar(id, texto, emailAutor) {
    if (!texto || !String(texto).trim()) throw new Error('Comentario nao pode ser vazio.');
    var orgId = _orgId();
    var tarefa = TarefaRepository.buscarPorId(orgId, id);
    if (!tarefa) throw new Error('Tarefa nao encontrada: ' + id);
    tarefa.comentarios = tarefa.comentarios || [];
    tarefa.comentarios.push({
      id: gerarId('cmt'),
      autor: emailAutor || _emailAtual() || 'sistema',
      texto: String(texto).trim(),
      data: agora()
    });
    tarefa.atualizadoEm = agora();
    return TarefaRepository.salvar(orgId, tarefa);
  }

  function criarAutomatica(tipo, entidadeId, orgId, emailAtor, dados) {
    dados = dados || {};
    var titulos = {
      reserva_aprovada: 'Preparar espaco para reserva',
      contrato_vencendo: 'Renovar contrato',
      chave_atrasada: 'Cobrar devolucao de chave',
      item_nao_devolvido: 'Cobrar devolucao de item'
    };
    return criar({
      titulo: dados.titulo || ((titulos[tipo] || 'Tarefa automatica') + (entidadeId ? ': ' + entidadeId : '')),
      descricao: dados.descricao || 'Tarefa criada automaticamente pelo sistema.',
      prioridade: dados.prioridade || 'alta',
      responsavel: dados.responsavel || '',
      setor: dados.setor || '',
      modulo: dados.modulo || 'automacao',
      tipo: tipo || 'automatica',
      origem: tipo || 'automatica',
      origemId: entidadeId || '',
      prazo: dados.prazo || ''
    }, emailAtor || 'sistema');
  }

  function listarVisiveis(filtros, email) {
    email = email || _emailAtual();
    return TarefaRepository.listarParaUsuario(_orgId(), email, _papel(email), filtros);
  }

  function obterMetricas(email) {
    var orgId = _orgId();
    var lista = listarVisiveis({}, email || _emailAtual());
    var now = Date.now();
    var abertas = lista.filter(function (t) {
      return t.status !== STATUS_TAREFA.CONCLUIDA && t.status !== STATUS_TAREFA.CANCELADA;
    });
    return {
      total: lista.length,
      abertas: abertas.length,
      concluidas: lista.filter(function (t) { return t.status === STATUS_TAREFA.CONCLUIDA; }).length,
      bloqueadas: lista.filter(function (t) { return t.status === STATUS_TAREFA.BLOQUEADA; }).length,
      atrasadas: abertas.filter(function (t) {
        return t.prazo && new Date(t.prazo).getTime() < now;
      }).length,
      porStatus: lista.reduce(function (acc, t) {
        acc[t.status || 'sem_status'] = (acc[t.status || 'sem_status'] || 0) + 1;
        return acc;
      }, {}),
      orgId: orgId
    };
  }

  function migrarSheetParaJson() {
    var orgId = _orgId();
    TarefaRepository.garantirCabecalhoIndice();
    var linhas = DataGateway.obterTodos('SHEET_ID_PESSOAL', 'Tarefas');
    var migradas = 0;
    linhas.forEach(function (r) {
      var id = String(r[0] || '').trim();
      if (!id || id === 'ID') return;
      if (TarefaRepository.buscarPorId(orgId, id)) return;
      var esquemaNovo = String(r[1] || '') === orgId || String(r[1] || '').indexOf('org_') === 0;
      var tarefa = {
        id: id,
        orgId: esquemaNovo ? String(r[1] || orgId) : orgId,
        titulo: String(esquemaNovo ? (r[2] || '') : (r[1] || '') || 'Tarefa sem titulo'),
        descricao: String(esquemaNovo ? (r[3] || '') : (r[2] || '')),
        responsavel: String(esquemaNovo ? (r[4] || '') : (r[3] || '')).toLowerCase().trim(),
        setor: String(esquemaNovo ? (r[5] || '') : (r[4] || '')),
        prioridade: _normalizarPrioridade(esquemaNovo ? r[6] : r[5]),
        status: _normalizarStatus(esquemaNovo ? r[7] : r[6]),
        criadoEm: (esquemaNovo ? r[8] : r[7]) || agora(),
        prazo: (esquemaNovo ? r[9] : r[8]) || '',
        concluidoEm: (esquemaNovo ? r[10] : r[9]) || '',
        acaoId: esquemaNovo ? (r[11] || '') : '',
        processoId: esquemaNovo ? (r[12] || '') : (r[10] || ''),
        modulo: esquemaNovo ? (r[13] || 'migrado') : 'migrado',
        tipo: esquemaNovo ? (r[14] || 'migrado') : (r[11] || 'migrado'),
        atualizadoEm: (esquemaNovo ? r[15] : '') || agora(),
        versao: Number((esquemaNovo ? r[16] : '') || 1),
        criadoPor: 'migracao',
        historico: [],
        comentarios: [],
        metadados: { origemMigracao: 'PESSOAL.Tarefas' }
      };
      TarefaRepository.salvar(orgId, tarefa);
      migradas++;
    });
    var protecao = TarefaRepository.protegerIndice();
    return { migradas: migradas, protecao: protecao };
  }

  return {
    criar: criar,
    editar: editar,
    salvar: function (dados, email) { return dados && dados.id ? editar(dados.id, dados, email) : criar(dados, email); },
    mudarStatus: mudarStatus,
    aplicarTransicao: mudarStatus,
    comentar: comentar,
    criarAutomatica: criarAutomatica,
    listarVisiveis: listarVisiveis,
    obterMetricas: obterMetricas,
    migrarSheetParaJson: migrarSheetParaJson
  };

})();
