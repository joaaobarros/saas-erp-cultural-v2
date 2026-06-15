/**
 * @file modules/admin/boot_service.gs
 * @layer modules/admin
 * @description Entrypoint do boot do frontend — carrega dados iniciais para a SPA.
 *
 * DIFERENÇA do legado:
 *   - usa _getSheet(spreadsheetKey, nomeAba) com chave de PropertiesService
 *   - usa SistemaConfigService em vez de objetos hardcoded
 *   - usa getEmailSessao() do auth_session.gs
 *   - usa orgId em todas as operações
 *
 * @depends core/auth_session.gs, core/config.gs, core/config_service.gs,
 *          core/services/cache_service.gs, core/services/permissoes_service.gs
 */

var BootService = (function () {

  var _CACHE_PREFIX = 'boot_dados_';
  var _CACHE_TTL    = 300; // segundos — dados de boot mudam raramente (setores, espaços, permissões)

  function _chaveCache(email, orgId) {
    return _CACHE_PREFIX + orgId + '_' + email.replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Entrypoint principal do boot do frontend.
   * Retorna todos os dados necessários para a SPA inicializar sem chamadas adicionais.
   *
   * @returns {object} dados de boot: orgConfig, modulos, usuario, espacos, setores, itens
   */
  function obter() {
    var email  = getEmailSessao();
    var orgId  = getOrgConfig().orgId;

    // Pular cache quando simulação está ativa — dados de permissão mudam dinamicamente
    var _simAtiva = false;
    try {
      if (typeof SimulacaoService !== 'undefined') {
        _simAtiva = !!SimulacaoService.getContextoAtivo();
      }
    } catch(_e) {}

    var cache = CacheService.getScriptCache();
    var chave = _chaveCache(email, orgId);

    if (!_simAtiva) {
      var cached = cache.get(chave);
      if (cached) {
        try {
          var obj = JSON.parse(cached);
          obj.usuarioEmail = email; // sempre atualizar — email pode mudar entre caches
          return obj;
        } catch(e) {}
      }
    }

    var orgConfig    = getPublicOrgConfig();
    var setores      = SistemaConfigService.getSetores();
    var espacos      = _carregarEspacos(orgId);
    var itens        = _carregarItens(orgId);

    var modulosAtivos = SistemaConfigService.getModulosAtivos();

    var tiposAfastamento = [];
    var tiposOcorrencia  = [];
    try {
      tiposAfastamento = SistemaConfigService.getTiposAfastamento ? SistemaConfigService.getTiposAfastamento() : [];
      tiposOcorrencia  = SistemaConfigService.getTiposOcorrencia  ? SistemaConfigService.getTiposOcorrencia()  : [];
    } catch(_e) {}

    var usuarioPapel = 'colaborador';
    var acesso       = null;
    try {
      acesso = AcessoService.verificar(email);
      if (acesso && acesso.registro && acesso.registro.papel) {
        usuarioPapel = acesso.registro.papel;
      }
    } catch(_e) {}

    // Enriquecer dados de exibição a partir do colaborador (fonte única de verdade)
    var colab = null;
    try { colab = ColaboradorRepository.buscarPorEmail(orgId, email); } catch(_e) {}

    // Matriz de permissões por módulo (papel × módulo → {visualizar, editar, excluir})
    // Aplica overrides individuais do registro do usuário, se existirem.
    var permissoesModulos = {};
    try {
      var _overrides = (acesso && acesso.registro && acesso.registro.permissoesOverride) || {};
      permissoesModulos = typeof PermissoesV2Engine !== 'undefined'
        ? PermissoesV2Engine.mergeOverrides(usuarioPapel, _overrides)
        : {};
    } catch(_e) {}

    // Papéis que o usuário pode atribuir (para selects no admin)
    var papeisAtribuiveis = [];
    try {
      papeisAtribuiveis = typeof PermissoesV2Engine !== 'undefined'
        ? PermissoesV2Engine.papeisAtribuiveisPor(usuarioPapel)
        : [];
    } catch(_e) {}

    // Features ativas do usuário (papel + overrides individuais)
    var featuresAtivas = {};
    try {
      var _fovr = (acesso && acesso.registro && acesso.registro.featuresOverride) || {};
      featuresAtivas = typeof PermissoesV2Engine !== 'undefined'
        ? PermissoesV2Engine.obterFeaturesPorPapel(usuarioPapel, _fovr)
        : {};
    } catch(_e) {}

    // Catálogo público de features — necessário no frontend para o modal de edição
    var featuresCatalogo = {};
    try {
      featuresCatalogo = typeof PermissoesV2Engine !== 'undefined' ? PermissoesV2Engine.FEATURES : {};
    } catch(_e) {}

    // Matriz completa papel × módulo — usada pelo SimulacaoUI para pré-preencher defaults
    var matrizCompleta = {};
    try {
      matrizCompleta = typeof PermissoesV2Engine !== 'undefined' ? PermissoesV2Engine.MATRIZ : {};
    } catch(_e) {}

    // Labels legíveis dos módulos para o SimulacaoUI
    var moduloLabels = {};
    try {
      moduloLabels = typeof PermissoesV2Engine !== 'undefined' ? PermissoesV2Engine.MODULO_LABELS : {};
    } catch(_e) {}

    // Lista ordenada dos módulos para exibição na matriz
    var modulosOrdem = [];
    try {
      modulosOrdem = typeof PermissoesV2Engine !== 'undefined' ? PermissoesV2Engine.MODULOS : [];
    } catch(_e) {}

    var resultado = {
      orgId:              orgId,
      orgConfig:          orgConfig,
      usuarioEmail:       email,
      usuarioNome:        (colab && (colab.nomeApelido || colab.nome)) || (acesso && acesso.registro && acesso.registro.nome) || '',
      usuarioNomeApelido: (colab && colab.nomeApelido) || '',
      usuarioDN:          (colab && colab.dataNascimento) ? String(colab.dataNascimento).slice(0, 10) : '',
      usuarioPapel:       usuarioPapel,
      usuarioSetor:       (colab && colab.setor) || (acesso && acesso.registro && acesso.registro.setor) || '',
      usuarioCargo:       (colab && colab.cargo) || '',
      usuarioFoto:        (colab && colab.fotoPerfil) || '',
      permissoesModulos:  permissoesModulos,
      papeisAtribuiveis:  papeisAtribuiveis,
      featuresAtivas:     featuresAtivas,
      featuresCatalogo:   featuresCatalogo,
      matrizCompleta:     matrizCompleta,
      moduloLabels:       moduloLabels,
      modulosOrdem:       modulosOrdem,
      simulando:          _simAtiva,
      modulosAtivos:      modulosAtivos,
      setores:            setores.map(function(s) { return { id: s.id, nome: s.label || s.nome || s.id, cor: s.cor || null }; }),
      espacos:            espacos,
      itens:              itens,
      tiposAfastamento:   tiposAfastamento,
      tiposOcorrencia:    tiposOcorrencia,
      timestamp:          agora()
    };

    if (!_simAtiva) {
      cache.put(chave, JSON.stringify(resultado), _CACHE_TTL);
    }
    Logger.info('boot_service', 'obter', 'Boot OK: ' + email + ' | org: ' + orgId);
    return resultado;
  }

  /**
   * Invalida o cache de boot do usuário.
   * Chamar após operações que alteram espaços, itens ou configurações.
   */
  function limparCache(email) {
    try {
      var orgId = getOrgConfig().orgId;
      CacheService.getScriptCache().remove(_chaveCache(
        String(email || '').trim().toLowerCase(), orgId
      ));
    } catch(e) {}
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  function _carregarEspacos(orgId) {
    try {
      var espacosConf = SistemaConfigService.getEspacos ? SistemaConfigService.getEspacos() : [];
      if (espacosConf.length) return espacosConf;

      var sheet = _getSheet('SHEET_ID_MASTER', 'Configuracoes');
      if (!sheet || sheet.getLastRow() < 2) return [];

      var nCols  = Math.min(sheet.getLastColumn(), 13);
      var dados  = sheet.getRange(2, 1, sheet.getLastRow() - 1, nCols).getValues();
      return dados.reduce(function(acc, r) {
        var id   = String(r[0] || '').trim();
        var nome = String(r[1] || '').trim();
        if (!id || !nome) return acc;
        acc.push({
          id:            id,
          nome:          nome,
          orgId:         orgId,
          possuiChaves:  r.length > 5 ? String(r[5]).toLowerCase() === 'true' : false,
          aceitaReserva: r.length > 8 ? String(r[8]).toLowerCase() !== 'false' : true
        });
        return acc;
      }, []);
    } catch(e) {
      Logger.warn('boot_service', '_carregarEspacos', e.message);
      return [];
    }
  }

  function _carregarItens(orgId) {
    try {
      var sheet = _getSheet('SHEET_ID_MASTER', 'Itens');
      if (!sheet || sheet.getLastRow() < 2) return [];
      return sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues()
        .filter(function(r) { return String(r[0] || '').trim(); })
        .map(function(r) {
          return {
            id:         String(r[0]).trim(),
            nome:       String(r[1] || '').trim(),
            categoria:  String(r[2] || '').trim(),
            quantidade: Number(r[3]) || 0,
            disponivel: r[4] !== false && String(r[4]).toLowerCase() !== 'false',
            orgId:      orgId
          };
        });
    } catch(e) {
      Logger.warn('boot_service', '_carregarItens', e.message);
      return [];
    }
  }

  return {
    obter:       obter,
    limparCache: limparCache
  };

})();
