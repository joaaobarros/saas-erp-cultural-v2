/**
 * @file modules/voluntarios/voluntario_controller.gs
 * @layer modules/voluntarios
 * @description Controller de Voluntários e Alocações.
 *
 * RBAC:
 *   Leitura:               colaborador+
 *   Criar/Editar voluntário: coordenador+
 *   Alocar / Presença:     coordenador, gestor, admin, superadmin
 *   Concluir / Cancelar:   coordenador, gestor, admin, superadmin
 *   Mudar status voluntário: gestor, admin, superadmin
 *   Excluir:               admin, superadmin
 *
 * @depends voluntario_engine.gs, voluntario_repository.gs,
 *          shared/response.gs, core/services/acesso_service.gs,
 *          core/services/cache_service.gs
 */

var _CK_VOL_LISTA    = 'ctrl_vol_lista';
var _CK_VOL_ALOC     = 'ctrl_vol_alocacoes';
var _CK_VOL_METRICAS = 'ctrl_vol_metricas';

// ─── Voluntários ──────────────────────────────────────────────────────────────

function ctrl_voluntarios_listar(filtros) {
  return GasResponse.wrap(function() {
    filtros = filtros || {};
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['colaborador','coordenador','gestor','admin','superadmin']);
    var ck = _CK_VOL_LISTA + '_' + JSON.stringify(filtros);
    var cached = CacheService.get(ck);
    if (cached) return JSON.parse(cached);
    var lista = VoluntarioRepository.Voluntarios.listar(orgId, filtros);
    CacheService.set(ck, JSON.stringify(lista), 120);
    return lista;
  }, 'ctrl_voluntarios_listar');
}

function ctrl_voluntarios_obter(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('id obrigatório.');
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['colaborador','coordenador','gestor','admin','superadmin']);
    var vol = VoluntarioRepository.Voluntarios.buscarPorId(orgId, id);
    if (!vol) throw new Error('Voluntário não encontrado.');
    return vol;
  }, 'ctrl_voluntarios_obter');
}

function ctrl_voluntarios_metricas() {
  return GasResponse.wrap(function() {
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var cached = CacheService.get(_CK_VOL_METRICAS);
    if (cached) return JSON.parse(cached);
    var m = VoluntarioRepository.Voluntarios.metricas(orgId);
    CacheService.set(_CK_VOL_METRICAS, JSON.stringify(m), 120);
    return m;
  }, 'ctrl_voluntarios_metricas');
}

function ctrl_voluntarios_salvar(dados) {
  return GasResponse.wrap(function() {
    if (!dados) throw new Error('dados obrigatórios.');
    var orgId  = getOrgConfig().orgId;
    var email  = AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var vol    = VoluntarioEngine.salvar(orgId, dados, email);
    CacheService.invalidar(_CK_VOL_LISTA);
    CacheService.invalidar(_CK_VOL_METRICAS);
    return vol;
  }, 'ctrl_voluntarios_salvar');
}

function ctrl_voluntarios_mudarStatus(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id || !params.status) throw new Error('id e status obrigatórios.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['gestor','admin','superadmin']);
    var vol   = VoluntarioEngine.mudarStatus(orgId, params.id, params.status, email, params.motivo);
    CacheService.invalidar(_CK_VOL_LISTA);
    CacheService.invalidar(_CK_VOL_METRICAS);
    return vol;
  }, 'ctrl_voluntarios_mudarStatus');
}

function ctrl_voluntarios_excluir(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('id obrigatório.');
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['admin','superadmin']);
    VoluntarioRepository.Voluntarios.excluir(orgId, id);
    CacheService.invalidar(_CK_VOL_LISTA);
    CacheService.invalidar(_CK_VOL_METRICAS);
    return { excluido: id };
  }, 'ctrl_voluntarios_excluir');
}

// ─── Alocações ────────────────────────────────────────────────────────────────

function ctrl_voluntarios_listarAlocacoes(filtros) {
  return GasResponse.wrap(function() {
    filtros = filtros || {};
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['colaborador','coordenador','gestor','admin','superadmin']);
    var ck = _CK_VOL_ALOC + '_' + JSON.stringify(filtros);
    var cached = CacheService.get(ck);
    if (cached) return JSON.parse(cached);
    var lista = VoluntarioRepository.Alocacoes.listar(orgId, filtros);
    CacheService.set(ck, JSON.stringify(lista), 120);
    return lista;
  }, 'ctrl_voluntarios_listarAlocacoes');
}

function ctrl_voluntarios_alocar(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.voluntarioId || !params.acaoId) throw new Error('voluntarioId e acaoId obrigatórios.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var aloc  = VoluntarioEngine.alocar(
      orgId, params.voluntarioId, params.acaoId,
      params.acaoNome||'', params.funcao||'', params.horario||'', email
    );
    CacheService.invalidar(_CK_VOL_ALOC);
    return aloc;
  }, 'ctrl_voluntarios_alocar');
}

function ctrl_voluntarios_confirmarAlocacao(alocacaoId) {
  return GasResponse.wrap(function() {
    if (!alocacaoId) throw new Error('alocacaoId obrigatório.');
    var orgId = getOrgConfig().orgId;
    // Pode ser chamado sem autenticação (link de email)
    return VoluntarioEngine.confirmarAlocacao(orgId, alocacaoId);
  }, 'ctrl_voluntarios_confirmarAlocacao');
}

function ctrl_voluntarios_registrarPresenca(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.alocacaoId) throw new Error('alocacaoId obrigatório.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var aloc  = VoluntarioEngine.registrarPresenca(orgId, params.alocacaoId, params.horas||0, email);
    CacheService.invalidar(_CK_VOL_ALOC);
    CacheService.invalidar(_CK_VOL_LISTA);
    return aloc;
  }, 'ctrl_voluntarios_registrarPresenca');
}

function ctrl_voluntarios_concluirAlocacao(alocacaoId) {
  return GasResponse.wrap(function() {
    if (!alocacaoId) throw new Error('alocacaoId obrigatório.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var aloc  = VoluntarioEngine.concluirAlocacao(orgId, alocacaoId, email);
    CacheService.invalidar(_CK_VOL_ALOC);
    return aloc;
  }, 'ctrl_voluntarios_concluirAlocacao');
}

function ctrl_voluntarios_cancelarAlocacao(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.id) throw new Error('id obrigatório.');
    var orgId = getOrgConfig().orgId;
    var email = AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var aloc  = VoluntarioEngine.cancelarAlocacao(orgId, params.id, params.motivo||'', email);
    CacheService.invalidar(_CK_VOL_ALOC);
    return aloc;
  }, 'ctrl_voluntarios_cancelarAlocacao');
}
