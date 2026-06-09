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
    }

    AuditoriaService.registrar('PONTO_JORNADAS_REPROCESSADAS', 'ponto',
      { registrosAtivos: ativos.length, processadas: processadas, erros: erros }, ctx.email);
    return { processadas: processadas, erros: erros, registrosAtivos: ativos.length };
  }, 'ctrl_ponto_reprocessar_jornadas');
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
      .map(function(c){ return { id: c.id, nome: c.nome || '', setor: c.setor || '', emailInstitucional: c.emailInstitucional || '' }; })
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
