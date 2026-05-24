/**
 * @file modules/reunioes/reuniao_controller.gs
 * @layer modules/reunioes
 * @description Controllers de Reuniões — Fase 10.
 *
 * RBAC: leitura = todos ativos; escrita = coordenador+; aprovar ata = convocador ou admin
 *
 * @depends reuniao_engine.gs, reuniao_repository.gs, acesso_service.gs, gas_response.gs
 */

// ─── Leitura ──────────────────────────────────────────────────────────────────

function ctrl_reunioes_listar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    return ReuniaoRepository.listar(getOrgConfig().orgId, params || {});
  }, 'ctrl_reunioes_listar');
}

function ctrl_reunioes_obter(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var id = params && params.id;
    if (!id) throw new Error('ID obrigatório');
    var r = ReuniaoRepository.buscarPorId(getOrgConfig().orgId, id);
    if (!r) throw new Error('Reunião não encontrada: ' + id);
    return r;
  }, 'ctrl_reunioes_obter');
}

function ctrl_reunioes_metricas(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    return ReuniaoRepository.metricas(getOrgConfig().orgId);
  }, 'ctrl_reunioes_metricas');
}

function ctrl_reunioes_listar_encaminhamentos(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var orgId = getOrgConfig().orgId;
    var responsavel = (params && params.responsavel) || null;
    return ReuniaoRepository.listarEncaminhamentosPendentes(orgId, responsavel);
  }, 'ctrl_reunioes_listar_encaminhamentos');
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

function ctrl_reunioes_salvar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    _assertPapelReuniao(acesso.registro && acesso.registro.papel);

    var orgId = getOrgConfig().orgId;
    params = params || {};
    if (params.id) {
      return ReuniaoEngine.atualizar(params.id, params, email, orgId);
    }
    return ReuniaoEngine.criar(params, email, orgId);
  }, 'ctrl_reunioes_salvar');
}

function ctrl_reunioes_mudar_status(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    _assertPapelReuniao(acesso.registro && acesso.registro.papel);

    var id     = params && params.id;
    var status = params && params.status;
    if (!id || !status) throw new Error('ID e status obrigatórios');
    return ReuniaoEngine.mudarStatus(id, status, email, getOrgConfig().orgId);
  }, 'ctrl_reunioes_mudar_status');
}

function ctrl_reunioes_salvar_ata(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    _assertPapelReuniao(acesso.registro && acesso.registro.papel);

    var id   = params && params.id;
    var texto = params && params.textoRascunho;
    if (!id) throw new Error('ID obrigatório');
    return ReuniaoEngine.salvarRascunhoAta(id, texto || '', email, getOrgConfig().orgId);
  }, 'ctrl_reunioes_salvar_ata');
}

function ctrl_reunioes_submeter_ata(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    _assertPapelReuniao(acesso.registro && acesso.registro.papel);

    var id = params && params.id;
    if (!id) throw new Error('ID obrigatório');
    return ReuniaoEngine.submeterAtaParaAprovacao(id, email, getOrgConfig().orgId);
  }, 'ctrl_reunioes_submeter_ata');
}

function ctrl_reunioes_aprovar_ata(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    // Pode ser o convocador da reunião ou admin
    var papel = acesso.registro && acesso.registro.papel;
    if (!['admin','superadmin','gestor','coordenador'].includes(papel)) throw new Error('Sem permissão');

    var id = params && params.id;
    if (!id) throw new Error('ID obrigatório');
    return ReuniaoEngine.aprovarAta(id, email, getOrgConfig().orgId);
  }, 'ctrl_reunioes_aprovar_ata');
}

function ctrl_reunioes_adicionar_encaminhamento(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    _assertPapelReuniao(acesso.registro && acesso.registro.papel);

    var id = params && params.reuniaoId;
    if (!id)              throw new Error('reuniaoId obrigatório');
    if (!params.texto)    throw new Error('Texto do encaminhamento obrigatório');
    if (!params.responsavel) throw new Error('Responsável obrigatório');
    return ReuniaoEngine.adicionarEncaminhamento(id, {
      texto:       params.texto,
      responsavel: params.responsavel,
      prazo:       params.prazo || null
    }, email, getOrgConfig().orgId);
  }, 'ctrl_reunioes_adicionar_encaminhamento');
}

function ctrl_reunioes_concluir_encaminhamento(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');

    var reuniaoId = params && params.reuniaoId;
    var encId     = params && params.encId;
    if (!reuniaoId || !encId) throw new Error('reuniaoId e encId obrigatórios');
    return ReuniaoEngine.concluirEncaminhamento(reuniaoId, encId, email, getOrgConfig().orgId);
  }, 'ctrl_reunioes_concluir_encaminhamento');
}

function ctrl_reunioes_excluir(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var papel = acesso.registro && acesso.registro.papel;
    if (!['admin','superadmin'].includes(papel)) throw new Error('Sem permissão');

    var id = params && params.id;
    if (!id) throw new Error('ID obrigatório');
    AuditoriaService.registrar('REUNIAO_EXCLUIDA', 'reunioes', { id: id, email: email });
    return { ok: ReuniaoRepository.excluir(getOrgConfig().orgId, id, email) };
  }, 'ctrl_reunioes_excluir');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _assertPapelReuniao(papel) {
  var permitidos = ['coordenador','gestor','admin','superadmin','rh','comunicacao','financeiro'];
  if (!papel || !permitidos.includes(papel)) throw new Error('Sem permissão para gerenciar reuniões.');
}
