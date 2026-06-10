/**
 * @file engines/alertas_engine.gs
 * @layer engines
 * @description Engine centralizada de alertas operacionais — FASE 10 (implementação completa).
 *
 * PERSISTÊNCIA: AlertasLog (MASTER.AlertasLog — 12 colunas)
 * TIPOS: 25 tipos em 5 categorias (espaços, ações, financeiro, pessoas, sistema)
 * FUNCIONALIDADES: emitir, listarAtivos, resolver, marcarLido, contarNaoLidos,
 *                  verificarTodosAutomaticos (25+ verificações reais), escalação 48h
 *
 * @depends core/config.gs, core/logger.gs, core/notification_engine.gs,
 *          core/event_bus_backend.gs, core/events_constants.gs,
 *          repositories/*, engines/*, modules/*
 */

var AlertasEngine = (function () {

  var SEVERIDADE = { INFO: 'INFO', ATENCAO: 'ATENCAO', URGENTE: 'URGENTE' };

  var TIPOS = {
    RESERVA_PENDENTE_APROVACAO:  { severidade: SEVERIDADE.ATENCAO, modulo: 'espacos'     },
    RESERVA_SEM_RESPONSAVEL:     { severidade: SEVERIDADE.ATENCAO, modulo: 'espacos'     },
    CONFLITO_RESERVA_DETECTADO:  { severidade: SEVERIDADE.URGENTE, modulo: 'espacos'     },
    CHAVE_NAO_DEVOLVIDA:         { severidade: SEVERIDADE.ATENCAO, modulo: 'espacos'     },
    ITEM_NAO_DEVOLVIDO:          { severidade: SEVERIDADE.ATENCAO, modulo: 'espacos'     },
    MANUTENCAO_VENCENDO:         { severidade: SEVERIDADE.ATENCAO, modulo: 'espacos'     },
    ACAO_SEM_RESPONSAVEL:        { severidade: SEVERIDADE.ATENCAO, modulo: 'acoes'       },
    ACAO_ATRASADA:               { severidade: SEVERIDADE.URGENTE, modulo: 'acoes'       },
    ACAO_SEM_ORCAMENTO:          { severidade: SEVERIDADE.ATENCAO, modulo: 'acoes'       },
    HABILITACAO_VENCENDO:        { severidade: SEVERIDADE.ATENCAO, modulo: 'acoes'       },
    CODIP_PENDENTE:              { severidade: SEVERIDADE.ATENCAO, modulo: 'relatorios'  },
    CONTRATO_VENCENDO:           { severidade: SEVERIDADE.ATENCAO, modulo: 'financeiro'  },
    CONTRATO_VENCIDO:            { severidade: SEVERIDADE.URGENTE, modulo: 'financeiro'  },
    ORCAMENTO_ESTOURADO:         { severidade: SEVERIDADE.URGENTE, modulo: 'financeiro'  },
    PAGAMENTO_ATRASADO:          { severidade: SEVERIDADE.ATENCAO, modulo: 'financeiro'  },
    FONTE_RECURSO_EXPIRANDO:     { severidade: SEVERIDADE.ATENCAO, modulo: 'financeiro'  },
    FERIAS_NAO_PROGRAMADAS:      { severidade: SEVERIDADE.ATENCAO, modulo: 'pessoas'     },
    ESCALA_DESCOBERTA:           { severidade: SEVERIDADE.URGENTE, modulo: 'pessoas'     },
    AFASTAMENTO_SEM_SUBSTITUTO:  { severidade: SEVERIDADE.URGENTE, modulo: 'pessoas'     },
    EVENTO_PENDENTE_EXCESSIVO:   { severidade: SEVERIDADE.URGENTE, modulo: 'sistema'     },
    AUDITORIA_FALHA:             { severidade: SEVERIDADE.URGENTE, modulo: 'sistema'     },
    HEALTH_CHECK_FAIL:           { severidade: SEVERIDADE.URGENTE, modulo: 'sistema'     },
    LOCK_TIMEOUT:                { severidade: SEVERIDADE.ATENCAO, modulo: 'sistema'     },
    ENCAMINHAMENTO_VENCIDO:      { severidade: SEVERIDADE.ATENCAO, modulo: 'reunioes'    },
    DEMANDA_COMUNICACAO_SLA:     { severidade: SEVERIDADE.ATENCAO, modulo: 'comunicacao' },
    SOLICITACAO_SEM_ANALISE:     { severidade: SEVERIDADE.ATENCAO, modulo: 'espacos'     },
    ESTOQUE_ITEM_CRITICO:        { severidade: SEVERIDADE.URGENTE, modulo: 'estoque'     },
    ESTOQUE_ITEM_BAIXO:          { severidade: SEVERIDADE.ATENCAO, modulo: 'estoque'     },
    ESTOQUE_PREVISTO_ACABAR:     { severidade: SEVERIDADE.ATENCAO, modulo: 'estoque'     },
    SOLICITACAO_SEM_SEPARACAO:   { severidade: SEVERIDADE.ATENCAO, modulo: 'estoque'     },
    // Ponto
    PONTO_CARGA_SEMANAL:         { severidade: SEVERIDADE.ATENCAO, modulo: 'ponto'       },
    PONTO_CARGA_MENSAL:          { severidade: SEVERIDADE.ATENCAO, modulo: 'ponto'       },
    PONTO_BANCO_HORAS_EXCESSIVO: { severidade: SEVERIDADE.ATENCAO, modulo: 'ponto'       }
  };

  // Cabeçalho do AlertasLog (12 colunas)
  var _HEADERS_LOG = [
    'ID', 'Tipo', 'Severidade', 'Modulo', 'Mensagem',
    'Entidade', 'EntidadeId', 'CriadoEm', 'OrgId',
    'Lido', 'Resolvido', 'ResolvidoPor'
  ];

  // ─── API pública ──────────────────────────────────────────────────────────────

  /**
   * Emite um alerta: persiste no AlertasLog e notifica se URGENTE.
   */
  function emitir(tipo, mensagem, contexto) {
    var orgId = (contexto && contexto.orgId) || getOrgConfig().orgId;
    var meta  = TIPOS[tipo] || { severidade: SEVERIDADE.INFO, modulo: 'sistema' };

    // Deduplicação: não emitir o mesmo tipo+entidade se já existe um ativo
    if (contexto && contexto.entidadeId) {
      try {
        var ativos = listarAtivos(orgId, { tipo: tipo, entidadeId: contexto.entidadeId });
        if (ativos.length > 0) return ativos[0]; // já existe — retorna o existente
      } catch(e) { /* silencioso */ }
    }

    var alerta = {
      id:           gerarId('alrt'),
      tipo:         tipo,
      severidade:   meta.severidade,
      modulo:       meta.modulo,
      mensagem:     mensagem,
      entidade:     (contexto && contexto.entidade)   || null,
      entidadeId:   (contexto && contexto.entidadeId) || null,
      orgId:        orgId,
      criadoEm:     agora(),
      lido:         false,
      resolvido:    false,
      resolvidoPor: null
    };

    _persistir(alerta, orgId);

    if (meta.severidade === SEVERIDADE.URGENTE) {
      _notificarAdmins(alerta, contexto && contexto.destinatarios);
    }

    Logger.warn('alertas_engine', 'emitir', '[' + meta.severidade + '] ' + tipo + ': ' + mensagem);
    return alerta;
  }

  /**
   * Lista alertas ativos (não resolvidos) do orgId.
   * @param {string} orgId
   * @param {object} filtros — { tipo, modulo, severidade, entidadeId, somenteNaoLidos }
   * @returns {Array}
   */
  function listarAtivos(orgId, filtros) {
    filtros = filtros || {};
    try {
      var aba = _getAbaLog();
      if (!aba || aba.getLastRow() < 2) return [];

      var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS_LOG.length).getValues();
      var resultado = [];

      dados.forEach(function(linha) {
        var registro = _linhaParaObjeto(linha);
        if (!registro.id) return;
        if (registro.orgId !== orgId) return;
        if (registro.resolvido) return;
        if (filtros.tipo         && registro.tipo         !== filtros.tipo)         return;
        if (filtros.modulo       && registro.modulo       !== filtros.modulo)       return;
        if (filtros.severidade   && registro.severidade   !== filtros.severidade)   return;
        if (filtros.entidadeId   && registro.entidadeId   !== filtros.entidadeId)   return;
        if (filtros.somenteNaoLidos && registro.lido) return;
        resultado.push(registro);
      });

      // Ordenar: URGENTE primeiro, depois ATENCAO, depois INFO; dentro de cada, mais recente primeiro
      resultado.sort(function(a, b) {
        var ordemSev = { URGENTE: 0, ATENCAO: 1, INFO: 2 };
        var diffSev  = (ordemSev[a.severidade] || 2) - (ordemSev[b.severidade] || 2);
        if (diffSev !== 0) return diffSev;
        return new Date(b.criadoEm) - new Date(a.criadoEm);
      });

      return resultado;
    } catch(e) {
      Logger.warn('alertas_engine', 'listarAtivos', e.message);
      return [];
    }
  }

  /**
   * Conta alertas não lidos do orgId para um usuário (todos os módulos).
   */
  function contarNaoLidos(orgId) {
    try {
      return listarAtivos(orgId, { somenteNaoLidos: true }).length;
    } catch(e) { return 0; }
  }

  /**
   * Marca alerta como lido.
   */
  function marcarLido(alertaId, email) {
    return _atualizarCampo(alertaId, 'Lido', true);
  }

  /**
   * Marca alertas de um módulo como lidos em lote.
   */
  function marcarModuloLido(orgId, modulo, email) {
    try {
      var ativos = listarAtivos(orgId, { modulo: modulo, somenteNaoLidos: true });
      ativos.forEach(function(a) { marcarLido(a.id, email); });
      return { ok: true, marcados: ativos.length };
    } catch(e) { return { ok: false, erro: e.message }; }
  }

  /**
   * Marca alerta como resolvido.
   */
  function resolver(alertaId, email) {
    try {
      var aba = _getAbaLog();
      if (!aba || aba.getLastRow() < 2) return false;

      var dados   = aba.getRange(2, 1, aba.getLastRow() - 1, 1).getValues();
      var numLinha = -1;
      for (var i = 0; i < dados.length; i++) {
        if (dados[i][0] === alertaId) { numLinha = i + 2; break; }
      }
      if (numLinha === -1) return false;

      // Colunas Resolvido=11, ResolvidoPor=12 (1-indexed)
      aba.getRange(numLinha, 11, 1, 2).setValues([[true, email || '']]);
      aba.getRange(numLinha, 10).setValue(true); // marcar como lido também
      Logger.info('alertas_engine', 'resolver', 'Alerta ' + alertaId + ' resolvido por ' + email);
      return true;
    } catch(e) {
      Logger.warn('alertas_engine', 'resolver', e.message);
      return false;
    }
  }

  /**
   * Executa todas as verificações automáticas (25 tipos).
   * Chamado pelo trigger de 30 min.
   */
  function verificarTodosAutomaticos() {
    var orgId = getOrgConfig().orgId;
    var contadores = { emitidos: 0, erros: 0 };
    try {
      // --- Sistema ---
      _verificarSaude(orgId, contadores);
      _verificarEventosPendentes(orgId, contadores);
      // --- Espaços ---
      _verificarReservasPendentes(orgId, contadores);
      _verificarChavesAtrasadas(orgId, contadores);
      _verificarItensNaoDevolvidos(orgId, contadores);
      // --- Ações ---
      _verificarAcoesAtrasadas(orgId, contadores);
      _verificarAcoesSemResponsavel(orgId, contadores);
      _verificarHabilitacoesVencendo(orgId, contadores);
      _verificarCodipPendente(orgId, contadores);
      // --- Financeiro ---
      _verificarContratosVencendo(orgId, contadores);
      _verificarContratosVencidos(orgId, contadores);
      _verificarFontesExpirando(orgId, contadores);
      // --- Pessoas ---
      _verificarFeriasNaoProgramadas(orgId, contadores);
      _verificarAfastamentosSemSubstituto(orgId, contadores);
      // Auto-retorno após fim do período real de férias ou afastamento
      try { contadores.emitidos += PessoasEngine.verificarAutoRetornoFerias(orgId)      || 0; } catch (_) { contadores.erros++; }
      try { contadores.emitidos += PessoasEngine.verificarAutoRetornoAfastamento(orgId)  || 0; } catch (_) { contadores.erros++; }
      _verificarCargaPonto(orgId, contadores);
      // --- Reuniões / Demandas ---
      _verificarEncaminhamentosVencidos(orgId, contadores);
      _verificarDemandasSLA(orgId, contadores);
      _verificarSolicitacoesSemAnalise(orgId, contadores);
      // --- Estoque ---
      _verificarEstoqueItens(orgId, contadores);
      _verificarSolicitacoesPendentesEstoque(orgId, contadores);

      Logger.info('alertas_engine', 'verificarTodosAutomaticos',
        'Verificação concluída. Emitidos: ' + contadores.emitidos + ', Erros: ' + contadores.erros);
    } catch(e) {
      Logger.error('alertas_engine', 'verificarTodosAutomaticos', e.message);
    }
    return contadores;
  }

  // ─── Verificações automáticas ─────────────────────────────────────────────────

  function _verificarSaude(orgId, cont) {
    try {
      var resultado = verificarTodasAbas();
      if (!resultado.ok) {
        emitir('HEALTH_CHECK_FAIL',
          'Sistema com ' + resultado.percentual + '% das abas presentes. Faltando: ' + (resultado.abas_faltando || []).slice(0,3).join(', '),
          { orgId: orgId, entidade: 'sistema', entidadeId: 'health' });
        cont.emitidos++;
      }
    } catch(e) { cont.erros++; Logger.warn('alertas_engine', '_verificarSaude', e.message); }
  }

  function _verificarEventosPendentes(orgId, cont) {
    try {
      var eventos   = SystemEvents.getRecentes(200);
      var pendentes = eventos.filter(function(e) { return !e.processado && e.orgId === orgId; });
      if (pendentes.length > 100) {
        emitir('EVENTO_PENDENTE_EXCESSIVO',
          pendentes.length + ' eventos pendentes no EventLog. Verificar trigger de processamento.',
          { orgId: orgId, entidade: 'sistema', entidadeId: 'event_log' });
        cont.emitidos++;
      }
    } catch(e) { cont.erros++; Logger.warn('alertas_engine', '_verificarEventosPendentes', e.message); }
  }

  function _verificarReservasPendentes(orgId, cont) {
    try {
      var todas = readJSON('reservas.json') || [];
      var limite = new Date(new Date().getTime() - 4 * 3600000); // 4 horas atrás
      todas.filter(function(r) {
        return r.orgId === orgId && r.status === 'pendente' && new Date(r.criadoEm) < limite;
      }).forEach(function(r) {
        emitir('RESERVA_PENDENTE_APROVACAO',
          'Reserva "' + (r.nomeAcao || r.id) + '" aguarda aprovação há mais de 4h.',
          { orgId: orgId, entidade: 'reserva', entidadeId: r.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarChavesAtrasadas(orgId, cont) {
    try {
      var todas = readJSON('movimentacoes_chaves.json') || [];
      var hoje  = new Date();
      todas.filter(function(m) {
        return m.orgId === orgId && m.tipo === 'saida' && !m.retornoEm &&
               m.previsaoRetorno && new Date(m.previsaoRetorno) < hoje;
      }).forEach(function(m) {
        emitir('CHAVE_NAO_DEVOLVIDA',
          'Chave do espaço "' + (m.espacoNome || m.espacoId) + '" não devolvida. Retirada por: ' + (m.responsavel || '—'),
          { orgId: orgId, entidade: 'chave', entidadeId: m.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarItensNaoDevolvidos(orgId, cont) {
    try {
      var emprestimos = readJSON('reservas_itens.json') || [];
      var hoje = new Date();
      emprestimos.filter(function(e) {
        return e.orgId === orgId && e.tipo === 'emprestimo' && e.status === 'ativo' &&
               e.dataDevolucaoPrevista && new Date(e.dataDevolucaoPrevista) < hoje;
      }).forEach(function(e) {
        emitir('ITEM_NAO_DEVOLVIDO',
          'Item "' + (e.nomeItem || e.itemId) + '" não devolvido. Prazo era ' + e.dataDevolucaoPrevista + '.',
          { orgId: orgId, entidade: 'emprestimo', entidadeId: e.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarAcoesAtrasadas(orgId, cont) {
    try {
      var acoes = readJSON('acoes.json') || [];
      var hoje  = new Date();
      acoes.filter(function(a) {
        return a.orgId === orgId &&
               (a.status === 'planejada' || a.status === 'em_producao') &&
               a.dataInicio && new Date(a.dataInicio) < hoje;
      }).forEach(function(a) {
        emitir('ACAO_ATRASADA',
          'Ação "' + a.nome + '" com data de início ultrapassada sem transição de status.',
          { orgId: orgId, entidade: 'acao', entidadeId: a.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarAcoesSemResponsavel(orgId, cont) {
    try {
      var acoes = readJSON('acoes.json') || [];
      acoes.filter(function(a) {
        return a.orgId === orgId &&
               a.status !== 'cancelada' && a.status !== 'arquivada' &&
               !a.responsavel;
      }).forEach(function(a) {
        emitir('ACAO_SEM_RESPONSAVEL',
          'Ação "' + a.nome + '" sem responsável designado.',
          { orgId: orgId, entidade: 'acao', entidadeId: a.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarHabilitacoesVencendo(orgId, cont) {
    try {
      var habs  = readJSON('habilitacoes.json') || [];
      var hoje  = new Date();
      var d30   = new Date(hoje.getTime() + 30 * 86400000);
      habs.filter(function(h) {
        return h.orgId === orgId && h.status === 'habilitado' &&
               h.validade && new Date(h.validade) < d30;
      }).forEach(function(h) {
        emitir('HABILITACAO_VENCENDO',
          'Habilitação "' + (h.nome || h.id) + '" vence em ' + h.validade + '.',
          { orgId: orgId, entidade: 'habilitacao', entidadeId: h.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarCodipPendente(orgId, cont) {
    try {
      var acoes = readJSON('acoes.json') || [];
      var d30   = new Date(new Date().getTime() - 30 * 86400000);
      acoes.filter(function(a) {
        return a.orgId === orgId && a.status === 'concluida' &&
               !a.codipEnviado && a.dataFim && new Date(a.dataFim) < d30;
      }).forEach(function(a) {
        emitir('CODIP_PENDENTE',
          'Ação "' + a.nome + '" concluída há mais de 30 dias sem CODIP preenchido.',
          { orgId: orgId, entidade: 'acao', entidadeId: a.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarContratosVencendo(orgId, cont) {
    try {
      var contratos = readJSON('contratos.json') || [];
      var hoje      = new Date();
      var d30       = new Date(hoje.getTime() + 30 * 86400000);
      contratos.filter(function(c) {
        return c.orgId === orgId && c.status === 'ativo' &&
               c.dataFim && new Date(c.dataFim) > hoje && new Date(c.dataFim) < d30;
      }).forEach(function(c) {
        emitir('CONTRATO_VENCENDO',
          'Contrato "' + (c.numero || c.id) + '" vence em ' + c.dataFim + '.',
          { orgId: orgId, entidade: 'contrato', entidadeId: c.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarContratosVencidos(orgId, cont) {
    try {
      var contratos = readJSON('contratos.json') || [];
      var hoje      = new Date();
      contratos.filter(function(c) {
        return c.orgId === orgId && c.status === 'ativo' &&
               c.dataFim && new Date(c.dataFim) < hoje;
      }).forEach(function(c) {
        emitir('CONTRATO_VENCIDO',
          'Contrato "' + (c.numero || c.id) + '" VENCIDO em ' + c.dataFim + ' e ainda marcado como ativo.',
          { orgId: orgId, entidade: 'contrato', entidadeId: c.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarFontesExpirando(orgId, cont) {
    try {
      var fontes = readJSON('fontes_recurso.json') || [];
      var hoje   = new Date();
      var d60    = new Date(hoje.getTime() + 60 * 86400000);
      fontes.filter(function(f) {
        return f.orgId === orgId && f.status === 'ativo' &&
               f.dataEncerramento && new Date(f.dataEncerramento) < d60;
      }).forEach(function(f) {
        emitir('FONTE_RECURSO_EXPIRANDO',
          'Fonte de recurso "' + (f.nome || f.id) + '" expira em ' + f.dataEncerramento + '.',
          { orgId: orgId, entidade: 'fonte_recurso', entidadeId: f.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarFeriasNaoProgramadas(orgId, cont) {
    try {
      var colaboradores = readJSON('colaboradores.json') || [];
      var ferias        = readJSON('ferias.json') || [];
      var hoje = new Date();
      var d30  = new Date(hoje.getTime() + 30 * 86400000);
      var comFerias = {};
      ferias.filter(function(f) { return f.orgId === orgId && f.status !== 'cancelado'; })
            .forEach(function(f) { comFerias[f.colaboradorId] = true; });
      colaboradores.filter(function(c) {
        return c.orgId === orgId && c.status === 'ativo' &&
               c.dataAdmissao && !comFerias[c.id] &&
               (new Date().getFullYear() - new Date(c.dataAdmissao).getFullYear()) >= 1;
      }).forEach(function(c) {
        emitir('FERIAS_NAO_PROGRAMADAS',
          'Colaborador "' + (c.nome || c.email) + '" sem férias programadas.',
          { orgId: orgId, entidade: 'colaborador', entidadeId: c.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarAfastamentosSemSubstituto(orgId, cont) {
    try {
      var afastamentos = readJSON('afastamentos.json') || [];
      var hoje = new Date();
      afastamentos.filter(function(a) {
        return a.orgId === orgId && a.status === 'ativo' &&
               !a.substitutoId && new Date(a.dataInicio) <= hoje && new Date(a.dataFim) >= hoje;
      }).forEach(function(a) {
        emitir('AFASTAMENTO_SEM_SUBSTITUTO',
          'Afastamento ativo sem substituto designado para ' + (a.colaboradorNome || a.colaboradorId) + '.',
          { orgId: orgId, entidade: 'afastamento', entidadeId: a.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarCargaPonto(orgId, cont) {
    try {
      var agora    = new Date();
      var anoAtual = agora.getFullYear();
      var mesAtual = agora.getMonth() + 1;
      var semanaStr = anoAtual + '-S' + _isoWeek(agora);

      // Limites do mês e da semana atual
      var inicioMes  = anoAtual + '-' + _pad2(mesAtual) + '-01';
      var fimMes     = _ultimoDiaStr(anoAtual, mesAtual);
      var inicioSem  = _inicioSemana(agora);
      var fimSem     = _fimSemana(agora);

      var colabs = (readJSON('colaboradores.json') || []).filter(function(c) {
        return c.orgId === orgId && c.ativo !== false && c.status !== 'inativo';
      });
      var normalizados = (readJSON('ponto_normalizado.json') || []).filter(function(r) {
        return r.orgId === orgId && r.status !== 'revertido';
      });
      // Limite de BH excessivo: 40h = 2400 min acumulados
      var LIMITE_BH_MIN = 2400;

      colabs.forEach(function(c) {
        var horasSem  = (c.horasSemanais || 40);
        var minSem    = horasSem * 60;
        var minMensal = Math.round(horasSem / 5 * 22 * 60); // ~22 dias úteis

        // Filtra registros do colaborador
        var regMes = normalizados.filter(function(r) {
          return r.colaboradorId === c.id && r.data >= inicioMes && r.data <= fimMes;
        });
        var regSem = normalizados.filter(function(r) {
          return r.colaboradorId === c.id && r.data >= inicioSem && r.data <= fimSem;
        });

        // Minutos únicos por dia (evita contar E+S como separados)
        var minMesTotal  = _somarMinutosPorDias(orgId, c.id, regMes);
        var minSemTotal  = _somarMinutosPorDias(orgId, c.id, regSem);
        var bh = (readJSON('banco_horas.json') || []).filter(function(b){
          return b.orgId === orgId && b.colaboradorId === c.id;
        })[0];
        var saldoBH = bh ? (bh.saldoMinutos || 0) : 0;

        // Alerta semanal — carga incompleta (só emite na sexta ou aos fins de semana)
        var dow = agora.getDay(); // 5=Sex, 6=Sáb, 0=Dom
        if ([0,5,6].indexOf(dow) >= 0 && minSemTotal < minSem * 0.9) {
          emitir('PONTO_CARGA_SEMANAL',
            c.nome + ' (' + c.setor + '): ' + _toHM(minSemTotal) + ' de ' + _toHM(minSem) + ' — faltam ' + _toHM(minSem - minSemTotal) + ' na semana.',
            { orgId: orgId, entidade: 'colaborador', entidadeId: c.id + '_ponto_sem_' + semanaStr });
          cont.emitidos++;
        }
        // Alerta mensal — carga incompleta (só emite nos últimos 3 dias do mês)
        var ultimoDia = new Date(anoAtual, mesAtual, 0).getDate();
        if (agora.getDate() >= ultimoDia - 2 && minMesTotal < minMensal * 0.9) {
          emitir('PONTO_CARGA_MENSAL',
            c.nome + ' (' + c.setor + '): ' + _toHM(minMesTotal) + ' de ' + _toHM(minMensal) + ' no mês — faltam ' + _toHM(minMensal - minMesTotal) + '.',
            { orgId: orgId, entidade: 'colaborador', entidadeId: c.id + '_ponto_mes_' + anoAtual + '_' + mesAtual });
          cont.emitidos++;
        }
        // Alerta BH excessivo (> 40h acumuladas)
        if (saldoBH > LIMITE_BH_MIN) {
          emitir('PONTO_BANCO_HORAS_EXCESSIVO',
            c.nome + ' (' + c.setor + '): banco de horas em ' + _toHM(saldoBH) + ' — avaliar compensação ou pagamento.',
            { orgId: orgId, entidade: 'colaborador', entidadeId: c.id + '_bh_excessivo' });
          cont.emitidos++;
        }
      });
    } catch(e) { cont.erros++; Logger.warn('alertas_engine', '_verificarCargaPonto', e.message); }
  }

  // helpers internos para _verificarCargaPonto
  function _pad2(n) { return String(n).padStart(2,'0'); }
  function _toHM(min) { if (!min) return '0h00'; return Math.floor(Math.abs(min)/60) + 'h' + String(Math.abs(min)%60).padStart(2,'0'); }
  function _ultimoDiaStr(ano, mes) { return new Date(ano, mes, 0).toISOString().split('T')[0]; }
  function _isoWeek(d) {
    var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return String(Math.ceil((((date - yearStart) / 86400000) + 1) / 7)).padStart(2,'0');
  }
  function _inicioSemana(d) {
    var monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return monday.toISOString().split('T')[0];
  }
  function _fimSemana(d) {
    var sunday = new Date(d);
    sunday.setDate(d.getDate() + (7 - ((d.getDay() + 6) % 7)) % 7);
    return sunday.toISOString().split('T')[0];
  }
  function _somarMinutosPorDias(orgId, colaboradorId, registros) {
    // Soma minutos de jornada calculados por dia (usa calcularJornadasLote simplificado)
    var total = 0;
    try {
      var jornadas = JornadaEngine.calcularJornadasLote(orgId, registros);
      jornadas.forEach(function(j){ total += (j.minutosTrabalho || 0); });
    } catch(e) {}
    return total;
  }

  function _verificarEncaminhamentosVencidos(orgId, cont) {
    try {
      var reunioes = readJSON('reunioes.json') || [];
      var hoje     = new Date();
      reunioes.filter(function(r) { return r.orgId === orgId; }).forEach(function(r) {
        (r.encaminhamentos || []).filter(function(e) {
          return e.status !== 'concluido' && e.prazo && new Date(e.prazo) < hoje;
        }).forEach(function(e) {
          emitir('ENCAMINHAMENTO_VENCIDO',
            'Encaminhamento "' + e.texto + '" da reunião "' + r.titulo + '" vencido. Responsável: ' + (e.responsavel || '—'),
            { orgId: orgId, entidade: 'encaminhamento', entidadeId: r.id + '_' + (e.id || e.ordem) });
          cont.emitidos++;
        });
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarDemandasSLA(orgId, cont) {
    try {
      var demandas = readJSON('balcao_demandas.json') || [];
      var hoje     = new Date();
      demandas.filter(function(d) {
        return d.orgId === orgId &&
               d.status !== 'concluida' && d.status !== 'cancelada' &&
               d.dataLimite && new Date(d.dataLimite) < hoje;
      }).forEach(function(d) {
        emitir('DEMANDA_COMUNICACAO_SLA',
          'Demanda "' + (d.titulo || d.id) + '" ultrapassou o SLA. Tipo: ' + (d.tipo || '—'),
          { orgId: orgId, entidade: 'demanda', entidadeId: d.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarSolicitacoesSemAnalise(orgId, cont) {
    try {
      var solic  = readJSON('solicitacoes_reserva.json') || [];
      var limite = new Date(new Date().getTime() - 48 * 3600000);
      solic.filter(function(s) {
        return s.orgId === orgId && s.status === 'pendente' && new Date(s.criadoEm) < limite;
      }).forEach(function(s) {
        emitir('SOLICITACAO_SEM_ANALISE',
          'Solicitação de reserva aguardando análise há mais de 48h. Enviada por: ' + (s.solicitante || '—'),
          { orgId: orgId, entidade: 'solicitacao', entidadeId: s.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; }
  }

  function _verificarEstoqueItens(orgId, cont) {
    try {
      if (typeof PrevisaoEstoqueEngine === 'undefined' ||
          typeof ItemEstoqueRepository  === 'undefined') return;

      var limiar      = PrevisaoEstoqueEngine.getLimiarBaixo();
      var prazoAlerta = PrevisaoEstoqueEngine.getPrazoAlertaDias();
      var itens       = ItemEstoqueRepository.listar({ critico: true }, orgId);

      itens.forEach(function (item) {
        try {
          var saldoTotal = ItemEstoqueRepository.getSaldoTotal(item.id, orgId);

          if (saldoTotal === 0) {
            emitir('ESTOQUE_ITEM_CRITICO',
              'Item crítico "' + item.descricao + '" com saldo zerado.',
              { orgId: orgId, entidade: 'item_estoque', entidadeId: item.id });
            cont.emitidos++;
            return;
          }

          if (saldoTotal <= limiar) {
            emitir('ESTOQUE_ITEM_BAIXO',
              'Item crítico "' + item.descricao + '" com saldo baixo: ' + saldoTotal + ' ' + item.unidadeMedida + '.',
              { orgId: orgId, entidade: 'item_estoque', entidadeId: item.id });
            cont.emitidos++;
          }

          var taxa = PrevisaoEstoqueEngine.calcularTaxaConsumo(item.id, orgId, 30);
          if (taxa.diasAteEsgotar !== null && taxa.diasAteEsgotar < prazoAlerta) {
            emitir('ESTOQUE_PREVISTO_ACABAR',
              'Item "' + item.descricao + '" previsto para acabar em ' + taxa.diasAteEsgotar + ' dia(s) no ritmo atual.',
              { orgId: orgId, entidade: 'item_estoque', entidadeId: item.id + '_prev' });
            cont.emitidos++;
          }
        } catch (ei) { cont.erros++; }
      });
    } catch(e) { cont.erros++; Logger.warn('alertas_engine', '_verificarEstoqueItens', e.message); }
  }

  function _verificarSolicitacoesPendentesEstoque(orgId, cont) {
    try {
      if (typeof SolicitacaoMaterialRepository === 'undefined') return;
      var limite = new Date(new Date().getTime() - 24 * 3600000);
      var pends  = SolicitacaoMaterialRepository.listar({ status: 'pendente' }, orgId);
      pends.filter(function (s) {
        return new Date(s.dataSolicitacao || s.criadoEm) < limite;
      }).forEach(function (s) {
        emitir('SOLICITACAO_SEM_SEPARACAO',
          'Solicitação #' + (s.codigo || s.id) + ' de "' + (s.solicitante || '—') + '" aguarda separação há mais de 24h.',
          { orgId: orgId, entidade: 'solicitacao_material', entidadeId: s.id });
        cont.emitidos++;
      });
    } catch(e) { cont.erros++; Logger.warn('alertas_engine', '_verificarSolicitacoesPendentesEstoque', e.message); }
  }

  // ─── Persistência ─────────────────────────────────────────────────────────────

  function _getAbaLog() {
    var props   = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty('SHEET_ID_MASTER');
    if (!sheetId) return null;
    var ss  = SpreadsheetApp.openById(sheetId);
    var aba = ss.getSheetByName('AlertasLog');
    if (!aba) {
      aba = ss.insertSheet('AlertasLog');
      aba.getRange(1, 1, 1, _HEADERS_LOG.length).setValues([_HEADERS_LOG]);
      aba.setFrozenRows(1);
    } else if (aba.getLastRow() < 1) {
      aba.getRange(1, 1, 1, _HEADERS_LOG.length).setValues([_HEADERS_LOG]);
      aba.setFrozenRows(1);
    }
    return aba;
  }

  function _persistir(alerta, orgId) {
    try {
      var aba = _getAbaLog();
      if (!aba) return;
      aba.appendRow([
        alerta.id, alerta.tipo, alerta.severidade, alerta.modulo,
        alerta.mensagem, alerta.entidade || '', alerta.entidadeId || '',
        alerta.criadoEm, orgId, false, false, ''
      ]);
    } catch(e) {
      Logger.warn('alertas_engine', '_persistir', e.message);
    }
  }

  function _atualizarCampo(alertaId, colunaNome, valor) {
    try {
      var aba = _getAbaLog();
      if (!aba || aba.getLastRow() < 2) return false;
      var ids    = aba.getRange(2, 1, aba.getLastRow() - 1, 1).getValues();
      var colIdx = _HEADERS_LOG.indexOf(colunaNome);
      if (colIdx === -1) return false;
      for (var i = 0; i < ids.length; i++) {
        if (ids[i][0] === alertaId) {
          aba.getRange(i + 2, colIdx + 1).setValue(valor);
          return true;
        }
      }
      return false;
    } catch(e) {
      Logger.warn('alertas_engine', '_atualizarCampo', e.message);
      return false;
    }
  }

  function _linhaParaObjeto(linha) {
    var obj = {};
    _HEADERS_LOG.forEach(function(h, i) {
      obj[h.charAt(0).toLowerCase() + h.slice(1)] = linha[i] !== undefined ? linha[i] : null;
    });
    // Normalizar campos booleanos vindos como 'TRUE'/'FALSE' de strings
    obj.lido      = obj.lido === true || obj.lido === 'TRUE';
    obj.resolvido = obj.resolvido === true || obj.resolvido === 'TRUE';
    return obj;
  }

  function _notificarAdmins(alerta, destinatariosExtra) {
    try {
      if (typeof NotificationEngine === 'undefined') return;
      NotificationEngine.notificarAdmins({
        tipo:     'ALERTA_URGENTE',
        assunto:  '[URGENTE] ' + alerta.tipo,
        mensagem: alerta.mensagem,
        orgId:    alerta.orgId,
        contexto: { alertaId: alerta.id, modulo: alerta.modulo }
      });
    } catch(e) {
      Logger.warn('alertas_engine', '_notificarAdmins', e.message);
    }
  }

  // ─── Garantia de aba ─────────────────────────────────────────────────────────

  function garantirAbaAlertasLog() {
    try {
      _getAbaLog(); // cria a aba se não existir
      Logger.info('alertas_engine', 'garantirAbaAlertasLog', 'AlertasLog OK.');
      return { ok: true };
    } catch(e) {
      Logger.error('alertas_engine', 'garantirAbaAlertasLog', e.message);
      return { ok: false, erro: e.message };
    }
  }

  return {
    emitir:                  emitir,
    listarAtivos:            listarAtivos,
    contarNaoLidos:          contarNaoLidos,
    marcarLido:              marcarLido,
    marcarModuloLido:        marcarModuloLido,
    resolver:                resolver,
    verificarTodosAutomaticos: verificarTodosAutomaticos,
    garantirAbaAlertasLog:   garantirAbaAlertasLog,
    SEVERIDADE:              SEVERIDADE,
    TIPOS:                   TIPOS
  };

})();
