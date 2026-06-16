/**
 * @file modules/infraestrutura/reserva_carro_repository.gs
 * @layer modules/infraestrutura
 * @description Repositório de Reservas de Veículo (carro institucional).
 *   Fonte canônica: reservas_carro.json no Drive.
 *   Índice secundário: planilha ESPACOS.ReservasCarro.
 *
 *   Schema canônico (campos adicionados na Fase 22):
 *   - veiculoId: string ('default' para o veículo padrão)
 *   - rota.coordSaida:   { lat, lng }
 *   - rota.coordChegada: { lat, lng }
  *   - rota.paradas:      [{ local, lat, lng, mapaUrl, tempoParadaMin }]
 *   - rota.tempoEstimadoMin: number
 *   - rota.distanciaKm:     number
 *   - horaChegadaEstimada:  'HH:MM' (calculada via Maps, substituiu o campo manual)
 *
 * @depends core/data_layer.gs, core/utils.gs, core/services/data_gateway.gs
 */

var ReservaCarroRepository = (function() {

  var _ARQUIVO  = 'reservas_carro.json';
  var _PLANILHA = 'SHEET_ID_ESPACOS';
  var _ABA      = 'ReservasCarro';

  var _CABECALHO = [
    'ID', 'OrgId', 'VeiculoId', 'Data', 'HoraSaida', 'HoraChegadaEstimada',
    'Solicitante', 'Setor', 'Passageiros',
    'LocalSaida', 'LocalChegada', 'Paradas', 'MapaUrl',
    'TempoEstimadoMin', 'DistanciaKm',
    'Status', 'Aprovador', 'Observacao',
    'DataSolicitacao', 'CriadoEm'
  ];

  function _serializarIndice(rc) {
    var rota = rc.rota || {};
    return [
      rc.id, rc.orgId,
      rc.veiculoId || 'default',
      rc.data, rc.horaSaida, rc.horaChegadaEstimada || '',
      rc.solicitante, rc.solicitanteSetor || '',
      (rc.passageiros || []).join('; '),
      rota.localSaida   || '',
      rota.localChegada || '',
      JSON.stringify(rota.paradas || []),
      rota.mapaUrl      || '',
      rota.tempoEstimadoMin || '',
      rota.distanciaKm      || '',
      rc.status, rc.aprovador || '', rc.observacao || '',
      rc.dataSolicitacao, rc.criadoEm
    ];
  }

  function _indexar(orgId, rc) {
    try {
      var aba   = _getSheet(_PLANILHA, _ABA);
      var dados = aba.getDataRange().getValues();
      var linha = _serializarIndice(rc);
      for (var i = 1; i < dados.length; i++) {
        if (String(dados[i][0]) === String(rc.id)) {
          aba.getRange(i + 1, 1, 1, linha.length).setValues([linha]);
          return;
        }
      }
      aba.appendRow(linha);
    } catch (e) {
      Logger.warn('reserva_carro_repo', '_indexar', e.message);
    }
  }

  function _horaParaMinRepo(hora) {
    if (!hora) return -1;
    var p = String(hora).split(':');
    var h = parseInt(p[0], 10), m = parseInt(p[1], 10);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  }

  // ── API pública ──────────────────────────────────────────────────────────────

  function listar(filtros, orgId) {
    var lista = readJSON(_ARQUIVO);
    if (!Array.isArray(lista)) return [];
    lista = lista.filter(function(r) { return r.orgId === orgId; });
    if (!filtros) return lista;
    if (filtros.status)      lista = lista.filter(function(r) { return r.status === filtros.status; });
    if (filtros.data)        lista = lista.filter(function(r) { return r.data === filtros.data; });
    if (filtros.solicitante) lista = lista.filter(function(r) { return r.solicitante === filtros.solicitante; });
    if (filtros.veiculoId)   lista = lista.filter(function(r) { return (r.veiculoId || 'default') === filtros.veiculoId; });
    return lista.sort(function(a, b) {
      var cmp = (b.data || '').localeCompare(a.data || '');
      if (cmp !== 0) return cmp;
      return (b.horaSaida || '').localeCompare(a.horaSaida || '');
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
    var id  = gerarId('rc');
    var rotaEntrada = dados.rota || {};
    var rc  = {
      id:              id,
      orgId:           orgId,
      veiculoId:       dados.veiculoId       || 'default',
      data:            dados.data            || '',
      horaSaida:       dados.horaSaida       || '',
      horaChegadaEstimada: dados.horaChegadaEstimada || '',
      solicitante:     dados.solicitante     || '',
      solicitanteSetor: dados.solicitanteSetor || '',
      passageiros:          Array.isArray(dados.passageiros)         ? dados.passageiros         : [],
      passageirosInternos:  Array.isArray(dados.passageirosInternos) ? dados.passageirosInternos : [],
      passageirosExternos:  Array.isArray(dados.passageirosExternos) ? dados.passageirosExternos : [],
      rota: {
        localSaida:       rotaEntrada.localSaida   || dados.localSaida   || '',
        coordSaida:       rotaEntrada.coordSaida   || null,
        localChegada:     rotaEntrada.localChegada || dados.localChegada || '',
        coordChegada:     rotaEntrada.coordChegada || null,
        mapaUrl:          rotaEntrada.mapaUrl      || dados.mapaUrl      || '',
        paradas:          Array.isArray(rotaEntrada.paradas) ? rotaEntrada.paradas :
                          Array.isArray(dados.paradas)       ? dados.paradas : [],
        tempoEstimadoMin: rotaEntrada.tempoEstimadoMin || dados.tempoEstimadoMin || 0,
        distanciaKm:      rotaEntrada.distanciaKm      || dados.distanciaKm      || 0
      },
      acaoId:          dados.acaoId     || '',
      acaoNome:        dados.acaoNome   || '',
      observacao:      dados.observacao || '',
      status:          'PENDENTE',
      aprovador:       '',
      motivoRecusa:    '',
      dataAprovacao:   '',
      dataSolicitacao: agr,
      criadoEm:        agr,
      atualizadoEm:    agr
    };

    modifyJSON(_ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      lista.push(rc);
      return lista;
    });
    _indexar(orgId, rc);
    return rc;
  }

  function atualizar(id, patch, orgId) {
    var atualizado = null;
    modifyJSON(_ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) return lista;
      return lista.map(function(r) {
        if (r.id !== id || r.orgId !== orgId) return r;
        atualizado = Object.assign({}, r, patch, { atualizadoEm: agora() });
        return atualizado;
      });
    });
    if (atualizado) _indexar(orgId, atualizado);
    return atualizado;
  }

  /**
   * Atualiza apenas os campos de rota (localChegada, coordChegada, paradas, mapaUrl).
   * Usado pelo aprovador para editar a rota sem alterar status ou horários.
   */
  function atualizarRota(id, dadosRota, orgId) {
    var atualizado = null;
    modifyJSON(_ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) return lista;
      return lista.map(function(r) {
        if (r.id !== id || r.orgId !== orgId) return r;
        var rotaAtual = r.rota || {};
        var novaRota  = Object.assign({}, rotaAtual, {
          localChegada: dadosRota.localChegada !== undefined ? dadosRota.localChegada : rotaAtual.localChegada,
          coordChegada: dadosRota.coordChegada !== undefined ? dadosRota.coordChegada : rotaAtual.coordChegada,
          paradas:      Array.isArray(dadosRota.paradas)     ? dadosRota.paradas      : rotaAtual.paradas,
          mapaUrl:      dadosRota.mapaUrl      !== undefined ? dadosRota.mapaUrl       : rotaAtual.mapaUrl
        });
        atualizado = Object.assign({}, r, { rota: novaRota, atualizadoEm: agora() });
        return atualizado;
      });
    });
    if (atualizado) _indexar(orgId, atualizado);
    return atualizado;
  }

  /**
   * Retorna todas as reservas APROVADAS de um veículo em uma data específica.
   * Usado para verificação de conflito e cálculo de disponibilidade.
   */
  function listarAprovadasNaData(data, veiculoId, orgId) {
    var lista = readJSON(_ARQUIVO);
    if (!Array.isArray(lista)) return [];
    var vid = veiculoId || 'default';
    return lista.filter(function(r) {
      return r.orgId === orgId &&
             r.data  === data  &&
             r.status === 'APROVADA' &&
             (r.veiculoId || 'default') === vid;
    });
  }

  /**
   * Verifica sobreposição com reservas APROVADAS e, se não houver conflito, aprova atomicamente.
   * A verificação e a escrita ocorrem dentro do mesmo lock (modifyJSON), eliminando race condition.
   * Filtra conflitos pelo mesmo veículo.
   *
   * @returns {{ atualizado: object|null, conflito: object|null }}
   */
  function aprovarAtomico(id, patch, orgId) {
    var atualizado = null;
    var conflito   = null;

    modifyJSON(_ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) return lista;

      var rc = null;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === id && lista[i].orgId === orgId) { rc = lista[i]; break; }
      }
      if (!rc) return lista;

      var vid     = rc.veiculoId || 'default';
      var iniNovo = _horaParaMinRepo(rc.horaSaida);
      var fimNovo = _horaParaMinRepo(rc.horaChegadaEstimada || rc.horaChegada);

      for (var j = 0; j < lista.length; j++) {
        var r = lista[j];
        if (r.orgId !== orgId || r.data !== rc.data || r.id === id) continue;
        if ((r.veiculoId || 'default') !== vid) continue;
        if (r.status !== 'APROVADA') continue;
        var ini = _horaParaMinRepo(r.horaSaida);
        var fim = _horaParaMinRepo(r.horaChegadaEstimada || r.horaChegada);
        if (iniNovo < fim && fimNovo > ini) { conflito = r; return lista; }
      }

      return lista.map(function(r) {
        if (r.id !== id || r.orgId !== orgId) return r;
        atualizado = Object.assign({}, r, patch, { atualizadoEm: agora() });
        return atualizado;
      });
    });

    return { atualizado: atualizado, conflito: conflito };
  }

  function prepararIndice() {
    try {
      var aba    = _getSheet(_PLANILHA, _ABA);
      var primeira = aba.getRange(1, 1, 1, _CABECALHO.length).getValues()[0];
      if (!primeira[0]) {
        aba.getRange(1, 1, 1, _CABECALHO.length).setValues([_CABECALHO]);
        aba.setFrozenRows(1);
      }
      return { ok: true, aba: 'ESPACOS.' + _ABA };
    } catch (e) {
      return { ok: false, motivo: e.message };
    }
  }

  return {
    listar:                listar,
    buscarPorId:           buscarPorId,
    inserir:               inserir,
    atualizar:             atualizar,
    atualizarRota:         atualizarRota,
    listarAprovadasNaData: listarAprovadasNaData,
    aprovarAtomico:        aprovarAtomico,
    prepararIndice:        prepararIndice
  };

})();
