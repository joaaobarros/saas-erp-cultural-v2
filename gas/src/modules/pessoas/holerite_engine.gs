/**
 * @file modules/pessoas/holerite_engine.gs
 * @layer modules/pessoas
 * @description Engine de Holerite (contracheque) — gera snapshots imutáveis de
 *   folha de pagamento por colaborador/mês, integrando ponto, encargos e PCCS.
 *
 *   Fluxo de cálculo:
 *     1. Lê dados do colaborador (salário, cargo, VT/VA, PIS, CPF)
 *     2. Lê parâmetros de encargos (EncargosEngine — tabelas INSS, IRRF, alíquotas)
 *     3. Consulta PontoEngine para horas extras e faltas no mês
 *     4. Calcula proventos (salário + extras)
 *     5. Calcula descontos (INSS progressivo, IRRF, VT, VA, outros)
 *     6. Calcula encargos patronais (INSS patronal, FGTS, SAT, Sistema S, PIS)
 *     7. Calcula provisões mensais (férias, 13°, FGTS rescisório)
 *     8. Persiste via HoleriteRepository (idempotente por colaborador/mês)
 *
 * @depends holerite_repository.gs, ponto_engine.gs, encargos_engine.gs,
 *          colaborador_repository.gs, core/config.gs
 */

var HoleriteEngine = (function () {

  // ── Constantes de código de rubrica ──────────────────────────────────────────
  var COD = {
    SAL_BASE:   '0001',
    HORA_EXTRA: '0020',
    ADICIONAL:  '0030',
    INSS:       '1001',
    IRRF:       '1002',
    VT:         '1010',
    VA:         '1020',
    VR:         '1025',
    PS:         '1030',
    ADT_DESC:   '1090'
  };

  // ── Helpers privados ──────────────────────────────────────────────────────────

  function _R(v) { return Math.round((v || 0) * 100) / 100; }

  function _pad(n) { return String(n).padStart(2, '0'); }

  function _mesesNome() {
    return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
            'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  }

  function _competencia(mesRef) {
    // mesRef = "AAAA-MM"
    var partes = (mesRef || '').split('-');
    if (partes.length < 2) return mesRef;
    var ano = partes[0];
    var mes = parseInt(partes[1], 10) - 1;
    return _mesesNome()[mes] + '/' + ano;
  }

  function _colaboradorPorId(orgId, colaboradorId) {
    try {
      var lista = lerJSON('colaboradores.json') || [];
      return lista.find(function(c) {
        return c.orgId === orgId && c.id === colaboradorId;
      }) || null;
    } catch(e) { return null; }
  }

  function _calcularINSS(salario, tabelaINSS) {
    if (!tabelaINSS || !tabelaINSS.length) return _R(salario * 0.09);
    var inss = 0;
    var baseAnterior = 0;
    for (var i = 0; i < tabelaINSS.length; i++) {
      var faixa = tabelaINSS[i];
      var teto  = faixa.ate !== null && faixa.ate !== undefined ? faixa.ate : salario;
      var base  = Math.min(salario, teto);
      var contrib = Math.max(0, base - baseAnterior) * faixa.aliquota;
      inss += contrib;
      baseAnterior = teto;
      if (salario <= teto) break;
    }
    return _R(inss);
  }

  function _calcularIRRF(baseCalculo, tabelaIRRF) {
    if (!tabelaIRRF || !tabelaIRRF.length) return 0;
    for (var i = 0; i < tabelaIRRF.length; i++) {
      var faixa = tabelaIRRF[i];
      var teto  = faixa.ate !== null && faixa.ate !== undefined ? faixa.ate : Infinity;
      if (baseCalculo <= teto) {
        return _R(Math.max(0, baseCalculo * faixa.aliquota - (faixa.deducao || 0)));
      }
    }
    return 0;
  }

  function _diasUteisNoMes(ano, mes) {
    // Conta dias úteis (Seg-Sex) sem considerar feriados — aproximação gerencial
    var diasNoMes = new Date(ano, mes, 0).getDate();
    var uteis = 0;
    for (var d = 1; d <= diasNoMes; d++) {
      var diaSemana = new Date(ano, mes - 1, d).getDay();
      if (diaSemana !== 0 && diaSemana !== 6) uteis++;
    }
    return uteis;
  }

  // ── Cálculo de horas extras via PontoEngine ──────────────────────────────────

  function _obterHorasExtras(orgId, colaboradorId, ano, mes) {
    try {
      if (typeof PontoEngine === 'undefined') return { extrasMin: 0, faltasMin: 0 };
      var r = PontoEngine.calcularMensal(orgId, colaboradorId, ano, mes);
      return {
        extrasMin: r.totalExtras || 0,
        faltasMin: r.totalFaltas || 0
      };
    } catch(e) { return { extrasMin: 0, faltasMin: 0 }; }
  }

  // ── Parâmetros de encargos (integração EncargosEngine) ──────────────────────

  function _getEncargos(orgId) {
    try {
      if (typeof EncargosEngine !== 'undefined' &&
          typeof EncargosEngine.getParametrosRHComEncargos === 'function') {
        return EncargosEngine.getParametrosRHComEncargos(orgId) || {};
      }
    } catch(e) {}
    // Defaults conservadores
    return {
      aliquota_fgts:           0.08,
      aliquota_inss_patronal:  0.20,
      aliquota_sat:            0.01,
      aliquota_sistema_s:      0.0566,
      aliquota_pis:            0.01,
      tabela_inss:             [],
      tabela_irrf:             []
    };
  }

  // ── Geração do holerite ───────────────────────────────────────────────────────

  /**
   * Gera um holerite para um colaborador em um mês de referência.
   *
   * @param {string} orgId
   * @param {string} colaboradorId
   * @param {string} mesRef — formato "AAAA-MM"
   * @param {string} emailOperador — quem gerou
   * @param {object} opcoesExtra — { forcarReescrita?, observacoes? }
   * @returns {object} holerite gerado (ou existente se já estava pago)
   */
  function gerar(orgId, colaboradorId, mesRef, emailOperador, opcoesExtra) {
    opcoesExtra = opcoesExtra || {};

    var partes = (mesRef || '').split('-');
    if (partes.length < 2) throw new Error('mesRef inválido. Formato esperado: AAAA-MM');
    var ano = parseInt(partes[0], 10);
    var mes = parseInt(partes[1], 10);

    // ── 1. Dados do colaborador ─────────────────────────────────────────────────
    var colab = _colaboradorPorId(orgId, colaboradorId);
    if (!colab) throw new Error('Colaborador não encontrado: ' + colaboradorId);

    // Apenas CLT gera holerite completo; PJ e bolsistas têm comprovante simplificado
    var vinculo = (colab.vinculo || '').toLowerCase();

    // ── 2. Parâmetros de encargos ───────────────────────────────────────────────
    var enc = _getEncargos(orgId);

    var tabelaINSS = enc.tabela_inss || [];
    var tabelaIRRF = enc.tabela_irrf || [];
    var aliqFgts          = enc.aliquota_fgts           || 0.08;
    var aliqInssPatronal  = enc.aliquota_inss_patronal  || 0.20;
    var aliqSat           = enc.aliquota_sat            || 0.01;
    var aliqSistemaS      = enc.aliquota_sistema_s      || 0.0566;
    var aliqPis           = enc.aliquota_pis            || 0.01;

    // ── 3. Salário e horas extras ───────────────────────────────────────────────
    var salarioBruto   = Number(colab.salarioBruto || colab.salario || 0);
    var diasUteis      = _diasUteisNoMes(ano, mes);
    var horasSemanais  = Number(colab.horasSemanais || 40);
    var horasDiarias   = horasSemanais / 5;              // horas por dia útil
    var valorHora      = salarioBruto / (diasUteis * horasDiarias); // R$/hora

    var pontoInfo      = _obterHorasExtras(orgId, colaboradorId, ano, mes);
    var extrasMin      = pontoInfo.extrasMin || 0;        // minutos extras
    var faltasMin      = pontoInfo.faltasMin || 0;        // minutos faltantes

    // Horas extras: adicional de 50% (CLT art. 59)
    var valorExtras    = extrasMin > 0
      ? _R((extrasMin / 60) * valorHora * 1.5)
      : 0;

    // Desconto por faltas (proporcional)
    var descontoFaltas = faltasMin > 0
      ? _R((faltasMin / 60) * valorHora)
      : 0;

    // ── 4. Proventos ────────────────────────────────────────────────────────────
    var proventos = [];
    proventos.push({
      codigo:     COD.SAL_BASE,
      descricao:  'Salário Base',
      referencia: diasUteis + ' dias',
      valor:      _R(salarioBruto)
    });

    if (valorExtras > 0) {
      proventos.push({
        codigo:     COD.HORA_EXTRA,
        descricao:  'Horas Extras (50%)',
        referencia: _R(extrasMin / 60) + 'h',
        valor:      valorExtras
      });
    }

    // Adicional por função (se configurado no colaborador)
    var adicionalFuncao = Number(colab.adicionalFuncao || 0);
    if (adicionalFuncao > 0) {
      proventos.push({
        codigo:     COD.ADICIONAL,
        descricao:  'Adicional de Função',
        referencia: '',
        valor:      _R(adicionalFuncao)
      });
    }

    var totalProventos = proventos.reduce(function(s, p) { return s + p.valor; }, 0);
    totalProventos = _R(totalProventos);

    // ── 5. Descontos ────────────────────────────────────────────────────────────
    var descontos = [];

    // INSS empregado — cálculo progressivo
    var baseINSS = totalProventos;
    var valorINSS = _calcularINSS(baseINSS, tabelaINSS);

    descontos.push({
      codigo:     COD.INSS,
      descricao:  'INSS',
      referencia: 'tabela progressiva',
      valor:      valorINSS
    });

    // IRRF — base = salário bruto − INSS − dependentes
    var numDependentes   = Number(colab.numDependentes || 0);
    var deducaoDependente = (enc.deducaoDependenteIRRF) || 189.59;  // 2025
    var baseIRRF         = Math.max(0, totalProventos - valorINSS - numDependentes * deducaoDependente);
    var valorIRRF        = vinculo === 'clt' ? _calcularIRRF(baseIRRF, tabelaIRRF) : 0;

    if (valorIRRF > 0) {
      descontos.push({
        codigo:     COD.IRRF,
        descricao:  'IRRF',
        referencia: _R(baseIRRF).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' (base)',
        valor:      valorIRRF
      });
    }

    // Desconto por falta (se houver)
    if (descontoFaltas > 0) {
      descontos.push({
        codigo:     '1099',
        descricao:  'Desconto por Falta',
        referencia: _R(faltasMin / 60) + 'h',
        valor:      descontoFaltas
      });
    }

    // Vale Transporte (empregado desconta 6% do salário bruto, até o valor do benefício)
    var vtBeneficio = Number(colab.vtMensal || colab.vtBruto || 0);
    var vtDescEmpregado = vtBeneficio > 0
      ? _R(Math.min(vtBeneficio, totalProventos * 0.06))
      : 0;
    if (vtDescEmpregado > 0) {
      descontos.push({
        codigo:     COD.VT,
        descricao:  'Vale Transporte (6%)',
        referencia: 'máx. R$ ' + vtBeneficio.toFixed(2),
        valor:      vtDescEmpregado
      });
    }

    // Vale Alimentação — desconto fixo configurado no colaborador
    var vaDescEmpregado = Number(colab.vaDescEmpregado || 0);
    if (vaDescEmpregado > 0) {
      descontos.push({
        codigo:     COD.VA,
        descricao:  'Vale Alimentação (desconto)',
        referencia: '',
        valor:      _R(vaDescEmpregado)
      });
    }

    // Plano de Saúde — desconto do colaborador
    var psDescEmpregado = Number(colab.psDescEmpregado || 0);
    if (psDescEmpregado > 0) {
      descontos.push({
        codigo:     COD.PS,
        descricao:  'Plano de Saúde (desconto)',
        referencia: '',
        valor:      _R(psDescEmpregado)
      });
    }

    // Outros descontos configurados no colaborador
    var outrosDescontos = Number(colab.outrosDescontos || 0);
    if (outrosDescontos > 0) {
      descontos.push({
        codigo:     COD.ADT_DESC,
        descricao:  'Outros Descontos',
        referencia: '',
        valor:      _R(outrosDescontos)
      });
    }

    var totalDescontos = descontos.reduce(function(s, d) { return s + d.valor; }, 0);
    totalDescontos = _R(totalDescontos);

    var salarioLiquido = _R(totalProventos - totalDescontos);

    // ── 6. Encargos patronais ───────────────────────────────────────────────────
    var inssPatronal  = _R(totalProventos * aliqInssPatronal);
    var fgtsCompetencia = _R(totalProventos * aliqFgts);
    var rat           = _R(totalProventos * aliqSat);
    var sistemaS      = _R(totalProventos * aliqSistemaS);
    var pisPatronal   = _R(totalProventos * aliqPis);
    var totalEncPatronais = _R(inssPatronal + fgtsCompetencia + rat + sistemaS + pisPatronal);

    var encargosPatronais = {
      inssPatronal:  inssPatronal,
      fgts:          fgtsCompetencia,
      rat:           rat,
      sistemaS:      sistemaS,
      pis:           pisPatronal,
      total:         totalEncPatronais
    };

    // ── 7. Provisões mensais ────────────────────────────────────────────────────
    var provFerBase  = _R(totalProventos * (1 + 1/3) / 12);
    var provFerEnc   = _R(provFerBase * (aliqInssPatronal + aliqFgts));
    var provFerias   = _R(provFerBase + provFerEnc);

    var prov13Base   = _R(totalProventos / 12);
    var prov13Enc    = _R(prov13Base * (aliqInssPatronal + aliqFgts));
    var prov13       = _R(prov13Base + prov13Enc);

    var provFGTSResc = _R(fgtsCompetencia * 0.40);  // multa rescisória

    var totalProvisoes = _R(provFerias + prov13 + provFGTSResc);

    var provisoes = {
      ferias:        provFerias,
      decTerceiro:   prov13,
      fgtsResc:      provFGTSResc,
      total:         totalProvisoes
    };

    // ── 8. Custo total para a empresa ───────────────────────────────────────────
    // Benefícios pagos pela empresa
    var vtEmpresa  = _R(Math.max(0, vtBeneficio - vtDescEmpregado));
    var vaEmpresa  = _R(Number(colab.vaMensal || colab.vaBruto || 0) - vaDescEmpregado);
    var psEmpresa  = _R(Number(colab.psMensal || colab.psBruto || 0) - psDescEmpregado);
    var beneficiosEmpresa = _R(Math.max(0, vtEmpresa) + Math.max(0, vaEmpresa) + Math.max(0, psEmpresa));

    var custoTotalEmpresa = _R(
      totalProventos + totalEncPatronais + provisoes.total + beneficiosEmpresa
    );

    // ── 9. Montar objeto holerite ───────────────────────────────────────────────
    var holerite = {
      id:            '',            // preenchido pelo repository
      orgId:         orgId,
      colaboradorId: colaboradorId,
      mesRef:        mesRef,
      competencia:   _competencia(mesRef),
      status:        'gerado',
      // Dados do colaborador (snapshot no momento da geração)
      nome:          colab.nome        || '',
      cargo:         colab.cargo       || colab.funcao || '',
      setor:         colab.setor       || '',
      vinculo:       colab.vinculo     || '',
      cpf:           colab.cpf         || '',
      pis:           colab.pis         || '',
      ctps:          colab.ctps        || '',
      dataAdmissao:  colab.dataAdmissao || colab.admissao || '',
      salarioBruto:  salarioBruto,
      diasUteis:     diasUteis,
      // Proventos e descontos
      proventos:      proventos,
      descontos:      descontos,
      totalProventos:  totalProventos,
      totalDescontos:  totalDescontos,
      salarioLiquido:  salarioLiquido,
      // Encargos e custo empresa
      encargosPatronais:  encargosPatronais,
      provisoes:          provisoes,
      fgtsCompetencia:    fgtsCompetencia,
      beneficiosEmpresa:  beneficiosEmpresa,
      psBruto:            _R(Number(colab.psMensal || colab.psBruto || 0)),
      psDescEmpregado:    psDescEmpregado,
      psEmpresa:          psEmpresa,
      custoTotalEmpresa:  custoTotalEmpresa,
      // Metadados
      observacoes:    opcoesExtra.observacoes || '',
      geradoEm:       new Date().toISOString(),
      geradoPor:      emailOperador || 'sistema',
      // Dados extras
      numDependentes: numDependentes,
      horasExtras:    extrasMin > 0 ? _R(extrasMin / 60) : 0
    };

    // ── 10. Persistir ────────────────────────────────────────────────────────────
    var salvo = HoleriteRepository.salvar(orgId, holerite);

    AuditoriaService.registrar('HOLERITE_GERADO', 'holerite', {
      colaboradorId: colaboradorId,
      mesRef:        mesRef,
      competencia:   holerite.competencia,
      salarioLiquido: salarioLiquido,
      custoTotal:    custoTotalEmpresa
    }, emailOperador || 'sistema');

    return salvo;
  }

  /**
   * Processa a folha de um mês inteiro: gera holerites para todos os
   * colaboradores ativos com vínculo CLT, PJ ou bolsista.
   *
   * @param {string} orgId
   * @param {string} mesRef — "AAAA-MM"
   * @param {string} emailOperador
   * @param {object} opcoes — { vinculos?: ['clt','pj','bolsista'], forcarReescrita? }
   * @returns {{ processados, erros, detalhes }}
   */
  function processarFolha(orgId, mesRef, emailOperador, opcoes) {
    opcoes = opcoes || {};
    var vinculosAlvo = opcoes.vinculos || ['clt', 'pj', 'bolsista'];

    // Carregar todos os colaboradores ativos
    var colaboradores = [];
    try {
      var lista = lerJSON('colaboradores.json') || [];
      colaboradores = lista.filter(function(c) {
        return c.orgId === orgId
            && (c.status === 'ativo' || !c.status)
            && vinculosAlvo.indexOf((c.vinculo || '').toLowerCase()) >= 0;
      });
    } catch(e) {
      throw new Error('Erro ao carregar colaboradores: ' + e.message);
    }

    var processados = 0, erros = 0, detalhes = [];

    colaboradores.forEach(function(colab) {
      try {
        var h = gerar(orgId, colab.id, mesRef, emailOperador, opcoes);
        processados++;
        detalhes.push({
          colaboradorId: colab.id,
          nome:          colab.nome,
          ok:            true,
          id:            h.id,
          salarioLiquido: h.salarioLiquido
        });
      } catch(e) {
        erros++;
        detalhes.push({
          colaboradorId: colab.id,
          nome:          colab.nome,
          ok:            false,
          erro:          e.message
        });
        Logger.warn('holerite_engine', 'processarFolha',
          'Erro ao gerar holerite de ' + colab.id + ': ' + e.message);
      }
    });

    AuditoriaService.registrar('FOLHA_PROCESSADA', 'holerite', {
      mesRef:      mesRef,
      processados: processados,
      erros:       erros
    }, emailOperador || 'sistema');

    return {
      mesRef:      mesRef,
      processados: processados,
      erros:       erros,
      total:       colaboradores.length,
      detalhes:    detalhes
    };
  }

  /**
   * Exporta todos os holerites de um período como CSV.
   * Uma linha por colaborador com os totais.
   */
  function exportarCSV(orgId, mesRef) {
    var holerites = HoleriteRepository.listar(orgId, { mesRef: mesRef });
    var ativos = holerites.filter(function(h) { return h.status !== 'cancelado'; });

    var header = 'ID;Nome;Cargo;Setor;Vínculo;CPF;PIS;Competência;Admissão;Bruto;INSS;IRRF;Outros Descontos;Líquido;Encargos Patronais;Provisões;Custo Total;Status\n';

    var linhas = ativos.map(function(h) {
      var inss  = (h.descontos || []).find(function(d){ return d.codigo === COD.INSS; });
      var irrf  = (h.descontos || []).find(function(d){ return d.codigo === COD.IRRF; });
      var outrosD = _R((h.totalDescontos || 0) - (inss ? inss.valor : 0) - (irrf ? irrf.valor : 0));
      return [
        h.id, h.nome, h.cargo, h.setor, h.vinculo, h.cpf, h.pis, h.competencia,
        h.dataAdmissao, h.totalProventos, inss ? inss.valor : 0, irrf ? irrf.valor : 0,
        outrosD, h.salarioLiquido,
        (h.encargosPatronais && h.encargosPatronais.total) || 0,
        (h.provisoes && h.provisoes.total) || 0,
        h.custoTotalEmpresa, h.status
      ].join(';');
    });

    return {
      conteudo:    header + linhas.join('\n'),
      totalLinhas: ativos.length,
      nomeArquivo: 'folha_' + mesRef + '.csv'
    };
  }

  // ── API pública ───────────────────────────────────────────────────────────────

  return {
    gerar:          gerar,
    processarFolha: processarFolha,
    exportarCSV:    exportarCSV
  };

})();
