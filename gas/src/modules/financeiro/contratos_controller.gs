/**
 * @file modules/financeiro/contratos_controller.gs
 * @layer modules/financeiro
 * @description Bridge GAS oficial para o domínio Contratos.
 *
 * Funções públicas seguem o padrão ctrl_contratos_*.
 * Segurança:
 *   - Toda função autentica via getEmailSessao() + AcessoService.verificar()
 *   - Leitura: financeiro, gestor, admin, superadmin
 *   - Escrita (criar/editar): financeiro, admin, superadmin
 *   - Exclusão: apenas admin, superadmin (e apenas contratos encerrados)
 *   - Transição de status: financeiro, admin, superadmin
 *
 * @depends modules/financeiro/contratos_engine.gs (ContratosEngine)
 *          core/services/acesso_service.gs (AcessoService)
 *          shared/response.gs (GasResponse)
 *          core/auth_session.gs (getEmailSessao)
 *          core/config.gs (getOrgConfig)
 */

// ── Helpers privados do controller ───────────────────────────────────

function _ctxContratos() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

function _nivelContratos(email) {
  try {
    var r = AcessoService.verificar(email);
    if (r && r.registro) {
      var p = (r.registro.papel || '').toLowerCase();
      if (p === 'superadmin') return 'superadmin';
      if (p === 'admin')      return 'admin';
      if (p === 'financeiro') return 'financeiro';
      if (p === 'gestor')     return 'gestor';
    }
  } catch (_) {}
  return 'colaborador';
}

var _LEITURA_CONTRATOS  = ['superadmin', 'admin', 'financeiro', 'gestor'];
var _ESCRITA_CONTRATOS  = ['superadmin', 'admin', 'financeiro'];
var _EXCLUSAO_CONTRATOS = ['superadmin', 'admin'];

// ═══════════════════════════════════════════════════════════════
// CONTRATOS — LEITURA
// ═══════════════════════════════════════════════════════════════

/**
 * Lista contratos com filtros opcionais.
 */
function ctrl_contratos_listar(filtros) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_LEITURA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Sem permissão para visualizar contratos.');
    return ContratosEngine.listar(filtros || {}, ctx.orgId);
  }, 'ctrl_contratos_listar');
}

/**
 * Retorna todos os dados de um contrato (com metas, rubricas, indicadores).
 */
function ctrl_contratos_obter(id) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_LEITURA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Sem permissão para visualizar contratos.');
    if (!id) throw new Error('ID é obrigatório.');
    var c = ContratosEngine.buscarPorId(id, ctx.orgId);
    if (!c) throw new Error('Contrato não encontrado.');
    return c;
  }, 'ctrl_contratos_obter');
}

/**
 * Retorna análise financeira de um contrato.
 */
function ctrl_contratos_analisar(id) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_LEITURA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Sem permissão para analisar contratos.');
    if (!id) throw new Error('ID é obrigatório.');
    return ContratosEngine.analisarContrato(id, ctx.orgId);
  }, 'ctrl_contratos_analisar');
}

/**
 * Retorna métricas da coleção de contratos.
 */
function ctrl_contratos_metricas() {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_LEITURA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Sem permissão para visualizar métricas de contratos.');
    return ContratosEngine.obterMetricas(ctx.orgId);
  }, 'ctrl_contratos_metricas');
}

// ═══════════════════════════════════════════════════════════════
// CONTRATOS — ESCRITA
// ═══════════════════════════════════════════════════════════════

/**
 * Cria ou atualiza contrato.
 */
function ctrl_contratos_salvar(dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode gerenciar contratos.');
    if (!dados || typeof dados !== 'object') throw new Error('Dados são obrigatórios.');
    var id = ContratosEngine.salvar(dados, ctx.email, ctx.orgId);
    return { id: id };
  }, 'ctrl_contratos_salvar');
}

/**
 * Exclui contrato (apenas encerrados — preserva histórico).
 */
function ctrl_contratos_excluir(id) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_EXCLUSAO_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas administradores podem excluir contratos.');
    if (!id) throw new Error('ID é obrigatório.');
    return ContratosEngine.excluir(id, ctx.email, ctx.orgId);
  }, 'ctrl_contratos_excluir');
}

/**
 * Transição de status via FSM.
 */
function ctrl_contratos_status(id, novoStatus) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode alterar status de contratos.');
    if (!id || !novoStatus) throw new Error('ID e novoStatus são obrigatórios.');
    return ContratosEngine.aplicarTransicao(id, novoStatus, ctx.email, ctx.orgId);
  }, 'ctrl_contratos_status');
}

// ═══════════════════════════════════════════════════════════════
// METAS
// ═══════════════════════════════════════════════════════════════

function ctrl_contratos_salvar_meta(idContrato, dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode gerenciar metas.');
    if (!idContrato) throw new Error('idContrato é obrigatório.');
    var id = ContratosEngine.salvarMeta(idContrato, dados || {}, ctx.email, ctx.orgId);
    return { id: id };
  }, 'ctrl_contratos_salvar_meta');
}

function ctrl_contratos_excluir_meta(idContrato, idMeta) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode excluir metas.');
    if (!idContrato || !idMeta) throw new Error('idContrato e idMeta são obrigatórios.');
    return ContratosEngine.excluirMeta(idContrato, idMeta, ctx.email, ctx.orgId);
  }, 'ctrl_contratos_excluir_meta');
}

// ═══════════════════════════════════════════════════════════════
// RUBRICAS
// ═══════════════════════════════════════════════════════════════

function ctrl_contratos_salvar_rubrica(idContrato, idMeta, dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode gerenciar rubricas.');
    if (!idContrato || !idMeta) throw new Error('idContrato e idMeta são obrigatórios.');
    var id = ContratosEngine.salvarRubrica(idContrato, idMeta, dados || {}, ctx.email, ctx.orgId);
    return { id: id };
  }, 'ctrl_contratos_salvar_rubrica');
}

function ctrl_contratos_excluir_rubrica(idContrato, idMeta, idRubrica) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode excluir rubricas.');
    if (!idContrato || !idMeta || !idRubrica) throw new Error('idContrato, idMeta e idRubrica são obrigatórios.');
    return ContratosEngine.excluirRubrica(idContrato, idMeta, idRubrica, ctx.email, ctx.orgId);
  }, 'ctrl_contratos_excluir_rubrica');
}

// ═══════════════════════════════════════════════════════════════
// INDICADORES
// ═══════════════════════════════════════════════════════════════

function ctrl_contratos_salvar_indicador(idContrato, idMeta, dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode gerenciar indicadores.');
    if (!idContrato || !idMeta) throw new Error('idContrato e idMeta são obrigatórios.');
    var id = ContratosEngine.salvarIndicador(idContrato, idMeta, dados || {}, ctx.email, ctx.orgId);
    return { id: id };
  }, 'ctrl_contratos_salvar_indicador');
}

// ═══════════════════════════════════════════════════════════════
// MANUTENÇÃO / MIGRAÇÃO — executar manualmente no GAS Editor
// ═══════════════════════════════════════════════════════════════

/**
 * Fase 1.3 — prepara índice da aba FINANCEIRO.Contratos.
 */
function fase1_contratos_prepararIndice() {
  return GasResponse.wrap(function () {
    ContratoRepository.garantirCabecalhoIndice();
    return ContratoRepository.protegerIndice();
  }, 'fase1_contratos_prepararIndice');
}

/**
 * Fase 1.3 — migra aba Sheet → contratos.json canônico.
 * Idempotente. Metas/rubricas/indicadores ficam como [] — adicionar manualmente.
 */
function fase1_contratos_migrarSheetParaJson() {
  return GasResponse.wrap(function () {
    return ContratosEngine.migrarSheetParaJson(getOrgConfig().orgId);
  }, 'fase1_contratos_migrarSheetParaJson');
}
