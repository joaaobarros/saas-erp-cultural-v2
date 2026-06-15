/**
 * @file modules/colaboracao/document_sharing_service.gs
 * @layer modules/colaboracao
 * @description Compartilhamento de documentos com link rastreável (padrão Papermark).
 *
 * Gera token único por documento. Endpoint público serve o conteúdo sem autenticação.
 * Log de visualização registrado em documentos_compartilhados_{orgId}.json.
 * Índice: MASTER.DocumentosCompartilhados.
 *
 * Tipos suportados: 'ata_reuniao' | 'relatorio_acao' | 'contrato'
 *
 * @depends DataLayer.gs, setup.gs
 */

var DocumentSharingService = (function() {

  function _fileName(orgId) { return 'documentos_compartilhados_' + orgId + '.json'; }

  function _gerarToken() {
    return 'DOC_' + Date.now() + '_' + Math.random().toString(36).slice(2,12).toUpperCase();
  }

  // ── Criação de link ──────────────────────────────────────────────────────────

  /**
   * Cria link compartilhável para um documento.
   * @param {string} orgId
   * @param {Object} dados — { tipo, entidadeId, titulo, conteudoHtml, criadoPor, expiraEm? }
   * @returns {{ token, url, doc }}
   */
  function compartilhar(orgId, dados, emailUsuario) {
    var agora = new Date().toISOString();
    var token = _gerarToken();
    var doc = {
      token:       token,
      orgId:       orgId,
      tipo:        dados.tipo,          // 'ata_reuniao' | 'relatorio_acao' | 'contrato'
      entidadeId:  dados.entidadeId,
      titulo:      dados.titulo || 'Documento',
      conteudoHtml: dados.conteudoHtml || '',
      criadoPor:   emailUsuario,
      criadoEm:    agora,
      expiraEm:    dados.expiraEm || null,  // null = sem expiração
      acessos:     []
    };
    modifyJSON(_fileName(orgId), function(lista) {
      if (!Array.isArray(lista)) lista = [];
      lista.push(doc);
      return lista;
    });
    _indexar(orgId, doc);
    var url = ScriptApp.getService().getUrl() + '?secao=doc&token=' + token;
    return { token: token, url: url, doc: _semConteudo(doc) };
  }

  // ── Acesso público ───────────────────────────────────────────────────────────

  /**
   * Valida token e retorna documento, registrando o acesso.
   * Chamado pelo router.gs no case 'doc'.
   */
  function acessar(orgId, token, ip) {
    var lista = readJSON(_fileName(orgId)) || [];
    var idx   = lista.findIndex(function(d) { return d.token === token; });
    if (idx < 0) return null;
    var doc = lista[idx];

    // Verificar expiração
    if (doc.expiraEm && new Date(doc.expiraEm) < new Date()) return { expirado: true };

    // Registrar acesso
    modifyJSON(_fileName(orgId), function(l) {
      if (!Array.isArray(l)) l = [];
      var i2 = l.findIndex(function(d) { return d.token === token; });
      if (i2 >= 0) {
        l[i2].acessos = l[i2].acessos || [];
        l[i2].acessos.push({ timestamp: new Date().toISOString(), ip: ip || '' });
      }
      return l;
    });

    _atualizarIndice(orgId, token, (doc.acessos||[]).length + 1);
    return doc;
  }

  // ── Leitura interna ──────────────────────────────────────────────────────────

  function listarPorEntidade(orgId, entidadeId) {
    var lista = readJSON(_fileName(orgId)) || [];
    return lista
      .filter(function(d) { return d.entidadeId === entidadeId; })
      .map(_semConteudo);
  }

  function revogar(orgId, token) {
    modifyJSON(_fileName(orgId), function(lista) {
      return (lista || []).filter(function(d) { return d.token !== token; });
    });
    return { revogado: true, token: token };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function _semConteudo(doc) {
    return { token: doc.token, tipo: doc.tipo, titulo: doc.titulo, entidadeId: doc.entidadeId,
             criadoPor: doc.criadoPor, criadoEm: doc.criadoEm, expiraEm: doc.expiraEm,
             totalAcessos: (doc.acessos||[]).length };
  }

  function _indexar(orgId, doc) {
    try {
      var props   = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty('SHEET_ID_MASTER');
      if (!sheetId) return;
      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName('DocumentosCompartilhados');
      if (!aba) return;
      aba.appendRow([doc.token, doc.tipo, doc.titulo, doc.entidadeId,
                     doc.criadoPor, 0, doc.criadoEm, doc.expiraEm || '']);
    } catch(e) { console.warn('[DocumentSharingService._indexar] ' + e.message); }
  }

  function _atualizarIndice(orgId, token, totalAcessos) {
    try {
      var props   = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty('SHEET_ID_MASTER');
      if (!sheetId) return;
      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName('DocumentosCompartilhados');
      if (!aba) return;
      var data = aba.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === token) { aba.getRange(i+1,6).setValue(totalAcessos); return; }
      }
    } catch(e) {}
  }

  function prepararIndice() {
    try {
      var props   = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty('SHEET_ID_MASTER');
      if (!sheetId) return;
      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName('DocumentosCompartilhados');
      if (!aba) aba = ss.insertSheet('DocumentosCompartilhados');
      if (aba.getLastRow() === 0) {
        aba.appendRow(['token','tipo','titulo','entidadeId','criadoPor','totalAcessos','criadoEm','expiraEm']);
      }
    } catch(e) { console.warn('[DocumentSharingService.prepararIndice] ' + e.message); }
  }

  return { compartilhar: compartilhar, acessar: acessar, listarPorEntidade: listarPorEntidade,
           revogar: revogar, prepararIndice: prepararIndice };
})();
