/**
 * @file modules/admin/config_admin_service.gs
 * @layer modules/admin
 * @description CRUD administrativo de configurações organizacionais.
 *
 * RESPONSABILIDADES:
 *   - Espaços: criar, editar, ativar/desativar, definir horários e responsáveis
 *   - Setores: criar, editar (delegado ao config_org.json via SistemaConfigService)
 *   - Turnos: cadastrar turnos e responsáveis por turno/espaço
 *   - Módulos: ativar/desativar módulos do sistema (delegado ao ModulosRegistryService)
 *
 * PERMISSÃO: todas as operações exigem papel 'admin' ou 'superadmin'.
 *
 * @depends core/auth_session.gs, core/config.gs, core/config_service.gs,
 *          core/services/permissoes_service.gs, core/services/auditoria_service.gs
 */

var ConfigAdminService = (function () {

  // ─── Espaços ──────────────────────────────────────────────────────────────

  /**
   * Lista todos os espaços configurados.
   * Fonte: MASTER.Configuracoes + SistemaConfigService.getEspacos()
   */
  function listarEspacos() {
    _assertAdmin();
    return SistemaConfigService.getEspacos ? SistemaConfigService.getEspacos() : _lerEspacosSheet();
  }

  /**
   * Cria ou atualiza um espaço.
   * @param {object} espaco — { id?, nome, descricao, capacidade, possuiChaves, aceitaReserva,
   *                            horarioFuncionamento, responsaveis, bloqueios }
   *
   * responsaveis — array de entradas de prioridade de setor:
   *   [{ setorId, emails: string[], turnos: string[], dias: number[] }]
   *   Qualquer um dos emails listados pode aprovar solicitações no slot configurado.
   *   Outros setores que tentarem reservar no slot serão forçados a solicitar aprovação.
   */
  function salvarEspaco(espaco) {
    _assertAdmin();
    var orgId = getOrgConfig().orgId;
    var email = getEmailSessao();

    if (!espaco || !espaco.nome) throw new Error('Nome do espaço é obrigatório.');

    var id = espaco.id || gerarId('esp');
    var agora_ = agora();

    // Normalizar responsaveis: garantir que emails seja sempre array, remover entradas vazias
    var responsaveis = (espaco.responsaveis || espaco.responsaveisPorTurno || [])
      .map(function(r) {
        var emails = Array.isArray(r.emails) ? r.emails
          : (r.email ? [r.email] : []);
        emails = emails.map(function(e) { return String(e).trim().toLowerCase(); })
                       .filter(function(e) { return e.indexOf('@') > 0; });
        return {
          setorId: r.setorId || '',
          emails:  emails,
          turnos:  Array.isArray(r.turnos) ? r.turnos : (r.turno ? [r.turno] : []),
          dias:    Array.isArray(r.dias)   ? r.dias   : []
        };
      })
      .filter(function(r) { return r.emails.length > 0; });

    var registro = {
      id:                     id,
      orgId:                  orgId,
      nome:                   String(espaco.nome).trim(),
      numeroPlanta:           espaco.numeroPlanta != null ? String(espaco.numeroPlanta).trim() : undefined,
      tipoEspaco:             espaco.tipoEspaco || 'multiuso',
      categoria:              espaco.categoria  || 'uso_publico',
      descricao:              String(espaco.descricao || '').trim(),
      capacidade:             Number(espaco.capacidade) || 0,
      possuiChaves:           espaco.possuiChaves === true,
      aceitaReserva:          espaco.aceitaReserva !== false,
      horarioFuncionamento:   espaco.horarioFuncionamento || { abertura: '08:00', fechamento: '22:00' },
      responsaveis:           responsaveis,
      itensFixos:             espaco.itensFixos || {},
      equipamentosVinculados: espaco.equipamentosVinculados || [],
      tags:                   espaco.tags || [],
      bloqueios:              espaco.bloqueios || [],
      mapaConfig:             espaco.mapaConfig || null,
      ativo:                  espaco.ativo !== false,
      criadoEm:               espaco.criadoEm || agora_,
      atualizadoEm:           agora_,
      criadoPor:              espaco.criadoPor || email,
      versao:                 (espaco.versao || 0) + 1
    };

    modifyJSON('espacos_config.json', function(lista) {
      var idx = lista.findIndex(function(e) { return e.id === id && e.orgId === orgId; });
      if (idx >= 0) {
        lista[idx] = registro;
      } else {
        lista.push(registro);
      }
      return lista;
    });

    if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();
    if (typeof BootService !== 'undefined') BootService.limparCache(email);

    AuditoriaService.registrar('ESPACO_SALVO', 'espaco',
      { entidadeId: id, orgId: orgId, usuario: email, nome: registro.nome, ativo: registro.ativo });

    Logger.info('config_admin_service', 'salvarEspaco', id + ': ' + registro.nome);
    return registro;
  }

  /**
   * Atualiza apenas o campo mapaConfig de um espaço,
   * preservando todos os demais campos da configuração existente.
   *
   * @param {Object} params  { id: string, mapaConfig: Object|null }
   * @returns {{ id: string, nome: string }}
   */
  function salvarMapaEspaco(params) {
    _assertAdmin();
    var orgId = getOrgConfig().orgId;
    var email = getEmailSessao();

    if (!params || !params.id) throw new Error('ID do espaço é obrigatório.');

    var registro;
    modifyJSON('espacos_config.json', function(lista) {
      var idx = lista.findIndex(function(e) {
        return e.id === params.id && e.orgId === orgId;
      });
      if (idx < 0) throw new Error('Espaço não encontrado: ' + params.id);
      lista[idx] = JSON.parse(JSON.stringify(lista[idx]));
      lista[idx].mapaConfig   = params.mapaConfig || null;
      lista[idx].atualizadoEm = agora();
      lista[idx].versao       = (lista[idx].versao || 0) + 1;
      registro = lista[idx];
      return lista;
    });

    if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();
    if (typeof BootService         !== 'undefined') BootService.limparCache(email);

    AuditoriaService.registrar('ESPACO_MAPA_SALVO', 'espaco', {
      entidadeId: params.id,
      orgId:      orgId,
      usuario:    email,
      temMapa:    !!params.mapaConfig
    });

    Logger.info('config_admin_service', 'salvarMapaEspaco',
      params.id + ' temMapa=' + !!params.mapaConfig);

    return { id: params.id, nome: registro && registro.nome };
  }

  /**
   * Desativa um espaço (não exclui — preserva histórico de reservas).
   */
  function desativarEspaco(espacoId) {
    _assertAdmin();
    var orgId = getOrgConfig().orgId;
    var email = getEmailSessao();

    modifyJSON('espacos_config.json', function(lista) {
      var espaco = lista.find(function(e) { return e.id === espacoId && e.orgId === orgId; });
      if (!espaco) throw new Error('Espaço não encontrado: ' + espacoId);
      espaco.ativo = false;
      espaco.atualizadoEm = agora();
      return lista;
    });

    if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();
    AuditoriaService.registrar('ESPACO_DESATIVADO', 'espaco',
      { entidadeId: espacoId, orgId: orgId, usuario: email });
    return true;
  }

  /**
   * Exclui um espaço permanentemente do JSON.
   * Atenção: não verifica reservas existentes — uso exclusivo do admin.
   */
  function excluirEspaco(espacoId) {
    _assertAdmin();
    var orgId = getOrgConfig().orgId;
    var email = getEmailSessao();
    var nomeSalvo = '';

    modifyJSON('espacos_config.json', function(lista) {
      var idx = lista.findIndex(function(e) { return e.id === espacoId && e.orgId === orgId; });
      if (idx < 0) throw new Error('Espaço não encontrado: ' + espacoId);
      nomeSalvo = lista[idx].nome || espacoId;
      lista.splice(idx, 1);
      return lista;
    });

    if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();
    if (typeof BootService         !== 'undefined') BootService.limparCache(email);
    AuditoriaService.registrar('ESPACO_EXCLUIDO', 'espaco',
      { entidadeId: espacoId, orgId: orgId, usuario: email, nome: nomeSalvo });
    Logger.info('config_admin_service', 'excluirEspaco', espacoId + ': ' + nomeSalvo);
    return true;
  }

  // ─── Turnos ───────────────────────────────────────────────────────────────

  /**
   * Lista turnos configurados (delegado ao SistemaConfigService).
   */
  function listarTurnos() {
    _assertAdmin();
    return SistemaConfigService.getTurnos();
  }

  /**
   * Salva configuração de turno (nome, início, fim, dias da semana).
   * @param {object} turno — { id?, nome, inicio, fim, dias[] }
   */
  function salvarTurno(turno) {
    _assertAdmin();
    var orgId = getOrgConfig().orgId;
    var email = getEmailSessao();

    if (!turno || !turno.nome || !turno.inicio || !turno.fim)
      throw new Error('Turno requer nome, inicio e fim.');

    var id = turno.id || gerarId('trn');
    var registro = {
      id:    id,
      orgId: orgId,
      nome:  String(turno.nome).trim(),
      inicio: String(turno.inicio).trim(),
      fim:    String(turno.fim).trim(),
      dias:   turno.dias || ['seg','ter','qua','qui','sex'],
      ativo:  turno.ativo !== false,
      atualizadoEm: agora()
    };

    modifyJSON('turnos_config.json', function(lista) {
      var idx = lista.findIndex(function(t) { return t.id === id && t.orgId === orgId; });
      if (idx >= 0) lista[idx] = registro; else lista.push(registro);
      return lista;
    });

    if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();
    AuditoriaService.registrar('TURNO_SALVO', 'turno',
      { entidadeId: id, orgId: orgId, usuario: email, nome: registro.nome });
    return registro;
  }

  // ─── Setores ──────────────────────────────────────────────────────────────

  /**
   * Lista setores (delegado ao SistemaConfigService).
   */
  function listarSetores() {
    _assertAdmin();
    return SistemaConfigService.getSetores();
  }

  /**
   * Salva um setor no config_org.json.
   * @param {object} setor — { id?, nome, cor, modulosPrioritarios[], permissaoBase }
   */
  function salvarSetor(setor) {
    _assertAdmin();
    var orgId = getOrgConfig().orgId;
    var email = getEmailSessao();

    if (!setor || !setor.nome) throw new Error('Nome do setor é obrigatório.');
    var id = setor.id || slugify(setor.nome);

    modifyJSON('setores_config.json', function(lista) {
      var idx = lista.findIndex(function(s) { return s.id === id && s.orgId === orgId; });
      var registro = Object.assign({}, setor, { id: id, orgId: orgId, atualizadoEm: agora() });
      if (idx >= 0) lista[idx] = registro; else lista.push(registro);
      return lista;
    });

    if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();
    AuditoriaService.registrar('SETOR_SALVO', 'setor',
      { entidadeId: id, orgId: orgId, usuario: email, nome: setor.nome });
    return id;
  }

  /**
   * Exclui (soft-delete) um turno pelo id.
   */
  function excluirTurno(turnoId) {
    _assertAdmin();
    var orgId = getOrgConfig().orgId;
    var email = getEmailSessao();
    modifyJSON('turnos_config.json', function(lista) {
      var t = lista.find(function(x) { return x.id === turnoId && x.orgId === orgId; });
      if (!t) throw new Error('Turno não encontrado: ' + turnoId);
      t.ativo = false;
      t.atualizadoEm = agora();
      return lista;
    });
    if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();
    AuditoriaService.registrar('TURNO_EXCLUIDO', 'turno',
      { entidadeId: turnoId, orgId: orgId, usuario: email });
    return true;
  }

  /**
   * Exclui (soft-delete) um setor pelo id.
   */
  function excluirSetor(setorId) {
    _assertAdmin();
    var orgId = getOrgConfig().orgId;
    var email = getEmailSessao();
    modifyJSON('setores_config.json', function(lista) {
      var s = lista.find(function(x) { return x.id === setorId && x.orgId === orgId; });
      if (!s) throw new Error('Setor não encontrado: ' + setorId);
      s.ativo = false;
      s.atualizadoEm = agora();
      return lista;
    });
    if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();
    AuditoriaService.registrar('SETOR_EXCLUIDO', 'setor',
      { entidadeId: setorId, orgId: orgId, usuario: email });
    return true;
  }

  // ─── Módulos ──────────────────────────────────────────────────────────────

  /**
   * Lista todos os módulos disponíveis com status ativo/inativo.
   */
  function listarModulos() {
    _assertAdmin();
    if (typeof ModulosRegistryService !== 'undefined')
      return ModulosRegistryService.listarTodos();
    return [];
  }

  /**
   * Ativa ou desativa um módulo.
   */
  function toggleModulo(moduloId, ativo) {
    _assertAdmin();
    if (typeof ModulosRegistryService === 'undefined')
      throw new Error('ModulosRegistryService não disponível.');
    var email = getEmailSessao();
    var orgId = getOrgConfig().orgId;
    ModulosRegistryService.setAtivo(moduloId, ativo, orgId);
    AuditoriaService.registrar(
      ativo ? 'MODULO_ATIVADO' : 'MODULO_DESATIVADO',
      'modulo', { entidadeId: moduloId, orgId: orgId, usuario: email }
    );
    return true;
  }

  // ─── Itens Fixos por Espaço ───────────────────────────────────────────────

  /**
   * Fixa ou libera um item em um espaço (mapa itensFixos).
   * @param {object} dados — { espacoId, itemId, quantidade, acao: 'fixar'|'liberar' }
   */
  function alternarItemFixo(dados) {
    _assertAdmin();
    if (!dados || !dados.espacoId || !dados.itemId)
      throw new Error('alternarItemFixo requer espacoId e itemId.');
    var orgId = getOrgConfig().orgId;
    var email = getEmailSessao();
    var resultado = null;

    modifyJSON('espacos_config.json', function(lista) {
      var espaco = lista.find(function(e) { return e.id === dados.espacoId && e.orgId === orgId; });
      if (!espaco) throw new Error('Espaço não encontrado: ' + dados.espacoId);
      if (!espaco.itensFixos) espaco.itensFixos = {};
      if (dados.acao === 'liberar' || !dados.quantidade || dados.quantidade <= 0) {
        delete espaco.itensFixos[dados.itemId];
      } else {
        espaco.itensFixos[dados.itemId] = Number(dados.quantidade);
      }
      espaco.atualizadoEm = agora();
      resultado = espaco.itensFixos;
      return lista;
    });

    if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();
    AuditoriaService.registrar('ITEM_FIXO_ALTERADO', 'espaco',
      { entidadeId: dados.espacoId, itemId: dados.itemId, acao: dados.acao || 'fixar',
        quantidade: dados.quantidade, orgId: orgId, usuario: email });
    return resultado;
  }

  /**
   * Retorna o responsável de um espaço para um dia da semana.
   * @param {string} espacoId
   * @param {number} diaSemana — 0=domingo … 6=sábado
   * @returns {string|null} email do responsável
   */
  /** @deprecated — usar SistemaConfigService.resolverResponsaveis() */
  function obterResponsavelEspacoPorDia(espacoId, diaSemana) {
    var resultado = SistemaConfigService.resolverResponsaveis(espacoId, diaSemana, null);
    return resultado && resultado.emails.length ? resultado.emails[0] : null;
  }

  // ─── Categorias de Itens ──────────────────────────────────────────────────

  /**
   * Lista categorias de itens de almoxarifado.
   */
  function listarCategoriasItens() {
    _assertAdmin();
    try {
      var orgId = getOrgConfig().orgId;
      var lista = readJSON('categorias_itens_config.json');
      return Array.isArray(lista)
        ? lista.filter(function(c) { return c.orgId === orgId && c.ativo !== false; })
        : [];
    } catch(e) { return []; }
  }

  /**
   * Cria ou atualiza uma categoria de item de almoxarifado.
   */
  function salvarCategoriaItem(dados) {
    _assertAdmin();
    if (!dados || !dados.nome) throw new Error('Nome da categoria é obrigatório.');
    var orgId = getOrgConfig().orgId;
    var email = getEmailSessao();
    var id = dados.id || gerarId('cat');

    modifyJSON('categorias_itens_config.json', function(lista) {
      var idx = lista.findIndex(function(c) { return c.id === id && c.orgId === orgId; });
      var registro = { id: id, orgId: orgId, nome: String(dados.nome).trim(),
        descricao: String(dados.descricao || '').trim(), ativo: dados.ativo !== false,
        atualizadoEm: agora(), criadoPor: dados.criadoPor || email };
      if (idx >= 0) lista[idx] = registro; else lista.push(registro);
      return lista;
    });

    AuditoriaService.registrar('CATEGORIA_ITEM_SALVA', 'admin',
      { entidadeId: id, orgId: orgId, usuario: email, nome: dados.nome });
    return id;
  }

  /**
   * Exclui (soft-delete) uma categoria de item pelo id.
   */
  function excluirCategoriaItem(catId) {
    _assertAdmin();
    var orgId = getOrgConfig().orgId;
    var email = getEmailSessao();
    modifyJSON('categorias_itens_config.json', function(lista) {
      var c = lista.find(function(x) { return x.id === catId && x.orgId === orgId; });
      if (!c) throw new Error('Categoria não encontrada: ' + catId);
      c.ativo = false;
      c.atualizadoEm = agora();
      return lista;
    });
    AuditoriaService.registrar('CATEGORIA_ITEM_EXCLUIDA', 'admin',
      { entidadeId: catId, orgId: orgId, usuario: email });
    return true;
  }

  // ─── Labels organizacionais ───────────────────────────────────────────────

  /**
   * Retorna o mapa de labels customizáveis da organização.
   */
  function obterLabels() {
    _assertAdmin();
    return SistemaConfigService.getLabel ? null : null; // delegado ao SistemaConfigService
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  function _assertAdmin() {
    var email = getEmailSessao();
    if (typeof PermissoesService === 'undefined') return; // dev/bootstrap mode

    // Verificar via AcessoService primeiro (não depende de PermissoesV2Engine)
    var acesso = AcessoService.verificar(email);
    if (acesso.status !== 'ativo') throw new Error('Acesso negado: usuário não está ativo.');

    var papel = acesso.registro && acesso.registro.papel ? acesso.registro.papel : '';
    if (papel === 'admin' || papel === 'superadmin') return;

    // Fallback: superadmin via PropertiesService
    var superAdmin = (PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '').toLowerCase();
    if (superAdmin && email.toLowerCase() === superAdmin) return;

    // Fallback: PermissoesService.isAdmin (depende de PermissoesV2Engine)
    if (PermissoesService.isAdmin(email)) return;

    throw new Error('Acesso negado: operação requer papel admin.');
  }

  function _lerEspacosSheet() {
    try {
      var sheet = _getSheet('SHEET_ID_MASTER', 'Configuracoes');
      if (!sheet || sheet.getLastRow() < 2) return [];
      var nCols = Math.min(sheet.getLastColumn(), 13);
      return sheet.getRange(2, 1, sheet.getLastRow() - 1, nCols).getValues()
        .filter(function(r) { return String(r[0] || '').trim(); })
        .map(function(r) {
          return {
            id: String(r[0]).trim(),
            nome: String(r[1] || '').trim(),
            possuiChaves: String(r[5] || '').toLowerCase() === 'true',
            aceitaReserva: String(r[8] || '').toLowerCase() !== 'false',
            orgId: getOrgConfig().orgId
          };
        });
    } catch(e) {
      Logger.warn('config_admin_service', '_lerEspacosSheet', e.message);
      return [];
    }
  }

  return {
    listarEspacos:               listarEspacos,
    salvarEspaco:                salvarEspaco,
    desativarEspaco:             desativarEspaco,
    excluirEspaco:               excluirEspaco,
    alternarItemFixo:            alternarItemFixo,
    obterResponsavelEspacoPorDia: obterResponsavelEspacoPorDia,
    listarCategoriasItens:       listarCategoriasItens,
    salvarCategoriaItem:         salvarCategoriaItem,
    excluirCategoriaItem:        excluirCategoriaItem,
    listarTurnos:                listarTurnos,
    salvarTurno:                 salvarTurno,
    excluirTurno:                excluirTurno,
    listarSetores:               listarSetores,
    salvarSetor:                 salvarSetor,
    excluirSetor:                excluirSetor,
    listarModulos:               listarModulos,
    toggleModulo:                toggleModulo,
    salvarMapaEspaco:            salvarMapaEspaco,
    // Terreno do mapa
    lerTerreno:                  lerTerreno,
    salvarTerreno:               salvarTerreno
  };

  // ─── Terreno do Mapa ─────────────────────────────────────────────────────

  /**
   * Lê a configuração do terreno (contorno do campus) do config_org.json.
   * @returns {{ pontos: Array, svgPath: string }|null}
   */
  function lerTerreno() {
    var configOrg = readJSON('config_org.json') || {};
    return configOrg.mapaTerrenoConfig || null;
  }

  /**
   * Salva a configuração do terreno (contorno do campus) no config_org.json.
   * @param {{ pontos: Array, svgPath: string }} params
   */
  function salvarTerreno(params) {
    _assertAdmin();
    if (!params || !Array.isArray(params.pontos) || params.pontos.length < 3) {
      throw new Error('Terreno inválido: mínimo 3 pontos.');
    }
    modifyJSON('config_org.json', function(cfg) {
      cfg.mapaTerrenoConfig = {
        pontos:       params.pontos,
        svgPath:      params.svgPath || null,
        atualizadoEm: agora()
      };
      return cfg;
    });
    if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();
    AuditoriaService.registrar('MAPA_TERRENO_SALVO', 'config_org', {
      usuario:   getEmailSessao(),
      numPontos: params.pontos.length
    });
    Logger.info('config_admin_service', 'salvarTerreno',
      'pontos=' + params.pontos.length);
    return { numPontos: params.pontos.length };
  }

})();
