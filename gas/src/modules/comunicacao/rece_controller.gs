/**
 * @file modules/comunicacao/rece_controller.gs
 * @layer modules/comunicacao
 * @description Controllers da Agenda RECE.
 *
 * RBAC: leitura = todos os papéis ativos; escrita = comunicacao, admin, superadmin.
 * Padrão CQRS: ctrl_rece_listar/obter/metricas são leitura pura (cache).
 *              ctrl_rece_salvar/mudar_status/excluir são escrita.
 *
 * @depends rece_engine.gs, acesso_service.gs, gas_response.gs
 */

// ─── Leitura ──────────────────────────────────────────────────────────────────

function ctrl_rece_listar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');

    var orgId  = getOrgConfig().orgId;
    return ReceRepository.listar(orgId, params || {});
  }, 'ctrl_rece_listar');
}

function ctrl_rece_obter(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');

    var orgId = getOrgConfig().orgId;
    var id    = params && params.id;
    if (!id) throw new Error('ID obrigatório');
    var registro = ReceRepository.buscarPorId(orgId, id);
    if (!registro) throw new Error('Registro RECE não encontrado: ' + id);
    return registro;
  }, 'ctrl_rece_obter');
}

function ctrl_rece_metricas(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');

    var orgId = getOrgConfig().orgId;
    return ReceRepository.metricas(orgId);
  }, 'ctrl_rece_metricas');
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

function ctrl_rece_salvar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    _assertPapelRece(acesso.registro && acesso.registro.papel);

    var orgId = getOrgConfig().orgId;
    params    = params || {};

    if (params.id) {
      return ReceEngine.atualizar(params.id, params, email, orgId);
    }
    return ReceEngine.criar(params, email, orgId);
  }, 'ctrl_rece_salvar');
}

function ctrl_rece_mudar_status(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    _assertPapelRece(acesso.registro && acesso.registro.papel);

    var orgId = getOrgConfig().orgId;
    var id    = params && params.id;
    var novoStatus = params && params.status;
    if (!id || !novoStatus) throw new Error('id e status são obrigatórios');

    switch (novoStatus) {
      case 'submetida':  return ReceEngine.submeter(id, email, orgId);
      case 'publicada':  return ReceEngine.publicar(id, email, orgId);
      case 'encerrada':  return ReceEngine.encerrar(id, email, orgId);
      case 'cancelada':  return ReceEngine.cancelar(id, email, orgId, params.motivo || '');
      default: throw new Error('Status inválido: ' + novoStatus);
    }
  }, 'ctrl_rece_mudar_status');
}

function ctrl_rece_excluir(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var papel = acesso.registro && acesso.registro.papel;
    if (!['admin', 'superadmin'].includes(papel)) throw new Error('Apenas admin pode excluir registros RECE.');

    var orgId = getOrgConfig().orgId;
    var id    = params && params.id;
    if (!id) throw new Error('ID obrigatório');

    var registro = ReceRepository.buscarPorId(orgId, id);
    if (!registro) throw new Error('Registro RECE não encontrado: ' + id);
    if (registro.status === 'publicada') throw new Error('Não é possível excluir registro publicado. Cancele primeiro.');

    ReceRepository.excluir(orgId, id);
    AuditoriaService.registrar('RECE_EXCLUIDO', 'comunicacao', { id: id, usuario: email });
    return { ok: true, id: id };
  }, 'ctrl_rece_excluir');
}

function ctrl_rece_upload_imagem(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    _assertPapelRece(acesso.registro && acesso.registro.papel);

    params = params || {};
    if (!params.base64 || !params.nomeArquivo) throw new Error('base64 e nomeArquivo são obrigatórios');
    var url = ReceEngine.uploadImagem(params.base64, params.mimeType || 'image/jpeg', params.nomeArquivo);
    if (!url) throw new Error('Falha ao fazer upload da imagem');
    return { imagemUrl: url };
  }, 'ctrl_rece_upload_imagem');
}

// ─── Observabilidade da fila de eventos ──────────────────────────────────────

function ctrl_eventbus_status(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var papel = acesso.registro && acesso.registro.papel;
    if (!['admin', 'superadmin'].includes(papel)) throw new Error('Acesso negado — requer admin');

    var contagem    = SystemEvents.contarPorStatus();
    var pendentes   = SystemEvents.getPendentes(20);
    var recentes    = SystemEvents.getRecentes(30);
    var handlers    = EventHandlerRegistry.listarTiposRegistrados();

    return {
      contagem:          contagem,
      pendentesRecentes: pendentes,
      eventosRecentes:   recentes,
      tiposComHandlers:  handlers,
      maxTentativas:     3,
      limiteAlerta:      100
    };
  }, 'ctrl_eventbus_status');
}

// ─── Privados ─────────────────────────────────────────────────────────────────

function _assertPapelRece(papel) {
  var permitidos = ['comunicacao', 'admin', 'superadmin'];
  if (permitidos.indexOf(papel) < 0) {
    throw new Error('Acesso negado — requer papel comunicacao, admin ou superadmin.');
  }
}
