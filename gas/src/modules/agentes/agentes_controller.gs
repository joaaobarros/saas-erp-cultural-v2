/**
 * @file modules/agentes/agentes_controller.gs
 * @layer modules/agentes
 * @description Controller de Agentes Culturais.
 *
 * RBAC:
 *   Leitura:               colaborador, coordenador, gestor, admin, superadmin
 *   Criar/Editar:          coordenador, gestor, admin, superadmin
 *   Ativar/Suspender:      gestor, admin, superadmin
 *   Descredenciar/Excluir: admin, superadmin
 *
 * CQRS: leitura com cache (120s), escrita invalida cache.
 *
 * @depends agente_engine.gs, agente_repository.gs,
 *          shared/response.gs, core/services/acesso_service.gs,
 *          core/services/cache_service.gs
 */

var _CK_AGT_LISTA    = 'ctrl_agentes_lista';
var _CK_AGT_METRICAS = 'ctrl_agentes_metricas';

// ─── Leitura ──────────────────────────────────────────────────────────────────

function ctrl_agentes_listar(filtros) {
  return GasResponse.wrap(function() {
    filtros = filtros || {};
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['colaborador','coordenador','gestor','admin','superadmin']);
    var ck = _CK_AGT_LISTA + '_' + JSON.stringify(filtros);
    var cached = CacheService.get(ck);
    if (cached) return JSON.parse(cached);
    var lista = AgenteCulturalRepository.listar(orgId, filtros);
    CacheService.set(ck, JSON.stringify(lista), 120);
    return lista;
  }, 'ctrl_agentes_listar');
}

function ctrl_agentes_obter(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('id obrigatório.');
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['colaborador','coordenador','gestor','admin','superadmin']);
    var agente = AgenteCulturalRepository.buscarPorId(orgId, id);
    if (!agente) throw new Error('Agente não encontrado.');
    return agente;
  }, 'ctrl_agentes_obter');
}

function ctrl_agentes_metricas() {
  return GasResponse.wrap(function() {
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var cached = CacheService.get(_CK_AGT_METRICAS);
    if (cached) return JSON.parse(cached);
    var m = AgenteCulturalRepository.metricas(orgId);
    CacheService.set(_CK_AGT_METRICAS, JSON.stringify(m), 120);
    return m;
  }, 'ctrl_agentes_metricas');
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

function ctrl_agentes_salvar(dados) {
  return GasResponse.wrap(function() {
    if (!dados) throw new Error('dados obrigatórios.');
    var orgId  = getOrgConfig().orgId;
    var email  = AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var agente = AgenteCulturalEngine.salvar(orgId, dados, email);
    CacheService.invalidar(_CK_AGT_LISTA);
    CacheService.invalidar(_CK_AGT_METRICAS);
    return agente;
  }, 'ctrl_agentes_salvar');
}

function ctrl_agentes_mudarStatus(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id || !params.status) throw new Error('id e status obrigatórios.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['gestor','admin','superadmin']);

    var agente;
    switch (params.status) {
      case 'ativo':
        var atual = AgenteCulturalRepository.buscarPorId(orgId, params.id);
        if (!atual) throw new Error('Agente não encontrado.');
        if (atual.status === 'rascunho') {
          agente = AgenteCulturalEngine.ativar(orgId, params.id, email, params.motivo);
        } else {
          agente = AgenteCulturalEngine.reativar(orgId, params.id, email, params.motivo);
        }
        break;
      case 'suspenso':
        agente = AgenteCulturalEngine.suspender(orgId, params.id, email, params.motivo);
        break;
      case 'descredenciado':
        AcessoService.verificar(['admin','superadmin']);
        agente = AgenteCulturalEngine.descredenciar(orgId, params.id, email, params.motivo);
        break;
      default:
        throw new Error('Status inválido: ' + params.status);
    }
    CacheService.invalidar(_CK_AGT_LISTA);
    CacheService.invalidar(_CK_AGT_METRICAS);
    return agente;
  }, 'ctrl_agentes_mudarStatus');
}

function ctrl_agentes_salvarRider(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id) throw new Error('id obrigatório.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var agente = AgenteCulturalEngine.salvarRider(orgId, params.id, params.rider || {}, email);
    CacheService.invalidar(_CK_AGT_LISTA);
    return agente;
  }, 'ctrl_agentes_salvarRider');
}

function ctrl_agentes_excluir(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('id obrigatório.');
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['admin','superadmin']);
    var agente = AgenteCulturalRepository.buscarPorId(orgId, id);
    if (!agente) throw new Error('Agente não encontrado.');
    if (agente.status === 'ativo') throw new Error('Não é possível excluir agente ativo. Descredencie primeiro.');
    AgenteCulturalRepository.excluir(orgId, id);
    CacheService.invalidar(_CK_AGT_LISTA);
    CacheService.invalidar(_CK_AGT_METRICAS);
    return { excluido: id };
  }, 'ctrl_agentes_excluir');
}

// ─── Portal público (sem autenticação) ───────────────────────────────────────

/**
 * Recebe pré-cadastro de agente via portal externo.
 * Não requer autenticação. Cria com status 'rascunho'.
 * Rate limiting é feito pelo portal_controller.
 */
function ctrl_portal_cadastrarAgente(dados) {
  return GasResponse.wrap(function() {
    dados = dados || {};
    var orgId = getOrgConfig().orgId;
    if (!dados.nome || !dados.email) throw new Error('nome e email são obrigatórios.');
    var agente = AgenteCulturalEngine.autoCadastro(orgId, dados, dados.consentimentoId || '');
    return { ok: true, id: agente.id, protocolo: agente.id };
  }, 'ctrl_portal_cadastrarAgente');
}
