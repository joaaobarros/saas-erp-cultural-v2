/**
 * @file modules/espacos/reserva_repository.gs
 * @layer modules/espacos
 * @description Repositório canônico de Reservas de Espaço.
 *
 * Fonte de verdade: ESPACOS.Reservas (Sheet canônica — tabular, visível à equipe)
 *
 * Schema de cada Reserva:
 *   { id, orgId, data, horaInicio, horaTermino, sala, turno,
 *     nomeAcao, tipoAcao, responsavel, setor, coResponsavel, release,
 *     itensVolantes, status, motivoCancelamento, observacoes,
 *     acaoId, idLote, criadoEm, atualizadoEm, criadoPor, versao,
 *     minutosMontagem, minutosEncerramento, posEvento }
 *
 * posEvento: { realizado, contabilizar, publicoPresente, observacoes,
 *              comprovacoes:[{url,descricao,tipo}], registradoPor, registradoEm }
 *
 * REGRA: nenhum outro módulo lê/escreve ESPACOS.Reservas diretamente.
 *
 * @depends core/services/data_gateway.gs (DataGateway)
 *          core/utils.gs (gerarId, agora, _getSheet)
 *          core/logger.gs (Logger)
 *          core/config.gs (getOrgConfig)
 */

var ReservaRepository = (function () {

  var _SHEET_KEY = 'SHEET_ID_ESPACOS';
  var _ABA       = 'Reservas';

  var _HEADERS = [
    'ID', 'OrgId', 'Data', 'HoraInicio', 'HoraTermino',
    'Sala', 'Turno', 'NomeAcao', 'TipoAcao', 'Responsavel',
    'Setor', 'CoResponsavel', 'Release', 'ItensVolantes',
    'Status', 'MotivoCancelamento', 'Observacoes',
    'AcaoId', 'IdLote', 'CriadoEm', 'AtualizadoEm', 'CriadoPor', 'Versao',
    'MinutosMontagem', 'MinutosEncerramento', 'PosEvento'
  ];

  var _COL = {};
  _HEADERS.forEach(function (h, i) { _COL[h] = i; });

  // ── Helpers internos ──────────────────────────────────────────────────

  function _orgId() { return getOrgConfig().orgId; }

  function _parsePosEvento(raw) {
    if (!raw) return null;
    try { return JSON.parse(String(raw)); } catch (_) { return null; }
  }

  /** Número seguro de colunas a ler: nunca mais do que o Sheet tem. */
  function _nCols(aba) {
    return Math.min(aba.getLastColumn() || _HEADERS.length, _HEADERS.length);
  }

  function _getSheet() {
    var props   = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty(_SHEET_KEY);
    if (!sheetId) throw new Error('[ReservaRepository] ESPACOS não registrada nas PropertiesService.');
    return SpreadsheetApp.openById(sheetId).getSheetByName(_ABA);
  }

  function _linhaParaReserva(row) {
    return {
      id:                  row[_COL.ID]                  || '',
      orgId:               row[_COL.OrgId]               || '',
      data:                row[_COL.Data]                ? _normalizarData(row[_COL.Data]) : '',
      horaInicio:          _normalizarHora(row[_COL.HoraInicio]),
      horaTermino:         _normalizarHora(row[_COL.HoraTermino]),
      sala:                row[_COL.Sala]                || '',
      turno:               row[_COL.Turno]               || '',
      nomeAcao:            row[_COL.NomeAcao]            || '',
      tipoAcao:            row[_COL.TipoAcao]            || '',
      responsavel:         row[_COL.Responsavel]         || '',
      setor:               row[_COL.Setor]               || '',
      coResponsavel:       row[_COL.CoResponsavel]       || '',
      release:             row[_COL.Release]             || '',
      itensVolantes:       row[_COL.ItensVolantes]       || '',
      status:              row[_COL.Status]              || 'pendente',
      motivoCancelamento:  row[_COL.MotivoCancelamento]  || '',
      observacoes:         row[_COL.Observacoes]         || '',
      acaoId:              row[_COL.AcaoId]              || '',
      idLote:              row[_COL.IdLote]              || '',
      criadoEm:            row[_COL.CriadoEm]            || '',
      atualizadoEm:        row[_COL.AtualizadoEm]        || '',
      criadoPor:           row[_COL.CriadoPor]           || '',
      versao:              Number(row[_COL.Versao]       || 1),
      minutosMontagem:     Number(row[_COL.MinutosMontagem]     || 0),
      minutosEncerramento: Number(row[_COL.MinutosEncerramento] || 0),
      posEvento:           _parsePosEvento(row[_COL.PosEvento])
    };
  }

  function _reservaParaLinha(r) {
    return [
      r.id                  || '',
      r.orgId               || '',
      r.data                || '',
      r.horaInicio          || '',
      r.horaTermino         || '',
      r.sala                || '',
      r.turno               || '',
      r.nomeAcao            || '',
      r.tipoAcao            || '',
      r.responsavel         || '',
      r.setor               || '',
      r.coResponsavel       || '',
      r.release             || '',
      r.itensVolantes       || '',
      r.status              || 'pendente',
      r.motivoCancelamento  || '',
      r.observacoes         || '',
      r.acaoId              || '',
      r.idLote              || '',
      r.criadoEm            || '',
      r.atualizadoEm        || '',
      r.criadoPor           || '',
      r.versao              || 1,
      Number(r.minutosMontagem     || 0),
      Number(r.minutosEncerramento || 0),
      r.posEvento ? JSON.stringify(r.posEvento) : ''
    ];
  }

  /** Normaliza datas de Sheet (Date objects) para string ISO */
  function _normalizarData(d) {
    if (!d) return '';
    if (d instanceof Date) {
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    }
    var s = String(d).trim();
    // DD/MM/YYYY → YYYY-MM-DD
    if (s.indexOf('/') !== -1) {
      var p = s.split('/');
      if (p.length === 3) return p[2] + '-' + p[1] + '-' + p[0];
    }
    return s;
  }

  /**
   * Normaliza horários de Sheet para string "HH:MM".
   * Google Sheets armazena horários como objetos Date (epoch: 30/12/1899).
   * String(dateObj) → "Sat Dec 30 1899 07:22:00..." quebra parseInt.
   * @param {Date|string|number} h
   * @returns {string} "HH:MM" ou '' se inválido
   */
  function _normalizarHora(h) {
    if (h === null || h === undefined || h === '') return '';
    if (h instanceof Date) {
      return String(h.getHours()).padStart(2, '0') + ':' +
             String(h.getMinutes()).padStart(2, '0');
    }
    // Número fracionário (0..1) = fração do dia (formato interno do Sheets)
    if (typeof h === 'number' && h >= 0 && h < 1) {
      var totalMin = Math.round(h * 24 * 60);
      return String(Math.floor(totalMin / 60)).padStart(2, '0') + ':' +
             String(totalMin % 60).padStart(2, '0');
    }
    return String(h);
  }

  // ── Operações públicas ────────────────────────────────────────────────

  /**
   * Garante cabeçalho na aba ESPACOS.Reservas.
   * Executar via GAS Editor: fase2_reservas_prepararIndice()
   */
  function prepararIndice() {
    try {
      var aba = _getSheet();
      if (!aba) throw new Error('Aba Reservas não encontrada.');
      var lastCol = aba.getLastColumn();
      if (lastCol === 0) {
        // Aba nova: escrever todos os headers
        aba.getRange(1, 1, 1, _HEADERS.length).setValues([_HEADERS]);
        aba.setFrozenRows(1);
        Logger.info('reserva_repository', 'prepararIndice', 'Cabeçalho criado em ESPACOS.Reservas');
      } else {
        var existente = aba.getRange(1, 1, 1, lastCol).getValues()[0];
        var vazia = existente.every(function (v) { return !v; });
        if (vazia) {
          // Aba com colunas mas sem dados: reescrever headers completos
          if (lastCol < _HEADERS.length) aba.insertColumnsAfter(lastCol, _HEADERS.length - lastCol);
          aba.getRange(1, 1, 1, _HEADERS.length).setValues([_HEADERS]);
          aba.setFrozenRows(1);
        } else if (lastCol < _HEADERS.length) {
          // Aba existente com dados: apenas acrescentar colunas que faltam
          var novosCabecalhos = _HEADERS.slice(lastCol);
          aba.getRange(1, lastCol + 1, 1, novosCabecalhos.length).setValues([novosCabecalhos]);
          Logger.info('reserva_repository', 'prepararIndice',
            'Colunas adicionadas à ESPACOS.Reservas: ' + novosCabecalhos.join(', '));
        }
      }
      return { ok: true, aba: 'ESPACOS.Reservas', colunas: _HEADERS.length };
    } catch (e) {
      Logger.error('reserva_repository', 'prepararIndice', e.message);
      return { ok: false, erro: e.message };
    }
  }

  /**
   * Retorna todos os registros do orgId filtrados opcionalmente.
   * @param {Object} filtros — { status, sala, data, responsavel, dateRange:{de,ate} }
   * @param {string} orgId
   * @returns {Reserva[]}
   */
  function listar(filtros, orgId) {
    try {
      var aba = _getSheet();
      if (!aba || aba.getLastRow() < 2) return [];
      var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _nCols(aba)).getValues();
      var result = [];
      var f = filtros || {};

      dados.forEach(function (row) {
        if (!row[_COL.ID]) return;
        if (row[_COL.OrgId] !== orgId) return;
        var r = _linhaParaReserva(row);
        if (f.status    && r.status      !== f.status)    return;
        if (f.sala      && r.sala        !== f.sala)      return;
        if (f.responsavel && r.responsavel !== f.responsavel) return;
        if (f.data      && r.data        !== f.data)      return;
        if (f.dateRange) {
          if (f.dateRange.de  && r.data < f.dateRange.de)  return;
          if (f.dateRange.ate && r.data > f.dateRange.ate) return;
        }
        result.push(r);
      });

      return result;
    } catch (e) {
      Logger.error('reserva_repository', 'listar', e.message);
      return [];
    }
  }

  /**
   * Busca uma reserva pelo ID.
   * @param {string} id
   * @param {string} orgId
   * @returns {Reserva|null}
   */
  function buscarPorId(id, orgId) {
    try {
      var aba = _getSheet();
      if (!aba || aba.getLastRow() < 2) return null;
      var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _nCols(aba)).getValues();
      for (var i = 0; i < dados.length; i++) {
        if (String(dados[i][_COL.ID]).trim() === String(id).trim() &&
            dados[i][_COL.OrgId] === orgId) {
          return _linhaParaReserva(dados[i]);
        }
      }
      return null;
    } catch (e) {
      Logger.error('reserva_repository', 'buscarPorId', e.message);
      return null;
    }
  }

  /**
   * Salva (cria ou atualiza) uma reserva.
   * @param {Reserva} reserva
   * @returns {Reserva}
   */
  function salvar(reserva) {
    var aba = _getSheet();
    if (!aba) throw new Error('[ReservaRepository.salvar] Aba Reservas não encontrada.');

    var agr = agora ? agora() : new Date().toISOString();

    if (reserva.id) {
      // Atualizar
      var dados = aba.getLastRow() > 1 ?
        aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS.length).getValues() : [];
      for (var i = 0; i < dados.length; i++) {
        if (String(dados[i][_COL.ID]).trim() === String(reserva.id).trim() &&
            dados[i][_COL.OrgId] === reserva.orgId) {
          reserva.atualizadoEm = agr;
          reserva.versao       = Number(dados[i][_COL.Versao] || 1) + 1;
          aba.getRange(i + 2, 1, 1, _HEADERS.length).setValues([_reservaParaLinha(reserva)]);
          return reserva;
        }
      }
      throw new Error('[ReservaRepository.salvar] Reserva não encontrada: ' + reserva.id);
    } else {
      // Criar
      reserva.id          = gerarId('RES');
      reserva.criadoEm    = agr;
      reserva.atualizadoEm= agr;
      reserva.versao      = 1;
      var linhaInserir    = aba.getLastRow() + 1;
      aba.getRange(linhaInserir, 1, 1, _HEADERS.length).setValues([_reservaParaLinha(reserva)]);
      return reserva;
    }
  }

  /**
   * Salva múltiplas reservas de lote atomicamente.
   * @param {Reserva[]} reservas
   * @returns {Reserva[]}
   */
  function salvarLote(reservas) {
    if (!reservas || !reservas.length) return [];
    var aba = _getSheet();
    if (!aba) throw new Error('[ReservaRepository.salvarLote] Aba Reservas não encontrada.');

    var agr    = agora ? agora() : new Date().toISOString();
    var linhas = [];
    var idLote = gerarId('LOTE');

    reservas.forEach(function (r) {
      r.id           = gerarId('RES');
      r.idLote       = idLote;
      r.criadoEm     = agr;
      r.atualizadoEm = agr;
      r.versao       = 1;
      linhas.push(_reservaParaLinha(r));
    });

    var nextRow = aba.getLastRow() + 1;
    aba.getRange(nextRow, 1, linhas.length, _HEADERS.length).setValues(linhas);
    return reservas;
  }

  /**
   * Retorna todas as reservas ativas (não canceladas) de uma sala em uma data.
   * Usado exclusivamente pelo assertSemConflito() dentro de LockService.
   * @param {string} sala
   * @param {string} data — YYYY-MM-DD
   * @param {string} orgId
   * @param {string} [excluirId] — ID de reserva a ignorar (para edição)
   * @returns {Reserva[]}
   */
  function listarAtivosParaConflito(sala, data, orgId, excluirId) {
    try {
      var aba = _getSheet();
      if (!aba || aba.getLastRow() < 2) return [];
      var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _nCols(aba)).getValues();
      var result = [];
      dados.forEach(function (row) {
        if (!row[_COL.ID]) return;
        if (row[_COL.OrgId] !== orgId) return;
        var status = String(row[_COL.Status] || '').toLowerCase();
        if (status === 'cancelado') return;
        if (String(row[_COL.Sala]).trim() !== String(sala).trim()) return;
        var dataRow = _normalizarData(row[_COL.Data]);
        if (dataRow !== data) return;
        if (excluirId && String(row[_COL.ID]).trim() === String(excluirId).trim()) return;
        result.push(_linhaParaReserva(row));
      });
      return result;
    } catch (e) {
      Logger.error('reserva_repository', 'listarAtivosParaConflito', e.message);
      return [];
    }
  }

  /**
   * Atualiza apenas o status de uma reserva (operação leve).
   * @param {string} id
   * @param {string} novoStatus
   * @param {string} orgId
   * @param {string} [motivo]
   */
  function atualizarStatus(id, novoStatus, orgId, motivo) {
    var aba = _getSheet();
    if (!aba || aba.getLastRow() < 2) throw new Error('Reserva não encontrada: ' + id);
    var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS.length).getValues();
    for (var i = 0; i < dados.length; i++) {
      if (String(dados[i][_COL.ID]).trim() === String(id).trim() &&
          dados[i][_COL.OrgId] === orgId) {
        aba.getRange(i + 2, _COL.Status + 1).setValue(novoStatus);
        aba.getRange(i + 2, _COL.AtualizadoEm + 1).setValue(agora ? agora() : new Date().toISOString());
        aba.getRange(i + 2, _COL.Versao + 1).setValue(Number(dados[i][_COL.Versao] || 1) + 1);
        if (motivo) aba.getRange(i + 2, _COL.MotivoCancelamento + 1).setValue(motivo);
        return;
      }
    }
    throw new Error('[ReservaRepository.atualizarStatus] Reserva não encontrada: ' + id);
  }

  /**
   * Grava (ou substitui) o bloco posEvento de uma reserva.
   * Operação leve: atualiza apenas as colunas MinutosMontagem, MinutosEncerramento,
   * PosEvento, AtualizadoEm e Versao — sem reescrever a linha inteira.
   * @param {string} id
   * @param {string} orgId
   * @param {Object} posEvento
   */
  function atualizarPosEvento(id, orgId, posEvento) {
    var aba = _getSheet();
    if (!aba || aba.getLastRow() < 2) throw new Error('Reserva não encontrada: ' + id);
    var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _nCols(aba)).getValues();
    for (var i = 0; i < dados.length; i++) {
      if (String(dados[i][_COL.ID]).trim() === String(id).trim() &&
          dados[i][_COL.OrgId] === orgId) {
        aba.getRange(i + 2, _COL.PosEvento + 1)
           .setValue(posEvento ? JSON.stringify(posEvento) : '');
        aba.getRange(i + 2, _COL.AtualizadoEm + 1)
           .setValue(agora ? agora() : new Date().toISOString());
        aba.getRange(i + 2, _COL.Versao + 1)
           .setValue(Number(dados[i][_COL.Versao] || 1) + 1);
        return;
      }
    }
    throw new Error('[ReservaRepository.atualizarPosEvento] Reserva não encontrada: ' + id);
  }

  /**
   * Atualiza campos de pré-evento (minutosMontagem e minutosEncerramento).
   * @param {string} id
   * @param {string} orgId
   * @param {number} minutosMontagem
   * @param {number} minutosEncerramento
   */
  function atualizarPreEvento(id, orgId, minutosMontagem, minutosEncerramento) {
    var aba = _getSheet();
    if (!aba || aba.getLastRow() < 2) throw new Error('Reserva não encontrada: ' + id);
    var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _nCols(aba)).getValues();
    for (var i = 0; i < dados.length; i++) {
      if (String(dados[i][_COL.ID]).trim() === String(id).trim() &&
          dados[i][_COL.OrgId] === orgId) {
        aba.getRange(i + 2, _COL.MinutosMontagem + 1).setValue(Number(minutosMontagem || 0));
        aba.getRange(i + 2, _COL.MinutosEncerramento + 1).setValue(Number(minutosEncerramento || 0));
        aba.getRange(i + 2, _COL.AtualizadoEm + 1)
           .setValue(agora ? agora() : new Date().toISOString());
        aba.getRange(i + 2, _COL.Versao + 1)
           .setValue(Number(dados[i][_COL.Versao] || 1) + 1);
        return;
      }
    }
    throw new Error('[ReservaRepository.atualizarPreEvento] Reserva não encontrada: ' + id);
  }

  /**
   * Métricas rápidas de reservas.
   * @param {string} orgId
   * @returns {{ total, pendente, confirmado, em_uso, concluido, cancelado, hoje }}
   */
  function metricas(orgId) {
    try {
      var aba = _getSheet();
      if (!aba || aba.getLastRow() < 2) return { total:0, pendente:0, confirmado:0, em_uso:0, concluido:0, cancelado:0, hoje:0 };
      var dados = aba.getRange(2, 1, aba.getLastRow() - 1, _HEADERS.length).getValues();
      var m = { total:0, pendente:0, confirmado:0, em_uso:0, concluido:0, cancelado:0, hoje:0 };
      var hoje = _normalizarData(new Date());
      dados.forEach(function (row) {
        if (!row[_COL.ID]) return;
        if (row[_COL.OrgId] !== orgId) return;
        var s = String(row[_COL.Status] || 'pendente').toLowerCase();
        m.total++;
        if (m[s] !== undefined) m[s]++;
        var dataRow = _normalizarData(row[_COL.Data]);
        if (dataRow === hoje && s !== 'cancelado') m.hoje++;
      });
      return m;
    } catch (e) {
      Logger.error('reserva_repository', 'metricas', e.message);
      return { total:0, pendente:0, confirmado:0, em_uso:0, concluido:0, cancelado:0, hoje:0 };
    }
  }

  // ── Função de inicialização globalmente acessível ──────────────────────

  return {
    prepararIndice:            prepararIndice,
    listar:                    listar,
    buscarPorId:               buscarPorId,
    salvar:                    salvar,
    salvarLote:                salvarLote,
    listarAtivosParaConflito:  listarAtivosParaConflito,
    atualizarStatus:           atualizarStatus,
    atualizarPosEvento:        atualizarPosEvento,
    atualizarPreEvento:        atualizarPreEvento,
    metricas:                  metricas
  };

})();

// ── Wrapper global para GAS Editor ────────────────────────────────────────
function fase2_reservas_prepararIndice() {
  return ReservaRepository.prepararIndice();
}
