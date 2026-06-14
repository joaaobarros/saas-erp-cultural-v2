/**
 * @file ponto_engine.gs
 * @layer engine
 * @description Engine de Ponto Eletrônico, Banco de Horas e Custo CLT.
 *
 *   Funcionalidades:
 *   - Registro de ponto (entrada, saída, intervalo, retorno)
 *   - Cálculo automático de horas regulares, extras e banco de horas
 *   - Custo CLT completo: INSS + Sistema S + FGTS + PIS + benefícios + provisões
 *   - Simulação de reajuste e cenários de folha
 *   - Calculadora de rescisão com break-even
 *   - Indicadores de turnover
 *
 *   Compatibilidade Colabore (Fortes Tecnologia):
 *   - Importação AFD (Portaria MTE 1510/2009) — tipo 3 (batida)
 *   - Exportação AFD com cabeçalho tipo 1, dados tipo 3 e trailer tipo 9
 *   - CSV no formato padrão Colabore (PIS;Nome;Data;Hora;Tipo;NSR)
 * @depends ponto_repository.gs, colaborador_repository.gs, config_service.gs
 */

var PontoEngine = (function() {

  // ─── Constantes ──────────────────────────────────────────────────────────────

  var TIPO_ENTRADA   = 'E';
  var TIPO_SAIDA     = 'S';
  var TIPO_INTERVALO = 'I';
  var TIPO_RETORNO   = 'R';
  var TIPOS_VALIDOS  = [TIPO_ENTRADA, TIPO_SAIDA, TIPO_INTERVALO, TIPO_RETORNO];

  // ─── Registro de ponto ───────────────────────────────────────────────────────

  function registrar(orgId, colaboradorId, tipo, dados, emailOperador) {
    if (TIPOS_VALIDOS.indexOf(tipo) < 0)
      throw new Error('Tipo de marcação inválido: ' + tipo + '. Use E, S, I ou R.');

    var agora  = new Date();
    var data   = dados.data  || agora.toISOString().split('T')[0];
    var hora   = dados.hora  || agora.toTimeString().substring(0,5);   // HH:MM
    var nsr    = PontoRepository.proximoNSR(orgId);

    var registro = {
      colaboradorId: colaboradorId,
      tipo:          tipo,
      data:          data,
      hora:          hora,
      origem:        dados.origem     || 'sistema',
      dispositivo:   dados.dispositivo || '',
      nsr:           nsr,
      observacao:    dados.observacao  || ''
    };

    var id = PontoRepository.salvarRegistro(orgId, registro);

    // Sincronizar Sheet
    var colab = _buscarColaborador(orgId, colaboradorId);
    PontoRepository.sincronizarRegistroSheet(orgId,
      Object.assign({ id: id }, registro),
      colab ? colab.nome : '',
      colab ? (colab.pis || '') : ''
    );

    AuditoriaService.registrar('PONTO_REGISTRADO', 'ponto', {
      colaboradorId: colaboradorId, tipo: tipo, data: data, hora: hora, nsr: nsr
    }, emailOperador || colaboradorId);

    // Verifica se completou par entrada/saída e atualiza banco de horas
    if (tipo === TIPO_SAIDA || tipo === TIPO_RETORNO) {
      try { _calcularEAtualizarBH(orgId, colaboradorId, data); } catch(e) {}
    }

    return { ok: true, id: id, nsr: nsr };
  }

  function excluirRegistro(orgId, id, emailAdmin) {
    PontoRepository.excluirRegistro(orgId, id);
    AuditoriaService.registrar('PONTO_EXCLUIDO', 'ponto', { id: id }, emailAdmin);
    return { ok: true };
  }

  // ─── Cálculo de horas trabalhadas ────────────────────────────────────────────

  /**
   * Calcula horas trabalhadas em um dia a partir dos registros de ponto.
   * Suporta 4 marcações (E→I→R→S) e 2 marcações (E→S).
   */
  function calcularHorasDia(orgId, colaboradorId, data) {
    var registros = PontoRepository.listarPorColaborador(orgId, colaboradorId, data, data);
    if (registros.length < 2) return { trabalhados: 0, extras: 0, faltantes: 0, valido: false };

    var params = _getParametrosRH(orgId);
    var horasSemanais = params.horas_semanais_padrao || 40;
    var horasDiariasMin = Math.round((horasSemanais / 5) * 60);  // em minutos

    var minutosTotal = 0;
    var pares = _parearMarcacoes(registros);
    pares.forEach(function(par) {
      minutosTotal += _diferencaMinutos(par[0].hora, par[1].hora);
    });

    var extras     = Math.max(0, minutosTotal - horasDiariasMin);
    var faltantes  = Math.max(0, horasDiariasMin - minutosTotal);

    return {
      data:         data,
      trabalhados:  minutosTotal,
      extras:       extras,
      faltantes:    faltantes,
      horasDiarias: horasDiariasMin,
      valido:       registros.length >= 2,
      registros:    registros.length
    };
  }

  /**
   * Calcula folha mensal de um colaborador.
   */
  function calcularMensal(orgId, colaboradorId, ano, mes) {
    var inicio = ano + '-' + _pad(mes) + '-01';
    var fim    = _ultimoDia(ano, mes);
    var registros = PontoRepository.listarPorColaborador(orgId, colaboradorId, inicio, fim);

    var diasTrabalhados = {};
    registros.forEach(function(r){ diasTrabalhados[r.data] = true; });
    var dias = Object.keys(diasTrabalhados).length;

    var totalMinutos = 0, totalExtras = 0, totalFaltas = 0;
    Object.keys(diasTrabalhados).forEach(function(data) {
      var dia = calcularHorasDia(orgId, colaboradorId, data);
      totalMinutos += dia.trabalhados;
      totalExtras  += dia.extras;
      totalFaltas  += dia.faltantes;
    });

    var bh = PontoRepository.obterBancoHoras(orgId, colaboradorId);

    return {
      colaboradorId:  colaboradorId,
      periodo:        ano + '-' + _pad(mes),
      diasTrabalhados: dias,
      totalMinutos:   totalMinutos,
      totalExtras:    totalExtras,
      totalFaltas:    totalFaltas,
      saldoBH:        bh.saldoMinutos || 0
    };
  }

  // ─── Custo CLT Completo ──────────────────────────────────────────────────────

  /**
   * Calcula custo CLT completo mensal para um colaborador.
   *
   * Parâmetros aceitos em `params`:
   *   salarioBruto        {number}  Salário bruto base
   *   reajuste            {number}  Reajuste por acordo coletivo (R$) — soma ao salário
   *   horasSemanais       {number}  Padrão 40
   *   diasUteis           {number}  Dias úteis no mês — padrão 22
   *   nMeses              {number}  Nº de meses do contrato (para custo total do contrato)
   *   vtValorPasse        {number}  Valor unitário de cada passagem VT (R$)
   *   vtQtdPassagens      {number}  Passagens por dia — padrão 2
   *   vaValorDia          {number}  Vale Alimentação por dia (R$)
   *   vaDescontoVal       {number}  Desconto VA do colaborador em R$/mês — padrão 0 (empresa paga tudo)
   *   vrValorDia          {number}  Vale Refeição por dia (R$)
   *   vrDescontoPct       {number}  % desconto VR do colaborador — padrão 0
   *   psValorInd          {number}  Plano de saúde individual (R$/mês)
   *   psValorDep          {number}  Plano de saúde por dependente (R$/mês)
   *   psNumDep            {number}  Nº de dependentes no plano
   *   psDescontoPct       {number}  % desconto PS do colaborador — padrão 30%
   */
  function calcularCustoCLT(orgId, params) {
    params = params || {};
    var salarioBruto  = Number(params.salarioBruto || 0);
    var reajuste      = Number(params.reajuste || 0);
    var salarioTotal  = salarioBruto + reajuste;           // III
    var diasUteis     = Number(params.diasUteis || params.diasVT || 22);
    var horasSemanais = Number(params.horasSemanais || 40);
    var nMeses        = Number(params.nMeses || 0);

    var cfg = _getParametrosRH(orgId);
    var fgtsAliq         = cfg.aliquota_fgts              || 0.08;
    var inssPatronalAliq = cfg.aliquota_inss_patronal      || 0.20;
    var satAliq          = cfg.aliquota_sat                || 0.01;
    var sistemaSAliq     = cfg.aliquota_sistema_s          || 0.0566;
    var pisAliq          = cfg.aliquota_pis                || 0.01;

    // ── Encargos patronais — lidos de encargos_trabalhistas.json (ou defaults)
    var inss         = _calcularINSS(salarioTotal, cfg.tabela_inss || []);
    var inssPatronal = salarioTotal * inssPatronalAliq;          // (c) INSS patronal
    var sat          = salarioTotal * satAliq;                   // (d1) SAT/RAT
    var sistemaS     = salarioTotal * sistemaSAliq;              // (d2) Sistema S
    var sistemaSsat  = sat + sistemaS;                           // (d) total S+SAT
    var fgts         = salarioTotal * fgtsAliq;                  // (e) FGTS
    var pis          = salarioTotal * pisAliq;                   // (f) PIS
    var encargosTotal = inssPatronal + sistemaSsat + fgts + pis; // IV

    // ── Benefícios ────────────────────────────────────────────────────────────
    // Vale Transporte: empresa paga passes – 6% do salário (desconto obrigatório)
    var vtValorPasse   = Number(params.vtValorPasse || 0);
    var vtQtd          = Number(params.vtQtdPassagens || 2);
    var vtBruto        = vtValorPasse > 0 ? vtValorPasse * vtQtd * diasUteis : 0;
    var vtDesconto     = vtBruto > 0 ? Math.min(vtBruto, salarioTotal * 0.06) : 0;
    var vtLiquido      = Math.max(0, vtBruto - vtDesconto);

    // Vale Alimentação — desconto do colaborador em R$/mês (valor fixo, não percentual)
    var vaValorDia     = Number(params.vaValorDia || 0);
    var vaBruto        = vaValorDia > 0 ? vaValorDia * diasUteis : 0;
    var vaDesconto     = vaBruto > 0 ? Math.min(vaBruto, Number(params.vaDescontoVal || 0)) : 0;
    var vaLiquido      = Math.max(0, vaBruto - vaDesconto);

    // Vale Refeição
    var vrValorDia     = Number(params.vrValorDia || 0);
    var vrBruto        = vrValorDia > 0 ? vrValorDia * diasUteis : 0;
    var vrDescontoPct  = Number(params.vrDescontoPct || 0);
    var vrDesconto     = vrBruto > 0 ? vrBruto * (vrDescontoPct / 100) : 0;
    var vrLiquido      = Math.max(0, vrBruto - vrDesconto);

    // Plano de Saúde
    var psInd          = Number(params.psValorInd || 0);
    var psDep          = Number(params.psValorDep || 0);
    var psNumDep       = Number(params.psNumDep || 0);
    var psBruto        = psInd + psDep * psNumDep;
    var psDescontoPct  = Number(params.psDescontoPct !== undefined ? params.psDescontoPct : 30);
    var psDesconto     = psBruto > 0 ? psBruto * (psDescontoPct / 100) : 0;
    var psLiquido      = Math.max(0, psBruto - psDesconto);

    var beneficiosTotal = vtLiquido + vaLiquido + vrLiquido + psLiquido;   // V

    // ── Provisões mensais ─────────────────────────────────────────────────────
    // Férias + encargos: 1 mês (salary + 1/3 bonus) provisioned monthly + INSS+FGTS on that
    var provisaoFerBase  = salarioTotal * (1 + 1/3) / 12;
    var provisaoFerEnc   = provisaoFerBase * (0.20 + fgtsAliq);  // INSS patronal + FGTS sobre férias
    var provisaoFerias   = provisaoFerBase + provisaoFerEnc;     // (m)

    // 13° + encargos: 1 mês salary / 12 + INSS patronal + FGTS sobre 13°
    var provisao13Base   = salarioTotal / 12;
    var provisao13Enc    = provisao13Base * (0.20 + fgtsAliq);
    var provisao13       = provisao13Base + provisao13Enc;        // (n)

    // FGTS rescisório: multa de 40% sobre FGTS acumulado — provisão mensal do passivo
    var provisaoFGTSResc = fgts * 0.40;                           // (o)

    var provisoesTotal   = provisaoFerias + provisao13 + provisaoFGTSResc;  // VI

    // ── Custo total ───────────────────────────────────────────────────────────
    var custoMensal      = salarioTotal + encargosTotal + beneficiosTotal + provisoesTotal;  // VII
    var custoContrato    = nMeses > 0 ? custoMensal * nMeses : null;                         // VIII

    var salarioLiquido   = salarioTotal - inss;

    var R = function(v){ return Math.round(v * 100) / 100; };
    return {
      // Remuneração (III)
      salarioBruto:        R(salarioBruto),
      reajuste:            R(reajuste),
      salarioTotal:        R(salarioTotal),
      // Encargos (IV) — alíquotas lidas de encargos_trabalhistas.json
      inssPatronal:        R(inssPatronal),
      sat:                 R(sat),
      sistemaS:            R(sistemaS),
      sistemaSsat:         R(sistemaSsat),
      fgts:                R(fgts),
      pisPasep:            R(pis),
      pis:                 R(pis),          // alias de retrocompatibilidade
      encargosTotal:       R(encargosTotal),
      // Alíquotas vigentes (para exibição no frontend)
      _aliqInssPatronal:   inssPatronalAliq,
      _aliqSat:            satAliq,
      _aliqSistemaS:       sistemaSAliq,
      _aliqFgts:           fgtsAliq,
      _aliqPis:            pisAliq,
      // INSS empregado (referência)
      inssEmpregado:       R(inss),
      salarioLiquido:      R(salarioLiquido),
      // Benefícios (V)
      vtBruto:             R(vtBruto),
      vtDesconto:          R(vtDesconto),
      vtLiquido:           R(vtLiquido),
      vaBruto:             R(vaBruto),
      vaDesconto:          R(vaDesconto),
      vaLiquido:           R(vaLiquido),
      vrBruto:             R(vrBruto),
      vrDesconto:          R(vrDesconto),
      vrLiquido:           R(vrLiquido),
      psBruto:             R(psBruto),
      psDesconto:          R(psDesconto),
      psLiquido:           R(psLiquido),
      beneficiosTotal:     R(beneficiosTotal),
      // Provisões (VI)
      provisaoFerias:      R(provisaoFerias),
      provisao13:          R(provisao13),
      provisaoFGTSResc:    R(provisaoFGTSResc),
      provisoesTotal:      R(provisoesTotal),
      // Totais
      custoMensal:         R(custoMensal),
      custoContrato:       custoContrato !== null ? R(custoContrato) : null,
      multiplicador:       salarioBruto > 0 ? R(custoMensal / salarioBruto) : 0
    };
  }

  /**
   * Simula reajuste percentual aplicado a toda a folha.
   * @param {Array} colaboradores — lista de colaboradores com salarioBruto
   */
  function simularReajuste(orgId, percentual, colaboradores) {
    var pct = Number(percentual) / 100;
    var total_antes = 0, total_depois = 0;
    var simulados = colaboradores.map(function(c) {
      var antes  = calcularCustoCLT(orgId, { salarioBruto: c.salarioBruto });
      var depois = calcularCustoCLT(orgId, { salarioBruto: c.salarioBruto * (1 + pct) });
      total_antes  += antes.custoTotal;
      total_depois += depois.custoTotal;
      return { colaboradorId: c.id, nome: c.nome,
               salarioBruto:  c.salarioBruto,
               salarioReajustado: Math.round(c.salarioBruto * (1 + pct) * 100) / 100,
               custoBefore: antes.custoTotal, custoAfter: depois.custoTotal };
    });
    return {
      percentual:      percentual,
      total_antes:     Math.round(total_antes * 100) / 100,
      total_depois:    Math.round(total_depois * 100) / 100,
      impactoMensal:   Math.round((total_depois - total_antes) * 100) / 100,
      impactoAnual:    Math.round((total_depois - total_antes) * 12 * 100) / 100,
      colaboradores:   simulados
    };
  }

  // ─── Calculadora de Rescisão ─────────────────────────────────────────────────

  /**
   * Calcula custo de rescisão com todas as verbas rescisórias.
   * @param {object} p — {
   *   salarioBruto, mesesTrabalhados, tipoRescisao,
   *   modoAvisoPrevio?,      // 'indenizado' (default) | 'trabalhado'
   *   dataDesligamento?,     // ISO YYYY-MM-DD — para calcular 13º e férias proporcionais corretos
   *   dataAdmissao?,         // ISO YYYY-MM-DD — para calcular meses desde último aniversário
   *   periodosVencidosNaoGozados?, economiaEsperada?
   * }
   * tipos: sem_justa_causa | pedido_demissao | culpa_reciproca | justa_causa
   */
  function calcularRescisao(orgId, p) {
    var s     = Number(p.salarioBruto || 0);
    var meses = Number(p.mesesTrabalhados || 0);
    var tipo  = p.tipoRescisao || 'sem_justa_causa';
    var modo  = p.modoAvisoPrevio || 'indenizado';
    var cfg   = _getParametrosRH(orgId);
    var fgtsAliq = cfg.aliquota_fgts || 0.08;

    var anosCompletos = Math.floor(meses / 12);

    // ── Aviso Prévio ──────────────────────────────────────────────────────────
    // Lei 12.506/2011: 30 dias + 3 dias por ano completo, máx 90 dias
    var diasAP = Math.min(90, 30 + anosCompletos * 3);
    var valorAP = 0;
    if (tipo !== 'pedido_demissao' && tipo !== 'justa_causa') {
      // trabalhado: empregador não tem custo extra (funcionário trabalha o período)
      // indenizado: empregador paga o AP para dispensar o funcionário imediatamente
      valorAP = modo === 'indenizado' ? (s / 30 * diasAP) : 0;
    }

    // ── Meses no ano calendário para 13º ─────────────────────────────────────
    // Se dataDesligamento fornecida, usa o mês real; senão usa meses%12 como proxy.
    var meses13;
    if (p.dataDesligamento) {
      meses13 = new Date(p.dataDesligamento).getMonth() + 1; // 1=jan … 12=dez
    } else {
      meses13 = meses % 12 || 12; // fallback: 0 → 12 (ano completo)
    }

    // ── Meses desde o último aniversário de contrato (férias proporcionais) ──
    var mesesPropFerias;
    if (p.dataAdmissao && p.dataDesligamento) {
      var adm   = new Date(p.dataAdmissao);
      var desl  = new Date(p.dataDesligamento);
      // Avança aniversário até o último antes de desligamento
      var anivAno = desl.getFullYear();
      var aniv = new Date(anivAno, adm.getMonth(), adm.getDate());
      if (aniv > desl) aniv = new Date(anivAno - 1, adm.getMonth(), adm.getDate());
      var msProp = (desl - aniv) / (1000 * 60 * 60 * 24 * 30.4375);
      mesesPropFerias = Math.max(0, Math.min(11, Math.floor(msProp)));
    } else {
      mesesPropFerias = meses % 12;
    }

    // ── Férias vencidas não gozadas ───────────────────────────────────────────
    // Prioridade: diasFeriasVencidas (dias reais do saldo da API) > periodosVencidosNaoGozados * 30
    var diasFeriasVencidas;
    if (p.diasFeriasVencidas != null && p.diasFeriasVencidas >= 0) {
      diasFeriasVencidas = Math.max(0, Number(p.diasFeriasVencidas) || 0);
    } else {
      var periodosVencidos = (p.periodosVencidosNaoGozados != null)
        ? Math.max(0, Math.min(2, Number(p.periodosVencidosNaoGozados) || 0))
        : (anosCompletos > 0 ? 1 : 0);
      diasFeriasVencidas = periodosVencidos * 30;
    }

    // Justa causa: só paga férias vencidas; proporcionais e 13º são perdidos
    // Pagamento: (dias_vencidos / 30) × salário × (1 + 1/3)
    var feriasVencidas      = (diasFeriasVencidas / 30) * s * (1 + 1/3);
    var feriasProporcionais = tipo === 'justa_causa' ? 0 : (s * (1 + 1/3)) * (mesesPropFerias / 12);
    var decimo3             = tipo === 'justa_causa' ? 0 : s * (meses13 / 12);

    // ── FGTS ─────────────────────────────────────────────────────────────────
    var fgtsSaldo = s * fgtsAliq * meses;
    var multaFGTS = tipo === 'sem_justa_causa' ? fgtsSaldo * 0.40
                  : tipo === 'culpa_reciproca' ? fgtsSaldo * 0.20
                  : 0;

    var totalRescisao = valorAP + feriasVencidas + feriasProporcionais + decimo3 + multaFGTS;

    var economiaEsperada = Number(p.economiaEsperada || s);
    var mesesBreakEven   = economiaEsperada > 0
      ? Math.ceil(totalRescisao / economiaEsperada) : null;

    return {
      tipoRescisao:           tipo,
      modoAvisoPrevio:        modo,
      salarioBruto:           s,
      mesesTrabalhados:       meses,
      diasAvisoPrevio:        diasAP,
      diasFeriasVencidas:     Math.round(diasFeriasVencidas * 10) / 10,
      meses13:                meses13,
      mesesPropFerias:        mesesPropFerias,
      avisoPrevio:            Math.round(valorAP * 100) / 100,
      feriasVencidas:         Math.round(feriasVencidas * 100) / 100,
      feriasProporcionais:    Math.round(feriasProporcionais * 100) / 100,
      decimo3Proporcional:    Math.round(decimo3 * 100) / 100,
      fgtsSaldoEstimado:      Math.round(fgtsSaldo * 100) / 100,
      multaFGTS:              Math.round(multaFGTS * 100) / 100,
      totalRescisao:          Math.round(totalRescisao * 100) / 100,
      economiaEsperadaMes:    economiaEsperada,
      mesesBreakEven:         mesesBreakEven
    };
  }

  // ─── Turnover ────────────────────────────────────────────────────────────────

  function calcularIndicadoresTurnover(orgId, ano, mes) {
    try {
      var inicio = ano + '-' + _pad(mes) + '-01';
      var fim    = _ultimoDia(ano, mes);
      var colabs = lerJSON('colaboradores.json') || [];
      colabs = colabs.filter(function(c){ return c.orgId === orgId; });

      var total    = colabs.length;
      var entradas = colabs.filter(function(c){ return c.dataAdmissao >= inicio && c.dataAdmissao <= fim; }).length;
      var saidas   = colabs.filter(function(c){ return c.dataDesligamento >= inicio && c.dataDesligamento <= fim; }).length;
      var taxaTurnover = total > 0 ? Math.round(((entradas + saidas) / 2 / total) * 100 * 100) / 100 : 0;

      return { periodo: ano + '-' + _pad(mes), total: total, entradas: entradas, saidas: saidas, taxaTurnover: taxaTurnover };
    } catch(e) { return null; }
  }

  // ─── Compatibilidade Colabore (Fortes Tecnologia) ───────────────────────────

  /**
   * Exporta registros de ponto no formato AFD (Portaria MTE 1510/2009).
   * Compatível com importação no sistema Colabore / ByYou DP da Fortes Tecnologia.
   *
   * Formato AFD:
   *   Tipo 1 (cabeçalho):  "1" + CNPJ(14) + razaoSocial(150) + dataInicio(8 AAAAMMDD)
   *                          + dataFim(8) + dataCriacao(8) + horaCriacao(6 HHMMSS)
   *   Tipo 3 (marcação):   "3" + NSR(9) + data(8) + hora(4 HHMM) + PIS(11)
   *   Tipo 9 (trailer):    "9" + totalTipo3(9)
   */
  function exportarAFD(orgId, dataInicio, dataFim) {
    var registros = PontoRepository.listarPorPeriodo(orgId, dataInicio, dataFim);
    var org       = getOrgConfig();
    var cnpj      = (org.cnpj || '00000000000000').replace(/\D/g,'').padEnd(14,'0').substring(0,14);
    var razao     = (org.orgNomeCompleto || org.orgNome || 'ORGANIZACAO').toUpperCase()
                    .padEnd(150,' ').substring(0,150);
    var hoje      = new Date();
    var dataHoje  = _dataAFD(dataInicio);  // usa dataInicio como referência
    var dataFimFmt = _dataAFD(dataFim);
    var dataCria  = _dataAFD(hoje.toISOString().split('T')[0]);
    var horaCria  = hoje.toTimeString().replace(/:/g,'').substring(0,6);

    var linhas = [];
    // Tipo 1 — cabeçalho
    linhas.push('1' + cnpj + razao + dataHoje + dataFimFmt + dataCria + horaCria);

    // Ordena por NSR
    var ordenados = registros.slice().sort(function(a,b){ return (a.nsr||0) - (b.nsr||0); });

    // Busca PIS de cada colaborador
    var pisPorColaborador = {};
    ordenados.forEach(function(r) {
      if (!pisPorColaborador[r.colaboradorId]) {
        var colab = _buscarColaborador(orgId, r.colaboradorId);
        pisPorColaborador[r.colaboradorId] = colab ? (colab.pis || '00000000000') : '00000000000';
      }
    });

    // Tipo 3 — marcações
    ordenados.forEach(function(r) {
      var nsr  = String(r.nsr || 1).padStart(9,'0');
      var data = _dataAFD(r.data);
      var hora = (r.hora || '0000').replace(':','').padEnd(4,'0').substring(0,4);
      var pis  = (pisPorColaborador[r.colaboradorId] || '').replace(/\D/g,'').padStart(11,'0').substring(0,11);
      linhas.push('3' + nsr + data + hora + pis);
    });

    // Tipo 9 — trailer
    var totalTipo3 = String(ordenados.length).padStart(9,'0');
    linhas.push('9' + totalTipo3);

    return {
      formato:     'AFD',
      versao:      '1510',
      linhas:      linhas,
      conteudo:    linhas.join('\r\n'),
      totalRegistros: ordenados.length
    };
  }

  /**
   * Exporta no formato CSV Colabore.
   * Colunas: PIS;Nome;Data;Hora;Tipo;NSR
   */
  function exportarCSVColabore(orgId, dataInicio, dataFim) {
    var registros = PontoRepository.listarPorPeriodo(orgId, dataInicio, dataFim);
    var linhas    = ['PIS;Nome;Data;Hora;Tipo;NSR'];

    var nomes = {};
    registros.forEach(function(r) {
      if (!nomes[r.colaboradorId]) {
        var c = _buscarColaborador(orgId, r.colaboradorId);
        nomes[r.colaboradorId] = { nome: c ? c.nome : '', pis: c ? (c.pis||'') : '' };
      }
    });

    var ordenados = registros.slice().sort(function(a,b){ return (a.data+a.hora).localeCompare(b.data+b.hora); });
    ordenados.forEach(function(r) {
      var info = nomes[r.colaboradorId] || { nome:'', pis:'' };
      linhas.push([
        info.pis,
        '"' + (info.nome||'').replace(/"/g,'') + '"',
        r.data,
        r.hora,
        r.tipo,
        r.nsr || ''
      ].join(';'));
    });

    return {
      formato:  'CSV_COLABORE',
      conteudo: linhas.join('\n'),
      totalRegistros: ordenados.length
    };
  }

  /**
   * Importa registros de ponto a partir de AFD (Portaria MTE 1510/2009).
   * @param {string} conteudoAFD — texto do arquivo AFD
   */
  function importarAFD(orgId, conteudoAFD, emailAdmin) {
    var linhas    = conteudoAFD.split(/\r?\n/);
    var importados = 0, erros = 0, errosDetalhe = [];

    // Carrega mapa PIS → colaboradorId
    var mapaColabs = {};
    try {
      var colabs = lerJSON('colaboradores.json') || [];
      colabs.filter(function(c){ return c.orgId === orgId; }).forEach(function(c) {
        if (c.pis) mapaColabs[c.pis.replace(/\D/g,'')] = c.id;
      });
    } catch(e) {}

    linhas.forEach(function(linha, idx) {
      if (!linha || linha.trim() === '') return;
      var tipo = linha.charAt(0);
      if (tipo !== '3') return;  // só processa batidas

      try {
        var nsr    = parseInt(linha.substring(1,10), 10);
        var data   = _afdParaData(linha.substring(10,18));  // AAAAMMDD → AAAA-MM-DD
        var hora   = linha.substring(18,20) + ':' + linha.substring(20,22);  // HHMM → HH:MM
        var pis    = linha.substring(22,33).trim();
        var colabId = mapaColabs[pis];

        if (!colabId) {
          erros++;
          errosDetalhe.push({ linha: idx+1, nsr: nsr, motivo: 'PIS não encontrado: ' + pis });
          return;
        }

        PontoRepository.salvarRegistro(orgId, {
          colaboradorId: colabId,
          tipo:   TIPO_ENTRADA,   // AFD não distingue tipo — usa entrada (a ser ajustado manualmente)
          data:   data,
          hora:   hora,
          nsr:    nsr,
          origem: 'afd_import'
        });
        importados++;
      } catch(e) {
        erros++;
        errosDetalhe.push({ linha: idx+1, motivo: e.message });
      }
    });

    AuditoriaService.registrar('PONTO_IMPORTADO_AFD', 'ponto',
      { importados: importados, erros: erros }, emailAdmin);

    return { ok: true, importados: importados, erros: erros, detalhes: errosDetalhe };
  }

  /**
   * Importa registros de ponto a partir de CSV no formato Colabore.
   * Colunas esperadas: PIS;Nome;Data;Hora;Tipo;NSR
   */
  function importarCSVColabore(orgId, conteudoCSV, emailAdmin) {
    var linhas = conteudoCSV.split(/\r?\n/);
    var importados = 0, erros = 0, errosDetalhe = [];

    // Carrega mapa PIS → colaboradorId
    var mapaColabs = {};
    try {
      var colabs = lerJSON('colaboradores.json') || [];
      colabs.filter(function(c){ return c.orgId === orgId; }).forEach(function(c) {
        if (c.pis) mapaColabs[c.pis.replace(/\D/g,'')] = c.id;
      });
    } catch(e) {}

    linhas.forEach(function(linha, idx) {
      if (idx === 0 || !linha.trim()) return;   // pula cabeçalho
      var cols = linha.split(';').map(function(s){ return s.replace(/^"|"$/g,'').trim(); });
      // PIS;Nome;Data;Hora;Tipo;NSR
      var pis    = (cols[0]||'').replace(/\D/g,'');
      var data   = cols[2] || '';
      var hora   = cols[3] || '';
      var tipo   = (cols[4] || TIPO_ENTRADA).toUpperCase();
      var nsr    = parseInt(cols[5] || '0', 10);

      if (!pis || !data || !hora) {
        erros++;
        errosDetalhe.push({ linha: idx+1, motivo: 'PIS, data ou hora ausentes' });
        return;
      }

      var colabId = mapaColabs[pis];
      if (!colabId) {
        erros++;
        errosDetalhe.push({ linha: idx+1, motivo: 'PIS não encontrado: ' + pis });
        return;
      }

      if (TIPOS_VALIDOS.indexOf(tipo) < 0) tipo = TIPO_ENTRADA;

      try {
        PontoRepository.salvarRegistro(orgId, {
          colaboradorId: colabId,
          tipo:   tipo,
          data:   data,
          hora:   hora,
          nsr:    nsr || PontoRepository.proximoNSR(orgId),
          origem: 'csv_colabore'
        });
        importados++;
      } catch(e) {
        erros++;
        errosDetalhe.push({ linha: idx+1, motivo: e.message });
      }
    });

    AuditoriaService.registrar('PONTO_IMPORTADO_CSV', 'ponto',
      { importados: importados, erros: erros }, emailAdmin);

    return { ok: true, importados: importados, erros: erros, detalhes: errosDetalhe };
  }

  // ─── Helpers privados ────────────────────────────────────────────────────────

  function _calcularINSS(salario, tabela) {
    // Cálculo progressivo (portaria 2020+)
    if (!tabela || !tabela.length) return salario * 0.09;   // fallback
    var inss = 0;
    var faixaAnterior = 0;
    tabela.forEach(function(faixa) {
      var contribuicaoFaixa = Math.max(0, Math.min(salario, faixa.ate) - faixaAnterior);
      inss += contribuicaoFaixa * faixa.aliquota;
      faixaAnterior = faixa.ate;
      if (salario <= faixa.ate) return;
    });
    return Math.min(inss, tabela[tabela.length-1].ate * tabela[tabela.length-1].aliquota);
  }

  function _getParametrosRH(orgId) {
    // Tenta obter parâmetros fundidos (config_org + encargos_trabalhistas.json).
    // EncargosEngine tem prioridade sobre os defaults do config_service.
    try {
      if (typeof EncargosEngine !== 'undefined' && EncargosEngine.getParametrosRHComEncargos) {
        return EncargosEngine.getParametrosRHComEncargos(orgId) || {};
      }
    } catch (_) {}
    // Fallback: apenas config_service (comportamento anterior)
    try { return SistemaConfigService.getParametrosRH() || {}; } catch(e) { return {}; }
  }

  function _buscarColaborador(orgId, colaboradorId) {
    try {
      var lista = lerJSON('colaboradores.json') || [];
      return lista.find(function(c){ return c.orgId === orgId && c.id === colaboradorId; }) || null;
    } catch(e) { return null; }
  }

  function _parearMarcacoes(registros) {
    // Pares simples: E→S, I→R
    var pares = [];
    var stack = [];
    registros.forEach(function(r) {
      if (r.tipo === TIPO_ENTRADA || r.tipo === TIPO_RETORNO) {
        stack.push(r);
      } else if ((r.tipo === TIPO_SAIDA || r.tipo === TIPO_INTERVALO) && stack.length > 0) {
        pares.push([stack.pop(), r]);
      }
    });
    return pares;
  }

  function _diferencaMinutos(h1, h2) {
    var p1 = h1.split(':').map(Number), p2 = h2.split(':').map(Number);
    return (p2[0]*60 + p2[1]) - (p1[0]*60 + p1[1]);
  }

  function _calcularEAtualizarBH(orgId, colaboradorId, data) {
    // Regime semanal: o BH fecha por semana via JornadaEngine — não debita/credita por dia
    var colab = _buscarColaborador(orgId, colaboradorId);
    if (colab && colab.regimeApuracao === 'semanal') return;
    var dia = calcularHorasDia(orgId, colaboradorId, data);
    var delta = dia.extras - dia.faltantes;
    if (delta !== 0) {
      PontoRepository.atualizarBancoHoras(orgId, colaboradorId, delta, 'Fechamento dia ' + data);
    }
  }

  function _dataAFD(dataISO) {
    // AAAA-MM-DD → AAAAMMDD
    return (dataISO || '').replace(/-/g, '').substring(0,8);
  }

  function _afdParaData(afd8) {
    // AAAAMMDD → AAAA-MM-DD
    return afd8.substring(0,4) + '-' + afd8.substring(4,6) + '-' + afd8.substring(6,8);
  }

  function _pad(n) { return String(n).padStart(2,'0'); }

  function _ultimoDia(ano, mes) {
    return new Date(ano, mes, 0).toISOString().split('T')[0];
  }

  return {
    registrar:                 registrar,
    excluirRegistro:           excluirRegistro,
    calcularHorasDia:          calcularHorasDia,
    calcularMensal:            calcularMensal,
    calcularCustoCLT:          calcularCustoCLT,
    simularReajuste:           simularReajuste,
    calcularRescisao:          calcularRescisao,
    calcularIndicadoresTurnover: calcularIndicadoresTurnover,
    exportarAFD:               exportarAFD,
    exportarCSVColabore:       exportarCSVColabore,
    importarAFD:               importarAFD,
    importarCSVColabore:       importarCSVColabore
  };
})();
