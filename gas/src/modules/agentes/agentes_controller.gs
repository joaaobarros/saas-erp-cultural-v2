/**
 * @file modules/agentes/agentes_controller.gs
 * @layer modules/agentes
 * @description Controller de Agentes Culturais.
 *
 * RBAC:
 *   Leitura:               colaborador+
 *   Criar/Editar:          habilitador, gestor, admin, superadmin
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

function _ctxAgentes(papeis) {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  var papel  = (acesso.registro && acesso.registro.papel) || 'colaborador';
  if (papeis && papeis.indexOf(papel) === -1) throw new Error('Sem permissão.');
  return { email: email, papel: papel, orgId: getOrgConfig().orgId };
}

// ─── Leitura ──────────────────────────────────────────────────────────────────

function ctrl_agentes_listar(filtros) {
  return GasResponse.wrap(function() {
    filtros = filtros || {};
    var ctx = _ctxAgentes(null);
    var ck = _CK_AGT_LISTA + '_' + JSON.stringify(filtros);
    var cached = AppCache.get(ck);
    if (cached) return cached;
    var lista = AgenteCulturalRepository.listar(ctx.orgId, filtros);
    AppCache.set(ck, lista, 120);
    return lista;
  }, 'ctrl_agentes_listar');
}

function ctrl_agentes_obter(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('id obrigatório.');
    var ctx = _ctxAgentes(null);
    var agente = AgenteCulturalRepository.buscarPorId(ctx.orgId, id);
    if (!agente) throw new Error('Agente não encontrado.');
    return agente;
  }, 'ctrl_agentes_obter');
}

function ctrl_agentes_metricas() {
  return GasResponse.wrap(function() {
    var ctx = _ctxAgentes(['coordenador','gestor','admin','superadmin']);
    var cached = AppCache.get(_CK_AGT_METRICAS);
    if (cached) return cached;
    var m = AgenteCulturalRepository.metricas(ctx.orgId);
    AppCache.set(_CK_AGT_METRICAS, m, 120);
    return m;
  }, 'ctrl_agentes_metricas');
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

function ctrl_agentes_salvar(dados) {
  return GasResponse.wrap(function() {
    if (!dados) throw new Error('dados obrigatórios.');
    var ctx    = _ctxAgentes(['coordenador','gestor','admin','superadmin']);
    var agente = AgenteCulturalEngine.salvar(ctx.orgId, dados, ctx.email);
    AppCache.remove(_CK_AGT_LISTA);
    AppCache.remove(_CK_AGT_METRICAS);
    return agente;
  }, 'ctrl_agentes_salvar');
}

function ctrl_agentes_mudarStatus(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id || !params.status) throw new Error('id e status obrigatórios.');
    var ctx = _ctxAgentes(['gestor','admin','superadmin']);

    var agente;
    switch (params.status) {
      case 'ativo':
        var atual = AgenteCulturalRepository.buscarPorId(ctx.orgId, params.id);
        if (!atual) throw new Error('Agente não encontrado.');
        if (atual.status === 'rascunho') {
          agente = AgenteCulturalEngine.ativar(ctx.orgId, params.id, ctx.email, params.motivo);
        } else {
          agente = AgenteCulturalEngine.reativar(ctx.orgId, params.id, ctx.email, params.motivo);
        }
        break;
      case 'suspenso':
        agente = AgenteCulturalEngine.suspender(ctx.orgId, params.id, ctx.email, params.motivo);
        break;
      case 'descredenciado':
        if (['admin','superadmin'].indexOf(ctx.papel) === -1)
          throw new Error('Apenas admin/superadmin podem descredenciar.');
        agente = AgenteCulturalEngine.descredenciar(ctx.orgId, params.id, ctx.email, params.motivo);
        break;
      default:
        throw new Error('Status inválido: ' + params.status);
    }
    AppCache.remove(_CK_AGT_LISTA);
    AppCache.remove(_CK_AGT_METRICAS);
    return agente;
  }, 'ctrl_agentes_mudarStatus');
}

function ctrl_agentes_salvarRider(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id) throw new Error('id obrigatório.');
    var ctx    = _ctxAgentes(['coordenador','gestor','admin','superadmin']);
    var agente = AgenteCulturalEngine.salvarRider(ctx.orgId, params.id, params.rider || {}, ctx.email);
    AppCache.remove(_CK_AGT_LISTA);
    return agente;
  }, 'ctrl_agentes_salvarRider');
}

function ctrl_agentes_excluir(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('id obrigatório.');
    var ctx = _ctxAgentes(['admin','superadmin']);
    var agente = AgenteCulturalRepository.buscarPorId(ctx.orgId, id);
    if (!agente) throw new Error('Agente não encontrado.');
    if (agente.status === 'ativo') throw new Error('Não é possível excluir agente ativo. Descredencie primeiro.');
    AgenteCulturalRepository.excluir(ctx.orgId, id);
    AppCache.remove(_CK_AGT_LISTA);
    AppCache.remove(_CK_AGT_METRICAS);
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
