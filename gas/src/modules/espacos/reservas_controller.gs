/**
 * @file modules/espacos/reservas_controller.gs
 * @layer modules/espacos
 * @description Bridge GAS oficial para o domínio Reservas de Espaço.
 *
 * Funções públicas seguem o padrão ctrl_reservas_*.
 * Segurança:
 *   - Toda função autentica via getEmailSessao() + AcessoService.verificar()
 *   - Leitura: todos os usuários ativos
 *   - Criação/edição: colaborador (próprias reservas), gestor, admin, superadmin
 *   - Cancelamento por admin: qualquer reserva
 *   - Transição de status (em_uso / concluido): infraestrutura, gestor, admin, superadmin
 *
 * @depends modules/espacos/reserva_engine.gs (ReservaEngine)
 *          core/services/acesso_service.gs (AcessoService)
 *          shared/response.gs (GasResponse)
 *          core/auth_session.gs (getEmailSessao)
 *          core/config.gs (getOrgConfig)
 */

// ── Helpers privados ─────────────────────────────────────────────────────

function _ctxReservas() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

function _nivelReservas(email) {
  try {
    var r = AcessoService.verificar(email);
    if (r && r.registro) {
      var p = (r.registro.papel || '').toLowerCase();
      if (p === 'superadmin')     return 'superadmin';
      if (p === 'admin')          return 'admin';
      if (p === 'gestor')         return 'gestor';
      if (p === 'infraestrutura') return 'infraestrutura';
      if (p === 'financeiro')     return 'financeiro';
      if (p === 'comunicacao')    return 'comunicacao';
    }
  } catch (_) {}
  return 'colaborador';
}

var _NIVEL_GESTAO       = ['superadmin', 'admin', 'gestor', 'infraestrutura'];
var _NIVEL_CANCELAMENTO = ['superadmin', 'admin', 'gestor'];

// ═══════════════════════════════════════════════════════════════
// RESERVAS — LEITURA
// ═══════════════════════════════════════════════════════════════

/**
 * Lista reservas com filtros opcionais.
 * @param {Object} filtros — { status, sala, data, responsavel, dateRange:{de,ate} }
 */
function ctrl_reservas_listar(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    var f   = filtros || {};
    // colaborador vê apenas suas próprias reservas; gestão vê tudo
    var nivel = _nivelReservas(ctx.email);
    if (nivel === 'colaborador') f.responsavel = ctx.email;
    return ReservaEngine.listar(f, ctx.orgId);
  }, 'ctrl_reservas_listar');
}

/**
 * Retorna métricas do módulo de Reservas.
 */
function ctrl_reservas_metricas() {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    return ReservaEngine.metricas(ctx.orgId);
  }, 'ctrl_reservas_metricas');
}

/**
 * Verifica disponibilidade de uma sala para o horário informado.
 * @param {Object} params — { sala, data, horaInicio, horaTermino }
 */
function ctrl_reservas_verificar_disponibilidade(params) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    var p = params || {};
    if (!p.sala || !p.data || !p.horaInicio || !p.horaTermino) {
      throw new Error('Informe sala, data, horaInicio e horaTermino.');
    }
    return ReservaEngine.verificarDisponibilidade(
      p.sala, p.data, p.horaInicio, p.horaTermino, ctx.orgId
    );
  }, 'ctrl_reservas_verificar_disponibilidade');
}

// ═══════════════════════════════════════════════════════════════
// RESERVAS — ESCRITA
// ═══════════════════════════════════════════════════════════════

/**
 * Cria uma reserva para uma data específica.
 * @param {Object} dados — { sala, data, horaInicio, horaTermino, nomeAcao, ... }
 */
function ctrl_reservas_criar(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    if (!dados) throw new Error('Dados da reserva são obrigatórios.');
    // Garante que o responsável é o usuário logado (ou admin pode sobrescrever)
    var nivel = _nivelReservas(ctx.email);
    if (!dados.responsavel || nivel === 'colaborador') {
      dados.responsavel = ctx.email;
    }
    return ReservaEngine.criar(dados, ctx.email, ctx.orgId);
  }, 'ctrl_reservas_criar');
}

/**
 * Cria reservas em lote (múltiplas datas).
 * @param {Object} dados — campos base da reserva
 * @param {string[]} datas — array de strings YYYY-MM-DD
 */
function ctrl_reservas_criar_lote(dados, datas) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    if (!dados) throw new Error('Dados da reserva são obrigatórios.');
    if (!Array.isArray(datas) || datas.length === 0) throw new Error('Informe ao menos uma data.');
    if (datas.length > 60) throw new Error('Máximo de 60 datas por lote.');
    var nivel = _nivelReservas(ctx.email);
    if (!dados.responsavel || nivel === 'colaborador') {
      dados.responsavel = ctx.email;
    }
    return ReservaEngine.criarLote(dados, datas, ctx.email, ctx.orgId);
  }, 'ctrl_reservas_criar_lote');
}

/**
 * Atualiza dados de uma reserva.
 * @param {string} id
 * @param {Object} dados — campos a atualizar
 */
function ctrl_reservas_atualizar(id, dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    if (!id) throw new Error('ID da reserva é obrigatório.');
    if (!dados) throw new Error('Dados para atualização são obrigatórios.');
    var nivel = _nivelReservas(ctx.email);
    // Colaborador só edita reservas próprias
    if (nivel === 'colaborador') {
      var reserva = ReservaEngine.listar({ responsavel: ctx.email }, ctx.orgId)
        .filter(function (r) { return r.id === id; })[0];
      if (!reserva) throw new Error('Sem permissão para editar esta reserva.');
    }
    return ReservaEngine.atualizar(id, dados, ctx.email, ctx.orgId);
  }, 'ctrl_reservas_atualizar');
}

/**
 * Cancela uma reserva.
 * @param {string} id
 * @param {string} [motivo]
 */
function ctrl_reservas_cancelar(id, motivo) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    if (!id) throw new Error('ID da reserva é obrigatório.');
    var nivel = _nivelReservas(ctx.email);
    // Colaborador só cancela as próprias; gestão cancela qualquer uma
    if (nivel === 'colaborador') {
      var lista = ReservaEngine.listar({ responsavel: ctx.email }, ctx.orgId);
      var propria = lista.filter(function (r) { return r.id === id; })[0];
      if (!propria) throw new Error('Sem permissão para cancelar esta reserva.');
    }
    return ReservaEngine.mudarStatus(id, 'cancelado', ctx.email, ctx.orgId, motivo || '');
  }, 'ctrl_reservas_cancelar');
}

/**
 * Confirma uma reserva (pendente → confirmado).
 * Restrito a: infraestrutura, gestor, admin, superadmin.
 * @param {string} id
 */
function ctrl_reservas_confirmar(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    if (!id) throw new Error('ID da reserva é obrigatório.');
    var nivel = _nivelReservas(ctx.email);
    if (_NIVEL_GESTAO.indexOf(nivel) === -1) {
      throw new Error('Sem permissão para confirmar reservas.');
    }
    return ReservaEngine.mudarStatus(id, 'confirmado', ctx.email, ctx.orgId);
  }, 'ctrl_reservas_confirmar');
}

/**
 * Marca reserva como em uso (confirmado → em_uso).
 * Restrito a: infraestrutura, gestor, admin, superadmin.
 * @param {string} id
 */
function ctrl_reservas_iniciar(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    if (!id) throw new Error('ID da reserva é obrigatório.');
    var nivel = _nivelReservas(ctx.email);
    if (_NIVEL_GESTAO.indexOf(nivel) === -1) {
      throw new Error('Sem permissão para iniciar uso de espaço.');
    }
    return ReservaEngine.mudarStatus(id, 'em_uso', ctx.email, ctx.orgId);
  }, 'ctrl_reservas_iniciar');
}

/**
 * Habilita uma reserva confirmada para entrada (confirmado → habilitado).
 * Restrito a: infraestrutura, gestor, admin, superadmin.
 * @param {string} id
 */
function ctrl_reservas_habilitar(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    if (!id) throw new Error('ID da reserva é obrigatório.');
    var nivel = _nivelReservas(ctx.email);
    if (_NIVEL_GESTAO.indexOf(nivel) === -1) {
      throw new Error('Sem permissão para habilitar reservas.');
    }
    return ReservaEngine.mudarStatus(id, 'habilitado', ctx.email, ctx.orgId);
  }, 'ctrl_reservas_habilitar');
}

/**
 * Conclui o uso de um espaço (em_uso → concluido).
 * @param {string} id
 */
function ctrl_reservas_concluir(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    if (!id) throw new Error('ID da reserva é obrigatório.');
    var nivel = _nivelReservas(ctx.email);
    if (_NIVEL_GESTAO.indexOf(nivel) === -1) {
      throw new Error('Sem permissão para concluir uso de espaço.');
    }
    return ReservaEngine.mudarStatus(id, 'concluido', ctx.email, ctx.orgId);
  }, 'ctrl_reservas_concluir');
}

// ═══════════════════════════════════════════════════════════════
// BLOQUEIO CCBJ FECHADO
// ═══════════════════════════════════════════════════════════════

var _NIVEL_BLOQUEIO = ['superadmin', 'admin', 'gestor'];

/**
 * Cria bloqueio CCBJ Fechado em lote: uma sala × N datas.
 * O frontend itera todos os espaços, chamando este controller por sala.
 * Cancela automaticamente reservas conflitantes e notifica os responsáveis.
 *
 * @param {Object} params — { sala, horaInicio, horaTermino, motivo, turno? }
 * @param {string[]} datas — YYYY-MM-DD[]
 * @returns {{ total, idLote, cancelados, ids }}
 */
function ctrl_reservas_bloquear(params, datas) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    var nivel = _nivelReservas(ctx.email);
    if (_NIVEL_BLOQUEIO.indexOf(nivel) === -1) {
      throw new Error('Sem permissão para criar bloqueios CCBJ. Requer gestor, admin ou superadmin.');
    }
    if (!params || !params.sala)       throw new Error('Parâmetro "sala" é obrigatório.');
    if (!params.horaInicio)            throw new Error('Parâmetro "horaInicio" é obrigatório.');
    if (!params.horaTermino)           throw new Error('Parâmetro "horaTermino" é obrigatório.');
    if (!Array.isArray(datas) || datas.length === 0) throw new Error('Informe ao menos uma data.');
    if (datas.length > 120)            throw new Error('Máximo de 120 datas por operação de bloqueio.');

    return ReservaEngine.criarBloqueio(params, datas, ctx.email, ctx.orgId);
  }, 'ctrl_reservas_bloquear');
}

/**
 * Cancela um lote de bloqueios pelo ID (operação "Desfazer").
 * @param {string[]} ids — IDs dos bloqueios a cancelar
 * @returns {{ cancelados, total }}
 */
function ctrl_reservas_cancelar_bloqueios(ids) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    var nivel = _nivelReservas(ctx.email);
    if (_NIVEL_BLOQUEIO.indexOf(nivel) === -1) {
      throw new Error('Sem permissão para desfazer bloqueios CCBJ.');
    }
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('Informe ao menos um ID.');

    var cancelados = 0;
    ids.forEach(function (id) {
      try {
        ReservaEngine.mudarStatus(id, 'cancelado', ctx.email, ctx.orgId, 'Desfazer CCBJ Fechado');
        cancelados++;
      } catch (e) {
        Logger.warn('reservas_controller', 'ctrl_reservas_cancelar_bloqueios',
          'Falhou para ' + id + ': ' + e.message);
      }
    });

    return { cancelados: cancelados, total: ids.length };
  }, 'ctrl_reservas_cancelar_bloqueios');
}

/**
 * Retorna disponibilidade em tempo real de todos os itens do catálogo
 * para um espaço/data/horário específico.
 *
 * @param {Object} params { sala, data, horaInicio, horaTermino, excluirReservaId? }
 * @returns {{ itens: [{id,nome,categoria,total,disponivel,...}] }}
 */
function ctrl_reservas_disponibilidadeItens(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxReservas();
    var p = params || {};
    if (!p.data) throw new Error('data é obrigatória.');
    if (!p.horaInicio || !p.horaTermino) throw new Error('horaInicio e horaTermino são obrigatórios.');

    var itens = AlmoxarifadoEngine.calcularDisponibilidadeItens(p, ctx.orgId);
    return { itens: itens };
  }, 'ctrl_reservas_disponibilidadeItens');
}

// ═══════════════════════════════════════════════════════════════
// PÓS-EVENTO
// ═══════════════════════════════════════════════════════════════

/**
 * Registra ou atualiza os dados de execução pós-evento de uma reserva.
 *
 * @param {string} id — ID da reserva
 * @param {Object} dados — { realizado, contabilizar, publicoPresente, observacoes, comprovacoes[] }
 */
function ctrl_reservas_registrarPosEvento(id, dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    if (!id) throw new Error('ID da reserva é obrigatório.');
    return ReservaEngine.registrarPosEvento(id, dados || {}, ctx.email, ctx.orgId);
  }, 'ctrl_reservas_registrarPosEvento');
}

/**
 * Conclui silenciosamente reservas 'em_uso' cujo horário de término passou
 * há mais de 15 minutos. Chamado pelo frontend ao carregar a lista.
 */
function ctrl_reservas_concluir_atrasadas() {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    var lista = ReservaRepository.listar({ status: 'em_uso' }, ctx.orgId);
    var agora = new Date();
    var concluidas = 0;
    lista.forEach(function(r) {
      if (!r.data || !r.horaTermino) return;
      try {
        var fim = new Date(r.data + 'T' + r.horaTermino + ':00');
        fim.setMinutes(fim.getMinutes() + 15);
        if (agora > fim) {
          ReservaEngine.mudarStatus(r.id, 'concluido', 'sistema', ctx.orgId, 'Auto-conclusão: horário encerrado.');
          concluidas++;
        }
      } catch (_e) {}
    });
    return { concluidas: concluidas };
  }, 'ctrl_reservas_concluir_atrasadas');
}
