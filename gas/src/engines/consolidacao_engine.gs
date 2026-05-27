/**
 * @file engines/consolidacao_engine.gs
 * @layer engines
 * @description Engine de consolidação de execução física e financeira por Ação.
 *
 * Responsabilidades:
 *   - Ler reservas pós-evento vinculadas a uma ação (contabilizar=true)
 *   - Calcular horas de atividade reais (já descontadas montagem/encerramento)
 *   - Ler público presente por reserva e agregar por mês
 *   - Comparar com metaExecucao da ação (horasTotaisPrevistas, publicoTotalPrevisto,
 *     metasPorMes[])
 *   - Ler execução financeira dos contratos vinculados à ação
 *   - Retornar tabela mês-a-mês e totais com percentuais físico e financeiro
 *
 * Função principal:
 *   ConsolidacaoEngine.calcularExecucaoAcao(acaoId, orgId)
 *   → { porMes: [...], total: {...}, metaExecucao: {...}, geradoEm }
 *
 * @depends modules/acoes/acao_repository.gs (AcaoRepository)
 *          modules/espacos/reserva_repository.gs (ReservaRepository)
 *          modules/financeiro/contrato_repository.gs (ContratoRepository)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 */

var ConsolidacaoEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  /** Converte "HH:MM" em minutos. */
  function _horaParaMin(h) {
    if (!h) return -1;
    var p = String(h).split(':');
    if (p.length < 2) return -1;
    var hh = parseInt(p[0], 10), mm = parseInt(p[1], 10);
    return (isNaN(hh) || isNaN(mm)) ? -1 : hh * 60 + mm;
  }

  /** Extrai "YYYY-MM" de uma string de data "YYYY-MM-DD". */
  function _mesAno(data) {
    if (!data || data.length < 7) return null;
    return data.slice(0, 7);
  }

  /** Formata percentual como número com 1 casa decimal. */
  function _perc(realizado, previsto) {
    if (!previsto || previsto <= 0) return null;
    return Math.round((realizado / previsto) * 1000) / 10; // ex: 87.3
  }

  /** Formata minutos como "Xh Ymin". */
  function _fmtMin(min) {
    var m = Math.max(0, Math.round(min));
    var h = Math.floor(m / 60), rest = m % 60;
    if (h > 0 && rest > 0) return h + 'h ' + rest + 'min';
    if (h > 0) return h + 'h';
    return rest + 'min';
  }

  // ── Consolidação principal ─────────────────────────────────────────────

  /**
   * Calcula execução física e financeira de uma Ação, mês a mês.
   *
   * @param {string} acaoId
   * @param {string} [orgId]
   * @returns {{
   *   porMes: Array<{
   *     mes: string,            // "YYYY-MM"
   *     mesLabel: string,       // "Jan/2025"
   *     sessoes: number,        // reservas contabilizadas no mês
   *     horasAtividade: number, // horas reais de contato com público (decimal)
   *     horasAtividadeMin: number,
   *     horasAtividadeStr: string,
   *     publicoPresente: number,
   *     horasPrevistas: number|null,
   *     publicoPrevisto: number|null,
   *     valorPrevisto: number,
   *     valorExecutado: number,
   *     percFisico: number|null,
   *     percFinanceiro: number|null
   *   }>,
   *   total: { ... },
   *   metaExecucao: Object|null,
   *   geradoEm: string
   * }}
   */
  function calcularExecucaoAcao(acaoId, orgId) {
    orgId = orgId || _orgId();

    var acao = AcaoRepository.buscarPorId(orgId, acaoId);
    if (!acao) throw new Error('Ação não encontrada: ' + acaoId);

    var metaExecucao = acao.metaExecucao || null;

    // ── Reservas vinculadas à ação ────────────────────────────────────────
    var todasReservas = [];
    try {
      if (typeof ReservaRepository !== 'undefined') {
        todasReservas = ReservaRepository.listar({}, orgId).filter(function (r) {
          return r.acaoId === acaoId && r.status !== 'cancelado';
        });
      }
    } catch (e) {
      Logger.warn('consolidacao_engine', 'calcularExecucaoAcao', 'Erro ao listar reservas: ' + e.message);
    }

    // Reservas que devem ser contabilizadas (têm posEvento registrado e contabilizar=true)
    var reservasContabilizadas = todasReservas.filter(function (r) {
      return r.posEvento && r.posEvento.registradoEm &&
             r.posEvento.realizado !== false &&
             r.posEvento.contabilizar !== false;
    });

    // ── Contratos financeiros vinculados à ação ──────────────────────────
    var contratos = [];
    try {
      if (typeof ContratoRepository !== 'undefined') {
        contratos = ContratoRepository.listar(orgId, { acaoId: acaoId });
      }
    } catch (e) {
      Logger.warn('consolidacao_engine', 'calcularExecucaoAcao', 'Erro ao listar contratos: ' + e.message);
    }

    // Calcular total previsto e executado dos contratos (sem mês a mês por ora)
    var totalPrevisto  = 0;
    var totalExecutado = 0;
    contratos.forEach(function (c) {
      totalPrevisto  += Number(c.valorTotal     || 0);
      totalExecutado += Number(c.valorExecutado || 0);
    });

    // ── Agregar por mês ───────────────────────────────────────────────────
    var porMesMap = {}; // "YYYY-MM" → { sessoes, horasAtividadeMin, publicoPresente }

    reservasContabilizadas.forEach(function (r) {
      var mes = _mesAno(r.data);
      if (!mes) return;
      if (!porMesMap[mes]) porMesMap[mes] = { sessoes: 0, horasAtividadeMin: 0, publicoPresente: 0 };
      porMesMap[mes].sessoes++;

      // Tempo de atividade: usa posEvento.tempoAtividadeMin se disponível
      // (calculado no backend no momento do registro), senão recalcula
      var pe = r.posEvento;
      var atividadeMin;
      if (pe && pe.tempoAtividadeMin != null) {
        atividadeMin = Number(pe.tempoAtividadeMin);
      } else {
        var ini = _horaParaMin(r.horaInicio);
        var fim = _horaParaMin(r.horaTermino);
        var dur = (ini >= 0 && fim > ini) ? fim - ini : 0;
        atividadeMin = Math.max(0, dur - Number(r.minutosMontagem || 0) - Number(r.minutosEncerramento || 0));
      }
      porMesMap[mes].horasAtividadeMin += atividadeMin;
      porMesMap[mes].publicoPresente   += Number((pe && pe.publicoPresente) || 0);
    });

    // ── Metas por mês (do metaExecucao.metasPorMes) ──────────────────────
    var metasPorMesMap = {};
    if (metaExecucao && Array.isArray(metaExecucao.metasPorMes)) {
      metaExecucao.metasPorMes.forEach(function (m) {
        if (m.mes) metasPorMesMap[m.mes] = m;
      });
    }

    // ── Construir lista ordenada de meses ────────────────────────────────
    var mesesSet = {};
    Object.keys(porMesMap).forEach(function (m) { mesesSet[m] = true; });
    Object.keys(metasPorMesMap).forEach(function (m) { mesesSet[m] = true; });
    var meses = Object.keys(mesesSet).sort();

    var _MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    var porMes = meses.map(function (mes) {
      var real = porMesMap[mes] || { sessoes: 0, horasAtividadeMin: 0, publicoPresente: 0 };
      var meta = metasPorMesMap[mes] || null;

      var horasPrevistosMes  = meta ? (Number(meta.horasPrevistas  || 0) * 60) : null; // em minutos
      var publicoPrevMes     = meta ? Number(meta.publicoPrevisto  || 0) : null;

      var partes = mes.split('-');
      var mesLabel = _MESES_PT[parseInt(partes[1], 10) - 1] + '/' + partes[0];

      return {
        mes:               mes,
        mesLabel:          mesLabel,
        sessoes:           real.sessoes,
        horasAtividadeMin: real.horasAtividadeMin,
        horasAtividade:    Math.round(real.horasAtividadeMin / 60 * 10) / 10,
        horasAtividadeStr: _fmtMin(real.horasAtividadeMin),
        publicoPresente:   real.publicoPresente,
        horasPrevistasMin: horasPrevistosMes,
        horasPrevistas:    horasPrevistosMes != null ? Math.round(horasPrevistosMes / 60 * 10) / 10 : null,
        publicoPrevisto:   publicoPrevMes,
        valorPrevisto:     0, // financeiro mensal ainda sem mapeamento por mês
        valorExecutado:    0,
        percFisico:        _perc(real.horasAtividadeMin, horasPrevistosMes),
        percPublico:       _perc(real.publicoPresente, publicoPrevMes)
      };
    });

    // ── Totais ────────────────────────────────────────────────────────────
    var totHorasMin   = 0, totPublico = 0, totSessoes = 0;
    porMes.forEach(function (m) {
      totHorasMin  += m.horasAtividadeMin;
      totPublico   += m.publicoPresente;
      totSessoes   += m.sessoes;
    });

    var metaTotalHorasMin = metaExecucao
      ? Number(metaExecucao.horasTotaisPrevistas || 0) * 60 : null;
    var metaTotalPublico  = metaExecucao
      ? Number(metaExecucao.publicoTotalPrevisto  || acao.publicoPrevisto || 0) : null;

    var total = {
      sessoes:           totSessoes,
      horasAtividadeMin: totHorasMin,
      horasAtividade:    Math.round(totHorasMin / 60 * 10) / 10,
      horasAtividadeStr: _fmtMin(totHorasMin),
      publicoPresente:   totPublico,
      horasTotaisPrevistasMin: metaTotalHorasMin,
      horasTotaisPrevistas:    metaTotalHorasMin != null ? Math.round(metaTotalHorasMin / 60 * 10) / 10 : null,
      publicoTotalPrevisto:    metaTotalPublico,
      valorPrevisto:     totalPrevisto,
      valorExecutado:    totalExecutado,
      percFisico:        _perc(totHorasMin, metaTotalHorasMin),
      percPublico:       _perc(totPublico,  metaTotalPublico),
      percFinanceiro:    _perc(totalExecutado, totalPrevisto)
    };

    return {
      acaoId:      acaoId,
      acaoNome:    acao.nome || '',
      porMes:      porMes,
      total:       total,
      metaExecucao: metaExecucao,
      geradoEm:    new Date().toISOString()
    };
  }

  // ── API pública ──────────────────────────────────────────────────────────

  return {
    calcularExecucaoAcao: calcularExecucaoAcao
  };

})();

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * Retorna o relatório de execução de uma ação (físico + financeiro, mês a mês).
 * @param {string} acaoId
 */
function ctrl_consolidacao_execucaoAcao(acaoId) {
  return GasResponse.wrap(function () {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
    if (!acaoId) throw new Error('acaoId é obrigatório.');
    return ConsolidacaoEngine.calcularExecucaoAcao(acaoId, getOrgConfig().orgId);
  }, 'ctrl_consolidacao_execucaoAcao');
}
