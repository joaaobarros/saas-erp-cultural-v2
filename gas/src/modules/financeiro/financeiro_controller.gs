/**
 * @file modules/financeiro/financeiro_controller.gs
 * @layer modules/financeiro
 * @description Bridge GAS oficial para Fontes de Recurso, Remanejamentos e Aditivos.
 *
 * Fase 4 — Financeiro e Gestão de Contratos.
 *
 * RBAC:
 *   Leitura:       financeiro, gestor, admin, superadmin
 *   Escrita:       financeiro, admin, superadmin
 *   Aprovação:     financeiro (financeiro/remanejamentos), admin/superadmin (aditivos fundador)
 *   Efetivação:    admin, superadmin
 *
 * @depends modules/financeiro/fonte_recurso_engine.gs (FonteRecursoEngine)
 *          modules/financeiro/remanejamento_engine.gs (RemanejamentoEngine)
 *          modules/financeiro/aditivo_engine.gs (AditivoEngine)
 *          core/services/acesso_service.gs (AcessoService)
 *          shared/response.gs (GasResponse)
 *          core/auth_session.gs (getEmailSessao)
 *          core/config.gs (getOrgConfig)
 */

// ── Helpers compartilhados ────────────────────────────────────────

function _ctxFinanceiro() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

function _nivelFinanceiro(email) {
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

var _LEITURA_FIN  = ['superadmin', 'admin', 'financeiro', 'gestor'];
var _ESCRITA_FIN  = ['superadmin', 'admin', 'financeiro'];
var _ADMIN_FIN    = ['superadmin', 'admin'];

var _CK_FIN_FONTE_LISTA    = 'fin_fonte_lista_';
var _CK_FIN_FONTE_MET      = 'fin_fonte_met_';
var _CK_FIN_REM_LISTA      = 'fin_rem_lista_';
var _CK_FIN_REM_MET        = 'fin_rem_met_';
var _CK_FIN_ADIT_LISTA     = 'fin_adit_lista_';
var _CK_FIN_ADIT_MET       = 'fin_adit_met_';

function _invalidarCachesFinanceiro(orgId) {
  try {
    AppCache.removeAll([
      _CK_FIN_FONTE_LISTA + orgId, _CK_FIN_FONTE_MET + orgId,
      _CK_FIN_REM_LISTA   + orgId, _CK_FIN_REM_MET   + orgId,
      _CK_FIN_ADIT_LISTA  + orgId, _CK_FIN_ADIT_MET  + orgId
    ]);
  } catch(_) {}
}

// ═══════════════════════════════════════════════════════════════
// FONTES DE RECURSO — ctrl_fonte_recurso_*
// ═══════════════════════════════════════════════════════════════

function ctrl_fonte_recurso_listar(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_LEITURA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Sem permissão para visualizar fontes de recurso.');
    var ck = _CK_FIN_FONTE_LISTA + ctx.orgId + '_' + JSON.stringify(filtros || {});
    var cached = AppCache.get(ck);
    if (cached) return cached;
    var lista = FonteRecursoEngine.listar(filtros || {}, ctx.orgId);
    AppCache.set(ck, lista, 120);
    return lista;
  }, 'ctrl_fonte_recurso_listar');
}

function ctrl_fonte_recurso_metricas() {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_LEITURA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Sem permissão.');
    var ck = _CK_FIN_FONTE_MET + ctx.orgId;
    var cached = AppCache.get(ck);
    if (cached) return cached;
    var m = FonteRecursoEngine.obterMetricas(ctx.orgId);
    AppCache.set(ck, m, 120);
    return m;
  }, 'ctrl_fonte_recurso_metricas');
}

function ctrl_fonte_recurso_salvar(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ESCRITA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Apenas equipe financeira pode gerenciar fontes de recurso.');
    if (!dados || typeof dados !== 'object') throw new Error('Dados são obrigatórios.');
    var id = FonteRecursoEngine.salvar(dados, ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return { id: id };
  }, 'ctrl_fonte_recurso_salvar');
}

function ctrl_fonte_recurso_status(id, novoStatus) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ESCRITA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Apenas equipe financeira pode alterar status de fontes de recurso.');
    if (!id || !novoStatus) throw new Error('ID e novoStatus são obrigatórios.');
    var r = FonteRecursoEngine.aplicarTransicao(id, novoStatus, ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return r;
  }, 'ctrl_fonte_recurso_status');
}

function ctrl_fonte_recurso_excluir(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ADMIN_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Apenas administradores podem excluir fontes de recurso.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = FonteRecursoEngine.excluir(id, ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return r;
  }, 'ctrl_fonte_recurso_excluir');
}

// ═══════════════════════════════════════════════════════════════
// REMANEJAMENTOS — ctrl_remanejamento_*
// ═══════════════════════════════════════════════════════════════

function ctrl_remanejamento_listar(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_LEITURA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Sem permissão para visualizar remanejamentos.');
    var ck = _CK_FIN_REM_LISTA + ctx.orgId + '_' + JSON.stringify(filtros || {});
    var cached = AppCache.get(ck);
    if (cached) return cached;
    var lista = RemanejamentoEngine.listar(filtros || {}, ctx.orgId);
    AppCache.set(ck, lista, 120);
    return lista;
  }, 'ctrl_remanejamento_listar');
}

function ctrl_remanejamento_metricas() {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_LEITURA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Sem permissão.');
    var ck = _CK_FIN_REM_MET + ctx.orgId;
    var cached = AppCache.get(ck);
    if (cached) return cached;
    var m = RemanejamentoEngine.obterMetricas(ctx.orgId);
    AppCache.set(ck, m, 120);
    return m;
  }, 'ctrl_remanejamento_metricas');
}

function ctrl_remanejamento_salvar(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ESCRITA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Apenas equipe financeira pode criar remanejamentos.');
    if (!dados || typeof dados !== 'object') throw new Error('Dados são obrigatórios.');
    var id = RemanejamentoEngine.salvar(dados, ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return { id: id };
  }, 'ctrl_remanejamento_salvar');
}

function ctrl_remanejamento_submeter(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ESCRITA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Sem permissão para submeter remanejamentos.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = RemanejamentoEngine.submeter(id, ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return r;
  }, 'ctrl_remanejamento_submeter');
}

function ctrl_remanejamento_aprovar_financeiro(id, parecer) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ESCRITA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Apenas equipe financeira pode aprovar remanejamentos.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = RemanejamentoEngine.aprovarFinanceiro(id, parecer || '', ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return r;
  }, 'ctrl_remanejamento_aprovar_financeiro');
}

function ctrl_remanejamento_aprovar_direcao(id, parecer) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ADMIN_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Apenas admins podem aprovar remanejamentos pela direção.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = RemanejamentoEngine.aprovarDirecao(id, parecer || '', ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return r;
  }, 'ctrl_remanejamento_aprovar_direcao');
}

function ctrl_remanejamento_rejeitar(id, parecer) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ESCRITA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Sem permissão para rejeitar remanejamentos.');
    if (!id || !parecer) throw new Error('ID e parecer são obrigatórios.');
    var r = RemanejamentoEngine.rejeitar(id, parecer, 'financeiro', ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return r;
  }, 'ctrl_remanejamento_rejeitar');
}

function ctrl_remanejamento_efetivar(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ADMIN_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Apenas admins podem efetivar remanejamentos.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = RemanejamentoEngine.efetivar(id, ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return r;
  }, 'ctrl_remanejamento_efetivar');
}

// ═══════════════════════════════════════════════════════════════
// ADITIVOS — ctrl_aditivo_*
// ═══════════════════════════════════════════════════════════════

function ctrl_aditivo_listar(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_LEITURA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Sem permissão para visualizar aditivos.');
    var ck = _CK_FIN_ADIT_LISTA + ctx.orgId + '_' + JSON.stringify(filtros || {});
    var cached = AppCache.get(ck);
    if (cached) return cached;
    var lista = AditivoEngine.listar(filtros || {}, ctx.orgId);
    AppCache.set(ck, lista, 120);
    return lista;
  }, 'ctrl_aditivo_listar');
}

function ctrl_aditivo_metricas() {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_LEITURA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Sem permissão.');
    var ck = _CK_FIN_ADIT_MET + ctx.orgId;
    var cached = AppCache.get(ck);
    if (cached) return cached;
    var m = AditivoEngine.obterMetricas(ctx.orgId);
    AppCache.set(ck, m, 120);
    return m;
  }, 'ctrl_aditivo_metricas');
}

function ctrl_aditivo_salvar(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ESCRITA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Apenas equipe financeira pode criar aditivos.');
    if (!dados || typeof dados !== 'object') throw new Error('Dados são obrigatórios.');
    var id = AditivoEngine.salvar(dados, ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return { id: id };
  }, 'ctrl_aditivo_salvar');
}

function ctrl_aditivo_submeter_interno(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ESCRITA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Sem permissão para submeter aditivos.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = AditivoEngine.submeterInterno(id, ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return r;
  }, 'ctrl_aditivo_submeter_interno');
}

function ctrl_aditivo_aprovar_interno(id, parecer) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ESCRITA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Apenas equipe financeira pode aprovar aditivos internamente.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = AditivoEngine.aprovarInterno(id, parecer || '', ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return r;
  }, 'ctrl_aditivo_aprovar_interno');
}

function ctrl_aditivo_submeter_fundador(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ADMIN_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Apenas admins podem submeter aditivos ao fundador.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = AditivoEngine.submeterFundador(id, ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return r;
  }, 'ctrl_aditivo_submeter_fundador');
}

function ctrl_aditivo_aprovar_fundador(id, parecer) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ADMIN_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Apenas admins podem registrar aprovação do fundador.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = AditivoEngine.aprovarFundador(id, parecer || '', ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return r;
  }, 'ctrl_aditivo_aprovar_fundador');
}

function ctrl_aditivo_rejeitar(id, parecer) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ESCRITA_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Sem permissão para rejeitar aditivos.');
    if (!id || !parecer) throw new Error('ID e parecer são obrigatórios.');
    var r = AditivoEngine.rejeitar(id, parecer, ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return r;
  }, 'ctrl_aditivo_rejeitar');
}

function ctrl_aditivo_efetivar(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxFinanceiro();
    if (_ADMIN_FIN.indexOf(_nivelFinanceiro(ctx.email)) === -1)
      throw new Error('Apenas admins podem efetivar aditivos.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = AditivoEngine.efetivar(id, ctx.email, ctx.orgId);
    _invalidarCachesFinanceiro(ctx.orgId);
    return r;
  }, 'ctrl_aditivo_efetivar');
}

// ═══════════════════════════════════════════════════════════════
// MANUTENÇÃO / MIGRAÇÃO — executar manualmente no GAS Editor
// ═══════════════════════════════════════════════════════════════

function fase4_fontes_prepararIndice() {
  return GasResponse.wrap(function () {
    Logger.info('setup', 'fase4_fontes', 'fontes_recurso.json pronto (sem índice Sheet).');
    return { ok: true, mensagem: 'Fonte de recurso usa apenas JSON canônico. Nenhum índice Sheet necessário nesta fase.' };
  }, 'fase4_fontes_prepararIndice');
}

function fase4_remanejamentos_prepararIndice() {
  return GasResponse.wrap(function () {
    Logger.info('setup', 'fase4_remanejamentos', 'remanejamentos_orcamentarios.json pronto (sem índice Sheet).');
    return { ok: true, mensagem: 'Remanejamentos usam apenas JSON canônico. Nenhum índice Sheet necessário nesta fase.' };
  }, 'fase4_remanejamentos_prepararIndice');
}

function fase4_aditivos_prepararIndice() {
  return GasResponse.wrap(function () {
    Logger.info('setup', 'fase4_aditivos', 'aditivos_contratos.json pronto (sem índice Sheet).');
    return { ok: true, mensagem: 'Aditivos usam apenas JSON canônico. Nenhum índice Sheet necessário nesta fase.' };
  }, 'fase4_aditivos_prepararIndice');
}

// ── Memória de Cálculo ────────────────────────────────────────────────────────

function ctrl_contrato_adicionar_memoria_rubrica(idContrato, idMeta, idRubrica, item) {
  return GasResponse.wrap(function() {
    var ctx = _ctxFinanceiro();
    return ContratosEngine.adicionarItemMemoriaRubrica(idContrato, idMeta, idRubrica, item, ctx.email, ctx.orgId);
  }, 'ctrl_contrato_adicionar_memoria_rubrica');
}

function ctrl_contrato_remover_memoria_rubrica(idContrato, idMeta, idRubrica, itemId) {
  return GasResponse.wrap(function() {
    var ctx = _ctxFinanceiro();
    return ContratosEngine.removerItemMemoriaRubrica(idContrato, idMeta, idRubrica, itemId, ctx.email, ctx.orgId);
  }, 'ctrl_contrato_remover_memoria_rubrica');
}

// ── Histórico de Versões ──────────────────────────────────────────────────────

function ctrl_contrato_historico(idContrato) {
  return GasResponse.wrap(function() {
    var ctx = _ctxFinanceiro();
    return ContratosEngine.listarVersoes(idContrato, ctx.orgId);
  }, 'ctrl_contrato_historico');
}

function ctrl_contrato_versao(idContrato, versaoNum) {
  return GasResponse.wrap(function() {
    var ctx = _ctxFinanceiro();
    return ContratosEngine.obterVersao(idContrato, Number(versaoNum), ctx.orgId);
  }, 'ctrl_contrato_versao');
}

function ctrl_contrato_restaurar_versao(idContrato, versaoNum) {
  return GasResponse.wrap(function() {
    var ctx = _ctxFinanceiro();
    return ContratosEngine.restaurarVersao(idContrato, Number(versaoNum), ctx.email, ctx.orgId);
  }, 'ctrl_contrato_restaurar_versao');
}

// ── Nível do usuário no módulo financeiro ────────────────────────────────────

/**
 * Retorna o nível financeiro do usuário atual para controle de permissões no frontend.
 * Difere de ctrl_pessoas_meu_nivel pois conhece o papel 'financeiro'.
 */
function ctrl_financeiro_meu_nivel() {
  return GasResponse.wrap(function () {
    var email = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
    var nivel = _nivelFinanceiro(email);
    return { nivel: nivel, email: email };
  }, 'ctrl_financeiro_meu_nivel');
}

// ── Indicadores ───────────────────────────────────────────────────────────────

function ctrl_contrato_salvar_indicador(idContrato, idMeta, dados) {
  return GasResponse.wrap(function() {
    var ctx = _ctxFinanceiro();
    return ContratosEngine.salvarIndicador(idContrato, idMeta, dados, ctx.email, ctx.orgId);
  }, 'ctrl_contrato_salvar_indicador');
}

