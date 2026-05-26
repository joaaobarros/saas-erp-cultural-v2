/**
 * @file modules/pessoas/holerite_controller.gs
 * @layer modules/pessoas
 * @description Bridge GAS para o domínio Holerites (Fase 17).
 *
 * Funções públicas: ctrl_holerite_*
 * RBAC:
 *   leitura  = rh | admin | superadmin (e o próprio colaborador para seu holerite)
 *   geração  = rh | admin | superadmin
 *   pagamento = rh | admin | superadmin
 *   cancelamento = admin | superadmin
 *
 * @depends holerite_engine.gs (HoleriteEngine)
 *          holerite_repository.gs (HoleriteRepository)
 *          core/services/acesso_service.gs (AcessoService)
 *          shared/response.gs (GasResponse)
 *          core/auth_session.gs (getEmailSessao)
 *          core/config.gs (getOrgConfig)
 */

// ── Helper interno ────────────────────────────────────────────────────────────

function _ctxHolerite() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  var papel = (acesso.registro && acesso.registro.papel
    ? acesso.registro.papel : 'colaborador').toLowerCase();
  return { email: email, papel: papel, orgId: getOrgConfig().orgId };
}

function _assertRH(papel) {
  if (['superadmin','admin','rh'].indexOf(papel) < 0)
    throw new Error('Permissão insuficiente. Apenas RH, Admin ou SuperAdmin podem operar holerites.');
}

function _assertAdmin(papel) {
  if (['superadmin','admin'].indexOf(papel) < 0)
    throw new Error('Permissão insuficiente. Apenas Admin ou SuperAdmin podem executar esta operação.');
}

// ════════════════════════════════════════════════════════════════════════════
// LEITURA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Métricas agregadas de um período (mês de competência).
 * @param {object} params — { mesRef: "AAAA-MM" }
 */
function ctrl_holerite_metricas(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxHolerite();
    _assertRH(ctx.papel);
    params = params || {};
    var mesRef = params.mesRef || _mesRefAtual();
    return HoleriteRepository.metricas(ctx.orgId, mesRef);
  }, 'ctrl_holerite_metricas');
}

/**
 * Lista holerites com filtros.
 * @param {object} params — { mesRef?, colaboradorId?, status? }
 */
function ctrl_holerite_listar(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxHolerite();
    params = params || {};

    // Colaborador pode ver apenas seus próprios holerites
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0) {
      // tenta achar o id do colaborador pelo email
      var colabs = [];
      try { colabs = lerJSON('colaboradores.json') || []; } catch(e) {}
      var c = colabs.find(function(c) {
        return c.orgId === ctx.orgId && c.email === ctx.email;
      });
      params.colaboradorId = c ? c.id : '__NONE__';
    }

    return HoleriteRepository.listar(ctx.orgId, params);
  }, 'ctrl_holerite_listar');
}

/**
 * Obtém um holerite pelo ID.
 * @param {string} id
 */
function ctrl_holerite_obter(id) {
  return GasResponse.wrap(function() {
    var ctx = _ctxHolerite();
    var h = HoleriteRepository.obter(ctx.orgId, id);
    if (!h) throw new Error('Holerite não encontrado: ' + id);

    // Colaborador só pode ver o próprio
    if (['rh','admin','superadmin'].indexOf(ctx.papel) < 0) {
      var colabs = [];
      try { colabs = lerJSON('colaboradores.json') || []; } catch(e) {}
      var c = colabs.find(function(c) {
        return c.orgId === ctx.orgId && c.email === ctx.email;
      });
      if (!c || c.id !== h.colaboradorId)
        throw new Error('Acesso negado a este holerite.');
    }

    return h;
  }, 'ctrl_holerite_obter');
}

// ════════════════════════════════════════════════════════════════════════════
// GERAÇÃO
// ════════════════════════════════════════════════════════════════════════════

/**
 * Gera (ou regera) holerite para um colaborador em um mês.
 * @param {object} params — { colaboradorId, mesRef, observacoes? }
 */
function ctrl_holerite_gerar(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxHolerite();
    _assertRH(ctx.papel);
    params = params || {};

    if (!params.colaboradorId) throw new Error('colaboradorId é obrigatório.');
    if (!params.mesRef)        throw new Error('mesRef é obrigatório (formato AAAA-MM).');

    return HoleriteEngine.gerar(
      ctx.orgId,
      params.colaboradorId,
      params.mesRef,
      ctx.email,
      { observacoes: params.observacoes || '' }
    );
  }, 'ctrl_holerite_gerar');
}

/**
 * Processa a folha completa de um mês (todos os colaboradores ativos).
 * @param {object} params — { mesRef, vinculos?: ['clt','pj','bolsista'] }
 */
function ctrl_holerite_processarFolha(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxHolerite();
    _assertRH(ctx.papel);
    params = params || {};

    if (!params.mesRef) throw new Error('mesRef é obrigatório (formato AAAA-MM).');

    return HoleriteEngine.processarFolha(
      ctx.orgId,
      params.mesRef,
      ctx.email,
      { vinculos: params.vinculos || null }
    );
  }, 'ctrl_holerite_processarFolha');
}

// ════════════════════════════════════════════════════════════════════════════
// ATUALIZAÇÃO DE STATUS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Marca um holerite como pago.
 * @param {string} id
 */
function ctrl_holerite_marcarPago(id) {
  return GasResponse.wrap(function() {
    var ctx = _ctxHolerite();
    _assertRH(ctx.papel);
    if (!id) throw new Error('id é obrigatório.');
    return HoleriteRepository.marcarPago(ctx.orgId, id, ctx.email);
  }, 'ctrl_holerite_marcarPago');
}

/**
 * Cancela um holerite.
 * @param {string} id
 * @param {string} motivo
 */
function ctrl_holerite_cancelar(id, motivo) {
  return GasResponse.wrap(function() {
    var ctx = _ctxHolerite();
    _assertAdmin(ctx.papel);
    if (!id) throw new Error('id é obrigatório.');
    return HoleriteRepository.cancelar(ctx.orgId, id, motivo || '', ctx.email);
  }, 'ctrl_holerite_cancelar');
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO
// ════════════════════════════════════════════════════════════════════════════

/**
 * Exporta todos os holerites de um período como CSV.
 * @param {string} mesRef — "AAAA-MM"
 */
function ctrl_holerite_exportarCSV(mesRef) {
  return GasResponse.wrap(function() {
    var ctx = _ctxHolerite();
    _assertRH(ctx.papel);
    if (!mesRef) throw new Error('mesRef é obrigatório.');
    return HoleriteEngine.exportarCSV(ctx.orgId, mesRef);
  }, 'ctrl_holerite_exportarCSV');
}

// ── Helper: mês de referência atual ──────────────────────────────────────────

function _mesRefAtual() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
