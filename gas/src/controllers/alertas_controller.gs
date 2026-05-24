/**
 * @file controllers/alertas_controller.gs
 * @layer controllers
 * @description Controllers de Alertas Operacionais — Fase 10.
 *
 * RBAC: listar/contar = qualquer usuário ativo; resolver = gestor+; verificar = admin+
 *
 * @depends alertas_engine.gs, acesso_service.gs, gas_response.gs
 */

function ctrl_alertas_listar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');

    var orgId   = getOrgConfig().orgId;
    var filtros = params || {};
    return AlertasEngine.listarAtivos(orgId, filtros);
  }, 'ctrl_alertas_listar');
}

function ctrl_alertas_contar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');

    var orgId = getOrgConfig().orgId;
    return { total: AlertasEngine.contarNaoLidos(orgId) };
  }, 'ctrl_alertas_contar');
}

function ctrl_alertas_marcar_lido(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');

    var id = params && params.id;
    if (!id) throw new Error('ID obrigatório');
    AlertasEngine.marcarLido(id, email);
    return { ok: true };
  }, 'ctrl_alertas_marcar_lido');
}

function ctrl_alertas_marcar_modulo_lido(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');

    var orgId  = getOrgConfig().orgId;
    var modulo = params && params.modulo;
    if (!modulo) throw new Error('Módulo obrigatório');
    return AlertasEngine.marcarModuloLido(orgId, modulo, email);
  }, 'ctrl_alertas_marcar_modulo_lido');
}

function ctrl_alertas_resolver(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');

    var papel = acesso.registro && acesso.registro.papel;
    if (!['gestor','coordenador','admin','superadmin'].includes(papel)) throw new Error('Sem permissão');

    var id = params && params.id;
    if (!id) throw new Error('ID obrigatório');
    var ok = AlertasEngine.resolver(id, email);
    AuditoriaService.registrar('ALERTA_RESOLVIDO', 'alertas', { alertaId: id, email: email });
    return { ok: ok };
  }, 'ctrl_alertas_resolver');
}

function ctrl_alertas_verificar_automaticos(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');

    var papel = acesso.registro && acesso.registro.papel;
    if (!['admin','superadmin'].includes(papel)) throw new Error('Sem permissão');

    return AlertasEngine.verificarTodosAutomaticos();
  }, 'ctrl_alertas_verificar_automaticos');
}
