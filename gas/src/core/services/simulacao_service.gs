/**
 * @file core/services/simulacao_service.gs
 * @layer core/services
 * @description Simulação de papel e permissões granulares para superadmin/admin.
 *
 * Permite testar o sistema na perspectiva de qualquer papel com overrides
 * de permissões por módulo e features individuais, sem alterar dados reais.
 *
 * ARMAZENAMENTO: PropertiesService.getUserProperties() — escopo: usuário × script.
 * Persiste entre chamadas google.script.run da mesma sessão do usuário.
 *
 * INTEGRAÇÃO: AcessoService.verificar() intercepta e retorna registro sintético
 * quando simulação está ativa — todos os _ctx*() recebem permissões simuladas
 * automaticamente, sem alteração nos controllers.
 *
 * @depends core/auth_session.gs, core/data_layer.gs, core/logger.gs,
 *          core/services/permissoes_v2_engine.gs
 */

var SimulacaoService = (function() {

  var _KEY = 'SIMULACAO_ATIVA';

  function _userProps() {
    return PropertiesService.getUserProperties();
  }

  // ── Leitura do contexto ativo ─────────────────────────────────────────────

  /**
   * Retorna o contexto de simulação ativo, ou null se não há simulação.
   * @returns {{ papel, permissoesOverride, featuresOverride, ativadaEm, ativadaPor } | null}
   */
  function getContextoAtivo() {
    try {
      var raw = _userProps().getProperty(_KEY);
      if (!raw) return null;
      var ctx = JSON.parse(raw);
      return (ctx && ctx.papel) ? ctx : null;
    } catch(e) {
      return null;
    }
  }

  // ── Ativação ──────────────────────────────────────────────────────────────

  /**
   * Ativa simulação para o usuário atual.
   * Apenas superadmin ou admin podem ativar.
   *
   * @param {{ papel, permissoesOverride?, featuresOverride? }} params
   *   permissoesOverride: { MODULO: { visualizar?, editar?, excluir? } }
   *   featuresOverride:   { MODULO: { feature_id: boolean } }
   * @returns {{ ok, mensagem, boot? }}
   */
  function ativar(params) {
    var email = getEmailSessao();

    // Validar caller lendo diretamente o arquivo — bypass de AcessoService para evitar loop
    var registros  = _lerRegistrosAcesso();
    var regCaller  = _encontrarRegistro(registros, email);
    var papelCaller = regCaller ? String(regCaller.papel || '') : '';

    var superAdmin = (PropertiesService.getScriptProperties()
      .getProperty('ADMIN_EMAIL') || '').toLowerCase().trim();

    var ehAutorizado = papelCaller === 'superadmin' || papelCaller === 'admin'
                    || (superAdmin && email.toLowerCase().trim() === superAdmin);

    if (!ehAutorizado) {
      return { ok: false, mensagem: 'Apenas admin ou superadmin pode ativar simulação.' };
    }

    var PAPEIS_VALIDOS = typeof PermissoesV2Engine !== 'undefined'
      ? PermissoesV2Engine.PAPEIS_VALIDOS
      : ['colaborador','habilitador','rh','financeiro','comunicacao',
         'coordenador','gestor','admin','superadmin'];

    var papel = String(params.papel || '').toLowerCase().trim();
    if (PAPEIS_VALIDOS.indexOf(papel) === -1) {
      return { ok: false, mensagem: 'Papel inválido: ' + papel };
    }

    // Normalizar overrides — ignorar objetos vazios
    var permOvr = null;
    var featOvr = null;
    if (params.permissoesOverride && typeof params.permissoesOverride === 'object' &&
        Object.keys(params.permissoesOverride).length > 0) {
      permOvr = params.permissoesOverride;
    }
    if (params.featuresOverride && typeof params.featuresOverride === 'object' &&
        Object.keys(params.featuresOverride).length > 0) {
      featOvr = params.featuresOverride;
    }

    var ctx = {
      papel:              papel,
      permissoesOverride: permOvr,
      featuresOverride:   featOvr,
      ativadaEm:          new Date().toISOString(),
      ativadaPor:         email
    };

    _userProps().setProperty(_KEY, JSON.stringify(ctx));
    Logger.info('simulacao_service', 'ativar', email + ' → simulando como: ' + papel);

    return {
      ok:       true,
      mensagem: 'Simulação ativa como: ' + papel,
      boot:     _gerarBootSimulado(ctx)
    };
  }

  // ── Encerramento ──────────────────────────────────────────────────────────

  /**
   * Encerra a simulação ativa para o usuário atual.
   * @returns {{ ok, mensagem }}
   */
  function encerrar() {
    _userProps().deleteProperty(_KEY);
    Logger.info('simulacao_service', 'encerrar',
      getEmailSessao() + ' encerrou simulação.');
    return { ok: true, mensagem: 'Simulação encerrada.' };
  }

  // ── Status ────────────────────────────────────────────────────────────────

  function status() {
    var ctx = getContextoAtivo();
    return ctx ? Object.assign({ ativo: true }, ctx) : { ativo: false, papel: null };
  }

  // ── Bootstrap simulado ────────────────────────────────────────────────────

  /**
   * Gera campos de boot com permissões do contexto simulado.
   * Retornado pelo ctrl_simulacao_ativar para o frontend atualizar _boot sem
   * precisar chamar ctrl_sistema_getBootstrap() novamente.
   */
  function _gerarBootSimulado(ctx) {
    var papel             = ctx.papel;
    var permissoesModulos = {};
    var featuresAtivas    = {};
    var papeisAtribuiveis = [];
    try {
      permissoesModulos = PermissoesV2Engine.mergeOverrides(
        papel, ctx.permissoesOverride || {}
      );
    } catch(e) {}
    try {
      featuresAtivas = PermissoesV2Engine.obterFeaturesPorPapel(
        papel, ctx.featuresOverride || {}
      );
    } catch(e) {}
    try {
      papeisAtribuiveis = PermissoesV2Engine.papeisAtribuiveisPor(papel);
    } catch(e) {}
    return {
      usuarioPapel:      papel,
      permissoesModulos: permissoesModulos,
      featuresAtivas:    featuresAtivas,
      papeisAtribuiveis: papeisAtribuiveis,
      simulando:         true,
      simCtx:            ctx
    };
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  function _lerRegistrosAcesso() {
    try {
      var dados = readJSON('usuarios_acesso.json');
      return Array.isArray(dados) ? dados : [];
    } catch(e) { return []; }
  }

  function _encontrarRegistro(registros, email) {
    var norm = String(email || '').toLowerCase().trim();
    return registros.find(function(r) {
      return String(r.email || '').toLowerCase().trim() === norm;
    }) || null;
  }

  // ── API pública ───────────────────────────────────────────────────────────

  return {
    getContextoAtivo: getContextoAtivo,
    ativar:           ativar,
    encerrar:         encerrar,
    status:           status
  };

})();

// ── Bridge controllers ────────────────────────────────────────────────────────

function ctrl_simulacao_ativar(params) {
  return GasResponse.wrap(function() {
    return SimulacaoService.ativar(params || {});
  }, 'ctrl_simulacao_ativar');
}

function ctrl_simulacao_encerrar() {
  return GasResponse.wrap(function() {
    return SimulacaoService.encerrar();
  }, 'ctrl_simulacao_encerrar');
}

function ctrl_simulacao_status() {
  return GasResponse.wrap(function() {
    return SimulacaoService.status();
  }, 'ctrl_simulacao_status');
}
