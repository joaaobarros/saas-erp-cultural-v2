/**
 * @file modules/espacos/mapa_controller.gs
 * @layer modules/espacos
 * @description Bridge GAS para o Mapa Interativo de Espaços.
 *   Retorna status em tempo real de cada espaço para uma data/horário,
 *   cruzando configuração de espaços com reservas ativas.
 *
 * @depends modules/espacos/reserva_repository.gs (ReservaRepository)
 *          core/config_service.gs (SistemaConfigService)
 *          core/services/acesso_service.gs (AcessoService)
 *          shared/response.gs (GasResponse)
 *          core/auth_session.gs (getEmailSessao)
 *          core/config.gs (getOrgConfig)
 */

// ── Helpers privados ─────────────────────────────────────────────────────

function _ctxMapa() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

/** Compara hora "HH:MM" com agora; retorna true se agora está entre ini e fim */
function _horaAtualEntre(ini, fim) {
  try {
    var agr  = new Date();
    var hAtual = agr.getHours() * 60 + agr.getMinutes();
    var p = ini.split(':'); var hIni = Number(p[0]) * 60 + Number(p[1]);
    var q = fim.split(':'); var hFim = Number(q[0]) * 60 + Number(q[1]);
    return hAtual >= hIni && hAtual < hFim;
  } catch (e) { return false; }
}

/** Dado array de reservas de um espaço, determina status e reserva ativa */
function _calcularStatusEspaco(espaco, reservasDia, horaReferencia) {
  if (espaco.emManutencao) return { status: 'manutencao', reservaAtiva: null };
  if (!espaco.ativo) return { status: 'bloqueado', reservaAtiva: null };

  var ativas  = reservasDia.filter(function(r) {
    return r.sala === espaco.id &&
           r.status !== 'cancelado' && r.status !== 'concluido';
  });

  var emUso = ativas.filter(function(r) { return r.status === 'em_uso'; });
  if (emUso.length > 0) return { status: 'em_uso', reservaAtiva: emUso[0] };

  var confirmadas = ativas.filter(function(r) { return r.status === 'confirmado'; });
  if (horaReferencia) {
    // Filtrar confirmadas que cobrem o horário de referência
    var noMomento = confirmadas.filter(function(r) {
      try {
        var p  = horaReferencia.split(':');
        var hRef = Number(p[0]) * 60 + Number(p[1]);
        var i  = r.horaInicio.split(':');
        var hIni = Number(i[0]) * 60 + Number(i[1]);
        var f  = r.horaTermino.split(':');
        var hFim = Number(f[0]) * 60 + Number(f[1]);
        return hRef >= hIni && hRef < hFim;
      } catch (e) { return false; }
    });
    if (noMomento.length > 0) return { status: 'ocupado', reservaAtiva: noMomento[0] };
  } else {
    // Sem hora de referência: usar hora atual do servidor
    var agora_ = confirmadas.filter(function(r) {
      return _horaAtualEntre(r.horaInicio, r.horaTermino);
    });
    if (agora_.length > 0) return { status: 'ocupado', reservaAtiva: agora_[0] };
  }

  var pendentes = ativas.filter(function(r) { return r.status === 'pendente'; });
  if (pendentes.length > 0) return { status: 'aguardando', reservaAtiva: pendentes[0] };

  return { status: 'disponivel', reservaAtiva: null };
}

// ── Controllers públicos ────────────────────────────────────────────────

/**
 * Retorna status em tempo real de todos os espaços ativos para uma data.
 * Usado pelo MapaUI para colorir o SVG e preencher o painel lateral.
 *
 * @param {Object} params
 *   params.data        {string}  'YYYY-MM-DD' (default: hoje)
 *   params.horaInicio  {string}  'HH:MM' (opcional — filtra ocupação pontual)
 *
 * @returns {ok, data: { espacos: EspacoStatus[], dataConsulta }}
 */
function ctrl_mapa_statusEspacos(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxMapa();
    var p   = params || {};

    var hoje = Utilities.formatDate(new Date(), getOrgConfig().timezone, 'yyyy-MM-dd');
    var data = p.data || hoje;
    var hora = p.horaInicio || null;

    var espacos = SistemaConfigService.getEspacos();
    var reservasDia = ReservaRepository.listar({ data: data }, ctx.orgId);

    var resultado = espacos.map(function(esp) {
      var res = reservasDia.filter(function(r) {
        return r.sala === esp.id && r.status !== 'cancelado' && r.status !== 'concluido';
      });
      var calc = _calcularStatusEspaco(esp, reservasDia, hora);

      var proxima = null;
      var futuras = res.filter(function(r) {
        return r.status === 'confirmado' || r.status === 'pendente';
      }).sort(function(a, b) {
        return a.horaInicio.localeCompare(b.horaInicio);
      });
      if (!calc.reservaAtiva && futuras.length > 0) proxima = futuras[0];

      return {
        id:               esp.id,
        nome:             esp.nome,
        numeroPlanta:     esp.numeroPlanta || null,
        tipoEspaco:       esp.tipoEspaco   || 'multiuso',
        categoria:        esp.categoria    || 'uso_publico',
        capacidade:       esp.capacidade   || 0,
        possuiChaves:     esp.possuiChaves  === true,
        aceitaReserva:    esp.aceitaReserva !== false,
        mapaConfig:       esp.mapaConfig   || null,
        nivel:            esp.nivel !== undefined ? esp.nivel : 0,
        emManutencao:     !!esp.emManutencao,
        itensFixos:       esp.itensFixos   || {},
        status:           calc.status,
        reservaAtiva:     calc.reservaAtiva,
        proximaReserva:   proxima,
        totalReservasHoje: res.length
      };
    });

    return { espacos: resultado, dataConsulta: data };
  }, 'ctrl_mapa_statusEspacos');
}

/**
 * Retorna reservas de um espaço em um intervalo de datas.
 * Usado pelo painel lateral para mostrar agenda da semana.
 *
 * @param {Object} params
 *   params.espacoId  {string}  ID do espaço (obrigatório)
 *   params.de        {string}  'YYYY-MM-DD' (default: hoje)
 *   params.ate       {string}  'YYYY-MM-DD' (default: +6 dias)
 *
 * @returns {ok, data: { reservas: Reserva[] }}
 */
function ctrl_mapa_reservasEspaco(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxMapa();
    var p   = params || {};
    if (!p.espacoId) throw new Error('espacoId é obrigatório.');

    var _tz  = getOrgConfig().timezone;
    var hoje = Utilities.formatDate(new Date(), _tz, 'yyyy-MM-dd');
    var de   = p.de  || hoje;
    var d    = new Date(de + 'T12:00:00');
    d.setDate(d.getDate() + 6);
    var ate  = p.ate || Utilities.formatDate(d, _tz, 'yyyy-MM-dd');

    var reservas = ReservaRepository.listar(
      { sala: p.espacoId, dateRange: { de: de, ate: ate } },
      ctx.orgId
    ).filter(function(r) {
      return r.status !== 'cancelado';
    }).sort(function(a, b) {
      return (a.data + a.horaInicio).localeCompare(b.data + b.horaInicio);
    });

    return { reservas: reservas };
  }, 'ctrl_mapa_reservasEspaco');
}
