/**
 * @file modules/comunicacao/balcao_controller.gs
 * @layer modules/comunicacao
 * @description Controllers do Balcão de Demandas — Fase 10.
 *
 * RBAC: criar = qualquer ativo; executar = comunicacao+; excluir = admin+
 *
 * @depends balcao_engine.gs, balcao_repository.gs, acesso_service.gs, gas_response.gs
 */

// ─── Leitura ──────────────────────────────────────────────────────────────────

function ctrl_balcao_listar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var orgId = getOrgConfig().orgId;
    var filtros = params || {};
    // Usuários comuns só vêem suas próprias demandas (como demandante)
    var papel = acesso.registro && acesso.registro.papel;
    if (!['comunicacao','gestor','coordenador','admin','superadmin'].includes(papel)) {
      filtros.demandante = email;
    }
    return BalcaoRepository.listar(orgId, filtros);
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
    return BalcaoRepository.metricas(getOrgConfig().orgId);
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
    if (params.id) {
      return BalcaoEngine.atualizar(params.id, params, email, orgId);
    }
    if (!params.demandante) params.demandante = email;
    return BalcaoEngine.criar(params, email, orgId);
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
    return BalcaoEngine.mudarStatus(id, status, params || {}, email, getOrgConfig().orgId);
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
    return BalcaoEngine.adicionarComentario(id, texto, email, getOrgConfig().orgId);
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
    return BalcaoEngine.enviarVersao(id, versao, email, getOrgConfig().orgId);
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
    return { ok: BalcaoRepository.excluir(getOrgConfig().orgId, id) };
  }, 'ctrl_balcao_excluir');
}
