/**
 * @file modules/infraestrutura/escala_carro_repository.gs
 * @layer modules/infraestrutura
 * @description Repositório de Escala de Disponibilidade de Veículos.
 *   Fonte canônica: escala_carro.json no Drive.
 *   Índice secundário: planilha ESPACOS.EscalaCarro.
 *
 *   Schema de uma escala:
 *   {
 *     id, orgId, veiculoId,
 *     nome,
 *     tipo: 'semanal' | 'especifica',
 *     diasSemana: [0..6],     // apenas para tipo='semanal' (0=Dom, 1=Seg…6=Sab)
 *     dataInicio: 'YYYY-MM-DD', // vigência da escala semanal
 *     dataFim:    'YYYY-MM-DD',
 *     data:       'YYYY-MM-DD', // apenas para tipo='especifica'
 *     horaInicio: 'HH:MM',
 *     horaFim:    'HH:MM',
 *     ativo: true,
 *     criadoPor, criadoEm, atualizadoEm, observacao
 *   }
 * @depends core/data_layer.gs, core/utils.gs, core/services/data_gateway.gs
 */

var EscalaCarroRepository = (function() {

  var _ARQUIVO  = 'escala_carro.json';
  var _PLANILHA = 'SHEET_ID_ESPACOS';
  var _ABA      = 'EscalaCarro';

  var _CABECALHO = [
    'ID', 'OrgId', 'VeiculoId', 'Nome', 'Tipo',
    'DiasSemana', 'DataInicio', 'DataFim', 'Data',
    'HoraInicio', 'HoraFim', 'Ativo',
    'CriadoPor', 'CriadoEm', 'AtualizadoEm', 'Observacao'
  ];

  function _serializarIndice(e) {
    return [
      e.id, e.orgId, e.veiculoId || 'default', e.nome || '',
      e.tipo || 'semanal',
      (e.diasSemana || []).join(','),
      e.dataInicio || '', e.dataFim || '', e.data || '',
      e.horaInicio || '', e.horaFim || '',
      e.ativo ? 'SIM' : 'NÃO',
      e.criadoPor || '', e.criadoEm, e.atualizadoEm,
      e.observacao || ''
    ];
  }

  function _indexar(orgId, e) {
    try {
      var aba   = _getSheet(_PLANILHA, _ABA);
      var dados = aba.getDataRange().getValues();
      var linha = _serializarIndice(e);
      for (var i = 1; i < dados.length; i++) {
        if (String(dados[i][0]) === String(e.id)) {
          aba.getRange(i + 1, 1, 1, linha.length).setValues([linha]);
          return;
        }
      }
      aba.appendRow(linha);
    } catch(err) {
      Logger.warn('escala_carro_repo', '_indexar', err.message);
    }
  }

  // ── API pública ──────────────────────────────────────────────────────────────

  function listar(filtros, orgId) {
    var lista = readJSON(_ARQUIVO);
    if (!Array.isArray(lista)) return [];
    lista = lista.filter(function(e) { return e.orgId === orgId && e.ativo !== false; });
    if (!filtros) return lista;
    if (filtros.veiculoId) lista = lista.filter(function(e) { return e.veiculoId === filtros.veiculoId; });
    if (filtros.tipo)      lista = lista.filter(function(e) { return e.tipo      === filtros.tipo;      });
    return lista.sort(function(a, b) {
      var cA = (a.tipo === 'semanal' ? (a.dataInicio || '') : (a.data || ''));
      var cB = (b.tipo === 'semanal' ? (b.dataInicio || '') : (b.data || ''));
      return cB.localeCompare(cA);
    });
  }

  function buscarPorId(id, orgId) {
    var lista = readJSON(_ARQUIVO);
    if (!Array.isArray(lista)) return null;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === id && lista[i].orgId === orgId) return lista[i];
    }
    return null;
  }

  function inserir(dados, orgId) {
    var agr = agora();
    var id  = gerarId('ec');
    var esc = {
      id:          id,
      orgId:       orgId,
      veiculoId:   dados.veiculoId   || 'default',
      nome:        dados.nome        || '',
      tipo:        dados.tipo        || 'semanal',
      diasSemana:  Array.isArray(dados.diasSemana) ? dados.diasSemana : [],
      dataInicio:  dados.dataInicio  || '',
      dataFim:     dados.dataFim     || '',
      data:        dados.data        || '',
      horaInicio:  dados.horaInicio  || '08:00',
      horaFim:     dados.horaFim     || '18:00',
      ativo:       true,
      criadoPor:   dados.criadoPor   || '',
      criadoEm:    agr,
      atualizadoEm: agr,
      observacao:  dados.observacao  || ''
    };

    modifyJSON(_ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      lista.push(esc);
      return lista;
    });
    _indexar(orgId, esc);
    return esc;
  }

  function atualizar(id, patch, orgId) {
    var atualizado = null;
    modifyJSON(_ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) return lista;
      return lista.map(function(e) {
        if (e.id !== id || e.orgId !== orgId) return e;
        atualizado = Object.assign({}, e, patch, { atualizadoEm: agora() });
        return atualizado;
      });
    });
    if (atualizado) _indexar(orgId, atualizado);
    return atualizado;
  }

  /**
   * Retorna as janelas de disponibilidade para uma data e veículo específicos.
   * Expande escalas semanais e filtra escalas específicas.
   *
   * @param {string} data       — 'YYYY-MM-DD'
   * @param {string} veiculoId
   * @param {string} orgId
   * @returns {Array<{inicio: string, fim: string}>} — janelas permitidas no dia
   */
  function listarParaData(data, veiculoId, orgId) {
    var escalas = readJSON(_ARQUIVO);
    if (!Array.isArray(escalas)) return [];

    var vid    = veiculoId || 'default';
    // dia da semana (0=Dom…6=Sab) para a data ISO dada
    var partes = (data || '').split('-');
    var diaSem = -1;
    if (partes.length === 3) {
      var d = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
      diaSem = d.getDay();
    }

    var janelas = [];
    escalas.forEach(function(e) {
      if (e.orgId !== orgId)       return;
      if (e.veiculoId !== vid)     return;
      if (e.ativo === false)       return;

      if (e.tipo === 'especifica') {
        if (e.data === data) {
          janelas.push({ inicio: e.horaInicio, fim: e.horaFim });
        }
        return;
      }

      // tipo = 'semanal'
      if (diaSem === -1) return;
      var dias = Array.isArray(e.diasSemana) ? e.diasSemana : [];
      if (dias.indexOf(diaSem) === -1) return;
      if (e.dataInicio && data < e.dataInicio) return;
      if (e.dataFim    && data > e.dataFim)    return;
      janelas.push({ inicio: e.horaInicio, fim: e.horaFim });
    });

    return janelas;
  }

  function prepararIndice() {
    try {
      var aba      = _getSheet(_PLANILHA, _ABA);
      var primeira = aba.getRange(1, 1, 1, _CABECALHO.length).getValues()[0];
      if (!primeira[0]) {
        aba.getRange(1, 1, 1, _CABECALHO.length).setValues([_CABECALHO]);
        aba.setFrozenRows(1);
      }
      return { ok: true, aba: 'ESPACOS.' + _ABA };
    } catch(e) {
      return { ok: false, motivo: e.message };
    }
  }

  return {
    listar:          listar,
    buscarPorId:     buscarPorId,
    inserir:         inserir,
    atualizar:       atualizar,
    listarParaData:  listarParaData,
    prepararIndice:  prepararIndice
  };

})();
