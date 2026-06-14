/**
 * @file modules/pessoas/encargos_controller.gs
 * @layer modules/pessoas
 * @description Bridge GAS para o domínio Encargos Trabalhistas.
 *
 * Funções públicas: ctrl_encargos_*
 * RBAC: leitura = todos os papéis; escrita = rh | admin | superadmin
 *
 * @depends encargos_engine.gs (EncargosEngine)
 *          encargos_repository.gs (EncargosRepository)
 *          core/services/acesso_service.gs (AcessoService)
 *          shared/response.gs (GasResponse)
 *          core/auth_session.gs (getEmailSessao)
 *          core/config.gs (getOrgConfig)
 */

// ── Helpers internos ──────────────────────────────────────────────────────────

function _ctxEncargos() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  var papel = acesso.registro && acesso.registro.papel ? acesso.registro.papel.toLowerCase() : 'colaborador';
  return { email: email, papel: papel, orgId: getOrgConfig().orgId };
}

function _assertEscritaEncargos(papel) {
  var permitidos = ['superadmin', 'admin', 'rh'];
  if (permitidos.indexOf(papel) < 0)
    throw new Error('Permissão insuficiente. Apenas RH, Admin ou SuperAdmin podem editar encargos.');
}

// ════════════════════════════════════════════════════════════════════════════
// LEITURA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Retorna o documento completo de encargos da organização.
 * Inclui alíquotas, tabelas INSS/IRRF, salário mínimo e histórico resumido.
 */
function ctrl_encargos_listar() {
  return GasResponse.wrap(function () {
    var ctx = _ctxEncargos();
    var doc = EncargosRepository.obter(ctx.orgId);

    // Enriquecer com anos disponíveis, status de atualização e alertas
    var status  = EncargosEngine.verificarNecessidadeAtualizacao(ctx.orgId);
    var alertas = EncargosEngine.gerarAlertas(ctx.orgId);
    return {
      doc:              doc,
      anosDisponiveis:  EncargosEngine.listarAnosDisponiveis(),
      precisaAtualizar: status.precisaAtualizar,
      anoDisponivel:    status.anoDisponivel,
      anoAtivo:         status.anoAtivo,
      alertas:          alertas
    };
  }, 'ctrl_encargos_listar');
}

/**
 * Retorna apenas o histórico de alterações (últimos N registros).
 */
function ctrl_encargos_historico(limite) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEncargos();
    return EncargosRepository.listarHistorico(ctx.orgId, limite || 50);
  }, 'ctrl_encargos_historico');
}

/**
 * Retorna a tabela oficial de um ano específico (sem persistir).
 * Usado pelo frontend para pré-visualizar antes de aplicar.
 */
function ctrl_encargos_preview_oficial(ano) {
  return GasResponse.wrap(function () {
    _ctxEncargos();   // só autentica, qualquer papel pode visualizar
    var tabela = EncargosEngine.obterTabelaOficial(Number(ano));
    if (!tabela) throw new Error('Tabela oficial não disponível para o ano ' + ano + '.');
    return tabela;
  }, 'ctrl_encargos_preview_oficial');
}

// ════════════════════════════════════════════════════════════════════════════
// ESCRITA — edição manual
// ════════════════════════════════════════════════════════════════════════════

/**
 * Edita manualmente uma alíquota simples.
 * @param {{ chave, valor, justificativa }} dados
 *   chave: 'inssPatronal' | 'fgts' | 'pisPasep' | 'sat' | 'sistemaS'
 *   valor: número decimal (ex: 0.08 para 8%)
 */
function ctrl_encargos_salvar_aliquota(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEncargos();
    _assertEscritaEncargos(ctx.papel);

    if (!dados || !dados.chave) throw new Error('Campo "chave" obrigatório.');
    var valor = parseFloat(String(dados.valor).replace(',', '.'));
    if (isNaN(valor) || valor < 0) throw new Error('Valor inválido: ' + dados.valor);

    var doc = EncargosRepository.editarAliquota(
      ctx.orgId, dados.chave, valor, dados.justificativa || '', ctx.email, dados.unidade || null
    );
    return { ok: true, anoAtivo: doc.anoAtivo, atualizadoEm: doc.atualizadoEm };
  }, 'ctrl_encargos_salvar_aliquota');
}

/**
 * Edita manualmente o salário mínimo.
 * @param {{ valor, justificativa }} dados
 */
function ctrl_encargos_salvar_salario_minimo(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEncargos();
    _assertEscritaEncargos(ctx.papel);

    var valor = parseFloat(String((dados || {}).valor || '0').replace(',', '.'));
    if (isNaN(valor) || valor <= 0) throw new Error('Valor de salário mínimo inválido.');

    var doc = EncargosRepository.editarSalarioMinimo(
      ctx.orgId, valor, (dados || {}).justificativa || '', ctx.email
    );
    return { ok: true, anoAtivo: doc.anoAtivo, atualizadoEm: doc.atualizadoEm };
  }, 'ctrl_encargos_salvar_salario_minimo');
}

/**
 * Substitui toda a tabela INSS por uma versão manual.
 * @param {{ tabela: Array<{de,ate,aliquota,descricao}>, justificativa }} dados
 */
function ctrl_encargos_salvar_tabela_inss(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEncargos();
    _assertEscritaEncargos(ctx.papel);

    if (!dados || !Array.isArray(dados.tabela) || dados.tabela.length === 0)
      throw new Error('Tabela INSS inválida ou vazia.');

    var doc = EncargosRepository.editarTabelaINSS(
      ctx.orgId, dados.tabela, dados.justificativa || '', ctx.email
    );
    return { ok: true, faixas: dados.tabela.length, atualizadoEm: doc.atualizadoEm };
  }, 'ctrl_encargos_salvar_tabela_inss');
}

/**
 * Substitui toda a tabela IRRF por uma versão manual.
 * @param {{ tabela: Array<{de,ate,aliquota,deducao,descricao}>, justificativa }} dados
 */
function ctrl_encargos_salvar_tabela_irrf(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEncargos();
    _assertEscritaEncargos(ctx.papel);

    if (!dados || !Array.isArray(dados.tabela) || dados.tabela.length === 0)
      throw new Error('Tabela IRRF inválida ou vazia.');

    var doc = EncargosRepository.editarTabelaIRRF(
      ctx.orgId, dados.tabela, dados.justificativa || '', ctx.email
    );
    return { ok: true, faixas: dados.tabela.length, atualizadoEm: doc.atualizadoEm };
  }, 'ctrl_encargos_salvar_tabela_irrf');
}

/**
 * Restaura um campo específico para o valor oficial (desfaz override manual).
 * @param {{ chave, anoRef }} dados
 */
function ctrl_encargos_restaurar_oficial(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEncargos();
    _assertEscritaEncargos(ctx.papel);

    if (!dados || !dados.chave) throw new Error('Campo "chave" obrigatório.');
    var doc = EncargosRepository.restaurarOficial(
      ctx.orgId, dados.chave, dados.anoRef || null, ctx.email
    );
    return { ok: true, atualizadoEm: doc.atualizadoEm };
  }, 'ctrl_encargos_restaurar_oficial');
}

// ════════════════════════════════════════════════════════════════════════════
// ATUALIZAÇÃO OFICIAL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Busca o salário mínimo atual via BCB API e aplica se houve mudança.
 * Não sobrescreve campos com override manual.
 */
function ctrl_encargos_buscar_online() {
  return GasResponse.wrap(function () {
    var ctx = _ctxEncargos();
    _assertEscritaEncargos(ctx.papel);
    return EncargosEngine.buscarEAtualizarSMOnline(ctx.orgId, ctx.email);
  }, 'ctrl_encargos_buscar_online');
}

/**
 * Aplica a tabela oficial de um ano aos encargos da org.
 * Campos com override manual NÃO são sobrescritos.
 * @param {number} ano — ex: 2025
 */
function ctrl_encargos_aplicar_oficial(ano) {
  return GasResponse.wrap(function () {
    var ctx = _ctxEncargos();
    _assertEscritaEncargos(ctx.papel);

    var anoAlvo = Number(ano) || EncargosEngine.ANO_MAIS_RECENTE;
    return EncargosEngine.atualizarParaAno(ctx.orgId, anoAlvo, ctx.email);
  }, 'ctrl_encargos_aplicar_oficial');
}
