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
        realizado:   null
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
    return ContratoRepository.buscarPorId(orgId || _orgId(), id);
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
      FsmGuardian.validarTransicao('contratos', atual, novoStatus);
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
   * Calcula todos os campos derivados de um item de pessoal.
   * Fórmulas conforme Folha de Pagamento CCBJ:
   *   III = salarioAtual + reajuste (valor, não %)
   *   IV  = INSS Patronal(20%) + Sistema S(6,6%) + FGTS(8%) + PIS(1%)
   *   V   = (VT - descVT) + (Alim - descAlim) + (PS - descPS)
   *         descontoVT = III × 6%;  descontoPS = planoSaude × 30%
   *   VI  = Férias + 13° + FGTS Rescisão
   *         Férias        = (III + IV) / 3 / 12
   *         13°           = (III + IV) / 12
   *         FGTS Rescisão = fgts × 40%
   *   VII  = III + IV + V + VI  (custo mensal)
   *   VIII = VII × qtdMeses    (custo total)
   */
  function calcularCustoPessoal(item) {
    item = item || {};
    var qtd          = Number(item.qtd          || 1);
    var qtdMeses     = Number(item.qtdMeses      || 24);
    var salarioAtual = Number(item.salarioAtual  || 0);
    var reajuste     = Number(item.reajuste      || 0);

    // III — Total Salário
    var totalSalario = (salarioAtual + reajuste) * qtd;

    // IV — Encargos
    var inssPatronal = totalSalario * 0.20;
    var sistemaS     = totalSalario * 0.066;
    var fgts         = totalSalario * 0.08;
    var pis          = totalSalario * 0.01;
    var totalEncargos = inssPatronal + sistemaS + fgts + pis;

    // V — Benefícios
    var valeTransporte       = Number(item.valeTransporte       || 0);
    // Desconto VT é limitado ao valor do VT (lei: até 6% do salário bruto, nunca superior ao VT)
    var descontoVT           = Math.min(totalSalario * 0.06, valeTransporte);
    var alimentacao          = Number(item.alimentacao          || 0);
    var descontoAlimentacao  = Number(item.descontoAlimentacao  || 0);
    var planoSaude           = Number(item.planoSaude           || 0) * qtd;

    var vtLiq  = valeTransporte - descontoVT;
    // Plano de saúde é custo integral do empregador; somente o desconto declarado de VA é deduzido
    var totalBeneficios = vtLiq + (alimentacao - descontoAlimentacao) + planoSaude;

    // VI — Provisões
    var base13Ferias  = totalSalario + totalEncargos;
    var ferias        = base13Ferias / 3 / 12;
    var decimoTerceiro = base13Ferias / 12;
    var fgtsRescisao  = fgts * 0.40;
    var totalProvisoes = ferias + decimoTerceiro + fgtsRescisao;

    // VII e VIII
    var custoMensal = totalSalario + totalEncargos + totalBeneficios + totalProvisoes;
    var custoTotal  = custoMensal * qtdMeses;

    var seplagPes = _getCodigoSeplagPessoal();
    return Object.assign({}, item, {
      totalSalario:      +totalSalario.toFixed(2),
      inssPatronal:      +inssPatronal.toFixed(2),
      sistemaS:          +sistemaS.toFixed(2),
      fgts:              +fgts.toFixed(2),
      pis:               +pis.toFixed(2),
      totalEncargos:     +totalEncargos.toFixed(2),
      valeTransporte:    +valeTransporte.toFixed(2),
      descontoVT:        +descontoVT.toFixed(2),
      alimentacao:       +alimentacao.toFixed(2),
      descontoAlimentacao: +descontoAlimentacao.toFixed(2),
      planoSaude:        +planoSaude.toFixed(2),
      totalBeneficios:   +totalBeneficios.toFixed(2),
      ferias:            +ferias.toFixed(2),
      decimoTerceiro:    +decimoTerceiro.toFixed(2),
      fgtsRescisao:      +fgtsRescisao.toFixed(2),
      totalProvisoes:    +totalProvisoes.toFixed(2),
      custoMensal:       +custoMensal.toFixed(2),
      custoTotal:        +custoTotal.toFixed(2),
      // código SEPLAG do pessoal — lido do catálogo (editável via Admin)
      codigoSeplag:      seplagPes.codigo,
      descSeplag:        seplagPes.descricao
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
    salvarPessoal:       salvarPessoal,
    excluirPessoal:      excluirPessoal,
    calcularCustoPessoal: calcularCustoPessoal,

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

    // Reordenação de Metas (drag and drop)
    reordenarMetas: reordenarMetas,

    // Migração
    migrarSheetParaJson: migrarSheetParaJson
  };

})();
