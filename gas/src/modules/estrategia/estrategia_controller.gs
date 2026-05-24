/**
 * @file modules/estrategia/estrategia_controller.gs
 * @layer modules/estrategia
 * @description Controllers do módulo de Estratégia Institucional.
 *
 * CQRS: listar/obter/metricas usam cache; salvar/mudar_status invalidam.
 * RBAC: leitura = todos autenticados; escrita = coordenador+; excluir = admin+.
 *
 * @depends estrategia_repository.gs, estrategia_engine.gs,
 *          acesso_service.gs, response.gs, cache_service.gs
 */

var _CACHE_KEY_ESTRATEGIA      = 'ctrl_estrategia_lista';
var _CACHE_KEY_ESTRATEGIA_METR = 'ctrl_estrategia_metricas';
var _CACHE_KEY_KPIS            = 'ctrl_estrategia_kpis';

// ─── LEITURA ────────────────────────────────────────────────────────────────

function ctrl_estrategia_listar(filtros) {
  return GasResponse.wrap(function() {
    var orgId = AcessoService.verificar().orgId;
    var cached = CacheService_.get(_CACHE_KEY_ESTRATEGIA);
    if (cached) {
      var lista = JSON.parse(cached);
      return _aplicarFiltros(lista, filtros || {});
    }
    var lista = EstrategiaRepository.listar(orgId, filtros || {});
    CacheService_.set(_CACHE_KEY_ESTRATEGIA, JSON.stringify(lista), 120);
    return lista;
  }, 'ctrl_estrategia_listar');
}

function ctrl_estrategia_obter(id) {
  return GasResponse.wrap(function() {
    var session = AcessoService.verificar();
    var obj = EstrategiaRepository.buscarPorId(session.orgId, id);
    if (!obj) throw new Error('Objetivo não encontrado: ' + id);
    return obj;
  }, 'ctrl_estrategia_obter');
}

function ctrl_estrategia_metricas() {
  return GasResponse.wrap(function() {
    var session = AcessoService.verificar();
    var cached = CacheService_.get(_CACHE_KEY_ESTRATEGIA_METR);
    if (cached) return JSON.parse(cached);
    var m = EstrategiaRepository.obterMetricas(session.orgId);
    CacheService_.set(_CACHE_KEY_ESTRATEGIA_METR, JSON.stringify(m), 120);
    return m;
  }, 'ctrl_estrategia_metricas');
}

function ctrl_estrategia_kpis() {
  return GasResponse.wrap(function() {
    var session = AcessoService.verificar();
    var cached = CacheService_.get(_CACHE_KEY_KPIS);
    if (cached) return JSON.parse(cached);
    var kpis = EstrategiaEngine.calcularKPIs(session.orgId);
    CacheService_.set(_CACHE_KEY_KPIS, JSON.stringify(kpis), 300);
    return kpis;
  }, 'ctrl_estrategia_kpis');
}

function ctrl_estrategia_riscos() {
  return GasResponse.wrap(function() {
    var session = AcessoService.verificar();
    return EstrategiaEngine.calcularRiscos(session.orgId);
  }, 'ctrl_estrategia_riscos');
}

function ctrl_estrategia_relatorio(params) {
  return GasResponse.wrap(function() {
    var session = AcessoService.verificar();
    return EstrategiaEngine.gerarRelatorio(session.orgId, params || {});
  }, 'ctrl_estrategia_relatorio');
}

function ctrl_estrategia_calendario() {
  return GasResponse.wrap(function() {
    var session = AcessoService.verificar();
    return EstrategiaEngine.gerarCalendario(session.orgId);
  }, 'ctrl_estrategia_calendario');
}

// ─── ESCRITA ────────────────────────────────────────────────────────────────

function ctrl_estrategia_salvar(dados) {
  return GasResponse.wrap(function() {
    var session = AcessoService.verificar();
    _assertEscrita(session);
    var resultado = EstrategiaEngine.salvar(dados, session.email, session.orgId);
    _invalidarCache();
    return resultado;
  }, 'ctrl_estrategia_salvar');
}

function ctrl_estrategia_mudar_status(params) {
  return GasResponse.wrap(function() {
    var session = AcessoService.verificar();
    _assertEscrita(session);
    var resultado = EstrategiaEngine.mudarStatus(params, session.email, session.orgId);
    _invalidarCache();
    return resultado;
  }, 'ctrl_estrategia_mudar_status');
}

function ctrl_estrategia_vincular_acao(params) {
  return GasResponse.wrap(function() {
    var session = AcessoService.verificar();
    _assertEscrita(session);
    var resultado = EstrategiaEngine.vincularAcao(
      params.objetivoId, params.acaoId, session.email, session.orgId
    );
    _invalidarCache();
    return resultado;
  }, 'ctrl_estrategia_vincular_acao');
}

function ctrl_estrategia_desvincular_acao(params) {
  return GasResponse.wrap(function() {
    var session = AcessoService.verificar();
    _assertEscrita(session);
    var resultado = EstrategiaEngine.desvincularAcao(
      params.objetivoId, params.acaoId, session.email, session.orgId
    );
    _invalidarCache();
    return resultado;
  }, 'ctrl_estrategia_desvincular_acao');
}

function ctrl_estrategia_excluir(id) {
  return GasResponse.wrap(function() {
    var session = AcessoService.verificar();
    if (['admin', 'superadmin'].indexOf(session.papel) === -1) {
      throw new Error('Apenas administradores podem excluir objetivos estratégicos.');
    }
    var resultado = EstrategiaEngine.excluir(id, session.email, session.orgId);
    _invalidarCache();
    return resultado;
  }, 'ctrl_estrategia_excluir');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _assertEscrita(session) {
  var papeis = ['coordenador', 'gestor', 'financeiro', 'admin', 'superadmin'];
  if (papeis.indexOf(session.papel) === -1) {
    throw new Error('Permissão insuficiente para editar objetivos estratégicos.');
  }
}

function _invalidarCache() {
  try { CacheService_.remove(_CACHE_KEY_ESTRATEGIA); } catch(e) {}
  try { CacheService_.remove(_CACHE_KEY_ESTRATEGIA_METR); } catch(e) {}
  try { CacheService_.remove(_CACHE_KEY_KPIS); } catch(e) {}
}

function _aplicarFiltros(lista, filtros) {
  return lista.filter(function(o) {
    if (filtros.horizonte && o.horizonte !== filtros.horizonte) return false;
    if (filtros.status    && o.status    !== filtros.status)    return false;
    return true;
  });
}
