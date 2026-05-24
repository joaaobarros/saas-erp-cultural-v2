/**
 * @file modules/admin/logo_paleta_service.gs
 * @layer modules/admin
 * @description CRUD de identidade visual: logomarca e paleta de cores.
 *
 * FONTE DE VERDADE: config_org.json (campos `logoUrl` e `paleta`)
 * FALLBACK: PropertiesService.ORG_LOGO_URL (compatibilidade legada)
 *
 * FLUXO TÍPICO:
 *   1. Admin abre painel de Identidade Visual
 *   2. Informa URL do logo (Google Drive público, CDN, etc.)
 *   3. Frontend extrai cores dominantes via canvas (sem round-trip ao servidor)
 *   4. Admin ajusta as 3 cores principais (primária, destaque, sidebar)
 *   5. Clica em Salvar → salvarLogoPaleta() persiste em config_org.json
 *   6. Próximo boot já carrega a nova identidade
 *
 * PERMISSÃO: todas as operações de escrita exigem papel 'admin' ou 'superadmin'.
 *
 * @depends core/auth_session.gs, core/config_service.gs, core/data_layer.gs,
 *          core/logger.gs, core/services/auditoria_service.gs
 */

var LogoPaletaService = (function () {

  var _ARQUIVO_CONFIG = 'config_org.json';

  // Cores semânticas fixas — NÃO variam com a identidade visual da org
  var _CORES_SEMANTICAS = {
    erro:       '#c62828',
    sucesso:    '#2e7d32',
    aviso:      '#ef6c00',
    texto:      '#212121',
    textoClaro: '#757575',
    borda:      '#e0e0e0'
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _assertAdmin() {
    var email = getEmailSessao();
    // superadmin via PropertiesService sempre pode
    var superAdmin = (PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '').toLowerCase();
    if (email.toLowerCase() === superAdmin) return;
    if (typeof AcessoService !== 'undefined') {
      var status = AcessoService.verificar(email);
      if (status.status !== 'ativo' || !status.registro || status.registro.papel !== 'admin') {
        throw new Error('Sem permissão de admin para alterar identidade visual.');
      }
    }
  }

  function _lerConfigOrg() {
    try {
      var dados = readJSON(_ARQUIVO_CONFIG);
      return (dados && typeof dados === 'object' && !Array.isArray(dados)) ? dados : {};
    } catch (e) {
      return {};
    }
  }

  function _validarHex(cor) {
    return typeof cor === 'string' && /^#[0-9a-fA-F]{6}$/.test(cor.trim());
  }

  function _validarPaleta(paleta) {
    if (!paleta || typeof paleta !== 'object') return false;
    var obrigatorias = ['primaria', 'primariaClara', 'primariaEscura', 'secundaria', 'destaque', 'sidebar', 'sidebarTexto'];
    return obrigatorias.every(function (k) { return !paleta[k] || _validarHex(paleta[k]); });
  }

  // ── API pública ────────────────────────────────────────────────────────────

  /**
   * Retorna a identidade visual atual: logoUrl + paleta + coresSemânticas.
   * Usado pelo painel admin para popular o editor.
   */
  function obter() {
    var cfg = _lerConfigOrg();
    return {
      logoUrl:               SistemaConfigService.getLogoUrl(),
      paleta:                SistemaConfigService.getPaleta(),
      coresSemanticas:       _CORES_SEMANTICAS,
      nomeInstituicao:       cfg.nomeInstituicao       || '',
      apresentacaoInstituicao: cfg.apresentacaoInstituicao || ''
    };
  }

  /**
   * Salva logo e/ou paleta em config_org.json.
   * Invalida cache do SistemaConfigService após salvar.
   *
   * @param {{ logoUrl?: string, paleta?: object }} dados
   * @returns {{ ok: boolean, mensagem: string, identidade: object }}
   */
  function salvar(dados) {
    _assertAdmin();

    if (!dados || (dados.logoUrl === undefined && !dados.paleta && dados.nomeInstituicao === undefined && dados.apresentacaoInstituicao === undefined)) {
      return { ok: false, mensagem: 'Nenhum dado informado para salvar.' };
    }

    // Validar URL do logo (aceita http/https e data: base64)
    if (dados.logoUrl !== undefined) {
      var url = String(dados.logoUrl || '').trim();
      if (url && !url.startsWith('http') && !url.startsWith('data:image/')) {
        return { ok: false, mensagem: 'Logo inválido. Envie uma imagem ou uma URL http(s).' };
      }
    }

    // Validar paleta
    if (dados.paleta && !_validarPaleta(dados.paleta)) {
      return { ok: false, mensagem: 'Paleta inválida. Todas as cores devem ser hex (#rrggbb).' };
    }

    try {
      var configAtual = _lerConfigOrg();

      // Atualizar logoUrl
      if (dados.logoUrl !== undefined) {
        configAtual.logoUrl = String(dados.logoUrl || '').trim();
        // PropertiesService só suporta ~9KB — nunca gravar base64 lá
        if (!configAtual.logoUrl.startsWith('data:')) {
          try {
            PropertiesService.getScriptProperties().setProperty('ORG_LOGO_URL', configAtual.logoUrl);
          } catch(_) {}
        }
      }

      // Atualizar paleta (merge com campos individuais)
      if (dados.paleta) {
        var paletaAtual = configAtual.paleta || {};
        var campos = ['primaria', 'primariaClara', 'primariaEscura', 'secundaria', 'destaque', 'sidebar', 'sidebarTexto'];
        campos.forEach(function (k) {
          if (dados.paleta[k] && _validarHex(dados.paleta[k])) {
            paletaAtual[k] = dados.paleta[k].toLowerCase();
          }
        });
        configAtual.paleta = paletaAtual;
      }

      // Atualizar nome e apresentação da instituição
      if (dados.nomeInstituicao !== undefined) {
        configAtual.nomeInstituicao = String(dados.nomeInstituicao || '').trim();
      }
      if (dados.apresentacaoInstituicao !== undefined) {
        configAtual.apresentacaoInstituicao = String(dados.apresentacaoInstituicao || '').trim();
      }

      saveJSON(_ARQUIVO_CONFIG, configAtual);
      SistemaConfigService.invalidarCache();
      invalidarCacheOrgConfig();

      var email = getEmailSessao();
      var logoLog = dados.logoUrl === undefined ? 'sem alteração'
        : !dados.logoUrl ? '(removido)'
        : dados.logoUrl.startsWith('data:') ? '[base64 ' + Math.round(dados.logoUrl.length * 3 / 4 / 1024) + 'KB]'
        : dados.logoUrl;
      Logger.info('logo_paleta_service', 'salvar',
        'Identidade visual atualizada por ' + email +
        ' | logo: ' + logoLog +
        ' | paleta: ' + (dados.paleta ? JSON.stringify(dados.paleta) : 'sem alteração'));

      if (typeof AuditoriaService !== 'undefined') {
        AuditoriaService.registrar('IDENTIDADE_VISUAL_ATUALIZADA', 'config_org', {
          entidadeId: 'logo_paleta',
          usuario:    email,
          detalhe:    JSON.stringify({ logoAlterado: dados.logoUrl !== undefined, paletaAlterada: !!dados.paleta })
        });
      }

      return {
        ok:         true,
        mensagem:   'Identidade visual salva com sucesso.',
        identidade: obter()
      };

    } catch (e) {
      Logger.error('logo_paleta_service', 'salvar', e.message);
      return { ok: false, mensagem: 'Erro ao salvar: ' + e.message };
    }
  }

  /**
   * Remove o logo (define como URL vazia).
   */
  function removerLogo() {
    return salvar({ logoUrl: '' });
  }

  /**
   * Restaura a paleta padrão do sistema (não altera o logo).
   */
  function restaurarPaletaPadrao() {
    _assertAdmin();
    var configAtual = _lerConfigOrg();
    delete configAtual.paleta;
    try {
      saveJSON(_ARQUIVO_CONFIG, configAtual);
      SistemaConfigService.invalidarCache();
    } catch (e) {
      return { ok: false, mensagem: 'Erro ao restaurar paleta: ' + e.message };
    }
    return { ok: true, mensagem: 'Paleta restaurada para o padrão.', identidade: obter() };
  }

  return {
    obter:                 obter,
    salvar:                salvar,
    removerLogo:           removerLogo,
    restaurarPaletaPadrao: restaurarPaletaPadrao
  };

})();

// ── Bridge global (chamados via google.script.run) ─────────────────────────────

function ctrl_admin_getIdentidade() {
  return GasResponse.wrap(function () {
    return LogoPaletaService.obter();
  }, 'ctrl_admin_getIdentidade');
}

function ctrl_admin_salvarIdentidade(dados) {
  return GasResponse.wrap(function () {
    return LogoPaletaService.salvar(dados);
  }, 'ctrl_admin_salvarIdentidade');
}

function ctrl_admin_removerLogo() {
  return GasResponse.wrap(function () {
    return LogoPaletaService.removerLogo();
  }, 'ctrl_admin_removerLogo');
}

function ctrl_admin_restaurarPaletaPadrao() {
  return GasResponse.wrap(function () {
    return LogoPaletaService.restaurarPaletaPadrao();
  }, 'ctrl_admin_restaurarPaletaPadrao');
}
