/**
 * @file modules/acoes/acoes_controller.gs
 * @layer modules/acoes
 * @description Controller público de Ações Institucionais.
 *
 * RBAC:
 *   - Leitura:   todos os usuários autenticados
 *   - Criar/Editar: coordenador, gestor, admin, superadmin
 *   - Status:    coordenador+, gestor (em_execucao→concluida), admin (tudo)
 *   - Excluir:   admin, superadmin
 *
 * CQRS: leitura com cache, escrita invalida cache.
 *
 * @depends acao_repository.gs, acao_engine.gs,
 *          shared/response.gs, core/services/acesso_service.gs,
 *          core/services/cache_service.gs
 */

var _CACHE_KEY_ACOES = 'ctrl_acoes_lista';
var _CACHE_KEY_METRICAS_ACOES = 'ctrl_acoes_metricas';

// ─── Leitura ───────────────────────────────────────────────────────────────

/**
 * Lista Ações com filtros opcionais.
 * @param {Object} filtros — { status, tipo, responsavel, visibilidadePublica }
 */
function ctrl_acoes_listar(filtros) {
  return GasResponse.wrap(function() {
    filtros = filtros || {};
    var orgId = getOrgConfig().orgId;
    var cacheKey = _CACHE_KEY_ACOES + '_' + JSON.stringify(filtros);

    var cached = CacheService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    var lista = AcaoRepository.listar(orgId, filtros);
    CacheService.set(cacheKey, JSON.stringify(lista), 120);
    return lista;
  }, 'ctrl_acoes_listar');
}

/**
 * Obtém uma Ação pelo ID com dados completos.
 * @param {string} id
 */
function ctrl_acoes_obter(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('ID obrigatório.');
    var orgId = getOrgConfig().orgId;
    var acao  = AcaoRepository.buscarPorId(orgId, id);
    if (!acao) throw new Error('Ação não encontrada: ' + id);
    return acao;
  }, 'ctrl_acoes_obter');
}

/**
 * Retorna métricas consolidadas das Ações.
 */
function ctrl_acoes_metricas() {
  return GasResponse.wrap(function() {
    var orgId   = getOrgConfig().orgId;
    var cached  = CacheService.get(_CACHE_KEY_METRICAS_ACOES);
    if (cached) return JSON.parse(cached);
    var metricas = AcaoEngine.obterMetricas(orgId);
    CacheService.set(_CACHE_KEY_METRICAS_ACOES, JSON.stringify(metricas), 120);
    return metricas;
  }, 'ctrl_acoes_metricas');
}

/**
 * Retorna painel integrado de uma Ação (tarefas + reservas + contratos).
 * @param {string} acaoId
 */
function ctrl_acoes_painel(acaoId) {
  return GasResponse.wrap(function() {
    if (!acaoId) throw new Error('acaoId obrigatório.');
    var orgId  = getOrgConfig().orgId;
    var painel = AcaoEngine.obterPainelIntegrado(acaoId, orgId);
    if (!painel) throw new Error('Ação não encontrada: ' + acaoId);
    return painel;
  }, 'ctrl_acoes_painel');
}

// ─── Escrita ───────────────────────────────────────────────────────────────

/**
 * Cria ou atualiza uma Ação.
 * @param {Object} dados — { id?, nome*, tipo*, responsavel*, setor, dataInicio, dataFim, ... }
 */
function ctrl_acoes_salvar(dados) {
  return GasResponse.wrap(function() {
    var email = AcessoService.verificar();
    _assertPodeEscrever(email);

    var orgId    = getOrgConfig().orgId;
    var resultado = AcaoEngine.salvar(dados, email, orgId);
    if (!resultado.ok) throw new Error(resultado.erro || 'Erro ao salvar ação.');

    // Invalidar caches de leitura
    _invalidarCache();

    return resultado;
  }, 'ctrl_acoes_salvar');
}

/**
 * Muda o status de uma Ação.
 * @param {Object} params — { id*, novoStatus*, motivo? }
 */
function ctrl_acoes_mudar_status(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id)        throw new Error('ID obrigatório.');
    if (!params.novoStatus) throw new Error('novoStatus obrigatório.');

    var email = AcessoService.verificar();
    _assertPodeMudarStatus(email, params.novoStatus);

    var orgId     = getOrgConfig().orgId;
    var resultado = AcaoEngine.mudarStatus(
      params.id, params.novoStatus, email, params.motivo || '', orgId
    );
    if (!resultado.ok) throw new Error(resultado.erro || 'Erro ao mudar status.');

    _invalidarCache();
    return resultado;
  }, 'ctrl_acoes_mudar_status');
}

/**
 * Exclui uma Ação (somente admin/superadmin).
 * @param {string} id
 */
function ctrl_acoes_excluir(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('ID obrigatório.');
    var email = AcessoService.verificar();
    _assertPodeExcluir(email);

    var orgId     = getOrgConfig().orgId;
    var resultado = AcaoEngine.excluir(id, email, orgId);
    if (!resultado.ok) throw new Error(resultado.erro || 'Erro ao excluir ação.');

    _invalidarCache();
    return resultado;
  }, 'ctrl_acoes_excluir');
}

// ─── RBAC helpers ─────────────────────────────────────────────────────────

function _assertPodeEscrever(email) {
  var acesso = AcessoService.obterAcesso(email);
  var papeis = ['admin', 'superadmin', 'gestor', 'coordenador', 'financeiro'];
  if (papeis.indexOf((acesso.papel || '').toLowerCase()) === -1) {
    throw new Error('Sem permissão para criar/editar ações. Papel necessário: coordenador ou superior.');
  }
}

function _assertPodeMudarStatus(email, novoStatus) {
  var acesso = AcessoService.obterAcesso(email);
  var papel  = (acesso.papel || '').toLowerCase();
  var papeis = ['admin', 'superadmin', 'gestor', 'coordenador'];
  if (papeis.indexOf(papel) === -1) {
    throw new Error('Sem permissão para alterar status de ações.');
  }
}

function _assertPodeExcluir(email) {
  var acesso = AcessoService.obterAcesso(email);
  var papel  = (acesso.papel || '').toLowerCase();
  if (['admin', 'superadmin'].indexOf(papel) === -1) {
    throw new Error('Somente administradores podem excluir ações.');
  }
}

function _invalidarCache() {
  try {
    var cache = CacheService2.getScriptCache ? CacheService2.getScriptCache() :
                (typeof CacheService !== 'undefined' && CacheService.getScriptCache ?
                  CacheService.getScriptCache() : null);
    if (!cache) return;
    // Invalidar chaves conhecidas — CacheService wrapper personalizado pode não ter remove()
    var keys = [_CACHE_KEY_METRICAS_ACOES];
    keys.forEach(function(k) {
      try { cache.remove(k); } catch(_) {}
    });
  } catch(_) {}
  // Invalidar pelo wrapper CacheService (usado no resto do sistema)
  try { CacheService.invalidate(_CACHE_KEY_ACOES); }      catch(_) {}
  try { CacheService.invalidate(_CACHE_KEY_METRICAS_ACOES); } catch(_) {}
}
