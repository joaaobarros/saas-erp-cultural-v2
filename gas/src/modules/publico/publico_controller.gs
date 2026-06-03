/**
 * @file modules/publico/publico_controller.gs
 * @layer modules/publico
 * @description Controller interno de Público (view admin autenticada).
 *
 * RBAC:
 *   - Leitura:              habilitador, gestor, admin, superadmin
 *   - Confirmar/Cancelar:   habilitador+
 *   - Presença:             colaborador+
 *   - Certificado:          admin+
 *
 * CQRS: leitura com cache, escrita invalida cache.
 *
 * @depends publico_engine.gs, publico_repository.gs,
 *          shared/response.gs, core/services/acesso_service.gs,
 *          core/services/cache_service.gs
 */

var _CACHE_KEY_PUBLICO_LISTA    = 'ctrl_publico_inscricoes';
var _CACHE_KEY_PUBLICO_METRICAS = 'ctrl_publico_metricas';

function _ctxPublico(papeis) {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  var papel  = (acesso.registro && acesso.registro.papel) || 'colaborador';
  if (papeis && papeis.indexOf(papel) === -1) throw new Error('Sem permissão.');
  return { email: email, papel: papel, orgId: getOrgConfig().orgId };
}

// ─── Inscrições ──────────────────────────────────────────────────────────────

/**
 * Lista inscrições com filtros opcionais.
 * @param {Object} filtros — { acaoId, status, email }
 */
function ctrl_publico_listarInscricoes(filtros) {
  return GasResponse.wrap(function() {
    filtros = filtros || {};
    var ctx = _ctxPublico(['coordenador','gestor','admin','superadmin']);
    var cacheKey = _CACHE_KEY_PUBLICO_LISTA + '_' + JSON.stringify(filtros);
    var cached = CacheService.get(cacheKey);
    if (cached) return JSON.parse(cached);
    var lista = PublicoRepository.Inscricoes.listar(ctx.orgId, filtros);
    CacheService.set(cacheKey, JSON.stringify(lista), 120);
    return lista;
  }, 'ctrl_publico_listarInscricoes');
}

/**
 * Retorna métricas consolidadas de público.
 */
function ctrl_publico_metricas() {
  return GasResponse.wrap(function() {
    var ctx = _ctxPublico(['coordenador','gestor','admin','superadmin']);
    var cached = CacheService.get(_CACHE_KEY_PUBLICO_METRICAS);
    if (cached) return JSON.parse(cached);
    var metricas = PublicoEngine.obterMetricas(ctx.orgId);
    CacheService.set(_CACHE_KEY_PUBLICO_METRICAS, JSON.stringify(metricas), 120);
    return metricas;
  }, 'ctrl_publico_metricas');
}

/**
 * Retorna capacidade e vagas de uma Ação.
 * @param {string} acaoId
 */
function ctrl_publico_capacidade(acaoId) {
  return GasResponse.wrap(function() {
    if (!acaoId) throw new Error('acaoId obrigatório.');
    var ctx = _ctxPublico(['coordenador','gestor','admin','superadmin']);
    return PublicoEngine.obterCapacidade(acaoId, ctx.orgId);
  }, 'ctrl_publico_capacidade');
}

/**
 * Confirma inscrição (inscrito → confirmado).
 * @param {string} id
 */
function ctrl_publico_confirmarInscricao(id) {
  return GasResponse.wrap(function() {
    if (!id) throw new Error('id obrigatório.');
    var ctx = _ctxPublico(['coordenador','gestor','admin','superadmin']);
    var resultado = PublicoEngine.confirmarInscricao(id, ctx.orgId);
    CacheService.invalidar(_CACHE_KEY_PUBLICO_LISTA);
    CacheService.invalidar(_CACHE_KEY_PUBLICO_METRICAS);
    return resultado;
  }, 'ctrl_publico_confirmarInscricao');
}

/**
 * Cancela inscrição.
 * @param {Object} dados — { id, motivo }
 */
function ctrl_publico_cancelarInscricao(dados) {
  return GasResponse.wrap(function() {
    dados = dados || {};
    if (!dados.id) throw new Error('id obrigatório.');
    var ctx = _ctxPublico(['coordenador','gestor','admin','superadmin']);
    PublicoEngine.cancelarInscricao(dados.id, ctx.orgId, dados.motivo || '');
    CacheService.invalidar(_CACHE_KEY_PUBLICO_LISTA);
    CacheService.invalidar(_CACHE_KEY_PUBLICO_METRICAS);
    return { cancelado: true };
  }, 'ctrl_publico_cancelarInscricao');
}

// ─── Presença ────────────────────────────────────────────────────────────────

/**
 * Lista presenças com filtros.
 * @param {Object} filtros — { acaoId, sessaoId, inscricaoId }
 */
function ctrl_publico_listarPresencas(filtros) {
  return GasResponse.wrap(function() {
    filtros = filtros || {};
    var ctx = _ctxPublico(null);
    return PublicoRepository.Presencas.listar(ctx.orgId, filtros);
  }, 'ctrl_publico_listarPresencas');
}

/**
 * Registra presença em batch para uma sessão.
 * @param {Object} dados — { acaoId, sessaoId, sessaoNome, registros: [{inscricaoId, presente}] }
 */
function ctrl_publico_registrarPresencaBatch(dados) {
  return GasResponse.wrap(function() {
    dados = dados || {};
    if (!dados.acaoId) throw new Error('acaoId obrigatório.');
    var ctx = _ctxPublico(null);
    var registros = dados.registros || [];
    var erros = [];
    var ok    = 0;

    registros.forEach(function(r) {
      try {
        PublicoEngine.registrarPresenca({
          acaoId:    dados.acaoId,
          inscricaoId: r.inscricaoId,
          sessaoId:  dados.sessaoId   || 'sessao-unica',
          sessaoNome: dados.sessaoNome || 'Sessão Única',
          presente:  r.presente !== false
        }, ctx.orgId, ctx.email);
        ok++;
      } catch(e) {
        erros.push({ inscricaoId: r.inscricaoId, erro: e.message });
      }
    });

    CacheService.invalidar(_CACHE_KEY_PUBLICO_METRICAS);
    return { registrados: ok, erros: erros };
  }, 'ctrl_publico_registrarPresencaBatch');
}

// ─── Pesquisas ────────────────────────────────────────────────────────────────

/**
 * Lista pesquisas de satisfação.
 * @param {Object} filtros — { acaoId }
 */
function ctrl_publico_listarPesquisas(filtros) {
  return GasResponse.wrap(function() {
    filtros = filtros || {};
    var ctx = _ctxPublico(['coordenador','gestor','admin','superadmin']);
    return PublicoRepository.Pesquisas.listar(ctx.orgId, filtros);
  }, 'ctrl_publico_listarPesquisas');
}

// ─── Certificados ─────────────────────────────────────────────────────────────

/**
 * Lista certificados.
 * @param {Object} filtros — { acaoId }
 */
function ctrl_publico_listarCertificados(filtros) {
  return GasResponse.wrap(function() {
    filtros = filtros || {};
    var ctx = _ctxPublico(['coordenador','gestor','admin','superadmin']);
    return PublicoRepository.Certificados.listar(ctx.orgId, filtros);
  }, 'ctrl_publico_listarCertificados');
}

/**
 * Gera certificado para uma inscrição.
 * @param {Object} dados — { inscricaoId, totalSessoes }
 */
function ctrl_publico_gerarCertificado(dados) {
  return GasResponse.wrap(function() {
    dados = dados || {};
    if (!dados.inscricaoId) throw new Error('inscricaoId obrigatório.');
    var ctx = _ctxPublico(['admin','superadmin']);
    var resultado = PublicoEngine.gerarCertificado(
      dados.inscricaoId, ctx.orgId, dados.totalSessoes || 1
    );
    CacheService.invalidar(_CACHE_KEY_PUBLICO_LISTA);
    CacheService.invalidar(_CACHE_KEY_PUBLICO_METRICAS);
    return resultado;
  }, 'ctrl_publico_gerarCertificado');
}

// ─── Preparação de índice (executar no GAS Editor) ────────────────────────────

function fase7_publico_prepararIndice() {
  var orgId = getOrgConfig().orgId;
  PublicoRepository.prepararIndice(orgId);
  ConsentimentoService.prepararIndice();
  return { ok: true, mensagem: 'Índices PUBLICO e Consentimentos preparados.' };
}
