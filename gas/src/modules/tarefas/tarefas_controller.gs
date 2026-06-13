/**
 * @file modules/tarefas/tarefas_controller.gs
 * @layer modules/tarefas
 * @description Bridge GAS oficial para o domínio Tarefas.
 */

// Cache de leitura — chave inclui email pois tarefas são filtradas por usuário
var _CK_TAREFAS_LISTA    = 'tarefas_lista_';
var _CK_TAREFAS_METRICAS = 'tarefas_metricas_';

function _invalidarCachesTarefas(orgId) {
  try {
    // Não é possível invalidar todas as chaves por usuário de forma eficiente;
    // usamos prefixo de orgId como aproximação conservadora.
    // A chave inclui orgId + email — deixamos expirar naturalmente para chaves de outros users.
    AppCache.remove(_CK_TAREFAS_METRICAS + (orgId || ''));
  } catch(_) {}
}

function _ctrlTarefasContexto() {
  var email = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (acesso.status !== 'ativo') throw new Error('Acesso negado.');
  var papel = acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador';
  var orgId = getOrgConfig().orgId;
  var setor = '';
  try {
    var colab = ColaboradorRepository.buscarPorEmail(orgId, email);
    setor = colab ? (colab.setor || '') : '';
  } catch(e) {}
  return { email: email, papel: papel, orgId: orgId, setor: setor };
}

function ctrl_tarefas_listar(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    var ck = _CK_TAREFAS_LISTA + ctx.orgId + '_' + ctx.email.replace(/[^a-z0-9]/g,'_') + '_' + JSON.stringify(filtros || {});
    var cached = AppCache.get(ck);
    if (cached) return cached;
    var lista = TarefaRepository.listarParaUsuario(ctx.orgId, ctx.email, ctx.papel, filtros || {}, ctx.setor);
    AppCache.set(ck, lista, 60);
    return lista;
  }, 'ctrl_tarefas_listar');
}

function ctrl_tarefas_obter(id) {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    var tarefa = TarefaRepository.buscarPorId(ctx.orgId, id);
    if (!tarefa) throw new Error('Tarefa nao encontrada.');
    if (!TarefaRepository.podeVisualizar(tarefa, ctx.email, ctx.papel, ctx.setor)) {
      throw new Error('Sem permissao para visualizar esta tarefa.');
    }
    return tarefa;
  }, 'ctrl_tarefas_obter');
}

function ctrl_tarefas_salvar(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    var r = TarefaEngine.salvar(dados || {}, ctx.email);
    _invalidarCachesTarefas(ctx.orgId);
    return r;
  }, 'ctrl_tarefas_salvar');
}

function ctrl_tarefas_criar(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    var r = TarefaEngine.criar(dados || {}, ctx.email);
    _invalidarCachesTarefas(ctx.orgId);
    return r;
  }, 'ctrl_tarefas_criar');
}

function ctrl_tarefas_mudar_status(id, status, comentario) {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    var r = TarefaEngine.mudarStatus(id, status, comentario || '', ctx.email);
    _invalidarCachesTarefas(ctx.orgId);
    return r;
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
    var r = TarefaRepository.excluir(ctx.orgId, id);
    _invalidarCachesTarefas(ctx.orgId);
    return r;
  }, 'ctrl_tarefas_excluir');
}

function ctrl_tarefas_metricas() {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    var ck = _CK_TAREFAS_METRICAS + ctx.orgId + '_' + ctx.email.replace(/[^a-z0-9]/g,'_');
    var cached = AppCache.get(ck);
    if (cached) return cached;
    var m = TarefaEngine.obterMetricas(ctx.email);
    AppCache.set(ck, m, 60);
    return m;
  }, 'ctrl_tarefas_metricas');
}

/**
 * Retorna lista + métricas em uma única chamada GAS.
 * As métricas são calculadas da mesma lista já lida — sem segunda leitura de JSON.
 * @param {Object} filtros — passado ao listarParaUsuario
 */
function ctrl_tarefas_dashboard(filtros) {
  return GasResponse.wrap(function () {
    var ctx  = _ctrlTarefasContexto();
    var lista = TarefaRepository.listarParaUsuario(ctx.orgId, ctx.email, ctx.papel, filtros || {}, ctx.setor);
    var now   = Date.now();
    var abertas = lista.filter(function(t) {
      return t.status !== 'concluida' && t.status !== 'cancelada';
    });
    var metricas = {
      total:      lista.length,
      abertas:    abertas.length,
      concluidas: lista.filter(function(t) { return t.status === 'concluida'; }).length,
      bloqueadas: lista.filter(function(t) { return t.status === 'bloqueada'; }).length,
      atrasadas:  abertas.filter(function(t) { return t.prazo && new Date(t.prazo).getTime() < now; }).length
    };
    return { lista: lista, metricas: metricas };
  }, 'ctrl_tarefas_dashboard');
}

/**
 * Retorna tarefas agrupadas por setor e por responsável para a view de gestão.
 * Acesso: gestor (vê seu setor), admin e superadmin (veem tudo).
 */
function ctrl_tarefas_gestao() {
  return GasResponse.wrap(function () {
    var ctx = _ctrlTarefasContexto();
    var papeisPermitidos = ['gestor', 'admin', 'superadmin'];
    if (papeisPermitidos.indexOf(ctx.papel) === -1) throw new Error('Sem permissao para visao de gestao.');

    var lista = TarefaRepository.listarParaUsuario(ctx.orgId, ctx.email, ctx.papel, {}, ctx.setor);
    var now   = Date.now();

    function _metricas(tarefas) {
      var abertas = tarefas.filter(function(t) { return t.status !== 'concluida' && t.status !== 'cancelada'; });
      return {
        total:     tarefas.length,
        abertas:   abertas.length,
        atrasadas: abertas.filter(function(t) { return t.prazo && new Date(t.prazo).getTime() < now; }).length,
        concluidas: tarefas.filter(function(t) { return t.status === 'concluida'; }).length
      };
    }

    // Agrupar por setor
    var setorMap = {};
    lista.forEach(function(t) {
      var s = t.setor || '— sem setor —';
      if (!setorMap[s]) setorMap[s] = [];
      setorMap[s].push(t);
    });
    var porSetor = Object.keys(setorMap).sort().map(function(s) {
      return Object.assign({ setor: s, tarefas: setorMap[s] }, _metricas(setorMap[s]));
    });

    // Agrupar por responsável
    var respMap = {};
    lista.forEach(function(t) {
      var r = t.responsavel || '— sem responsável —';
      if (!respMap[r]) respMap[r] = [];
      respMap[r].push(t);
    });

    // Enriquecer nomes via AcessoService (best-effort)
    var nomeMap = {};
    try {
      var usuarios = AcessoService.listarUsuarios(ctx.orgId) || [];
      usuarios.forEach(function(u) { if (u.email) nomeMap[u.email] = u.nome || u.email; });
    } catch(e) {}

    var porResponsavel = Object.keys(respMap).sort().map(function(r) {
      return Object.assign({ email: r, nome: nomeMap[r] || r, tarefas: respMap[r] }, _metricas(respMap[r]));
    });

    return { porSetor: porSetor, porResponsavel: porResponsavel, total: lista.length };
  }, 'ctrl_tarefas_gestao');
}

function ctrl_tarefas_verificar_prazos() {
  return GasResponse.wrap(function() {
    var ctx = _ctrlTarefasContexto();
    if (['admin', 'superadmin'].indexOf(ctx.papel) === -1) {
      throw new Error('Apenas administradores podem executar esta ação.');
    }
    return TarefaEngine.verificarPrazos(ctx.orgId);
  }, 'ctrl_tarefas_verificar_prazos');
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
