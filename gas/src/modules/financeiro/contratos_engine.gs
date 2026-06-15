/**
 * @file modules/financeiro/contratos_engine.gs
 * @layer modules/financeiro
 * @description Engine de Contratos — regras de negócio, FSM e cálculos financeiros.
 *
 * FSM de status do contrato:
 *   Ativo     → Suspenso, Encerrado
 *   Suspenso  → Ativo, Encerrado
 *   Encerrado → [] (terminal)
 *
 * RESPONSABILIDADES DESTE ENGINE:
 *   - Validações de negócio (vigência, valores, obrigações)
 *   - Transições de status via FSM com auditoria e evento
 *   - Cálculo de totais, saldos e métricas financeiras
 *   - Orquestração de metas, atividades, pessoal, rubricas e indicadores
 *   - Geração dinâmica de meses/trimestres/períodos (derivados da vigência do contrato)
 *   - Geração do Plano de Contas (visão consolidada por código SEPLAG)
 *   - Emissão de eventos para IntegracaoOrquestrador
 *
 * @depends modules/financeiro/contrato_repository.gs (ContratoRepository)
 *          core/services/fsm_guardian.gs (FsmGuardian)
 *          core/services/auditoria_service.gs (AuditoriaService)
 *          core/event_bus_backend.gs (SystemEvents)
 *          core/events_constants.gs (SystemEventTypes)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 */

// ── Constantes de domínio ─────────────────────────────────────────────

var STATUS_CONTRATO = Object.freeze({
  ATIVO:     'Ativo',
  SUSPENSO:  'Suspenso',
  ENCERRADO: 'Encerrado'
});

var TIPO_META = Object.freeze({
  CONTRATUAL:    'CONTRATUAL',
  COMPLEMENTAR:  'COMPLEMENTAR',
  INSTITUCIONAL: 'INSTITUCIONAL'
});

var TIPO_INDICADOR = Object.freeze({
  RESULTADOS:   'RESULTADOS',  // Indicadores quantitativos mensais (por Meta)
  GESTAO:       'GESTAO',      // Indicadores qualitativos semest./anuais (por Contrato)
  // Legado (mantido por compatibilidade):
  CONTRATUAL:   'CONTRATUAL',
  GERENCIAL:    'GERENCIAL',
  COMPLEMENTAR: 'COMPLEMENTAR'
});

var CATEGORIA_RUBRICA = Object.freeze({
  CUSTEIO:      'custeio',
  INVESTIMENTO: 'investimento'
});

// Código SEPLAG padrão para a Folha de Pagamento.
// Lido do catálogo via ItensDespesaService (item especial tipo 'pessoal').
// Admin pode alterar em Admin → Catálogo SEPLAG.
// Estes valores são o FALLBACK caso o catálogo não esteja populado.
var _CODIGO_SEPLAG_PESSOAL_DEFAULT = '3.3.50.11.00';
var _DESC_SEPLAG_PESSOAL_DEFAULT   = 'Vencimentos e vantagens fixas - Pessoal Civil';

function _getCodigoSeplagPessoal() {
  try {
    if (typeof ItensDespesaService !== 'undefined') {
      var todos = ItensDespesaService.listar(false);
      var itemPes = todos.find(function (i) { return i.tipoPessoal === true; });
      if (itemPes) return { codigo: itemPes.codigo, descricao: itemPes.nome || itemPes.itemAnexo || '' };
    }
  } catch (_) {}
  return { codigo: _CODIGO_SEPLAG_PESSOAL_DEFAULT, descricao: _DESC_SEPLAG_PESSOAL_DEFAULT };
}

// ── FSM ───────────────────────────────────────────────────────────────

var _TRANSICOES_CONTRATO = {
  'Ativo':     ['Suspenso', 'Encerrado'],
  'Suspenso':  ['Ativo', 'Encerrado'],
  'Encerrado': []
};

if (typeof FsmGuardian !== 'undefined') {
  try { FsmGuardian.registrar('contratos', _TRANSICOES_CONTRATO); } catch (_) {}
}

// ── Engine ────────────────────────────────────────────────────────────

var ContratosEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  function _audit(evento, dados) {
    try {
      if (typeof AuditoriaService !== 'undefined')
        AuditoriaService.registrar(evento, 'financeiro', dados || {});
    } catch (_) {}
  }

  function _emit(tipo, payload) {
    try {
      if (typeof SystemEvents !== 'undefined')
        SystemEvents.emit(tipo, payload || {});
    } catch (_) {}
  }

  // ──────────────────────────────────────────────────────────────────
  // HELPERS TEMPORAIS — datas dinâmicas derivadas da vigência
  // ──────────────────────────────────────────────────────────────────

  /**
   * Gera array de { mes:'YYYY-MM', meta:0, realizado:null }
   * a partir das datas de vigência do contrato.
   * Nenhuma data hardcoded.
   */
  function _gerarMesesContrato(vigenciaInicio, vigenciaFim) {
    if (!vigenciaInicio || !vigenciaFim) return [];
    try {
      var inicio = new Date(vigenciaInicio);
      var fim    = new Date(vigenciaFim);
      var meses  = [];
      var cur    = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
      var limFim = new Date(fim.getFullYear(), fim.getMonth(), 1);
      while (cur <= limFim) {
        var ano = cur.getFullYear();
        var mes = String(cur.getMonth() + 1).padStart(2, '0');
        meses.push({ mes: ano + '-' + mes, meta: 0, realizado: null });
        cur.setMonth(cur.getMonth() + 1);
        if (meses.length > 120) break; // proteção
      }
      return meses;
    } catch (e) {
      Logger.warn('contratos_engine', '_gerarMesesContrato', e.message);
      return [];
    }
  }

  /**
   * Gera trimestres agrupados a partir do array de meses.
   * Q1 = meses[0..2], Q2 = meses[3..5], …
   * Cada trimestre: { trimestre:'Q1', periodoLabel:'ABR–JUN/25', meta: SUM, realizado: null }
   */
  function _gerarTrimestres(meses) {
    if (!Array.isArray(meses) || !meses.length) return [];
    var MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    var trimestres = [];
    for (var i = 0; i < meses.length; i += 3) {
      var grupo = meses.slice(i, i + 3);
      var qNum  = Math.floor(i / 3) + 1;
      var metaQ = grupo.reduce(function (s, m) { return s + (Number(m.meta) || 0); }, 0);
      var realQ = grupo.reduce(function (s, m) { return s + (Number(m.realizado) || 0); }, 0);
      // Label: "ABR–JUN/25" etc.
      var labels = grupo.map(function (m) {
        var partes = String(m.mes).split('-');
        var nomeMes = MESES_PT[parseInt(partes[1], 10) - 1] || partes[1];
        return nomeMes.toUpperCase() + '/' + String(partes[0]).slice(2);
      });
      var label = labels[0] + (labels.length > 1 ? '–' + labels[labels.length - 1] : '');
      trimestres.push({
        trimestre:   'Q' + qNum,
        periodoLabel: label,
        meta:        metaQ,
        realizado:   realQ
      });
    }
    return trimestres;
  }

  /**
   * Gera períodos para indicadores GESTÃO.
   * Semestral → '1°S/2025', '2°S/2025', …
   * Anual     → '2025', '2026', …
   */
  function _gerarPeriodosGestao(vigenciaInicio, vigenciaFim, periodicidade) {
    if (!vigenciaInicio || !vigenciaFim) return [];
    try {
      var inicio = new Date(vigenciaInicio);
      var fim    = new Date(vigenciaFim);
      var periodos = [];

      if (periodicidade === 'Anual') {
        for (var ano = inicio.getFullYear(); ano <= fim.getFullYear(); ano++) {
          periodos.push({ periodo: String(ano), meta: '', realizado: null });
        }
      } else {
        // Semestral (default)
        var anoI  = inicio.getFullYear();
        var semI  = inicio.getMonth() < 6 ? 1 : 2;
        var anoF  = fim.getFullYear();
        var semF  = fim.getMonth() < 6 ? 1 : 2;
        var ano   = anoI;
        var sem   = semI;
        var limiteIteracoes = 0;
        while ((ano < anoF || (ano === anoF && sem <= semF)) && limiteIteracoes < 20) {
          periodos.push({ periodo: sem + '°S/' + ano, meta: '', realizado: null });
          sem++;
          if (sem > 2) { sem = 1; ano++; }
          limiteIteracoes++;
        }
      }
      return periodos;
    } catch (e) {
      Logger.warn('contratos_engine', '_gerarPeriodosGestao', e.message);
      return [];
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // CONTRATOS
  // ──────────────────────────────────────────────────────────────────

  function listar(filtros, orgId) {
    return ContratoRepository.listar(orgId || _orgId(), filtros || {});
  }

  function buscarPorId(id, orgId) {
    var c = ContratoRepository.buscarPorId(orgId || _orgId(), id);
    if (!c || !c.metas) return c;
    // Recomputa campos derivados de pessoal com alíquotas e fórmulas atuais
    // (evita exibir valores obsoletos salvos com fórmulas antigas)
    c.metas.forEach(function(meta) {
      if (Array.isArray(meta.pessoal)) {
        meta.pessoal = meta.pessoal.map(function(p) {
          return calcularCustoPessoal(p);
        });
      }
    });
    return c;
  }

  function salvar(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    dados = dados || {};

    if (!dados.nome || !String(dados.nome).trim())
      throw new Error('Nome do contrato é obrigatório.');
    if (!dados.fonteRecurso || !String(dados.fonteRecurso).trim())
      throw new Error('Fonte de recurso é obrigatória.');

    var statusValidos = Object.values(STATUS_CONTRATO);
    if (dados.status && statusValidos.indexOf(dados.status) === -1) {
      throw new Error('Status inválido: ' + dados.status + '. Válidos: ' + statusValidos.join(', '));
    }

    var resultado = ContratoRepository.salvar(orgId, dados);
    var evTipo = resultado.isNovo
      ? (SystemEventTypes ? SystemEventTypes.CONTRACT_CREATED : 'CONTRACT_CREATED')
      : (SystemEventTypes ? SystemEventTypes.CONTRACT_UPDATED : 'CONTRACT_UPDATED');

    _audit(resultado.isNovo ? 'CONTRATO_CRIADO' : 'CONTRATO_ATUALIZADO', {
      id: resultado.id, nome: dados.nome, operador: emailOperador || ''
    });
    _emit(evTipo, { entidade: 'contrato', entidadeId: resultado.id, usuario: emailOperador || '', orgId: orgId });

    return resultado.id;
  }

  function excluir(id, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var c = ContratoRepository.buscarPorId(orgId, id);
    if (!c) throw new Error('Contrato não encontrado: ' + id);
    if (c.status !== STATUS_CONTRATO.ENCERRADO)
      throw new Error('Contrato deve estar ENCERRADO antes de ser excluído. Status atual: ' + c.status);

    var ok = ContratoRepository.excluir(orgId, id);
    _audit('CONTRATO_EXCLUIDO', { id: id, operador: emailOperador || '' });
    return { ok: ok };
  }

  function aplicarTransicao(id, novoStatus, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var c = ContratoRepository.buscarPorId(orgId, id);
    if (!c) throw new Error('Contrato não encontrado: ' + id);

    var atual = c.status || STATUS_CONTRATO.ATIVO;

    if (typeof FsmGuardian !== 'undefined') {
      FsmGuardian.assertValida('contratos', atual, novoStatus);
    } else {
      var perm = _TRANSICOES_CONTRATO[atual] || [];
      if (perm.indexOf(novoStatus) === -1)
        throw new Error('Transição inválida: "' + atual + '" → "' + novoStatus + '"');
    }

    c.status = novoStatus;
    ContratoRepository.salvar(orgId, c);

    var evTipo = novoStatus === STATUS_CONTRATO.ENCERRADO
      ? (SystemEventTypes ? SystemEventTypes.CONTRACT_EXPIRED : 'CONTRACT_EXPIRED')
      : (SystemEventTypes ? SystemEventTypes.CONTRACT_UPDATED : 'CONTRACT_UPDATED');

    _audit('CONTRATO_STATUS_' + novoStatus.toUpperCase(), {
      id: id, de: atual, para: novoStatus, operador: emailOperador || ''
    });
    _emit(evTipo, { entidade: 'contrato', entidadeId: id, de: atual, para: novoStatus, usuario: emailOperador || '', orgId: orgId });

    return { id: id, statusAnterior: atual, statusNovo: novoStatus };
  }

  function obterMetricas(orgId) {
    orgId = orgId || _orgId();
    var lista = ContratoRepository.listar(orgId);
    var totalAtivos = 0;
    var valorAtivos = 0;
    var valorTotal  = 0;
    var porFonte    = {};

    lista.forEach(function (c) {
      valorTotal += c.valorTotal || 0;
      if (c.status === STATUS_CONTRATO.ATIVO) {
        totalAtivos++;
        valorAtivos += c.valorTotal || 0;
      }
      var f = c.fonteRecurso || 'Não informado';
      porFonte[f] = (porFonte[f] || 0) + (c.valorTotal || 0);
    });

    return {
      total:       lista.length,
      ativos:      totalAtivos,
      suspensos:   lista.filter(function (c) { return c.status === STATUS_CONTRATO.SUSPENSO; }).length,
      encerrados:  lista.filter(function (c) { return c.status === STATUS_CONTRATO.ENCERRADO; }).length,
      valorTotal:  valorTotal,
      valorAtivos: valorAtivos,
      porFonte:    porFonte,
      geradoEm:    new Date().toISOString()
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // METAS
  // ──────────────────────────────────────────────────────────────────

  function salvarMeta(idContrato, dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!idContrato) throw new Error('idContrato é obrigatório.');
    if (!dados || !dados.titulo) throw new Error('Título da meta é obrigatório.');

    var c = ContratoRepository.buscarPorId(orgId, idContrato);
    if (!c) throw new Error('Contrato não encontrado: ' + idContrato);
    if (c.status === STATUS_CONTRATO.ENCERRADO)
      throw new Error('Não é possível alterar metas de um contrato encerrado.');

    var idMeta = ContratoRepository.adicionarMeta(orgId, idContrato, dados);
    _audit('CONTRATO_META_SALVA', { idContrato: idContrato, idMeta: idMeta, operador: emailOperador || '' });
    return idMeta;
  }

  function excluirMeta(idContrato, idMeta, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var ok = ContratoRepository.removerMeta(orgId, idContrato, idMeta);
    _audit('CONTRATO_META_EXCLUIDA', { idContrato: idContrato, idMeta: idMeta, operador: emailOperador || '' });
    return { ok: ok };
  }

  // ──────────────────────────────────────────────────────────────────
  // ATIVIDADES (Plano de Trabalho)
  // ──────────────────────────────────────────────────────────────────

  function salvarAtividade(idContrato, idMeta, dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!idContrato || !idMeta) throw new Error('idContrato e idMeta são obrigatórios.');
    if (!dados || !dados.descricao) throw new Error('Descrição da atividade é obrigatória.');

    var c = ContratoRepository.buscarPorId(orgId, idContrato);
    if (!c) throw new Error('Contrato não encontrado: ' + idContrato);
    if (c.status === STATUS_CONTRATO.ENCERRADO)
      throw new Error('Não é possível alterar atividades de um contrato encerrado.');

    var idAtv = ContratoRepository.adicionarAtividade(orgId, idContrato, idMeta, dados);
    _audit('CONTRATO_ATIVIDADE_SALVA', {
      idContrato: idContrato, idMeta: idMeta, idAtividade: idAtv, operador: emailOperador || ''
    });
    return idAtv;
  }

  function excluirAtividade(idContrato, idMeta, idAtividade, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!idContrato || !idMeta || !idAtividade)
      throw new Error('idContrato, idMeta e idAtividade são obrigatórios.');

    var ok = ContratoRepository.removerAtividade(orgId, idContrato, idMeta, idAtividade);
    _audit('CONTRATO_ATIVIDADE_EXCLUIDA', {
      idContrato: idContrato, idMeta: idMeta, idAtividade: idAtividade, operador: emailOperador || ''
    });
    return { ok: ok };
  }

  // ──────────────────────────────────────────────────────────────────
  // PESSOAL (Folha de Pagamento)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Retorna alíquotas patronais do exercício atual via EncargosEngine.
   * Nunca hardcoda percentuais — valores vêm de encargos_trabalhistas.json
   * (editável em Admin → Encargos) com fallback para o catálogo oficial do ano.
   */
  function _getAliquotasEncargos() {
    try {
      if (typeof EncargosEngine !== 'undefined') {
        return EncargosEngine.getParametrosRHComEncargos(_orgId());
      }
    } catch (_) {}
    // Fallback: valores padrão 2026 — nunca sobrescreve o que vier do JSON
    return {
      aliquota_inss_patronal: 0.20,
      aliquota_fgts:          0.08,
      aliquota_pis:           0.01,
      aliquota_sat:           0.01,
      aliquota_sistema_s:     0.0581
    };
  }

  function _getBeneficioSocialFamiliar() {
    try {
      if (typeof EncargosEngine !== 'undefined') {
        var p = EncargosEngine.getParametrosRHComEncargos(_orgId());
        if (p && p.beneficioSocialFamiliar != null) return Number(p.beneficioSocialFamiliar);
      }
    } catch (_) {}
    return 23.00;
  }

  function _getDescontoPlanoSaudePerc() {
    try {
      if (typeof EncargosEngine !== 'undefined') {
        var p = EncargosEngine.getParametrosRHComEncargos(_orgId());
        if (p && p.descontoPlanoSaudePerc != null) return Number(p.descontoPlanoSaudePerc);
      }
    } catch (_) {}
    return 0.30;
  }

  function _getEncargosProvisaoFeriasPerc() {
    try {
      if (typeof EncargosEngine !== 'undefined') {
        var p = EncargosEngine.getParametrosRHComEncargos(_orgId());
        if (p && p.encargosProvisaoFeriasPerc != null) return Number(p.encargosProvisaoFeriasPerc);
      }
    } catch (_) {}
    return 0.35;
  }

  /**
   * Calcula todos os campos derivados de um item de pessoal.
   * Alíquotas lidas de encargos_trabalhistas.json (Admin → Encargos) — nunca hardcoded.
   *
   *   III  = salarioAtual + reajuste (valor, não %)
   *   IV   = INSS Patronal + SAT/RAT + Sistema S + FGTS + PIS
   *          (alíquotas do encargos_trabalhistas.json)
   *   V    = (VT − descVT) + (VA − descVA) + BSF + (Plano − DescPlano)
   *          descVT = min(III × 6%, VT bruto); BSF e descPlanoPerc de config_org.json
   *   VI   = Férias + 13° + FGTS Rescisório
   *          Férias    = III × (1 + encProvFeriasPerc) / 3 / 12  (taxa simplificada de config)
   *          13°       = (III + IV) / 12        (13° completo + encargos reais)
   *          FGTS Resc = fgts × 40%             (multa rescisória proporcional)
   *   VII  = III + IV + V + VI   (custo mensal)
   *   VIII = VII × qtdMeses      (custo total)
   */
  function calcularCustoPessoal(item) {
    item = item || {};
    var qtd          = Number(item.qtd         || 1);
    var qtdMeses     = Number(item.qtdMeses    || 12);
    var salarioAtual = Number(item.salarioAtual || 0);
    var reajuste     = Number(item.reajuste    || 0);

    // III — Total Salário
    var totalSalario = (salarioAtual + reajuste) * qtd;

    // IV — Encargos (taxas dinâmicas — nunca hardcoded)
    var aliq             = _getAliquotasEncargos();
    var inssPatronalAliq = aliq.aliquota_inss_patronal || 0.20;
    var fgtsAliq         = aliq.aliquota_fgts          || 0.08;
    var pisAliq          = aliq.aliquota_pis            || 0.01;
    var satAliq          = aliq.aliquota_sat            || 0.01;
    var sistemaSAliq     = aliq.aliquota_sistema_s      || 0.0581;

    var inssPatronal  = totalSalario * inssPatronalAliq;
    var sat           = totalSalario * satAliq;
    var sistemaS      = totalSalario * sistemaSAliq;
    var fgts          = totalSalario * fgtsAliq;
    var pis           = totalSalario * pisAliq;
    var totalEncargos = inssPatronal + sat + sistemaS + fgts + pis;

    // V — Benefícios
    var valeTransporte      = Number(item.valeTransporte      || 0);
    var descontoVT          = Math.min(totalSalario * 0.06, valeTransporte);
    var alimentacao         = Number(item.alimentacao         || 0);
    var descontoAlimentacao = Number(item.descontoAlimentacao || 0);
    var planoSaude          = Number(item.planoSaude          || 0) * qtd;
    var descPlanoSaudePerc  = _getDescontoPlanoSaudePerc();
    var descontoPlanoSaude  = planoSaude * descPlanoSaudePerc;
    var beneficioSocialFam  = _getBeneficioSocialFamiliar() * qtd;
    var vtLiq               = valeTransporte - descontoVT;
    var totalBeneficios     = vtLiq + (alimentacao - descontoAlimentacao) + beneficioSocialFam + (planoSaude - descontoPlanoSaude);

    // VI — Provisões mensais
    // Férias: adicional 1/3 com taxa simplificada de encargos (35% padrão — config_org.json)
    // A taxa simplificada é padrão de mercado; 13° usa encargos reais do mês
    var encProvFerias  = _getEncargosProvisaoFeriasPerc();
    var ferias         = totalSalario * (1 + encProvFerias) / 3 / 12;
    // 13°: um mês completo de salário + todos os encargos patronais reais
    var decimoTerceiro = (totalSalario + totalEncargos) / 12;
    // FGTS rescisório: 40% do FGTS mensal (passivo de multa em demissão sem justa causa)
    var fgtsRescisao   = fgts * 0.40;
    var totalProvisoes = ferias + decimoTerceiro + fgtsRescisao;

    // VII e VIII
    var custoMensal = totalSalario + totalEncargos + totalBeneficios + totalProvisoes;
    var custoTotal  = custoMensal * qtdMeses;

    var seplagPes = _getCodigoSeplagPessoal();
    return Object.assign({}, item, {
      totalSalario:        +totalSalario.toFixed(2),
      inssPatronal:        +inssPatronal.toFixed(2),
      sat:                 +sat.toFixed(2),
      sistemaS:            +sistemaS.toFixed(2),
      fgts:                +fgts.toFixed(2),
      pis:                 +pis.toFixed(2),
      totalEncargos:       +totalEncargos.toFixed(2),
      valeTransporte:      +valeTransporte.toFixed(2),
      descontoVT:          +descontoVT.toFixed(2),
      alimentacao:         +alimentacao.toFixed(2),
      descontoAlimentacao: +descontoAlimentacao.toFixed(2),
      planoSaude:          +planoSaude.toFixed(2),
      descontoPlanoSaude:  +descontoPlanoSaude.toFixed(2),
      beneficioSocialFam:  +beneficioSocialFam.toFixed(2),
      totalBeneficios:     +totalBeneficios.toFixed(2),
      ferias:              +ferias.toFixed(2),
      decimoTerceiro:      +decimoTerceiro.toFixed(2),
      fgtsRescisao:        +fgtsRescisao.toFixed(2),
      _descPlanoSaudePerc:   descPlanoSaudePerc,
      _encProvFeriasPerc:    encProvFerias,
      totalProvisoes:      +totalProvisoes.toFixed(2),
      custoMensal:         +custoMensal.toFixed(2),
      custoTotal:          +custoTotal.toFixed(2),
      // alíquotas usadas — para conferência/exibição no frontend
      _aliqInssPatronal:   inssPatronalAliq,
      _aliqFgts:           fgtsAliq,
      _aliqSat:            satAliq,
      _aliqSistemaS:       sistemaSAliq,
      _aliqPis:            pisAliq,
      // código SEPLAG do pessoal — lido do catálogo (editável via Admin)
      codigoSeplag:        seplagPes.codigo,
      descSeplag:          seplagPes.descricao
    });
  }

  function salvarPessoal(idContrato, idMeta, dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!idContrato || !idMeta) throw new Error('idContrato e idMeta são obrigatórios.');
    if (!dados || !dados.cargo) throw new Error('Cargo é obrigatório.');

    var c = ContratoRepository.buscarPorId(orgId, idContrato);
    if (!c) throw new Error('Contrato não encontrado: ' + idContrato);

    // Calcular campos derivados automaticamente
    dados = calcularCustoPessoal(dados);

    // Guard: bloquear vínculo se custo real ultrapassar total previsto
    if (dados.idColaborador) {
      _assertSaldoPessoalVinculo(c, dados, orgId);
    }

    var idPes = ContratoRepository.adicionarPessoal(orgId, idContrato, idMeta, dados);
    _audit('CONTRATO_PESSOAL_SALVO', {
      idContrato: idContrato, idMeta: idMeta, idPessoal: idPes, operador: emailOperador || ''
    });
    return idPes;
  }

  function excluirPessoal(idContrato, idMeta, idPessoal, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var ok = ContratoRepository.removerPessoal(orgId, idContrato, idMeta, idPessoal);
    _audit('CONTRATO_PESSOAL_EXCLUIDO', {
      idContrato: idContrato, idMeta: idMeta, idPessoal: idPessoal, operador: emailOperador || ''
    });
    return { ok: ok };
  }

  // ──────────────────────────────────────────────────────────────────
  // ORÇAMENTO REAL DE PESSOAL — timeline salarial + controle de saldo
  // ──────────────────────────────────────────────────────────────────

  /**
   * Reconstrói a linha do tempo salarial de um colaborador dentro do
   * período de vigência do contrato, usando os eventos de historico_rh.json
   * (tipo reajuste / promocao / desligamento).
   *
   * Retorna array de segmentos [{from, to, salario, benefícios}] onde cada
   * segmento representa um intervalo contínuo com mesmo salário.
   * Benefícios são os valores atuais do colaborador (histórico de benefícios
   * não é rastreado por evento ainda).
   */
  function _timelineSalarial(colab, historico, vigIni, vigFim) {
    var vigIniStr = vigIni.toISOString().slice(0, 10);
    var vigFimStr = vigFim.toISOString().slice(0, 10);

    // Eventos do colaborador
    var events = (historico || []).filter(function(h) {
      return h.idColaborador === colab.id;
    });

    // Data de desligamento (se houver)
    var dataDeslig = null;
    events.filter(function(h) { return h.tipo === 'desligamento'; })
      .sort(function(a, b) { return String(b.data || '').localeCompare(String(a.data || '')); })
      .forEach(function(h, i) { if (i === 0) dataDeslig = String(h.data || ''); });

    // Período ativo do colaborador dentro da vigência
    var admStr = String(colab.dataAdmissao || vigIniStr).slice(0, 10);
    var activeFrom = admStr > vigIniStr ? admStr : vigIniStr;
    var activeTo   = (dataDeslig && dataDeslig < vigFimStr) ? dataDeslig : vigFimStr;

    if (activeFrom >= activeTo) return []; // não estava ativo no período

    // Benefícios atuais (histórico de benefícios não é rastreado por evento)
    var ben = {
      valeAlimentacao:     Number(colab.valeAlimentacao     || 0),
      valeTransporte:      Number(colab.valeTransporte      || 0),
      planoSaude:          Number(colab.planoSaude          || 0),
      descontoAlimentacao: Number(colab.descontoAlimentacao || 0)
    };

    // Eventos que alteram salário, ordenados DESC
    var salEvents = events.filter(function(h) {
      return (h.tipo === 'reajuste' || h.tipo === 'promocao') &&
             h.novoSalario !== undefined && h.novoSalario !== null && h.novoSalario !== '' &&
             h.data;
    }).sort(function(a, b) { return String(b.data).localeCompare(String(a.data)); });

    // Caminha do mais recente para o mais antigo ajustando o salário
    var curSal = Number(colab.salarioBruto || colab.salario || 0);
    var curEnd = activeTo;
    var segments = [];

    salEvents.forEach(function(ev) {
      var evDate = String(ev.data).slice(0, 10);
      if (evDate >= activeTo) {
        // Evento após o período — ajusta salário inicial retroativamente
        curSal = Number(ev.salarioAnterior !== undefined ? ev.salarioAnterior : curSal);
        return;
      }
      if (evDate < activeFrom) return; // antes do período — ignora
      // Evento dentro do período
      segments.unshift(Object.assign({ from: evDate, to: curEnd, salario: curSal }, ben));
      curSal = Number(ev.salarioAnterior !== undefined ? ev.salarioAnterior : curSal);
      curEnd = evDate;
    });

    // Segmento inicial (do começo do período até o primeiro evento interno)
    segments.unshift(Object.assign({ from: activeFrom, to: curEnd, salario: curSal }, ben));

    return segments.filter(function(s) { return s.from < s.to; });
  }

  /** Meses fracionários entre dois strings ISO 'YYYY-MM-DD'. */
  function _mesesEntreDatas(from, to) {
    if (!from || !to || from >= to) return 0;
    var d1 = new Date(from + 'T00:00:00');
    var d2 = new Date(to   + 'T00:00:00');
    var m  = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    var frac = (d2.getDate() - d1.getDate()) / 30;
    return Math.max(0, m + frac);
  }

  /**
   * Calcula o custo real de um colaborador durante a vigência do contrato,
   * usando a linha do tempo salarial reconstruída do histórico de RH.
   */
  function _calcularCustoRealColaborador(colab, historico, vigIni, vigFim) {
    var segs = _timelineSalarial(colab, historico, vigIni, vigFim);
    if (!segs.length) return { custoTotal: 0, meses: 0, segmentos: [] };

    var totalCusto = 0;
    var totalMeses = 0;
    var segmentosDetalhados = [];

    segs.forEach(function(seg) {
      var meses = _mesesEntreDatas(seg.from, seg.to);
      if (meses <= 0) return;
      var calc = calcularCustoPessoal({
        salarioAtual:        seg.salario,
        reajuste:            0,
        qtd:                 1,
        qtdMeses:            meses,
        valeTransporte:      seg.valeTransporte,
        alimentacao:         seg.valeAlimentacao,
        descontoAlimentacao: seg.descontoAlimentacao,
        planoSaude:          seg.planoSaude
      });
      totalCusto += calc.custoTotal;
      totalMeses += meses;
      segmentosDetalhados.push({
        from:        seg.from,
        to:          seg.to,
        meses:       +meses.toFixed(2),
        salario:     seg.salario,
        custoMensal: calc.custoMensal,
        custoTotal:  calc.custoTotal
      });
    });

    return {
      custoTotal: +totalCusto.toFixed(2),
      meses:      +totalMeses.toFixed(2),
      segmentos:  segmentosDetalhados
    };
  }

  /**
   * Verifica saldo antes de vincular um colaborador a um item de pessoal.
   * Lança Error se o custo real do vínculo ultrapassar o total previsto.
   */
  function _assertSaldoPessoalVinculo(contrato, itemNovo, orgId) {
    var vigIniStr = contrato.vigenciaInicio || '';
    var vigFimStr = contrato.vigenciaFim   || '';
    if (!vigIniStr || !vigFimStr || !itemNovo.idColaborador) return;

    var vigIni = new Date(vigIniStr + 'T00:00:00');
    var vigFim = new Date(vigFimStr + 'T00:00:00');
    if (isNaN(vigIni.getTime()) || isNaN(vigFim.getTime())) return;

    var colaboradores = ColaboradorRepository.listar({ orgId: orgId });
    var colabMap = {};
    colaboradores.forEach(function(c) { colabMap[c.id] = c; });

    var historico = ColaboradorRepository.listarHistorico({ orgId: orgId });

    // Total previsto — todos os itens de pessoal (incluindo o novo/editado)
    var totalPrevisto = Number(itemNovo.custoTotal || 0);
    (contrato.metas || []).forEach(function(meta) {
      (meta.pessoal || []).forEach(function(p) {
        if (p.id === itemNovo.id) return; // excluir se edição do mesmo item
        totalPrevisto += Number(p.custoTotal || 0);
      });
    });

    // Total realizado — colaboradores já vinculados + o novo
    var totalRealizado = 0;
    (contrato.metas || []).forEach(function(meta) {
      (meta.pessoal || []).forEach(function(p) {
        if (p.id === itemNovo.id) return; // excluir se edição do mesmo item
        if (!p.idColaborador || !colabMap[p.idColaborador]) return;
        var cr = _calcularCustoRealColaborador(colabMap[p.idColaborador], historico, vigIni, vigFim);
        totalRealizado += cr.custoTotal;
      });
    });

    if (colabMap[itemNovo.idColaborador]) {
      var crNovo = _calcularCustoRealColaborador(colabMap[itemNovo.idColaborador], historico, vigIni, vigFim);
      totalRealizado += crNovo.custoTotal;
    }

    var saldo = totalPrevisto - totalRealizado;
    if (saldo < -0.01) {
      throw new Error(
        'Saldo de pessoal insuficiente para este vínculo. ' +
        'Total previsto: R$ ' + totalPrevisto.toFixed(2) + '. ' +
        'Custo real estimado (todos os vínculos): R$ ' + totalRealizado.toFixed(2) + '. ' +
        'Defasagem: R$ ' + Math.abs(saldo).toFixed(2) + '. ' +
        'Ajuste o orçamento ou revise o vínculo.'
      );
    }
  }

  /**
   * Vincula automaticamente colaboradores a itens de pessoal sem vínculo,
   * usando correspondência por cargo (case-insensitive), respeitando o período
   * ativo de cada colaborador vs. a vigência do contrato.
   *
   * Um colaborador desligado antes do início do contrato é excluído.
   * Cada colaborador pode ser vinculado a no máximo um item por execução.
   */
  function autoVincularPessoal(idContrato, idMeta, orgId) {
    orgId = orgId || _orgId();
    var contrato = ContratoRepository.buscarPorId(orgId, idContrato);
    if (!contrato) throw new Error('Contrato não encontrado.');

    var vigIniStr = contrato.vigenciaInicio || '';
    var vigFimStr = contrato.vigenciaFim   || '';

    var colaboradores = ColaboradorRepository.listar({ orgId: orgId });
    var historico     = ColaboradorRepository.listarHistorico({ orgId: orgId });

    // Mapa de data de desligamento por idColaborador
    var desligMap = {};
    historico.forEach(function(h) {
      if (h.tipo !== 'desligamento') return;
      var prev = desligMap[h.idColaborador];
      if (!prev || String(h.data) > prev) desligMap[h.idColaborador] = String(h.data || '');
    });

    // Filtra colaboradores ativos OU desligados depois do início do contrato
    var elegiveis = colaboradores.filter(function(c) {
      if (c.status === 'desligado') {
        var d = desligMap[c.id] || '';
        return !vigIniStr || d >= vigIniStr; // desligado durante ou após vigência
      }
      // Admitido antes do fim do contrato
      var adm = String(c.dataAdmissao || '');
      return !vigFimStr || !adm || adm <= vigFimStr;
    });

    // Índice cargo → lista de elegíveis
    var porCargo = {};
    elegiveis.forEach(function(c) {
      var k = (c.cargo || '').toLowerCase().trim();
      if (!k) return;
      if (!porCargo[k]) porCargo[k] = [];
      porCargo[k].push(c);
    });

    // Conjunto de IDs já vinculados (qualquer meta do contrato)
    var vinculados = {};
    (contrato.metas || []).forEach(function(m) {
      (m.pessoal || []).forEach(function(p) {
        if (p.idColaborador) vinculados[p.idColaborador] = true;
      });
    });

    var qtdVinculados = 0;
    var metas = contrato.metas || [];

    for (var mi = 0; mi < metas.length; mi++) {
      var meta = metas[mi];
      if (idMeta && meta.id !== idMeta) continue;
      var pessoal = meta.pessoal || [];

      for (var pi = 0; pi < pessoal.length; pi++) {
        var item = pessoal[pi];
        if (item.idColaborador) continue; // já vinculado

        var key  = (item.cargo || '').toLowerCase().trim();
        var cands = porCargo[key] || [];
        var match = null;

        for (var ci = 0; ci < cands.length; ci++) {
          if (!vinculados[cands[ci].id]) { match = cands[ci]; break; }
        }

        if (match) {
          var itemAtualizado = Object.assign({}, item, {
            idColaborador:   match.id,
            nomeColaborador: match.nome || match.email || match.id
          });
          ContratoRepository.adicionarPessoal(orgId, idContrato, meta.id, itemAtualizado);
          vinculados[match.id] = true;
          qtdVinculados++;
        }
      }
    }

    _audit('CONTRATO_PESSOAL_AUTO_VINCULADO', {
      idContrato: idContrato, idMeta: idMeta || 'todas',
      vinculados: qtdVinculados, orgId: orgId
    });
    return { ok: true, vinculados: qtdVinculados };
  }

  /**
   * Painel de controle orçamentário de pessoal.
   * Para cada item de pessoal do contrato, compara o custo previsto
   * (orçado no item) com o custo real estimado do colaborador vinculado,
   * usando a linha do tempo salarial do histórico de RH.
   *
   * Retorna: { previsto, realizado, saldo, desvioPercent, alerta, itens[] }
   */
  function painelOrcamentoPessoal(idContrato, orgId) {
    orgId = orgId || _orgId();
    var contrato = ContratoRepository.buscarPorId(orgId, idContrato);
    if (!contrato) return { ok: false, erro: 'Contrato não encontrado.' };

    var vigIniStr = contrato.vigenciaInicio || '';
    var vigFimStr = contrato.vigenciaFim   || '';
    if (!vigIniStr || !vigFimStr) {
      return {
        ok: true,
        aviso: 'Vigência do contrato não definida — cálculo do realizado indisponível.',
        itens: [], previsto: 0, realizado: 0, saldo: 0, desvioPercent: 0, alerta: 'ok'
      };
    }

    var vigIni = new Date(vigIniStr + 'T00:00:00');
    var vigFim = new Date(vigFimStr + 'T00:00:00');
    if (isNaN(vigIni.getTime()) || isNaN(vigFim.getTime())) {
      return {
        ok: true,
        aviso: 'Datas de vigência inválidas.',
        itens: [], previsto: 0, realizado: 0, saldo: 0, desvioPercent: 0, alerta: 'ok'
      };
    }

    // Carregar dados de pessoas uma única vez
    var colaboradores = ColaboradorRepository.listar({ orgId: orgId });
    var colabMap = {};
    colaboradores.forEach(function(c) { colabMap[c.id] = c; });
    var historico = ColaboradorRepository.listarHistorico({ orgId: orgId });

    var totalPrevisto  = 0;
    var totalRealizado = 0;
    var itensPainel    = [];

    (contrato.metas || []).forEach(function(meta) {
      (meta.pessoal || []).forEach(function(item) {
        var previsto = Number(item.custoTotal || 0);
        totalPrevisto += previsto;

        var realizadoItem    = 0;
        var segmentos        = [];
        var nomeColaborador  = item.nomeColaborador || null;
        var alertaItem       = 'sem_vinculo';

        if (item.idColaborador && colabMap[item.idColaborador]) {
          var colab = colabMap[item.idColaborador];
          nomeColaborador = colab.nome || colab.email || item.nomeColaborador;
          var cr = _calcularCustoRealColaborador(colab, historico, vigIni, vigFim);
          realizadoItem = cr.custoTotal;
          segmentos     = cr.segmentos;
          var pct = previsto > 0 ? (realizadoItem / previsto * 100) : (realizadoItem > 0 ? 999 : 0);
          alertaItem = pct > 105 ? 'critico' : pct > 90 ? 'atencao' : pct < 50 ? 'folga' : 'ok';
        }

        totalRealizado += realizadoItem;
        var desvio    = realizadoItem - previsto;
        var pctItem   = previsto > 0 ? (realizadoItem / previsto * 100) : 0;

        itensPainel.push({
          id:              item.id,
          idMeta:          meta.id,
          cargo:           item.cargo,
          qtd:             item.qtd    || 1,
          qtdMeses:        item.qtdMeses || 12,
          salarioAtual:    item.salarioAtual || 0,
          previsto:        +previsto.toFixed(2),
          realizado:       +realizadoItem.toFixed(2),
          desvio:          +desvio.toFixed(2),
          desvioPercent:   +pctItem.toFixed(1),
          idColaborador:   item.idColaborador   || null,
          nomeColaborador: nomeColaborador,
          segmentos:       segmentos,
          alerta:          alertaItem
        });
      });
    });

    var saldo        = totalPrevisto - totalRealizado;
    var desvioTotal  = totalPrevisto > 0 ? (totalRealizado / totalPrevisto * 100) : 0;

    return {
      ok:             true,
      previsto:       +totalPrevisto.toFixed(2),
      realizado:      +totalRealizado.toFixed(2),
      saldo:          +saldo.toFixed(2),
      desvioPercent:  +desvioTotal.toFixed(1),
      alerta:         desvioTotal > 105 ? 'critico' : desvioTotal > 90 ? 'atencao' : desvioTotal < 50 ? 'folga' : 'ok',
      itens:          itensPainel,
      vigenciaInicio: vigIniStr,
      vigenciaFim:    vigFimStr
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // RUBRICAS (Itens de Despesa)
  // ──────────────────────────────────────────────────────────────────

  function salvarRubrica(idContrato, idMeta, idAtividade, dados, emailOperador, orgId) {
    // Backward compat: assinatura antiga era (idContrato, idMeta, dados, email, orgId)
    if (typeof idAtividade === 'object' && idAtividade !== null) {
      orgId        = emailOperador;
      emailOperador = dados;
      dados        = idAtividade;
      idAtividade  = null;
    }

    orgId = orgId || _orgId();
    if (!idContrato || !idMeta) throw new Error('idContrato e idMeta são obrigatórios.');
    if (!dados || !dados.nome)  throw new Error('Nome do item de despesa é obrigatório.');

    // Calcular valorTotal a partir da memória de cálculo
    var mem = Array.isArray(dados.memoriaCalculo) ? dados.memoriaCalculo : [];
    if (mem.length > 0) {
      dados.valorTotal = calcularTotalRubrica(mem);
    }

    // Calcular custoMensal se qtdMeses informado
    if (dados.qtdMeses && dados.valorTotal !== undefined) {
      dados.custoMensal = dados.qtdMeses > 0 ? dados.valorTotal / dados.qtdMeses : 0;
    }

    var idRubrica = ContratoRepository.adicionarRubrica(orgId, idContrato, idMeta, idAtividade, dados);

    try { salvarVersaoContrato(idContrato, emailOperador, orgId); } catch(_) {}

    _audit('CONTRATO_RUBRICA_SALVA', {
      idContrato: idContrato, idMeta: idMeta, idAtividade: idAtividade || '',
      idRubrica: idRubrica, operador: emailOperador || ''
    });
    return idRubrica;
  }

  /**
   * Adiciona um item à memória de cálculo de uma rubrica.
   * Funciona tanto para rubricas em atividades quanto em metas (backward compat).
   */
  function adicionarItemMemoriaRubrica(idContrato, idMeta, idRubrica, item, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var id = item.id || gerarId('mem');
    var novoItem = {
      id:           id,
      descricao:    String(item.descricao || '').trim(),
      setor:        String(item.setor || '').trim(),
      qtd:          Number(item.qtd || 0),
      metrica:      item.metrica || item.tipo || 'UN',
      valorUnitario: Number(item.valorUnitario || item.valorUnit || 0),
      subtotal:     Number(item.qtd || 0) * Number(item.valorUnitario || item.valorUnit || 0),
      obs:          String(item.obs || '').trim()
    };

    ContratoRepository.modificarContrato(orgId, idContrato, function (contrato) {
      // Procurar a rubrica — primeiro em atividades, depois direto na meta
      var encontrou = false;
      (contrato.metas || []).forEach(function (meta) {
        if (meta.id !== idMeta) return;
        // Buscar em atividades
        (meta.atividades || []).forEach(function (atv) {
          (atv.rubricas || []).forEach(function (rub) {
            if (rub.id !== idRubrica) return;
            if (!Array.isArray(rub.memoriaCalculo)) rub.memoriaCalculo = [];
            var idx = rub.memoriaCalculo.findIndex(function (i) { return i.id === id; });
            if (idx >= 0) rub.memoriaCalculo[idx] = novoItem;
            else rub.memoriaCalculo.push(novoItem);
            rub.valorTotal = calcularTotalRubrica(rub.memoriaCalculo);
            if (rub.qtdMeses) rub.custoMensal = rub.valorTotal / rub.qtdMeses;
            encontrou = true;
          });
        });
        // Buscar em rubricas diretas (backward compat)
        if (!encontrou) {
          (meta.rubricas || []).forEach(function (rub) {
            if (rub.id !== idRubrica) return;
            if (!Array.isArray(rub.memoriaCalculo)) rub.memoriaCalculo = [];
            var idx = rub.memoriaCalculo.findIndex(function (i) { return i.id === id; });
            if (idx >= 0) rub.memoriaCalculo[idx] = novoItem;
            else rub.memoriaCalculo.push(novoItem);
            rub.valorTotal = calcularTotalRubrica(rub.memoriaCalculo);
            encontrou = true;
          });
        }
        // Recalcular somatórios da meta
        if (typeof ContratoRepository._calcularMeta === 'function')
          ContratoRepository._calcularMeta(meta);
      });
      // Recalcular contrato
      if (typeof ContratoRepository._somarMetas === 'function')
        contrato.valorTotal = ContratoRepository._somarMetas(contrato.metas);
      return contrato;
    });

    _audit('MEMORIA_CALCULO_ADICIONADA', {
      idContrato: idContrato, idRubrica: idRubrica, operador: emailOperador || ''
    });
    try { salvarVersaoContrato(idContrato, emailOperador, orgId); } catch(_) {}
    return novoItem;
  }

  /**
   * Remove um item da memória de cálculo de uma rubrica.
   */
  function removerItemMemoriaRubrica(idContrato, idMeta, idRubrica, itemId, emailOperador, orgId) {
    orgId = orgId || _orgId();

    ContratoRepository.modificarContrato(orgId, idContrato, function (contrato) {
      (contrato.metas || []).forEach(function (meta) {
        if (meta.id !== idMeta) return;
        (meta.atividades || []).forEach(function (atv) {
          (atv.rubricas || []).forEach(function (rub) {
            if (rub.id !== idRubrica) return;
            rub.memoriaCalculo = (rub.memoriaCalculo || []).filter(function (i) { return i.id !== itemId; });
            rub.valorTotal = calcularTotalRubrica(rub.memoriaCalculo);
          });
        });
        (meta.rubricas || []).forEach(function (rub) {
          if (rub.id !== idRubrica) return;
          rub.memoriaCalculo = (rub.memoriaCalculo || []).filter(function (i) { return i.id !== itemId; });
          rub.valorTotal = calcularTotalRubrica(rub.memoriaCalculo);
        });
        if (typeof ContratoRepository._calcularMeta === 'function')
          ContratoRepository._calcularMeta(meta);
      });
      if (typeof ContratoRepository._somarMetas === 'function')
        contrato.valorTotal = ContratoRepository._somarMetas(contrato.metas);
      return contrato;
    });

    _audit('MEMORIA_CALCULO_REMOVIDA', {
      idContrato: idContrato, idRubrica: idRubrica, itemId: itemId, operador: emailOperador || ''
    });
    return true;
  }

  function calcularTotalRubrica(memoriaCalculo) {
    if (!Array.isArray(memoriaCalculo)) return 0;
    return memoriaCalculo.reduce(function (soma, item) {
      var sub = item.subtotal !== undefined
        ? Number(item.subtotal)
        : Number(item.qtd || 0) * Number(item.valorUnitario || item.valorUnit || 0);
      return soma + sub;
    }, 0);
  }

  function excluirRubrica(idContrato, idMeta, idAtividade, idRubrica, emailOperador, orgId) {
    // Backward compat: (idContrato, idMeta, idRubrica, email, orgId)
    if (!idRubrica || typeof idAtividade === 'string' && !orgId) {
      orgId        = emailOperador;
      emailOperador = idRubrica;
      idRubrica    = idAtividade;
      idAtividade  = null;
    }

    orgId = orgId || _orgId();
    var ok = ContratoRepository.removerRubrica(orgId, idContrato, idMeta, idAtividade, idRubrica);
    _audit('CONTRATO_RUBRICA_EXCLUIDA', {
      idContrato: idContrato, idMeta: idMeta, idRubrica: idRubrica, operador: emailOperador || ''
    });
    return { ok: ok };
  }

  // ──────────────────────────────────────────────────────────────────
  // INDICADORES RESULTADOS (por Meta)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Salva um indicador RESULTADOS vinculado a uma meta.
   * Gera meses[] e trimestres[] dinamicamente a partir da vigência do contrato.
   */
  function salvarIndicador(idContrato, idMeta, dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!idContrato || !idMeta) throw new Error('idContrato e idMeta são obrigatórios.');
    if (!dados || !dados.nome)  throw new Error('Nome do indicador é obrigatório.');

    var c = ContratoRepository.buscarPorId(orgId, idContrato);
    if (!c) throw new Error('Contrato não encontrado: ' + idContrato);

    // Forçar tipo RESULTADOS para indicadores de meta
    dados.tipoIndicador = 'RESULTADOS';

    // Gerar meses dinamicamente se não existirem (nunca hardcode datas)
    if (!Array.isArray(dados.meses) || dados.meses.length === 0) {
      dados.meses = _gerarMesesContrato(c.vigenciaInicio, c.vigenciaFim);
    }

    // Calcular trimestres a partir dos meses
    dados.trimestres = _gerarTrimestres(dados.meses);

    // Calcular metaTotal
    dados.metaTotal = dados.meses.reduce(function (s, m) { return s + (Number(m.meta) || 0); }, 0);

    var idInd = ContratoRepository.adicionarIndicador(orgId, idContrato, idMeta, dados);
    _audit('CONTRATO_INDICADOR_SALVO', {
      idContrato: idContrato, idMeta: idMeta, idIndicador: idInd, operador: emailOperador || ''
    });
    return idInd;
  }

  /**
   * Atualiza a meta ou o realizado de um mês específico de um indicador RESULTADOS.
   * @param {string} campo — 'meta' | 'realizado'
   */
  function atualizarMetaMes(idContrato, idMeta, idIndicador, mes, campo, valor, emailOperador, orgId) {
    orgId = orgId || _orgId();
    ContratoRepository.atualizarMetaMes(orgId, idContrato, idMeta, idIndicador, mes, campo, valor);
    // Recalcular trimestres
    _recalcularTrimestresIndicador(orgId, idContrato, idMeta, idIndicador);
    return true;
  }

  function _recalcularTrimestresIndicador(orgId, idContrato, idMeta, idIndicador) {
    try {
      ContratoRepository.modificarContrato(orgId, idContrato, function (contrato) {
        (contrato.metas || []).forEach(function (meta) {
          if (meta.id !== idMeta) return;
          (meta.indicadores || []).forEach(function (ind) {
            if (ind.id !== idIndicador) return;
            ind.trimestres = _gerarTrimestres(ind.meses || []);
            ind.metaTotal  = (ind.meses || []).reduce(function (s, m) { return s + (Number(m.meta) || 0); }, 0);
          });
        });
        return contrato;
      });
    } catch (_) {}
  }

  // ──────────────────────────────────────────────────────────────────
  // INDICADORES GESTÃO (por Contrato)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Salva um indicador GESTÃO vinculado ao contrato (não à meta).
   * Gera metasGestao[] dinamicamente a partir da vigência e periodicidade.
   */
  function salvarIndicadorGestao(idContrato, dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!idContrato) throw new Error('idContrato é obrigatório.');
    if (!dados || !dados.nome) throw new Error('Nome do indicador é obrigatório.');

    var c = ContratoRepository.buscarPorId(orgId, idContrato);
    if (!c) throw new Error('Contrato não encontrado: ' + idContrato);

    dados.tipoIndicador = 'GESTAO';

    // Gerar períodos dinamicamente se não existirem
    if (!Array.isArray(dados.metasGestao) || dados.metasGestao.length === 0) {
      dados.metasGestao = _gerarPeriodosGestao(
        c.vigenciaInicio, c.vigenciaFim, dados.periodicidade || 'Semestral'
      );
    }

    var idInd = ContratoRepository.adicionarIndicadorGestao(orgId, idContrato, dados);
    _audit('CONTRATO_INDICADOR_GESTAO_SALVO', {
      idContrato: idContrato, idIndicador: idInd, operador: emailOperador || ''
    });
    return idInd;
  }

  function excluirIndicadorGestao(idContrato, idIndicador, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var ok = ContratoRepository.removerIndicadorGestao(orgId, idContrato, idIndicador);
    _audit('CONTRATO_INDICADOR_GESTAO_EXCLUIDO', {
      idContrato: idContrato, idIndicador: idIndicador, operador: emailOperador || ''
    });
    return { ok: ok };
  }

  /**
   * Atualiza a meta ou o realizado de um período de um indicador GESTÃO.
   * @param {string} campo — 'meta' | 'realizado'
   */
  function atualizarMetaGestao(idContrato, idIndicador, periodo, campo, valor, emailOperador, orgId) {
    orgId = orgId || _orgId();
    ContratoRepository.atualizarMetaGestao(orgId, idContrato, idIndicador, periodo, campo, valor);
    return true;
  }

  // ──────────────────────────────────────────────────────────────────
  // PLANO DE CONTAS — visão consolidada por código SEPLAG
  // ──────────────────────────────────────────────────────────────────

  /**
   * Gera o Plano de Contas do contrato: consolida todas as despesas
   * agrupadas por código SEPLAG.
   *
   * - PESSOAL → código 3.3.50.11.00 (fixo, soma de metas[].pessoal[].custoTotal)
   * - CUSTEIO/INVESTIMENTO → agrupado por rubrica.codigoSeplag
   *   de todas as atividades de todas as metas
   *
   * @returns {Array} [{ codigo, descricao, qtdMeses, custoMensal, custoTotal }]
   */
  function gerarPlanoContas(idContrato, orgId) {
    orgId = orgId || _orgId();
    var c = ContratoRepository.buscarPorId(orgId, idContrato);
    if (!c) throw new Error('Contrato não encontrado: ' + idContrato);

    var qtdMeses = Number(c.qtdMeses) || 24;
    var mapa = {}; // codigoSeplag → { descricao, custoTotal }

    var seplagPes = _getCodigoSeplagPessoal();

    function _inserir(codigo, descricao, valor) {
      if (!codigo) return;
      if (!mapa[codigo]) mapa[codigo] = { codigo: codigo, descricao: descricao || '', custoTotal: 0 };
      mapa[codigo].custoTotal += Number(valor) || 0;
      if (descricao && !mapa[codigo].descricao) mapa[codigo].descricao = descricao;
    }

    (c.metas || []).forEach(function (meta) {
      // Pessoal — código lido do catálogo (editável)
      (meta.pessoal || []).forEach(function (p) {
        var cod = p.codigoSeplag || seplagPes.codigo;
        var desc = p.descSeplag  || seplagPes.descricao;
        _inserir(cod, desc, p.custoTotal);
      });

      // Rubricas em atividades
      (meta.atividades || []).forEach(function (atv) {
        (atv.rubricas || []).forEach(function (rub) {
          _inserir(rub.codigoSeplag, rub.itemAnexoIX || rub.nome, rub.valorTotal);
        });
      });

      // Rubricas legadas (direto na meta)
      (meta.rubricas || []).forEach(function (rub) {
        _inserir(rub.codigoSeplag, rub.itemAnexoIX || rub.nome, rub.valorTotal);
      });
    });

    var resultado = Object.keys(mapa)
      .sort()
      .map(function (codigo) {
        var item = mapa[codigo];
        return {
          codigo:      item.codigo,
          descricao:   item.descricao,
          qtdMeses:    qtdMeses,
          custoMensal: qtdMeses > 0 ? +(item.custoTotal / qtdMeses).toFixed(2) : 0,
          custoTotal:  +item.custoTotal.toFixed(2)
        };
      });

    var totalGeral = resultado.reduce(function (s, r) { return s + r.custoTotal; }, 0);

    return {
      contratoId:   idContrato,
      nome:         c.nome || '',
      qtdMeses:     qtdMeses,
      vigencia:     (c.vigenciaInicio || '') + ' a ' + (c.vigenciaFim || ''),
      itens:        resultado,
      totalGeral:   +totalGeral.toFixed(2),
      custoMensal:  qtdMeses > 0 ? +(totalGeral / qtdMeses).toFixed(2) : 0,
      geradoEm:     new Date().toISOString()
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // VERSIONAMENTO
  // ──────────────────────────────────────────────────────────────────

  function salvarVersaoContrato(idContrato, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var contrato = ContratoRepository.buscarPorId(orgId, idContrato);
    if (!contrato) return;

    var versaoNum = 1;
    try {
      var versoes = readJSON('contratos_versoes.json');
      if (!Array.isArray(versoes)) versoes = [];
      var existentes = versoes.filter(function (v) { return v.contratoId === idContrato && v.orgId === orgId; });
      versaoNum = existentes.length + 1;
    } catch(_) {}

    var snapshot = {
      id:         gerarId('csv'),
      contratoId: idContrato,
      orgId:      orgId,
      versao:     versaoNum,
      snapshot:   JSON.parse(JSON.stringify(contrato)),
      criadoEm:  agora(),
      criadoPor: emailOperador || ''
    };

    modifyJSON('contratos_versoes.json', function (lista) {
      if (!Array.isArray(lista)) lista = [];
      lista.push(snapshot);
      return lista;
    });

    return snapshot;
  }

  function listarVersoes(idContrato, orgId) {
    orgId = orgId || _orgId();
    try {
      var lista = readJSON('contratos_versoes.json');
      if (!Array.isArray(lista)) return [];
      return lista
        .filter(function (v) { return v.contratoId === idContrato && v.orgId === orgId; })
        .sort(function (a, b) { return b.versao - a.versao; })
        .map(function (v) { return { id: v.id, versao: v.versao, criadoEm: v.criadoEm, criadoPor: v.criadoPor }; });
    } catch(_) { return []; }
  }

  function obterVersao(idContrato, versaoNum, orgId) {
    orgId = orgId || _orgId();
    try {
      var lista = readJSON('contratos_versoes.json');
      if (!Array.isArray(lista)) return null;
      return lista.find(function (v) {
        return v.contratoId === idContrato && v.orgId === orgId && v.versao === versaoNum;
      }) || null;
    } catch(_) { return null; }
  }

  function restaurarVersao(idContrato, versaoNum, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var entrada = obterVersao(idContrato, versaoNum, orgId);
    if (!entrada || !entrada.snapshot) throw new Error('Versão não encontrada: v' + versaoNum);
    var snap = entrada.snapshot;

    // Salva estado atual como nova versão antes de sobrescrever
    salvarVersaoContrato(idContrato, emailOperador, orgId);

    // Restaura o snapshot preservando id e orgId
    modifyJSON('contratos.json', function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = -1;
      lista.forEach(function(c, i) { if (c.id === idContrato && c.orgId === orgId) idx = i; });
      if (idx === -1) throw new Error('Contrato não encontrado: ' + idContrato);
      var restaurado = JSON.parse(JSON.stringify(snap));
      restaurado.id    = idContrato;
      restaurado.orgId = orgId;
      restaurado.atualizadoEm = agora();
      lista[idx] = restaurado;
      return lista;
    });

    AuditoriaService.registrar('CONTRATO_VERSAO_RESTAURADA', 'financeiro', {
      contratoId: idContrato, versaoRestaurada: versaoNum, operador: emailOperador
    });
    return { contratoId: idContrato, versaoRestaurada: versaoNum };
  }

  // ──────────────────────────────────────────────────────────────────
  // ANÁLISE
  // ──────────────────────────────────────────────────────────────────

  function analisarContrato(id, orgId) {
    orgId = orgId || _orgId();
    var c = ContratoRepository.buscarPorId(orgId, id);
    if (!c) throw new Error('Contrato não encontrado: ' + id);

    var metas = c.metas || [];
    var totalRubricas  = 0;
    var totalMetas     = metas.length;
    var totalAtividades = 0;
    var valorMetas     = 0;

    metas.forEach(function (m) {
      (m.atividades || []).forEach(function (a) {
        totalAtividades++;
        totalRubricas += (a.rubricas || []).length;
      });
      totalRubricas += (m.rubricas || []).length; // backward compat
      valorMetas += Number(m.subtotal || m.valorMeta || 0);
    });

    var hoje = new Date().toISOString().slice(0, 10);
    var vencido = c.vigenciaFim && c.vigenciaFim < hoje && c.status === STATUS_CONTRATO.ATIVO;

    return {
      id:             c.id,
      nome:           c.nome,
      status:         c.status,
      valorContrato:  c.valorTotal || 0,
      valorMetas:     valorMetas,
      divergencia:    Math.abs((c.valorTotal || 0) - valorMetas) > 0.01,
      totalMetas:     totalMetas,
      totalAtividades: totalAtividades,
      totalRubricas:  totalRubricas,
      vencido:        vencido,
      vigenciaFim:    c.vigenciaFim || '',
      fonteRecurso:   c.fonteRecurso || '',
      geradoEm:       new Date().toISOString()
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // MIGRAÇÃO
  // ──────────────────────────────────────────────────────────────────

  function migrarSheetParaJson(orgId) {
    return ContratoRepository.migrarSheetParaJson(orgId || _orgId());
  }

  function reordenarAtividades(idContrato, idMeta, ordemIds, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!idContrato || !idMeta || !Array.isArray(ordemIds))
      throw new Error('idContrato, idMeta e ordemIds são obrigatórios.');
    ContratoRepository.modificarContrato(orgId, idContrato, function(contrato) {
      var meta = (contrato.metas || []).find(function(m) { return m.id === idMeta; });
      if (!meta) return contrato;
      var atvMap = {};
      (meta.atividades || []).forEach(function(a) { atvMap[a.id] = a; });
      meta.atividades = ordemIds.map(function(id) { return atvMap[id]; }).filter(Boolean);
      (Object.keys(atvMap)).forEach(function(id) {
        if (ordemIds.indexOf(id) === -1) meta.atividades.push(atvMap[id]);
      });
      return contrato;
    });
    AuditoriaService.registrar('REORDENAR_ATIVIDADES', 'financeiro',
      { contrato: idContrato, meta: idMeta, ordem: ordemIds },
      emailOperador || getEmailSessao(), orgId);
  }

  function reordenarMetas(idContrato, ordemIds, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!idContrato || !Array.isArray(ordemIds)) throw new Error('idContrato e ordemIds são obrigatórios.');
    ContratoRepository.modificarContrato(orgId, idContrato, function(contrato) {
      var metasMap = {};
      (contrato.metas || []).forEach(function(m) { metasMap[m.id] = m; });
      contrato.metas = ordemIds.map(function(id) { return metasMap[id]; }).filter(Boolean);
      // preservar metas que não estejam na ordemIds (caso de inconsistência)
      (contrato.metas_original || contrato.metas || []).forEach(function(m) {
        if (!metasMap[m.id]) return;
        if (ordemIds.indexOf(m.id) === -1) contrato.metas.push(m);
      });
      return contrato;
    });
    AuditoriaService.registrar('REORDENAR_METAS', 'financeiro', { contrato: idContrato, ordem: ordemIds }, emailOperador || getEmailSessao(), orgId);
  }

  // ──────────────────────────────────────────────────────────────────
  // API PÚBLICA
  // ──────────────────────────────────────────────────────────────────

  return {
    // Constantes
    STATUS_CONTRATO:    STATUS_CONTRATO,
    TIPO_META:          TIPO_META,
    TIPO_INDICADOR:     TIPO_INDICADOR,
    CATEGORIA_RUBRICA:  CATEGORIA_RUBRICA,

    // Contratos
    listar:           listar,
    buscarPorId:      buscarPorId,
    salvar:           salvar,
    excluir:          excluir,
    aplicarTransicao: aplicarTransicao,
    obterMetricas:    obterMetricas,
    analisarContrato: analisarContrato,

    // Metas
    salvarMeta:       salvarMeta,
    excluirMeta:      excluirMeta,

    // Atividades
    salvarAtividade:  salvarAtividade,
    excluirAtividade: excluirAtividade,

    // Pessoal
    salvarPessoal:          salvarPessoal,
    excluirPessoal:         excluirPessoal,
    calcularCustoPessoal:   calcularCustoPessoal,
    autoVincularPessoal:    autoVincularPessoal,
    painelOrcamentoPessoal: painelOrcamentoPessoal,

    // Rubricas / Itens de Despesa
    salvarRubrica:               salvarRubrica,
    excluirRubrica:              excluirRubrica,
    adicionarItemMemoriaRubrica: adicionarItemMemoriaRubrica,
    removerItemMemoriaRubrica:   removerItemMemoriaRubrica,
    calcularTotalRubrica:        calcularTotalRubrica,

    // Indicadores RESULTADOS
    salvarIndicador:    salvarIndicador,
    atualizarMetaMes:   atualizarMetaMes,

    // Indicadores GESTÃO
    salvarIndicadorGestao:  salvarIndicadorGestao,
    excluirIndicadorGestao: excluirIndicadorGestao,
    atualizarMetaGestao:    atualizarMetaGestao,

    // Plano de Contas
    gerarPlanoContas:  gerarPlanoContas,

    // Helpers expostos para testes
    calcularCustoPessoal: calcularCustoPessoal,
    _gerarMesesContrato:  _gerarMesesContrato,
    _gerarTrimestres:     _gerarTrimestres,
    _gerarPeriodosGestao: _gerarPeriodosGestao,

    // Versionamento
    salvarVersaoContrato: salvarVersaoContrato,
    listarVersoes:        listarVersoes,
    obterVersao:          obterVersao,
    restaurarVersao:      restaurarVersao,

    // Reordenação (drag and drop)
    reordenarMetas:       reordenarMetas,
    reordenarAtividades:  reordenarAtividades,

    // Migração
    migrarSheetParaJson: migrarSheetParaJson
  };

})();
