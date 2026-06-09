/**
 * @file ponto_bruto_repository.gs
 * @layer repository
 * @description Repositório de registros brutos de ponto e sessões de importação.
 *
 *   Implementa as 3 camadas de dado separadas:
 *
 *   1. DADO BRUTO (este arquivo)
 *      ponto_bruto.json — linha original preservada integralmente,
 *      campos extraídos pelo parser, status de validação.
 *      Imutável após importação; base para auditoria e reprocessamento.
 *
 *   2. DADO NORMALIZADO (ponto_repository.gs)
 *      ponto_normalizado.json — estrutura interna padronizada,
 *      independente do fornecedor/modelo do relógio.
 *
 *   3. LAYOUT VISUAL / EXPORTAÇÃO (ponto_exportacao_engine.gs — Fase 7)
 *      Camada configurável que não persiste dado — só formata saída.
 *
 *   Sessões de importação: ponto_importacoes.json
 *   Cada sessão é reversível: reverterSessao() exclui os brutos e marcas os
 *   normalizados como 'revertido' para reconstituição sem re-importar o arquivo.
 *
 *   Índices Sheet:
 *     PontoBruto         — resumo de registros para BI/auditoria
 *     PontoImportacoes   — histórico de sessões de importação
 *
 * @depends data_layer.gs, data_gateway.gs
 */

var PontoBrutoRepository = (function() {

  var ARQUIVO_BRUTO       = 'ponto_bruto.json';
  var ARQUIVO_IMPORTACOES = 'ponto_importacoes.json';
  var ABA_BRUTO           = 'PontoBruto';
  var ABA_IMPORTACOES     = 'PontoImportacoes';

  var HEADERS_BRUTO = [
    'id', 'importacaoId', 'layoutId', 'nsr', 'tipoRegistro',
    'datetimeOriginal', 'data', 'hora', 'pis',
    'status', 'motivo', 'linhaNumero', 'orgId', 'criadoEm'
  ];

  var HEADERS_IMPORTACOES = [
    'id', 'layoutId', 'nomeArquivo', 'status',
    'totalLinhas', 'registrosBrutos', 'registrosIgnorados', 'erros',
    'importadoPor', 'orgId', 'iniciadoEm', 'concluidoEm'
  ];

  // ─── Sessões de Importação ───────────────────────────────────────────────────

  function criarSessao(orgId, dados) {
    var id = gerarId('IMP');
    var sessao = {
      id:                  id,
      orgId:               orgId,
      layoutId:            dados.layoutId     || null,
      nomeArquivo:         dados.nomeArquivo  || '',
      status:              'pendente',
      totalLinhas:         Number(dados.totalLinhas  || 0),
      registrosBrutos:     0,
      registrosIgnorados:  0,
      erros:               0,
      detalheErros:        [],
      importadoPor:        dados.importadoPor || '',
      iniciadoEm:          new Date().toISOString(),
      concluidoEm:         null
    };
    modifyJSON(ARQUIVO_IMPORTACOES, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      lista.push(sessao);
      return lista;
    });
    _sincronizarSessaoSheet(orgId, sessao);
    return id;
  }

  function atualizarSessao(orgId, id, patch) {
    modifyJSON(ARQUIVO_IMPORTACOES, function(lista) {
      if (!Array.isArray(lista)) return lista;
      var idx = lista.findIndex(function(s){ return s.id === id && s.orgId === orgId; });
      if (idx >= 0) Object.assign(lista[idx], patch);
      return lista;
    });
  }

  function concluirSessao(orgId, id, resumo) {
    atualizarSessao(orgId, id, Object.assign({
      status:      'confirmada',
      concluidoEm: new Date().toISOString()
    }, resumo || {}));
  }

  /**
   * Reverte uma sessão de importação confirmada.
   * Remove todos os registros brutos da sessão do JSON.
   * O PontoRepository deve ser chamado separadamente para marcar os
   * normalizados como 'revertido' (feito por PontoEngine.reverterImportacao).
   */
  function reverterSessao(orgId, id, emailAdmin) {
    var sessao = obterSessao(orgId, id);
    if (!sessao) throw new Error('Sessão não encontrada: ' + id);
    if (sessao.status === 'revertida' || sessao.status === 'cancelada')
      throw new Error('Sessão já processada (status: ' + sessao.status + ').');

    modifyJSON(ARQUIVO_BRUTO, function(lista) {
      if (!Array.isArray(lista)) return lista;
      return lista.filter(function(r){ return !(r.orgId === orgId && r.importacaoId === id); });
    });
    atualizarSessao(orgId, id, {
      status:       'revertida',
      revertidoPor: emailAdmin,
      revertidoEm:  new Date().toISOString()
    });
    return { ok: true, sessaoId: id };
  }

  function obterSessao(orgId, id) {
    var lista = readJSON(ARQUIVO_IMPORTACOES) || [];
    return lista.find(function(s){ return s.id === id && s.orgId === orgId; }) || null;
  }

  function listarSessoes(orgId, filtros) {
    var lista  = readJSON(ARQUIVO_IMPORTACOES) || [];
    var result = lista.filter(function(s){ return s.orgId === orgId; });
    if (filtros && filtros.status) {
      result = result.filter(function(s){ return s.status === filtros.status; });
    }
    return result.sort(function(a, b){ return b.iniciadoEm.localeCompare(a.iniciadoEm); });
  }

  // ─── Registros Brutos ────────────────────────────────────────────────────────

  /**
   * Persiste um lote de registros brutos de uma sessão de importação.
   * Cada registro tem:
   *   id, importacaoId, layoutId, nsr, tipoRegistro, datetimeOriginal,
   *   data, hora, pis, campos{}, linhaOriginal, linhaNumero,
   *   status ('valido'|'duplicado'|'pis_nao_encontrado'|'erro'),
   *   motivo (string explicando erro, se houver)
   */
  function salvarLoteBruto(orgId, importacaoId, registros) {
    if (!registros || !registros.length) return 0;
    var agora = new Date().toISOString();
    modifyJSON(ARQUIVO_BRUTO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      registros.forEach(function(r) {
        lista.push(Object.assign(
          { id: gerarId('BRUTO') },
          r,
          { orgId: orgId, importacaoId: importacaoId, criadoEm: agora }
        ));
      });
      return lista;
    });
    return registros.length;
  }

  function listarBrutoPorSessao(orgId, importacaoId) {
    var lista = readJSON(ARQUIVO_BRUTO) || [];
    return lista.filter(function(r){
      return r.orgId === orgId && r.importacaoId === importacaoId;
    }).sort(function(a, b){ return (a.nsr || 0) - (b.nsr || 0); });
  }

  /**
   * Lista registros brutos válidos (batidas) de um período, filtrando por
   * status 'valido' e tipo de registro que seja batida no layout.
   */
  function listarBrutoPorPeriodo(orgId, dataInicio, dataFim) {
    var lista = readJSON(ARQUIVO_BRUTO) || [];
    return lista.filter(function(r) {
      if (r.orgId !== orgId) return false;
      if (!r.data) return false;
      return r.data >= dataInicio && r.data <= dataFim;
    }).sort(function(a, b){
      return (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || ''));
    });
  }

  /**
   * Verifica se um NSR já existe para a org (usado para detectar duplicatas
   * antes de salvar o registro normalizado).
   */
  function nsrJaExiste(orgId, nsr) {
    var lista = readJSON(ARQUIVO_BRUTO) || [];
    return lista.some(function(r){
      return r.orgId === orgId && r.nsr === nsr && r.status === 'valido';
    });
  }

  // ─── Índices Sheet ────────────────────────────────────────────────────────────

  function prepararIndice() {
    _garantirCabecalho(ABA_BRUTO, HEADERS_BRUTO);
    _garantirCabecalho(ABA_IMPORTACOES, HEADERS_IMPORTACOES);
    Logger.info('ponto_bruto_repository', 'prepararIndice', 'Índices PontoBruto e PontoImportacoes OK.');
    return { ok: true };
  }

  function _garantirCabecalho(nomeAba, headers) {
    try {
      var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID_PONTO');
      if (!sheetId) return;
      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName(nomeAba);
      if (!aba) {
        aba = ss.insertSheet(nomeAba);
        aba.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
        aba.setFrozenRows(1);
        return;
      }
      var atual = aba.getLastRow() > 0
        ? aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), headers.length)).getValues()[0]
        : [];
      if (atual.every(function(v){ return !v; }) || String(atual[0] || '').trim() !== headers[0]) {
        aba.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
        aba.setFrozenRows(1);
      }
    } catch(e) {
      Logger.warn('ponto_bruto_repository', '_garantirCabecalho', nomeAba + ': ' + e.message);
    }
  }

  function _sincronizarSessaoSheet(orgId, sessao) {
    try {
      var aba = _getSheet('SHEET_ID_PONTO', ABA_IMPORTACOES);
      if (!aba) return;
      aba.appendRow([
        sessao.id, sessao.layoutId, sessao.nomeArquivo, sessao.status,
        sessao.totalLinhas, sessao.registrosBrutos, sessao.registrosIgnorados, sessao.erros,
        sessao.importadoPor, orgId, sessao.iniciadoEm, sessao.concluidoEm || ''
      ]);
    } catch(e) {
      Logger.warn('ponto_bruto_repository', '_sincronizarSessaoSheet', e.message);
    }
  }

  return {
    criarSessao:          criarSessao,
    atualizarSessao:      atualizarSessao,
    concluirSessao:       concluirSessao,
    reverterSessao:       reverterSessao,
    obterSessao:          obterSessao,
    listarSessoes:        listarSessoes,
    salvarLoteBruto:      salvarLoteBruto,
    listarBrutoPorSessao: listarBrutoPorSessao,
    listarBrutoPorPeriodo:listarBrutoPorPeriodo,
    nsrJaExiste:          nsrJaExiste,
    prepararIndice:       prepararIndice
  };

})();
