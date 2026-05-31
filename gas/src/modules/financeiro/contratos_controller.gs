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
// ATIVIDADES (Plano de Trabalho)
// ═══════════════════════════════════════════════════════════════

function ctrl_contratos_salvar_atividade(idContrato, idMeta, dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode gerenciar atividades.');
    if (!idContrato || !idMeta) throw new Error('idContrato e idMeta são obrigatórios.');
    var id = ContratosEngine.salvarAtividade(idContrato, idMeta, dados || {}, ctx.email, ctx.orgId);
    return { id: id };
  }, 'ctrl_contratos_salvar_atividade');
}

function ctrl_contratos_excluir_atividade(idContrato, idMeta, idAtividade) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode excluir atividades.');
    if (!idContrato || !idMeta || !idAtividade)
      throw new Error('idContrato, idMeta e idAtividade são obrigatórios.');
    return ContratosEngine.excluirAtividade(idContrato, idMeta, idAtividade, ctx.email, ctx.orgId);
  }, 'ctrl_contratos_excluir_atividade');
}

// ═══════════════════════════════════════════════════════════════
// PESSOAL (Folha de Pagamento)
// ═══════════════════════════════════════════════════════════════

function ctrl_contratos_salvar_pessoal(idContrato, idMeta, dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode gerenciar pessoal.');
    if (!idContrato || !idMeta) throw new Error('idContrato e idMeta são obrigatórios.');
    var id = ContratosEngine.salvarPessoal(idContrato, idMeta, dados || {}, ctx.email, ctx.orgId);
    return { id: id };
  }, 'ctrl_contratos_salvar_pessoal');
}

function ctrl_contratos_excluir_pessoal(idContrato, idMeta, idPessoal) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode excluir pessoal.');
    if (!idContrato || !idMeta || !idPessoal)
      throw new Error('idContrato, idMeta e idPessoal são obrigatórios.');
    return ContratosEngine.excluirPessoal(idContrato, idMeta, idPessoal, ctx.email, ctx.orgId);
  }, 'ctrl_contratos_excluir_pessoal');
}

/**
 * Pré-visualiza o cálculo de custo de pessoal sem salvar.
 * Usado pelo formulário para exibir os campos calculados em tempo real.
 */
function ctrl_contratos_calcular_pessoal(dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_LEITURA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Acesso negado.');
    return ContratosEngine.calcularCustoPessoal(dados || {});
  }, 'ctrl_contratos_calcular_pessoal');
}

// ═══════════════════════════════════════════════════════════════
// RUBRICAS / ITENS DE DESPESA
// ═══════════════════════════════════════════════════════════════

/**
 * @param {string} idContrato
 * @param {string} idMeta
 * @param {string|null} idAtividade — null para backward compat (rubrica direta na meta)
 * @param {object} dados — inclui categoria ('custeio'|'investimento')
 */
function ctrl_contratos_salvar_rubrica(idContrato, idMeta, idAtividade, dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode gerenciar itens de despesa.');
    if (!idContrato || !idMeta) throw new Error('idContrato e idMeta são obrigatórios.');
    // Backward compat: se idAtividade for objeto, é o dado
    if (typeof idAtividade === 'object' && idAtividade !== null && !dados) {
      dados = idAtividade; idAtividade = null;
    }
    var id = ContratosEngine.salvarRubrica(idContrato, idMeta, idAtividade, dados || {}, ctx.email, ctx.orgId);
    return { id: id };
  }, 'ctrl_contratos_salvar_rubrica');
}

function ctrl_contratos_excluir_rubrica(idContrato, idMeta, idAtividade, idRubrica) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode excluir itens de despesa.');
    // Backward compat: (idContrato, idMeta, idRubrica) sem idAtividade
    if (!idRubrica) { idRubrica = idAtividade; idAtividade = null; }
    if (!idContrato || !idMeta || !idRubrica)
      throw new Error('idContrato, idMeta e idRubrica são obrigatórios.');
    return ContratosEngine.excluirRubrica(idContrato, idMeta, idAtividade, idRubrica, ctx.email, ctx.orgId);
  }, 'ctrl_contratos_excluir_rubrica');
}

// ═══════════════════════════════════════════════════════════════
// INDICADORES RESULTADOS
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

/**
 * Atualiza meta ou realizado de um mês de um indicador RESULTADOS.
 * @param {string} campo — 'meta' | 'realizado'
 */
function ctrl_contratos_atualizar_meta_mes(idContrato, idMeta, idIndicador, mes, campo, valor) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode editar indicadores.');
    if (!idContrato || !idMeta || !idIndicador || !mes)
      throw new Error('idContrato, idMeta, idIndicador e mes são obrigatórios.');
    ContratosEngine.atualizarMetaMes(idContrato, idMeta, idIndicador, mes, campo, valor, ctx.email, ctx.orgId);
    return { ok: true };
  }, 'ctrl_contratos_atualizar_meta_mes');
}

// ═══════════════════════════════════════════════════════════════
// INDICADORES GESTÃO
// ═══════════════════════════════════════════════════════════════

function ctrl_contratos_salvar_indicador_gestao(idContrato, dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode gerenciar indicadores de gestão.');
    if (!idContrato) throw new Error('idContrato é obrigatório.');
    var id = ContratosEngine.salvarIndicadorGestao(idContrato, dados || {}, ctx.email, ctx.orgId);
    return { id: id };
  }, 'ctrl_contratos_salvar_indicador_gestao');
}

function ctrl_contratos_excluir_indicador_gestao(idContrato, idIndicador) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode excluir indicadores de gestão.');
    if (!idContrato || !idIndicador)
      throw new Error('idContrato e idIndicador são obrigatórios.');
    return ContratosEngine.excluirIndicadorGestao(idContrato, idIndicador, ctx.email, ctx.orgId);
  }, 'ctrl_contratos_excluir_indicador_gestao');
}

/**
 * Atualiza meta ou realizado de um período de um indicador GESTÃO.
 * @param {string} campo — 'meta' | 'realizado'
 */
function ctrl_contratos_atualizar_meta_gestao(idContrato, idIndicador, periodo, campo, valor) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Apenas equipe financeira pode editar indicadores de gestão.');
    if (!idContrato || !idIndicador || !periodo)
      throw new Error('idContrato, idIndicador e periodo são obrigatórios.');
    ContratosEngine.atualizarMetaGestao(idContrato, idIndicador, periodo, campo, valor, ctx.email, ctx.orgId);
    return { ok: true };
  }, 'ctrl_contratos_atualizar_meta_gestao');
}

// ═══════════════════════════════════════════════════════════════
// PLANO DE CONTAS
// ═══════════════════════════════════════════════════════════════

/**
 * Gera o Plano de Contas do contrato:
 * visão consolidada de todas as despesas agrupadas por código SEPLAG.
 */
function ctrl_contratos_plano_contas(idContrato) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_LEITURA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Sem permissão para visualizar o Plano de Contas.');
    if (!idContrato) throw new Error('idContrato é obrigatório.');
    return ContratosEngine.gerarPlanoContas(idContrato, ctx.orgId);
  }, 'ctrl_contratos_plano_contas');
}

function ctrl_contratos_reordenar_metas(idContrato, ordemIds) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratos();
    var nivel = _nivelContratos(ctx.email);
    if (_ESCRITA_CONTRATOS.indexOf(nivel) === -1)
      throw new Error('Sem permissão para reordenar metas.');
    if (!idContrato) throw new Error('idContrato é obrigatório.');
    if (!Array.isArray(ordemIds)) throw new Error('ordemIds deve ser um array.');
    ContratosEngine.reordenarMetas(idContrato, ordemIds, ctx.email, ctx.orgId);
    return { ok: true };
  }, 'ctrl_contratos_reordenar_metas');
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
