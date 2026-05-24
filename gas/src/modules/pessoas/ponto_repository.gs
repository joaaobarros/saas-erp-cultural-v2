/**
 * @file ponto_repository.gs
 * @layer repository
 * @description Repositório de Ponto Eletrônico e Banco de Horas.
 *   Fonte de verdade: ponto.json (registros), banco_horas.json (saldo acumulado).
 *   Índice Sheet: EQUIPES.Ponto (registros diários para auditoria/BI).
 *   Compatível com formato AFD (Portaria MTE 1510/2009) para import/export
 *   com o sistema Colabore da Fortes Tecnologia.
 * @depends data_layer.gs, data_gateway.gs
 */

var PontoRepository = (function() {
  var ARQUIVO_PONTO      = 'ponto.json';
  var ARQUIVO_BH         = 'banco_horas.json';
  var ABA_PONTO          = 'EQUIPES.Ponto';
  var HEADERS_PONTO      = [
    'id','colaboradorId','nome','pis','data','hora','tipo',
    'origem','dispositivo','nsr','orgId','registradoEm'
  ];

  // ─── Registros de ponto ─────────────────────────────────────────────────────

  function listarPorColaborador(orgId, colaboradorId, dataInicio, dataFim) {
    var lista = lerJSON(ARQUIVO_PONTO) || [];
    return lista.filter(function(r) {
      if (r.orgId !== orgId || r.colaboradorId !== colaboradorId) return false;
      if (dataInicio && r.data < dataInicio) return false;
      if (dataFim    && r.data > dataFim)    return false;
      return true;
    }).sort(function(a,b){ return (a.data+a.hora).localeCompare(b.data+b.hora); });
  }

  function listarPorData(orgId, data) {
    var lista = lerJSON(ARQUIVO_PONTO) || [];
    return lista.filter(function(r){ return r.orgId === orgId && r.data === data; });
  }

  function listarPorPeriodo(orgId, dataInicio, dataFim) {
    var lista = lerJSON(ARQUIVO_PONTO) || [];
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
      var reg = Object.assign({ id: id, orgId: orgId, registradoEm: agora }, dados, { id: id, orgId: orgId });
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

  // ─── NSR (Número Sequencial de Registro — AFD) ──────────────────────────────

  function proximoNSR(orgId) {
    var lista = lerJSON(ARQUIVO_PONTO) || [];
    var registrosOrg = lista.filter(function(r){ return r.orgId === orgId; });
    if (registrosOrg.length === 0) return 1;
    var maxNSR = Math.max.apply(null, registrosOrg.map(function(r){ return Number(r.nsr||0); }));
    return maxNSR + 1;
  }

  // ─── Banco de Horas ─────────────────────────────────────────────────────────

  function obterBancoHoras(orgId, colaboradorId) {
    var lista = lerJSON(ARQUIVO_BH) || [];
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

  function prepararIndice() {
    DataGateway.garantirAba(ABA_PONTO, HEADERS_PONTO);
    return { ok: true };
  }

  function sincronizarRegistroSheet(orgId, registro, nomeColaborador, pisColaborador) {
    try {
      var aba = DataGateway.obterAba(ABA_PONTO);
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
    proximoNSR:               proximoNSR,
    obterBancoHoras:          obterBancoHoras,
    atualizarBancoHoras:      atualizarBancoHoras,
    prepararIndice:           prepararIndice,
    sincronizarRegistroSheet: sincronizarRegistroSheet
  };
})();
