/**
 * @file modules/pessoas/encargos_repository.gs
 * @layer modules/pessoas
 * @description CRUD dos Encargos Trabalhistas com suporte a atualizações
 *              automáticas (fontes oficiais) e sobreposições manuais auditadas.
 *
 * Fonte canônica: encargos_trabalhistas.json (Drive — JSON único por org).
 *
 * Estrutura do documento:
 *   {
 *     orgId, anoAtivo, atualizadoEm, atualizadoPor,
 *     aliquotas: { inssPatronal, fgts, pisPasep, sat, sistemaS },
 *     salarioMinimo: { valor, fonte, anoRef, ... },
 *     tabelaINSS: [{ de, ate, aliquota, fonte, anoRef, ... }],
 *     tabelaIRRF: [{ de, ate, aliquota, deducao, fonte, anoRef, ... }],
 *     descontoSimplificadoIRRF: { valor, fonte, anoRef, ... },
 *     historico: [{ tipo, ano, data, usuario, itens }]
 *   }
 *
 * Fontes possíveis por item: "oficial" | "manual"
 * Itens manuais sobrepõem os oficiais para o mesmo campo.
 *
 * @depends core/data_layer.gs, core/services/auditoria_service.gs
 */

var EncargosRepository = (function () {

  var ARQUIVO = 'encargos_trabalhistas.json';

  // ── Helpers internos ──────────────────────────────────────────────────────────

  function _ler(orgId) {
    try {
      var raw = readJSON(ARQUIVO);
      if (raw && raw.orgId === orgId) return raw;
    } catch (_) {}
    return null;
  }

  function _salvar(doc) {
    writeJSON(ARQUIVO, doc);
    return doc;
  }

  function _ts() { return new Date().toISOString(); }

  function _itemAliquota(chave, label, valor, unidade, descricao, anoRef) {
    return {
      chave:        chave,
      label:        label,
      valor:        valor,
      unidade:      unidade || 'percentual',   // percentual | reais
      descricao:    descricao || '',
      fonte:        'oficial',
      anoRef:       anoRef,
      editadoPor:   null,
      editadoEm:    null,
      justificativa: null
    };
  }

  // ── Inicialização ─────────────────────────────────────────────────────────────

  /**
   * Garante que o JSON existe. Usa tabela padrão 2025.
   * Idempotente — seguro chamar múltiplas vezes.
   */
  function inicializar(orgId) {
    var doc = _ler(orgId);
    if (doc) return doc;                        // já existe

    var ano    = new Date().getFullYear();
    var padrao = _buildDocOficial(orgId, ano, 'sistema');
    _salvar(padrao);
    AuditoriaService.registrar('ENCARGOS_INICIALIZADO', 'encargos',
      { orgId: orgId, ano: ano });
    Logger.info('encargos_repository', 'inicializar',
      'encargos_trabalhistas.json criado para ' + orgId);
    return padrao;
  }

  // ── Leitura ───────────────────────────────────────────────────────────────────

  /**
   * Retorna o documento completo de encargos.
   */
  function obter(orgId) {
    return _ler(orgId) || inicializar(orgId);
  }

  /**
   * Retorna apenas as alíquotas efetivas (manual tem prioridade sobre oficial).
   * Útil para ponto_engine e qualquer cálculo de folha.
   */
  function obterAliquotasEfetivas(orgId) {
    var doc = obter(orgId);
    var al  = doc.aliquotas || {};
    return {
      inssPatronal:  (al.inssPatronal  || {}).valor || 0.20,
      fgts:          (al.fgts          || {}).valor || 0.08,
      pisPasep:      (al.pisPasep      || {}).valor || 0.01,
      sat:           (al.sat           || {}).valor || 0.01,
      sistemaS:      (al.sistemaS      || {}).valor || 0.056,
      salarioMinimo: (doc.salarioMinimo || {}).valor || 1518.00,
      tabelaINSS:    doc.tabelaINSS    || [],
      tabelaIRRF:    doc.tabelaIRRF    || [],
      descontoSimplificadoIRRF: (doc.descontoSimplificadoIRRF || {}).valor || 528.00,
      anoAtivo:      doc.anoAtivo      || 2025
    };
  }

  // ── Escrita — Override manual ─────────────────────────────────────────────────

  /**
   * Edita manualmente uma alíquota simples (inssPatronal, fgts, pisPasep, sat, sistemaS).
   * @param {string} orgId
   * @param {string} chave — nome do campo em `aliquotas`
   * @param {number} valor — novo valor (ex: 0.08 para 8%)
   * @param {string} justificativa
   * @param {string} email
   */
  function editarAliquota(orgId, chave, valor, justificativa, email) {
    var doc = obter(orgId);
    if (!doc.aliquotas[chave]) throw new Error('Alíquota não encontrada: ' + chave);

    var anterior = doc.aliquotas[chave].valor;
    doc.aliquotas[chave].valor        = Number(valor);
    doc.aliquotas[chave].fonte        = 'manual';
    doc.aliquotas[chave].editadoPor   = email;
    doc.aliquotas[chave].editadoEm    = _ts();
    doc.aliquotas[chave].justificativa = justificativa || '';

    _adicionarHistorico(doc, 'edicao_manual', null, email,
      [{ campo: chave, anterior: anterior, novo: Number(valor), justificativa: justificativa }]);
    doc.atualizadoEm  = _ts();
    doc.atualizadoPor = email;

    _salvar(doc);
    AuditoriaService.registrar('ENCARGO_EDITADO_MANUAL', 'encargos',
      { orgId: orgId, chave: chave, anterior: anterior, novo: valor, email: email });
    return doc;
  }

  /**
   * Edita manualmente o salário mínimo.
   */
  function editarSalarioMinimo(orgId, valor, justificativa, email) {
    var doc = obter(orgId);
    var anterior = (doc.salarioMinimo || {}).valor;
    if (!doc.salarioMinimo) doc.salarioMinimo = {};
    doc.salarioMinimo.valor        = Number(valor);
    doc.salarioMinimo.fonte        = 'manual';
    doc.salarioMinimo.editadoPor   = email;
    doc.salarioMinimo.editadoEm    = _ts();
    doc.salarioMinimo.justificativa = justificativa || '';

    _adicionarHistorico(doc, 'edicao_manual', null, email,
      [{ campo: 'salarioMinimo', anterior: anterior, novo: Number(valor), justificativa: justificativa }]);
    doc.atualizadoEm  = _ts();
    doc.atualizadoPor = email;

    _salvar(doc);
    AuditoriaService.registrar('ENCARGO_SAL_MIN_EDITADO', 'encargos',
      { orgId: orgId, anterior: anterior, novo: valor, email: email });
    return doc;
  }

  /**
   * Substitui toda a tabela INSS por uma nova (manual ou oficial).
   * Cada faixa: { de, ate, aliquota, fonte, anoRef }
   */
  function editarTabelaINSS(orgId, novaTabela, justificativa, email) {
    var doc = obter(orgId);
    var anterior = doc.tabelaINSS;

    doc.tabelaINSS = novaTabela.map(function(f) {
      return {
        de:           Number(f.de || 0),
        ate:          Number(f.ate),
        aliquota:     Number(f.aliquota),
        fonte:        f.fonte || 'manual',
        anoRef:       f.anoRef || doc.anoAtivo,
        editadoPor:   email,
        editadoEm:    _ts(),
        justificativa: justificativa || ''
      };
    });

    _adicionarHistorico(doc, 'edicao_tabela_inss', null, email,
      [{ campo: 'tabelaINSS', anterior: anterior, novo: novaTabela, justificativa: justificativa }]);
    doc.atualizadoEm  = _ts();
    doc.atualizadoPor = email;

    _salvar(doc);
    AuditoriaService.registrar('ENCARGO_TABELA_INSS_EDITADA', 'encargos',
      { orgId: orgId, faixas: novaTabela.length, email: email });
    return doc;
  }

  /**
   * Substitui toda a tabela IRRF por uma nova.
   * Cada faixa: { de, ate, aliquota, deducao, fonte, anoRef }
   */
  function editarTabelaIRRF(orgId, novaTabela, justificativa, email) {
    var doc = obter(orgId);
    var anterior = doc.tabelaIRRF;

    doc.tabelaIRRF = novaTabela.map(function(f) {
      return {
        de:           Number(f.de || 0),
        ate:          f.ate !== null && f.ate !== undefined ? Number(f.ate) : null,
        aliquota:     Number(f.aliquota),
        deducao:      Number(f.deducao || 0),
        fonte:        f.fonte || 'manual',
        anoRef:       f.anoRef || doc.anoAtivo,
        editadoPor:   email,
        editadoEm:    _ts(),
        justificativa: justificativa || ''
      };
    });

    _adicionarHistorico(doc, 'edicao_tabela_irrf', null, email,
      [{ campo: 'tabelaIRRF', anterior: anterior, novo: novaTabela, justificativa: justificativa }]);
    doc.atualizadoEm  = _ts();
    doc.atualizadoPor = email;

    _salvar(doc);
    AuditoriaService.registrar('ENCARGO_TABELA_IRRF_EDITADA', 'encargos',
      { orgId: orgId, faixas: novaTabela.length, email: email });
    return doc;
  }

  // ── Escrita — Atualização oficial ─────────────────────────────────────────────

  /**
   * Aplica tabela oficial para um ano.
   * Campos com fonte "manual" NÃO são sobrescritos — preserva overrides do usuário.
   * @param {string} orgId
   * @param {object} tabelaOficial — retorno de EncargosEngine.obterTabelaOficial(ano)
   * @param {string} email
   * @returns {object} doc atualizado
   */
  function aplicarTabelaOficial(orgId, tabelaOficial, email) {
    var doc = obter(orgId);
    var ano = tabelaOficial.anoRef;
    var itensAtualizados = [];

    // — Alíquotas simples —
    var alOficial = tabelaOficial.aliquotas || {};
    Object.keys(alOficial).forEach(function(chave) {
      var itemAtual = doc.aliquotas[chave];
      if (itemAtual && itemAtual.fonte === 'manual') {
        // Preserva override manual — apenas atualiza anoRef de referência interna
        return;
      }
      var anterior = itemAtual ? itemAtual.valor : null;
      doc.aliquotas[chave] = Object.assign({}, alOficial[chave], {
        fonte:        'oficial',
        anoRef:       ano,
        editadoPor:   null,
        editadoEm:    null,
        justificativa: null
      });
      itensAtualizados.push({ campo: chave, anterior: anterior, novo: alOficial[chave].valor });
    });

    // — Salário mínimo —
    if (doc.salarioMinimo && doc.salarioMinimo.fonte !== 'manual') {
      var antSM = doc.salarioMinimo.valor;
      doc.salarioMinimo = Object.assign({}, tabelaOficial.salarioMinimo, {
        fonte: 'oficial', anoRef: ano, editadoPor: null, editadoEm: null
      });
      itensAtualizados.push({ campo: 'salarioMinimo', anterior: antSM, novo: tabelaOficial.salarioMinimo.valor });
    }

    // — Tabela INSS (só atualiza se nenhuma faixa for manual) —
    var tabelaINSSAtual = doc.tabelaINSS || [];
    var temManualINSS = tabelaINSSAtual.some(function(f) { return f.fonte === 'manual'; });
    if (!temManualINSS && tabelaOficial.tabelaINSS) {
      doc.tabelaINSS = tabelaOficial.tabelaINSS.map(function(f) {
        return Object.assign({}, f, { fonte: 'oficial', anoRef: ano });
      });
      itensAtualizados.push({ campo: 'tabelaINSS', anterior: tabelaINSSAtual.length + ' faixas', novo: tabelaOficial.tabelaINSS.length + ' faixas' });
    }

    // — Tabela IRRF (só atualiza se nenhuma faixa for manual) —
    var tabelaIRRFAtual = doc.tabelaIRRF || [];
    var temManualIRRF = tabelaIRRFAtual.some(function(f) { return f.fonte === 'manual'; });
    if (!temManualIRRF && tabelaOficial.tabelaIRRF) {
      doc.tabelaIRRF = tabelaOficial.tabelaIRRF.map(function(f) {
        return Object.assign({}, f, { fonte: 'oficial', anoRef: ano });
      });
      itensAtualizados.push({ campo: 'tabelaIRRF', anterior: tabelaIRRFAtual.length + ' faixas', novo: tabelaOficial.tabelaIRRF.length + ' faixas' });
    }

    // — Desconto simplificado IRRF —
    if ((!doc.descontoSimplificadoIRRF || doc.descontoSimplificadoIRRF.fonte !== 'manual') && tabelaOficial.descontoSimplificadoIRRF) {
      doc.descontoSimplificadoIRRF = Object.assign({}, tabelaOficial.descontoSimplificadoIRRF, { fonte: 'oficial', anoRef: ano });
    }

    doc.anoAtivo      = ano;
    doc.atualizadoEm  = _ts();
    doc.atualizadoPor = email || 'sistema';

    _adicionarHistorico(doc, 'atualizacao_oficial', ano, email || 'sistema', itensAtualizados);
    _salvar(doc);

    AuditoriaService.registrar('ENCARGOS_ATUALIZADO_OFICIAL', 'encargos',
      { orgId: orgId, ano: ano, itensAtualizados: itensAtualizados.length, email: email });
    Logger.info('encargos_repository', 'aplicarTabelaOficial',
      'Ano ' + ano + ': ' + itensAtualizados.length + ' itens atualizados.');
    return doc;
  }

  /**
   * Restaura um campo específico para o valor oficial do ano ativo.
   * Útil para desfazer um override manual.
   */
  function restaurarOficial(orgId, chave, anoRef, email) {
    var doc = obter(orgId);
    var ano = anoRef || doc.anoAtivo || new Date().getFullYear();

    if (doc.aliquotas && doc.aliquotas[chave]) {
      var it = doc.aliquotas[chave];
      if (it.fonte === 'manual') {
        it.fonte = 'oficial';
        it.editadoPor = null;
        it.editadoEm = null;
        it.justificativa = null;
        _adicionarHistorico(doc, 'restauracao_oficial', ano, email, [{ campo: chave }]);
        doc.atualizadoEm = _ts();
        doc.atualizadoPor = email;
        _salvar(doc);
        AuditoriaService.registrar('ENCARGO_RESTAURADO_OFICIAL', 'encargos', { orgId: orgId, chave: chave, email: email });
      }
    }
    return doc;
  }

  // ── Histórico ─────────────────────────────────────────────────────────────────

  function _adicionarHistorico(doc, tipo, ano, usuario, itens) {
    if (!Array.isArray(doc.historico)) doc.historico = [];
    doc.historico.unshift({
      tipo:    tipo,
      ano:     ano,
      data:    _ts(),
      usuario: usuario,
      itens:   itens || []
    });
    // Manter últimos 100 registros
    if (doc.historico.length > 100) doc.historico = doc.historico.slice(0, 100);
  }

  function listarHistorico(orgId, limite) {
    var doc = obter(orgId);
    var hist = doc.historico || [];
    return hist.slice(0, Math.min(limite || 50, hist.length));
  }

  // ── Builder de documento oficial ──────────────────────────────────────────────

  /**
   * Constrói um documento de encargos zerado com os valores oficiais do ano.
   * Chamado apenas na inicialização.
   */
  function _buildDocOficial(orgId, ano, usuario) {
    var aliquotas = {
      inssPatronal: _itemAliquota('inssPatronal', 'INSS Patronal',      0.20,   'percentual', 'Contribuição previdenciária patronal — regra geral CLT', ano),
      fgts:         _itemAliquota('fgts',         'FGTS',               0.08,   'percentual', 'Fundo de Garantia do Tempo de Serviço', ano),
      pisPasep:     _itemAliquota('pisPasep',      'PIS/PASEP Patronal', 0.01,   'percentual', 'Programa de Integração Social — folha de pagamento', ano),
      sat:          _itemAliquota('sat',           'SAT/RAT',            0.01,   'percentual', 'Seguro de Acidente de Trabalho (risco leve — CNAE cultural)', ano),
      sistemaS:     _itemAliquota('sistemaS',      'Sistema S',          0.0566, 'percentual', 'SESC 1,5% + SENAC 1% + SEBRAE 0,6% + INCRA 0,2% + SENAT 0,2% + SEST 0,2% = 3,7% (3.º setor/serviços — verifique CNAE)', ano)
    };

    // Tabelas default 2026 (Portaria MPS/MF 13/2026 + Lei 15.270/2025)
    // O salário mínimo é sobrescrito pelo trigger automático via BcbService na primeira execução.
    var smValor     = 1621.00;
    var smDescricao = 'Decreto presidencial — vigência 01/01/2026 (atualizado mensalmente via BCB/SGS Série 1619)';
    var tabelaINSS  = [
      { de: 0,       ate: 1621.00, aliquota: 0.075, fonte: 'oficial', anoRef: ano, descricao: 'Faixa 1' },
      { de: 1621.01, ate: 2902.84, aliquota: 0.09,  fonte: 'oficial', anoRef: ano, descricao: 'Faixa 2' },
      { de: 2902.85, ate: 4354.27, aliquota: 0.12,  fonte: 'oficial', anoRef: ano, descricao: 'Faixa 3' },
      { de: 4354.28, ate: 8475.55, aliquota: 0.14,  fonte: 'oficial', anoRef: ano, descricao: 'Faixa 4 (teto)' }
    ];
    var tabelaIRRF  = [
      // Tabela base inalterada pela Lei 15.270/2025; isenção até R$ 5.000 via desconto diferenciado.
      { de: 0,       ate: 2259.20, aliquota: 0,     deducao: 0,      fonte: 'oficial', anoRef: ano, descricao: 'Isento' },
      { de: 2259.21, ate: 2826.65, aliquota: 0.075, deducao: 169.44, fonte: 'oficial', anoRef: ano, descricao: '7,5%' },
      { de: 2826.66, ate: 3751.05, aliquota: 0.15,  deducao: 381.44, fonte: 'oficial', anoRef: ano, descricao: '15%' },
      { de: 3751.06, ate: 4664.68, aliquota: 0.225, deducao: 662.77, fonte: 'oficial', anoRef: ano, descricao: '22,5%' },
      { de: 4664.69, ate: null,    aliquota: 0.275, deducao: 896.00, fonte: 'oficial', anoRef: ano, descricao: '27,5%' }
    ];
    var dsIRRF = 607.20;
    var dsDesc = 'Dedução mensal simplificada — Lei 15.270/2025 (R$ 607,20/mês)';

    return {
      orgId:        orgId,
      anoAtivo:     ano,
      atualizadoEm: _ts(),
      atualizadoPor: usuario,
      aliquotas:    aliquotas,
      salarioMinimo: {
        chave:        'salarioMinimo',
        label:        'Salário Mínimo Nacional',
        valor:        smValor,
        unidade:      'reais',
        descricao:    smDescricao,
        fonte:        'oficial',
        anoRef:       ano,
        editadoPor:   null,
        editadoEm:    null,
        justificativa: null
      },
      tabelaINSS: tabelaINSS,
      tabelaIRRF: tabelaIRRF,
      descontoSimplificadoIRRF: {
        chave:       'descontoSimplificadoIRRF',
        label:       'Desconto Simplificado IRRF',
        valor:       dsIRRF,
        unidade:     'reais',
        descricao:   dsDesc,
        fonte:       'oficial',
        anoRef:      ano,
        editadoPor:  null,
        editadoEm:   null
      },
      historico: [{
        tipo:    'inicializacao',
        ano:     ano,
        data:    _ts(),
        usuario: usuario,
        itens:   [{ campo: 'todos', anterior: null, novo: 'tabela oficial ' + ano }]
      }]
    };
  }

  // ── API pública ───────────────────────────────────────────────────────────────

  return {
    inicializar:            inicializar,
    obter:                  obter,
    obterAliquotasEfetivas: obterAliquotasEfetivas,
    editarAliquota:         editarAliquota,
    editarSalarioMinimo:    editarSalarioMinimo,
    editarTabelaINSS:       editarTabelaINSS,
    editarTabelaIRRF:       editarTabelaIRRF,
    aplicarTabelaOficial:   aplicarTabelaOficial,
    restaurarOficial:       restaurarOficial,
    listarHistorico:        listarHistorico
  };

})();
