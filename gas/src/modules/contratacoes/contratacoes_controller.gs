/**
 * @file modules/contratacoes/contratacoes_controller.gs
 * @layer modules/contratacoes
 * @description Bridge GAS oficial para o domínio Contratações + Contratados Externos.
 *
 * Segurança:
 *   - Toda função autentica via getEmailSessao() + AcessoService.verificar()
 *   - Gestor aprova próprio setor; financeiro aprova etapa financeira; admin: tudo
 *
 * Padrão CQRS (Skill.md — gap implementado):
 *   - Funções de leitura (listar, metricas) usam CacheService com TTL curto
 *   - Funções de escrita/transição invalidam o cache imediatamente
 *   - Chave de cache: '<modulo>_list_<orgId>' e '<modulo>_metricas_<orgId>'
 *
 * @depends modules/contratacoes/solicitacao_engine.gs (SolicitacaoEngine)
 *          modules/contratacoes/solicitacao_repository.gs (SolicitacaoRepository)
 *          modules/pessoas/contratado_engine.gs (ContratadoEngine)
 *          modules/pessoas/contratado_repository.gs (ContratadoRepository)
 *          core/services/acesso_service.gs (AcessoService)
 *          core/services/cache_service.gs (CacheService)
 *          shared/response.gs (GasResponse)
 *          core/auth_session.gs (getEmailSessao)
 *          core/config.gs (getOrgConfig)
 */

// ── Helpers privados ──────────────────────────────────────────────

function _ctxContratacoes() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

function _nivelContratacoes(email) {
  try {
    if (typeof AcessoService !== 'undefined') {
      var r = AcessoService.verificar(email);
      if (r && r.registro) {
        var p = (r.registro.papel || '').toLowerCase();
        if (p === 'superadmin') return 'superadmin';
        if (p === 'admin')      return 'admin';
        if (p === 'financeiro') return 'financeiro';
        if (p === 'gestor')     return 'gestor';
        if (p === 'rh')         return 'rh';
      }
    }
  } catch (_) {}
  return 'colaborador';
}

var _PODE_APROVAR_GESTOR     = ['superadmin', 'admin', 'gestor'];
var _PODE_APROVAR_FINANCEIRO = ['superadmin', 'admin', 'financeiro'];
var _PODE_GERENCIAR_CONTRATADOS = ['superadmin', 'admin', 'rh', 'financeiro'];

// ── Cache helpers (padrão CQRS — Skill.md) ───────────────────────

function _cacheKey(modulo, orgId) { return modulo + '_' + orgId; }

function _cacheLer(chave) {
  try {
    if (typeof CacheService !== 'undefined') return CacheService.obter(chave);
  } catch (_) {}
  return null;
}

function _cacheSalvar(chave, dados, ttlSegundos) {
  try {
    if (typeof CacheService !== 'undefined') CacheService.salvar(chave, dados, ttlSegundos || 120);
  } catch (_) {}
}

function _cacheInvalidar(prefixo, orgId) {
  try {
    if (typeof CacheService !== 'undefined') {
      CacheService.invalidar(_cacheKey(prefixo + '_list', orgId));
      CacheService.invalidar(_cacheKey(prefixo + '_metricas', orgId));
    }
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════════
// SOLICITAÇÕES DE CONTRATAÇÃO
// ═══════════════════════════════════════════════════════════════════

// ── LEITURA (com cache) ───────────────────────────────────────────

function ctrl_contratacoes_listar(filtros) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    var filtrosReal = filtros || {};

    // Colaborador: vê apenas as próprias solicitações
    if (nivel === 'colaborador') {
      filtrosReal = Object.assign({}, filtrosReal, { solicitante: ctx.email });
    }

    // CQRS — cache para leitura
    var cacheKey = _cacheKey('sol_list_' + JSON.stringify(filtrosReal), ctx.orgId);
    var cached   = _cacheLer(cacheKey);
    if (cached) return cached;

    var lista = SolicitacaoEngine.listar(filtrosReal, ctx.orgId);
    _cacheSalvar(cacheKey, lista, 90);
    return lista;
  }, 'ctrl_contratacoes_listar');
}

function ctrl_contratacoes_obter(id) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (!id) throw new Error('ID é obrigatório.');
    var s = SolicitacaoEngine.buscarPorId(id, ctx.orgId);
    if (!s) throw new Error('Solicitação não encontrada.');
    if (nivel === 'colaborador' && s.solicitante !== ctx.email)
      throw new Error('Acesso negado: você só pode visualizar suas próprias solicitações.');
    return s;
  }, 'ctrl_contratacoes_obter');
}

function ctrl_contratacoes_metricas() {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (nivel === 'colaborador')
      throw new Error('Métricas disponíveis apenas para gestores e acima.');

    // CQRS — cache para métricas
    var cacheKey = _cacheKey('sol_metricas', ctx.orgId);
    var cached   = _cacheLer(cacheKey);
    if (cached) return cached;

    var m = SolicitacaoEngine.obterMetricas(ctx.orgId);
    _cacheSalvar(cacheKey, m, 60);
    return m;
  }, 'ctrl_contratacoes_metricas');
}

// ── ESCRITA (invalida cache) ──────────────────────────────────────

function ctrl_contratacoes_salvar(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxContratacoes();
    if (!dados || typeof dados !== 'object') throw new Error('Dados são obrigatórios.');
    if (!dados.solicitante) dados.solicitante = ctx.email;
    var r = SolicitacaoEngine.salvar(dados, ctx.email, ctx.orgId);
    _cacheInvalidar('sol', ctx.orgId);
    return r;
  }, 'ctrl_contratacoes_salvar');
}

function ctrl_contratacoes_submeter(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxContratacoes();
    if (!id) throw new Error('ID é obrigatório.');
    // Verificar se o solicitante é o dono ou gestor
    var s = SolicitacaoEngine.buscarPorId(id, ctx.orgId);
    if (!s) throw new Error('Solicitação não encontrada.');
    var nivel = _nivelContratacoes(ctx.email);
    if (nivel === 'colaborador' && s.solicitante !== ctx.email)
      throw new Error('Acesso negado: apenas o solicitante pode submeter.');
    var r = SolicitacaoEngine.submeter(id, ctx.email, ctx.orgId);
    _cacheInvalidar('sol', ctx.orgId);
    return r;
  }, 'ctrl_contratacoes_submeter');
}

function ctrl_contratacoes_aprovar_gestor(id, parecer) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (_PODE_APROVAR_GESTOR.indexOf(nivel) === -1)
      throw new Error('Apenas gestores e administradores podem aprovar nesta etapa.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = SolicitacaoEngine.aprovarGestor(id, parecer || '', ctx.email, ctx.orgId);
    _cacheInvalidar('sol', ctx.orgId);
    return r;
  }, 'ctrl_contratacoes_aprovar_gestor');
}

function ctrl_contratacoes_aprovar_financeiro(id, parecer) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (_PODE_APROVAR_FINANCEIRO.indexOf(nivel) === -1)
      throw new Error('Apenas financeiro e administradores podem aprovar nesta etapa.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = SolicitacaoEngine.aprovarFinanceiro(id, parecer || '', ctx.email, ctx.orgId);
    _cacheInvalidar('sol', ctx.orgId);
    return r;
  }, 'ctrl_contratacoes_aprovar_financeiro');
}

function ctrl_contratacoes_iniciar_execucao(id, dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (_PODE_APROVAR_GESTOR.indexOf(nivel) === -1)
      throw new Error('Apenas gestores e administradores podem iniciar a execução.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = SolicitacaoEngine.iniciarExecucao(id, dados || {}, ctx.email, ctx.orgId);
    _cacheInvalidar('sol', ctx.orgId);
    return r;
  }, 'ctrl_contratacoes_iniciar_execucao');
}

function ctrl_contratacoes_concluir(id, dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (_PODE_APROVAR_GESTOR.indexOf(nivel) === -1)
      throw new Error('Apenas gestores e administradores podem concluir solicitações.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = SolicitacaoEngine.concluir(id, dados || {}, ctx.email, ctx.orgId);
    _cacheInvalidar('sol', ctx.orgId);
    return r;
  }, 'ctrl_contratacoes_concluir');
}

function ctrl_contratacoes_rejeitar(id, parecer) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (_PODE_APROVAR_GESTOR.indexOf(nivel) === -1 &&
        _PODE_APROVAR_FINANCEIRO.indexOf(nivel) === -1)
      throw new Error('Apenas gestores, financeiro e administradores podem rejeitar.');
    if (!id)     throw new Error('ID é obrigatório.');
    if (!parecer) throw new Error('Parecer de rejeição é obrigatório.');
    var r = SolicitacaoEngine.rejeitar(id, parecer, ctx.email, ctx.orgId);
    _cacheInvalidar('sol', ctx.orgId);
    return r;
  }, 'ctrl_contratacoes_rejeitar');
}

function ctrl_contratacoes_devolver(id, observacao) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (_PODE_APROVAR_GESTOR.indexOf(nivel) === -1 &&
        _PODE_APROVAR_FINANCEIRO.indexOf(nivel) === -1)
      throw new Error('Apenas aprovadores podem devolver solicitações.');
    if (!id)        throw new Error('ID é obrigatório.');
    if (!observacao) throw new Error('Observação de devolução é obrigatória.');
    var r = SolicitacaoEngine.devolver(id, observacao, ctx.email, ctx.orgId);
    _cacheInvalidar('sol', ctx.orgId);
    return r;
  }, 'ctrl_contratacoes_devolver');
}

function ctrl_contratacoes_cancelar(id, motivo) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    if (!id) throw new Error('ID é obrigatório.');
    var s = SolicitacaoEngine.buscarPorId(id, ctx.orgId);
    if (!s) throw new Error('Solicitação não encontrada.');
    var nivel = _nivelContratacoes(ctx.email);
    // Solicitante pode cancelar a própria; gestores/admin cancelam qualquer
    if (nivel === 'colaborador' && s.solicitante !== ctx.email)
      throw new Error('Acesso negado: apenas o solicitante pode cancelar a própria solicitação.');
    var r = SolicitacaoEngine.cancelar(id, motivo || '', ctx.email, ctx.orgId);
    _cacheInvalidar('sol', ctx.orgId);
    return r;
  }, 'ctrl_contratacoes_cancelar');
}

// ═══════════════════════════════════════════════════════════════════
// CONTRATADOS EXTERNOS
// ═══════════════════════════════════════════════════════════════════

function ctrl_contratados_listar(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxContratacoes();
    // CQRS — cache para leitura
    var cacheKey = _cacheKey('ctr_list_' + JSON.stringify(filtros || {}), ctx.orgId);
    var cached   = _cacheLer(cacheKey);
    if (cached) return cached;
    var lista = ContratadoEngine.listar(filtros || {}, ctx.orgId);
    _cacheSalvar(cacheKey, lista, 120);
    return lista;
  }, 'ctrl_contratados_listar');
}

function ctrl_contratados_metricas() {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (['colaborador'].indexOf(nivel) !== -1)
      throw new Error('Métricas disponíveis apenas para gestores e acima.');
    var cacheKey = _cacheKey('ctr_metricas', ctx.orgId);
    var cached   = _cacheLer(cacheKey);
    if (cached) return cached;
    var m = ContratadoEngine.obterMetricas(ctx.orgId);
    _cacheSalvar(cacheKey, m, 60);
    return m;
  }, 'ctrl_contratados_metricas');
}

function ctrl_contratados_salvar(dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (_PODE_GERENCIAR_CONTRATADOS.indexOf(nivel) === -1)
      throw new Error('Apenas RH, financeiro e administradores podem cadastrar contratados.');
    if (!dados || typeof dados !== 'object') throw new Error('Dados são obrigatórios.');
    var id = ContratadoEngine.salvar(dados, ctx.email, ctx.orgId);
    _cacheInvalidar('ctr', ctx.orgId);
    return { id: id };
  }, 'ctrl_contratados_salvar');
}

function ctrl_contratados_mudar_status(id, novoStatus) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (_PODE_GERENCIAR_CONTRATADOS.indexOf(nivel) === -1)
      throw new Error('Apenas RH, financeiro e administradores podem alterar status de contratados.');
    if (!id || !novoStatus) throw new Error('ID e novoStatus são obrigatórios.');
    var r = ContratadoEngine.mudarStatus(id, novoStatus, ctx.email, ctx.orgId);
    _cacheInvalidar('ctr', ctx.orgId);
    return r;
  }, 'ctrl_contratados_mudar_status');
}

function ctrl_contratados_buscar_documento(documento) {
  return GasResponse.wrap(function () {
    var ctx = _ctxContratacoes();
    if (!documento) throw new Error('documento é obrigatório.');
    return ContratadoEngine.buscarPorDocumento(documento, ctx.orgId);
  }, 'ctrl_contratados_buscar_documento');
}

// ═══════════════════════════════════════════════════════════════════
// HABILITAÇÕES
// ═══════════════════════════════════════════════════════════════════

function ctrl_habilitacoes_listar(idContratado) {
  return GasResponse.wrap(function () {
    var ctx     = _ctxContratacoes();
    var filtros = { orgId: ctx.orgId };
    if (idContratado) filtros.idContratado = idContratado;
    return ContratadoEngine.listarHabilitacoes(filtros, ctx.orgId);
  }, 'ctrl_habilitacoes_listar');
}

function ctrl_habilitacoes_submeter(dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (_PODE_GERENCIAR_CONTRATADOS.indexOf(nivel) === -1)
      throw new Error('Apenas RH e administradores podem iniciar processo de habilitação.');
    if (!dados || typeof dados !== 'object') throw new Error('Dados são obrigatórios.');
    return { id: ContratadoEngine.submeterHabilitacao(dados, ctx.email, ctx.orgId) };
  }, 'ctrl_habilitacoes_submeter');
}

function ctrl_habilitacoes_analisar(id) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (_PODE_GERENCIAR_CONTRATADOS.indexOf(nivel) === -1)
      throw new Error('Apenas RH e administradores podem analisar habilitações.');
    if (!id) throw new Error('ID é obrigatório.');
    return ContratadoEngine.iniciarAnalise(id, ctx.email);
  }, 'ctrl_habilitacoes_analisar');
}

function ctrl_habilitacoes_aprovar(id, parecer) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (_PODE_GERENCIAR_CONTRATADOS.indexOf(nivel) === -1)
      throw new Error('Apenas RH e administradores podem aprovar habilitações.');
    if (!id) throw new Error('ID é obrigatório.');
    var r = ContratadoEngine.aprovarHabilitacao(id, parecer || '', ctx.email, ctx.orgId);
    _cacheInvalidar('ctr', ctx.orgId);
    return r;
  }, 'ctrl_habilitacoes_aprovar');
}

function ctrl_habilitacoes_reprovar(id, parecer) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (_PODE_GERENCIAR_CONTRATADOS.indexOf(nivel) === -1)
      throw new Error('Apenas RH e administradores podem reprovar habilitações.');
    if (!id || !parecer) throw new Error('ID e parecer são obrigatórios.');
    var r = ContratadoEngine.reprovarHabilitacao(id, parecer, ctx.email);
    _cacheInvalidar('ctr', ctx.orgId);
    return r;
  }, 'ctrl_habilitacoes_reprovar');
}

function ctrl_habilitacoes_devolver(id, observacao) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxContratacoes();
    var nivel = _nivelContratacoes(ctx.email);
    if (_PODE_GERENCIAR_CONTRATADOS.indexOf(nivel) === -1)
      throw new Error('Apenas RH e administradores podem devolver habilitações.');
    if (!id || !observacao) throw new Error('ID e observação são obrigatórios.');
    return ContratadoEngine.devolverHabilitacao(id, observacao, ctx.email);
  }, 'ctrl_habilitacoes_devolver');
}

// ═══════════════════════════════════════════════════════════════════
// MANUTENÇÃO / MIGRAÇÃO — executar no GAS Editor
// ═══════════════════════════════════════════════════════════════════

function fase3_contratados_prepararIndice() {
  return GasResponse.wrap(function () {
    return ContratadoRepository.garantirIndice();
  }, 'fase3_contratados_prepararIndice');
}

function fase3_contratacoes_prepararIndice() {
  return GasResponse.wrap(function () {
    return SolicitacaoRepository.garantirIndice();
  }, 'fase3_contratacoes_prepararIndice');
}
