/**
 * @file jornada_engine.gs
 * @layer engine
 * @description Motor de Reconstituição de Jornadas de Trabalho.
 *
 *   Problema central: o relógio iDClass (e a maioria dos REPs) grava apenas
 *   timestamps — não distingue se a batida é entrada, saída ou intervalo.
 *   Este engine reconstrói a sequência E/I/R/S e calcula os tempos.
 *
 *   Algoritmo de derivação de tipos (baseado na posição ordinal da batida):
 *
 *     Posição 0     → sempre E  (entrada)
 *     Posição n-1   → sempre S  (saída)
 *     Posição ímpar entre 0 e n-1 → I  (início de intervalo)
 *     Posição par  entre 0 e n-1  → R  (retorno de intervalo)
 *
 *   Exemplos:
 *     2 batidas: E S
 *     4 batidas: E I R S
 *     6 batidas: E I R I R S   (dois intervalos)
 *     3 batidas: E I S         (incompleta — retorno ausente ou pré-intervalo sem saída)
 *     1 batida:  E             (incompleta — sem saída)
 *
 *   Cálculo de minutos trabalhados: soma dos pares (E→I), (R→I), (R→S).
 *   Ou seja, pares de índice (0,1), (2,3), (4,5) nas batidas ordenadas.
 *
 *   Classificação da jornada:
 *     'completa'       — n par ≥ 2, todas em ordem cronológica crescente
 *     'incompleta'     — n ímpar ≥ 1 (falta saída ou retorno)
 *     'inconsistente'  — batidas fora de ordem cronológica
 *
 *   Jornadas 'ausente' (sem batida) NÃO são salvas — o espelho as infere.
 *
 * @depends jornada_repository.gs, ponto_repository.gs
 */

var JornadaEngine = (function() {

  var TIPO_E = 'E', TIPO_I = 'I', TIPO_R = 'R', TIPO_S = 'S';

  // ─── Algoritmo de derivação de tipos ────────────────────────────────────────

  /**
   * Deriva a sequência de tipos E/I/R/S para uma lista de batidas ordenadas.
   * Não modifica o array original — retorna um array paralelo de tipos.
   */
  function _derivarTipos(batidas) {
    var n = batidas.length;
    if (n === 0) return [];
    if (n === 1) return [TIPO_E];

    return batidas.map(function(_, idx) {
      if (idx === 0)     return TIPO_E;          // primeiro: sempre entrada
      if (idx === n - 1) return TIPO_S;          // último: sempre saída
      return idx % 2 === 1 ? TIPO_I : TIPO_R;   // ímpares = I, pares = R
    });
  }

  // ─── Cálculo de tempos ───────────────────────────────────────────────────────

  /**
   * Soma os minutos dos pares de batidas (0→1), (2→3), (4→5)...
   * Ignora pares com diferença negativa (batidas fora de ordem).
   */
  function _calcularMinutosTrabalhados(batidas) {
    var total = 0;
    for (var i = 0; i + 1 < batidas.length; i += 2) {
      var diff = _diffMin(batidas[i].hora, batidas[i + 1].hora);
      if (diff > 0) total += diff;
    }
    return total;
  }

  /**
   * Calcula minutos de intervalo: soma do tempo entre cada I e o R seguinte.
   * Para 4 batidas: tempo entre batida[1] (I) e batida[2] (R).
   * Para 6 batidas: (batida[1]→batida[2]) + (batida[3]→batida[4]).
   */
  function _calcularMinutosIntervalo(batidas) {
    var total = 0;
    for (var i = 1; i + 1 < batidas.length - 1; i += 2) {
      var diff = _diffMin(batidas[i].hora, batidas[i + 1].hora);
      if (diff > 0) total += diff;
    }
    return total;
  }

  function _diffMin(h1, h2) {
    var p1 = h1.split(':'), p2 = h2.split(':');
    return (Number(p2[0]) * 60 + Number(p2[1] || 0)) -
           (Number(p1[0]) * 60 + Number(p1[1] || 0));
  }

  // ─── Detecção de inconsistências ─────────────────────────────────────────────

  function _detectarInconsistencias(batidas) {
    var problemas = [];
    for (var i = 1; i < batidas.length; i++) {
      var diff = _diffMin(batidas[i - 1].hora, batidas[i].hora);
      if (diff < 0) {
        problemas.push({
          tipo:     'fora_de_ordem',
          descricao: 'Batida ' + batidas[i].hora + ' é anterior à batida ' + batidas[i - 1].hora,
          nsrs:     [batidas[i - 1].nsr, batidas[i].nsr]
        });
      } else if (diff === 0) {
        problemas.push({
          tipo:     'batidas_simultaneas',
          descricao: 'Duas batidas no mesmo minuto: ' + batidas[i].hora,
          nsrs:     [batidas[i - 1].nsr, batidas[i].nsr]
        });
      } else if (diff < 3) {
        problemas.push({
          tipo:     'intervalo_curto',
          descricao: 'Intervalo de apenas ' + diff + 'min entre NSR ' + batidas[i-1].nsr + ' e ' + batidas[i].nsr,
          nsrs:     [batidas[i - 1].nsr, batidas[i].nsr]
        });
      }
    }
    return problemas;
  }

  function _emOrdemCrescente(batidas) {
    for (var i = 1; i < batidas.length; i++) {
      if (_diffMin(batidas[i - 1].hora, batidas[i].hora) <= 0) return false;
    }
    return true;
  }

  // ─── Parâmetros de RH ────────────────────────────────────────────────────────

  function _getParametrosRH(orgId) {
    try {
      if (typeof EncargosEngine !== 'undefined' && EncargosEngine.getParametrosRHComEncargos) {
        return EncargosEngine.getParametrosRHComEncargos(orgId) || {};
      }
    } catch(_) {}
    try { return SistemaConfigService.getParametrosRH() || {}; } catch(e) { return {}; }
  }

  // ─── Processamento de um dia ─────────────────────────────────────────────────

  /**
   * Reconstitui a jornada de um colaborador em uma data específica.
   *
   * Lê os registros normalizados do dia, deriva os tipos E/I/R/S,
   * calcula os tempos e salva a jornada processada em jornadas.json.
   * Também atualiza o campo `tipo` nos registros normalizados.
   *
   * @param {string} orgId
   * @param {string} colaboradorId
   * @param {string} data — formato YYYY-MM-DD
   * @returns {string} id da jornada salva (ou null se não há batidas)
   */
  function processarDia(orgId, colaboradorId, data) {
    var registros = PontoRepository.listarPorColaborador(orgId, colaboradorId, data, data)
      .filter(function(r){ return r.status === 'ativo'; })
      .sort(function(a, b){ return a.hora.localeCompare(b.hora); });

    if (registros.length === 0) return null;   // sem batidas — não persiste

    var batidas = registros.map(function(r) {
      return {
        normalizadoId:    r.id,
        hora:             r.hora,
        nsr:              r.nsr,
        datetimeOriginal: r.datetimeOriginal || ''
      };
    });

    var inconsistencias = _detectarInconsistencias(batidas);
    var emOrdem         = _emOrdemCrescente(batidas);

    // Status da jornada
    var statusJornada;
    var temFaltaOrdem = inconsistencias.some(function(i){ return i.tipo === 'fora_de_ordem'; });
    if (temFaltaOrdem) {
      statusJornada = 'inconsistente';
    } else if (batidas.length % 2 !== 0) {
      statusJornada = 'incompleta';
    } else {
      statusJornada = 'completa';
    }

    // Deriva e aplica tipos
    var tipos = _derivarTipos(batidas);
    batidas.forEach(function(b, idx) {
      b.tipoDerivado = tipos[idx];
    });

    // Atualiza tipo nos registros normalizados
    batidas.forEach(function(b) {
      try { PontoRepository.atualizarTipo(orgId, b.normalizadoId, b.tipoDerivado); } catch(_) {}
    });

    // Cálculo de tempos
    // Para inconsistente: calcula mesmo assim (útil para visualização), mas não usa para extras/faltas
    var minutosTrabalho  = batidas.length >= 2 ? _calcularMinutosTrabalhados(batidas) : 0;
    var minutosIntervalo = batidas.length >= 4 ? _calcularMinutosIntervalo(batidas) : 0;

    var minutosExtras    = 0, minutosFaltantes = 0;
    if (statusJornada === 'completa') {
      var cfg = _getParametrosRH(orgId);
      var minDiario = Math.round(((cfg.horas_semanais_padrao || 40) / 5) * 60);
      minutosExtras    = Math.max(0, minutosTrabalho - minDiario);
      minutosFaltantes = Math.max(0, minDiario - minutosTrabalho);
    }

    var jornadaId = JornadaRepository.salvar(orgId, {
      colaboradorId:    colaboradorId,
      data:             data,
      batidas:          batidas,
      numBatidas:       batidas.length,
      minutosTrabalho:  minutosTrabalho,
      minutosExtras:    minutosExtras,
      minutosFaltantes: minutosFaltantes,
      minutosIntervalo: minutosIntervalo,
      horaEntrada:      batidas[0].hora,
      horaSaida:        batidas[batidas.length - 1].hora,
      statusJornada:    statusJornada,
      inconsistencias:  inconsistencias
    });

    // Atualiza banco de horas apenas para jornadas completas
    if (statusJornada === 'completa') {
      var delta = minutosExtras - minutosFaltantes;
      if (delta !== 0) {
        try {
          PontoRepository.atualizarBancoHoras(orgId, colaboradorId, delta, 'Jornada ' + data);
        } catch(_) {}
      }
    }

    return jornadaId;
  }

  // ─── Processamento em lote ───────────────────────────────────────────────────

  /**
   * Processa todas as datas distintas de um colaborador em um período.
   * Reprocessamento é idempotente (substitui jornada anterior do mesmo dia).
   *
   * @returns {{ processadas, erros, errosDetalhe[] }}
   */
  function processarPeriodo(orgId, colaboradorId, dataInicio, dataFim) {
    var registros = PontoRepository.listarPorColaborador(orgId, colaboradorId, dataInicio, dataFim)
      .filter(function(r){ return r.status === 'ativo'; });

    var datasUnicas = {};
    registros.forEach(function(r){ datasUnicas[r.data] = true; });

    var processadas = 0, erros = 0, errosDetalhe = [];
    Object.keys(datasUnicas).sort().forEach(function(data) {
      try {
        processarDia(orgId, colaboradorId, data);
        processadas++;
      } catch(e) {
        erros++;
        errosDetalhe.push({ data: data, motivo: e.message });
      }
    });

    return { processadas: processadas, erros: erros, errosDetalhe: errosDetalhe };
  }

  /**
   * Processa todos os dias de todos os colaboradores com batidas em uma sessão
   * de importação confirmada.
   * Chamado automaticamente por AfdParserEngine.confirmarImportacao().
   *
   * @returns {{ processadas, erros }}
   */
  function processarImportacao(orgId, sessaoId) {
    var brutos = PontoBrutoRepository.listarBrutoPorSessao(orgId, sessaoId)
      .filter(function(b){ return b.status === 'valido' && b.colaboradorId && b.data; });

    // Coleta pares únicos colaborador + data
    var pares = {};
    brutos.forEach(function(b) {
      pares[b.colaboradorId + '|' + b.data] = { colaboradorId: b.colaboradorId, data: b.data };
    });

    var processadas = 0, erros = 0;
    var chaves = Object.keys(pares);
    chaves.forEach(function(k) {
      var p = pares[k];
      try {
        processarDia(orgId, p.colaboradorId, p.data);
        processadas++;
      } catch(e) {
        erros++;
        Logger.warn('jornada_engine', 'processarImportacao',
          p.colaboradorId + ' ' + p.data + ': ' + e.message);
      }
    });

    Logger.info('jornada_engine', 'processarImportacao',
      'Sessão ' + sessaoId + ': ' + processadas + ' jornadas processadas, ' + erros + ' erros.');
    return { processadas: processadas, erros: erros };
  }

  /**
   * Calcula jornadas para um lote de registros normalizados passados diretamente em memória.
   * Não acessa ponto_normalizado.json — usa os registros fornecidos.
   * Atualiza o campo `tipo` (E/I/R/S) em cada registro in-place antes de retornar.
   *
   * Reduz N modifyJSON calls para 0 durante o cálculo; o chamador faz 1 único salvarLote.
   *
   * @param {string} orgId
   * @param {Array}  normalizados — registros normalizados com { colaboradorId, data, hora, id }
   * @returns {Array} array de objetos jornada prontos para JornadaRepository.salvarLote()
   */
  function calcularJornadasLote(orgId, normalizados) {
    if (!normalizados || !normalizados.length) return [];

    // Agrupa por (colaboradorId, data)
    var porChave = {};
    normalizados.forEach(function(r) {
      if (!r.colaboradorId || !r.data) return;
      var key = r.colaboradorId + '|' + r.data;
      if (!porChave[key]) porChave[key] = [];
      porChave[key].push(r);
    });

    var jornadas = [];
    var cfg       = _getParametrosRH(orgId);
    var minDiario = Math.round(((cfg.horas_semanais_padrao || 40) / 5) * 60);

    Object.keys(porChave).forEach(function(key) {
      var registros = porChave[key].slice().sort(function(a, b){ return a.hora.localeCompare(b.hora); });
      var batidas   = registros.map(function(r) {
        return { _ref: r, hora: r.hora, nsr: r.nsr, datetimeOriginal: r.datetimeOriginal || '' };
      });

      var inconsistencias = _detectarInconsistencias(batidas);
      var fora = inconsistencias.some(function(i){ return i.tipo === 'fora_de_ordem'; });
      var statusJornada = fora ? 'inconsistente' : (batidas.length % 2 !== 0 ? 'incompleta' : 'completa');

      var tipos = _derivarTipos(batidas);
      // Atualiza tipo nos registros in-place — evita atualizarTipo individual
      batidas.forEach(function(b, idx) { b._ref.tipo = tipos[idx]; });

      var minutosTrabalho  = batidas.length >= 2 ? _calcularMinutosTrabalhados(batidas) : 0;
      var minutosIntervalo = batidas.length >= 4 ? _calcularMinutosIntervalo(batidas) : 0;
      var minutosExtras = 0, minutosFaltantes = 0;
      if (statusJornada === 'completa') {
        minutosExtras    = Math.max(0, minutosTrabalho - minDiario);
        minutosFaltantes = Math.max(0, minDiario - minutosTrabalho);
      }

      jornadas.push({
        colaboradorId:    registros[0].colaboradorId,
        data:             registros[0].data,
        batidas:          batidas.map(function(b, idx) {
          return { normalizadoId: b._ref.id, hora: b.hora, tipoDerivado: tipos[idx], nsr: b.nsr, datetimeOriginal: b.datetimeOriginal };
        }),
        numBatidas:       batidas.length,
        minutosTrabalho:  minutosTrabalho,
        minutosExtras:    minutosExtras,
        minutosFaltantes: minutosFaltantes,
        minutosIntervalo: minutosIntervalo,
        horaEntrada:      batidas[0].hora,
        horaSaida:        batidas[batidas.length - 1].hora,
        statusJornada:    statusJornada,
        inconsistencias:  inconsistencias
      });
    });

    return jornadas;
  }

  // ─── Espelho de Ponto ────────────────────────────────────────────────────────

  /**
   * Monta o espelho mensal de um colaborador: cada dia do mês com
   * suas batidas, tipos derivados, horas trabalhadas e status.
   *
   * Dias sem jornada registrada aparecem com statusJornada = 'ausente'.
   * Sábados e domingos são marcados como statusJornada = 'folga'.
   *
   * @param {string} orgId
   * @param {string} colaboradorId
   * @param {number} ano
   * @param {number} mes
   * @returns {{ colaboradorId, periodo, dias{}, resumo{}, saldoBH }}
   */
  function calcularEspelho(orgId, colaboradorId, ano, mes) {
    var inicio = ano + '-' + _pad(mes) + '-01';
    var fim    = _ultimoDia(ano, mes);

    var jornadas = JornadaRepository.listarPorColaborador(orgId, colaboradorId, inicio, fim);
    var jornadasMap = {};
    jornadas.forEach(function(j){ jornadasMap[j.data] = j; });

    var _cfg      = _getParametrosRH(orgId);
    var diasFolga = Array.isArray(_cfg.dias_folga) ? _cfg.dias_folga : [];

    var dias = {};
    var d    = new Date(ano, mes - 1, 1);
    var fim_ = new Date(ano, mes, 0);

    while (d <= fim_) {
      var iso  = d.toISOString().split('T')[0];
      var dow  = d.getDay();   // 0=Dom, 6=Sab
      var folga = diasFolga.length > 0 && diasFolga.indexOf(dow) >= 0;

      if (jornadasMap[iso]) {
        dias[iso] = jornadasMap[iso];
      } else {
        dias[iso] = {
          data:             iso,
          colaboradorId:    colaboradorId,
          batidas:          [],
          numBatidas:       0,
          minutosTrabalho:  0,
          minutosExtras:    0,
          minutosFaltantes: folga ? 0 : null,   // null = não calculado (dia sem batida)
          minutosIntervalo: 0,
          horaEntrada:      null,
          horaSaida:        null,
          statusJornada:    folga ? 'folga' : 'ausente',
          inconsistencias:  []
        };
      }
      d.setDate(d.getDate() + 1);
    }

    // Resumo do mês
    var totalTrabalho   = 0, totalExtras = 0, totalFaltantes = 0;
    var diasTrabalhados = 0, diasAusentes = 0, diasIncompletos = 0, diasInconsistentes = 0;

    Object.keys(dias).forEach(function(data) {
      var j = dias[data];
      if (!j || j.statusJornada === 'folga') return;
      if (j.statusJornada === 'ausente') { diasAusentes++; return; }
      diasTrabalhados++;
      totalTrabalho   += j.minutosTrabalho   || 0;
      totalExtras     += j.minutosExtras     || 0;
      totalFaltantes  += j.minutosFaltantes  || 0;
      if (j.statusJornada === 'incompleta')   diasIncompletos++;
      if (j.statusJornada === 'inconsistente') diasInconsistentes++;
    });

    var bh = PontoRepository.obterBancoHoras(orgId, colaboradorId);

    return {
      colaboradorId:      colaboradorId,
      periodo:            ano + '-' + _pad(mes),
      dias:               dias,
      resumo: {
        diasTrabalhados:     diasTrabalhados,
        diasAusentes:        diasAusentes,
        diasIncompletos:     diasIncompletos,
        diasInconsistentes:  diasInconsistentes,
        totalMinutos:        totalTrabalho,
        totalExtras:         totalExtras,
        totalFaltantes:      totalFaltantes
      },
      saldoBH: bh.saldoMinutos || 0
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function _pad(n) { return String(n).padStart(2, '0'); }

  function _ultimoDia(ano, mes) {
    return new Date(ano, mes, 0).toISOString().split('T')[0];
  }

  return {
    processarDia:          processarDia,
    processarPeriodo:      processarPeriodo,
    processarImportacao:   processarImportacao,
    calcularJornadasLote:  calcularJornadasLote,
    calcularEspelho:       calcularEspelho
  };

})();
