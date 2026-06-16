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
    var espacos = SistemaConfigService.getEspacos ? SistemaConfigService.getEspacos() : _lerEspacosSheet();
    // Reparar numeroPlanta ausente (espaços criados antes do auto-assign)
    var semNumero = espacos.filter(function(e) { return !e.numeroPlanta; });
    if (semNumero.length > 0) {
      var maxN = 0;
      espacos.forEach(function(e) {
        var n = parseInt(e.numeroPlanta, 10);
        if (!isNaN(n) && n > maxN) maxN = n;
      });
      var modificados = [];
      semNumero.forEach(function(e) {
        e.numeroPlanta = String(++maxN);
        modificados.push(e.id);
      });
      try {
        modifyJSON('espacos_config.json', function(lista) {
          modificados.forEach(function(id) {
            var esp = espacos.filter(function(x) { return x.id === id; })[0];
            var idx = -1;
            for (var i = 0; i < lista.length; i++) { if (lista[i].id === id) { idx = i; break; } }
            if (idx >= 0 && esp) lista[idx].numeroPlanta = esp.numeroPlanta;
          });
          return lista;
        });
        Logger.log('[config_admin_service] listarEspacos: numeroPlanta atribuído a ' + modificados.length + ' espaço(s)');
      } catch (e) {
        Logger.log('[config_admin_service] listarEspacos: erro ao reparar numeroPlanta — ' + e.message);
      }
    }
    return espacos;
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

    // Validar horário local do espaço contra horário global de funcionamento
    // Se não fornecido, herdar do config global para não falhar a validação
    var _horLocal = espaco.horarioFuncionamento || (function() {
      try {
        var _g = SistemaConfigService.getReservaHorario();
        return { abertura: _g.inicio || _g.abertura || '08:00', fechamento: _g.fim || _g.fechamento || '22:00' };
      } catch(e) { return { abertura: '08:00', fechamento: '22:00' }; }
    })();
    (function() {
      function _hMin(s) {
        if (!s) return -1;
        var p = String(s).split(':');
        if (p.length < 2) return -1;
        var h = parseInt(p[0], 10), m = parseInt(p[1], 10);
        return (isNaN(h) || isNaN(m)) ? -1 : h * 60 + m;
      }
      try {
        var _horGlobal = SistemaConfigService.getReservaHorario();
        var _gIni = _hMin(_horGlobal.inicio || _horGlobal.abertura);
        var _gFim = _hMin(_horGlobal.fim    || _horGlobal.fechamento);
        var _lIni = _hMin(_horLocal.abertura);
        var _lFim = _hMin(_horLocal.fechamento);
        if (_gIni >= 0 && _lIni >= 0 && _lIni < _gIni) {
          throw new Error(
            'Abertura do espaço (' + _horLocal.abertura +
            ') não pode ser anterior ao horário global de funcionamento (' + (_horGlobal.inicio || _horGlobal.abertura) + ').'
          );
        }
        if (_gFim >= 0 && _lFim >= 0 && _lFim > _gFim) {
          throw new Error(
            'Fechamento do espaço (' + _horLocal.fechamento +
            ') não pode ser posterior ao horário global de funcionamento (' + (_horGlobal.fim || _horGlobal.fechamento) + ').'
          );
        }
        if (_lIni >= 0 && _lFim >= 0 && _lFim <= _lIni) {
          throw new Error('Fechamento do espaço deve ser posterior à abertura.');
        }
      } catch(e) {
        if (e.message && (e.message.indexOf('não pode') >= 0 || e.message.indexOf('deve ser') >= 0)) throw e;
        // Falha ao ler config global: deixa passar sem bloquear
      }
    })();

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
      horarioFuncionamento:   _horLocal,
      responsaveis:           responsaveis,
      itensFixos:             espaco.itensFixos || {},
      equipamentosVinculados: espaco.equipamentosVinculados || [],
      tags:                   espaco.tags || [],
      bloqueios:              espaco.bloqueios || [],
      mapaConfig:             espaco.mapaConfig || null,
      nivel:                  espaco.nivel !== undefined ? (Number(espaco.nivel) || 0) : 0,
      ativo:                  espaco.ativo !== false,
      criadoEm:               espaco.criadoEm || agora_,
      atualizadoEm:           agora_,
      criadoPor:              espaco.criadoPor || email,
      versao:                 (espaco.versao || 0) + 1
    };

    modifyJSON('espacos_config.json', function(lista) {
      // Auto-assign numeroPlanta: max existing + 1 for new or blank
      if (!registro.numeroPlanta) {
        var maxN = 0;
        lista.forEach(function(e) {
          if (e.orgId === orgId && e.id !== id) {
            var n = parseInt(e.numeroPlanta, 10);
            if (!isNaN(n) && n > maxN) maxN = n;
          }
        });
        registro.numeroPlanta = String(maxN + 1);
      }
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
      if (params.nivel !== undefined) lista[idx].nivel = Number(params.nivel) || 0;
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
  function alternarReservaEspaco(espacoId) {
    _assertAdmin();
    var orgId = getOrgConfig().orgId;
    var email = getEmailSessao();
    var novoStatus = false;

    modifyJSON('espacos_config.json', function(lista) {
      var espaco = lista.find(function(e) { return e.id === espacoId && e.orgId === orgId; });
      if (!espaco) throw new Error('Espaço não encontrado: ' + espacoId);
      novoStatus = espaco.aceitaReserva === false; // toggle
      espaco.aceitaReserva = novoStatus;
      espaco.atualizadoEm  = agora();
      espaco.versao        = (espaco.versao || 0) + 1;
      return lista;
    });

    if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();
    AuditoriaService.registrar('ESPACO_RESERVA_ALTERNADA', 'espaco',
      { entidadeId: espacoId, orgId: orgId, usuario: email, aceitaReserva: novoStatus });
    return { espacoId: espacoId, aceitaReserva: novoStatus };
  }

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
      var label = setor.label || setor.nome;
      var registro = Object.assign({}, setor, { id: id, label: label, orgId: orgId, atualizadoEm: agora() });
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
    alternarReservaEspaco:       alternarReservaEspaco,
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
    salvarTerreno:               salvarTerreno,
    // Níveis do mapa
    lerNiveisMapa:               lerNiveisMapa,
    salvarNiveisMapa:            salvarNiveisMapa,
    // Datas comemorativas
    getDatasComemorativas:       getDatasComemorativas,
    listarDatasComemorativas:    listarDatasComemorativas,
    salvarDataComemorativa:      salvarDataComemorativa,
    excluirDataComemorativa:     excluirDataComemorativa
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

  // ─── Níveis do Mapa ──────────────────────────────────────────────────────────

  /**
   * Lê a configuração de níveis do mapa (config_org.json → niveisMapaConfig).
   * Retorna array de níveis ou array padrão com apenas o Térreo (nivel 0).
   * @returns {Array<{nivel,label,usarTerrenoBase,terrenoConfig,usarPlantaBase,plantaBase}>}
   */
  function lerNiveisMapa() {
    var cfg = readJSON('config_org.json') || {};
    return cfg.niveisMapaConfig || [
      { nivel: 0, label: 'Térreo', usarTerrenoBase: true, terrenoConfig: null,
        usarPlantaBase: true, plantaBase: null }
    ];
  }

  /**
   * Salva a configuração de níveis do mapa.
   * @param {{ niveis: Array }} params
   */
  function salvarNiveisMapa(params) {
    _assertAdmin();
    if (!params || !Array.isArray(params.niveis) || params.niveis.length < 1) {
      throw new Error('Deve existir pelo menos um nível.');
    }
    // Validar e normalizar cada nível
    params.niveis.forEach(function(n) {
      if (typeof n.nivel !== 'number') throw new Error('Cada nível deve ter um número inteiro.');
      if (!n.label || !String(n.label).trim()) throw new Error('Cada nível deve ter um label.');
    });
    modifyJSON('config_org.json', function(cfg) {
      cfg.niveisMapaConfig = params.niveis.map(function(n) {
        return {
          nivel:           Number(n.nivel),
          label:           String(n.label).trim(),
          usarTerrenoBase: n.usarTerrenoBase !== false,
          terrenoConfig:   n.usarTerrenoBase !== false ? null : (n.terrenoConfig || null),
          usarPlantaBase:  n.usarPlantaBase !== false,
          plantaBase:      n.usarPlantaBase !== false ? null : (n.plantaBase || null)
        };
      });
      cfg.niveisMapaConfig.atualizadoEm = agora();
      return cfg;
    });
    if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();
    AuditoriaService.registrar('MAPA_NIVEIS_SALVOS', 'config_org', {
      usuario:    getEmailSessao(),
      numNiveis:  params.niveis.length
    });
    return { numNiveis: params.niveis.length };
  }

  // ─── Datas Comemorativas ─────────────────────────────────────────────────

  var _DATAS_COMEMORATIVAS_DEFAULT = [
    // ── Datas cívicas e festivas ──────────────────────────────────────────────
    { id:'ano_novo',     mes:1,  dia:1,  label:'Feliz Ano Novo!',                        sub:'Que este ano seja repleto de realizações!',                    icone:'🎆', motion:'fogos'        },
    { id:'fortaleza',    mes:3,  dia:25, label:'Aniversário de Fortaleza!',              sub:'Fundada em 1726.',                                             icone:'🦀', motion:'estrelas'     },
    { id:'namorados',    mes:6,  dia:12, label:'Feliz Dia dos Namorados!',               sub:'Que o amor esteja em tudo que você faz hoje.',                 icone:'💛', motion:'coracoes'     },
    { id:'ceara',        mes:7,  dia:23, label:'Aniversário do Ceará!',                  sub:'Emancipação política em 1824.',                                icone:'☀️', motion:'ouro'         },
    { id:'independ',     mes:9,  dia:7,  label:'Independência do Brasil!',               sub:'7 de Setembro de 1822.',                                       icone:'🇧🇷', motion:'verde_amarelo' },
    { id:'criancas',     mes:10, dia:12, label:'Feliz Dia das Crianças!',                sub:'Que o espírito lúdico e criativo esteja sempre com você.',    icone:'⭐', motion:'estrelas'     },
    { id:'finados',      mes:11, dia:2,  label:'Dia de Finados',                         sub:'Momento de reflexão e memória afetiva.',                       icone:'🕯️', motion:null           },
    { id:'natal',        mes:12, dia:25, label:'Feliz Natal!',                           sub:'Que a alegria, a paz e o amor preencham seu coração.',         icone:'🎄', motion:'papai_noel'   },
    { id:'reveillon',    mes:12, dia:31, label:'Feliz Réveillon!',                       sub:'A virada está chegando — que venha cheio de luz!',             icone:'🎊', motion:'fogos'        },
    // ── Negritude e Diáspora Africana ────────────────────────────────────────
    { id:'abolicao_ce',  mes:3,  dia:17, label:'17 de Março — Abolição do Ceará (1884)', sub:'Ceará: primeiro estado a libertar os escravizados.',           icone:'✊',  motion:'ouro',      cls:'dc-abolicao' },
    { id:'abolicao_br',  mes:5,  dia:13, label:'Abolição da Escravatura no Brasil',      sub:'Lei Áurea, 1888 — uma conquista que ainda exige reparação.',   icone:'✊',  motion:'ouro',      cls:'dc-abolicao' },
    { id:'africa',       mes:5,  dia:25, label:'Dia da África',                          sub:'Celebrando as culturas, histórias e lutas do continente.',     icone:'🌍', motion:'ouro',      cls:'dc-africa'   },
    { id:'consciencia',  mes:11, dia:20, label:'Dia da Consciência Negra',               sub:'Zumbi dos Palmares e a luta permanente pelo povo negro.',      icone:'✊',  motion:'ouro',      cls:'dc-consciencia' },
    // ── Povos Originários ────────────────────────────────────────────────────
    { id:'indigenas_br', mes:4,  dia:19, label:'Dia dos Povos Indígenas',                sub:'Resistência, cultura e direitos dos povos originários.',       icone:'🪶', motion:'estrelas',  cls:'dc-indigena' },
    { id:'indigenas_onu',mes:8,  dia:9,  label:'Dia Internacional dos Povos Indígenas',  sub:'ONU — saberes, línguas e territórios dos povos nativos.',      icone:'🌿', motion:'estrelas',  cls:'dc-indigena' },
    // ── Direitos Humanos e Igualdade ─────────────────────────────────────────
    { id:'mulheres',     mes:3,  dia:8,  label:'Dia Internacional das Mulheres',         sub:'Pela igualdade, liberdade e direitos das mulheres.',            icone:'💜', motion:'estrelas',  cls:'dc-mulheres' },
    { id:'lgbtqia',      mes:6,  dia:28, label:'Dia Internacional do Orgulho LGBTQIA+', sub:'Amor, identidade e o direito de ser quem se é.',               icone:'🏳️‍🌈', motion:'fogos', cls:'dc-arco-iris'},
    { id:'violencia_m',  mes:11, dia:25, label:'Dia pela Eliminação da Violência contra as Mulheres', sub:'Nenhuma forma de violência é aceitável.',         icone:'💜', motion:null,         cls:'dc-mulheres' },
    { id:'dir_humanos',  mes:12, dia:10, label:'Dia Internacional dos Direitos Humanos', sub:'Declaração Universal dos Direitos Humanos — 10 de dezembro de 1948.', icone:'🕊️', motion:'estrelas' },
    // ── Bairros de Fortaleza ─────────────────────────────────────────────────
    { id:'bom_jardim',   mes:3,  dia:24, label:'Aniversário do Bom Jardim!',              sub:'Fundado em 1961 — comunidade, arte e resistência.',            icone:'🌿', motion:'bairro',       cls:'dc-bairro'   },
    { id:'canindezinho', mes:10, dia:4,  label:'Aniversário do Canindezinho!',             sub:'Padroeiro São Francisco de Assis — celebrando a comunidade.', icone:'⛪', motion:'bairro',       cls:'dc-bairro'   },
    // ── CCBJ ─────────────────────────────────────────────────────────────────
    { id:'ccbj',         mes:12, dia:19, label:'Aniversário do CCBJ!',                    sub:'Centro Cultural Bom Jardim — inaugurado em 19 de dezembro de 2006. Arte, cultura e resistência no território!', icone:'🏛️', motion:'ccbj_20anos', cls:'dc-ccbj' },
    // ── Arte e Cultura ───────────────────────────────────────────────────────
    { id:'teatro',       mes:3,  dia:27, label:'Dia Mundial do Teatro',                   sub:'A arte cênica que transforma vidas e territórios.',            icone:'🎭', motion:'cultura',       cls:'dc-cultura'  },
    { id:'livro',        mes:4,  dia:23, label:'Dia Mundial do Livro e do Direito Autoral',sub:'A leitura que liberta — UNESCO, desde 1995.',                 icone:'📖', motion:'cultura',       cls:'dc-cultura'  },
    { id:'danca',        mes:4,  dia:29, label:'Dia Internacional da Dança',              sub:'O movimento que fala o que as palavras não alcançam.',         icone:'💃', motion:'cultura',       cls:'dc-cultura'  },
    { id:'museus',       mes:5,  dia:18, label:'Dia Internacional dos Museus',            sub:'Patrimônio, memória e acesso à cultura para todos.',           icone:'🏛️', motion:'cultura',      cls:'dc-cultura'  },
    { id:'santo_antonio',mes:6,  dia:13, label:'Dia de Santo Antônio — Festa Junina!',   sub:'O mês mais junino do Nordeste começa aqui!',                  icone:'🎉', motion:'sao_joao',      cls:'dc-sao-joao' },
    { id:'sao_joao',     mes:6,  dia:24, label:'Feliz Festa de São João!',               sub:'Quadrilha, forró, fogueira e todo o coração do Nordeste!',     icone:'🎆', motion:'sao_joao',      cls:'dc-sao-joao' },
    { id:'patrimonio',   mes:8,  dia:17, label:'Dia do Patrimônio Histórico e Cultural',  sub:'IPHAN — preservar é resistir ao apagamento da memória.',       icone:'🏰', motion:'cultura',       cls:'dc-cultura'  },
    { id:'folclore',     mes:8,  dia:22, label:'Dia do Folclore',                         sub:'A sabedoria popular que nasce do povo e volta para o povo.',   icone:'🎪', motion:'cultura',       cls:'dc-cultura'  },
    { id:'cultura_br',   mes:11, dia:5,  label:'Dia da Cultura Brasileira',               sub:'A diversidade cultural que nos une como nação.',               icone:'🎨', motion:'cultura',       cls:'dc-cultura'  },
    { id:'musica',       mes:11, dia:22, label:'Dia da Música',                           sub:'Santa Cecília — padroeira dos músicos. Que o som continue!',   icone:'🎵', motion:'cultura',       cls:'dc-cultura'  },
    { id:'samba',        mes:12, dia:2,  label:'Dia Nacional do Samba',                  sub:'Ritmo, identidade e resistência negra na cultura brasileira.', icone:'🥁', motion:'cultura',       cls:'dc-cultura'  },
    { id:'forro',        mes:12, dia:13, label:'Dia Nacional do Forró',                  sub:'De Luiz Gonzaga ao Nordeste — o forró que pulsa no povo!',     icone:'🪗', motion:'sao_joao',      cls:'dc-sao-joao' }
  ];

  function _lerDatasComemorativasJSON() {
    try {
      var lista = readJSON('datas_comemorativas.json');
      if (Array.isArray(lista)) return lista;
    } catch(e) {
      Logger.warn('config_admin_service', '_lerDatasComemorativasJSON', e.message);
    }
    return null;
  }

  /**
   * Merge das datas default com o estado salvo no JSON.
   * Defaults sempre aparecem; o JSON sobrepõe campos editados e o flag `ativo`.
   * Datas customizadas (não presentes nos defaults) são acrescentadas no final.
   */
  function _mergeComDefaults(jsonLista) {
    var saved = {};
    if (Array.isArray(jsonLista)) {
      jsonLista.forEach(function(d) { saved[d.id] = d; });
    }
    var defaultIds = _DATAS_COMEMORATIVAS_DEFAULT.map(function(d) { return d.id; });
    var resultado = _DATAS_COMEMORATIVAS_DEFAULT.map(function(def) {
      var s = saved[def.id];
      return s ? Object.assign({}, def, s) : Object.assign({ ativo: true }, def);
    });
    if (Array.isArray(jsonLista)) {
      jsonLista.forEach(function(d) {
        if (defaultIds.indexOf(d.id) < 0) resultado.push(d);
      });
    }
    return resultado;
  }

  /** Leitura pública — não requer admin. Retorna apenas datas ativas. */
  function getDatasComemorativas() {
    var lista = _mergeComDefaults(_lerDatasComemorativasJSON());
    return lista.filter(function(d) { return d.ativo !== false; });
  }

  /** Lista todas as datas (inclusive inativas) para o painel admin. */
  function listarDatasComemorativas() {
    _assertAdmin();
    return _mergeComDefaults(_lerDatasComemorativasJSON());
  }

  /**
   * Cria ou atualiza uma data comemorativa.
   * @param {{ id?, mes, dia, label, sub?, icone?, motion? }} dados
   */
  function salvarDataComemorativa(dados) {
    _assertAdmin();
    if (!dados || !dados.label || !dados.mes || !dados.dia) {
      throw new Error('Campos obrigatórios: label, mes, dia.');
    }
    var email = getEmailSessao();
    var id    = dados.id || gerarId('dc');

    modifyJSON('datas_comemorativas.json', function(lista) {
      if (!Array.isArray(lista) || lista.length === 0) {
        lista = _DATAS_COMEMORATIVAS_DEFAULT.map(function(d) { return Object.assign({}, d); });
      }
      var idx = -1;
      for (var i = 0; i < lista.length; i++) { if (lista[i].id === id) { idx = i; break; } }
      var registro = {
        id:           id,
        mes:          Number(dados.mes),
        dia:          Number(dados.dia),
        label:        String(dados.label).trim(),
        sub:          dados.sub          ? String(dados.sub).trim()   : '',
        icone:        dados.icone        ? String(dados.icone).trim() : '',
        motion:       dados.motion       || null,
        ativo:        true,
        atualizadoEm: agora()
      };
      if (idx >= 0) lista[idx] = registro; else lista.push(registro);
      return lista;
    });

    AuditoriaService.registrar('DATA_COMEMORATIVA_SALVA', 'config_org',
      { id: id, usuario: email, label: dados.label });
    return id;
  }

  /** Remove (soft-delete) uma data comemorativa. Mantido para compatibilidade. */
  function excluirDataComemorativa(id) {
    return toggleDataComemorativa(id, false);
  }

  /** Ativa ou desativa uma data comemorativa sem alterar os outros campos. */
  function toggleDataComemorativa(id, ativo) {
    _assertAdmin();
    var email = getEmailSessao();

    modifyJSON('datas_comemorativas.json', function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = -1;
      for (var i = 0; i < lista.length; i++) { if (lista[i].id === id) { idx = i; break; } }
      if (idx >= 0) {
        lista[idx].ativo        = ativo;
        lista[idx].atualizadoEm = agora();
      } else {
        var def = null;
        for (var i = 0; i < _DATAS_COMEMORATIVAS_DEFAULT.length; i++) {
          if (_DATAS_COMEMORATIVAS_DEFAULT[i].id === id) { def = _DATAS_COMEMORATIVAS_DEFAULT[i]; break; }
        }
        lista.push(Object.assign({}, def || { id: id }, { ativo: ativo, atualizadoEm: agora() }));
      }
      return lista;
    });

    AuditoriaService.registrar(
      ativo ? 'DATA_COMEMORATIVA_ATIVADA' : 'DATA_COMEMORATIVA_DESATIVADA',
      'config_org', { id: id, usuario: email }
    );
    return true;
  }

})();
