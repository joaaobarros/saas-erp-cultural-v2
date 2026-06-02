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

function _ctxAcervo(papeis) {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  var papel  = acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador';
  if (papeis && papeis.indexOf(papel) === -1) throw new Error('Permissão insuficiente.');
  return { email: email, papel: papel, orgId: getOrgConfig().orgId };
}

function ctrl_acervo_listar(filtros) {
  return GasResponse.wrap(function() {
    filtros = filtros || {};
    var ctx = _ctxAcervo(['colaborador','coordenador','gestor','admin','superadmin']);
    var ck = _CK_ACERVO_LISTA + '_' + JSON.stringify(filtros);
    var cached = AppCache.get(ck);
    if (cached) return cached;
    var lista = AcervoRepository.listar(ctx.orgId, filtros);
    AppCache.set(ck, lista, 120);
    return lista;
  }, 'ctrl_acervo_listar');
}

function ctrl_acervo_listarPorAcao(acaoId) {
  return GasResponse.wrap(function() {
    if (!acaoId) throw new Error('acaoId obrigatório.');
    var ctx = _ctxAcervo(['colaborador','coordenador','gestor','admin','superadmin']);
    return AcervoRepository.listarPorAcao(ctx.orgId, acaoId);
  }, 'ctrl_acervo_listarPorAcao');
}

function ctrl_acervo_checklist(acaoId) {
  return GasResponse.wrap(function() {
    if (!acaoId) throw new Error('acaoId obrigatório.');
    var ctx = _ctxAcervo(['colaborador','coordenador','gestor','admin','superadmin']);
    return AcervoEngine.checklistEvidencias(ctx.orgId, acaoId);
  }, 'ctrl_acervo_checklist');
}

function ctrl_acervo_metricas() {
  return GasResponse.wrap(function() {
    var ctx = _ctxAcervo(['coordenador','gestor','admin','superadmin']);
    var cached = AppCache.get(_CK_ACERVO_METRICAS);
    if (cached) return cached;
    var m = AcervoRepository.metricas(ctx.orgId);
    AppCache.set(_CK_ACERVO_METRICAS, m, 120);
    return m;
  }, 'ctrl_acervo_metricas');
}

function ctrl_acervo_registrar(dados) {
  return GasResponse.wrap(function() {
    if (!dados) throw new Error('dados obrigatórios.');
    var ctx = _ctxAcervo(['coordenador','gestor','admin','superadmin']);
    var item = AcervoEngine.registrar(ctx.orgId, dados, ctx.email);
    AppCache.remove(_CK_ACERVO_LISTA);
    AppCache.remove(_CK_ACERVO_METRICAS);
    return item;
  }, 'ctrl_acervo_registrar');
}

function ctrl_acervo_atualizar(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id) throw new Error('id obrigatório.');
    var ctx = _ctxAcervo(['coordenador','gestor','admin','superadmin']);
    var item = AcervoEngine.atualizar(ctx.orgId, params.id, params, ctx.email);
    AppCache.remove(_CK_ACERVO_LISTA);
    return item;
  }, 'ctrl_acervo_atualizar');
}

function ctrl_acervo_statusLGPD(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id || !params.statusLGPD) throw new Error('id e statusLGPD obrigatórios.');
    var ctx = _ctxAcervo(['gestor','admin','superadmin']);
    var item = AcervoEngine.atualizarStatusLGPD(ctx.orgId, params.id, params.statusLGPD, params.autorizadoPor||'', ctx.email);
    AppCache.remove(_CK_ACERVO_LISTA);
    return item;
  }, 'ctrl_acervo_statusLGPD');
}

function ctrl_acervo_excluir(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('id obrigatório.');
    var ctx = _ctxAcervo(['admin','superadmin']);
    var res = AcervoEngine.excluir(ctx.orgId, id, ctx.email);
    AppCache.remove(_CK_ACERVO_LISTA);
    AppCache.remove(_CK_ACERVO_METRICAS);
    return res;
  }, 'ctrl_acervo_excluir');
}

function ctrl_acervo_exportarZip(acaoId) {
  return GasResponse.wrap(function() {
    if (!acaoId) throw new Error('acaoId obrigatório.');
    var ctx = _ctxAcervo(['coordenador','gestor','admin','superadmin']);
    return AcervoEngine.prepararExportacaoZip(ctx.orgId, acaoId);
  }, 'ctrl_acervo_exportarZip');
}
