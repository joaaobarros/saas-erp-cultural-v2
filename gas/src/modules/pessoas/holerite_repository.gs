/**
 * @file modules/pessoas/holerite_repository.gs
 * @layer modules/pessoas
 * @description CRUD de Holerites (contracheques) — snapshots imutáveis por colaborador/mês.
 *
 * Fonte canônica: holerites.json (Drive — array de holerites).
 * Índice: EQUIPES.Holerites (planilha para auditoria e relatórios).
 *
 * Estrutura de cada holerite:
 *   {
 *     id, orgId, colaboradorId, mesRef (AAAA-MM), status (gerado|pago|cancelado),
 *     competencia (ex: "Maio/2026"), nome, cargo, setor, vinculo, cpf, pis,
 *     dataAdmissao, salarioBruto,
 *     proventos:  [{ codigo, descricao, referencia, valor }],
 *     descontos:  [{ codigo, descricao, referencia, valor }],
 *     totalProventos, totalDescontos, salarioLiquido,
 *     encargosPatronais: { inssPatronal, fgts, rat, sistemaS, pis, total },
 *     provisoes:         { ferias, decTerceiro, fgtsResc, total },
 *     fgtsCompetencia,
 *     custoTotalEmpresa,
 *     observacoes, geradoEm, geradoPor, pago, pagoPor, pagoEm, canceladoEm, motivoCancelamento
 *   }
 *
 * @depends core/data_layer.gs, core/config.gs, core/services/auditoria_service.gs
 */

var HoleriteRepository = (function () {

  var ARQUIVO  = 'holerites.json';
  var PLANILHA = 'EQUIPES';
  var ABA      = 'Holerites';

  var CABECALHO_SHEET = [
    'ID', 'OrgId', 'ColaboradorId', 'Nome', 'Cargo', 'Setor', 'Vínculo',
    'Competência', 'MesRef', 'Admissão', 'SalárioBase',
    'TotalProventos', 'TotalDescontos', 'SalárioLíquido',
    'EncargosPatronais', 'Provisões', 'CustoTotal',
    'Status', 'GeradoEm', 'GeradoPor'
  ];

  // ── Helpers privados ─────────────────────────────────────────────────────────

  function _lerTodos() {
    try {
      var raw = readJSON(ARQUIVO);
      return Array.isArray(raw) ? raw : [];
    } catch (_) { return []; }
  }

  function _salvar(lista) {
    writeJSON(ARQUIVO, lista);
  }

  function _ts() { return new Date().toISOString(); }

  function _proximoId(orgId, mesRef) {
    // HOL-AAAA-MM-NNN
    var todos = _lerTodos();
    var seq = todos.filter(function(h) {
      return h.orgId === orgId && h.mesRef === mesRef;
    }).length + 1;
    return 'HOL-' + mesRef + '-' + String(seq).padStart(3, '0');
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  /**
   * Salva um holerite novo (gerado pelo HoleriteEngine).
   * Idempotente: se já existe holerite para o mesmo colaborador/mês com status 'gerado', substitui.
   */
  function salvar(orgId, holerite) {
    var lista = _lerTodos();

    // Verificar duplicata (mesmo colaborador + mesmo mês, não cancelado)
    var idx = lista.findIndex(function(h) {
      return h.orgId === orgId
          && h.colaboradorId === holerite.colaboradorId
          && h.mesRef === holerite.mesRef
          && h.status !== 'cancelado';
    });

    if (idx >= 0) {
      // Substituir o existente (re-geração)
      var antigo = lista[idx];
      holerite.id = antigo.id;          // mantém o mesmo ID
      lista[idx] = holerite;
    } else {
      holerite.id = holerite.id || _proximoId(orgId, holerite.mesRef);
      lista.push(holerite);
    }

    _salvar(lista);
    _sincronizarSheet(orgId, holerite);
    return holerite;
  }

  /**
   * Lista holerites com filtros opcionais.
   * @param {string} orgId
   * @param {object} filtros — { mesRef?, colaboradorId?, status? }
   */
  function listar(orgId, filtros) {
    filtros = filtros || {};
    return _lerTodos().filter(function(h) {
      if (h.orgId !== orgId) return false;
      if (filtros.mesRef       && h.mesRef       !== filtros.mesRef)       return false;
      if (filtros.colaboradorId && h.colaboradorId !== filtros.colaboradorId) return false;
      if (filtros.status       && h.status       !== filtros.status)       return false;
      return true;
    }).sort(function(a, b) {
      return (b.mesRef || '').localeCompare(a.mesRef || '');
    });
  }

  /**
   * Obtém um holerite pelo ID.
   */
  function obter(orgId, id) {
    return _lerTodos().find(function(h) {
      return h.orgId === orgId && h.id === id;
    }) || null;
  }

  /**
   * Marca holerite como pago.
   */
  function marcarPago(orgId, id, email) {
    var lista = _lerTodos();
    var h = lista.find(function(h) { return h.orgId === orgId && h.id === id; });
    if (!h) throw new Error('Holerite não encontrado: ' + id);
    if (h.status === 'cancelado') throw new Error('Holerite cancelado não pode ser marcado como pago.');
    h.status  = 'pago';
    h.pago    = true;
    h.pagoPor = email;
    h.pagoEm  = _ts();
    _salvar(lista);
    _sincronizarSheet(orgId, h);
    AuditoriaService.registrar('HOLERITE_MARCADO_PAGO', 'holerite', { id: id }, email);
    return h;
  }

  /**
   * Cancela um holerite.
   */
  function cancelar(orgId, id, motivo, email) {
    var lista = _lerTodos();
    var h = lista.find(function(h) { return h.orgId === orgId && h.id === id; });
    if (!h) throw new Error('Holerite não encontrado: ' + id);
    if (h.status === 'pago') throw new Error('Holerite já pago. Para estorno, contate o RH.');
    h.status            = 'cancelado';
    h.canceladoEm       = _ts();
    h.motivoCancelamento = motivo || '';
    _salvar(lista);
    _sincronizarSheet(orgId, h);
    AuditoriaService.registrar('HOLERITE_CANCELADO', 'holerite', { id: id, motivo: motivo }, email);
    return h;
  }

  /**
   * Métricas agregadas para um período.
   */
  function metricas(orgId, mesRef) {
    var lista = listar(orgId, { mesRef: mesRef });
    var ativos = lista.filter(function(h) { return h.status !== 'cancelado'; });

    var totalBruto   = 0, totalDescontos = 0, totalLiquido = 0;
    var totalEncargosPat = 0, totalProvisoes = 0, totalCusto = 0;
    var pagos = 0;

    ativos.forEach(function(h) {
      totalBruto        += h.totalProventos     || 0;
      totalDescontos    += h.totalDescontos      || 0;
      totalLiquido      += h.salarioLiquido      || 0;
      totalEncargosPat  += (h.encargosPatronais && h.encargosPatronais.total) || 0;
      totalProvisoes    += (h.provisoes && h.provisoes.total) || 0;
      totalCusto        += h.custoTotalEmpresa  || 0;
      if (h.status === 'pago') pagos++;
    });

    return {
      mesRef:         mesRef,
      total:          lista.length,
      gerados:        ativos.filter(function(h){ return h.status === 'gerado'; }).length,
      pagos:          pagos,
      cancelados:     lista.length - ativos.length,
      totalBruto:     Math.round(totalBruto * 100) / 100,
      totalDescontos: Math.round(totalDescontos * 100) / 100,
      totalLiquido:   Math.round(totalLiquido * 100) / 100,
      totalEncargosPat: Math.round(totalEncargosPat * 100) / 100,
      totalProvisoes:   Math.round(totalProvisoes * 100) / 100,
      totalCusto:       Math.round(totalCusto * 100) / 100
    };
  }

  // ── Sheet ─────────────────────────────────────────────────────────────────────

  /**
   * Garante aba EQUIPES.Holerites e cabeçalho.
   */
  function prepararIndice() {
    try {
      var props   = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty('SHEET_ID_EQUIPES');
      if (!sheetId) return { ok: false, motivo: 'SHEET_ID_EQUIPES não definida' };

      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName(ABA);
      if (!aba) {
        aba = ss.insertSheet(ABA);
        aba.getRange(1, 1, 1, CABECALHO_SHEET.length).setValues([CABECALHO_SHEET]);
        aba.getRange(1, 1, 1, CABECALHO_SHEET.length)
          .setBackground('#4f46e5').setFontColor('#ffffff').setFontWeight('bold');
        aba.setFrozenRows(1);
      }
      return { ok: true, aba: PLANILHA + '.' + ABA };
    } catch(e) {
      Logger.warn('holerite_repository', 'prepararIndice', e.message);
      return { ok: false, motivo: e.message };
    }
  }

  function _sincronizarSheet(orgId, h) {
    try {
      var props   = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty('SHEET_ID_EQUIPES');
      if (!sheetId) return;
      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName(ABA);
      if (!aba) return;

      // Localizar linha existente pelo ID
      var dados  = aba.getDataRange().getValues();
      var linhaExistente = -1;
      for (var i = 1; i < dados.length; i++) {
        if (String(dados[i][0]) === String(h.id)) { linhaExistente = i + 1; break; }
      }

      var linha = [
        h.id, h.orgId, h.colaboradorId, h.nome || '', h.cargo || '', h.setor || '', h.vinculo || '',
        h.competencia || '', h.mesRef || '', h.dataAdmissao || '', h.salarioBruto || 0,
        h.totalProventos || 0, h.totalDescontos || 0, h.salarioLiquido || 0,
        (h.encargosPatronais && h.encargosPatronais.total) || 0,
        (h.provisoes && h.provisoes.total) || 0,
        h.custoTotalEmpresa || 0,
        h.status || 'gerado', h.geradoEm || '', h.geradoPor || ''
      ];

      if (linhaExistente > 0) {
        aba.getRange(linhaExistente, 1, 1, linha.length).setValues([linha]);
      } else {
        aba.appendRow(linha);
      }
    } catch(e) {
      Logger.warn('holerite_repository', '_sincronizarSheet', e.message);
    }
  }

  // ── API pública ───────────────────────────────────────────────────────────────

  return {
    salvar:        salvar,
    listar:        listar,
    obter:         obter,
    marcarPago:    marcarPago,
    cancelar:      cancelar,
    metricas:      metricas,
    prepararIndice: prepararIndice
  };

})();
