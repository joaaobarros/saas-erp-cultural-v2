/**
 * @file modules/estoque/estoque_controller.gs
 * @layer modules/estoque
 * @description Bridge GAS oficial para o módulo Estoque (Fase 73).
 *
 * Nomenclatura: ctrl_estoque_*
 * Segurança:
 *   - Leitura básica (itens, métricas, saldo, pipeline, solicitações): todos os usuários ativos
 *   - Escrita de itens, entradas, saídas, transferências: infraestrutura+
 *   - Nova solicitação: todos os usuários ativos (qualquer colaborador pode solicitar)
 *   - Separar/Entregar/Cancelar solicitação: infraestrutura+
 *   - Relatórios: gestor+
 *
 * @depends modules/estoque/estoque_engine.gs (EstoqueEngine)
 *          core/services/acesso_service.gs (AcessoService)
 *          shared/response.gs (GasResponse)
 *          core/auth_session.gs (getEmailSessao)
 *          core/config.gs (getOrgConfig)
 */

// ── Helpers privados ──────────────────────────────────────────────────────────

function _ctxEstoque() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro && acesso.registro.papel ? acesso.registro.papel.toLowerCase() : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

var _NIVEL_GESTAO_ESTOQUE = ['superadmin', 'admin', 'gestor', 'infraestrutura'];
var _NIVEL_RELATORIO_ESTOQUE = ['superadmin', 'admin', 'gestor'];

function _exigirGestaoEstoque(ctx) {
  if (_NIVEL_GESTAO_ESTOQUE.indexOf(ctx.papel) === -1) {
    throw new Error('Acesso restrito à equipe de Infraestrutura ou superior.');
  }
}

function _exigirRelatorioEstoque(ctx) {
  if (_NIVEL_RELATORIO_ESTOQUE.indexOf(ctx.papel) === -1) {
    throw new Error('Acesso restrito a Gestores ou superior.');
  }
}

// ═══════════════════════════════════════════════════════════════
// ITENS DO CATÁLOGO
// ═══════════════════════════════════════════════════════════════

/**
 * Lista itens do catálogo com saldo enriquecido.
 * @param {Object} filtros { situacao?, categoria?, critico?, visivelSolicitantes?, busca? }
 */
function ctrl_estoque_listar_itens(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    return EstoqueEngine.listarItens(filtros || {}, ctx.orgId);
  }, 'ctrl_estoque_listar_itens');
}

/**
 * Cria ou atualiza um item do catálogo.
 * @param {Object} dados { id?, descricao, categoria, unidadeMedida, critico?, visivelSolicitantes?, ... }
 */
function ctrl_estoque_salvar_item(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    _exigirGestaoEstoque(ctx);
    return EstoqueEngine.salvarItem(dados || {}, ctx.email, ctx.orgId);
  }, 'ctrl_estoque_salvar_item');
}

/**
 * Métricas consolidadas do módulo de Estoque.
 */
function ctrl_estoque_metricas() {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    return EstoqueEngine.metricas(ctx.orgId);
  }, 'ctrl_estoque_metricas');
}

/**
 * Retorna saldo detalhado de um item (por depósito e local).
 * @param {string} itemId
 */
function ctrl_estoque_saldo_item(itemId) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    if (!itemId) throw new Error('itemId é obrigatório.');
    return {
      saldo:      ItemEstoqueRepository.getSaldo(itemId, ctx.orgId),
      total:      ItemEstoqueRepository.getSaldoTotal(itemId, ctx.orgId),
      disponivel: ItemEstoqueRepository.getSaldoDisponivel(itemId, ctx.orgId)
    };
  }, 'ctrl_estoque_saldo_item');
}

// ═══════════════════════════════════════════════════════════════
// MOVIMENTAÇÕES DE SALDO
// ═══════════════════════════════════════════════════════════════

/**
 * Registra entrada de estoque (compra, devolução ou ajuste positivo).
 * @param {Object} dados { itemId, depositoId, local?, quantidade, tipo?,
 *                          valorUnitario?, fornecedor?, notaFiscal?, tipoCompra?, observacoes? }
 */
function ctrl_estoque_registrar_entrada(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    _exigirGestaoEstoque(ctx);
    return EstoqueEngine.registrarEntrada(dados || {}, ctx.email, ctx.orgId);
  }, 'ctrl_estoque_registrar_entrada');
}

/**
 * Registra saída manual de estoque (ajuste negativo).
 * @param {Object} dados { itemId, depositoId, local?, quantidade, observacoes? }
 */
function ctrl_estoque_registrar_saida(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    _exigirGestaoEstoque(ctx);
    return EstoqueEngine.registrarSaida(dados || {}, ctx.email, ctx.orgId);
  }, 'ctrl_estoque_registrar_saida');
}

/**
 * Transfere quantidade entre depósitos.
 * @param {Object} dados { itemId, depositoOrigem, localOrigem?, depositoDestino, localDestino?, quantidade }
 */
function ctrl_estoque_transferir(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    _exigirGestaoEstoque(ctx);
    return EstoqueEngine.transferirEntreDepositos(dados || {}, ctx.email, ctx.orgId);
  }, 'ctrl_estoque_transferir');
}

/**
 * Pipeline de nível de estoque: itens críticos com saldo por depósito.
 */
function ctrl_estoque_pipeline() {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    return EstoqueEngine.pipelineStatus(ctx.orgId);
  }, 'ctrl_estoque_pipeline');
}

// ═══════════════════════════════════════════════════════════════
// SOLICITAÇÕES DE MATERIAL
// ═══════════════════════════════════════════════════════════════

/**
 * Cria uma nova solicitação de material.
 * Aberto a todos os colaboradores ativos.
 * @param {Object} dados { itens: [{itemId, qtdSolicitada}], setorDestino,
 *                          solicitante?, subsetorDestino?, observacoes?, reservaId? }
 */
function ctrl_estoque_nova_solicitacao(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    return EstoqueEngine.novaSolicitacao(dados || {}, ctx.email, ctx.orgId);
  }, 'ctrl_estoque_nova_solicitacao');
}

/**
 * Avança uma solicitação de pendente → separada.
 * @param {string} id — ID da solicitação
 */
function ctrl_estoque_separar_solicitacao(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    _exigirGestaoEstoque(ctx);
    if (!id) throw new Error('id é obrigatório.');
    return EstoqueEngine.separarSolicitacao(id, ctx.email, ctx.orgId);
  }, 'ctrl_estoque_separar_solicitacao');
}

/**
 * Finaliza entrega de uma solicitação separada → finalizada.
 * @param {string} id — ID da solicitação
 * @param {string} receptor — nome de quem recebeu os materiais
 */
function ctrl_estoque_entregar_solicitacao(id, receptor) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    _exigirGestaoEstoque(ctx);
    if (!id) throw new Error('id é obrigatório.');
    return EstoqueEngine.entregarSolicitacao(id, receptor || ctx.email, ctx.email, ctx.orgId);
  }, 'ctrl_estoque_entregar_solicitacao');
}

/**
 * Cancela uma solicitação (pendente ou separada).
 * @param {string} id — ID da solicitação
 * @param {string} motivo — motivo do cancelamento
 */
function ctrl_estoque_cancelar_solicitacao(id, motivo) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    _exigirGestaoEstoque(ctx);
    if (!id) throw new Error('id é obrigatório.');
    return EstoqueEngine.cancelarSolicitacao(id, motivo || '', ctx.email, ctx.orgId);
  }, 'ctrl_estoque_cancelar_solicitacao');
}

/**
 * Lista solicitações de material com filtros.
 * @param {Object} filtros { status?, setor?, solicitante?, dataInicio?, dataFim? }
 */
function ctrl_estoque_listar_solicitacoes(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    return SolicitacaoMaterialRepository.listar(filtros || {}, ctx.orgId);
  }, 'ctrl_estoque_listar_solicitacoes');
}

// ═══════════════════════════════════════════════════════════════
// RELATÓRIOS
// ═══════════════════════════════════════════════════════════════

/**
 * Relatório sintético de saídas por setor/solicitante.
 * @param {Object} filtros { dataInicio?, dataFim?, setorDestino? }
 */
function ctrl_estoque_relatorio_saidas(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    _exigirRelatorioEstoque(ctx);
    return EstoqueEngine.relatorioSaidas(filtros || {}, ctx.orgId);
  }, 'ctrl_estoque_relatorio_saidas');
}

/**
 * Relatório sintético de entradas agrupado por mês.
 * @param {Object} filtros { dataInicio?, dataFim?, itemId? }
 */
function ctrl_estoque_relatorio_entradas(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    _exigirRelatorioEstoque(ctx);
    return EstoqueEngine.relatorioEntradas(filtros || {}, ctx.orgId);
  }, 'ctrl_estoque_relatorio_entradas');
}

// ═══════════════════════════════════════════════════════════════
// PREVISÃO / PIPELINE
// ═══════════════════════════════════════════════════════════════

/**
 * Retorna previsão de estoque de todos os itens (taxa de consumo + saldo por depósito).
 * Alimenta a sub-aba Pipeline do EstoqueUI.
 * @param {number} diasHistorico — janela de análise em dias (padrão: 30)
 */
function ctrl_estoque_previsao(diasHistorico) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEstoque();
    return PrevisaoEstoqueEngine.previsaoTodosItens(ctx.orgId, diasHistorico || 30);
  }, 'ctrl_estoque_previsao');
}
