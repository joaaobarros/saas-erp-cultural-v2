/**
 * @file modules/acervo/acervo_controller.gs
 * @layer modules/acervo
 * @description Controller de Acervo Digital.
 *
 * RBAC:
 *   Leitura/Checklist: colaborador+
 *   Upload/Editar:     coordenador, gestor, admin, superadmin
 *   Status LGPD:       gestor, admin, superadmin
 *   Excluir:           admin, superadmin
 *
 * @depends acervo_engine.gs, acervo_repository.gs,
 *          shared/response.gs, core/services/acesso_service.gs,
 *          core/services/cache_service.gs
 */

var _CK_ACERVO_LISTA    = 'ctrl_acervo_lista';
var _CK_ACERVO_METRICAS = 'ctrl_acervo_metricas';

function ctrl_acervo_listar(filtros) {
  return GasResponse.wrap(function() {
    filtros = filtros || {};
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['colaborador','coordenador','gestor','admin','superadmin']);
    var ck = _CK_ACERVO_LISTA + '_' + JSON.stringify(filtros);
    var cached = CacheService.get(ck);
    if (cached) return JSON.parse(cached);
    var lista = AcervoRepository.listar(orgId, filtros);
    CacheService.set(ck, JSON.stringify(lista), 120);
    return lista;
  }, 'ctrl_acervo_listar');
}

function ctrl_acervo_listarPorAcao(acaoId) {
  return GasResponse.wrap(function() {
    if (!acaoId) throw new Error('acaoId obrigatório.');
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['colaborador','coordenador','gestor','admin','superadmin']);
    return AcervoRepository.listarPorAcao(orgId, acaoId);
  }, 'ctrl_acervo_listarPorAcao');
}

function ctrl_acervo_checklist(acaoId) {
  return GasResponse.wrap(function() {
    if (!acaoId) throw new Error('acaoId obrigatório.');
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['colaborador','coordenador','gestor','admin','superadmin']);
    return AcervoEngine.checklistEvidencias(orgId, acaoId);
  }, 'ctrl_acervo_checklist');
}

function ctrl_acervo_metricas() {
  return GasResponse.wrap(function() {
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var cached = CacheService.get(_CK_ACERVO_METRICAS);
    if (cached) return JSON.parse(cached);
    var m = AcervoRepository.metricas(orgId);
    CacheService.set(_CK_ACERVO_METRICAS, JSON.stringify(m), 120);
    return m;
  }, 'ctrl_acervo_metricas');
}

function ctrl_acervo_registrar(dados) {
  return GasResponse.wrap(function() {
    if (!dados) throw new Error('dados obrigatórios.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var item  = AcervoEngine.registrar(orgId, dados, email);
    CacheService.invalidar(_CK_ACERVO_LISTA);
    CacheService.invalidar(_CK_ACERVO_METRICAS);
    return item;
  }, 'ctrl_acervo_registrar');
}

function ctrl_acervo_atualizar(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id) throw new Error('id obrigatório.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var item  = AcervoEngine.atualizar(orgId, params.id, params, email);
    CacheService.invalidar(_CK_ACERVO_LISTA);
    return item;
  }, 'ctrl_acervo_atualizar');
}

function ctrl_acervo_statusLGPD(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id || !params.statusLGPD) throw new Error('id e statusLGPD obrigatórios.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['gestor','admin','superadmin']);
    var item  = AcervoEngine.atualizarStatusLGPD(orgId, params.id, params.statusLGPD, params.autorizadoPor||'', email);
    CacheService.invalidar(_CK_ACERVO_LISTA);
    return item;
  }, 'ctrl_acervo_statusLGPD');
}

function ctrl_acervo_excluir(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('id obrigatório.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['admin','superadmin']);
    var res   = AcervoEngine.excluir(orgId, id, email);
    CacheService.invalidar(_CK_ACERVO_LISTA);
    CacheService.invalidar(_CK_ACERVO_METRICAS);
    return res;
  }, 'ctrl_acervo_excluir');
}

function ctrl_acervo_exportarZip(acaoId) {
  return GasResponse.wrap(function() {
    if (!acaoId) throw new Error('acaoId obrigatório.');
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    return AcervoEngine.prepararExportacaoZip(orgId, acaoId);
  }, 'ctrl_acervo_exportarZip');
}
