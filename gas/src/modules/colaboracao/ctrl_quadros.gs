/**
 * @file modules/colaboracao/ctrl_quadros.gs
 * @layer modules/colaboracao
 * @description Controller de Quadros Visuais (TLDraw canvas).
 * @depends quadros_repository.gs, acesso_service.gs, gas_response.gs
 */

function _ctxQuadros() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  var orgId = getOrgConfig().orgId;
  var papel = acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador';
  return { email: email, orgId: orgId, papel: papel };
}

function ctrl_quadros_listar(filtros) {
  return GasResponse.wrap(function() {
    var ctx = _ctxQuadros();
    return QuadrosRepository.listar(ctx.orgId, filtros || {});
  }, 'ctrl_quadros_listar');
}

function ctrl_quadros_obter(id) {
  return GasResponse.wrap(function() {
    var ctx    = _ctxQuadros();
    var quadro = QuadrosRepository.buscarPorId(ctx.orgId, id);
    if (!quadro) throw new Error('Quadro não encontrado.');
    return quadro;
  }, 'ctrl_quadros_obter');
}

function ctrl_quadros_salvar(dados) {
  return GasResponse.wrap(function() {
    var ctx = _ctxQuadros();
    if (!dados || (!dados.titulo && !dados.id)) throw new Error('título obrigatório para novo quadro.');
    var r = QuadrosRepository.salvar(ctx.orgId, dados, ctx.email);
    AuditoriaService.registrar(dados.id ? 'QUADRO_ATUALIZADO' : 'QUADRO_CRIADO', 'colaboracao', {
      quadroId: r.id, titulo: r.titulo, usuario: ctx.email
    });
    return r;
  }, 'ctrl_quadros_salvar');
}

function ctrl_quadros_excluir(id) {
  return GasResponse.wrap(function() {
    var ctx    = _ctxQuadros();
    var quadro = QuadrosRepository.buscarPorId(ctx.orgId, id);
    if (!quadro) throw new Error('Quadro não encontrado.');
    if (quadro.criadoPor !== ctx.email && !['admin','superadmin'].includes(ctx.papel)) {
      throw new Error('Sem permissão para excluir este quadro.');
    }
    return QuadrosRepository.excluir(ctx.orgId, id);
  }, 'ctrl_quadros_excluir');
}

function fase_quadros_prepararIndice() {
  return GasResponse.wrap(function() {
    QuadrosRepository.prepararIndice();
    return { ok: true };
  }, 'fase_quadros_prepararIndice');
}
