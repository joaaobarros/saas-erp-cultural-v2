/**
 * @file modules/infraestrutura/reserva_carro_controller.gs
 * @layer modules/infraestrutura
 * @description Controller de Reservas de Veículo Institucional.
 *   Funções públicas: ctrl_carro_*
 *   Todas autenticam via getEmailSessao() + AcessoService.verificar().
 *   Permissão de gestão (aprovar/recusar/escala/veículos): habilitador, admin, superadmin,
 *   e gestor com 'infraestrutura' em setoresGerenciados.
 * @depends modules/infraestrutura/reserva_carro_engine.gs,
 *          modules/infraestrutura/escala_carro_engine.gs,
 *          core/services/acesso_service.gs,
 *          shared/response.gs,
 *          core/auth_session.gs,
 *          core/config.gs
 */

// ── AppCache ─────────────────────────────────────────────────────────────────
var _CK_CARRO_DADOS = 'carro_dados_';
var _CK_CARRO_LISTA = 'carro_lista_';
var _CK_CARRO_MET   = 'carro_metricas_';

function _invalidarCachesCarros(orgId) {
  try { AppCache.remove(_CK_CARRO_MET + (orgId || '')); } catch(_) {}
  // Chaves de lista/dados são por usuário — expiram naturalmente (TTL 60s)
}

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
    var f = filtros || {};
    var ck = _CK_CARRO_LISTA + ctx.orgId + '_' + ctx.email.replace(/[^a-z0-9]/g,'_') + '_' + JSON.stringify(f);
    try { var cached = AppCache.get(ck); if (cached) return cached; } catch(_) {}
    var lista = ReservaCarroEngine.listar(f, ctx.email);
    try { AppCache.set(ck, lista, 60); } catch(_) {}
    return lista;
  }, 'ctrl_carro_listar');
}

function ctrl_carro_salvar(dados) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    var r = ReservaCarroEngine.criar(dados || {}, ctx.email);
    _invalidarCachesCarros(ctx.orgId);
    return r;
  }, 'ctrl_carro_salvar');
}

function ctrl_carro_aprovar(id) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    var r = ReservaCarroEngine.aprovar(id, ctx.email);
    _invalidarCachesCarros(ctx.orgId);
    return r;
  }, 'ctrl_carro_aprovar');
}

function ctrl_carro_recusar(id, motivo) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    var r = ReservaCarroEngine.recusar(id, motivo || '', ctx.email);
    _invalidarCachesCarros(ctx.orgId);
    return r;
  }, 'ctrl_carro_recusar');
}

function ctrl_carro_cancelar(id, motivo) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    var r = ReservaCarroEngine.cancelar(id, motivo || '', ctx.email);
    _invalidarCachesCarros(ctx.orgId);
    return r;
  }, 'ctrl_carro_cancelar');
}

function ctrl_carro_concluir(id) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    var r = ReservaCarroEngine.concluir(id, ctx.email);
    _invalidarCachesCarros(ctx.orgId);
    return r;
  }, 'ctrl_carro_concluir');
}

function ctrl_carro_metricas() {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    var ck = _CK_CARRO_MET + ctx.orgId;
    try { var cached = AppCache.get(ck); if (cached) return cached; } catch(_) {}
    var m = ReservaCarroEngine.obterMetricas(ctx.email);
    try { AppCache.set(ck, m, 60); } catch(_) {}
    return m;
  }, 'ctrl_carro_metricas');
}

/**
 * Retorna lista + métricas + veículos + flag podGerenciar em uma única chamada.
 */
function ctrl_carro_dados(filtros) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    var f = filtros || {};
    var ck = _CK_CARRO_DADOS + ctx.orgId + '_' + ctx.email.replace(/[^a-z0-9]/g,'_') + '_' + JSON.stringify(f);
    try { var cached = AppCache.get(ck); if (cached) return cached; } catch(_) {}

    var todas = ReservaCarroEngine.listar({}, ctx.email);
    var metricas = {
      total:     todas.length,
      pendentes: todas.filter(function(r){ return r.status === 'PENDENTE';  }).length,
      aprovadas: todas.filter(function(r){ return r.status === 'APROVADA';  }).length,
      recusadas: todas.filter(function(r){ return r.status === 'RECUSADA';  }).length,
      canceladas: todas.filter(function(r){ return r.status === 'CANCELADA'; }).length,
      concluidas: todas.filter(function(r){ return r.status === 'CONCLUIDA'; }).length
    };
    var nomeMap = {};
    try {
      AcessoService.listarUsuarios().forEach(function(u) {
        if (u.email) nomeMap[u.email] = u.nome || u.email;
      });
    } catch(e) { /* silencioso */ }
    function _nome(email) { return nomeMap[email] || (email ? email.replace(/@.*$/, '') : '—'); }

    var lista = todas;
    if (f.status) lista = lista.filter(function(r){ return r.status === f.status; });
    if (f.data)   lista = lista.filter(function(r){ return r.data   === f.data;   });
    lista = lista.map(function(r) {
      return Object.assign({}, r, {
        solicitanteNome: _nome(r.solicitante),
        aprovadorNome:   r.aprovador ? _nome(r.aprovador) : null
      });
    });

    var veiculos = [];
    try { veiculos = EscalaCarroEngine.listarVeiculos(ctx.email); } catch(e) { /* silencioso */ }

    var resultado = {
      lista:        lista,
      metricas:     metricas,
      veiculos:     veiculos,
      podGerenciar: EscalaCarroEngine.podAprovarCarro(ctx.email)
    };
    try { AppCache.set(ck, resultado, 60); } catch(_) {}
    return resultado;
  }, 'ctrl_carro_dados');
}

/**
 * Vincula uma reserva de veículo a um novo evento no Google Calendar.
 * @param {string} id
 * @param {Object} opcoes — { modo: 'todos'|'especificos', selecionados?: string[], extras?: string[] }
 */
function ctrl_carro_vincular_calendar(id, opcoes) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    var r = ReservaCarroEngine.vincularCalendar(id, opcoes || {}, ctx.email);
    _invalidarCachesCarros(ctx.orgId);
    return r;
  }, 'ctrl_carro_vincular_calendar');
}

/**
 * Remove o vínculo de uma reserva de veículo com o Google Calendar.
 * @param {string} id
 */
function ctrl_carro_desvincular_calendar(id) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarro();
    var r = ReservaCarroEngine.desvincularCalendar(id, ctx.email);
    _invalidarCachesCarros(ctx.orgId);
    return r;
  }, 'ctrl_carro_desvincular_calendar');
}

function ctrl_carro_geocode(endereco) {
  return GasResponse.wrap(function() {
    if (!endereco) throw new Error('Endereço não informado.');
    var geocoder = Maps.newGeocoder().setLanguage('pt-BR').setRegion('BR');
    var res = geocoder.geocode(String(endereco));
    if (!res || !res.results || !res.results.length) throw new Error('Endereço não encontrado.');
    var r = res.results[0];
    return {
      formatado: r.formatted_address,
      lat:       r.geometry.location.lat,
      lng:       r.geometry.location.lng
    };
  }, 'ctrl_carro_geocode');
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
