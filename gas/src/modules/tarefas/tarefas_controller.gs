/**
 * @file modules/tarefas/tarefas_controller.gs
 * @layer modules/tarefas
 * @description Bridge GAS oficial para o domínio Tarefas.
 */

function _ctrlTarefasContexto() {
  var email = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

function ctrl_tarefas_listar(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    return TarefaRepository.listarParaUsuario(ctx.orgId, ctx.email, ctx.papel, filtros || {});
  }, 'ctrl_tarefas_listar');
}

function ctrl_tarefas_obter(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    var tarefa = TarefaRepository.buscarPorId(ctx.orgId, id);
    if (!tarefa) throw new Error('Tarefa nao encontrada.');
    if (!TarefaRepository.podeVisualizar(tarefa, ctx.email, ctx.papel)) {
      throw new Error('Sem permissao para visualizar esta tarefa.');
    }
    return tarefa;
  }, 'ctrl_tarefas_obter');
}

function ctrl_tarefas_salvar(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    return TarefaEngine.salvar(dados || {}, ctx.email);
  }, 'ctrl_tarefas_salvar');
}

function ctrl_tarefas_criar(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    return TarefaEngine.criar(dados || {}, ctx.email);
  }, 'ctrl_tarefas_criar');
}

function ctrl_tarefas_mudar_status(id, status, comentario) {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    return TarefaEngine.mudarStatus(id, status, comentario || '', ctx.email);
  }, 'ctrl_tarefas_mudar_status');
}

function ctrl_tarefas_comentar(id, texto) {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    return TarefaEngine.comentar(id, texto, ctx.email);
  }, 'ctrl_tarefas_comentar');
}

function ctrl_tarefas_excluir(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    var tarefa = TarefaRepository.buscarPorId(ctx.orgId, id);
    if (!tarefa) throw new Error('Tarefa nao encontrada.');
    if (['admin', 'superadmin', 'gestor'].indexOf(ctx.papel) === -1 && tarefa.criadoPor !== ctx.email) {
      throw new Error('Sem permissao para excluir esta tarefa.');
    }
    return TarefaRepository.excluir(ctx.orgId, id);
  }, 'ctrl_tarefas_excluir');
}

function ctrl_tarefas_metricas() {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    return TarefaEngine.obterMetricas(ctx.email);
  }, 'ctrl_tarefas_metricas');
}

function ctrl_tarefas_migrar_sheet_para_json() {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    if (['admin', 'superadmin'].indexOf(ctx.papel) === -1) {
      throw new Error('Apenas administradores podem executar migracao.');
    }
    return TarefaEngine.migrarSheetParaJson();
  }, 'ctrl_tarefas_migrar_sheet_para_json');
}

/**
 * Utilitário de manutenção da Fase 1.1.
 * Pode ser executado manualmente no editor GAS depois do deploy.
 */
function fase1_tarefas_prepararIndice() {
  return GasResponse.wrap(function () {
    TarefaRepository.garantirCabecalhoIndice();
    return TarefaRepository.protegerIndice();
  }, 'fase1_tarefas_prepararIndice');
}

/**
 * Utilitário de migração da Fase 1.1.
 * Lê PESSOAL.Tarefas e insere em tarefas.json apenas IDs inexistentes.
 */
function fase1_tarefas_migrarSheetParaJson() {
  return GasResponse.wrap(function () {
    return TarefaEngine.migrarSheetParaJson();
  }, 'fase1_tarefas_migrarSheetParaJson');
}
