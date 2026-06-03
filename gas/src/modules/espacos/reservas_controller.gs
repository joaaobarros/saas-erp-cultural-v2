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
      if (p === 'habilitador')    return 'habilitador';
      if (p === 'financeiro')     return 'financeiro';
      if (p === 'comunicacao')    return 'comunicacao';
    }
  } catch (_) {}
  return 'colaborador';
}

var _NIVEL_GESTAO       = ['superadmin', 'admin', 'gestor', 'infraestrutura', 'habilitador'];
var _NIVEL_CANCELAMENTO = ['superadmin', 'admin', 'gestor'];

// Papéis que podem confirmar a qualquer momento (sem gate de tempo)
var _NIVEL_CONFIRMAR_SEMPRE = ['superadmin', 'admin', 'gestor', 'infraestrutura'];
// Dias de espera para escalação ao habilitador
var _DIAS_ESCALACAO_HABILITADOR = 2;

/**
 * Retorna quantos dias uma reserva pendente está aguardando confirmação.
 * Baseia-se em criadoEm; retorna 0 se não houver dado ou status não for pendente.
 */
function _diasPendente(r) {
  if ((r.status || '') !== 'pendente' || !r.criadoEm) return 0;
  var criado = new Date(r.criadoEm);
  if (isNaN(criado.getTime())) return 0;
  return Math.floor((new Date() - criado) / (1000 * 60 * 60 * 24));
}

/**
 * Deriva turnoId a partir de horaInicio/horaTermino (local — não depende do engine).
 */
function _inferirTurnoCtrl(horaInicio, horaTermino) {
  function _m(h) {
    if (!h) return -1;
    var p = String(h).split(':');
    return p.length < 2 ? -1 : parseInt(p[0],10)*60 + parseInt(p[1]||0,10);
  }
  var ini = _m(horaInicio), fim = _m(horaTermino);
  if (ini < 0) return '';
  if (fim <= 0) { return ini < 720 ? 'manha' : ini < 1080 ? 'tarde' : 'noite'; }
  var cobM = ini < 720 && fim > 480, cobT = ini < 1080 && fim > 720, cobN = ini < 1320 && fim > 1080;
  if (cobM && cobT && cobN) return 'integral';
  if (cobT && cobN) return 'tarde_noite';
  if (cobM && cobT) return 'manha_tarde';
  return cobN ? 'noite' : cobT ? 'tarde' : 'manha';
}

/**
 * Verifica se o e-mail é responsável pelo slot de uma reserva.
 * @returns {boolean}
 */
function _ehResponsavelSlot(email, r) {
  try {
    var diaNum = new Date(String(r.data) + 'T12:00:00').getDay();
    var turnoId = _inferirTurnoCtrl(r.horaInicio, r.horaTermino);
    var resp = SistemaConfigService.resolverResponsaveis
      ? SistemaConfigService.resolverResponsaveis(r.sala, diaNum, turnoId)
      : null;
    if (!resp || !Array.isArray(resp.emails)) return false;
    var emailNorm = String(email).toLowerCase().trim();
    return resp.emails.some(function(e) { return String(e).toLowerCase().trim() === emailNorm; });
  } catch(_) { return false; }
}

/**
 * Retorna true se o usuário (nivel + email) pode confirmar a reserva r.
 * Regras:
 *   - admin/superadmin/gestor/infraestrutura → sempre (se precisaAprovacao)
 *   - responsável do slot → sempre
 *   - habilitador → apenas após _DIAS_ESCALACAO_HABILITADOR dias pendente
 */
function _podeConfirmarReserva(nivel, email, r) {
  if (!r.precisaAprovacao) return false;
  if ((r.status || '') !== 'pendente') return false;
  if (_NIVEL_CONFIRMAR_SEMPRE.indexOf(nivel) >= 0) return true;
  if (_ehResponsavelSlot(email, r)) return true;
  if (nivel === 'habilitador' && _diasPendente(r) >= _DIAS_ESCALACAO_HABILITADOR) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════════
// RESERVAS — LEITURA
// ═══════════════════════════════════════════════════════════════

/**
 * Lista reservas com filtros opcionais.
 * Cada item retorna o campo `precisaAprovacao` (boolean) indicando se o
 * espaço/slot ainda exige confirmação manual — usado pelo frontend para
 * exibir (ou não) o botão "Confirmar".
 *
 * @param {Object} filtros — { status, sala, data, responsavel, dateRange:{de,ate} }
 */
function ctrl_reservas_listar(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    var f   = filtros || {};
    // colaborador vê apenas suas próprias reservas; gestão vê tudo
    var nivel = _nivelReservas(ctx.email);
    if (nivel === 'colaborador') f.responsavel = ctx.email;

    var lista = ReservaEngine.listar(f, ctx.orgId);

    // Anotar cada reserva com campos de aprovação e escalação
    if (Array.isArray(lista)) {
      lista.forEach(function(r) {
        try {
          r.precisaAprovacao = ReservaEngine.precisaAprovacao(
            r.sala, r.data, r.horaInicio, r.horaTermino,
            r.setor || '', r.responsavel || ''
          );
        } catch(_) {
          r.precisaAprovacao = false;
        }

        // Dias aguardando confirmação (0 se não for pendente ou criadoEm ausente)
        r.diasPendente = _diasPendente(r);

        // Sinaliza ao frontend quando a escalação ao habilitador já está ativa
        r.escalonadoParaHabilitador = r.precisaAprovacao &&
          r.diasPendente >= _DIAS_ESCALACAO_HABILITADOR;

        // Permissão de confirmação para o usuário atual (evita lógica duplicada no frontend)
        r.podeConfirmar = _podeConfirmarReserva(nivel, ctx.email, r);
      });
    }

    return lista;
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
 *
 * Quem pode confirmar:
 *   • admin / superadmin / gestor / infraestrutura — a qualquer momento
 *   • responsável cadastrado no espaço/slot — a qualquer momento
 *   • habilitador — apenas após _DIAS_ESCALACAO_HABILITADOR dias aguardando
 *
 * @param {string} id
 */
function ctrl_reservas_confirmar(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    if (!id) throw new Error('ID da reserva é obrigatório.');
    var nivel = _nivelReservas(ctx.email);

    // Buscar a reserva para avaliação de permissão
    var lista = ReservaEngine.listar({}, ctx.orgId);
    var r = null;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === id) { r = lista[i]; break; }
    }
    if (!r) throw new Error('Reserva não encontrada.');

    // Anotar precisaAprovacao e diasPendente para usar nos helpers
    try {
      r.precisaAprovacao = ReservaEngine.precisaAprovacao(
        r.sala, r.data, r.horaInicio, r.horaTermino, r.setor || '', r.responsavel || ''
      );
    } catch(_) { r.precisaAprovacao = true; } // conservador: exige aprovação em caso de dúvida
    r.diasPendente = _diasPendente(r);

    if (!_podeConfirmarReserva(nivel, ctx.email, r)) {
      var _dias = r.diasPendente;
      var _restam = Math.max(0, _DIAS_ESCALACAO_HABILITADOR - _dias);
      if (nivel === 'habilitador' && _restam > 0) {
        throw new Error(
          'Escalação disponível em ' + _restam + ' dia(s). ' +
          'O habilitador pode confirmar após ' + _DIAS_ESCALACAO_HABILITADOR +
          ' dias sem resposta dos responsáveis.'
        );
      }
      throw new Error(
        'Sem permissão para confirmar esta reserva. ' +
        'Apenas responsáveis pelo espaço/período ou gestores podem confirmar.'
      );
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
