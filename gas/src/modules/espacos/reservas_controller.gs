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

// ── AppCache ─────────────────────────────────────────────────────────────────
var _CK_RES_LISTA    = 'reservas_lista_';
var _CK_RES_METRICAS = 'reservas_metricas_';

function _invalidarCachesReservas(orgId) {
  try { AppCache.remove(_CK_RES_METRICAS + (orgId || '')); } catch(_) {}
  // Chaves de lista são por usuário — expiram naturalmente (TTL 60s)
}

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

var _NIVEL_GESTAO       = ['superadmin', 'admin', 'gestor', 'habilitador'];
var _NIVEL_CANCELAMENTO = ['superadmin', 'admin', 'gestor'];

// Soberanos: confirmam imediatamente, independente de responsável configurado
var _NIVEL_CONFIRMAR_SEMPRE = ['superadmin', 'admin', 'gestor'];
// Habilitador respeita a prioridade do responsável: aguarda _DIAS_ESCALACAO dias sem resposta
var _NIVEL_ESCALACAO = ['habilitador'];
// Dias de espera antes de habilitador poder confirmar no lugar do responsável
var _DIAS_ESCALACAO = 2;

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
 * Resolve responsáveis do slot de uma reserva.
 * Retorna { emails, setorId } ou null.
 */
function _resolverRespSlot(r) {
  try {
    var diaNum = new Date(String(r.data) + 'T12:00:00').getDay();
    var turnoId = _inferirTurnoCtrl(r.horaInicio, r.horaTermino);
    return SistemaConfigService.resolverResponsaveis
      ? SistemaConfigService.resolverResponsaveis(r.sala, diaNum, turnoId)
      : null;
  } catch(_) { return null; }
}

/**
 * Verifica se o e-mail é responsável pelo slot de uma reserva.
 */
function _ehResponsavelSlot(email, r) {
  var resp = _resolverRespSlot(r);
  if (!resp || !Array.isArray(resp.emails)) return false;
  var emailNorm = String(email).toLowerCase().trim();
  return resp.emails.some(function(e) { return String(e).toLowerCase().trim() === emailNorm; });
}

/**
 * Verifica se o usuário pertence ao mesmo setor que o responsável do slot.
 * Lê registro.setor via AcessoService.
 */
function _ehMesmoSetorDoResponsavel(email, r) {
  try {
    var resp = _resolverRespSlot(r);
    if (!resp || !resp.setorId) return false;
    var acesso = AcessoService.verificar(email);
    if (!acesso || !acesso.registro) return false;
    var setorUsuario = String(acesso.registro.setor || '').trim();
    return setorUsuario && setorUsuario === String(resp.setorId).trim();
  } catch(_) { return false; }
}

/**
 * Retorna true se o usuário (nivel + email) pode confirmar a reserva r.
 * Regras:
 *   - admin / superadmin / gestor → sempre (soberanos)
 *   - responsável cadastrado no slot → sempre
 *   - mesmo setor do responsável do slot → sempre (em todos os papéis)
 *   - infraestrutura / habilitador → após _DIAS_ESCALACAO dias sem resposta
 */
function _podeConfirmarReserva(nivel, email, r) {
  if (!r.precisaAprovacao) return false;
  if ((r.status || '') !== 'pendente') return false;
  if (_NIVEL_CONFIRMAR_SEMPRE.indexOf(nivel) >= 0) return true;
  if (_ehResponsavelSlot(email, r)) return true;
  if (_ehMesmoSetorDoResponsavel(email, r)) return true;
  if (_NIVEL_ESCALACAO.indexOf(nivel) >= 0 && _diasPendente(r) >= _DIAS_ESCALACAO) return true;
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

    var ck = _CK_RES_LISTA + ctx.orgId + '_' + ctx.email.replace(/[^a-z0-9]/g,'_') + '_' + JSON.stringify(f);
    try { var cached = AppCache.get(ck); if (cached) return cached; } catch(_) {}

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

        // Sinaliza ao frontend quando escalação (infraestrutura + habilitador) está ativa
        r.escalonadoParaHabilitador = r.precisaAprovacao &&
          r.diasPendente >= _DIAS_ESCALACAO;

        // Permissão de confirmação para o usuário atual (evita lógica duplicada no frontend)
        r.podeConfirmar = _podeConfirmarReserva(nivel, ctx.email, r);
      });
    }

    try { AppCache.set(ck, lista, 60); } catch(_) {}
    return lista;
  }, 'ctrl_reservas_listar');
}

/**
 * Retorna métricas do módulo de Reservas.
 */
function ctrl_reservas_metricas() {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    var ck = _CK_RES_METRICAS + ctx.orgId;
    try { var cached = AppCache.get(ck); if (cached) return cached; } catch(_) {}
    var m = ReservaEngine.metricas(ctx.orgId);
    try { AppCache.set(ck, m, 120); } catch(_) {}
    return m;
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
 * Fase 79: se dados.itensMateriais (array de {itemId, descricao, qtdSolicitada}) for
 * fornecido, cria automaticamente uma SolicitacaoMaterial vinculada via reservaId.
 * O campo itensMateriais não é persistido na reserva — serve apenas para orquestrar
 * a criação da solicitação. Retorna { ...reserva, solicitacaoCodigo }.
 *
 * @param {Object} dados — { sala, data, horaInicio, horaTermino, nomeAcao,
 *                           itensMateriais?: [{itemId, descricao, qtdSolicitada}], ... }
 */
function ctrl_reservas_criar(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    if (!dados) throw new Error('Dados da reserva são obrigatórios.');
    var nivel = _nivelReservas(ctx.email);
    if (!dados.responsavel || nivel === 'colaborador') {
      dados.responsavel = ctx.email;
    }

    // Fase 79: extrair itensMateriais antes de passar ao engine (não faz parte do schema da reserva)
    var itensMateriais = Array.isArray(dados.itensMateriais) ? dados.itensMateriais.slice() : [];
    delete dados.itensMateriais;

    var reserva = ReservaEngine.criar(dados, ctx.email, ctx.orgId);
    _invalidarCachesReservas(ctx.orgId);

    // Fase 79: auto-criar SolicitacaoMaterial vinculada (best-effort — falha não cancela reserva)
    var solicitacaoCodigo = '';
    var itensSolicitaveis = itensMateriais.filter(function(it) {
      return it && it.itemId && Number(it.qtdSolicitada) > 0;
    });
    if (itensSolicitaveis.length > 0) {
      try {
        var sol = EstoqueEngine.novaSolicitacao({
          itens:        itensSolicitaveis,
          setorDestino: dados.setor || 'geral',
          solicitante:  ctx.email,
          observacoes:  'Reserva: ' + (dados.nomeAcao || reserva.id),
          reservaId:    reserva.id
        }, ctx.email, ctx.orgId);
        solicitacaoCodigo = sol ? (sol.codigo || '') : '';
        Logger.info('reservas_controller', 'ctrl_reservas_criar',
          'SolicitacaoMaterial ' + solicitacaoCodigo + ' vinculada à reserva ' + reserva.id);
      } catch (solErr) {
        Logger.warn('reservas_controller', 'ctrl_reservas_criar',
          'Reserva ' + reserva.id + ' criada, mas SolicitacaoMaterial falhou: ' + solErr.message);
      }
    }

    return Object.assign({}, reserva, { solicitacaoCodigo: solicitacaoCodigo });
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
    var r = ReservaEngine.criarLote(dados, datas, ctx.email, ctx.orgId);
    _invalidarCachesReservas(ctx.orgId);
    return r;
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
      var reserva = ReservaRepository.buscarPorId(id, ctx.orgId);
      if (!reserva || String(reserva.responsavel || '').toLowerCase() !== ctx.email.toLowerCase()) {
        throw new Error('Sem permissão para editar esta reserva.');
      }
    }
    var r = ReservaEngine.atualizar(id, dados, ctx.email, ctx.orgId);
    _invalidarCachesReservas(ctx.orgId);
    return r;
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
      var propria = ReservaRepository.buscarPorId(id, ctx.orgId);
      if (!propria || String(propria.responsavel || '').toLowerCase() !== ctx.email.toLowerCase()) {
        throw new Error('Sem permissão para cancelar esta reserva.');
      }
    }
    var r = ReservaEngine.mudarStatus(id, 'cancelado', ctx.email, ctx.orgId, motivo || '');
    _invalidarCachesReservas(ctx.orgId);
    return r;
  }, 'ctrl_reservas_cancelar');
}

/**
 * Confirma uma reserva (pendente → confirmado).
 *
 * Quem pode confirmar:
 *   • admin / superadmin / gestor — soberanos, a qualquer momento
 *   • responsável cadastrado no espaço/slot — a qualquer momento
 *   • mesmo setor do responsável — a qualquer momento
 *   • habilitador — somente após _DIAS_ESCALACAO dias sem resposta do responsável
 *     (responsável tem prioridade; habilitador é fallback de escalação)
 *
 * @param {string} id
 */
function ctrl_reservas_confirmar(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    if (!id) throw new Error('ID da reserva é obrigatório.');
    var nivel = _nivelReservas(ctx.email);

    // Buscar a reserva diretamente por ID (evita carregar toda a planilha)
    var r = ReservaRepository.buscarPorId(id, ctx.orgId);
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
      var _restam = Math.max(0, _DIAS_ESCALACAO - _dias);
      if (_NIVEL_ESCALACAO.indexOf(nivel) >= 0 && _restam > 0) {
        throw new Error(
          'Escalação disponível em ' + _restam + ' dia(s). ' +
          'Infraestrutura e habilitador podem confirmar após ' + _DIAS_ESCALACAO +
          ' dias sem resposta dos responsáveis.'
        );
      }
      throw new Error(
        'Sem permissão para confirmar esta reserva. ' +
        'Apenas responsáveis pelo espaço/período ou gestores podem confirmar.'
      );
    }

    var r = ReservaEngine.mudarStatus(id, 'confirmado', ctx.email, ctx.orgId);
    _invalidarCachesReservas(ctx.orgId);
    return r;
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
    var r = ReservaEngine.mudarStatus(id, 'em_uso', ctx.email, ctx.orgId);
    _invalidarCachesReservas(ctx.orgId);
    return r;
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
    var r = ReservaEngine.mudarStatus(id, 'habilitado', ctx.email, ctx.orgId);
    _invalidarCachesReservas(ctx.orgId);
    return r;
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
    var r = ReservaEngine.mudarStatus(id, 'concluido', ctx.email, ctx.orgId);
    _invalidarCachesReservas(ctx.orgId);
    return r;
  }, 'ctrl_reservas_concluir');
}

// ═══════════════════════════════════════════════════════════════
// VÍNCULO COM GOOGLE CALENDAR (manual, opcional)
// ═══════════════════════════════════════════════════════════════

/**
 * Vincula uma reserva a um novo evento no Google Calendar.
 * Colaborador só vincula reservas próprias; gestão vincula qualquer uma.
 *
 * @param {string} id
 * @param {Object} opcoes — { modo: 'todos'|'especificos', selecionados?: string[], extras?: string[] }
 */
function ctrl_reservas_vincular_calendar(id, opcoes) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    if (!id) throw new Error('ID da reserva é obrigatório.');
    var nivel = _nivelReservas(ctx.email);
    if (nivel === 'colaborador') {
      var propria = ReservaRepository.buscarPorId(id, ctx.orgId);
      if (!propria || String(propria.responsavel || '').toLowerCase() !== ctx.email.toLowerCase()) {
        throw new Error('Sem permissão para vincular esta reserva ao Calendar.');
      }
    }
    var r = ReservaEngine.vincularCalendar(id, opcoes || {}, ctx.email, ctx.orgId);
    _invalidarCachesReservas(ctx.orgId);
    return r;
  }, 'ctrl_reservas_vincular_calendar');
}

/**
 * Remove o vínculo de uma reserva com o Google Calendar.
 * @param {string} id
 */
function ctrl_reservas_desvincular_calendar(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctxReservas();
    if (!id) throw new Error('ID da reserva é obrigatório.');
    var nivel = _nivelReservas(ctx.email);
    if (nivel === 'colaborador') {
      var propria = ReservaRepository.buscarPorId(id, ctx.orgId);
      if (!propria || String(propria.responsavel || '').toLowerCase() !== ctx.email.toLowerCase()) {
        throw new Error('Sem permissão para desvincular esta reserva do Calendar.');
      }
    }
    var r = ReservaEngine.desvincularCalendar(id, ctx.email, ctx.orgId);
    _invalidarCachesReservas(ctx.orgId);
    return r;
  }, 'ctrl_reservas_desvincular_calendar');
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

    var r = ReservaEngine.criarBloqueio(params, datas, ctx.email, ctx.orgId);
    _invalidarCachesReservas(ctx.orgId);
    return r;
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

    _invalidarCachesReservas(ctx.orgId);
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
    var r = ReservaEngine.registrarPosEvento(id, dados || {}, ctx.email, ctx.orgId);
    _invalidarCachesReservas(ctx.orgId);
    return r;
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
    if (concluidas > 0) _invalidarCachesReservas(ctx.orgId);
    return { concluidas: concluidas };
  }, 'ctrl_reservas_concluir_atrasadas');
}
