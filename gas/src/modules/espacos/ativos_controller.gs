/**
 * @file modules/espacos/ativos_controller.gs
 * @layer modules/espacos
 * @description Bridge GAS oficial para o domínio Ativos (Patrimônio/Equipamentos).
 *
 * Funções públicas seguem o padrão ctrl_ativos_*.
 * Segurança:
 *   - Toda função autentica via getEmailSessao() + AcessoService.verificar()
 *   - Leitura: todos os usuários ativos (colaborador, comunicacao, gestor, admin, superadmin)
 *   - Criação/edição: infraestrutura, gestor, admin, superadmin
 *   - Transição de status: infraestrutura, gestor, admin, superadmin
 *   - Baixa (descarte definitivo): apenas admin, superadmin
 *
 * @depends modules/espacos/ativos_engine.gs (AtivosEngine)
 *          core/services/acesso_service.gs (AcessoService)
 *          shared/response.gs (GasResponse)
 *          core/auth_session.gs (getEmailSessao)
 *          core/config.gs (getOrgConfig)
 */

// ── Helpers privados do controller ───────────────────────────────────

function _ctxAtivos() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

function _nivelAtivos(email) {
  try {
    var r = AcessoService.verificar(email);
    if (r && r.registro) {
      var p = (r.registro.papel || '').toLowerCase();
      if (p === 'superadmin')     return 'superadmin';
      if (p === 'admin')          return 'admin';
      if (p === 'gestor')         return 'gestor';
      if (p === 'infraestrutura') return 'infraestrutura';
      if (p === 'financeiro')     return 'financeiro';
    }
  } catch (_) {}
  return 'colaborador';
}

// Papéis autorizados por operação
var _LEITURA_ATIVOS   = ['superadmin', 'admin', 'gestor', 'infraestrutura', 'financeiro', 'colaborador'];
var _ESCRITA_ATIVOS   = ['superadmin', 'admin', 'gestor', 'infraestrutura'];
var _BAIXA_ATIVOS     = ['superadmin', 'admin'];

// ═══════════════════════════════════════════════════════════════
// ATIVOS — LEITURA
// ═══════════════════════════════════════════════════════════════

/**
 * Lista ativos com filtros opcionais.
 * @param {Object} filtros — { status, categoria, localizacao }
 */
function ctrl_ativos_listar(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxAtivos();
    // Leitura liberada para todos os ativos
    return AtivosEngine.listar(filtros || {}, ctx.orgId);
  }, 'ctrl_ativos_listar');
}

/**
 * Obtém um ativo pelo ID.
 */
function ctrl_ativos_obter(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxAtivos();
    if (!id) throw new Error('ID é obrigatório.');
    var a = AtivosEngine.buscarPorId(id, ctx.orgId);
    if (!a) throw new Error('Ativo não encontrado.');
    return a;
  }, 'ctrl_ativos_obter');
}

/**
 * Retorna métricas agregadas de ativos.
 */
function ctrl_ativos_metricas() {
  return GasResponse.wrap(function () {
    var ctx = _ctxAtivos();
    return AtivosEngine.metricas(ctx.orgId);
  }, 'ctrl_ativos_metricas');
}

/**
 * Retorna a lista de categorias disponíveis.
 */
function ctrl_ativos_categorias() {
  return GasResponse.wrap(function () {
    _ctxAtivos(); // autenticação obrigatória
    return AtivosEngine.categorias();
  }, 'ctrl_ativos_categorias');
}

// ═══════════════════════════════════════════════════════════════
// ATIVOS — ESCRITA
// ═══════════════════════════════════════════════════════════════

/**
 * Cria ou atualiza um ativo.
 * @param {Object} dados — campos do ativo
 */
function ctrl_ativos_salvar(dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxAtivos();
    var nivel = _nivelAtivos(ctx.email);
    if (_ESCRITA_ATIVOS.indexOf(nivel) === -1)
      throw new Error('Sem permissão para criar/editar ativos. Papel: ' + nivel);
    if (!dados) throw new Error('Dados do ativo são obrigatórios.');
    return AtivosEngine.salvar(dados, ctx.email, ctx.orgId);
  }, 'ctrl_ativos_salvar');
}

// ═══════════════════════════════════════════════════════════════
// ATIVOS — TRANSIÇÕES DE STATUS
// ═══════════════════════════════════════════════════════════════

/**
 * Transição de status via FSM.
 * @param {string} id — ID do ativo
 * @param {string} novoStatus — status destino
 * @param {string} motivo — motivo da transição
 */
function ctrl_ativos_status(id, novoStatus, motivo) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxAtivos();
    var nivel = _nivelAtivos(ctx.email);

    if (!id || !novoStatus) throw new Error('ID e novoStatus são obrigatórios.');

    // Baixa exige papel mais elevado
    if (novoStatus === 'baixado' && _BAIXA_ATIVOS.indexOf(nivel) === -1)
      throw new Error('Apenas administradores podem registrar baixa de ativos.');

    if (_ESCRITA_ATIVOS.indexOf(nivel) === -1)
      throw new Error('Sem permissão para alterar status de ativos. Papel: ' + nivel);

    return AtivosEngine.mudarStatus(id, novoStatus, ctx.email, motivo || '', ctx.orgId);
  }, 'ctrl_ativos_status');
}

/**
 * Registra uso do ativo em uma Ação.
 * @param {Object} dados — { id, acaoId, responsavel }
 */
function ctrl_ativos_registrar_uso(dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxAtivos();
    var nivel = _nivelAtivos(ctx.email);
    if (_ESCRITA_ATIVOS.indexOf(nivel) === -1)
      throw new Error('Sem permissão para registrar uso de ativos.');
    if (!dados || !dados.id) throw new Error('ID do ativo é obrigatório.');
    return AtivosEngine.registrarUso(
      dados.id, dados.acaoId || '', dados.responsavel || ctx.email, ctx.email, ctx.orgId
    );
  }, 'ctrl_ativos_registrar_uso');
}

/**
 * Registra devolução de um ativo.
 * @param {string} id — ID do ativo
 * @param {string} motivo
 */
function ctrl_ativos_devolver(id, motivo) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxAtivos();
    var nivel = _nivelAtivos(ctx.email);
    if (_ESCRITA_ATIVOS.indexOf(nivel) === -1)
      throw new Error('Sem permissão para registrar devolução de ativos.');
    if (!id) throw new Error('ID do ativo é obrigatório.');
    return AtivosEngine.registrarDevolucao(id, ctx.email, motivo || '', ctx.orgId);
  }, 'ctrl_ativos_devolver');
}

/**
 * Envia ativo para manutenção.
 * @param {string} id
 * @param {string} descricao — descrição do problema
 */
function ctrl_ativos_manutencao(id, descricao) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxAtivos();
    var nivel = _nivelAtivos(ctx.email);
    if (_ESCRITA_ATIVOS.indexOf(nivel) === -1)
      throw new Error('Sem permissão para enviar ativo para manutenção.');
    if (!id) throw new Error('ID do ativo é obrigatório.');
    return AtivosEngine.enviarParaManutencao(id, ctx.email, descricao || '', ctx.orgId);
  }, 'ctrl_ativos_manutencao');
}

/**
 * Conclui manutenção e retorna ativo como disponível.
 * @param {string} id
 */
function ctrl_ativos_concluir_manutencao(id) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxAtivos();
    var nivel = _nivelAtivos(ctx.email);
    if (_ESCRITA_ATIVOS.indexOf(nivel) === -1)
      throw new Error('Sem permissão para concluir manutenção de ativos.');
    if (!id) throw new Error('ID do ativo é obrigatório.');
    return AtivosEngine.concluirManutencao(id, ctx.email, ctx.orgId);
  }, 'ctrl_ativos_concluir_manutencao');
}

/**
 * Registra baixa definitiva de um ativo.
 * Somente admin/superadmin.
 * @param {string} id
 * @param {string} motivo
 */
function ctrl_ativos_baixar(id, motivo) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxAtivos();
    var nivel = _nivelAtivos(ctx.email);
    if (_BAIXA_ATIVOS.indexOf(nivel) === -1)
      throw new Error('Apenas administradores podem dar baixa em ativos.');
    if (!id) throw new Error('ID do ativo é obrigatório.');
    return AtivosEngine.registrarBaixa(id, ctx.email, motivo || '', ctx.orgId);
  }, 'ctrl_ativos_baixar');
}
