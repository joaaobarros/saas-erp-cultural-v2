/**
 * @file modules/parcerias/parceria_controller.gs
 * @layer modules/parcerias
 * @description Controller de Parcerias e Co-Produções.
 *
 * RBAC:
 *   Leitura:         colaborador+
 *   Criar/Editar:    coordenador, gestor, admin, superadmin
 *   Mudar status:    gestor, admin, superadmin
 *   Avaliar:         gestor, admin, superadmin
 *   Excluir:         admin, superadmin
 *
 * @depends parceria_engine.gs, parceria_repository.gs,
 *          shared/response.gs, core/services/acesso_service.gs,
 *          core/services/cache_service.gs
 */

var _CK_PAR_LISTA    = 'ctrl_parcerias_lista';
var _CK_PAR_METRICAS = 'ctrl_parcerias_metricas';

function ctrl_parcerias_listar(filtros) {
  return GasResponse.wrap(function() {
    filtros = filtros || {};
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['colaborador','coordenador','gestor','admin','superadmin']);
    var ck = _CK_PAR_LISTA + '_' + JSON.stringify(filtros);
    var cached = CacheService.get(ck);
    if (cached) return JSON.parse(cached);
    var lista = ParceriaRepository.listar(orgId, filtros);
    CacheService.set(ck, JSON.stringify(lista), 120);
    return lista;
  }, 'ctrl_parcerias_listar');
}

function ctrl_parcerias_obter(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('id obrigatório.');
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['colaborador','coordenador','gestor','admin','superadmin']);
    var p = ParceriaRepository.buscarPorId(orgId, id);
    if (!p) throw new Error('Parceria não encontrada.');
    return p;
  }, 'ctrl_parcerias_obter');
}

function ctrl_parcerias_metricas() {
  return GasResponse.wrap(function() {
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var cached = CacheService.get(_CK_PAR_METRICAS);
    if (cached) return JSON.parse(cached);
    var m = ParceriaRepository.metricas(orgId);
    CacheService.set(_CK_PAR_METRICAS, JSON.stringify(m), 120);
    return m;
  }, 'ctrl_parcerias_metricas');
}

function ctrl_parcerias_listarPorAcao(acaoId) {
  return GasResponse.wrap(function() {
    if (!acaoId) throw new Error('acaoId obrigatório.');
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['colaborador','coordenador','gestor','admin','superadmin']);
    return ParceriaRepository.listarPorAcao(orgId, acaoId);
  }, 'ctrl_parcerias_listarPorAcao');
}

function ctrl_parcerias_salvar(dados) {
  return GasResponse.wrap(function() {
    if (!dados) throw new Error('dados obrigatórios.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var p     = ParceriaEngine.salvar(orgId, dados, email);
    CacheService.invalidar(_CK_PAR_LISTA);
    CacheService.invalidar(_CK_PAR_METRICAS);
    return p;
  }, 'ctrl_parcerias_salvar');
}

function ctrl_parcerias_mudarStatus(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id || !params.status) throw new Error('id e status obrigatórios.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['gestor','admin','superadmin']);
    var p     = ParceriaEngine.mudarStatus(orgId, params.id, params.status, email, params.motivo);
    CacheService.invalidar(_CK_PAR_LISTA);
    CacheService.invalidar(_CK_PAR_METRICAS);
    return p;
  }, 'ctrl_parcerias_mudarStatus');
}

function ctrl_parcerias_vincularAcao(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id || !params.acaoId) throw new Error('id e acaoId obrigatórios.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var p = ParceriaEngine.vincularAcao(
      orgId, params.id, params.acaoId, params.acaoNome||'',
      params.papelParceiro||'', params.papelInstituicao||''
    );
    CacheService.invalidar(_CK_PAR_LISTA);
    return p;
  }, 'ctrl_parcerias_vincularAcao');
}

function ctrl_parcerias_desvincularAcao(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id || !params.acaoId) throw new Error('id e acaoId obrigatórios.');
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['gestor','admin','superadmin']);
    var p = ParceriaEngine.desvincularAcao(orgId, params.id, params.acaoId);
    CacheService.invalidar(_CK_PAR_LISTA);
    return p;
  }, 'ctrl_parcerias_desvincularAcao');
}

function ctrl_parcerias_salvarEntrega(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.parceiaId) throw new Error('parceiaId obrigatório.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var p = ParceriaEngine.salvarEntrega(orgId, params.parceiaId, params.entrega||{}, email);
    CacheService.invalidar(_CK_PAR_LISTA);
    return p;
  }, 'ctrl_parcerias_salvarEntrega');
}

function ctrl_parcerias_avaliar(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id || !params.avaliacao) throw new Error('id e avaliacao obrigatórios.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['gestor','admin','superadmin']);
    var p = ParceriaEngine.avaliar(orgId, params.id, params.avaliacao, email);
    CacheService.invalidar(_CK_PAR_LISTA);
    return p;
  }, 'ctrl_parcerias_avaliar');
}

function ctrl_parcerias_excluir(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('id obrigatório.');
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['admin','superadmin']);
    var p = ParceriaRepository.buscarPorId(orgId, id);
    if (!p) throw new Error('Parceria não encontrada.');
    if (p.status === 'ativa') throw new Error('Cancele a parceria antes de excluir.');
    ParceriaRepository.excluir(orgId, id);
    CacheService.invalidar(_CK_PAR_LISTA);
    CacheService.invalidar(_CK_PAR_METRICAS);
    return { excluido: id };
  }, 'ctrl_parcerias_excluir');
}
