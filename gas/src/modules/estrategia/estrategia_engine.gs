/**
 * @file modules/estrategia/estrategia_engine.gs
 * @layer modules/estrategia
 * @description Engine de Objetivos Estratégicos.
 *
 * FSM: rascunho → ativo → em_revisao → concluido
 *      Qualquer estado não-terminal → cancelado
 *
 * KPIs reais calculados a partir de dados vivos:
 *   - Taxa de ocupação de espaços (reservas confirmadas / capacidade)
 *   - Taxa de conclusão de ações no prazo
 *   - Custo por ação executada
 *   - Índice de satisfação (NPS médio das pesquisas de público)
 *   - Execução orçamentária (% executado por contrato)
 *   - Renovação de habilitados / novos agentes
 *
 * @depends estrategia_repository.gs, acao_repository.gs, reserva_repository.gs,
 *          contratos_engine.gs, publico_repository.gs, agentes_controller.gs,
 *          fsm_guardian.gs, auditoria_service.gs, events_constants.gs
 */

var EstrategiaEngine = (function () {

  var ESTADOS = Object.freeze({
    RASCUNHO:   'rascunho',
    ATIVO:      'ativo',
    EM_REVISAO: 'em_revisao',
    CONCLUIDO:  'concluido',
    CANCELADO:  'cancelado'
  });

  var HORIZONTES = Object.freeze({
    CURTO:  'curto_prazo',   // até 1 ano
    MEDIO:  'medio_prazo',   // até 3 anos
    LONGO:  'longo_prazo'    // até 5 anos
  });

  var _TRANSICOES = {
    rascunho:   ['ativo', 'cancelado'],
    ativo:      ['em_revisao', 'concluido', 'cancelado'],
    em_revisao: ['ativo', 'concluido', 'cancelado'],
    concluido:  [],
    cancelado:  []
  };

  try { FsmGuardian.registrar('estrategia', _TRANSICOES); } catch(e) {}

  // ─── Criar / Atualizar ────────────────────────────────────────────────────

  function salvar(dados, emailUsuario, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    _validar(dados);
    var agora = new Date().toISOString();

    if (dados.id) {
      var existente = EstrategiaRepository.buscarPorId(orgId, dados.id);
      if (!existente) throw new Error('Objetivo não encontrado: ' + dados.id);

      var atualizado = _merge(existente, dados);
      atualizado.atualizadoEm = agora;
      atualizado.versao = (existente.versao || 1) + 1;

      EstrategiaRepository.salvar(orgId, atualizado);
      _auditoria('ESTRATEGIA_ATUALIZADA', atualizado.id, emailUsuario, { titulo: atualizado.titulo });
      SystemEvents.emit(SystemEventTypes.STRATEGY_UPDATED, {
        entidade: 'estrategia', entidadeId: atualizado.id,
        usuario: emailUsuario, orgId: orgId, origem: 'estrategia_engine'
      });
      return { ok: true, id: atualizado.id };

    } else {
      var id = 'est_' + new Date().getTime() + '_' + Math.random().toString(36).slice(2, 6);
      var novo = {
        id:               id,
        orgId:            orgId,
        titulo:           (dados.titulo || '').trim(),
        descricao:        (dados.descricao || '').trim(),
        horizonte:        dados.horizonte || HORIZONTES.CURTO,
        status:           ESTADOS.RASCUNHO,
        responsavel:      (dados.responsavel || emailUsuario || '').trim(),
        dataInicio:       dados.dataInicio || '',
        dataFim:          dados.dataFim || '',
        metaQuantitativa: dados.metaQuantitativa || '',
        indicadores:      dados.indicadores || [],
        acoesVinculadas:  [],
        observacoes:      (dados.observacoes || '').trim(),
        criadoEm:         agora,
        atualizadoEm:     agora,
        criadoPor:        emailUsuario || '',
        versao:           1
      };
      EstrategiaRepository.salvar(orgId, novo);
      _auditoria('ESTRATEGIA_CRIADA', id, emailUsuario, { titulo: novo.titulo });
      SystemEvents.emit(SystemEventTypes.STRATEGY_CREATED, {
        entidade: 'estrategia', entidadeId: id,
        usuario: emailUsuario, orgId: orgId, origem: 'estrategia_engine'
      });
      return { ok: true, id: id };
    }
  }

  function mudarStatus(params, emailUsuario, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var obj = EstrategiaRepository.buscarPorId(orgId, params.id);
    if (!obj) throw new Error('Objetivo não encontrado: ' + params.id);

    FsmGuardian.transitar('estrategia', obj.status, params.novoStatus, {
      id: obj.id, usuario: emailUsuario, motivo: params.motivo
    });

    obj.status       = params.novoStatus;
    obj.atualizadoEm = new Date().toISOString();
    obj.versao       = (obj.versao || 1) + 1;
    if (params.motivo) obj.ultimoMotivo = params.motivo;

    EstrategiaRepository.salvar(orgId, obj);

    var tipoEvento = params.novoStatus === ESTADOS.CONCLUIDO
      ? SystemEventTypes.STRATEGY_COMPLETED
      : SystemEventTypes.STRATEGY_STATUS_CHANGED;

    _auditoria('ESTRATEGIA_STATUS_' + params.novoStatus.toUpperCase(), obj.id, emailUsuario, {
      de: obj.status, para: params.novoStatus, motivo: params.motivo
    });
    SystemEvents.emit(tipoEvento, {
      entidade: 'estrategia', entidadeId: obj.id,
      novoStatus: params.novoStatus, usuario: emailUsuario, orgId: orgId
    });
    return { ok: true };
  }

  function vincularAcao(objetivoId, acaoId, emailUsuario, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var obj = EstrategiaRepository.buscarPorId(orgId, objetivoId);
    if (!obj) throw new Error('Objetivo não encontrado: ' + objetivoId);
    var acao = AcaoRepository.buscarPorId(orgId, acaoId);
    if (!acao) throw new Error('Ação não encontrada: ' + acaoId);

    var vinculadas = obj.acoesVinculadas || [];
    var jaVinculada = vinculadas.some(function(a) { return a.id === acaoId; });
    if (jaVinculada) return { ok: true, aviso: 'Ação já vinculada.' };

    vinculadas.push({
      id:        acao.id,
      nome:      acao.nome,
      status:    acao.status,
      dataInicio: acao.dataInicio || '',
      dataFim:   acao.dataFim || ''
    });
    obj.acoesVinculadas = vinculadas;
    obj.atualizadoEm    = new Date().toISOString();
    EstrategiaRepository.salvar(orgId, obj);

    _auditoria('ESTRATEGIA_ACAO_VINCULADA', objetivoId, emailUsuario, { acaoId: acaoId });
    SystemEvents.emit(SystemEventTypes.STRATEGY_ACTION_LINKED, {
      entidade: 'estrategia', entidadeId: objetivoId, acaoId: acaoId, orgId: orgId
    });
    return { ok: true };
  }

  function desvincularAcao(objetivoId, acaoId, emailUsuario, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var obj = EstrategiaRepository.buscarPorId(orgId, objetivoId);
    if (!obj) throw new Error('Objetivo não encontrado: ' + objetivoId);

    obj.acoesVinculadas = (obj.acoesVinculadas || []).filter(function(a) {
      return a.id !== acaoId;
    });
    obj.atualizadoEm = new Date().toISOString();
    EstrategiaRepository.salvar(orgId, obj);

    _auditoria('ESTRATEGIA_ACAO_DESVINCULADA', objetivoId, emailUsuario, { acaoId: acaoId });
    SystemEvents.emit(SystemEventTypes.STRATEGY_ACTION_UNLINKED, {
      entidade: 'estrategia', entidadeId: objetivoId, acaoId: acaoId, orgId: orgId
    });
    return { ok: true };
  }

  function excluir(id, emailUsuario, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var obj = EstrategiaRepository.buscarPorId(orgId, id);
    if (!obj) throw new Error('Objetivo não encontrado: ' + id);
    if (obj.status === ESTADOS.ATIVO) throw new Error('Objetivo ativo não pode ser excluído. Cancele primeiro.');
    EstrategiaRepository.excluir(orgId, id);
    _auditoria('ESTRATEGIA_EXCLUIDA', id, emailUsuario, { titulo: obj.titulo });
    return { ok: true };
  }

  // ─── KPIs Reais ──────────────────────────────────────────────────────────

  /**
   * Calcula KPIs reais consolidados cruzando dados de todas as entidades.
   * Substitui os zeros de obterMetricasEficiencia.
   */
  function calcularKPIs(orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var kpis = {
      taxaOcupacaoEspacos:     _kpiOcupacaoEspacos(orgId),
      taxaConclusaoNoPrazo:    _kpiConclusaoAcoesNoPrazo(orgId),
      custoPorAcao:            _kpiCustoPorAcao(orgId),
      indiceSatisfacaoPublico: _kpiSatisfacaoPublico(orgId),
      execucaoOrcamentaria:    _kpiExecucaoOrcamentaria(orgId),
      renovacaoAgentes:        _kpiRenovacaoAgentes(orgId),
      calculadoEm:             new Date().toISOString()
    };
    return kpis;
  }

  function _kpiOcupacaoEspacos(orgId) {
    try {
      var reservas = ReservaRepository.listar(orgId, {});
      var confirmadas = reservas.filter(function(r) {
        return ['confirmado', 'em_uso', 'concluida'].indexOf(r.status) !== -1;
      });
      var total = reservas.length;
      return {
        percentual: total > 0 ? Math.round((confirmadas.length / total) * 100) : 0,
        confirmadas: confirmadas.length,
        total: total
      };
    } catch(e) {
      return { percentual: 0, confirmadas: 0, total: 0, erro: e.message };
    }
  }

  function _kpiConclusaoAcoesNoPrazo(orgId) {
    try {
      var acoes = AcaoRepository.listar(orgId, {});
      var concluidas = acoes.filter(function(a) { return a.status === 'concluida'; });
      var noPrazo = concluidas.filter(function(a) {
        if (!a.dataFim || !a.atualizadoEm) return true;
        return a.atualizadoEm.slice(0, 10) <= a.dataFim;
      });
      return {
        percentual: concluidas.length > 0
          ? Math.round((noPrazo.length / concluidas.length) * 100) : 0,
        concluidas: concluidas.length,
        noPrazo: noPrazo.length,
        total: acoes.length
      };
    } catch(e) {
      return { percentual: 0, concluidas: 0, noPrazo: 0, total: 0, erro: e.message };
    }
  }

  function _kpiCustoPorAcao(orgId) {
    try {
      var acoes = AcaoRepository.listar(orgId, {});
      var concluidas = acoes.filter(function(a) { return a.status === 'concluida'; });
      // Soma rubricas dos contratos ativos — soma do campo valorTotal
      var contratos = ContratosRepository ? ContratosRepository.listar(orgId, {}) : [];
      var totalGasto = contratos.reduce(function(acc, c) {
        return acc + (_parseNum(c.valorTotal) || 0);
      }, 0);
      return {
        totalGasto: totalGasto,
        acoesExecutadas: concluidas.length,
        custoPorAcao: concluidas.length > 0
          ? Math.round(totalGasto / concluidas.length) : 0
      };
    } catch(e) {
      return { totalGasto: 0, acoesExecutadas: 0, custoPorAcao: 0, erro: e.message };
    }
  }

  function _kpiSatisfacaoPublico(orgId) {
    try {
      var pesquisas = PublicoRepository.listarPesquisas(orgId);
      var comNps = pesquisas.filter(function(p) {
        return p.nps !== undefined && p.nps !== null && p.nps !== '';
      });
      if (comNps.length === 0) return { media: null, total: 0, respondidas: 0 };
      var soma = comNps.reduce(function(acc, p) { return acc + Number(p.nps); }, 0);
      return {
        media: Math.round(soma / comNps.length),
        total: pesquisas.length,
        respondidas: comNps.length
      };
    } catch(e) {
      return { media: null, total: 0, respondidas: 0, erro: e.message };
    }
  }

  function _kpiExecucaoOrcamentaria(orgId) {
    try {
      var contratos = ContratosRepository ? ContratosRepository.listar(orgId, {}) : [];
      var totalPrevisto  = 0;
      var totalExecutado = 0;
      contratos.forEach(function(c) {
        totalPrevisto  += _parseNum(c.valorTotal)    || 0;
        totalExecutado += _parseNum(c.valorPago)     || 0;
      });
      return {
        percentual: totalPrevisto > 0
          ? Math.round((totalExecutado / totalPrevisto) * 100) : 0,
        totalPrevisto: totalPrevisto,
        totalExecutado: totalExecutado,
        contratos: contratos.length
      };
    } catch(e) {
      return { percentual: 0, totalPrevisto: 0, totalExecutado: 0, erro: e.message };
    }
  }

  function _kpiRenovacaoAgentes(orgId) {
    try {
      var agentes = AgenteCulturalRepository.listar(orgId, {});
      var hoje = new Date();
      var anoAtras = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate()).toISOString().slice(0, 10);
      var novos = agentes.filter(function(a) {
        return a.criadoEm && a.criadoEm.slice(0, 10) >= anoAtras;
      });
      var ativos = agentes.filter(function(a) { return a.status === 'ativo'; });
      return {
        total: agentes.length,
        ativos: ativos.length,
        novosUltimoAno: novos.length,
        taxaNovos: agentes.length > 0
          ? Math.round((novos.length / agentes.length) * 100) : 0
      };
    } catch(e) {
      return { total: 0, ativos: 0, novosUltimoAno: 0, taxaNovos: 0, erro: e.message };
    }
  }

  // ─── Painel de Riscos ────────────────────────────────────────────────────

  function calcularRiscos(orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var riscos = [];

    // 1. Ações atrasadas (dataFim no passado, status ainda ativo)
    try {
      var hoje = new Date().toISOString().slice(0, 10);
      var acoes = AcaoRepository.listar(orgId, {});
      var atrasadas = acoes.filter(function(a) {
        return a.dataFim && a.dataFim < hoje &&
          ['planejada', 'em_producao', 'em_execucao'].indexOf(a.status) !== -1;
      });
      if (atrasadas.length > 0) {
        riscos.push({
          tipo: 'acoes_atrasadas',
          severidade: atrasadas.length >= 3 ? 'alto' : 'medio',
          titulo: 'Ações com prazo vencido',
          descricao: atrasadas.length + ' ação(ões) com data de conclusão ultrapassada.',
          itens: atrasadas.map(function(a) {
            return { id: a.id, nome: a.nome, dataFim: a.dataFim, status: a.status };
          })
        });
      }
    } catch(e) {}

    // 2. Objetivos sem ações vinculadas (ativo sem nenhuma ação)
    try {
      var objs = EstrategiaRepository.listarAtivos(orgId);
      var semAcoes = objs.filter(function(o) {
        return !o.acoesVinculadas || o.acoesVinculadas.length === 0;
      });
      if (semAcoes.length > 0) {
        riscos.push({
          tipo: 'objetivos_sem_acoes',
          severidade: 'medio',
          titulo: 'Objetivos sem ações vinculadas',
          descricao: semAcoes.length + ' objetivo(s) estratégico(s) ativo(s) sem nenhuma ação vinculada.',
          itens: semAcoes.map(function(o) {
            return { id: o.id, titulo: o.titulo, horizonte: o.horizonte };
          })
        });
      }
    } catch(e) {}

    // 3. Contratos vencendo em até 30 dias
    try {
      var contratos = ContratosRepository ? ContratosRepository.listar(orgId, {}) : [];
      var em30 = new Date();
      em30.setDate(em30.getDate() + 30);
      var str30 = em30.toISOString().slice(0, 10);
      var hj    = new Date().toISOString().slice(0, 10);
      var vencendo = contratos.filter(function(c) {
        return c.dataFim && c.dataFim >= hj && c.dataFim <= str30 &&
          ['ativo', 'em_execucao'].indexOf(c.status) !== -1;
      });
      if (vencendo.length > 0) {
        riscos.push({
          tipo: 'contratos_vencendo',
          severidade: 'alto',
          titulo: 'Contratos vencendo em 30 dias',
          descricao: vencendo.length + ' contrato(s) com vencimento nos próximos 30 dias.',
          itens: vencendo.map(function(c) {
            return { id: c.id, nome: c.nome || c.objeto, dataFim: c.dataFim };
          })
        });
      }
    } catch(e) {}

    // 4. Alertas de clima baixo (Escuta Institucional — leitura da última pesquisa se existir)
    try {
      var ultimaEscuta = _lerUltimaEscuta(orgId);
      if (ultimaEscuta && ultimaEscuta.indiceGeral < 50) {
        riscos.push({
          tipo: 'clima_baixo',
          severidade: ultimaEscuta.indiceGeral < 35 ? 'alto' : 'medio',
          titulo: 'Índice de clima organizacional baixo',
          descricao: 'Índice geral de clima: ' + ultimaEscuta.indiceGeral + '/100.',
          itens: []
        });
      }
    } catch(e) {}

    // 5. Tarefas em atraso atribuídas a responsáveis de objetivos
    try {
      var tarefas = TarefaRepository.listar(orgId, {});
      var hjStr = new Date().toISOString().slice(0, 10);
      var tarefasAtrasadas = tarefas.filter(function(t) {
        return t.dataLimite && t.dataLimite < hjStr &&
          ['pendente', 'em_andamento'].indexOf(t.status) !== -1;
      });
      if (tarefasAtrasadas.length >= 5) {
        riscos.push({
          tipo: 'tarefas_atrasadas',
          severidade: 'medio',
          titulo: 'Volume alto de tarefas atrasadas',
          descricao: tarefasAtrasadas.length + ' tarefa(s) com prazo vencido.',
          itens: []
        });
      }
    } catch(e) {}

    // Ordenar: alto → médio → baixo
    var pesoSev = { alto: 1, medio: 2, baixo: 3 };
    riscos.sort(function(a, b) {
      return (pesoSev[a.severidade] || 9) - (pesoSev[b.severidade] || 9);
    });

    return {
      riscos: riscos,
      total: riscos.length,
      altos: riscos.filter(function(r) { return r.severidade === 'alto'; }).length,
      calculadoEm: new Date().toISOString()
    };
  }

  // ─── Relatório Estratégico ────────────────────────────────────────────────

  function gerarRelatorio(orgId, params) {
    orgId  = orgId || getOrgConfig().orgId;
    params = params || {};
    var periodo = params.periodo || 'anual';

    var objetivos = EstrategiaRepository.listar(orgId);
    var acoes     = AcaoRepository.listar(orgId, {});
    var kpis      = calcularKPIs(orgId);
    var riscos    = calcularRiscos(orgId);

    // Filtra período
    var dataCorte = _dataCorte(periodo);
    var acoesNoPeriodo = acoes.filter(function(a) {
      return !dataCorte || (a.criadoEm && a.criadoEm.slice(0, 10) >= dataCorte);
    });

    var concluidas = acoesNoPeriodo.filter(function(a) { return a.status === 'concluida'; });
    var canceladas = acoesNoPeriodo.filter(function(a) { return a.status === 'cancelada'; });

    var publico = 0;
    try { publico = _somarPublico(orgId, dataCorte); } catch(e) {}

    return {
      geradoEm:       new Date().toISOString(),
      periodo:        periodo,
      dataCorte:      dataCorte,
      objetivos: {
        total:      objetivos.length,
        ativos:     objetivos.filter(function(o) { return o.status === 'ativo'; }).length,
        concluidos: objetivos.filter(function(o) { return o.status === 'concluido'; }).length,
        porHorizonte: {
          curto_prazo:  objetivos.filter(function(o) { return o.horizonte === 'curto_prazo'; }).length,
          medio_prazo:  objetivos.filter(function(o) { return o.horizonte === 'medio_prazo'; }).length,
          longo_prazo:  objetivos.filter(function(o) { return o.horizonte === 'longo_prazo'; }).length
        }
      },
      acoes: {
        noPeriodo:  acoesNoPeriodo.length,
        concluidas: concluidas.length,
        canceladas: canceladas.length,
        taxaConclusao: acoesNoPeriodo.length > 0
          ? Math.round((concluidas.length / acoesNoPeriodo.length) * 100) : 0
      },
      publicoAtendido: publico,
      kpis:   kpis,
      riscos: riscos
    };
  }

  // ─── Calendário Estratégico ────────────────────────────────────────────────

  function gerarCalendario(orgId) {
    orgId = orgId || getOrgConfig().orgId;
    var objetivos = EstrategiaRepository.listar(orgId);
    var acoes     = AcaoRepository.listar(orgId, {});

    // Para cada objetivo, monta linha do tempo com ações vinculadas
    var linhas = objetivos.map(function(obj) {
      var acoesObj = (obj.acoesVinculadas || []).map(function(av) {
        // Enriquecer com dados atuais da ação
        var acaoAtual = acoes.filter(function(a) { return a.id === av.id; })[0] || av;
        return {
          id:         av.id,
          nome:       acaoAtual.nome || av.nome,
          status:     acaoAtual.status || av.status,
          dataInicio: acaoAtual.dataInicio || av.dataInicio || '',
          dataFim:    acaoAtual.dataFim    || av.dataFim    || ''
        };
      });

      return {
        id:           obj.id,
        titulo:       obj.titulo,
        horizonte:    obj.horizonte,
        status:       obj.status,
        dataInicio:   obj.dataInicio || '',
        dataFim:      obj.dataFim    || '',
        responsavel:  obj.responsavel,
        acoes:        acoesObj
      };
    });

    return {
      calendario:  linhas,
      geradoEm:    new Date().toISOString()
    };
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────

  function _validar(dados) {
    if (!dados.titulo || !dados.titulo.trim()) throw new Error('Título do objetivo é obrigatório.');
    if (dados.horizonte && Object.values(HORIZONTES).indexOf(dados.horizonte) === -1) {
      throw new Error('Horizonte inválido: ' + dados.horizonte);
    }
  }

  function _merge(base, patch) {
    var campos = ['titulo', 'descricao', 'horizonte', 'responsavel',
                  'dataInicio', 'dataFim', 'metaQuantitativa', 'indicadores', 'observacoes'];
    campos.forEach(function(c) {
      if (patch[c] !== undefined) base[c] = patch[c];
    });
    return base;
  }

  function _auditoria(evento, id, email, detalhes) {
    try {
      AuditoriaService.registrar(evento, 'estrategia', Object.assign({ id: id, emailUsuario: email }, detalhes || {}));
    } catch(e) {}
  }

  function _parseNum(v) {
    if (v === null || v === undefined || v === '') return 0;
    return parseFloat(String(v).replace(',', '.')) || 0;
  }

  function _dataCorte(periodo) {
    var d = new Date();
    if (periodo === 'trimestral') d.setMonth(d.getMonth() - 3);
    else if (periodo === 'semestral') d.setMonth(d.getMonth() - 6);
    else d.setFullYear(d.getFullYear() - 1); // anual
    return d.toISOString().slice(0, 10);
  }

  function _somarPublico(orgId, dataCorte) {
    var inscricoes = PublicoRepository.listarInscricoes(orgId, {});
    var filtradas  = dataCorte
      ? inscricoes.filter(function(i) { return i.criadoEm && i.criadoEm.slice(0, 10) >= dataCorte; })
      : inscricoes;
    return filtradas.filter(function(i) { return i.status === 'presente'; }).length;
  }

  function _lerUltimaEscuta(orgId) {
    // Stub tolerante — EscutaRepository pode não existir ainda (Fase 11.2)
    try {
      if (typeof EscutaRepository === 'undefined') return null;
      var pesquisas = EscutaRepository.listar(orgId, {});
      if (!pesquisas || pesquisas.length === 0) return null;
      pesquisas.sort(function(a, b) {
        return (b.criadoEm || '').localeCompare(a.criadoEm || '');
      });
      return pesquisas[0];
    } catch(e) { return null; }
  }

  return {
    salvar:          salvar,
    mudarStatus:     mudarStatus,
    vincularAcao:    vincularAcao,
    desvincularAcao: desvincularAcao,
    excluir:         excluir,
    calcularKPIs:    calcularKPIs,
    calcularRiscos:  calcularRiscos,
    gerarRelatorio:  gerarRelatorio,
    gerarCalendario: gerarCalendario,
    ESTADOS:         ESTADOS,
    HORIZONTES:      HORIZONTES
  };

})();
