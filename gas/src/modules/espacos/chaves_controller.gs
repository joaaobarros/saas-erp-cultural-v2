/**
 * @file modules/espacos/chaves_controller.gs
 * @layer modules/espacos
 * @description Bridge GAS oficial para o domínio Protocolo de Chaves.
 *
 * Funções públicas seguem o padrão ctrl_chaves_*.
 * Segurança:
 *   - Leitura: todos os usuários ativos
 *   - Abertura de protocolo: todos os usuários ativos
 *   - Devolução: todos (dono do protocolo) ou infraestrutura+
 *   - Verificação de atrasos (admin trigger): infraestrutura+
 *
 * @depends modules/espacos/chave_engine.gs (ChaveEngine)
 *          modules/espacos/almoxarifado_engine.gs (AlmoxarifadoEngine)
 *          core/services/acesso_service.gs (AcessoService)
 *          shared/response.gs (GasResponse)
 *          core/auth_session.gs (getEmailSessao)
 *          core/config.gs (getOrgConfig)
 */

// ── Helpers privados ─────────────────────────────────────────────────────

function _ctxChaves() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

function _nivelChaves(email) {
  try {
    var r = AcessoService.verificar(email);
    if (r && r.registro) {
      var p = (r.registro.papel || '').toLowerCase();
      if (p === 'superadmin')     return 'superadmin';
      if (p === 'admin')          return 'admin';
      if (p === 'gestor')         return 'gestor';
      if (p === 'infraestrutura') return 'infraestrutura';
    }
  } catch (_) {}
  return 'colaborador';
}

var _NIVEL_GESTAO_CHAVES = ['superadmin', 'admin', 'gestor', 'infraestrutura'];

// ═══════════════════════════════════════════════════════════════
// CHAVES — LEITURA
// ═══════════════════════════════════════════════════════════════

/**
 * Lista protocolos de chave.
 * @param {Object} filtros — { status, nomeSala, responsavel }
 */
function ctrl_chaves_listar(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxChaves();
    return ChaveEngine.listar(filtros || {}, ctx.orgId);
  }, 'ctrl_chaves_listar');
}

/**
 * Métricas do módulo de chaves.
 */
function ctrl_chaves_metricas() {
  return GasResponse.wrap(function () {
    var ctx = _ctxChaves();
    return ChaveEngine.metricas(ctx.orgId);
  }, 'ctrl_chaves_metricas');
}

// ═══════════════════════════════════════════════════════════════
// CHAVES — ESCRITA
// ═══════════════════════════════════════════════════════════════

/**
 * Abre um protocolo de retirada de chave.
 * @param {Object} dados — { nomeSala, nomeResponsavel, setor, turno, dataDevolucao, reservaId }
 */
function ctrl_chaves_abrir(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxChaves();
    if (!dados) throw new Error('Dados do protocolo são obrigatórios.');
    if (!dados.nomeSala) throw new Error('Nome da sala é obrigatório.');
    // Usa o usuário logado como responsável; preenche dataRetirada com now
    var agr = agora ? agora() : new Date().toISOString();
    dados.responsavel    = dados.responsavel    || ctx.email;
    dados.dataRetirada   = dados.dataRetirada   || agr;
    return ChaveEngine.abrirProtocolo(dados, ctx.email, ctx.orgId);
  }, 'ctrl_chaves_abrir');
}

/**
 * Registra devolução de chave.
 * @param {string} protocoloId
 * @param {string} [observacao]
 */
function ctrl_chaves_devolver(protocoloId, observacao) {
  return GasResponse.wrap(function () {
    var ctx = _ctxChaves();
    if (!protocoloId) throw new Error('ID do protocolo é obrigatório.');
    return ChaveEngine.registrarDevolucao(protocoloId, ctx.email, observacao || '', ctx.orgId);
  }, 'ctrl_chaves_devolver');
}

/**
 * Verifica protocolos em atraso (trigger administrativo).
 * Restrito a: infraestrutura, gestor, admin, superadmin.
 */
function ctrl_chaves_verificar_atrasos() {
  return GasResponse.wrap(function () {
    var ctx = _ctxChaves();
    var nivel = _nivelChaves(ctx.email);
    if (_NIVEL_GESTAO_CHAVES.indexOf(nivel) === -1) {
      throw new Error('Sem permissão para verificar atrasos.');
    }
    return ChaveEngine.verificarAtrasos(ctx.orgId);
  }, 'ctrl_chaves_verificar_atrasos');
}

// ═══════════════════════════════════════════════════════════════
// ALMOXARIFADO — ITENS
// ═══════════════════════════════════════════════════════════════

/**
 * Lista itens do catálogo de almoxarifado.
 */
function ctrl_almox_listar_itens(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxChaves();
    return AlmoxarifadoEngine.listarItens(filtros || {}, ctx.orgId);
  }, 'ctrl_almox_listar_itens');
}

/**
 * Salva (cria ou atualiza) um item no catálogo.
 * Restrito a: infraestrutura, gestor, admin, superadmin.
 * @param {Object} dados — { nome, descricao, quantidadeTotal, localizacao, categoria }
 */
function ctrl_almox_salvar_item(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxChaves();
    var nivel = _nivelChaves(ctx.email);
    if (_NIVEL_GESTAO_CHAVES.indexOf(nivel) === -1) {
      throw new Error('Sem permissão para cadastrar itens.');
    }
    if (!dados || !dados.nome) throw new Error('Nome do item é obrigatório.');
    dados.orgId = ctx.orgId;
    return AlmoxarifadoEngine.salvarItem(dados, ctx.email, ctx.orgId);
  }, 'ctrl_almox_salvar_item');
}

/**
 * Métricas do almoxarifado.
 */
function ctrl_almox_metricas() {
  return GasResponse.wrap(function () {
    var ctx = _ctxChaves();
    return AlmoxarifadoEngine.metricas(ctx.orgId);
  }, 'ctrl_almox_metricas');
}

// ═══════════════════════════════════════════════════════════════
// ALMOXARIFADO — EMPRÉSTIMOS
// ═══════════════════════════════════════════════════════════════

/**
 * Lista empréstimos.
 * @param {Object} filtros — { status, itemId, responsavel }
 */
function ctrl_almox_listar_emprestimos(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxChaves();
    return AlmoxarifadoEngine.listarEmprestimos(filtros || {}, ctx.orgId);
  }, 'ctrl_almox_listar_emprestimos');
}

/**
 * Solicita um empréstimo de item.
 * @param {Object} dados — { itemId, quantidade, dataRetirada, dataDevolucao, setor, observacoes }
 */
function ctrl_almox_solicitar(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxChaves();
    if (!dados) throw new Error('Dados do empréstimo são obrigatórios.');
    dados.responsavel = dados.responsavel || ctx.email;
    dados.orgId       = ctx.orgId;
    return AlmoxarifadoEngine.solicitarEmprestimo(dados, ctx.email, ctx.orgId);
  }, 'ctrl_almox_solicitar');
}

/**
 * Aprova um empréstimo.
 * Restrito a: infraestrutura, gestor, admin, superadmin.
 * @param {string} emprestimoId
 */
function ctrl_almox_aprovar(emprestimoId) {
  return GasResponse.wrap(function () {
    var ctx = _ctxChaves();
    if (!emprestimoId) throw new Error('ID do empréstimo é obrigatório.');
    var nivel = _nivelChaves(ctx.email);
    if (_NIVEL_GESTAO_CHAVES.indexOf(nivel) === -1) {
      throw new Error('Sem permissão para aprovar empréstimos.');
    }
    return AlmoxarifadoEngine.aprovarEmprestimo(emprestimoId, ctx.email, ctx.orgId);
  }, 'ctrl_almox_aprovar');
}

/**
 * Registra retirada de item.
 * @param {string} emprestimoId
 */
function ctrl_almox_retirar(emprestimoId) {
  return GasResponse.wrap(function () {
    var ctx = _ctxChaves();
    if (!emprestimoId) throw new Error('ID do empréstimo é obrigatório.');
    var nivel = _nivelChaves(ctx.email);
    if (_NIVEL_GESTAO_CHAVES.indexOf(nivel) === -1) {
      throw new Error('Sem permissão para registrar retirada.');
    }
    return AlmoxarifadoEngine.registrarRetirada(emprestimoId, ctx.email, ctx.orgId);
  }, 'ctrl_almox_retirar');
}

/**
 * Registra devolução de item.
 * @param {string} emprestimoId
 * @param {string} [observacao]
 */
function ctrl_almox_devolver(emprestimoId, observacao) {
  return GasResponse.wrap(function () {
    var ctx = _ctxChaves();
    if (!emprestimoId) throw new Error('ID do empréstimo é obrigatório.');
    return AlmoxarifadoEngine.registrarDevolucao(
      emprestimoId, ctx.email, observacao || '', ctx.orgId
    );
  }, 'ctrl_almox_devolver');
}

/**
 * Cancela um empréstimo.
 * @param {string} emprestimoId
 * @param {string} [motivo]
 */
function ctrl_almox_cancelar(emprestimoId, motivo) {
  return GasResponse.wrap(function () {
    var ctx = _ctxChaves();
    if (!emprestimoId) throw new Error('ID do empréstimo é obrigatório.');
    var nivel = _nivelChaves(ctx.email);
    if (_NIVEL_GESTAO_CHAVES.indexOf(nivel) === -1) {
      throw new Error('Sem permissão para cancelar empréstimos.');
    }
    return AlmoxarifadoEngine.cancelarEmprestimo(
      emprestimoId, ctx.email, motivo || '', ctx.orgId
    );
  }, 'ctrl_almox_cancelar');
}
