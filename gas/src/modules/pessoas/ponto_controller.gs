/**
 * @file ponto_controller.gs
 * @layer controller
 * @description Controllers de Ponto Eletrônico, Custo CLT e Compatibilidade Colabore.
 *   RBAC: registrar = próprio colaborador ou rh+; consultas = rh/gestor/admin+;
 *         custo CLT = rh/financeiro/admin+; import/export = admin+.
 * @depends ponto_engine.gs, ponto_repository.gs, acesso_service.gs, response.gs
 */

function _ctxPonto() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro ? (acesso.registro.papel || 'colaborador') : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

// ─── Registro de ponto ───────────────────────────────────────────────────────

/**
 * Registra uma marcação de ponto.
 * @param {object} params — { colaboradorId?, tipo, data?, hora?, observacao? }
 */
function ctrl_ponto_registrar(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    // Colaborador pode registrar o próprio ponto; rh+ pode registrar de qualquer um
    var colabId = params.colaboradorId || ctx.email;
    if (colabId !== ctx.email && ['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — só pode registrar o próprio ponto.');
    return PontoEngine.registrar(ctx.orgId, colabId, params.tipo, params, ctx.email);
  }, 'ctrl_ponto_registrar');
}

/**
 * Exclui um registro de ponto (rh/admin).
 */
function ctrl_ponto_excluir(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0) throw new Error('Acesso negado.');
    return PontoEngine.excluirRegistro(ctx.orgId, params.id, ctx.email);
  }, 'ctrl_ponto_excluir');
}

// ─── Consultas ───────────────────────────────────────────────────────────────

/**
 * Lista registros de um colaborador em um período.
 */
function ctrl_ponto_listar(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    var colabId = params.colaboradorId || ctx.email;
    if (colabId !== ctx.email && ['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoRepository.listarPorColaborador(
      ctx.orgId, colabId, params.dataInicio, params.dataFim
    );
  }, 'ctrl_ponto_listar');
}

/**
 * Retorna cálculo de horas de um dia específico.
 */
function ctrl_ponto_horas_dia(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    var colabId = params.colaboradorId || ctx.email;
    if (colabId !== ctx.email && ['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoEngine.calcularHorasDia(ctx.orgId, colabId, params.data);
  }, 'ctrl_ponto_horas_dia');
}

/**
 * Retorna folha mensal de um colaborador.
 */
function ctrl_ponto_mensal(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    var colabId = params.colaboradorId || ctx.email;
    if (colabId !== ctx.email && ['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    var agora = new Date();
    var ano   = Number(params.ano  || agora.getFullYear());
    var mes   = Number(params.mes  || agora.getMonth() + 1);
    return PontoEngine.calcularMensal(ctx.orgId, colabId, ano, mes);
  }, 'ctrl_ponto_mensal');
}

/**
 * Retorna saldo de banco de horas.
 */
function ctrl_ponto_banco_horas(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    var colabId = params.colaboradorId || ctx.email;
    if (colabId !== ctx.email && ['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoRepository.obterBancoHoras(ctx.orgId, colabId);
  }, 'ctrl_ponto_banco_horas');
}

// ─── Custo CLT ───────────────────────────────────────────────────────────────

/**
 * Calcula custo CLT completo de um colaborador (ou cenário hipotético).
 */
function ctrl_ponto_custo_clt(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','financeiro','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — papel rh/financeiro+ necessário.');
    return PontoEngine.calcularCustoCLT(ctx.orgId, params);
  }, 'ctrl_ponto_custo_clt');
}

/**
 * Simula reajuste percentual em toda a folha.
 * @param {object} params — { percentual, colaboradores: [{id,nome,salarioBruto}] }
 */
function ctrl_ponto_simular_reajuste(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','financeiro','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoEngine.simularReajuste(ctx.orgId, params.percentual, params.colaboradores || []);
  }, 'ctrl_ponto_simular_reajuste');
}

/**
 * Calcula rescisão e break-even.
 */
function ctrl_ponto_calcular_rescisao(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoEngine.calcularRescisao(ctx.orgId, params);
  }, 'ctrl_ponto_calcular_rescisao');
}

/**
 * Indicadores de turnover do período.
 */
function ctrl_ponto_turnover(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx  = _ctxPonto();
    if (['rh','gestor','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    var agora = new Date();
    return PontoEngine.calcularIndicadoresTurnover(
      ctx.orgId,
      Number(params.ano || agora.getFullYear()),
      Number(params.mes || agora.getMonth() + 1)
    );
  }, 'ctrl_ponto_turnover');
}

// ─── Compatibilidade Colabore ────────────────────────────────────────────────

/**
 * Exporta registros no formato AFD (Portaria MTE 1510/2009).
 * Compatível com o sistema Colabore / ByYou DP da Fortes Tecnologia.
 */
function ctrl_ponto_exportar_afd(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoEngine.exportarAFD(ctx.orgId, params.dataInicio, params.dataFim);
  }, 'ctrl_ponto_exportar_afd');
}

/**
 * Exporta no formato CSV Colabore (PIS;Nome;Data;Hora;Tipo;NSR).
 */
function ctrl_ponto_exportar_csv_colabore(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    return PontoEngine.exportarCSVColabore(ctx.orgId, params.dataInicio, params.dataFim);
  }, 'ctrl_ponto_exportar_csv_colabore');
}

/**
 * Importa registros de um arquivo AFD.
 * @param {object} params — { conteudo: string (texto do arquivo AFD) }
 */
function ctrl_ponto_importar_afd(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    if (!params.conteudo) throw new Error('Conteúdo do arquivo AFD obrigatório.');
    return PontoEngine.importarAFD(ctx.orgId, params.conteudo, ctx.email);
  }, 'ctrl_ponto_importar_afd');
}

/**
 * Importa registros de um CSV no formato Colabore.
 */
function ctrl_ponto_importar_csv_colabore(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxPonto();
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');
    if (!params.conteudo) throw new Error('Conteúdo do arquivo CSV obrigatório.');
    return PontoEngine.importarCSVColabore(ctx.orgId, params.conteudo, ctx.email);
  }, 'ctrl_ponto_importar_csv_colabore');
}
