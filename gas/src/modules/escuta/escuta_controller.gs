/**
 * @file escuta_controller.gs
 * @layer controller
 * @description Controllers HTTP de Escuta Institucional (clima organizacional).
 *   RBAC: leitura = todos autenticados; criar/ativar/encerrar = rh/coordenador/admin/superadmin;
 *         responder = qualquer usuário ativo.
 * @depends escuta_engine.gs, escuta_repository.gs, acesso_service.gs, response.gs
 */

// ─── Helpers de contexto ────────────────────────────────────────────────────

function _ctxEscuta() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro ? (acesso.registro.papel || 'colaborador') : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

var _PAPEIS_GESTAO_ESCUTA = ['rh','coordenador','admin','superadmin'];

function _assertGestaoEscuta(papel) {
  if (_PAPEIS_GESTAO_ESCUTA.indexOf(papel) < 0)
    throw new Error('Acesso negado. Papel necessário: ' + _PAPEIS_GESTAO_ESCUTA.join(', '));
}

// ─── Leitura ────────────────────────────────────────────────────────────────

/**
 * Lista pesquisas de clima com contagem de respostas.
 */
function ctrl_escuta_listar(params) {
  return GasResponse.wrap(function() {
    var ctx   = _ctxEscuta();
    var lista = EscutaRepository.listarPesquisas(ctx.orgId);
    var status = (params || {}).filtroStatus;
    if (status) lista = lista.filter(function(p) { return p.status === status; });
    lista = lista.map(function(p) {
      return Object.assign({}, p, {
        totalRespostas: EscutaRepository.contarRespostasPorPesquisa(ctx.orgId, p.id)
      });
    });
    return lista;
  }, 'ctrl_escuta_listar');
}

/**
 * Obtém pesquisa específica.
 */
function ctrl_escuta_obter(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxEscuta();
    var p   = EscutaRepository.buscarPesquisa(ctx.orgId, params.id);
    if (!p) throw new Error('Pesquisa não encontrada');
    return Object.assign({}, p, {
      totalRespostas: EscutaRepository.contarRespostasPorPesquisa(ctx.orgId, p.id)
    });
  }, 'ctrl_escuta_obter');
}

/**
 * Métricas rápidas (total, ativas, concluídas, evolução).
 */
function ctrl_escuta_metricas(params) {
  return GasResponse.wrap(function() {
    var ctx     = _ctxEscuta();
    var metr    = EscutaRepository.metricasPesquisas(ctx.orgId);
    var evolucao = EscutaEngine.obterEvolucaoClimaHistorica(ctx.orgId, 4);
    var ultMed  = evolucao.length > 0 ? evolucao[evolucao.length-1].mediaPonderada : null;
    return Object.assign({}, metr, { evolucao: evolucao, ultimaMedia: ultMed });
  }, 'ctrl_escuta_metricas');
}

/**
 * Catálogo de dimensões e perguntas.
 */
function ctrl_escuta_catalogo(params) {
  return GasResponse.wrap(function() {
    _ctxEscuta();   // só autentica, sem restrição de papel
    return EscutaEngine.obterCatalogoDimensoes();
  }, 'ctrl_escuta_catalogo');
}

// ─── Escrita ────────────────────────────────────────────────────────────────

/**
 * Cria ou atualiza pesquisa (rascunho).
 */
function ctrl_escuta_salvar(params) {
  return GasResponse.wrap(function() {
    params    = params || {};
    var ctx   = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);

    if (params.id) {
      var p = EscutaRepository.buscarPesquisa(ctx.orgId, params.id);
      if (!p) throw new Error('Pesquisa não encontrada');
      if (p.status !== 'rascunho') throw new Error('Apenas rascunhos podem ser editados');
      EscutaRepository.salvarPesquisa(ctx.orgId, Object.assign({}, p, params));
      return { ok: true, id: params.id };
    } else {
      var id = EscutaEngine.criarPesquisa(ctx.orgId, params, ctx.email);
      return { ok: true, id: id };
    }
  }, 'ctrl_escuta_salvar');
}

/**
 * Muda status da pesquisa (ativa / encerrada / cancelada / arquivada).
 */
function ctrl_escuta_mudar_status(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    var novoStatus = params.status;
    if (novoStatus === 'ativa')     return EscutaEngine.ativarPesquisa(ctx.orgId, params.id, ctx.email);
    if (novoStatus === 'encerrada') return EscutaEngine.encerrarPesquisa(ctx.orgId, params.id, ctx.email);
    var p = EscutaRepository.buscarPesquisa(ctx.orgId, params.id);
    if (!p) throw new Error('Pesquisa não encontrada');
    FsmGuardian.transitar('escuta', p.status, novoStatus, { id: params.id });
    p.status = novoStatus;
    EscutaRepository.salvarPesquisa(ctx.orgId, p);
    AuditoriaService.registrar('ESCUTA_' + novoStatus.toUpperCase(), 'escuta', { id: params.id }, ctx.email);
    return { ok: true };
  }, 'ctrl_escuta_mudar_status');
}

/**
 * Exclui pesquisa (admin+, apenas rascunhos).
 */
function ctrl_escuta_excluir(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();
    if (['admin','superadmin'].indexOf(ctx.papel) < 0) throw new Error('Acesso negado.');
    var p = EscutaRepository.buscarPesquisa(ctx.orgId, params.id);
    if (!p) throw new Error('Pesquisa não encontrada');
    if (p.status !== 'rascunho') throw new Error('Apenas rascunhos podem ser excluídos');
    EscutaRepository.excluirPesquisa(ctx.orgId, params.id);
    AuditoriaService.registrar('ESCUTA_EXCLUIDA', 'escuta', { id: params.id }, ctx.email);
    return { ok: true };
  }, 'ctrl_escuta_excluir');
}

// ─── Resultados e análise ────────────────────────────────────────────────────

/**
 * Calcula e retorna resultados completos de uma pesquisa.
 */
function ctrl_escuta_resultados(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    return EscutaEngine.calcularResultados(ctx.orgId, params.id);
  }, 'ctrl_escuta_resultados');
}

/**
 * Cruzamento analítico: clima × setor × absenteísmo.
 */
function ctrl_escuta_cruzamento(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    return EscutaEngine.cruzarClimaComPessoas(ctx.orgId, params.id);
  }, 'ctrl_escuta_cruzamento');
}

/**
 * Evolução histórica do clima (últimas N rodadas).
 */
function ctrl_escuta_evolucao(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    return EscutaEngine.obterEvolucaoClimaHistorica(ctx.orgId, (params || {}).ultimas || 8);
  }, 'ctrl_escuta_evolucao');
}

// ─── Resposta do colaborador ─────────────────────────────────────────────────

/**
 * Registra resposta de um colaborador à pesquisa ativa.
 */
function ctrl_escuta_registrar_resposta(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();   // qualquer usuário ativo pode responder
    return EscutaEngine.registrarResposta(
      ctx.orgId, params.pesquisaId, ctx.email, params.respostas, params.anonima
    );
  }, 'ctrl_escuta_registrar_resposta');
}

// ─── [F20] Carregamento unificado ──────────────────────────────────────────

/**
 * Carrega todos os dados da tela de Escuta em uma única chamada.
 * Retorna: metricas, governanca, pulse, participacao, alertasAtivos.
 */
function ctrl_escuta_dados(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxEscuta();
    return EscutaEngine.obterDadosUnificados(ctx.orgId);
  }, 'ctrl_escuta_dados');
}

// ─── [F20] Pulse ─────────────────────────────────────────────────────────────

/**
 * Obtém próxima pergunta pulse para o colaborador atual.
 * Respeita anti-spam (limiteDia, antiSpamHoras) e saturação.
 */
function ctrl_escuta_pulse_obter(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxEscuta();
    return EscutaPulseEngine.obterPerguntaPulse(ctx.orgId, ctx.email);
  }, 'ctrl_escuta_pulse_obter');
}

/**
 * Registra resposta a uma pergunta pulse.
 * params: { perguntaId, dimensaoId, valor (1-5), contexto? }
 */
function ctrl_escuta_pulse_responder(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();
    return EscutaPulseEngine.registrarRespostaPulse(
      ctx.orgId, ctx.email, params.perguntaId, params.dimensaoId,
      params.valor, params.contexto
    );
  }, 'ctrl_escuta_pulse_responder');
}

/**
 * Dashboard consolidado do sistema pulse (médias por dimensão, tendências).
 * params: { periodo? } — YYYY-MM, default: mês atual
 */
function ctrl_escuta_pulse_dashboard(params) {
  return GasResponse.wrap(function() {
    params   = params || {};
    var ctx  = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    var agora  = new Date();
    var periodo = params.periodo || (agora.getFullYear() + '-' + String(agora.getMonth()+1).padStart(2,'0'));
    return EscutaPulseEngine.obterDashboardPulse(ctx.orgId, periodo);
  }, 'ctrl_escuta_pulse_dashboard');
}

// ─── [F20] Escuta espontânea ─────────────────────────────────────────────────

/**
 * Registra relato espontâneo do colaborador com análise de sentimento.
 * params: { texto, dimensaoId?, anonimo? }
 */
function ctrl_escuta_espontanea_registrar(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();
    return EscutaEngine.registrarEspontanea(
      ctx.orgId, ctx.email, params.texto, params.dimensaoId, params.anonimo
    );
  }, 'ctrl_escuta_espontanea_registrar');
}

/**
 * Lista relatos espontâneos do período (RH+).
 * params: { periodo? } — YYYY-MM
 */
function ctrl_escuta_espontanea_listar(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    var agora   = new Date();
    var periodo = params.periodo || (agora.getFullYear() + '-' + String(agora.getMonth()+1).padStart(2,'0'));
    return EscutaEngine.resumoEspontanea(ctx.orgId, periodo);
  }, 'ctrl_escuta_espontanea_listar');
}

// ─── [F20] Alertas ───────────────────────────────────────────────────────────

/**
 * Lista alertas da organização (RH+).
 * params: { apenasAtivos? }
 */
function ctrl_escuta_alertas_listar(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    return EscutaRepository.listarAlertas(ctx.orgId, params.apenasAtivos !== false);
  }, 'ctrl_escuta_alertas_listar');
}

/**
 * Resolve um alerta (registra ação tomada).
 * params: { alertaId, acao }
 */
function ctrl_escuta_alertas_resolver(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    return EscutaEngine.resolverAlerta(ctx.orgId, params.alertaId, params.acao, ctx.email);
  }, 'ctrl_escuta_alertas_resolver');
}

// ─── [F20] Configuração ──────────────────────────────────────────────────────

/**
 * Obtém configuração atual do módulo de Escuta.
 */
function ctrl_escuta_config_obter(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    return EscutaEngine.obterConfigEscuta(ctx.orgId);
  }, 'ctrl_escuta_config_obter');
}

/**
 * Salva configuração do módulo (RH+).
 * params: { limiteDia?, antiSpamHoras?, confiancaMin?, notificarGestores?, ... }
 */
function ctrl_escuta_config_salvar(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    return EscutaEngine.salvarConfigEscuta(ctx.orgId, params, ctx.email);
  }, 'ctrl_escuta_config_salvar');
}

/**
 * Ativa/desativa uma pergunta do catálogo pulse (RH+).
 * params: { perguntaId, ativo }
 */
function ctrl_escuta_pergunta_toggle(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    return EscutaEngine.togglePergunta(ctx.orgId, params.perguntaId, !!params.ativo, ctx.email);
  }, 'ctrl_escuta_pergunta_toggle');
}

// ─── [F20] Perfil analítico ───────────────────────────────────────────────────

/**
 * Obtém o perfil analítico do colaborador autenticado (ou de outro se RH+).
 * params: { email? } — se omitido, usa o próprio e-mail
 */
function ctrl_escuta_perfil_obter(params) {
  return GasResponse.wrap(function() {
    params   = params || {};
    var ctx  = _ctxEscuta();
    var alvo = params.email || ctx.email;
    if (alvo !== ctx.email) _assertGestaoEscuta(ctx.papel);
    return EscutaEngine.obterPerfilAnalitico(ctx.orgId, alvo);
  }, 'ctrl_escuta_perfil_obter');
}

/**
 * Salva perfil analítico do colaborador autenticado (ou de outro se RH+).
 * params: { email?, genero?, raca?, orientacao?, faixaSalarial?, vinculo?, nivel?, tempoDeCasa?, regiao?, deficiencia? }
 */
function ctrl_escuta_perfil_salvar(params) {
  return GasResponse.wrap(function() {
    params   = params || {};
    var ctx  = _ctxEscuta();
    var alvo = params.email || ctx.email;
    if (alvo !== ctx.email) _assertGestaoEscuta(ctx.papel);
    var campos = ['genero','raca','orientacao','faixaSalarial','vinculo','nivel','tempoDeCasa','regiao','deficiencia'];
    var dados  = {};
    campos.forEach(function(c) { if (params[c] !== undefined) dados[c] = params[c]; });
    EscutaEngine.salvarPerfilAnalitico(ctx.orgId, alvo, dados, ctx.email);
    return { ok: true };
  }, 'ctrl_escuta_perfil_salvar');
}

// ─── [F20] Relatório e análises avançadas ────────────────────────────────────

/**
 * Gera relatório completo de uma pesquisa (RH+).
 * params: { pesquisaId }
 */
function ctrl_escuta_relatorio(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    return EscutaEngine.gerarRelatorio(ctx.orgId, params.pesquisaId);
  }, 'ctrl_escuta_relatorio');
}

/**
 * Painel de governança metodológica (qualidade 0-100, motor metodológico).
 * params: { pesquisaId? }
 */
function ctrl_escuta_governanca(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    return EscutaEngine.obterGovernanca(ctx.orgId, params.pesquisaId);
  }, 'ctrl_escuta_governanca');
}

/**
 * Saturação por dimensão no período (RH+).
 * params: { periodo? }
 */
function ctrl_escuta_saturacao(params) {
  return GasResponse.wrap(function() {
    params   = params || {};
    var ctx  = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    var agora   = new Date();
    var periodo = params.periodo || (agora.getFullYear() + '-' + String(agora.getMonth()+1).padStart(2,'0'));
    return EscutaEngine.obterSaturacao(ctx.orgId, periodo);
  }, 'ctrl_escuta_saturacao');
}

/**
 * Ciclo de feedback: ações tomadas (RH+).
 * params: { pesquisaId? }
 */
function ctrl_escuta_feedback(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    return EscutaEngine.obterFeedback(ctx.orgId, params.pesquisaId);
  }, 'ctrl_escuta_feedback');
}

/**
 * Participação histórica: 12 meses de pulse + espontânea (RH+).
 */
function ctrl_escuta_participacao(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    return EscutaEngine.obterParticipacaoHistorica(ctx.orgId);
  }, 'ctrl_escuta_participacao');
}

/**
 * Catálogo de perguntas pulse com estado ativo/inativo (RH+).
 */
function ctrl_escuta_banco_perguntas(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxEscuta();
    _assertGestaoEscuta(ctx.papel);
    return EscutaPulseEngine.obterCatalogoPerguntas(ctx.orgId);
  }, 'ctrl_escuta_banco_perguntas');
}

/**
 * Suprime e-mails antigos (LGPD 90 dias) — apenas superadmin.
 */
function ctrl_escuta_suprimir_emails(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxEscuta();
    if (ctx.papel !== 'superadmin') throw new Error('Acesso negado. Apenas superadmin.');
    return EscutaEngine.suprimirEmailsAntigos(ctx.orgId);
  }, 'ctrl_escuta_suprimir_emails');
}
