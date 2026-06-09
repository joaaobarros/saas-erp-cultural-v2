/**
 * @file jornada_repository.gs
 * @layer repository
 * @description Repositório de Jornadas de Trabalho Processadas.
 *
 *   Armazena o resultado do processamento do JornadaEngine:
 *   a reconstituição de cada dia de trabalho de cada colaborador,
 *   com os tipos derivados (E/I/R/S), minutos trabalhados, extras,
 *   faltantes, inconsistências e status da jornada.
 *
 *   JSON canônico: jornadas.json
 *   Índice Sheet:  Jornadas
 *
 *   Modelo de dados:
 *   {
 *     id, orgId, colaboradorId, data,
 *     batidas: [{ normalizadoId, hora, tipoDerivado, nsr, datetimeOriginal }],
 *     numBatidas, minutosTrabalho, minutosExtras, minutosFaltantes, minutosIntervalo,
 *     horaEntrada, horaSaida, statusJornada, inconsistencias[], processadoEm
 *   }
 *
 *   statusJornada:
 *     'completa'      — número par de batidas em ordem crescente
 *     'incompleta'    — número ímpar de batidas (saída ausente ou retorno ausente)
 *     'inconsistente' — batidas fora de ordem cronológica
 *
 *   Jornadas 'ausente' (dias úteis sem nenhuma batida) NÃO são persistidas —
 *   o EspelhoEngine infere a ausência a partir dos dias faltantes no período.
 *
 * @depends data_layer.gs
 */

var JornadaRepository = (function() {

  var ARQUIVO     = 'jornadas.json';
  var ABA_JORNADA = 'Jornadas';
  var HEADERS     = [
    'id', 'colaboradorId', 'data', 'numBatidas',
    'minutosTrabalho', 'minutosExtras', 'minutosFaltantes', 'minutosIntervalo',
    'horaEntrada', 'horaSaida', 'statusJornada', 'orgId', 'processadoEm'
  ];

  // ─── Escrita ─────────────────────────────────────────────────────────────────

  /**
   * Salva uma jornada processada.
   * Se já existir jornada para o mesmo colaborador + data, ela é substituída
   * (reprocessamento é idempotente).
   */
  function salvar(orgId, jornada) {
    var id    = jornada.id || gerarId('JORNADA');
    var agora = new Date().toISOString();
    modifyJSON(ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      // Remove versão anterior do mesmo dia/colaborador para reprocessamento limpo
      lista = lista.filter(function(j) {
        return !(j.orgId === orgId &&
                 j.colaboradorId === jornada.colaboradorId &&
                 j.data          === jornada.data);
      });
      lista.push(Object.assign({ id: id, orgId: orgId, processadoEm: agora }, jornada, { id: id, orgId: orgId }));
      return lista;
    });
    return id;
  }

  // ─── Leitura ──────────────────────────────────────────────────────────────────

  function listarPorColaborador(orgId, colaboradorId, dataInicio, dataFim) {
    var lista = readJSON(ARQUIVO) || [];
    return lista.filter(function(j) {
      if (j.orgId !== orgId || j.colaboradorId !== colaboradorId) return false;
      if (dataInicio && j.data < dataInicio) return false;
      if (dataFim    && j.data > dataFim)    return false;
      return true;
    }).sort(function(a, b){ return a.data.localeCompare(b.data); });
  }

  function listarPorPeriodo(orgId, dataInicio, dataFim) {
    var lista = readJSON(ARQUIVO) || [];
    return lista.filter(function(j) {
      return j.orgId === orgId && j.data >= dataInicio && j.data <= dataFim;
    }).sort(function(a, b){ return (a.data + a.colaboradorId).localeCompare(b.data + b.colaboradorId); });
  }

  function obterPorColaboradorData(orgId, colaboradorId, data) {
    var lista = readJSON(ARQUIVO) || [];
    return lista.find(function(j) {
      return j.orgId === orgId && j.colaboradorId === colaboradorId && j.data === data;
    }) || null;
  }

  /**
   * Salva um lote de jornadas em uma única operação modifyJSON.
   * Idempotente: remove jornadas existentes para os mesmos (colabId, data) antes de inserir.
   */
  function salvarLote(orgId, jornadas) {
    if (!jornadas || !jornadas.length) return 0;
    var agora = new Date().toISOString();
    var chaves = {};
    jornadas.forEach(function(j){ chaves[j.colaboradorId + '|' + j.data] = true; });
    modifyJSON(ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      lista = lista.filter(function(j) {
        return !(j.orgId === orgId && chaves[j.colaboradorId + '|' + j.data]);
      });
      jornadas.forEach(function(jornada) {
        lista.push(Object.assign(
          { id: gerarId('JORNADA'), orgId: orgId, processadoEm: agora },
          jornada
        ));
      });
      return lista;
    });
    return jornadas.length;
  }

  // ─── Índice Sheet ─────────────────────────────────────────────────────────────

  function prepararIndice() {
    try {
      var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID_PONTO');
      if (!sheetId) return { ok: false, motivo: 'SHEET_ID_PONTO não configurado' };
      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName(ABA_JORNADA);
      if (!aba) {
        aba = ss.insertSheet(ABA_JORNADA);
        aba.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
        aba.setFrozenRows(1);
      }
      Logger.info('jornada_repository', 'prepararIndice', 'Índice Jornadas OK.');
    } catch(e) {
      Logger.warn('jornada_repository', 'prepararIndice', e.message);
    }
    return { ok: true };
  }

  return {
    salvar:                    salvar,
    salvarLote:                salvarLote,
    listarPorColaborador:      listarPorColaborador,
    listarPorPeriodo:          listarPorPeriodo,
    obterPorColaboradorData:   obterPorColaboradorData,
    prepararIndice:            prepararIndice
  };

})();
