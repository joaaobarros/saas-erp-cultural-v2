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
   *                            horarioFuncionamento, responsavelTurno, bloqueios }
   */
  function salvarEspaco(espaco) {
    _assertAdmin();
    var orgId = getOrgConfig().orgId;
    var email = getEmailSessao();

    if (!espaco || !espaco.nome) throw new Error('Nome do espaço é obrigatório.');

    var id = espaco.id || gerarId('esp');
    var agora_ = agora();

    var registro = {
      id:                   id,
      orgId:                orgId,
      nome:                 String(espaco.nome).trim(),
      descricao:            String(espaco.descricao || '').trim(),
      capacidade:           Number(espaco.capacidade) || 0,
      possuiChaves:         espaco.possuiChaves === true,
      aceitaReserva:        espaco.aceitaReserva !== false,
      horarioFuncionamento: espaco.horarioFuncionamento || {},
      responsavelTurno:     espaco.responsavelTurno || {},
      bloqueios:            espaco.bloqueios || [],
      ativo:                espaco.ativo !== false,
      criadoEm:             espaco.criadoEm || agora_,
      atualizadoEm:         agora_,
      criadoPor:            espaco.criadoPor || email
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

    AuditoriaService.registrar('ESPACO_SALVO', 'espaco', id, orgId, email,
      { nome: registro.nome, ativo: registro.ativo });

    Logger.info('config_admin_service', 'salvarEspaco', id + ': ' + registro.nome);
    return registro;
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
    AuditoriaService.registrar('ESPACO_DESATIVADO', 'espaco', espacoId, orgId, email, {});
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
    AuditoriaService.registrar('TURNO_SALVO', 'turno', id, orgId, email, { nome: registro.nome });
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
    AuditoriaService.registrar('SETOR_SALVO', 'setor', id, orgId, email, { nome: setor.nome });
    return id;
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
      'modulo', moduloId, orgId, email, {}
    );
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
    var orgId = getOrgConfig().orgId;
    if (typeof PermissoesService === 'undefined') return; // dev/bootstrap mode
    if (!PermissoesService.ehAdmin(email, orgId))
      throw new Error('Acesso negado: operação requer papel admin.');
  }

  function _lerEspacosSheet() {
    try {
      var sheet = _getSheet('MASTER', 'Configuracoes');
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
    listarEspacos:   listarEspacos,
    salvarEspaco:    salvarEspaco,
    desativarEspaco: desativarEspaco,
    listarTurnos:    listarTurnos,
    salvarTurno:     salvarTurno,
    listarSetores:   listarSetores,
    salvarSetor:     salvarSetor,
    listarModulos:   listarModulos,
    toggleModulo:    toggleModulo
  };

})();
