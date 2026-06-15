/**
 * @file modules/interatividade/sessao_interativa_repository.gs
 * @layer modules/interatividade
 * @description Repositório de Sessões Interativas (quiz, enquete, brainstorm, Q&A).
 *
 * Sessões: PUBLICO.SessoesInterativas (Sheet índice) + sessoes_interativas_{orgId}.json (Drive)
 * Respostas: PUBLICO.RespostasSessao (Sheet índice) + respostas_sessao_{orgId}.json (Drive)
 *
 * @depends DataLayer.gs, setup.gs
 */

var SessaoInterativaRepository = (function() {

  function _fileSessoes(orgId)   { return 'sessoes_interativas_' + orgId + '.json'; }
  function _fileRespostas(orgId) { return 'respostas_sessao_' + orgId + '.json'; }

  function _gerarId(prefixo) {
    return prefixo + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,8).toUpperCase();
  }

  function _gerarCodigo() {
    // Código de 6 caracteres alfanumérico (fácil de digitar)
    return Math.random().toString(36).slice(2,8).toUpperCase();
  }

  // ── Sessões ─────────────────────────────────────────────────────────────────

  function listarSessoes(orgId, filtros) {
    filtros = filtros || {};
    var lista = readJSON(_fileSessoes(orgId)) || [];
    if (filtros.status) lista = lista.filter(function(s) { return s.status === filtros.status; });
    if (filtros.criadoPor) lista = lista.filter(function(s) { return s.criadoPor === filtros.criadoPor; });
    if (filtros.reuniaoId) lista = lista.filter(function(s) { return s.reuniaoId === filtros.reuniaoId; });
    if (filtros.acaoId)    lista = lista.filter(function(s) { return s.acaoId    === filtros.acaoId; });
    // Não retornar atividades completas na listagem
    return lista.map(function(s) {
      return { id: s.id, titulo: s.titulo, codigo: s.codigo, status: s.status,
               totalAtividades: (s.atividades||[]).length, atividadeAtual: s.atividadeAtual,
               criadoPor: s.criadoPor, criadoEm: s.criadoEm, reuniaoId: s.reuniaoId,
               acaoId: s.acaoId, totalParticipantes: s.totalParticipantes || 0 };
    });
  }

  function buscarSessaoPorId(orgId, id) {
    var lista = readJSON(_fileSessoes(orgId)) || [];
    return lista.find(function(s) { return s.id === id; }) || null;
  }

  function buscarSessaoPorCodigo(orgId, codigo) {
    var lista = readJSON(_fileSessoes(orgId)) || [];
    var upper = String(codigo).toUpperCase().trim();
    return lista.find(function(s) { return s.codigo === upper && s.status === 'ativa'; }) || null;
  }

  function criarSessao(orgId, dados, emailUsuario) {
    var agora = new Date().toISOString();
    var nova = {
      id:              _gerarId('SES'),
      titulo:          dados.titulo || 'Sessão Interativa',
      orgId:           orgId,
      codigo:          _gerarCodigo(),
      status:          'rascunho',   // rascunho → ativa → encerrada
      atividades:      dados.atividades || [],
      atividadeAtual:  -1,           // -1 = aguardando início
      criadoPor:       emailUsuario,
      reuniaoId:       dados.reuniaoId  || null,
      acaoId:          dados.acaoId     || null,
      totalParticipantes: 0,
      criadoEm:        agora,
      atualizadoEm:    agora
    };
    modifyJSON(_fileSessoes(orgId), function(lista) {
      if (!Array.isArray(lista)) lista = [];
      lista.push(nova);
      return lista;
    });
    _indexarSessao(orgId, nova);
    return nova;
  }

  function atualizarSessao(orgId, id, campos) {
    var resultado;
    modifyJSON(_fileSessoes(orgId), function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(s) { return s.id === id; });
      if (idx < 0) throw new Error('Sessão não encontrada: ' + id);
      lista[idx] = Object.assign({}, lista[idx], campos, { atualizadoEm: new Date().toISOString() });
      resultado = lista[idx];
      return lista;
    });
    _indexarSessao(orgId, resultado);
    return resultado;
  }

  // ── Respostas ────────────────────────────────────────────────────────────────

  function registrarResposta(orgId, dados) {
    var agora = new Date().toISOString();
    var resp = {
      id:           _gerarId('RSP'),
      sessaoId:     dados.sessaoId,
      atividadeIdx: dados.atividadeIdx,
      participanteId: dados.participanteId || 'anonimo_' + Math.random().toString(36).slice(2,6),
      participanteNome: dados.participanteNome || 'Anônimo',
      resposta:     dados.resposta,
      timestamp:    agora
    };
    modifyJSON(_fileRespostas(orgId), function(lista) {
      if (!Array.isArray(lista)) lista = [];
      lista.push(resp);
      return lista;
    });
    return resp;
  }

  function buscarRespostas(orgId, sessaoId, atividadeIdx) {
    var lista = readJSON(_fileRespostas(orgId)) || [];
    lista = lista.filter(function(r) { return r.sessaoId === sessaoId; });
    if (atividadeIdx !== undefined && atividadeIdx !== null) {
      lista = lista.filter(function(r) { return r.atividadeIdx === atividadeIdx; });
    }
    return lista;
  }

  function contarParticipantes(orgId, sessaoId) {
    var lista = readJSON(_fileRespostas(orgId)) || [];
    var ids = {};
    lista.filter(function(r) { return r.sessaoId === sessaoId; })
         .forEach(function(r) { ids[r.participanteId] = true; });
    return Object.keys(ids).length;
  }

  // ── Índice ────────────────────────────────────────────────────────────────────

  function _indexarSessao(orgId, sessao) {
    try {
      var props   = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty('SHEET_ID_PUBLICO');
      if (!sheetId) return;
      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName('SessoesInterativas');
      if (!aba) return;
      var data = aba.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === sessao.id) {
          aba.getRange(i+1,1,1,7).setValues([[sessao.id, sessao.titulo, sessao.codigo,
            sessao.status, sessao.criadoPor, sessao.reuniaoId||'', sessao.atualizadoEm]]);
          return;
        }
      }
      aba.appendRow([sessao.id, sessao.titulo, sessao.codigo, sessao.status,
                     sessao.criadoPor, sessao.reuniaoId||'', sessao.criadoEm]);
    } catch(e) { console.warn('[SessaoInterativaRepository] Índice: ' + e.message); }
  }

  function prepararIndice() {
    try {
      var props   = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty('SHEET_ID_PUBLICO');
      if (!sheetId) return;
      var ss = SpreadsheetApp.openById(sheetId);
      ['SessoesInterativas','RespostasSessao'].forEach(function(nome) {
        var aba = ss.getSheetByName(nome);
        if (!aba) aba = ss.insertSheet(nome);
        if (aba.getLastRow() === 0) {
          if (nome === 'SessoesInterativas') {
            aba.appendRow(['id','titulo','codigo','status','criadoPor','reuniaoId','criadoEm']);
          } else {
            aba.appendRow(['id','sessaoId','atividadeIdx','participanteId','participanteNome','timestamp']);
          }
        }
      });
    } catch(e) { console.warn('[SessaoInterativaRepository.prepararIndice] ' + e.message); }
  }

  return {
    listarSessoes: listarSessoes,
    buscarSessaoPorId: buscarSessaoPorId,
    buscarSessaoPorCodigo: buscarSessaoPorCodigo,
    criarSessao: criarSessao,
    atualizarSessao: atualizarSessao,
    registrarResposta: registrarResposta,
    buscarRespostas: buscarRespostas,
    contarParticipantes: contarParticipantes,
    prepararIndice: prepararIndice
  };
})();
