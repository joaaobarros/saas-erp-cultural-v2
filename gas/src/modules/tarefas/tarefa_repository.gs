/**
 * @file modules/tarefas/tarefa_repository.gs
 * @layer modules/tarefas
 * @description Repositório canônico de Tarefas.
 *
 * Fonte de verdade: tarefas.json.
 * Índice auxiliar: PESSOAL.Tarefas (somente leitura operacional).
 */

var TarefaRepository = (function () {

  var _ARQUIVO = 'tarefas.json';
  var _SHEET_KEY = 'SHEET_ID_PESSOAL';
  var _ABA = 'Tarefas';
  var _HEADERS = [
    'ID', 'OrgId', 'Titulo', 'Descricao', 'Responsavel', 'Setor', 'Prioridade',
    'Status', 'CriadoEm', 'Prazo', 'ConcluidoEm', 'AcaoId', 'ProcessoId',
    'ReservaId', 'ContratoId', 'Modulo', 'Tipo', 'AtualizadoEm', 'Versao'
  ];
  var _NIVEIS_AMPLOS = ['admin', 'superadmin'];

  function _orgIdPadrao(orgId) {
    return orgId || getOrgConfig().orgId;
  }

  function _normalizarFiltros(filtros) {
    filtros = filtros || {};
    var normalizados = {};
    Object.keys(filtros).forEach(function (k) {
      if (filtros[k] !== undefined && filtros[k] !== null && filtros[k] !== '') {
        normalizados[k] = filtros[k];
      }
    });
    return normalizados;
  }

  function _pertenceAoUsuario(tarefa, email) {
    email = String(email || '').toLowerCase().trim();
    if (!email) return false;
    if (String(tarefa.responsavel || '').toLowerCase().trim() === email) return true;
    if (String(tarefa.criadoPor || '').toLowerCase().trim() === email) return true;
    return (tarefa.executores || []).map(function (e) {
      return String(e || '').toLowerCase().trim();
    }).indexOf(email) !== -1;
  }

  function _ordenar(lista) {
    var pesoStatus = {
      pendente: 1,
      em_andamento: 2,
      bloqueada: 3,
      concluida: 4,
      cancelada: 5
    };
    var pesoPrioridade = { critica: 1, alta: 2, media: 3, baixa: 4 };
    return lista.sort(function (a, b) {
      var s = (pesoStatus[a.status] || 99) - (pesoStatus[b.status] || 99);
      if (s !== 0) return s;
      var p = (pesoPrioridade[a.prioridade] || 99) - (pesoPrioridade[b.prioridade] || 99);
      if (p !== 0) return p;
      return String(a.prazo || '9999').localeCompare(String(b.prazo || '9999'));
    });
  }

  function _garantirCabecalhoIndice() {
    var aba = _getSheet(_SHEET_KEY, _ABA);
    var atual = aba.getLastRow() > 0
      ? aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), _HEADERS.length)).getValues()[0]
      : [];
    var vazio = atual.every(function (v) { return !v; });
    if (vazio || String(atual[0] || '').trim() !== 'ID') {
      aba.getRange(1, 1, 1, _HEADERS.length).setValues([_HEADERS]);
      aba.setFrozenRows(1);
    }
  }

  function _serializarIndice(tarefa) {
    return [
      tarefa.id || '',
      tarefa.orgId || '',
      tarefa.titulo || '',
      tarefa.descricao || '',
      tarefa.responsavel || '',
      tarefa.setor || '',
      tarefa.prioridade || '',
      tarefa.status || '',
      tarefa.criadoEm || '',
      tarefa.prazo || '',
      tarefa.concluidoEm || '',
      tarefa.acaoId || tarefa.idAcao || '',
      tarefa.processoId || '',
      tarefa.reservaId || '',
      tarefa.contratoId || '',
      tarefa.modulo || '',
      tarefa.tipo || '',
      tarefa.atualizadoEm || '',
      tarefa.versao || 1
    ];
  }

  function _indexar(orgId, tarefa) {
    try {
      _garantirCabecalhoIndice();
      var linha = _serializarIndice(tarefa);
      var atualizado = DataGateway.atualizarLinhaPorColuna(_SHEET_KEY, _ABA, 0, tarefa.id, linha);
      if (!atualizado) DataGateway.salvarLinha(_SHEET_KEY, _ABA, linha);
    } catch (e) {
      Logger.warn('tarefa_repository', 'indexar', 'Falha ao atualizar índice: ' + e.message);
    }
  }

  var _base = criarJsonRepository(_ARQUIVO, _indexar);

  function listar(orgId, filtros) {
    orgId = _orgIdPadrao(orgId);
    filtros = _normalizarFiltros(filtros);
    return _ordenar(_base.listar(orgId, filtros));
  }

  function buscarPorId(orgId, id) {
    if (id === undefined) {
      id = orgId;
      orgId = _orgIdPadrao();
    }
    return _base.buscarPorId(_orgIdPadrao(orgId), id);
  }

  function obterPorId(id, orgId) {
    return buscarPorId(_orgIdPadrao(orgId), id);
  }

  function salvar(orgId, tarefa) {
    if (tarefa === undefined && orgId && typeof orgId === 'object') {
      tarefa = orgId;
      orgId = tarefa.orgId || _orgIdPadrao();
    }
    orgId = _orgIdPadrao(orgId);
    tarefa = tarefa || {};
    tarefa.orgId = orgId;
    return _base.salvar(orgId, tarefa);
  }

  function excluir(orgId, id) {
    if (id === undefined) {
      id = orgId;
      orgId = _orgIdPadrao();
    }
    orgId = _orgIdPadrao(orgId);
    var removido = _base.excluir(orgId, id);
    if (removido) {
      try { DataGateway.removerLinhaPorColuna(_SHEET_KEY, _ABA, 0, id); } catch(e) {}
    }
    return removido;
  }

  function listarParaUsuario(orgId, email, papel, filtros, setorGestor) {
    var lista = listar(orgId, filtros);
    papel = String(papel || '').toLowerCase();
    if (_NIVEIS_AMPLOS.indexOf(papel) !== -1) return lista;
    // gestor: vê tarefas do seu setor + as que criou + as que é responsável
    if (papel === 'gestor') {
      return lista.filter(function(t) {
        if (_pertenceAoUsuario(t, email)) return true;
        return setorGestor && String(t.setor || '').trim() === String(setorGestor).trim();
      });
    }
    return lista.filter(function (t) { return _pertenceAoUsuario(t, email); });
  }

  function podeVisualizar(tarefa, email, papel, setorGestor) {
    papel = String(papel || '').toLowerCase();
    if (_NIVEIS_AMPLOS.indexOf(papel) !== -1) return true;
    if (papel === 'gestor' && setorGestor && String(tarefa.setor || '').trim() === String(setorGestor).trim()) return true;
    return _pertenceAoUsuario(tarefa, email);
  }

  function listarAtrasadas(orgId) {
    var agoraMs = Date.now();
    return listar(orgId).filter(function (t) {
      if (!t.prazo) return false;
      if (t.status === 'concluida' || t.status === 'cancelada') return false;
      return new Date(t.prazo).getTime() < agoraMs;
    });
  }

  function protegerIndice() {
    try {
      _garantirCabecalhoIndice();
      var aba = _getSheet(_SHEET_KEY, _ABA);
      var protecoes = aba.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      var existente = protecoes.some(function (p) {
        return p.getDescription && p.getDescription() === 'Indice read-only: tarefas.json e a fonte canonica';
      });
      if (!existente) {
        var p = aba.protect().setDescription('Indice read-only: tarefas.json e a fonte canonica');
        p.setWarningOnly(true);
      }
      return { ok: true, mensagem: 'Indice PESSOAL.Tarefas marcado como somente leitura operacional.' };
    } catch (e) {
      Logger.warn('tarefa_repository', 'protegerIndice', e.message);
      return { ok: false, mensagem: e.message };
    }
  }

  return {
    listar: listar,
    buscarPorId: buscarPorId,
    obterPorId: obterPorId,
    salvar: salvar,
    excluir: excluir,
    indexar: _indexar,
    listarParaUsuario: listarParaUsuario,
    podeVisualizar: podeVisualizar,
    listarAtrasadas: listarAtrasadas,
    protegerIndice: protegerIndice,
    garantirCabecalhoIndice: _garantirCabecalhoIndice
  };

})();
