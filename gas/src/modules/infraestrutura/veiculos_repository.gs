/**
 * @file modules/infraestrutura/veiculos_repository.gs
 * @layer modules/infraestrutura
 * @description Repositório de Veículos da Frota Institucional.
 *   Fonte canônica: veiculos_carro.json no Drive.
 *   Índice secundário: planilha ESPACOS.Veiculos.
 *   Um registro com id='default' representa o veículo padrão da organização
 *   e é criado automaticamente na primeira chamada a getDefault().
 * @depends core/data_layer.gs, core/utils.gs, core/services/data_gateway.gs
 */

var VeiculosRepository = (function() {

  var _ARQUIVO  = 'veiculos_carro.json';
  var _PLANILHA = 'SHEET_ID_ESPACOS';
  var _ABA      = 'Veiculos';

  var _CABECALHO = [
    'ID', 'OrgId', 'Nome', 'Placa', 'Modelo', 'Cor',
    'Capacidade', 'MotoristaPadrao', 'Ativo', 'CriadoEm', 'AtualizadoEm'
  ];

  function _serializarIndice(v) {
    return [
      v.id, v.orgId, v.nome || '', v.placa || '', v.modelo || '', v.cor || '',
      v.capacidade || 4, v.motoristaPadrao || '',
      v.ativo ? 'SIM' : 'NÃO',
      v.criadoEm, v.atualizadoEm
    ];
  }

  function _indexar(orgId, v) {
    try {
      var aba   = _getSheet(_PLANILHA, _ABA);
      var dados = aba.getDataRange().getValues();
      var linha = _serializarIndice(v);
      for (var i = 1; i < dados.length; i++) {
        if (String(dados[i][0]) === String(v.id)) {
          aba.getRange(i + 1, 1, 1, linha.length).setValues([linha]);
          return;
        }
      }
      aba.appendRow(linha);
    } catch(e) {
      Logger.warn('veiculos_repo', '_indexar', e.message);
    }
  }

  // ── API pública ──────────────────────────────────────────────────────────────

  function listar(orgId) {
    var lista = readJSON(_ARQUIVO);
    if (!Array.isArray(lista)) return [];
    return lista.filter(function(v) { return v.orgId === orgId && v.ativo !== false; });
  }

  function buscarPorId(id, orgId) {
    var lista = readJSON(_ARQUIVO);
    if (!Array.isArray(lista)) return null;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].id === id && lista[i].orgId === orgId) return lista[i];
    }
    return null;
  }

  /**
   * Retorna o veículo padrão (id='default').
   * Se não existir, cria automaticamente com dados genéricos.
   */
  function getDefault(orgId) {
    var v = buscarPorId('default', orgId);
    if (v) return v;
    return inserir({
      id:              'default',
      nome:            'Carro Institucional',
      placa:           '',
      modelo:          '',
      cor:             '',
      capacidade:      4,
      motoristaPadrao: ''
    }, orgId);
  }

  function inserir(dados, orgId) {
    var agr = agora();
    var id  = dados.id || gerarId('vei');
    var vei = {
      id:              id,
      orgId:           orgId,
      nome:            dados.nome            || 'Veículo',
      placa:           dados.placa           || '',
      modelo:          dados.modelo          || '',
      cor:             dados.cor             || '',
      capacidade:      dados.capacidade      || 4,
      motoristaPadrao: dados.motoristaPadrao || '',
      ativo:           true,
      criadoEm:        agr,
      atualizadoEm:    agr
    };

    modifyJSON(_ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === id && lista[i].orgId === orgId) return lista;
      }
      lista.push(vei);
      return lista;
    });
    _indexar(orgId, vei);
    return vei;
  }

  function atualizar(id, patch, orgId) {
    var atualizado = null;
    modifyJSON(_ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) return lista;
      return lista.map(function(v) {
        if (v.id !== id || v.orgId !== orgId) return v;
        atualizado = Object.assign({}, v, patch, { atualizadoEm: agora() });
        return atualizado;
      });
    });
    if (atualizado) _indexar(orgId, atualizado);
    return atualizado;
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
    listar:         listar,
    buscarPorId:    buscarPorId,
    getDefault:     getDefault,
    inserir:        inserir,
    atualizar:      atualizar,
    prepararIndice: prepararIndice
  };

})();
