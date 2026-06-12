/**
 * @file modules/infraestrutura/escala_carro_controller.gs
 * @layer modules/infraestrutura
 * @description Controller de Escala e Disponibilidade de Veículos.
 *   Endpoints públicos: ctrl_carro_*
 *   Permissão de gestão: habilitador, admin, superadmin e gestor com setor 'infraestrutura'.
 * @depends modules/infraestrutura/escala_carro_engine.gs,
 *          modules/infraestrutura/reserva_carro_engine.gs,
 *          core/services/acesso_service.gs,
 *          shared/response.gs,
 *          core/auth_session.gs
 */

function _ctxCarroEscala() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

// ── Veículos ─────────────────────────────────────────────────────────────────

function ctrl_carro_listar_veiculos() {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarroEscala();
    return EscalaCarroEngine.listarVeiculos(ctx.email);
  }, 'ctrl_carro_listar_veiculos');
}

function ctrl_carro_salvar_veiculo(dados) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarroEscala();
    return EscalaCarroEngine.salvarVeiculo(dados || {}, ctx.email);
  }, 'ctrl_carro_salvar_veiculo');
}

// ── Escalas ───────────────────────────────────────────────────────────────────

function ctrl_carro_listar_escalas(filtros) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarroEscala();
    return EscalaCarroEngine.listarEscalas(filtros || {}, ctx.email);
  }, 'ctrl_carro_listar_escalas');
}

/**
 * Cria escala(s). Aceita objeto único ou { lote: [{...}] } para criação em batch.
 */
function ctrl_carro_salvar_escala(dados) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarroEscala();
    return EscalaCarroEngine.criarEscala(dados || {}, ctx.email);
  }, 'ctrl_carro_salvar_escala');
}

function ctrl_carro_atualizar_escala(id, patch) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarroEscala();
    return EscalaCarroEngine.atualizarEscala(id, patch || {}, ctx.email);
  }, 'ctrl_carro_atualizar_escala');
}

function ctrl_carro_remover_escala(id) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarroEscala();
    return EscalaCarroEngine.removerEscala(id, ctx.email);
  }, 'ctrl_carro_remover_escala');
}

// ── Disponibilidade e rota ────────────────────────────────────────────────────

/**
 * Calcula janelas disponíveis para uma data, considerando escala, reservas aprovadas
 * e o tempo de deslocamento do ponto de chegada da última reserva até localSaida.
 *
 * @param {{ data, localSaida, veiculoId, ignorarId }} params
 */
function ctrl_carro_disponibilidade(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarroEscala();
    var p   = params || {};
    if (!p.data) throw new Error('Data é obrigatória.');
    return EscalaCarroEngine.calcularDisponibilidade(
      p.data,
      p.localSaida  || '',
      p.veiculoId   || 'default',
      ctx.orgId,
      p.ignorarId   || null
    );
  }, 'ctrl_carro_disponibilidade');
}

/**
 * Calcula tempo de rota entre origem e destino, com paradas opcionais.
 * Retorna minutos totais (incluindo buffer de 5 min) e horário de chegada sugerido.
 *
 * @param {{ origem, destino, paradas, data, hora }} params
 */
function ctrl_carro_tempo_rota(params) {
  return GasResponse.wrap(function() {
    _ctxCarroEscala(); // apenas autentica
    var p = params || {};
    if (!p.origem || !p.destino) throw new Error('Origem e destino são obrigatórios.');
    return EscalaCarroEngine.calcularTempoRota(p);
  }, 'ctrl_carro_tempo_rota');
}

/**
 * Aprovador edita a rota de uma reserva existente (paradas e/ou localChegada).
 *
 * @param {string} id        — ID da reserva
 * @param {object} dadosRota — { localChegada?, coordChegada?, paradas?, mapaUrl? }
 */
function ctrl_carro_editar_rota(id, dadosRota) {
  return GasResponse.wrap(function() {
    var ctx = _ctxCarroEscala();
    return ReservaCarroEngine.editarRota(id, dadosRota || {}, ctx.email);
  }, 'ctrl_carro_editar_rota');
}

/**
 * Prepara abas ESPACOS.Veiculos e ESPACOS.EscalaCarro.
 * Executar uma vez no GAS Editor após o deploy da Fase 22.
 */
function fase22_carro_prepararIndice() {
  try {
    var rv = VeiculosRepository.prepararIndice();
    var re = EscalaCarroRepository.prepararIndice();
    Logger.info('setup', 'fase22_carro_prepararIndice',
      'Veiculos: ' + (rv.ok ? rv.aba : rv.motivo) +
      ' | EscalaCarro: ' + (re.ok ? re.aba : re.motivo));
    return { veiculos: rv, escala: re };
  } catch(e) {
    Logger.error('setup', 'fase22_carro_prepararIndice', e.message);
    return { ok: false, motivo: e.message };
  }
}
