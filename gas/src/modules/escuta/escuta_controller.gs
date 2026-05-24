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
