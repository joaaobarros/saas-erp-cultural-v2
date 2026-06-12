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

// ── Guard global: bloqueia emails para o colaborador sendo desligado nesta execução ──
var EMAILS_BLOQUEADOS_DESLIGAMENTO_ATIVO = [];

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
      FsmGuardian.assertValida('colaborador_status', atual, novoStatus);
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
      FsmGuardian.assertValida('ferias_status', atual, novoStatus);
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
    filtros = filtros || {};
    // Excluir desligados por padrão; exceto quando status explícito OU incluirDesligado:true
    var filtrosRepo = Object.assign({}, filtros);
    if (!filtrosRepo.status && !filtrosRepo.incluirDesligado) filtrosRepo.excluirDesligado = true;
    delete filtrosRepo.incluirDesligado;
    return ColaboradorRepository.listar(orgId || _orgId(), filtrosRepo);
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
    var lista = ColaboradorRepository.listarFerias(filtros);
    // Enrich with collaborator name (avoid showing raw ID in UI)
    var _cache = {};
    lista.forEach(function(f) {
      if (f.nomeColaborador || !f.idColaborador) return;
      try {
        if (!_cache[f.idColaborador]) {
          var c = ColaboradorRepository.buscarPorId(orgId, f.idColaborador);
          _cache[f.idColaborador] = c ? (c.nomeApelido || c.nome || f.idColaborador) : f.idColaborador;
        }
        f.nomeColaborador = _cache[f.idColaborador];
      } catch (_) {}
    });
    return lista;
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

    // Garantir que totalDias esteja sempre preenchido para cálculo de saldo no acordo
    if (!dados.totalDias) {
      dados.totalDias = Math.round((new Date(dados.fim) - new Date(dados.inicio)) / 86400000) + 1;
    }
    // Normalizar aliases de campo
    dados.dataInicio = dados.dataInicio || dados.inicio;
    dados.dataFim    = dados.dataFim    || dados.fim;

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
    var eventosSensiveis = ['desligamento', 'alteracaoSalarial', 'reajuste', 'advertencia', 'suspensao'];
    // Valores salariais nunca saem para papéis não-RH (ex.: promoção carrega salário)
    var _semSalario = function (h) {
      var c = Object.assign({}, h);
      delete c.salarioAnterior;
      delete c.novoSalario;
      return c;
    };
    if (papel === 'colaborador') {
      return lista.filter(function (h) {
        return eventosSensiveis.indexOf(h.tipo) === -1;
      }).map(_semSalario);
    }
    if (papel === 'gestor') {
      return lista.filter(function (h) {
        return h.tipo !== 'alteracaoSalarial' && h.tipo !== 'reajuste';
      }).map(_semSalario);
    }
    return lista;
  }

  /**
   * Aplica na ficha do colaborador os efeitos estruturados do evento
   * (promoção, reajuste, mudança de cargo, alteração de carga, admissão),
   * gravando em `dados` os valores anteriores para o histórico.
   */
  function _aplicarEfeitosEvento(dados, emailOperador, orgId) {
    var tipo = dados.tipo;
    var alteraSalario  = (tipo === 'promocao' || tipo === 'reajuste') &&
                         dados.novoSalario !== undefined && dados.novoSalario !== null && dados.novoSalario !== '';
    var alteraCargo    = (tipo === 'promocao' || tipo === 'mudanca_cargo') && dados.novoCargo;
    var alteraCarga    = tipo === 'alteracao_carga' && dados.novaCargaHoraria;
    var alteraAdmissao = tipo === 'admissao' && dados.dataAdmissao;

    if (tipo === 'promocao' && !alteraSalario && !alteraCargo)
      throw new Error('Promoção exige novo cargo e/ou novo salário.');
    if (tipo === 'reajuste' && !alteraSalario)
      throw new Error('Reajuste salarial exige o novo salário.');
    if (tipo === 'mudanca_cargo' && !alteraCargo)
      throw new Error('Mudança de cargo exige o novo cargo.');
    if (tipo === 'alteracao_carga' && !alteraCarga)
      throw new Error('Alteração de carga horária exige a nova carga.');

    if (!alteraSalario && !alteraCargo && !alteraCarga && !alteraAdmissao) return false;

    var c = ColaboradorRepository.buscarPorId(orgId, dados.idColaborador);
    if (!c) throw new Error('Colaborador não encontrado: ' + dados.idColaborador);

    if (alteraSalario) {
      dados.novoSalario     = Number(dados.novoSalario);
      if (!(dados.novoSalario > 0)) throw new Error('Novo salário inválido.');
      dados.salarioAnterior = Number(c.salarioBruto || c.salario || 0);
      c.salarioBruto        = dados.novoSalario;
    }
    if (alteraCargo) {
      dados.cargoAnterior = c.cargo || '';
      c.cargo             = dados.novoCargo;
    }
    if (alteraCarga) {
      dados.novaCargaHoraria = Number(dados.novaCargaHoraria);
      if (!(dados.novaCargaHoraria > 0)) throw new Error('Nova carga horária inválida.');
      dados.cargaAnterior    = Number(c.horasSemanais || 40);
      c.horasSemanais        = dados.novaCargaHoraria;
    }
    if (alteraAdmissao) {
      dados.dataAdmissaoAnterior = c.dataAdmissao || '';
      c.dataAdmissao             = dados.dataAdmissao;
    }

    ColaboradorRepository.salvar(orgId, c);
    _audit('FICHA_ATUALIZADA_POR_EVENTO_RH', {
      idColaborador: c.id, tipo: tipo, operador: emailOperador || '',
      cargoAnterior: dados.cargoAnterior, novoCargo: dados.novoCargo,
      cargaAnterior: dados.cargaAnterior, novaCargaHoraria: dados.novaCargaHoraria
    });
    return true;
  }

  function registrarEvento(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    dados = dados || {};
    // Frontend envia tipoEvento; o canônico no histórico é tipo
    if (!dados.tipo && dados.tipoEvento) dados.tipo = dados.tipoEvento;
    if (!dados.tipo || !dados.idColaborador)
      throw new Error('tipo e idColaborador são obrigatórios.');
    if (dados.tipo === 'desligamento')
      throw new Error('Use registrarDesligamento() para registrar desligamentos oficiais.');

    // Advertência: sequência disciplinar (verbal → 1ª/2ª/3ª escrita) + gravidade
    if (dados.tipo === 'advertencia') {
      var _NIVEIS_ADV = ['verbal', 'escrita_1', 'escrita_2', 'escrita_3'];
      var _GRAVIDADES = ['leve', 'moderada', 'grave', 'gravissima'];
      if (_NIVEIS_ADV.indexOf(dados.nivelAdvertencia) === -1)
        throw new Error('Nível da advertência inválido. Use: ' + _NIVEIS_ADV.join(', '));
      if (_GRAVIDADES.indexOf(dados.gravidade) === -1)
        throw new Error('Gravidade inválida. Use: ' + _GRAVIDADES.join(', '));
      if (!dados.descricao)
        throw new Error('Justificativa é obrigatória para advertências.');
    }

    // semEfeitos: a ficha já foi atualizada pelo chamador (ex.: salvarColab),
    // o evento apenas registra os valores anterior/novo recebidos.
    var fichaAtualizada = false;
    if (dados.semEfeitos) {
      delete dados.semEfeitos;
    } else {
      fichaAtualizada = _aplicarEfeitosEvento(dados, emailOperador, orgId);
    }

    dados.orgId        = orgId;
    dados.registradoPor = emailOperador || '';
    var r = ColaboradorRepository.salvarHistorico(dados);
    _audit('HISTORICO_EVENTO_REGISTRADO', {
      id: r.id, tipo: dados.tipo, idColaborador: dados.idColaborador,
      nivelAdvertencia: dados.nivelAdvertencia, gravidade: dados.gravidade,
      fichaAtualizada: !!fichaAtualizada, operador: emailOperador || ''
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

    // Bloquear proativamente qualquer email para a pessoa sendo desligada
    // durante esta execução — impede notificações prematuras antes da transição de status.
    if (!Array.isArray(EMAILS_BLOQUEADOS_DESLIGAMENTO_ATIVO)) EMAILS_BLOQUEADOS_DESLIGAMENTO_ATIVO = [];
    if (c.emailInstitucional) EMAILS_BLOQUEADOS_DESLIGAMENTO_ATIVO.push(String(c.emailInstitucional).toLowerCase().trim());
    if (c.emailPessoal)       EMAILS_BLOQUEADOS_DESLIGAMENTO_ATIVO.push(String(c.emailPessoal).toLowerCase().trim());

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
  // PERÍODOS AQUISITIVOS / ACORDO DE FÉRIAS
  // ──────────────────────────────────────────────────────────────────

  /**
   * Calcula os períodos aquisitivos e concessivos a partir da data de admissão.
   * Cada período: 12 meses de aquisição + 12 meses de concessão.
   * status: em_aquisicao | em_concessao | vencido
   */
  function calcularPeriodosAquisitivos(dataAdmissao) {
    if (!dataAdmissao) return [];
    // Parse timezone-safely: ISO string → local Date (avoid UTC midnight shift)
    var parts = String(dataAdmissao).slice(0, 10).split('-');
    if (parts.length < 3) return [];
    var adm = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    if (isNaN(adm.getTime())) return [];
    // Today in local timezone
    var _now = new Date();
    var _pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    var hoje = _now.getFullYear() + '-' + _pad(_now.getMonth() + 1) + '-' + _pad(_now.getDate());
    var _fmtLocal = function(d) {
      return d.getFullYear() + '-' + _pad(d.getMonth() + 1) + '-' + _pad(d.getDate());
    };
    var periodos = [];
    for (var n = 0; n <= 30; n++) {
      var aqIniD = new Date(adm.getFullYear() + n, adm.getMonth(), adm.getDate());
      var aqIni  = _fmtLocal(aqIniD);
      // Se o período aquisitivo ainda não começou, parar
      if (aqIni > hoje) break;
      var aqFimD = new Date(adm.getFullYear() + n + 1, adm.getMonth(), adm.getDate());
      aqFimD.setDate(aqFimD.getDate() - 1);
      var aqFim    = _fmtLocal(aqFimD);
      var concIniD = new Date(adm.getFullYear() + n + 1, adm.getMonth(), adm.getDate());
      var concIni  = _fmtLocal(concIniD);
      var concFimD = new Date(adm.getFullYear() + n + 2, adm.getMonth(), adm.getDate());
      concFimD.setDate(concFimD.getDate() - 1);
      var concFim  = _fmtLocal(concFimD);
      var status;
      if (hoje <= aqFim)        status = 'em_aquisicao';
      else if (hoje <= concFim) status = 'em_concessao';
      else                      status = 'vencido';
      periodos.push({
        numero: n + 1,
        aquisitivoInicio: aqIni,
        aquisitivoFim: aqFim,
        concessivoInicio: concIni,
        concessivoFim: concFim,
        diasDireito: 30,
        status: status,
        diasGozados: 0,
        saldo: 30,
        ferias: []
      });
    }
    return periodos;
  }

  /**
   * Retorna resumo estruturado de férias por período aquisitivo do colaborador.
   * Vincula os registros de férias existentes a cada período.
   */
  function resumoFeriasPorPeriodo(idColaborador, orgId) {
    orgId = orgId || _orgId();
    var c = ColaboradorRepository.buscarPorId(orgId, idColaborador);
    if (!c) throw new Error('Colaborador não encontrado: ' + idColaborador);
    if (!c.dataAdmissao) return { idColaborador: idColaborador, nome: '', dataAdmissao: null, periodos: [], aviso: 'Data de admissão não registrada.' };
    var periodos = calcularPeriodosAquisitivos(c.dataAdmissao);
    var todas = ColaboradorRepository.listarFerias({ orgId: orgId, idColaborador: idColaborador });
    periodos.forEach(function (p) {
      var do_periodo = todas.filter(function (f) {
        if (f.periodoAquisitivoNum === p.numero) return true;
        var ref = f.dataInicio || f.inicio || '';
        return ref && ref >= p.aquisitivoInicio && ref <= p.concessivoFim;
      });
      var gozados = 0;
      do_periodo.forEach(function (f) {
        var statusF = String(f.status || '').toLowerCase().replace(/[^a-z]/g, '');
        var isConcluido = statusF === 'concluido';
        // Férias aprovadas com período encerrado (dataFim <= hoje) também contam como gozadas
        if (!isConcluido && statusF === 'aprovado') {
          var fimCheck = f.dataFim || f.fim || '';
          if (fimCheck && fimCheck <= hoje) isConcluido = true;
        }
        if (!isConcluido) return;
        if (f.acordo && f.acordo.diasEfetivosGozados) {
          gozados += Number(f.acordo.diasEfetivosGozados) || 0;
        } else {
          var ini = f.dataInicio || f.inicio;
          var fim = f.dataFim || f.fim;
          if (ini && fim) gozados += Math.round((new Date(fim) - new Date(ini)) / 86400000) + 1;
        }
      });
      p.diasGozados = gozados;
      p.saldo = Math.max(0, p.diasDireito - gozados);
      p.ferias = do_periodo.map(function (f) {
        return { id: f.id, inicio: f.dataInicio || f.inicio, fim: f.dataFim || f.fim, status: f.status, acordo: f.acordo || null };
      });
      if (p.status !== 'em_aquisicao' && gozados >= p.diasDireito) p.status = 'gozado';
    });
    return { idColaborador: idColaborador, nome: c.nome || c.apelido || '', dataAdmissao: c.dataAdmissao, periodos: periodos };
  }

  /**
   * Registra o acordo de férias: período realmente gozado + saldo remanescente.
   * Só pode ser chamado sobre férias com status 'aprovado'.
   * Transita para 'concluido' ao salvar o acordo.
   */
  function registrarAcordoFerias(id, dados, emailOperador) {
    if (!id) throw new Error('ID é obrigatório.');
    dados = dados || {};
    var ferias = ColaboradorRepository.buscarFeriasPorId(id);
    if (!ferias) throw new Error('Férias não encontradas: ' + id);
    if (ferias.status !== STATUS_FERIAS.APROVADO)
      throw new Error('Acordo só pode ser registrado em férias aprovadas.');
    if (!dados.periodoGozadoInicio || !dados.periodoGozadoFim)
      throw new Error('Período realmente gozado (início e fim) é obrigatório.');
    var gozados = parseInt(dados.diasEfetivosGozados) || 0;
    if (gozados < 1) throw new Error('Informe os dias efetivamente gozados (mínimo: 1).');
    var ini = ferias.dataInicio || ferias.inicio;
    var fim = ferias.dataFim || ferias.fim;
    var totalSolicitado = ferias.totalDias || (ini && fim ? Math.round((new Date(fim) - new Date(ini)) / 86400000) + 1 : gozados);
    var saldo = Math.max(0, totalSolicitado - gozados);
    ferias.acordo = {
      periodoGozadoInicio:  dados.periodoGozadoInicio,
      periodoGozadoFim:     dados.periodoGozadoFim,
      diasEfetivosGozados:  gozados,
      saldoAnterior:        totalSolicitado,
      saldoPosterior:       saldo,
      observacao:           dados.observacao || '',
      registradoEm:         new Date().toISOString(),
      registradoPor:        emailOperador || ''
    };
    _transitarFerias(ferias, STATUS_FERIAS.CONCLUIDO, emailOperador, {});
    try {
      var colab = ColaboradorRepository.buscarPorId(ferias.orgId, ferias.idColaborador);
      if (colab && colab.status === 'ferias')
        mudarStatus(ferias.idColaborador, STATUS_COLABORADOR.ATIVO, emailOperador, ferias.orgId);
    } catch (_) {}
    _audit('FERIAS_ACORDO_REGISTRADO', { id: ferias.id, idColaborador: ferias.idColaborador, diasGozados: gozados, saldo: saldo, operador: emailOperador });
    return { ok: true, id: id, saldo: saldo };
  }

  // ──────────────────────────────────────────────────────────────────
  // AFASTAMENTOS
  // ──────────────────────────────────────────────────────────────────

  function _transitarAfastamento(afastamento, novoStatus, emailOperador, dados) {
    var atual = afastamento.status || 'rascunho';
    if (typeof FsmGuardian !== 'undefined') {
      FsmGuardian.assertValida('afastamento_status', atual, novoStatus);
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
  // AUTO-RETORNO — chamado pelo AlertasEngine a cada ciclo
  // ──────────────────────────────────────────────────────────────────

  /**
   * Reverte para 'ativo' colaboradores cujo período de férias terminou.
   * Usa o período realmente gozado (acordo.periodoGozadoFim) quando disponível;
   * caso contrário, usa a data de fim da solicitação aprovada.
   */
  function verificarAutoRetornoFerias(orgId) {
    orgId = orgId || _orgId();
    var hoje = new Date().toISOString().slice(0, 10);
    var revertidos = 0;
    var emFerias = ColaboradorRepository.listar(orgId, { status: 'ferias' });
    emFerias.forEach(function (c) {
      try {
        var feriasAprovadas = ColaboradorRepository.listarFerias({ orgId: orgId, idColaborador: c.id, status: 'aprovado' });
        var deveRetornar = !feriasAprovadas.length || feriasAprovadas.every(function (f) {
          // Se há acordo, usa a data real gozada; senão usa data fim da solicitação
          var fim = (f.acordo && f.acordo.periodoGozadoFim) || f.dataFim || f.fim || '';
          return fim && fim < hoje;
        });
        if (deveRetornar) {
          mudarStatus(c.id, STATUS_COLABORADOR.ATIVO, 'sistema', orgId);
          revertidos++;
        }
      } catch (e) {
        Logger.warn('pessoas_engine', 'verificarAutoRetornoFerias', c.id + ': ' + e.message);
      }
    });
    return revertidos;
  }

  /**
   * Encerra afastamentos com dataFim vencida e reverte colaborador para 'ativo'.
   * Também corrige status órfão (afastado sem afastamento ativo).
   */
  function verificarAutoRetornoAfastamento(orgId) {
    orgId = orgId || _orgId();
    var hoje = new Date().toISOString().slice(0, 10);
    var revertidos = 0;
    var afastados = ColaboradorRepository.listar(orgId, { status: 'afastado' });
    afastados.forEach(function (c) {
      try {
        var ativos = ColaboradorRepository.listarAfastamentos({ orgId: orgId, idColaborador: c.id, status: 'ativo' });
        // Encerrar automaticamente os que passaram da dataFim
        ativos.forEach(function (a) {
          if (a.dataFim && a.dataFim < hoje) {
            try { encerrarAfastamento(a.id, { observacao: 'Encerrado automaticamente pelo sistema.' }, 'sistema', orgId); } catch (_) {}
          }
        });
        // Se não há afastamento ativo (ou todos foram encerrados acima), corrigir status órfão
        var aindaAtivos = ativos.filter(function (a) { return !a.dataFim || a.dataFim >= hoje; });
        if (!aindaAtivos.length) {
          // encerrarAfastamento já reverte; só precisa mudar se o status ficou órfão
          var colab = ColaboradorRepository.buscarPorId(orgId, c.id);
          if (colab && colab.status === 'afastado') {
            mudarStatus(c.id, STATUS_COLABORADOR.ATIVO, 'sistema', orgId);
          }
          revertidos++;
        }
      } catch (e) {
        Logger.warn('pessoas_engine', 'verificarAutoRetornoAfastamento', c.id + ': ' + e.message);
      }
    });
    return revertidos;
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
    listarFerias:                  listarFerias,
    saldoFerias:                   saldoFerias,
    solicitarFerias:               solicitarFerias,
    aprovarFerias:                 aprovarFerias,
    recusarFerias:                 recusarFerias,
    solicitarAjusteFerias:         solicitarAjusteFerias,
    reenviarFerias:                reenviarFerias,
    concluirFerias:                concluirFerias,
    cancelarFerias:                cancelarFerias,
    calcularPeriodosAquisitivos:   calcularPeriodosAquisitivos,
    resumoFeriasPorPeriodo:        resumoFeriasPorPeriodo,
    registrarAcordoFerias:         registrarAcordoFerias,

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
    migrarFuncionariosParaColaboradores: migrarFuncionariosParaColaboradores,

    // Auto-retorno
    verificarAutoRetornoFerias:      verificarAutoRetornoFerias,
    verificarAutoRetornoAfastamento: verificarAutoRetornoAfastamento
  };

})();
