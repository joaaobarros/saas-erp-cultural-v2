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

  // ─── Apuração semanal (regimeApuracao = 'semanal') ──────────────────────────
  //
  // Colaboradores com escala variável (ex.: professores 20h em 2-3 dias) não têm
  // carga diária fixa — extras e faltantes só fazem sentido fechados por semana.
  // Para eles: jornadas diárias têm extras/faltantes = 0; o BH recebe um único
  // delta por semana ISO (chave 'sem:<segunda-feira>' em diasProcessados).

  /** Segunda-feira (ISO) da semana que contém a data. */
  function _segundaISO(iso) {
    var p = String(iso).split('-');
    var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
    var dow = d.getUTCDay();                       // 0=Dom … 6=Sáb
    d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
    return d.toISOString().slice(0, 10);
  }

  /** Domingo (ISO) da semana cuja segunda-feira é `segundaIso`. */
  function _domingoISO(segundaIso) {
    var p = segundaIso.split('-');
    var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + 6));
    return d.toISOString().slice(0, 10);
  }

  /**
   * Carrega mapas { horas: {colabId→horasSemanais}, regime: {colabId→'diario'|'semanal'} }
   * de colaboradores.json. Uma leitura por chamada — em loops, construir uma vez e passar.
   */
  function _mapasColaboradores(orgId) {
    var horas = {}, regime = {};
    try {
      (lerJSON('colaboradores.json') || []).forEach(function(c) {
        if (c.orgId !== orgId) return;
        if (c.horasSemanais) horas[c.id] = c.horasSemanais;
        regime[c.id] = (c.regimeApuracao === 'semanal') ? 'semanal' : 'diario';
      });
    } catch(_) {}
    return { horas: horas, regime: regime };
  }

  /**
   * Agrupa jornadas de UM colaborador por semana ISO (seg→dom).
   * Só semanas com pelo menos uma jornada entram (semana sem batida é neutra —
   * mesmo comportamento do regime diário, em que dia sem batida não debita BH).
   * @returns [{ inicioSemana, fimSemana, minutosTrabalho, dias, cargaSemanalMin, delta }]
   */
  function agruparSemanas(jornadas, cargaSemanalMin) {
    var porSem = {};
    (jornadas || []).forEach(function(j) {
      if (!j.data) return;
      var seg = _segundaISO(j.data);
      if (!porSem[seg]) porSem[seg] = { inicioSemana: seg, fimSemana: _domingoISO(seg), minutosTrabalho: 0, dias: 0 };
      porSem[seg].minutosTrabalho += j.minutosTrabalho || 0;
      if (j.statusJornada && j.statusJornada !== 'ausente') porSem[seg].dias++;
    });
    return Object.keys(porSem).sort().map(function(k) {
      var s = porSem[k];
      s.cargaSemanalMin = cargaSemanalMin;
      s.delta = s.minutosTrabalho - cargaSemanalMin;
      return s;
    });
  }

  /**
   * Recalcula e credita no BH o delta de UMA semana de um colaborador semanal.
   * Idempotente: chave 'sem:<segunda>' em diasProcessados substitui o delta anterior.
   */
  function _creditarSemanaBH(orgId, colaboradorId, dataNaSemana, horasSemanais, mapaHoras, mapaRegime) {
    var seg = _segundaISO(dataNaSemana);
    var dom = _domingoISO(seg);
    var regs = PontoRepository.listarPorColaborador(orgId, colaboradorId, seg, dom)
      .filter(function(r){ return r.status !== 'revertido'; });
    var jornadas = calcularJornadasLote(orgId, regs, mapaHoras, mapaRegime);
    var total = 0;
    jornadas.forEach(function(j){ total += j.minutosTrabalho || 0; });
    var delta = total - Math.round(horasSemanais * 60);
    PontoRepository.creditarDiaBH(orgId, colaboradorId, 'sem:' + seg, regs.length ? delta : 0);
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

    var mp       = _mapasColaboradores(orgId);
    var regime   = mp.regime[colaboradorId] || 'diario';
    var cfg      = _getParametrosRH(orgId);
    var horasSem = mp.horas[colaboradorId] || cfg.horas_semanais_padrao || 40;

    var minutosExtras    = 0, minutosFaltantes = 0;
    if (statusJornada === 'completa' && regime !== 'semanal') {
      var minDiario = Math.round((horasSem / 5) * 60);
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

    // Atualiza banco de horas
    if (regime === 'semanal') {
      // Refecha a semana inteira de forma idempotente (chave sem:<segunda>)
      try { _creditarSemanaBH(orgId, colaboradorId, data, horasSem, mp.horas, mp.regime); } catch(_) {}
    } else if (statusJornada === 'completa') {
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
  // mapaHoras opcional:  { colaboradorId → horasSemanais } — por-colab override do global
  // mapaRegime opcional: { colaboradorId → 'diario'|'semanal' } — se ausente, carrega de colaboradores.json
  function calcularJornadasLote(orgId, normalizados, mapaHoras, mapaRegime) {
    if (!normalizados || !normalizados.length) return [];
    if (!mapaRegime) {
      var _mp = _mapasColaboradores(orgId);
      mapaRegime = _mp.regime;
      if (!mapaHoras || !Object.keys(mapaHoras).length) mapaHoras = _mp.horas;
    }
    mapaHoras = mapaHoras || {};

    // Agrupa por (colaboradorId, data)
    var porChave = {};
    normalizados.forEach(function(r) {
      if (!r.colaboradorId || !r.data) return;
      var key = r.colaboradorId + '|' + r.data;
      if (!porChave[key]) porChave[key] = [];
      porChave[key].push(r);
    });

    var jornadas = [];
    var cfg              = _getParametrosRH(orgId);
    var horasPadraoGlobal = cfg.horas_semanais_padrao || 40;

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

      var colabId    = registros[0].colaboradorId;
      var horasSem   = mapaHoras[colabId] || horasPadraoGlobal;
      var minDiario  = Math.round((horasSem / 5) * 60);

      var minutosTrabalho  = batidas.length >= 2 ? _calcularMinutosTrabalhados(batidas) : 0;
      var minutosIntervalo = batidas.length >= 4 ? _calcularMinutosIntervalo(batidas) : 0;
      var minutosExtras = 0, minutosFaltantes = 0;
      // Regime semanal: extras/faltantes não existem no dia — fecham por semana
      if (statusJornada === 'completa' && (mapaRegime[colabId] || 'diario') !== 'semanal') {
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

    // Resolve carga horária e regime de apuração do colaborador
    var horasSemanais = null, regimeApuracao = 'diario';
    try {
      var colabs = lerJSON('colaboradores.json') || [];
      for (var ci = 0; ci < colabs.length; ci++) {
        if (colabs[ci].id === colaboradorId && colabs[ci].orgId === orgId) {
          horasSemanais  = colabs[ci].horasSemanais || null;
          regimeApuracao = (colabs[ci].regimeApuracao === 'semanal') ? 'semanal' : 'diario';
          break;
        }
      }
    } catch(_) {}
    var mapaHoras = {};
    if (horasSemanais) mapaHoras[colaboradorId] = horasSemanais;
    var mapaRegime = {};
    mapaRegime[colaboradorId] = regimeApuracao;

    // Lê diretamente de ponto_normalizado.json — única fonte de verdade para batidas.
    // Regime semanal: estende a leitura até as bordas das semanas ISO, para que
    // os subtotais das semanas que cruzam o mês considerem a semana inteira.
    var iniLeitura = regimeApuracao === 'semanal' ? _segundaISO(inicio) : inicio;
    var fimLeitura = regimeApuracao === 'semanal' ? _domingoISO(_segundaISO(fim)) : fim;
    var normalizados = PontoRepository.listarPorColaborador(orgId, colaboradorId, iniLeitura, fimLeitura)
      .filter(function(r){ return r.status !== 'revertido'; });

    var jornadasCalc = calcularJornadasLote(orgId, normalizados, mapaHoras, mapaRegime);
    var jornadasMap = {};
    jornadasCalc.forEach(function(j){ jornadasMap[j.data] = j; });

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

    // Regime semanal: subtotais por semana ISO + extras/faltantes fechados por semana
    var semanas = null;
    if (regimeApuracao === 'semanal') {
      var cargaSemMin = Math.round((horasSemanais || 0) * 60);
      var hojeISO = new Date().toISOString().slice(0, 10);
      semanas = agruparSemanas(jornadasCalc, cargaSemMin)
        .filter(function(s){ return s.fimSemana >= inicio && s.inicioSemana <= fim; })
        .map(function(s){ s.emAndamento = s.fimSemana >= hojeISO; return s; });
      // Resumo: extras/faltantes do mês = soma dos deltas das semanas FECHADAS
      totalExtras = 0; totalFaltantes = 0;
      semanas.forEach(function(s) {
        if (s.emAndamento) return;
        if (s.delta > 0) totalExtras    += s.delta;
        else             totalFaltantes += -s.delta;
      });
    }

    // Meta de horas do mês (ideal a trabalhar) — para comparação no espelho
    var diasNoMes = new Date(ano, mes, 0).getDate();
    var metaMensalMin;
    if (regimeApuracao === 'semanal') {
      metaMensalMin = Math.round((horasSemanais || 0) * 60 * diasNoMes / 7);
    } else {
      var folgaMeta = diasFolga.length ? diasFolga : [0, 6];   // padrão: sáb/dom
      var diasUteis = 0;
      for (var dm = 1; dm <= diasNoMes; dm++) {
        if (folgaMeta.indexOf(new Date(ano, mes - 1, dm).getDay()) < 0) diasUteis++;
      }
      var horasSemBase = horasSemanais || _cfg.horas_semanais_padrao || 40;
      metaMensalMin = Math.round((horasSemBase / 5) * 60) * diasUteis;
    }

    return {
      colaboradorId:      colaboradorId,
      periodo:            ano + '-' + _pad(mes),
      regimeApuracao:     regimeApuracao,
      metaMensalMin:      metaMensalMin,
      cargaSemanalMin:    regimeApuracao === 'semanal' ? Math.round((horasSemanais || 0) * 60) : undefined,
      semanas:            semanas || undefined,
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

  /**
   * Atualiza o banco de horas para cada (colaborador, data) no lote de jornadas.
   * Usa creditarDiaBH — idempotente: reimportar o mesmo arquivo não duplica o saldo.
   */
  function atualizarBHDosLotes(orgId, jornadasLote) {
    var mp = _mapasColaboradores(orgId);
    var cfg = _getParametrosRH(orgId);
    var horasPadrao = cfg.horas_semanais_padrao || 40;
    var semanasTocadas = {};   // 'colabId|segunda' → colabId

    jornadasLote.forEach(function(j) {
      if (!j.colaboradorId || !j.data) return;
      if ((mp.regime[j.colaboradorId] || 'diario') === 'semanal') {
        semanasTocadas[j.colaboradorId + '|' + _segundaISO(j.data)] = j.colaboradorId;
        return;
      }
      var delta = (j.minutosExtras || 0) - (j.minutosFaltantes || 0);
      try {
        PontoRepository.creditarDiaBH(orgId, j.colaboradorId, j.data, delta);
      } catch(e) {
        Logger.warn('jornada_engine', 'atualizarBHDosLotes', j.colaboradorId + ' ' + j.data + ': ' + e.message);
      }
    });

    // Regime semanal: refecha cada semana tocada com a semana COMPLETA (idempotente)
    Object.keys(semanasTocadas).forEach(function(chave) {
      var colabId = semanasTocadas[chave];
      var seg     = chave.split('|')[1];
      try {
        _creditarSemanaBH(orgId, colabId, seg, mp.horas[colabId] || horasPadrao, mp.horas, mp.regime);
      } catch(e) {
        Logger.warn('jornada_engine', 'atualizarBHDosLotes', 'semana ' + chave + ': ' + e.message);
      }
    });
  }

  /**
   * Recalcula BH completo de um colaborador a partir de todas as jornadas ativas.
   * Zera o registro existente e reconstrói do zero (útil para correção pós-migração).
   */
  function recalcularBHCompleto(orgId, colaboradorId) {
    var ativos = (lerJSON('ponto_normalizado.json') || []).filter(function(r) {
      return r.orgId === orgId && r.colaboradorId === colaboradorId && r.status !== 'revertido';
    });
    var mp  = _mapasColaboradores(orgId);
    var cfg = _getParametrosRH(orgId);
    var jornadas = calcularJornadasLote(orgId, ativos, mp.horas, mp.regime);
    PontoRepository.resetarBancoHoras(orgId, colaboradorId);
    if ((mp.regime[colaboradorId] || 'diario') === 'semanal') {
      var cargaSemMin = Math.round((mp.horas[colaboradorId] || cfg.horas_semanais_padrao || 40) * 60);
      agruparSemanas(jornadas, cargaSemMin).forEach(function(s) {
        PontoRepository.creditarDiaBH(orgId, colaboradorId, 'sem:' + s.inicioSemana, s.delta);
      });
    } else {
      jornadas.forEach(function(j) {
        var delta = (j.minutosExtras || 0) - (j.minutosFaltantes || 0);
        PontoRepository.creditarDiaBH(orgId, colaboradorId, j.data, delta);
      });
    }
    return { colaboradorId: colaboradorId, jornadas: jornadas.length };
  }

  return {
    processarDia:            processarDia,
    processarPeriodo:        processarPeriodo,
    processarImportacao:     processarImportacao,
    calcularJornadasLote:    calcularJornadasLote,
    calcularEspelho:         calcularEspelho,
    agruparSemanas:          agruparSemanas,
    atualizarBHDosLotes:     atualizarBHDosLotes,
    recalcularBHCompleto:    recalcularBHCompleto
  };

})();
