/**
 * @file modules/reunioes/reuniao_controller.gs
 * @layer modules/reunioes
 * @description Controllers de Reuniões — Fase 10.
 *
 * RBAC: leitura = todos ativos; escrita = coordenador+; aprovar ata = convocador ou admin
 *
 * @depends reuniao_engine.gs, reuniao_repository.gs, acesso_service.gs, gas_response.gs
 */

// ─── Cache keys ───────────────────────────────────────────────────────────────

var _CK_RUN_LISTA = 'ctrl_run_lista';

function _invalidarCacheReunioes() {
  AppCache.removeAll([_CK_RUN_LISTA + '_{}']);
}

// ─── Leitura ──────────────────────────────────────────────────────────────────

function ctrl_reunioes_listar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var ck = _CK_RUN_LISTA + '_' + JSON.stringify(params || {});
    var cached = AppCache.get(ck);
    if (cached) return cached;
    var lista = ReuniaoRepository.listar(getOrgConfig().orgId, params || {});
    AppCache.set(ck, lista, 60);
    return lista;
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

/**
 * Retorna lista + métricas em uma única chamada GAS.
 * @param {Object} params — filtros passados ao listar
 */
function ctrl_reunioes_dashboard(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var orgId = getOrgConfig().orgId;
    return {
      lista:    ReuniaoRepository.listar(orgId, params || {}),
      metricas: ReuniaoRepository.metricas(orgId)
    };
  }, 'ctrl_reunioes_dashboard');
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

function ctrl_reunioes_listar_encaminhamentos_gestao(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    return ReuniaoEngine.listarEncaminhamentosGestao(params || {}, getOrgConfig().orgId);
  }, 'ctrl_reunioes_listar_encaminhamentos_gestao');
}

function ctrl_reunioes_metricas_encaminhamentos(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    return ReuniaoEngine.metricasEncaminhamentos(getOrgConfig().orgId);
  }, 'ctrl_reunioes_metricas_encaminhamentos');
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
    var resultado = params.id
      ? ReuniaoEngine.atualizar(params.id, params, email, orgId)
      : ReuniaoEngine.criar(params, email, orgId);
    _invalidarCacheReunioes();
    return resultado;
  }, 'ctrl_reunioes_salvar');
}

function ctrl_reunioes_criar_lote(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    _assertPapelReuniao(acesso.registro && acesso.registro.papel);

    params = params || {};
    var dados = params.dados || {};
    var datas = params.datas || [];
    var resultado = ReuniaoEngine.criarLote(dados, datas, email, getOrgConfig().orgId);
    _invalidarCacheReunioes();
    return resultado;
  }, 'ctrl_reunioes_criar_lote');
}

function ctrl_reunioes_autosalvar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    _assertPapelReuniao(acesso.registro && acesso.registro.papel);

    var id = params && params.id;
    if (!id) throw new Error('ID obrigatório');
    var resultado = ReuniaoEngine.autoSalvar(id, params, email, getOrgConfig().orgId);
    _invalidarCacheReunioes();
    return resultado;
  }, 'ctrl_reunioes_autosalvar');
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
    var resultado = ReuniaoEngine.mudarStatus(id, status, email, getOrgConfig().orgId);
    _invalidarCacheReunioes();
    return resultado;
  }, 'ctrl_reunioes_mudar_status');
}

function ctrl_reunioes_salvar_ata(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    _assertPapelReuniao(acesso.registro && acesso.registro.papel);

    var id    = params && params.id;
    var texto = params && params.textoRascunho;
    if (!id) throw new Error('ID obrigatório');
    var resultado = ReuniaoEngine.salvarRascunhoAta(id, texto || '', email, getOrgConfig().orgId);
    _invalidarCacheReunioes();
    return resultado;
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
    var resultado = ReuniaoEngine.submeterAtaParaAprovacao(id, email, getOrgConfig().orgId);
    _invalidarCacheReunioes();
    return resultado;
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
    var resultado = ReuniaoEngine.aprovarAta(id, email, getOrgConfig().orgId);
    _invalidarCacheReunioes();
    return resultado;
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
    var resultado = ReuniaoEngine.adicionarEncaminhamento(id, {
      texto:       params.texto,
      responsavel: params.responsavel,
      prazo:       params.prazo || null,
      pautaId:     params.pautaId || null
    }, email, getOrgConfig().orgId);
    _invalidarCacheReunioes();
    return resultado;
  }, 'ctrl_reunioes_adicionar_encaminhamento');
}

function ctrl_reunioes_upload_anexo(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    _assertPapelReuniao(acesso.registro && acesso.registro.papel);

    var base64 = params && params.base64;
    if (!base64) throw new Error('Arquivo obrigatório');
    return ReuniaoEngine.uploadAnexo(base64, params.mimeType, params.nomeArquivo);
  }, 'ctrl_reunioes_upload_anexo');
}

function ctrl_reunioes_concluir_encaminhamento(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');

    var reuniaoId = params && params.reuniaoId;
    var encId     = params && params.encId;
    if (!reuniaoId || !encId) throw new Error('reuniaoId e encId obrigatórios');
    var resultado = ReuniaoEngine.concluirEncaminhamento(reuniaoId, encId, email, getOrgConfig().orgId, (params && params.observacao) || null);
    _invalidarCacheReunioes();
    return resultado;
  }, 'ctrl_reunioes_concluir_encaminhamento');
}

function ctrl_reunioes_observar_encaminhamento(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');

    var reuniaoId = params && params.reuniaoId;
    var encId     = params && params.encId;
    var texto     = params && params.texto;
    if (!reuniaoId || !encId) throw new Error('reuniaoId e encId obrigatórios');
    if (!texto)    throw new Error('Texto da observação obrigatório');
    var resultado = ReuniaoEngine.adicionarObservacaoEncaminhamento(reuniaoId, encId, texto, email, getOrgConfig().orgId);
    _invalidarCacheReunioes();
    return resultado;
  }, 'ctrl_reunioes_observar_encaminhamento');
}

function ctrl_reunioes_vincular_calendar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    _assertPapelReuniao(acesso.registro && acesso.registro.papel);

    var id = params && params.id;
    if (!id) throw new Error('ID obrigatório');
    var resultado = ReuniaoEngine.vincularCalendar(id, email, getOrgConfig().orgId);
    _invalidarCacheReunioes();
    return resultado;
  }, 'ctrl_reunioes_vincular_calendar');
}

function ctrl_reunioes_desvincular_calendar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    _assertPapelReuniao(acesso.registro && acesso.registro.papel);

    var id = params && params.id;
    if (!id) throw new Error('ID obrigatório');
    var resultado = ReuniaoEngine.desvincularCalendar(id, email, getOrgConfig().orgId);
    _invalidarCacheReunioes();
    return resultado;
  }, 'ctrl_reunioes_desvincular_calendar');
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
    var resultado = { ok: ReuniaoRepository.excluir(getOrgConfig().orgId, id, email) };
    _invalidarCacheReunioes();
    return resultado;
  }, 'ctrl_reunioes_excluir');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _assertPapelReuniao(papel) {
  var permitidos = ['coordenador','gestor','admin','superadmin','rh','comunicacao','financeiro'];
  if (!papel || !permitidos.includes(papel)) throw new Error('Sem permissão para gerenciar reuniões.');
}
