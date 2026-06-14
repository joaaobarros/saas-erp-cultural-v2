/**
 * @file ponto_controller.gs
 * @layer controller
 * @description Controllers de Ponto Eletrônico, Custo CLT e motor flexível AFD.
 *
 *   RBAC:
 *     registrar         = próprio colaborador ou rh+
 *     consultas         = rh/gestor/admin+
 *     custo CLT         = rh/financeiro/admin+
 *     import/export AFD = rh/admin+
 *     layouts / sessões = rh/admin+
 *
 *   Fluxo de importação AFD em 2 etapas (motor flexível):
 *     1. ctrl_ponto_iniciar_importacao_afd  → parse + brutos (sessão pendente)
 *     2. ctrl_ponto_confirmar_importacao    → cria normalizados (sessão confirmada)
 *     ctrl_ponto_cancelar_importacao  → cancela sessão pendente
 *     ctrl_ponto_reverter_importacao  → reverte sessão confirmada
 *
 * @depends ponto_engine.gs, afd_parser_engine.gs, ponto_bruto_repository.gs,
 *          afd_layout_repository.gs, ponto_repository.gs, acesso_service.gs, response.gs
 */

function _ctxPonto() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro ? (acesso.registro.papel || 'colaborador') : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

/**
 * Resolve um colaboradorId que pode ser um email (self-service) ou um ID gerado
 * (importação AFD). Se for email, procura o colaborador cujo emailInstitucional
 * ou id coincide com esse email — necessário para que colaboradores vejam o ponto
 * importado via AFD antes de o vínculo ser concluído manualmente.
 * Fallback: retorna o próprio valor (retrocompatível com registros manuais).
 */
function _resolverColabId(orgId, colaboradorId) {
  if (!colaboradorId) return colaboradorId;
  // Se já parece um ID gerado (não é e-mail), retorna direto
  if (colaboradorId.indexOf('@') < 0) return colaboradorId;
  // É um email — procura colaborador com emailInstitucional correspondente
  try {
    var colabs = lerJSON('colaboradores.json') || [];
    var match = null;
    for (var i = 0; i < colabs.length; i++) {
      var c = colabs[i];
      if (c.orgId !== orgId) continue;
      var eInst = String(c.emailInstitucional || '').toLowerCase().trim();
      var ePess = String(c.emailPessoal       || '').toLowerCase().trim();
      var email = colaboradorId.toLowerCase().trim();
      if (eInst === email || ePess === email || c.id === colaboradorId) {
        match = c.id;
        break;
      }
    }
    return match || colaboradorId;
  } catch(_) {
    return colaboradorId;
  }
}

// ─── Registro de ponto ───────────────────────────────────────────────────────

/**
 * Registra uma marcação de ponto.
 * @param {object} params — { colaboradorId?, tipo, data?, hora?, observacao? }
 */
function ctrl_ponto_registrar(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    // Colaborador pode registrar o próprio ponto; rh+ pode registrar de qualquer um
    var colabId = params.colaboradorId || ctx.email;
    if (colabId !== ctx.email && ['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — só pode registrar o próprio ponto.');
    return PontoEngine.registrar(ctx.orgId, colabId, params.tipo, params, ctx.email);
  }, 'ctrl_ponto_registrar');
}

/**
 * Exclui um registro de ponto (rh/admin).
 */
function ctrl_ponto_excluir(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0) throw new Error('Acesso negado.');
    return PontoEngine.excluirRegistro(ctx.orgId, params.id, ctx.email);
  }, 'ctrl_ponto_excluir');
}

// ─── Consultas ───────────────────────────────────────────────────────────────

/**
 * Lista registros de um colaborador em um período.
 */
function ctrl_ponto_listar(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    var colabId = _resolverColabId(ctx.orgId, params.colaboradorId || ctx.email);
    if (colabId !== ctx.email && _resolverColabId(ctx.orgId, ctx.email) !== colabId &&
        ['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoRepository.listarPorColaborador(
      ctx.orgId, colabId, params.dataInicio, params.dataFim
    );
  }, 'ctrl_ponto_listar');
}

/**
 * Retorna cálculo de horas de um dia específico.
 */
function ctrl_ponto_horas_dia(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    var colabId = params.colaboradorId || ctx.email;
    if (colabId !== ctx.email && ['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoEngine.calcularHorasDia(ctx.orgId, colabId, params.data);
  }, 'ctrl_ponto_horas_dia');
}

/**
 * Retorna folha mensal de um colaborador.
 */
function ctrl_ponto_mensal(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    var colabId = params.colaboradorId || ctx.email;
    if (colabId !== ctx.email && ['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    var agora = new Date();
    var ano   = Number(params.ano  || agora.getFullYear());
    var mes   = Number(params.mes  || agora.getMonth() + 1);
    return PontoEngine.calcularMensal(ctx.orgId, colabId, ano, mes);
  }, 'ctrl_ponto_mensal');
}

/**
 * Retorna saldo de banco de horas.
 */
function ctrl_ponto_banco_horas(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    var colabId = params.colaboradorId || ctx.email;
    if (colabId !== ctx.email && ['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoRepository.obterBancoHoras(ctx.orgId, colabId);
  }, 'ctrl_ponto_banco_horas');
}

// ─── Custo CLT ───────────────────────────────────────────────────────────────

/**
 * Calcula custo CLT completo de um colaborador (ou cenário hipotético).
 */
function ctrl_ponto_custo_clt(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','financeiro','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — papel rh/financeiro+ necessário.');
    return PontoEngine.calcularCustoCLT(ctx.orgId, params);
  }, 'ctrl_ponto_custo_clt');
}

/**
 * Simula reajuste percentual em toda a folha.
 * @param {object} params — { percentual, colaboradores: [{id,nome,salarioBruto}] }
 */
function ctrl_ponto_simular_reajuste(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','financeiro','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoEngine.simularReajuste(ctx.orgId, params.percentual, params.colaboradores || []);
  }, 'ctrl_ponto_simular_reajuste');
}

/**
 * Calcula rescisão e break-even.
 */
function ctrl_ponto_calcular_rescisao(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoEngine.calcularRescisao(ctx.orgId, params);
  }, 'ctrl_ponto_calcular_rescisao');
}

/**
 * Consolida histórico de holerites de um colaborador para uso na calculadora de rescisão.
 * @param {object} params — { colaboradorId }
 */
function ctrl_ponto_consolidado_rescisao(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    if (!params.colaboradorId) throw new Error('colaboradorId obrigatório.');
    return PontoEngine.consolidadoRescisao(ctx.orgId, params.colaboradorId);
  }, 'ctrl_ponto_consolidado_rescisao');
}

/**
 * Indicadores de turnover do período.
 */
function ctrl_ponto_turnover(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx  = _ctxPonto();
    if (['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    var agora = new Date();
    return PontoEngine.calcularIndicadoresTurnover(
      ctx.orgId,
      Number(params.ano || agora.getFullYear()),
      Number(params.mes || agora.getMonth() + 1)
    );
  }, 'ctrl_ponto_turnover');
}

// ─── Compatibilidade Colabore ────────────────────────────────────────────────

/**
 * Exporta registros no formato AFD (Portaria MTE 1510/2009).
 * Compatível com o sistema Colabore / ByYou DP da Fortes Tecnologia.
 */
function ctrl_ponto_exportar_afd(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoEngine.exportarAFD(ctx.orgId, params.dataInicio, params.dataFim);
  }, 'ctrl_ponto_exportar_afd');
}

/**
 * Exporta no formato CSV Colabore (PIS;Nome;Data;Hora;Tipo;NSR).
 */
function ctrl_ponto_exportar_csv_colabore(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoEngine.exportarCSVColabore(ctx.orgId, params.dataInicio, params.dataFim);
  }, 'ctrl_ponto_exportar_csv_colabore');
}

/**
 * Importa registros de um arquivo AFD.
 * @param {object} params — { conteudo: string (texto do arquivo AFD) }
 */
function ctrl_ponto_importar_afd(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    if (!params.conteudo) throw new Error('Conteúdo do arquivo AFD obrigatório.');
    return PontoEngine.importarAFD(ctx.orgId, params.conteudo, ctx.email);
  }, 'ctrl_ponto_importar_afd');
}

/**
 * Importa registros de um CSV no formato Colabore.
 */
function ctrl_ponto_importar_csv_colabore(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    if (!params.conteudo) throw new Error('Conteúdo do arquivo CSV obrigatório.');
    return PontoEngine.importarCSVColabore(ctx.orgId, params.conteudo, ctx.email);
  }, 'ctrl_ponto_importar_csv_colabore');
}

// ─── Motor flexível AFD — Layouts ────────────────────────────────────────────

/**
 * Lista os layouts de importação disponíveis para a org.
 */
function ctrl_ponto_listar_layouts(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return AfdLayoutRepository.listar(ctx.orgId);
  }, 'ctrl_ponto_listar_layouts');
}

/**
 * Duplica um layout existente para personalização.
 * @param {object} params — { layoutId, nome }
 */
function ctrl_ponto_duplicar_layout(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — apenas admin+.');
    if (!params.layoutId) throw new Error('layoutId obrigatório.');
    var novoId = AfdLayoutRepository.duplicar(ctx.orgId, params.layoutId, params.nome);
    return { ok: true, id: novoId };
  }, 'ctrl_ponto_duplicar_layout');
}

/**
 * Salva alterações em um layout customizado (não-builtin).
 * @param {object} params — objeto do layout com id
 */
function ctrl_ponto_salvar_layout(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — apenas admin+.');
    if (!params.id) throw new Error('id do layout obrigatório.');
    var id = AfdLayoutRepository.salvar(ctx.orgId, params);
    return { ok: true, id: id };
  }, 'ctrl_ponto_salvar_layout');
}

// ─── Motor flexível AFD — Importação em 2 etapas ─────────────────────────────

/**
 * Etapa 0 (opcional): gera prévia do arquivo sem escrever no banco.
 * @param {object} params — { conteudo, layoutId? }
 */
function ctrl_ponto_preview_afd(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    if (!params.conteudo) throw new Error('conteudo obrigatório.');
    return AfdParserEngine.gerarPreview(ctx.orgId, params.conteudo, params.layoutId || null);
  }, 'ctrl_ponto_preview_afd');
}

/**
 * Etapa 1: parseia o arquivo, cria sessão pendente e salva registros brutos.
 * Não cria registros normalizados. Retorna resumo para revisão.
 * @param {object} params — { conteudo, layoutId?, nomeArquivo? }
 */
function ctrl_ponto_iniciar_importacao_afd(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    if (!params.conteudo) throw new Error('conteudo obrigatório.');
    return AfdParserEngine.iniciarImportacao(
      ctx.orgId,
      params.conteudo,
      params.layoutId   || null,
      params.nomeArquivo || '',
      ctx.email
    );
  }, 'ctrl_ponto_iniciar_importacao_afd');
}

/**
 * Etapa 2: confirma a sessão e cria os registros normalizados.
 * @param {object} params — { sessaoId }
 */
function ctrl_ponto_confirmar_importacao(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    if (!params.sessaoId) throw new Error('sessaoId obrigatório.');
    return AfdParserEngine.confirmarImportacao(ctx.orgId, params.sessaoId, ctx.email);
  }, 'ctrl_ponto_confirmar_importacao');
}

/**
 * Cancela uma sessão PENDENTE (antes de confirmar).
 * @param {object} params — { sessaoId }
 */
function ctrl_ponto_cancelar_importacao(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    if (!params.sessaoId) throw new Error('sessaoId obrigatório.');
    return AfdParserEngine.cancelarImportacao(ctx.orgId, params.sessaoId, ctx.email);
  }, 'ctrl_ponto_cancelar_importacao');
}

/**
 * Reverte uma sessão CONFIRMADA (marca normalizados como revertido).
 * @param {object} params — { sessaoId }
 */
function ctrl_ponto_reverter_importacao(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — apenas admin+ pode reverter importações.');
    if (!params.sessaoId) throw new Error('sessaoId obrigatório.');
    return AfdParserEngine.reverterImportacao(ctx.orgId, params.sessaoId, ctx.email);
  }, 'ctrl_ponto_reverter_importacao');
}

// ─── Motor flexível AFD — Consulta de sessões ─────────────────────────────────

/**
 * Lista sessões de importação da org (mais recentes primeiro).
 * @param {object} params — { status? }
 */
function ctrl_ponto_listar_sessoes(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoBrutoRepository.listarSessoes(ctx.orgId, { status: params.status || null });
  }, 'ctrl_ponto_listar_sessoes');
}

/**
 * Retorna uma sessão com seus registros brutos paginados.
 * @param {object} params — { sessaoId, pagina?, itensPorPagina? }
 */
function ctrl_ponto_detalhe_sessao(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    if (!params.sessaoId) throw new Error('sessaoId obrigatório.');
    var sessao  = PontoBrutoRepository.obterSessao(ctx.orgId, params.sessaoId);
    if (!sessao) throw new Error('Sessão não encontrada.');
    var brutos  = PontoBrutoRepository.listarBrutoPorSessao(ctx.orgId, params.sessaoId);
    var pg      = Number(params.pagina || 1);
    var porPg   = Number(params.itensPorPagina || 100);
    var inicio  = (pg - 1) * porPg;
    return {
      sessao:     sessao,
      brutos:     brutos.slice(inicio, inicio + porPg),
      total:      brutos.length,
      pagina:     pg,
      paginas:    Math.ceil(brutos.length / porPg)
    };
  }, 'ctrl_ponto_detalhe_sessao');
}

// ─── Jornadas ────────────────────────────────────────────────────────────────

/**
 * Processa a jornada de um colaborador em uma data específica.
 * Recalcula tipos E/I/R/S, tempos trabalhados, extras e faltantes.
 * @param {object} params — { colaboradorId?, data }
 */
function ctrl_ponto_processar_jornada(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    var colabId = params.colaboradorId || ctx.email;
    if (!params.data) throw new Error('data obrigatória (YYYY-MM-DD).');
    var jornadaId = JornadaEngine.processarDia(ctx.orgId, colabId, params.data);
    return { ok: true, jornadaId: jornadaId };
  }, 'ctrl_ponto_processar_jornada');
}

/**
 * Processa todas as jornadas de um colaborador em um período.
 * @param {object} params — { colaboradorId?, dataInicio, dataFim }
 */
function ctrl_ponto_processar_periodo(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    var colabId = params.colaboradorId || ctx.email;
    if (!params.dataInicio || !params.dataFim)
      throw new Error('dataInicio e dataFim obrigatórios.');
    return JornadaEngine.processarPeriodo(ctx.orgId, colabId, params.dataInicio, params.dataFim);
  }, 'ctrl_ponto_processar_periodo');
}

/**
 * Retorna o espelho de ponto mensal de um colaborador.
 * Cada dia do mês com batidas, tipos derivados, status e horas.
 * @param {object} params — { colaboradorId?, ano?, mes? }
 */
function ctrl_ponto_espelho_mensal(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    var colabIdResolvido = _resolverColabId(ctx.orgId, params.colaboradorId || ctx.email);
    var meuIdResolvido   = _resolverColabId(ctx.orgId, ctx.email);
    if (colabIdResolvido !== meuIdResolvido && colabIdResolvido !== ctx.email &&
        ['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    var agora = new Date();
    var ano   = Number(params.ano  || agora.getFullYear());
    var mes   = Number(params.mes  || agora.getMonth() + 1);
    return JornadaEngine.calcularEspelho(ctx.orgId, colabIdResolvido, ano, mes);
  }, 'ctrl_ponto_espelho_mensal');
}

/**
 * Retorna jornada de um dia específico (já processada).
 * @param {object} params — { colaboradorId?, data }
 */
function ctrl_ponto_obter_jornada(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    var colabId = _resolverColabId(ctx.orgId, params.colaboradorId || ctx.email);
    if (colabId !== ctx.email && _resolverColabId(ctx.orgId, ctx.email) !== colabId &&
        ['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    if (!params.data) throw new Error('data obrigatória.');
    return JornadaRepository.obterPorColaboradorData(ctx.orgId, colabId, params.data);
  }, 'ctrl_ponto_obter_jornada');
}

// ─── Reprocessamento de jornadas ─────────────────────────────────────────────

/**
 * Reprocessa jornadas a partir dos registros normalizados ativos em
 * ponto_normalizado.json. Idempotente — pode ser rodado a qualquer momento
 * para reconstruir jornadas.json sem re-importar o arquivo AFD.
 *
 * Necessário quando sessões foram confirmadas antes da correção que adicionou
 * a chamada a JornadaEngine.processarDia() no confirmarImportacao.
 */
function ctrl_ponto_reprocessar_jornadas(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — papel rh/admin+ necessário.');

    // BATCH: lê uma vez, calcula em memória, persiste em 2 operações
    var ativos = (lerJSON('ponto_normalizado.json') || []).filter(function(r) {
      return r.orgId === ctx.orgId && r.status === 'ativo' && r.colaboradorId && r.data;
    });

    // calcularJornadasLote deriva tipos E/I/R/S in-place nos registros
    var jornadas = JornadaEngine.calcularJornadasLote(ctx.orgId, ativos);

    // Persiste tipos atualizados — 1 modifyJSON
    modifyJSON('ponto_normalizado.json', function(lista) {
      if (!Array.isArray(lista)) return lista;
      var mapaAtivos = {};
      ativos.forEach(function(r){ mapaAtivos[r.id] = r; });
      lista.forEach(function(r) {
        if (mapaAtivos[r.id]) r.tipo = mapaAtivos[r.id].tipo;
      });
      return lista;
    });

    // Salva todas as jornadas em 1 modifyJSON
    var processadas = 0, erros = 0;
    if (jornadas.length > 0) {
      try {
        JornadaRepository.salvarLote(ctx.orgId, jornadas);
        processadas = jornadas.length;
      } catch(e) {
        erros = jornadas.length;
        Logger.warn('ponto_controller', 'reprocessar_jornadas', e.message);
      }
      // Recalcula banco de horas com base nas jornadas reprocessadas (idempotente)
      try { JornadaEngine.atualizarBHDosLotes(ctx.orgId, jornadas); } catch(e) {}
    }

    AuditoriaService.registrar('PONTO_JORNADAS_REPROCESSADAS', 'ponto',
      { registrosAtivos: ativos.length, processadas: processadas, erros: erros }, ctx.email);
    return { processadas: processadas, erros: erros, registrosAtivos: ativos.length };
  }, 'ctrl_ponto_reprocessar_jornadas');
}

/**
 * Recalcula o banco de horas de todos os colaboradores a partir do zero.
 * Executar manualmente no GAS Editor após migração ou correção massiva.
 */
function ctrl_ponto_recalcular_bh_todos(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxPonto();
    if (['admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — papel admin+ necessário.');
    var colabs = (lerJSON('colaboradores.json') || [])
      .filter(function(c){ return c.orgId === ctx.orgId && c.ativo !== false; });
    var resultados = [];
    colabs.forEach(function(c) {
      try {
        var r = JornadaEngine.recalcularBHCompleto(ctx.orgId, c.id);
        resultados.push({ colaboradorId: c.id, nome: c.nome, jornadas: r.jornadas, ok: true });
      } catch(e) {
        resultados.push({ colaboradorId: c.id, nome: c.nome, ok: false, erro: e.message });
      }
    });
    AuditoriaService.registrar('PONTO_BH_RECALCULADO_TODOS', 'ponto',
      { total: colabs.length }, ctx.email);
    return { total: colabs.length, resultados: resultados };
  }, 'ctrl_ponto_recalcular_bh_todos');
}

// ─── Lista de colaboradores para filtros ─────────────────────────────────────

/**
 * Retorna colaboradores ativos + setores disponíveis para popular os selects
 * de filtro do espelho e outras telas de ponto.
 * Qualquer papel autenticado pode chamar; a restrição de quem vê o quê
 * é aplicada nos controllers de espelho/jornada.
 */
function ctrl_ponto_listar_colaboradores(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxPonto();
    var todos = lerJSON('colaboradores.json') || [];
    var colaboradores = todos
      .filter(function(c){ return c.orgId === ctx.orgId && c.ativo !== false && c.status !== 'inativo'; })
      .map(function(c){ return { id: c.id, nome: c.nome || '', nomeApelido: c.nomeApelido || c.apelido || '', setor: c.setor || '', emailInstitucional: c.emailInstitucional || '', horasSemanais: c.horasSemanais || 40 }; })
      .sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||'','pt-BR'); });
    var setores = [];
    try { setores = SistemaConfigService.getSetores(ctx.orgId) || []; } catch(_) {}
    // Fallback: extrair setores únicos dos próprios colaboradores
    if (!setores.length) {
      var vistos = {};
      colaboradores.forEach(function(c){ if (c.setor && !vistos[c.setor]) { vistos[c.setor] = 1; setores.push({ id: c.setor, nome: c.setor }); } });
    }
    setores = setores.slice().sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||'','pt-BR'); });
    return { colaboradores: colaboradores, setores: setores };
  }, 'ctrl_ponto_listar_colaboradores');
}

/**
 * Totais consolidados de ponto para um colaborador em múltiplos períodos.
 * @param {object} params — { colaboradorId }
 * Retorna: { mensal, anoVigente, ultimos12Meses, desdeAdmissao } — cada um com
 *   { totalMinutos, totalExtras, minutosFaltantes, diasTrabalhados, diasAusentes }
 */
function ctrl_ponto_consolidado(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    var colaboradorId = _resolverColabId(ctx.orgId, params.colaboradorId || ctx.email);
    var meuId = _resolverColabId(ctx.orgId, ctx.email);
    if (colaboradorId !== meuId && ['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');

    var hoje  = new Date();
    var anoH  = hoje.getFullYear();
    var mesH  = hoje.getMonth() + 1;

    // Data de admissão, carga e regime do colaborador
    var admissaoISO = null, horasSemC = 40, regimeC = 'diario';
    try {
      var colabs = lerJSON('colaboradores.json') || [];
      for (var ci = 0; ci < colabs.length; ci++) {
        if (colabs[ci].id === colaboradorId && colabs[ci].orgId === ctx.orgId) {
          admissaoISO = colabs[ci].dataAdmissao || null;
          horasSemC   = colabs[ci].horasSemanais || 40;
          regimeC     = (colabs[ci].regimeApuracao === 'semanal') ? 'semanal' : 'diario';
          break;
        }
      }
    } catch(_) {}
    var mapaHorasC = {};  mapaHorasC[colaboradorId]  = horasSemC;
    var mapaRegimeC = {}; mapaRegimeC[colaboradorId] = regimeC;

    function _pad(n) { return String(n).padStart(2,'0'); }
    function _ultimoDia(y, m) {
      return y + '-' + _pad(m) + '-' + new Date(y, m, 0).getDate();
    }

    // Calcula totais de normalizados em um período
    function _totais(dataInicio, dataFim) {
      var regs = PontoRepository.listarPorColaborador(ctx.orgId, colaboradorId, dataInicio, dataFim)
        .filter(function(r){ return r.status !== 'revertido'; });
      if (!regs.length) return { totalMinutos: 0, totalExtras: 0, minutosFaltantes: 0, diasTrabalhados: 0, diasAusentes: 0 };
      var jornadas = JornadaEngine.calcularJornadasLote(ctx.orgId, regs, mapaHorasC, mapaRegimeC);
      var totMin = 0, totExt = 0, totFalt = 0, dias = 0;
      jornadas.forEach(function(j) {
        totMin  += j.minutosTrabalho   || 0;
        totExt  += j.minutosExtras     || 0;
        totFalt += j.minutosFaltantes  || 0;
        if (j.statusJornada !== 'ausente') dias++;
      });
      if (regimeC === 'semanal') {
        // Extras/faltantes fecham por semana; semanas em andamento ficam de fora
        var hojeISO_ = new Date().toISOString().slice(0,10);
        totExt = 0; totFalt = 0;
        JornadaEngine.agruparSemanas(jornadas, Math.round(horasSemC * 60)).forEach(function(s) {
          if (s.fimSemana >= hojeISO_) return;
          if (s.delta > 0) totExt += s.delta; else totFalt += -s.delta;
        });
      }
      // Dias ausentes úteis (seg-sex) no período
      var ausentes = 0;
      var d = new Date(dataInicio + 'T12:00:00Z');
      var fimD = new Date(dataFim + 'T12:00:00Z');
      while (d <= fimD) {
        var dow = d.getUTCDay();
        if (dow >= 1 && dow <= 5) ausentes++;
        d.setUTCDate(d.getUTCDate() + 1);
      }
      ausentes = Math.max(0, ausentes - dias);
      return { totalMinutos: totMin, totalExtras: totExt, minutosFaltantes: totFalt, diasTrabalhados: dias, diasAusentes: ausentes };
    }

    // Mensal: mês atual
    var mensal = _totais(anoH + '-' + _pad(mesH) + '-01', _ultimoDia(anoH, mesH));

    // Ano vigente: 01/01/ano_atual até hoje
    var anoVigente = _totais(anoH + '-01-01', hoje.toISOString().slice(0,10));

    // Últimos 12 meses: mês-11 até mês atual
    var d12 = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);
    var ultimos12 = _totais(
      d12.getFullYear() + '-' + _pad(d12.getMonth()+1) + '-01',
      hoje.toISOString().slice(0,10)
    );

    // Desde admissão (ou máximo 5 anos se sem data de admissão)
    var inicioAdmissao = admissaoISO
      ? admissaoISO.slice(0,10)
      : (anoH - 5) + '-01-01';
    var desdeAdmissao = _totais(inicioAdmissao, hoje.toISOString().slice(0,10));

    return {
      mensal:          mensal,
      anoVigente:      anoVigente,
      ultimos12Meses:  ultimos12,
      desdeAdmissao:   desdeAdmissao,
      dataAdmissao:    admissaoISO || null
    };
  }, 'ctrl_ponto_consolidado');
}

/**
 * Atualiza a carga horária semanal de um colaborador.
 * @param {object} params — { colaboradorId, horasSemanais }
 */
function ctrl_ponto_atualizar_carga_horaria(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — papel rh/admin+ necessário.');
    var horas = Number(params.horasSemanais);
    if (!horas || horas < 1 || horas > 60) throw new Error('Carga horária inválida (1–60h).');
    var regime = params.regimeApuracao;
    if (regime && ['diario','semanal'].indexOf(regime) < 0) throw new Error('Regime de apuração inválido.');
    modifyJSON('colaboradores.json', function(lista) {
      if (!Array.isArray(lista)) return lista;
      lista.forEach(function(c) {
        if (c.orgId === ctx.orgId && c.id === params.colaboradorId) {
          c.horasSemanais = horas;
          if (regime) c.regimeApuracao = regime;
        }
      });
      return lista;
    });
    AuditoriaService.registrar('PONTO_CARGA_HORARIA_ATUALIZADA', 'ponto',
      { colaboradorId: params.colaboradorId, horasSemanais: horas, regimeApuracao: regime || '' }, ctx.email);
    return { colaboradorId: params.colaboradorId, horasSemanais: horas, regimeApuracao: regime || null };
  }, 'ctrl_ponto_atualizar_carga_horaria');
}

// ─── Métricas de RH ──────────────────────────────────────────────────────────

/**
 * Métricas trabalhistas e de conformidade CLT para o painel de RH.
 * @param {object} params — { ano?, mes? } — padrão: mês corrente
 * Retorna: { periodo, resumo, porSetor, individual }
 */
function ctrl_ponto_metricas_rh(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — papel rh+ necessário.');

    var hoje  = new Date();
    var ano   = Number(params.ano  || hoje.getFullYear());
    var mes   = Number(params.mes  || (hoje.getMonth() + 1));

    function _pad(n) { return String(n).padStart(2,'0'); }
    var inicioMes = ano + '-' + _pad(mes) + '-01';
    var fimMes    = ano + '-' + _pad(mes) + '-' + new Date(ano, mes, 0).getDate();

    // Bordas de semana ISO (seg→dom) — para fechar semanas completas no regime semanal
    function _segunda(iso) {
      var p = iso.split('-');
      var d = new Date(Date.UTC(+p[0], +p[1]-1, +p[2]));
      d.setUTCDate(d.getUTCDate() + (d.getUTCDay() === 0 ? -6 : 1 - d.getUTCDay()));
      return d.toISOString().slice(0,10);
    }
    function _maisDias(iso, n) {
      var p = iso.split('-');
      var d = new Date(Date.UTC(+p[0], +p[1]-1, +p[2] + n));
      return d.toISOString().slice(0,10);
    }
    var iniExt = _segunda(inicioMes);
    var fimExt = _maisDias(_segunda(fimMes), 6);

    var colabs = (lerJSON('colaboradores.json') || [])
      .filter(function(c){ return c.orgId === ctx.orgId && c.ativo !== false && c.status !== 'inativo'; });

    var normTodos = (lerJSON('ponto_normalizado.json') || [])
      .filter(function(r){ return r.orgId === ctx.orgId && r.status !== 'revertido' && r.data >= iniExt && r.data <= fimExt; });

    var bhTodos = lerJSON('banco_horas.json') || [];

    // Mapas por colaborador: carga real e regime de apuração (1 passada, passados ao engine)
    var mapaHoras = {}, mapaRegime = {};
    colabs.forEach(function(c) {
      if (c.horasSemanais) mapaHoras[c.id] = c.horasSemanais;
      mapaRegime[c.id] = (c.regimeApuracao === 'semanal') ? 'semanal' : 'diario';
    });
    var diasNoMes = new Date(ano, mes, 0).getDate();

    // CLT thresholds
    var MAX_JORNADA_DIA_MIN  = 600; // 10h
    var MAX_BH_MIN           = 2400; // 40h
    var MAX_EXTRA_MES_MIN    = 12000; // ~200h (CLT Art 59)
    var INTRAJORNADA_MIN_MIN = 60; // < 6h = sem intervalo; 6-8h = 15min; >8h = 60min

    // helpers
    function _bh(id) { var b = bhTodos.filter(function(x){ return x.orgId === ctx.orgId && x.colaboradorId === id; })[0]; return b ? (b.saldoMinutos || 0) : 0; }
    function _toHM(m) { if (!m && m !== 0) return '0h00'; var s = m < 0 ? '-' : ''; m = Math.abs(m); return s + Math.floor(m/60) + 'h' + _pad(m%60); }

    var resumo = { totalAtivos: colabs.length, cumpriramCarga: 0, naoCumpriramCarga: 0, pctCumprimento: 0, totalMinutos: 0, totalExtras: 0, totalFaltantes: 0, saldoBHTotal: 0 };
    var setorMap = {};
    var individual = [];

    colabs.forEach(function(c) {
      var horasSem   = c.horasSemanais || 40;
      var regime     = mapaRegime[c.id] || 'diario';
      var minMensal  = regime === 'semanal'
        ? Math.round(horasSem * 60 * diasNoMes / 7)
        : Math.round(horasSem / 5 * 22 * 60);
      var regsExt    = normTodos.filter(function(r){ return r.colaboradorId === c.id; });
      var regs       = regsExt.filter(function(r){ return r.data >= inicioMes && r.data <= fimMes; });
      var jornadas   = regs.length ? JornadaEngine.calcularJornadasLote(ctx.orgId, regs, mapaHoras, mapaRegime) : [];

      var totMin = 0, totExt = 0, totFalt = 0, diasTrab = 0;
      var jornadasLongas = 0, diasSemIntervalo = 0;
      var jornadasLongasDatas = [], semIntervaloDatas = [];
      jornadas.forEach(function(j) {
        totMin  += j.minutosTrabalho  || 0;
        totExt  += j.minutosExtras    || 0;
        totFalt += j.minutosFaltantes || 0;
        if (j.statusJornada !== 'ausente') diasTrab++;
        if ((j.minutosTrabalho || 0) > MAX_JORNADA_DIA_MIN) {
          jornadasLongas++;
          if (jornadasLongasDatas.length < 8) jornadasLongasDatas.push({ data: j.data, minutos: j.minutosTrabalho || 0 });
        }
        // Intervalo intrajornada: se > 8h sem pausa > 60min → risco CLT
        if ((j.minutosTrabalho || 0) > 480 && (j.minutosIntervalo || 0) < INTRAJORNADA_MIN_MIN) {
          diasSemIntervalo++;
          if (semIntervaloDatas.length < 8) semIntervaloDatas.push({ data: j.data, minutos: j.minutosTrabalho || 0, intervalo: j.minutosIntervalo || 0 });
        }
      });

      // Regime semanal: extras/faltantes fecham por semana completa (dias têm 0).
      // Semanas em andamento não contam — evita falta artificial no meio da semana.
      if (regime === 'semanal' && regsExt.length) {
        var jornadasExt = JornadaEngine.calcularJornadasLote(ctx.orgId, regsExt, mapaHoras, mapaRegime);
        var hojeISO = new Date().toISOString().slice(0,10);
        totExt = 0; totFalt = 0;
        JornadaEngine.agruparSemanas(jornadasExt, Math.round(horasSem * 60)).forEach(function(s) {
          if (s.fimSemana < inicioMes || s.inicioSemana > fimMes) return;   // fora do mês
          if (s.fimSemana >= hojeISO) return;                              // em andamento
          if (s.delta > 0) totExt += s.delta; else totFalt += -s.delta;
        });
      }

      var bhSaldo    = _bh(c.id);
      var cumpriu    = totMin >= minMensal * 0.9;
      var excessoBH  = bhSaldo > MAX_BH_MIN;
      var extraExces = totExt > MAX_EXTRA_MES_MIN;
      var riscoCLT   = jornadasLongas > 0 || diasSemIntervalo > 0 || excessoBH || extraExces;

      if (cumpriu) resumo.cumpriramCarga++; else resumo.naoCumpriramCarga++;
      resumo.totalMinutos   += totMin;
      resumo.totalExtras    += totExt;
      resumo.totalFaltantes += totFalt;
      resumo.saldoBHTotal   += bhSaldo;

      // Por setor
      var setor = c.setor || 'Sem setor';
      if (!setorMap[setor]) setorMap[setor] = { setor: setor, total: 0, cumpriram: 0, naoCumpriram: 0, totalMinutos: 0, totalExtras: 0, saldoBH: 0, riscoCLT: 0 };
      var sm = setorMap[setor];
      sm.total++;
      if (cumpriu) sm.cumpriram++; else sm.naoCumpriram++;
      sm.totalMinutos += totMin;
      sm.totalExtras  += totExt;
      sm.saldoBH      += bhSaldo;
      if (riscoCLT) sm.riscoCLT++;

      individual.push({
        id:               c.id,
        nome:             c.nome || '',
        nomeApelido:      c.nomeApelido || '',
        setor:            setor,
        regime:           regime,
        horasSemanais:    horasSem,
        metaMensal:       _toHM(minMensal),
        realizado:        _toHM(totMin),
        extras:           _toHM(totExt),
        faltantes:        _toHM(totFalt),
        diasTrabalhados:  diasTrab,
        saldoBH:          _toHM(bhSaldo),
        cumpriu:          cumpriu,
        jornadasLongas:   jornadasLongas,
        diasSemIntervalo: diasSemIntervalo,
        excessoBH:        excessoBH,
        extraExcessivo:   extraExces,
        riscoCLT:         riscoCLT,
        jornadasLongasDatas: jornadasLongasDatas,
        semIntervaloDatas:   semIntervaloDatas
      });
    });

    if (resumo.totalAtivos > 0)
      resumo.pctCumprimento = Math.round(resumo.cumpriramCarga / resumo.totalAtivos * 100);

    var porSetor = Object.keys(setorMap).sort().map(function(s) {
      var sm = setorMap[s];
      sm.pctCumprimento = sm.total > 0 ? Math.round(sm.cumpriram / sm.total * 100) : 0;
      sm.totalMinutosHM = _toHM(sm.totalMinutos);
      sm.totalExtrasHM  = _toHM(sm.totalExtras);
      sm.saldoBHHM      = _toHM(sm.saldoBH);
      return sm;
    });

    individual.sort(function(a,b){ return a.nome.localeCompare(b.nome,'pt-BR'); });

    return {
      periodo:    { ano: ano, mes: mes, inicioMes: inicioMes, fimMes: fimMes },
      resumo:     resumo,
      porSetor:   porSetor,
      individual: individual
    };
  }, 'ctrl_ponto_metricas_rh');
}

// ─── Tendências RH — evolução mensal ─────────────────────────────────────────

function ctrl_ponto_tendencias_rh(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — papel rh+ necessário.');

    var nMeses = Math.min(Math.max(Number(params.meses || 6), 2), 12);

    function _pad(n) { return String(n).padStart(2,'0'); }
    function _toHM(m) { if (!m && m !== 0) return '0h00'; var s = m < 0 ? '-' : ''; m = Math.abs(m); return s + Math.floor(m/60) + 'h' + _pad(m%60); }

    var colabs = (lerJSON('colaboradores.json') || [])
      .filter(function(c){ return c.orgId === ctx.orgId && c.ativo !== false && c.status !== 'inativo'; });

    var mapaHoras = {}, mapaRegime = {};
    colabs.forEach(function(c) {
      if (c.horasSemanais) mapaHoras[c.id] = c.horasSemanais;
      mapaRegime[c.id] = (c.regimeApuracao === 'semanal') ? 'semanal' : 'diario';
    });

    var normTodos = (lerJSON('ponto_normalizado.json') || [])
      .filter(function(r){ return r.orgId === ctx.orgId && r.status !== 'revertido'; });

    var hoje = new Date();
    var tendencias = [];
    var porColaborador = {}; // id → [{label,mes,ano,totalMinutos,totalMinutosHM,cumpriu,pctCarga}]

    for (var i = nMeses - 1; i >= 0; i--) {
      var d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      var ano = d.getFullYear();
      var mes = d.getMonth() + 1;
      var ini = ano + '-' + _pad(mes) + '-01';
      var fim = ano + '-' + _pad(mes) + '-' + new Date(ano, mes, 0).getDate();
      var lbl = _pad(mes) + '/' + String(ano).slice(2);

      var regsDoMes = normTodos.filter(function(r){ return r.data >= ini && r.data <= fim; });

      var totMin = 0, totExt = 0, cumpr = 0, ativosNo = 0;

      colabs.forEach(function(c) {
        var regsColab = regsDoMes.filter(function(r){ return r.colaboradorId === c.id; });
        if (!regsColab.length) return;
        ativosNo++;
        var jornadas = JornadaEngine.calcularJornadasLote(ctx.orgId, regsColab, mapaHoras, mapaRegime);
        var cMin = 0, cExt = 0;
        jornadas.forEach(function(j){ cMin += j.minutosTrabalho||0; cExt += j.minutosExtras||0; });
        var regimeC = mapaRegime[c.id] || 'diario';
        if (regimeC === 'semanal') {
          // Extras do mês = soma dos deltas positivos das semanas do mês
          cExt = 0;
          JornadaEngine.agruparSemanas(jornadas, Math.round((c.horasSemanais||40) * 60)).forEach(function(s) {
            if (s.delta > 0) cExt += s.delta;
          });
        }
        var diasMes = new Date(ano, mes, 0).getDate();
        var meta = regimeC === 'semanal'
          ? Math.round((c.horasSemanais||40) * 60 * diasMes / 7)
          : Math.round((c.horasSemanais||40) / 5 * 22 * 60);
        var cumpriu = cMin >= meta * 0.9;
        if (cumpriu) cumpr++;
        totMin += cMin;
        totExt += cExt;
        if (!porColaborador[c.id]) porColaborador[c.id] = [];
        porColaborador[c.id].push({ label: lbl, mes: mes, ano: ano, totalMinutos: cMin, totalMinutosHM: _toHM(cMin), totalExtras: cExt, totalExtrasHM: _toHM(cExt), cumpriu: cumpriu, pctCarga: meta > 0 ? Math.round(cMin/meta*100) : 0 });
      });

      tendencias.push({ label: lbl, ano: ano, mes: mes, ativos: ativosNo, pctCumprimento: ativosNo > 0 ? Math.round(cumpr/ativosNo*100) : 0, totalMinutos: totMin, totalHorasHM: _toHM(totMin), totalExtras: totExt, totalExtrasHM: _toHM(totExt), cumpriram: cumpr });
    }

    return { tendencias: tendencias, porColaborador: porColaborador };
  }, 'ctrl_ponto_tendencias_rh');
}

// ─── Diagnóstico de normalizados ─────────────────────────────────────────────

/**
 * Retorna um resumo de normalizados por colaborador e por mês.
 * Útil para depurar quando o espelho exibe "Ausente" inesperadamente.
 * Acesso restrito a admin/superadmin.
 */
function ctrl_ponto_diagnostico(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxPonto();
    if (['admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — papel admin+ necessário.');
    var todos = lerJSON('ponto_normalizado.json') || [];
    var orgRecs = todos.filter(function(r){ return r.orgId === ctx.orgId; });
    var ativos    = orgRecs.filter(function(r){ return r.status !== 'revertido'; }).length;
    var revertidos = orgRecs.filter(function(r){ return r.status === 'revertido'; }).length;
    // Agrupa: colaboradorId → { nome, meses: {YYYY-MM: count} }
    var colabs = lerJSON('colaboradores.json') || [];
    var nomeMap = {};
    colabs.forEach(function(c){ if(c.orgId === ctx.orgId) nomeMap[c.id] = c.nome || c.id; });
    var porColab = {};
    orgRecs.filter(function(r){ return r.status !== 'revertido' && r.colaboradorId && r.data; })
      .forEach(function(r) {
        var mes = r.data.substring(0, 7);
        if (!porColab[r.colaboradorId]) porColab[r.colaboradorId] = { nome: nomeMap[r.colaboradorId] || r.colaboradorId, meses: {} };
        porColab[r.colaboradorId].meses[mes] = (porColab[r.colaboradorId].meses[mes] || 0) + 1;
      });
    var resumo = Object.keys(porColab).sort().map(function(id) {
      var c = porColab[id];
      return { colaboradorId: id, nome: c.nome, meses: c.meses };
    });
    return { totalOrgId: orgRecs.length, ativos: ativos, revertidos: revertidos, porColaborador: resumo };
  }, 'ctrl_ponto_diagnostico');
}

// ─── Vínculos colaborador ↔ usuário do sistema ───────────────────────────────

/**
 * Lista colaboradores importados via AFD que ainda não têm emailInstitucional
 * definido (sem vínculo com usuário do sistema). Retorna também a lista de
 * usuários ativos para popular o select de vínculo manual.
 */
function ctrl_ponto_listar_sem_vinculo(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — papel rh/admin+ necessário.');
    var colabs = lerJSON('colaboradores.json') || [];
    var semVinculo = colabs.filter(function(c) {
      return c.orgId === ctx.orgId &&
             c.origem === 'afd_import' &&
             !c.emailInstitucional;
    }).map(function(c) {
      return { id: c.id, nome: c.nome, pis: c.pis || '', criadoEm: c.criadoEm || '' };
    }).sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||'','pt-BR'); });
    var usuarios = (lerJSON('usuarios_acesso.json') || [])
      .filter(function(u){ return u.status === 'ativo'; })
      .map(function(u){ return { email: u.email, nome: u.nome || u.email }; });
    return { colaboradores: semVinculo, usuarios: usuarios };
  }, 'ctrl_ponto_listar_sem_vinculo');
}

/**
 * Vincula manualmente um colaborador a um usuário do sistema.
 * Define emailInstitucional no registro do colaborador.
 * @param {object} params — { colaboradorId, emailInstitucional }
 */
function ctrl_ponto_vincular_colaborador(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    if (!params.colaboradorId) throw new Error('colaboradorId obrigatório.');
    if (!params.emailInstitucional) throw new Error('emailInstitucional obrigatório.');
    var atualizado = false;
    modifyJSON('colaboradores.json', function(lista) {
      if (!Array.isArray(lista)) return lista;
      var idx = lista.findIndex(function(c){
        return c.id === params.colaboradorId && c.orgId === ctx.orgId;
      });
      if (idx < 0) throw new Error('Colaborador não encontrado: ' + params.colaboradorId);
      lista[idx] = Object.assign({}, lista[idx], {
        emailInstitucional: params.emailInstitucional,
        vinculoManual:      true,
        vinculadoPor:       ctx.email,
        vinculadoEm:        new Date().toISOString()
      });
      atualizado = true;
      return lista;
    });
    AuditoriaService.registrar('COLABORADOR_VINCULADO', 'ponto', {
      colaboradorId:      params.colaboradorId,
      emailInstitucional: params.emailInstitucional
    }, ctx.email);
    return { ok: true, colaboradorId: params.colaboradorId };
  }, 'ctrl_ponto_vincular_colaborador');
}
