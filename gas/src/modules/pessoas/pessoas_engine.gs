/**
 * @file modules/pessoas/pessoas_engine.gs
 * @layer modules/pessoas
 * @description Engine unificada do domínio Pessoas.
 *
 * Fusão canônica de EquipesEngine + RHEngine do legado.
 * Toda regra de negócio de colaboradores passa por aqui.
 *
 * FSM — Status do colaborador:
 *   ativo → afastado, ferias, inativo, desligado
 *   afastado → ativo, desligado
 *   ferias → ativo
 *   inativo → ativo, desligado
 *   desligado → [] (terminal)
 *
 * FSM — Férias:
 *   pendente → aprovado, recusado, cancelado, pendente_ajuste
 *   pendente_ajuste → pendente, cancelado
 *   aprovado → concluido, cancelado
 *   recusado → pendente, cancelado
 *   concluido → [] (terminal)
 *   cancelado → [] (terminal)
 *
 * FSM — Afastamento:
 *   rascunho → ativo, cancelado
 *   ativo    → encerrado, cancelado
 *   encerrado → [] (terminal)
 *   cancelado → [] (terminal)
 *
 * Ao ativar afastamento: status colaborador → afastado
 * Ao encerrar/cancelar afastamento (se colaborador estava afastado): status → ativo
 *
 * @depends modules/pessoas/colaborador_repository.gs (ColaboradorRepository)
 *          core/services/fsm_guardian.gs (FsmGuardian)
 *          core/services/auditoria_service.gs (AuditoriaService)
 *          core/event_bus_backend.gs (SystemEvents)
 *          core/events_constants.gs (SystemEventTypes)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 */

// ── Constantes de domínio ─────────────────────────────────────────────

var STATUS_COLABORADOR = Object.freeze({
  ATIVO:     'ativo',
  AFASTADO:  'afastado',
  FERIAS:    'ferias',
  INATIVO:   'inativo',
  DESLIGADO: 'desligado'
});

var TIPO_VINCULO = Object.freeze({
  CLT:        'clt',
  PJ:         'pj',
  ESTAGIO:    'estagio',
  VOLUNTARIO: 'voluntario',
  BOLSISTA:   'bolsista',
  TEMPORARIO: 'temporario'
});

var STATUS_FERIAS = Object.freeze({
  PENDENTE:        'pendente',
  APROVADO:        'aprovado',
  RECUSADO:        'recusado',
  CANCELADO:       'cancelado',
  PENDENTE_AJUSTE: 'pendente_ajuste',
  CONCLUIDO:       'concluido'
});

// ── Registro de FSMs ──────────────────────────────────────────────────

var _TRANSICOES_COLABORADOR = {
  ativo:     ['afastado', 'ferias', 'inativo', 'desligado'],
  afastado:  ['ativo', 'desligado'],
  ferias:    ['ativo'],
  inativo:   ['ativo', 'desligado'],
  desligado: []
};

var _TRANSICOES_FERIAS = {
  pendente:        ['aprovado', 'recusado', 'cancelado', 'pendente_ajuste'],
  pendente_ajuste: ['pendente', 'cancelado'],
  aprovado:        ['concluido', 'cancelado'],
  recusado:        ['pendente', 'cancelado'],
  concluido:       [],
  cancelado:       []
};

var STATUS_AFASTAMENTO = Object.freeze({
  RASCUNHO:  'rascunho',
  ATIVO:     'ativo',
  ENCERRADO: 'encerrado',
  CANCELADO: 'cancelado'
});

var TIPO_AFASTAMENTO = Object.freeze({
  MEDICO:              'medico',
  INSS:                'inss',
  ACIDENTE:            'acidente',
  MATERNIDADE:         'maternidade',
  PATERNIDADE:         'paternidade',
  LICENCA_PESSOAL:     'licenca_pessoal',
  DAYOFF_ANIVERSARIO:  'dayoff_aniversario',
  OUTRO:               'outro'
});

var _TRANSICOES_AFASTAMENTO = {
  rascunho:  ['ativo', 'cancelado'],
  ativo:     ['encerrado', 'cancelado'],
  encerrado: [],
  cancelado: []
};

if (typeof FsmGuardian !== 'undefined') {
  FsmGuardian.registrar('colaborador_status',  _TRANSICOES_COLABORADOR);
  FsmGuardian.registrar('ferias_status',       _TRANSICOES_FERIAS);
  FsmGuardian.registrar('afastamento_status',  _TRANSICOES_AFASTAMENTO);
}

// ── Engine ────────────────────────────────────────────────────────────

var PessoasEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  function _audit(evento, dados) {
    try {
      if (typeof AuditoriaService !== 'undefined')
        AuditoriaService.registrar(evento, 'pessoas', dados || {});
    } catch (_) {}
  }

  function _emit(tipo, payload) {
    try {
      if (typeof SystemEvents !== 'undefined')
        SystemEvents.emit(tipo, payload || {});
    } catch (_) {}
  }

  function _transitarColaborador(colaborador, novoStatus, emailOperador) {
    var atual = colaborador.status || 'ativo';
    if (typeof FsmGuardian !== 'undefined') {
      FsmGuardian.validarTransicao('colaborador_status', atual, novoStatus);
    }
    colaborador.status = novoStatus;
    colaborador.ativo  = (novoStatus !== 'desligado' && novoStatus !== 'inativo');
    ColaboradorRepository.salvar(colaborador.orgId || _orgId(), colaborador);
    _audit('COLABORADOR_STATUS_ALTERADO', {
      id: colaborador.id, de: atual, para: novoStatus, operador: emailOperador
    });
  }

  function _transitarFerias(ferias, novoStatus, emailOperador, dados) {
    var atual = ferias.status || 'pendente';
    if (typeof FsmGuardian !== 'undefined') {
      FsmGuardian.validarTransicao('ferias_status', atual, novoStatus);
    }
    dados = dados || {};
    ferias.status      = novoStatus;
    ferias[novoStatus + 'Em']     = new Date().toISOString();
    ferias[novoStatus + 'Por']    = emailOperador || '';
    if (dados.observacao)  ferias.observacaoUltima = dados.observacao;
    if (dados.novasDatas)  { ferias.inicio = dados.novasDatas.inicio; ferias.fim = dados.novasDatas.fim; }
    ColaboradorRepository.salvarFerias(ferias);
    _audit('FERIAS_STATUS_ALTERADO', {
      id: ferias.id, idColaborador: ferias.idColaborador,
      de: atual, para: novoStatus, operador: emailOperador
    });
    return ferias;
  }

  // ──────────────────────────────────────────────────────────────────
  // COLABORADORES
  // ──────────────────────────────────────────────────────────────────

  /**
   * Lista colaboradores com filtros opcionais.
   */
  function listar(filtros, orgId) {
    return ColaboradorRepository.listar(orgId || _orgId(), filtros || {});
  }

  /**
   * Busca colaborador por e-mail (institucional ou pessoal).
   */
  function buscarPorEmail(email, orgId) {
    return ColaboradorRepository.buscarPorEmail(orgId || _orgId(), email);
  }

  /**
   * Busca colaborador por ID.
   */
  function buscarPorId(id, orgId) {
    return ColaboradorRepository.buscarPorId(orgId || _orgId(), id);
  }

  /**
   * Cria ou atualiza colaborador.
   * Valida campos obrigatórios, normaliza dados e emite evento.
   */
  function salvar(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    dados = dados || {};
    if (!dados.nome || !String(dados.nome).trim()) {
      throw new Error('Nome do colaborador é obrigatório.');
    }

    // Normalizar e-mails
    if (dados.emailInstitucional)
      dados.emailInstitucional = String(dados.emailInstitucional).toLowerCase().trim();
    if (dados.emailPessoal)
      dados.emailPessoal = String(dados.emailPessoal).toLowerCase().trim();

    // Tipo de vínculo padrão
    if (!dados.tipoVinculo) dados.tipoVinculo = TIPO_VINCULO.CLT;

    var resultado = ColaboradorRepository.salvar(orgId, dados);
    var evento    = resultado.isNovo ? 'COLABORADOR_CRIADO' : 'COLABORADOR_ATUALIZADO';
    _audit(evento, { id: resultado.id, nome: dados.nome, operador: emailOperador || '' });
    _emit(SystemEventTypes ? SystemEventTypes.COLABORADOR_ATUALIZADO : evento, {
      idColaborador: resultado.id, orgId: orgId, operador: emailOperador || ''
    });
    return resultado.id;
  }

  /**
   * Remove colaborador (soft: marca como desligado; hard: remove do JSON).
   * Por padrão usa soft delete para manter histórico.
   */
  function excluir(id, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var c = ColaboradorRepository.buscarPorId(orgId, id);
    if (!c) throw new Error('Colaborador não encontrado: ' + id);
    // Soft delete — mantém histórico
    _transitarColaborador(c, STATUS_COLABORADOR.DESLIGADO, emailOperador);
    _audit('COLABORADOR_DESLIGADO_SOFT', { id: id, operador: emailOperador || '' });
    return { ok: true, id: id };
  }

  /**
   * Muda status do colaborador via FSM.
   */
  function mudarStatus(id, novoStatus, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var c = ColaboradorRepository.buscarPorId(orgId, id);
    if (!c) throw new Error('Colaborador não encontrado: ' + id);
    _transitarColaborador(c, novoStatus, emailOperador);
    return { ok: true, id: id, status: novoStatus };
  }

  /**
   * Retorna métricas básicas da equipe.
   */
  function obterMetricas(orgId) {
    orgId = orgId || _orgId();
    var lista = ColaboradorRepository.listar(orgId);
    var porStatus = {};
    var porVinculo = {};
    var porSetor   = {};
    lista.forEach(function (c) {
      var s = c.status || 'ativo';
      porStatus[s]  = (porStatus[s]  || 0) + 1;
      var v = c.tipoVinculo || 'nao_informado';
      porVinculo[v] = (porVinculo[v] || 0) + 1;
      var st = c.setor || 'nao_informado';
      porSetor[st]  = (porSetor[st]  || 0) + 1;
    });
    return {
      total:     lista.length,
      ativos:    (porStatus['ativo']     || 0),
      afastados: (porStatus['afastado']  || 0),
      ferias:    (porStatus['ferias']    || 0),
      inativos:  (porStatus['inativo']   || 0),
      desligados:(porStatus['desligado'] || 0),
      porVinculo: porVinculo,
      porSetor:   porSetor,
      geradoEm:  new Date().toISOString()
    };
  }

  /**
   * Retorna lista de emails de colaboradores com determinada função.
   * Considera substituições vigentes.
   */
  function listarPorFuncao(funcao, orgId) {
    orgId = orgId || _orgId();
    var hoje  = new Date().toISOString().slice(0, 10);
    return ColaboradorRepository.listar(orgId, { status: 'ativo' })
      .filter(function (c) {
        var funcoes = c.funcoes || [];
        var subs    = c.substituicoes || [];
        var temFuncao = funcoes.some(function (f) {
          return (f.tipo === funcao || f === funcao) && f.ativo !== false;
        });
        var substituindo = subs.some(function (s) {
          return s.tipo === funcao &&
                 (!s.inicio || s.inicio <= hoje) &&
                 (!s.fim    || s.fim    >= hoje);
        });
        return temFuncao || substituindo;
      })
      .map(function (c) { return c.emailInstitucional || c.emailPessoal || c.id; });
  }

  // ──────────────────────────────────────────────────────────────────
  // FÉRIAS
  // ──────────────────────────────────────────────────────────────────

  function listarFerias(filtros, orgId) {
    orgId   = orgId || _orgId();
    filtros = Object.assign({ orgId: orgId }, filtros || {});
    return ColaboradorRepository.listarFerias(filtros);
  }

  function saldoFerias(idColaborador, orgId) {
    orgId = orgId || _orgId();
    var c = ColaboradorRepository.buscarPorId(orgId, idColaborador);
    if (!c) throw new Error('Colaborador não encontrado: ' + idColaborador);

    var admissao = c.dataAdmissao ? new Date(c.dataAdmissao) : null;
    if (!admissao) return { idColaborador: idColaborador, diasDireito: 0, diasGozados: 0, saldo: 0, aviso: 'Data de admissão não registrada.' };

    var hoje       = new Date();
    var mesesVinc  = Math.floor((hoje - admissao) / (1000 * 60 * 60 * 24 * 30));
    var diasDireito = Math.floor(mesesVinc / 12) * 30;

    var ferias = ColaboradorRepository.listarFerias({ orgId: orgId, idColaborador: idColaborador, status: 'concluido' });
    var diasGozados = ferias.reduce(function (acc, f) {
      if (!f.inicio || !f.fim) return acc;
      var dias = Math.round((new Date(f.fim) - new Date(f.inicio)) / (1000 * 60 * 60 * 24));
      return acc + Math.max(0, dias);
    }, 0);

    return {
      idColaborador: idColaborador,
      diasDireito:   diasDireito,
      diasGozados:   diasGozados,
      saldo:         diasDireito - diasGozados,
      geradoEm:      hoje.toISOString()
    };
  }

  function solicitarFerias(dados, emailSolicitante, orgId) {
    orgId = orgId || _orgId();
    dados = dados || {};
    if (!dados.idColaborador) throw new Error('idColaborador é obrigatório.');
    dados.inicio = dados.inicio || dados.dataInicio || null;
    dados.fim    = dados.fim    || dados.dataFim    || null;
    if (!dados.inicio || !dados.fim) throw new Error('Datas de início e fim são obrigatórias.');
    if (new Date(dados.fim) <= new Date(dados.inicio))
      throw new Error('Data de fim deve ser posterior à data de início.');

    var c = ColaboradorRepository.buscarPorId(orgId, dados.idColaborador);
    if (!c) throw new Error('Colaborador não encontrado: ' + dados.idColaborador);

    dados.orgId      = orgId;
    dados.solicitante = emailSolicitante || '';
    dados.status     = STATUS_FERIAS.PENDENTE;

    var r = ColaboradorRepository.salvarFerias(dados);
    _audit('FERIAS_SOLICITADA', {
      id: r.id, idColaborador: dados.idColaborador, solicitante: emailSolicitante || ''
    });
    return r.id;
  }

  function aprovarFerias(id, dadosAprovacao, emailOperador) {
    var ferias = ColaboradorRepository.buscarFeriasPorId(id);
    if (!ferias) throw new Error('Férias não encontradas: ' + id);
    _transitarFerias(ferias, STATUS_FERIAS.APROVADO, emailOperador, dadosAprovacao || {});

    // Muda status do colaborador para 'ferias' na data de início
    var hoje = new Date().toISOString().slice(0, 10);
    if (ferias.inicio && ferias.inicio <= hoje) {
      try {
        mudarStatus(ferias.idColaborador, STATUS_COLABORADOR.FERIAS, emailOperador, ferias.orgId);
      } catch (_) { /* já em férias ou status inválido; logar mas não bloquear */ }
    }
    return { ok: true, id: id };
  }

  function recusarFerias(id, motivo, emailOperador) {
    var ferias = ColaboradorRepository.buscarFeriasPorId(id);
    if (!ferias) throw new Error('Férias não encontradas: ' + id);
    _transitarFerias(ferias, STATUS_FERIAS.RECUSADO, emailOperador, { observacao: motivo });
    return { ok: true, id: id };
  }

  function solicitarAjusteFerias(id, observacao, emailOperador) {
    var ferias = ColaboradorRepository.buscarFeriasPorId(id);
    if (!ferias) throw new Error('Férias não encontradas: ' + id);
    _transitarFerias(ferias, STATUS_FERIAS.PENDENTE_AJUSTE, emailOperador, { observacao: observacao });
    return { ok: true, id: id };
  }

  function reenviarFerias(id, novasDatas, emailOperador) {
    var ferias = ColaboradorRepository.buscarFeriasPorId(id);
    if (!ferias) throw new Error('Férias não encontradas: ' + id);
    _transitarFerias(ferias, STATUS_FERIAS.PENDENTE, emailOperador, { novasDatas: novasDatas });
    return { ok: true, id: id };
  }

  function concluirFerias(id, dadosConclusao, emailOperador) {
    var ferias = ColaboradorRepository.buscarFeriasPorId(id);
    if (!ferias) throw new Error('Férias não encontradas: ' + id);
    _transitarFerias(ferias, STATUS_FERIAS.CONCLUIDO, emailOperador, dadosConclusao || {});

    // Retorna colaborador para 'ativo' ao concluir as férias
    try {
      mudarStatus(ferias.idColaborador, STATUS_COLABORADOR.ATIVO, emailOperador, ferias.orgId);
    } catch (_) {}
    return { ok: true, id: id };
  }

  function cancelarFerias(id, motivo, emailOperador) {
    var ferias = ColaboradorRepository.buscarFeriasPorId(id);
    if (!ferias) throw new Error('Férias não encontradas: ' + id);
    var statusAtual = ferias.status;
    _transitarFerias(ferias, STATUS_FERIAS.CANCELADO, emailOperador, { observacao: motivo });

    // Se estiver em status 'ferias', retornar para 'ativo'
    if (statusAtual === 'aprovado') {
      try {
        var c = ColaboradorRepository.buscarPorId(ferias.orgId, ferias.idColaborador);
        if (c && c.status === 'ferias') {
          mudarStatus(ferias.idColaborador, STATUS_COLABORADOR.ATIVO, emailOperador, ferias.orgId);
        }
      } catch (_) {}
    }
    return { ok: true, id: id };
  }

  // ──────────────────────────────────────────────────────────────────
  // ESCALAS
  // ──────────────────────────────────────────────────────────────────

  function listarEscalas(filtros, orgId) {
    orgId   = orgId || _orgId();
    filtros = Object.assign({ orgId: orgId }, filtros || {});
    return ColaboradorRepository.listarEscalas(filtros);
  }

  function salvarEscala(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    dados = dados || {};
    if (!dados.idColaborador && !dados.setor)
      throw new Error('idColaborador ou setor é obrigatório para criar escala.');
    dados.orgId = orgId;
    var r = ColaboradorRepository.salvarEscala(dados);
    _audit(r.isNovo ? 'ESCALA_CRIADA' : 'ESCALA_ATUALIZADA', {
      id: r.id, idColaborador: dados.idColaborador || '', operador: emailOperador || ''
    });
    return r.id;
  }

  function excluirEscala(id, emailOperador) {
    ColaboradorRepository.excluirEscala(id);
    _audit('ESCALA_EXCLUIDA', { id: id, operador: emailOperador || '' });
    return { ok: true };
  }

  // ──────────────────────────────────────────────────────────────────
  // AVALIAÇÕES
  // ──────────────────────────────────────────────────────────────────

  function listarAvaliacoes(filtros, orgId) {
    orgId   = orgId || _orgId();
    filtros = Object.assign({ orgId: orgId }, filtros || {});
    return ColaboradorRepository.listarAvaliacoes(filtros);
  }

  function salvarAvaliacao(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    dados = dados || {};
    if (!dados.idColaborador) throw new Error('idColaborador é obrigatório.');
    if (!dados.avaliador) dados.avaliador = emailOperador || '';
    dados.orgId = orgId;
    var r = ColaboradorRepository.salvarAvaliacao(dados);
    _audit(r.isNovo ? 'AVALIACAO_CRIADA' : 'AVALIACAO_ATUALIZADA', {
      id: r.id, idColaborador: dados.idColaborador, avaliador: dados.avaliador
    });
    return r.id;
  }

  function excluirAvaliacao(id, emailOperador) {
    ColaboradorRepository.excluirAvaliacao(id);
    _audit('AVALIACAO_EXCLUIDA', { id: id, operador: emailOperador || '' });
    return { ok: true };
  }

  // ──────────────────────────────────────────────────────────────────
  // HISTÓRICO RH
  // ──────────────────────────────────────────────────────────────────

  function listarHistorico(filtros, orgId) {
    orgId   = orgId || _orgId();
    filtros = Object.assign({ orgId: orgId }, filtros || {});
    // Filtrar eventos sensíveis para papel colaborador
    return ColaboradorRepository.listarHistorico(filtros);
  }

  function listarHistoricoFiltrado(idColaborador, papel, orgId) {
    orgId = orgId || _orgId();
    var lista = ColaboradorRepository.listarHistorico({ orgId: orgId, idColaborador: idColaborador });
    var eventosSensiveis = ['desligamento', 'alteracaoSalarial', 'advertencia', 'suspensao'];
    if (papel === 'colaborador') {
      return lista.filter(function (h) {
        return eventosSensiveis.indexOf(h.tipo) === -1;
      });
    }
    if (papel === 'gestor') {
      return lista.filter(function (h) { return h.tipo !== 'alteracaoSalarial'; });
    }
    return lista;
  }

  function registrarEvento(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    dados = dados || {};
    if (!dados.tipo || !dados.idColaborador)
      throw new Error('tipo e idColaborador são obrigatórios.');
    if (dados.tipo === 'desligamento')
      throw new Error('Use registrarDesligamento() para registrar desligamentos oficiais.');
    dados.orgId        = orgId;
    dados.registradoPor = emailOperador || '';
    var r = ColaboradorRepository.salvarHistorico(dados);
    _audit('HISTORICO_EVENTO_REGISTRADO', {
      id: r.id, tipo: dados.tipo, idColaborador: dados.idColaborador, operador: emailOperador || ''
    });
    return r.id;
  }

  function excluirEvento(id, emailOperador) {
    ColaboradorRepository.excluirHistorico(id);
    _audit('HISTORICO_EVENTO_EXCLUIDO', { id: id, operador: emailOperador || '' });
    return { ok: true };
  }

  /**
   * Registra desligamento oficial: cria evento + muda status + emite evento.
   */
  function registrarDesligamento(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    dados = dados || {};
    if (!dados.idColaborador) throw new Error('idColaborador é obrigatório.');

    var c = ColaboradorRepository.buscarPorId(orgId, dados.idColaborador);
    if (!c) throw new Error('Colaborador não encontrado: ' + dados.idColaborador);

    // 1. Registrar evento no histórico
    var eventoId = ColaboradorRepository.salvarHistorico({
      tipo:           'desligamento',
      idColaborador:  dados.idColaborador,
      orgId:          orgId,
      motivo:         dados.motivo           || '',
      tipoRescisao:   dados.tipoRescisao     || '',
      dataDesligamento: dados.dataDesligamento || new Date().toISOString().slice(0, 10),
      registradoPor:  emailOperador          || '',
      observacao:     dados.observacao       || ''
    }).id;

    // 2. Mudar status do colaborador
    _transitarColaborador(c, STATUS_COLABORADOR.DESLIGADO, emailOperador);

    _audit('COLABORADOR_DESLIGADO_OFICIAL', {
      id: dados.idColaborador, eventoId: eventoId, operador: emailOperador || ''
    });
    _emit(SystemEventTypes ? SystemEventTypes.COLABORADOR_DESLIGADO : 'COLABORADOR_DESLIGADO', {
      idColaborador: dados.idColaborador, orgId: orgId, operador: emailOperador || ''
    });

    return { ok: true, idColaborador: dados.idColaborador, eventoId: eventoId };
  }

  // ──────────────────────────────────────────────────────────────────
  // AFASTAMENTOS
  // ──────────────────────────────────────────────────────────────────

  function _transitarAfastamento(afastamento, novoStatus, emailOperador, dados) {
    var atual = afastamento.status || 'rascunho';
    if (typeof FsmGuardian !== 'undefined') {
      FsmGuardian.validarTransicao('afastamento_status', atual, novoStatus);
    }
    dados = dados || {};
    afastamento.status = novoStatus;
    afastamento[novoStatus + 'Em']  = new Date().toISOString();
    afastamento[novoStatus + 'Por'] = emailOperador || '';
    if (dados.observacao) afastamento.observacao = dados.observacao;
    if (dados.dataFim)    afastamento.dataFim    = dados.dataFim;
    ColaboradorRepository.salvarAfastamento(afastamento);
    _audit('AFASTAMENTO_' + novoStatus.toUpperCase(), {
      id: afastamento.id, idColaborador: afastamento.idColaborador,
      de: atual, para: novoStatus, operador: emailOperador
    });
    return afastamento;
  }

  function listarAfastamentos(filtros, orgId) {
    orgId   = orgId || _orgId();
    filtros = Object.assign({ orgId: orgId }, filtros || {});
    return ColaboradorRepository.listarAfastamentos(filtros);
  }

  function registrarAfastamento(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    dados = dados || {};
    if (!dados.idColaborador) throw new Error('idColaborador é obrigatório.');
    if (!dados.tipo)          throw new Error('tipo de afastamento é obrigatório.');
    if (!dados.dataInicio)    throw new Error('dataInicio é obrigatório.');

    var c = ColaboradorRepository.buscarPorId(orgId, dados.idColaborador);
    if (!c) throw new Error('Colaborador não encontrado: ' + dados.idColaborador);

    dados.orgId      = orgId;
    dados.registradoPor = emailOperador || '';
    dados.status     = STATUS_AFASTAMENTO.RASCUNHO;

    var r = ColaboradorRepository.salvarAfastamento(dados);
    _audit('AFASTAMENTO_REGISTRADO', {
      id: r.id, idColaborador: dados.idColaborador,
      tipo: dados.tipo, operador: emailOperador || ''
    });
    return r.id;
  }

  function ativarAfastamento(id, emailOperador, orgId) {
    var af = ColaboradorRepository.buscarAfastamentoPorId(id);
    if (!af) throw new Error('Afastamento não encontrado: ' + id);
    _transitarAfastamento(af, STATUS_AFASTAMENTO.ATIVO, emailOperador, {});

    // Impacto na escala: muda status do colaborador
    try {
      mudarStatus(af.idColaborador, STATUS_COLABORADOR.AFASTADO, emailOperador, af.orgId);
    } catch (e) {
      Logger.warn('pessoas_engine', 'ativarAfastamento', 'Falha ao mudar status colaborador: ' + e.message);
    }
    return { ok: true, id: id };
  }

  function encerrarAfastamento(id, dadosConclusao, emailOperador, orgId) {
    var af = ColaboradorRepository.buscarAfastamentoPorId(id);
    if (!af) throw new Error('Afastamento não encontrado: ' + id);
    // Snapshot antes de encerrar (padrão Skill.md)
    _audit('AFASTAMENTO_SNAPSHOT_ENCERRAR', {
      snapshot: JSON.parse(JSON.stringify(af)), operador: emailOperador || ''
    });
    _transitarAfastamento(af, STATUS_AFASTAMENTO.ENCERRADO, emailOperador, dadosConclusao || {});

    // Retornar colaborador a ativo se estava afastado
    try {
      var c = ColaboradorRepository.buscarPorId(af.orgId, af.idColaborador);
      if (c && c.status === 'afastado') {
        mudarStatus(af.idColaborador, STATUS_COLABORADOR.ATIVO, emailOperador, af.orgId);
      }
    } catch (e) {
      Logger.warn('pessoas_engine', 'encerrarAfastamento', 'Falha ao reativar colaborador: ' + e.message);
    }
    return { ok: true, id: id };
  }

  function cancelarAfastamento(id, motivo, emailOperador) {
    var af = ColaboradorRepository.buscarAfastamentoPorId(id);
    if (!af) throw new Error('Afastamento não encontrado: ' + id);
    var statusAnterior = af.status;
    _transitarAfastamento(af, STATUS_AFASTAMENTO.CANCELADO, emailOperador, { observacao: motivo });

    // Se estava ativo, reativar colaborador
    if (statusAnterior === 'ativo') {
      try {
        var c = ColaboradorRepository.buscarPorId(af.orgId, af.idColaborador);
        if (c && c.status === 'afastado') {
          mudarStatus(af.idColaborador, STATUS_COLABORADOR.ATIVO, emailOperador, af.orgId);
        }
      } catch (e) {
        Logger.warn('pessoas_engine', 'cancelarAfastamento', 'Falha ao reativar colaborador: ' + e.message);
      }
    }
    return { ok: true, id: id };
  }

  function registrarDayoffAniversario(idColaborador, emailSolicitante, orgId) {
    orgId = orgId || _orgId();
    var c = ColaboradorRepository.buscarPorId(orgId, idColaborador);
    if (!c) throw new Error('Colaborador não encontrado.');
    if (!c.dataNascimento) throw new Error('Data de nascimento não cadastrada para este colaborador.');

    var hoje = new Date();
    var hojeStr = hoje.toISOString().substring(0, 10);

    // Verificar janela de 7 dias em torno do aniversário
    var partes = String(c.dataNascimento).slice(0, 10).split('-');
    var nascHojeAno = new Date(hoje.getFullYear(), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
    if (nascHojeAno - hoje < -86400000) {
      nascHojeAno = new Date(hoje.getFullYear() + 1, parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
    }
    if (nascHojeAno - hoje > 7 * 86400000) {
      throw new Error('O day-off de aniversário só pode ser solicitado na semana do aniversário.');
    }

    // Verificar se já solicitou este ano
    var anoAtual = String(hoje.getFullYear());
    var jaUsou = (ColaboradorRepository.listarAfastamentos({ orgId: orgId, idColaborador: idColaborador }) || [])
      .some(function(a) {
        return a.tipo === 'dayoff_aniversario'
          && a.status !== 'cancelado'
          && String(a.dataInicio || '').slice(0, 4) === anoAtual;
      });
    if (jaUsou) throw new Error('Day-off de aniversário já utilizado em ' + anoAtual + '.');

    // Benefício pré-aprovado: criado diretamente como ativo, sem alterar status do colaborador
    var dados = {
      idColaborador: idColaborador,
      orgId:         orgId,
      tipo:          'dayoff_aniversario',
      dataInicio:    hojeStr,
      dataFim:       hojeStr,
      descricao:     'Day-off de aniversário — solicitado pelo colaborador.',
      status:        STATUS_AFASTAMENTO.ATIVO,
      registradoPor: emailSolicitante || ''
    };
    var r = ColaboradorRepository.salvarAfastamento(dados);
    _audit('DAYOFF_ANIVERSARIO_REGISTRADO', {
      id: r.id, idColaborador: idColaborador,
      data: hojeStr, operador: emailSolicitante || ''
    });
    return r.id;
  }

  // ──────────────────────────────────────────────────────────────────
  // OCORRÊNCIAS
  // (Advertências, elogios, registros disciplinares — sem FSM)
  // ──────────────────────────────────────────────────────────────────

  function listarOcorrencias(filtros, orgId) {
    orgId   = orgId || _orgId();
    filtros = Object.assign({ orgId: orgId }, filtros || {});
    return ColaboradorRepository.listarOcorrencias(filtros);
  }

  function registrarOcorrencia(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    dados = dados || {};
    if (!dados.idColaborador) throw new Error('idColaborador é obrigatório.');
    if (!dados.tipo)          throw new Error('tipo de ocorrência é obrigatório.');
    if (!dados.descricao)     throw new Error('descricao é obrigatória.');

    var tiposPermitidos = ['advertencia', 'suspensao', 'elogio', 'observacao', 'outro'];
    if (tiposPermitidos.indexOf(dados.tipo) === -1)
      throw new Error('Tipo inválido. Use: ' + tiposPermitidos.join(', '));

    dados.orgId         = orgId;
    dados.registradoPor = emailOperador || '';

    var r = ColaboradorRepository.salvarOcorrencia(dados);
    _audit('OCORRENCIA_' + String(dados.tipo).toUpperCase(), {
      id: r.id, idColaborador: dados.idColaborador, tipo: dados.tipo, operador: emailOperador || ''
    });

    // Registrar advertência/suspensão também no histórico RH
    if (dados.tipo === 'advertencia' || dados.tipo === 'suspensao') {
      try {
        ColaboradorRepository.salvarHistorico({
          tipo:          dados.tipo,
          idColaborador: dados.idColaborador,
          orgId:         orgId,
          descricao:     dados.descricao,
          registradoPor: emailOperador || '',
          idOcorrencia:  r.id
        });
      } catch (_) {}
    }
    return r.id;
  }

  function excluirOcorrencia(id, emailOperador) {
    var oc = ColaboradorRepository.listarOcorrencias({}).filter(function(o) { return o.id === id; })[0];
    ColaboradorRepository.excluirOcorrencia(id);
    _audit('OCORRENCIA_EXCLUIDA', {
      id: id, tipo: oc ? oc.tipo : '?', operador: emailOperador || ''
    });
    return { ok: true };
  }

  // ──────────────────────────────────────────────────────────────────
  // MIGRAÇÃO
  // ──────────────────────────────────────────────────────────────────

  function migrarFuncionariosParaColaboradores(orgId) {
    return ColaboradorRepository.migrarFuncionariosParaColaboradores(orgId || _orgId());
  }

  // ──────────────────────────────────────────────────────────────────
  // API PÚBLICA
  // ──────────────────────────────────────────────────────────────────

  return {
    // Constantes expostas
    STATUS_COLABORADOR: STATUS_COLABORADOR,
    TIPO_VINCULO:       TIPO_VINCULO,
    STATUS_FERIAS:      STATUS_FERIAS,

    // Colaboradores
    listar:             listar,
    buscarPorEmail:     buscarPorEmail,
    buscarPorId:        buscarPorId,
    salvar:             salvar,
    excluir:            excluir,
    mudarStatus:        mudarStatus,
    obterMetricas:      obterMetricas,
    listarPorFuncao:    listarPorFuncao,

    // Férias
    listarFerias:          listarFerias,
    saldoFerias:           saldoFerias,
    solicitarFerias:       solicitarFerias,
    aprovarFerias:         aprovarFerias,
    recusarFerias:         recusarFerias,
    solicitarAjusteFerias: solicitarAjusteFerias,
    reenviarFerias:        reenviarFerias,
    concluirFerias:        concluirFerias,
    cancelarFerias:        cancelarFerias,

    // Escalas
    listarEscalas:      listarEscalas,
    salvarEscala:       salvarEscala,
    excluirEscala:      excluirEscala,

    // Avaliações
    listarAvaliacoes:   listarAvaliacoes,
    salvarAvaliacao:    salvarAvaliacao,
    excluirAvaliacao:   excluirAvaliacao,

    // Histórico RH
    listarHistorico:           listarHistorico,
    listarHistoricoFiltrado:   listarHistoricoFiltrado,
    registrarEvento:           registrarEvento,
    excluirEvento:             excluirEvento,
    registrarDesligamento:     registrarDesligamento,

    // Afastamentos
    STATUS_AFASTAMENTO:          STATUS_AFASTAMENTO,
    TIPO_AFASTAMENTO:            TIPO_AFASTAMENTO,
    listarAfastamentos:          listarAfastamentos,
    registrarAfastamento:        registrarAfastamento,
    registrarDayoffAniversario:  registrarDayoffAniversario,
    ativarAfastamento:           ativarAfastamento,
    encerrarAfastamento:         encerrarAfastamento,
    cancelarAfastamento:         cancelarAfastamento,

    // Ocorrências
    listarOcorrencias:      listarOcorrencias,
    registrarOcorrencia:    registrarOcorrencia,
    excluirOcorrencia:      excluirOcorrencia,

    // Migração
    migrarFuncionariosParaColaboradores: migrarFuncionariosParaColaboradores
  };

})();
