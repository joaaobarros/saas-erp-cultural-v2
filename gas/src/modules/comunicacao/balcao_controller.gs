/**
 * @file modules/comunicacao/balcao_controller.gs
 * @layer modules/comunicacao
 * @description Controllers do Balcão de Demandas — Fase 10.
 *
 * RBAC: criar = qualquer ativo; executar = comunicacao+; excluir = admin+
 *
 * @depends balcao_engine.gs, balcao_repository.gs, acesso_service.gs, gas_response.gs
 */

var _CK_BALCAO_LISTA    = 'balcao_lista_';
var _CK_BALCAO_METRICAS = 'balcao_metricas_';

function _invalidarCachesBalcao(orgId) {
  try { AppCache.remove(_CK_BALCAO_METRICAS + orgId); } catch(_) {}
  // listas são por usuário — expiram naturalmente (TTL 60s)
}

// ─── Leitura ──────────────────────────────────────────────────────────────────

function ctrl_balcao_listar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var orgId = getOrgConfig().orgId;
    var filtros = params || {};
    var papel = acesso.registro && acesso.registro.papel;
    if (!['comunicacao','gestor','coordenador','admin','superadmin'].includes(papel)) {
      filtros.demandante = email;
    }
    var ck = _CK_BALCAO_LISTA + orgId + '_' + email.replace(/[^a-z0-9]/g,'_') + '_' + JSON.stringify(filtros);
    var cached = AppCache.get(ck);
    if (cached) return cached;
    var lista = BalcaoRepository.listar(orgId, filtros);
    AppCache.set(ck, lista, 60);
    return lista;
  }, 'ctrl_balcao_listar');
}

function ctrl_balcao_obter(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var id = params && params.id;
    if (!id) throw new Error('ID obrigatório');
    var d = BalcaoRepository.buscarPorId(getOrgConfig().orgId, id);
    if (!d) throw new Error('Demanda não encontrada: ' + id);
    return d;
  }, 'ctrl_balcao_obter');
}

function ctrl_balcao_metricas(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var orgId = getOrgConfig().orgId;
    var ck = _CK_BALCAO_METRICAS + orgId;
    var cached = AppCache.get(ck);
    if (cached) return cached;
    var m = BalcaoRepository.metricas(orgId);
    AppCache.set(ck, m, 60);
    return m;
  }, 'ctrl_balcao_metricas');
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

function ctrl_balcao_salvar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var orgId = getOrgConfig().orgId;
    params = params || {};
    var r;
    if (params.id) {
      r = BalcaoEngine.atualizar(params.id, params, email, orgId);
    } else {
      if (!params.demandante) params.demandante = email;
      r = BalcaoEngine.criar(params, email, orgId);
    }
    _invalidarCachesBalcao(orgId);
    return r;
  }, 'ctrl_balcao_salvar');
}

function ctrl_balcao_mudar_status(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var id     = params && params.id;
    var status = params && params.status;
    if (!id || !status) throw new Error('ID e status obrigatórios');
    var r = BalcaoEngine.mudarStatus(id, status, params || {}, email, getOrgConfig().orgId);
    _invalidarCachesBalcao(getOrgConfig().orgId);
    return r;
  }, 'ctrl_balcao_mudar_status');
}

function ctrl_balcao_comentar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var id    = params && params.id;
    var texto = params && params.texto;
    if (!id || !texto) throw new Error('ID e texto obrigatórios');
    var r = BalcaoEngine.adicionarComentario(id, texto, email, getOrgConfig().orgId);
    _invalidarCachesBalcao(getOrgConfig().orgId);
    return r;
  }, 'ctrl_balcao_comentar');
}

function ctrl_balcao_enviar_versao(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var papel = acesso.registro && acesso.registro.papel;
    if (!['comunicacao','admin','superadmin'].includes(papel)) throw new Error('Sem permissão');
    var id = params && params.id;
    if (!id) throw new Error('ID obrigatório');
    var versao = { url: params.url || '', nota: params.nota || '' };
    var r = BalcaoEngine.enviarVersao(id, versao, email, getOrgConfig().orgId);
    _invalidarCachesBalcao(getOrgConfig().orgId);
    return r;
  }, 'ctrl_balcao_enviar_versao');
}

function ctrl_balcao_excluir(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var papel = acesso.registro && acesso.registro.papel;
    if (!['admin','superadmin'].includes(papel)) throw new Error('Sem permissão');
    var id = params && params.id;
    if (!id) throw new Error('ID obrigatório');
    AuditoriaService.registrar('DEMANDA_EXCLUIDA', 'comunicacao', { id: id, email: email });
    var orgId = getOrgConfig().orgId;
    var r = { ok: BalcaoRepository.excluir(orgId, id) };
    _invalidarCachesBalcao(orgId);
    return r;
  }, 'ctrl_balcao_excluir');
}
