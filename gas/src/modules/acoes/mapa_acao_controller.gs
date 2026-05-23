/**
 * @file modules/acoes/mapa_acao_controller.gs
 * @layer modules/acoes
 * @description Controller público de Mapas de Evento (vinculados a Ações).
 *
 * RBAC:
 *   - Leitura:       todos os usuários autenticados
 *   - Criar/Editar:  coordenador, gestor, admin, superadmin
 *   - Excluir:       gestor, admin, superadmin
 *   - Reservar:      coordenador, gestor, admin, superadmin
 *
 * @depends mapa_acao_engine.gs, mapa_acao_repository.gs,
 *          shared/response.gs, core/services/acesso_service.gs
 */

// ─── Leitura ───────────────────────────────────────────────────────────────

/**
 * Lista todos os mapas de uma Ação.
 * @param {string} acaoId
 */
function ctrl_mapa_acao_listar(acaoId) {
  return GasResponse.wrap(function() {
    if (!acaoId) throw new Error('acaoId obrigatório.');
    AcessoService.verificar();
    var orgId = getOrgConfig().orgId;
    return MapaAcaoRepository.buscarPorAcao(orgId, acaoId);
  }, 'ctrl_mapa_acao_listar');
}

/**
 * Obtém um mapa pelo ID.
 * @param {string} id
 */
function ctrl_mapa_acao_obter(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('ID obrigatório.');
    AcessoService.verificar();
    var orgId = getOrgConfig().orgId;
    var mapa  = MapaAcaoRepository.buscarPorId(orgId, id);
    if (!mapa) throw new Error('Mapa não encontrado: ' + id);
    return mapa;
  }, 'ctrl_mapa_acao_obter');
}

// ─── Escrita ───────────────────────────────────────────────────────────────

/**
 * Cria ou atualiza um mapa de evento (mapa em branco).
 * @param {Object} dados — { id?, acaoId*, nome*, descricao?, layers?, elementos?, terreno? }
 */
function ctrl_mapa_acao_salvar(dados) {
  return GasResponse.wrap(function() {
    var email = AcessoService.verificar();
    _assertPodeEscrever(email);

    var orgId     = getOrgConfig().orgId;
    var resultado = MapaAcaoEngine.salvar(dados, email, orgId);
    if (!resultado.ok) throw new Error(resultado.erro || 'Erro ao salvar mapa.');
    return resultado;
  }, 'ctrl_mapa_acao_salvar');
}

/**
 * Cria um mapa importando espaços posicionados do mapa CCBJ.
 * @param {Object} params — { acaoId*, nome* }
 */
function ctrl_mapa_acao_criar_de_espacos(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.acaoId) throw new Error('acaoId obrigatório.');
    if (!params.nome)   throw new Error('nome do local obrigatório.');

    var email = AcessoService.verificar();
    _assertPodeEscrever(email);

    var orgId     = getOrgConfig().orgId;
    var resultado = MapaAcaoEngine.criarDeEspacos(params.acaoId, params.nome, email, orgId);
    if (!resultado.ok) throw new Error(resultado.erro || 'Erro ao criar mapa a partir dos espaços.');
    return resultado;
  }, 'ctrl_mapa_acao_criar_de_espacos');
}

/**
 * Exclui um mapa de evento.
 * @param {string} id
 */
function ctrl_mapa_acao_excluir(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('ID obrigatório.');
    var email = AcessoService.verificar();
    _assertPodeExcluir(email);

    var orgId     = getOrgConfig().orgId;
    var resultado = MapaAcaoEngine.excluir(id, email, orgId);
    if (!resultado.ok) throw new Error(resultado.erro || 'Erro ao excluir mapa.');
    return resultado;
  }, 'ctrl_mapa_acao_excluir');
}

/**
 * Cria uma Reserva no espaço original a partir de um elemento do mapa.
 * @param {Object} params — { mapaId*, elementoId*, data*, horaInicio*, horaTermino*, observacoes? }
 */
function ctrl_mapa_acao_reservar_espaco(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.mapaId)     throw new Error('mapaId obrigatório.');
    if (!params.elementoId) throw new Error('elementoId obrigatório.');
    if (!params.data)       throw new Error('data obrigatória.');
    if (!params.horaInicio) throw new Error('horaInicio obrigatório.');
    if (!params.horaTermino) throw new Error('horaTermino obrigatório.');

    var email = AcessoService.verificar();
    _assertPodeEscrever(email);

    var orgId     = getOrgConfig().orgId;
    var resultado = MapaAcaoEngine.reservarEspacoOriginal(params, email, orgId);
    if (!resultado.ok) throw new Error(resultado.erro || 'Erro ao criar reserva.');
    return resultado;
  }, 'ctrl_mapa_acao_reservar_espaco');
}

// ─── RBAC helpers ─────────────────────────────────────────────────────────

function _assertPodeEscrever_mapa(email) {
  var acesso = AcessoService.obterAcesso(email);
  var papeis = ['admin', 'superadmin', 'gestor', 'coordenador', 'financeiro'];
  if (papeis.indexOf((acesso.papel || '').toLowerCase()) === -1) {
    throw new Error('Sem permissão para criar/editar mapas de evento.');
  }
}

function _assertPodeExcluir_mapa(email) {
  var acesso = AcessoService.obterAcesso(email);
  var papel  = (acesso.papel || '').toLowerCase();
  if (['admin', 'superadmin', 'gestor'].indexOf(papel) === -1) {
    throw new Error('Somente gestores e administradores podem excluir mapas.');
  }
}

// Aliases locais para evitar colisão com _assert* de outros controllers
var _assertPodeEscrever = _assertPodeEscrever_mapa;
var _assertPodeExcluir  = _assertPodeExcluir_mapa;
