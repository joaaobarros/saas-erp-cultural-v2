/**
 * @file modules/infraestrutura/reserva_carro_controller.gs
 * @layer modules/infraestrutura
 * @description Controller de Reservas de Veículo Institucional.
 *   Funções públicas: ctrl_carro_*
 *   Todas autenticam via getEmailSessao() + AcessoService.verificar().
 * @depends modules/infraestrutura/reserva_carro_engine.gs,
 *          core/services/acesso_service.gs,
 *          shared/response.gs,
 *          core/auth_session.gs,
 *          core/config.gs
 */

function _ctxCarro() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

function ctrl_carro_listar(filtros) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    return ReservaCarroEngine.listar(filtros || {}, ctx.email);
  }, 'ctrl_carro_listar');
}

function ctrl_carro_salvar(dados) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    return ReservaCarroEngine.criar(dados || {}, ctx.email);
  }, 'ctrl_carro_salvar');
}

function ctrl_carro_aprovar(id) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    return ReservaCarroEngine.aprovar(id, ctx.email);
  }, 'ctrl_carro_aprovar');
}

function ctrl_carro_recusar(id, motivo) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    return ReservaCarroEngine.recusar(id, motivo || '', ctx.email);
  }, 'ctrl_carro_recusar');
}

function ctrl_carro_cancelar(id, motivo) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    return ReservaCarroEngine.cancelar(id, motivo || '', ctx.email);
  }, 'ctrl_carro_cancelar');
}

function ctrl_carro_concluir(id) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    return ReservaCarroEngine.concluir(id, ctx.email);
  }, 'ctrl_carro_concluir');
}

function ctrl_carro_metricas() {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    return ReservaCarroEngine.obterMetricas(ctx.email);
  }, 'ctrl_carro_metricas');
}

/**
 * Prepara aba ESPACOS.ReservasCarro.
 * Executar uma vez no GAS Editor após o deploy da Fase 21.
 */
function fase21_carro_prepararIndice() {
  try {
    var r = ReservaCarroRepository.prepararIndice();
    Logger.info('setup', 'fase21_carro_prepararIndice',
      r.ok ? 'Aba ' + r.aba + ' garantida.' : 'Falha: ' + r.motivo);
    return r;
  } catch(e) {
    Logger.error('setup', 'fase21_carro_prepararIndice', e.message);
    return { ok: false, motivo: e.message };
  }
}
