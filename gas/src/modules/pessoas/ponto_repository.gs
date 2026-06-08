/**
 * @file ponto_repository.gs
 * @layer repository
 * @description Repositório de Ponto Eletrônico Normalizado e Banco de Horas.
 *
 *   Camada 2 da arquitetura de 3 camadas do módulo AFD:
 *     1. Dado bruto      → ponto_bruto_repository.gs (linha original preservada)
 *     2. Dado normalizado → ESTE ARQUIVO — ponto_normalizado.json
 *     3. Layout visual    → ponto_exportacao_engine.gs (Fase 7)
 *
 *   Registro normalizado: estrutura interna padronizada independente do
 *   formato do relógio. Campos adicionais vs. estrutura anterior:
 *     importacaoId     — id da sessão de importação (null = registro manual)
 *     brutoId          — id do registro bruto de origem (null = manual)
 *     datetimeOriginal — datetime com timezone preservado do arquivo
 *     equipamento      — modelo do relógio de ponto
 *     status           — 'ativo' | 'revertido'
 *
 *   Banco de horas: banco_horas.json (saldo acumulado + histórico reversível).
 *   Índice Sheet: EQUIPES.Ponto
 *
 * @depends data_layer.gs, data_gateway.gs
 */

var PontoRepository = (function() {
  var ARQUIVO_PONTO      = 'ponto_normalizado.json';
  var ARQUIVO_BH         = 'banco_horas.json';
  var ABA_PONTO          = 'EQUIPES.Ponto';
  var HEADERS_PONTO      = [
    'id','colaboradorId','nome','pis','data','hora','tipo',
    'datetimeOriginal','importacaoId','brutoId','equipamento',
    'origem','nsr','status','orgId','registradoEm'
  ];

  // ─── Registros de ponto ─────────────────────────────────────────────────────

  function listarPorColaborador(orgId, colaboradorId, dataInicio, dataFim) {
    var lista = readJSON(ARQUIVO_PONTO) || [];
    return lista.filter(function(r) {
      if (r.orgId !== orgId || r.colaboradorId !== colaboradorId) return false;
      if (dataInicio && r.data < dataInicio) return false;
      if (dataFim    && r.data > dataFim)    return false;
      return true;
    }).sort(function(a,b){ return (a.data+a.hora).localeCompare(b.data+b.hora); });
  }

  function listarPorData(orgId, data) {
    var lista = readJSON(ARQUIVO_PONTO) || [];
    return lista.filter(function(r){ return r.orgId === orgId && r.data === data; });
  }

  function listarPorPeriodo(orgId, dataInicio, dataFim) {
    var lista = readJSON(ARQUIVO_PONTO) || [];
    return lista.filter(function(r) {
      return r.orgId === orgId && r.data >= dataInicio && r.data <= dataFim;
    });
  }

  function salvarRegistro(orgId, dados) {
    var id = dados.id || gerarId('PONTO');
    var agora = new Date().toISOString();
    modifyJSON(ARQUIVO_PONTO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(r){ return r.id === id; });
      var reg = Object.assign(
        { id: id, orgId: orgId, registradoEm: agora, status: 'ativo' },
        dados,
        { id: id, orgId: orgId }
      );
      if (idx >= 0) lista[idx] = reg;
      else lista.push(reg);
      return lista;
    });
    return id;
  }

  function excluirRegistro(orgId, id) {
    modifyJSON(ARQUIVO_PONTO, function(lista) {
      if (!Array.isArray(lista)) return lista;
      return lista.filter(function(r){ return !(r.orgId === orgId && r.id === id); });
    });
  }

  /**
   * Verifica se um NSR já existe como registro normalizado ativo.
   * Usado durante importação para evitar duplicatas.
   */
  function nsrJaExiste(orgId, nsr) {
    var lista = readJSON(ARQUIVO_PONTO) || [];
    return lista.some(function(r){
      return r.orgId === orgId && r.nsr === nsr && r.status !== 'revertido';
    });
  }

  /**
   * Atualiza o campo `tipo` de um registro normalizado (chamado pelo JornadaEngine
   * após derivar a sequência E/I/R/S).
   */
  function atualizarTipo(orgId, id, tipo) {
    modifyJSON(ARQUIVO_PONTO, function(lista) {
      if (!Array.isArray(lista)) return lista;
      var idx = lista.findIndex(function(r){ return r.id === id && r.orgId === orgId; });
      if (idx >= 0) lista[idx].tipo = tipo;
      return lista;
    });
  }

  /**
   * Marca todos os registros de uma sessão de importação como 'revertido'.
   * Não exclui os registros — mantém histórico e permite auditoria.
   */
  function reverterImportacao(orgId, importacaoId) {
    var revertidos = 0;
    modifyJSON(ARQUIVO_PONTO, function(lista) {
      if (!Array.isArray(lista)) return lista;
      lista.forEach(function(r) {
        if (r.orgId === orgId && r.importacaoId === importacaoId && r.status === 'ativo') {
          r.status = 'revertido';
          r.revertidoEm = new Date().toISOString();
          revertidos++;
        }
      });
      return lista;
    });
    return revertidos;
  }

  // ─── NSR (Número Sequencial de Registro — AFD) ──────────────────────────────

  function proximoNSR(orgId) {
    var lista = readJSON(ARQUIVO_PONTO) || [];
    var registrosOrg = lista.filter(function(r){ return r.orgId === orgId; });
    if (registrosOrg.length === 0) return 1;
    var maxNSR = Math.max.apply(null, registrosOrg.map(function(r){ return Number(r.nsr||0); }));
    return maxNSR + 1;
  }

  // ─── Banco de Horas ─────────────────────────────────────────────────────────

  function obterBancoHoras(orgId, colaboradorId) {
    var lista = readJSON(ARQUIVO_BH) || [];
    return lista.find(function(b){ return b.orgId === orgId && b.colaboradorId === colaboradorId; }) || {
      colaboradorId: colaboradorId,
      orgId:         orgId,
      saldoMinutos:  0,
      ultimaAtualizacao: null
    };
  }

  function atualizarBancoHoras(orgId, colaboradorId, deltaMinutos, motivo) {
    modifyJSON(ARQUIVO_BH, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(b){ return b.orgId === orgId && b.colaboradorId === colaboradorId; });
      var agora = new Date().toISOString();
      if (idx >= 0) {
        lista[idx].saldoMinutos += deltaMinutos;
        lista[idx].ultimaAtualizacao = agora;
        if (!lista[idx].historico) lista[idx].historico = [];
        lista[idx].historico.push({ deltaMinutos: deltaMinutos, motivo: motivo || '', em: agora });
      } else {
        lista.push({
          colaboradorId:       colaboradorId,
          orgId:               orgId,
          saldoMinutos:        deltaMinutos,
          ultimaAtualizacao:   agora,
          historico:           [{ deltaMinutos: deltaMinutos, motivo: motivo||'', em: agora }]
        });
      }
      return lista;
    });
  }

  // ─── Índice Sheet ────────────────────────────────────────────────────────────

  function _garantirCabecalho() {
    try {
      var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID_EQUIPES');
      if (!sheetId) { Logger.warn('ponto_repository', '_garantirCabecalho', 'SHEET_ID_EQUIPES não configurado'); return; }
      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName(ABA_PONTO);
      if (!aba) {
        aba = ss.insertSheet(ABA_PONTO);
        aba.getRange(1, 1, 1, HEADERS_PONTO.length).setValues([HEADERS_PONTO]);
        aba.getRange(1, 1, 1, HEADERS_PONTO.length).setFontWeight('bold');
        aba.setFrozenRows(1);
        return;
      }
      var atual = aba.getLastRow() > 0
        ? aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), HEADERS_PONTO.length)).getValues()[0]
        : [];
      var vazio = atual.every(function(v) { return !v; });
      if (vazio || String(atual[0] || '').trim() !== HEADERS_PONTO[0]) {
        aba.getRange(1, 1, 1, HEADERS_PONTO.length).setValues([HEADERS_PONTO]);
        aba.setFrozenRows(1);
      }
    } catch(e) { Logger.warn('ponto_repository', '_garantirCabecalho', e.message); }
  }

  function prepararIndice() {
    _garantirCabecalho();
    Logger.info('ponto_repository', 'prepararIndice', 'Índice EQUIPES.Ponto OK.');
    return { ok: true };
  }

  function sincronizarRegistroSheet(orgId, registro, nomeColaborador, pisColaborador) {
    try {
      var aba = _getSheet('SHEET_ID_EQUIPES', ABA_PONTO);
      if (!aba) return;
      aba.appendRow([
        registro.id, registro.colaboradorId,
        nomeColaborador || '', pisColaborador || '',
        registro.data,  registro.hora, registro.tipo,
        registro.origem || 'manual', registro.dispositivo || '',
        registro.nsr || '', orgId, registro.registradoEm || ''
      ]);
    } catch(e) { Logger.warn('ponto', 'sincronizarSheet', e.message); }
  }

  return {
    listarPorColaborador:     listarPorColaborador,
    listarPorData:            listarPorData,
    listarPorPeriodo:         listarPorPeriodo,
    salvarRegistro:           salvarRegistro,
    excluirRegistro:          excluirRegistro,
    atualizarTipo:            atualizarTipo,
    nsrJaExiste:              nsrJaExiste,
    reverterImportacao:       reverterImportacao,
    proximoNSR:               proximoNSR,
    obterBancoHoras:          obterBancoHoras,
    atualizarBancoHoras:      atualizarBancoHoras,
    prepararIndice:           prepararIndice,
    sincronizarRegistroSheet: sincronizarRegistroSheet
  };
})();
