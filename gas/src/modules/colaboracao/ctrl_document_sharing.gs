/**
 * @file modules/colaboracao/ctrl_document_sharing.gs
 * @layer modules/colaboracao
 * @description Controller de compartilhamento de documentos (Papermark pattern).
 * @depends document_sharing_service.gs, acesso_service.gs, gas_response.gs
 */

function _ctxDocSharing() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return { email: email, orgId: getOrgConfig().orgId };
}

function ctrl_doc_compartilhar(dados) {
  return GasResponse.wrap(function() {
    var ctx = _ctxDocSharing();
    if (!dados || !dados.tipo || !dados.entidadeId) {
      throw new Error('tipo e entidadeId são obrigatórios.');
    }
    var resultado = DocumentSharingService.compartilhar(ctx.orgId, dados, ctx.email);
    AuditoriaService.registrar('DOCUMENTO_COMPARTILHADO', 'colaboracao', {
      tipo: dados.tipo, entidadeId: dados.entidadeId, token: resultado.token, usuario: ctx.email
    });
    return resultado;
  }, 'ctrl_doc_compartilhar');
}

function ctrl_doc_listar_por_entidade(entidadeId) {
  return GasResponse.wrap(function() {
    var ctx = _ctxDocSharing();
    return DocumentSharingService.listarPorEntidade(ctx.orgId, entidadeId);
  }, 'ctrl_doc_listar_por_entidade');
}

function ctrl_doc_revogar(token) {
  return GasResponse.wrap(function() {
    var ctx = _ctxDocSharing();
    return DocumentSharingService.revogar(ctx.orgId, token);
  }, 'ctrl_doc_revogar');
}

function fase_doc_sharing_prepararIndice() {
  return GasResponse.wrap(function() {
    DocumentSharingService.prepararIndice();
    return { ok: true };
  }, 'fase_doc_sharing_prepararIndice');
}
