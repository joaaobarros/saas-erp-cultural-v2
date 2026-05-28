/**
 * @file modules/aprovacoes/aprovacoes_controller.gs
 * @layer modules/aprovacoes
 * @description Controllers (endpoints via google.script.run) para gerenciamento de aprovações.
 *
 * Chamadas disponíveis para frontend:
 *   - ctrl_aprovacoes_listar(filtros)
 *   - ctrl_aprovacoes_obter(id)
 *   - ctrl_aprovacoes_aprovar(id, notas)
 *   - ctrl_aprovacoes_rejeitar(id, motivo)
 *   - ctrl_aprovacoes_metricas()
 *
 * @depends modules/aprovacoes/aprovacoes_engine.gs
 */

/**
 * Lista aprovações (com filtros opcionais).
 */
function ctrl_aprovacoes_listar(filtros) {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    _verificarPermissaoAdmin(email);
    filtros = filtros || {};
    return AprovacoesEngine.listar(filtros);
  }, 'ctrl_aprovacoes_listar');
}

/**
 * Obtém uma aprovação específica.
 */
function ctrl_aprovacoes_obter(id) {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    _verificarPermissaoAdmin(email);
    var aprovacao = AprovacoesEngine.obter(id);
    if (!aprovacao) throw new Error('Aprovação não encontrada: ' + id);
    return aprovacao;
  }, 'ctrl_aprovacoes_obter');
}

/**
 * Aprova uma solicitação.
 */
function ctrl_aprovacoes_aprovar(id, notas) {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    _verificarPermissaoAdmin(email);
    return AprovacoesEngine.aprovar({
      id: id,
      analisadoPor: email,
      notas: notas
    });
  }, 'ctrl_aprovacoes_aprovar');
}

/**
 * Rejeita uma solicitação.
 */
function ctrl_aprovacoes_rejeitar(id, motivo) {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    _verificarPermissaoAdmin(email);
    if (!motivo || motivo.trim().length < 5) {
      throw new Error('Motivo da rejeição deve ter pelo menos 5 caracteres.');
    }
    return AprovacoesEngine.rejeitar({
      id: id,
      analisadoPor: email,
      motivoRejeicao: motivo
    });
  }, 'ctrl_aprovacoes_rejeitar');
}

/**
 * Retorna métricas de aprovações pendentes.
 */
function ctrl_aprovacoes_metricas() {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    _verificarPermissaoAdmin(email);
    return AprovacoesEngine.obterMetricas();
  }, 'ctrl_aprovacoes_metricas');
}

/**
 * Inicia análise de uma aprovação.
 */
function ctrl_aprovacoes_iniciarAnalise(id) {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    _verificarPermissaoAdmin(email);
    return AprovacoesEngine.iniciarAnalise({
      id: id,
      analisadoPor: email
    });
  }, 'ctrl_aprovacoes_iniciarAnalise');
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Verifica se o usuário é admin.
 * Lança erro se não for.
 */
function _verificarPermissaoAdmin(email) {
  if (!email) throw new Error('Sessão inválida.');

  // Tentar verificar via AcessoService primeiro
  var acesso = null;
  try {
    acesso = AcessoService.verificar(email);
  } catch (e) {
    // AcessoService pode não estar disponível
  }

  var papel = acesso && acesso.registro ? (acesso.registro.papel || '') : '';
  var ehAdmin = papel === 'admin' || papel === 'superadmin';

  // Fallback: verificar PropertiesService
  if (!ehAdmin) {
    var superAdmin = (PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '').toLowerCase();
    ehAdmin = superAdmin && email.toLowerCase() === superAdmin;
  }

  if (!ehAdmin) {
    throw new Error('Acesso negado: apenas administradores podem gerenciar aprovações.');
  }
}
