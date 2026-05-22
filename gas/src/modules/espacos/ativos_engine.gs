/**
 * @file modules/espacos/ativos_engine.gs
 * @layer modules/espacos
 * @description Engine de Ativos — regras de negócio, FSM e métricas.
 *
 * FSM de status do ativo (patrimônio/equipamento):
 *   disponivel → reservado   (reserva para uso futuro)
 *   reservado  → em_uso      (início efetivo do uso)
 *   em_uso     → disponivel  (devolução após uso)
 *   em_uso     → manutencao  (equipamento com problema)
 *   disponivel → manutencao  (manutenção preventiva)
 *   manutencao → disponivel  (retorno após manutenção)
 *   qualquer   → baixado     (descarte definitivo — terminal)
 *
 * RESPONSABILIDADES DESTE ENGINE:
 *   - Validações de negócio (nome obrigatório, código, categoria)
 *   - Transições de status via FSM com auditoria e evento
 *   - Cálculos de métricas de patrimônio
 *   - Emissão de eventos para IntegracaoOrquestrador
 *   - Registro de movimentações no histórico
 *
 * @depends modules/espacos/ativos_repository.gs (AtivoRepository)
 *          core/services/fsm_guardian.gs (FsmGuardian)
 *          core/services/auditoria_service.gs (AuditoriaService)
 *          core/event_bus_backend.gs (SystemEvents)
 *          core/events_constants.gs (SystemEventTypes)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 */

// ── Constantes de domínio ─────────────────────────────────────────────

var STATUS_ATIVO = Object.freeze({
  DISPONIVEL: 'disponivel',
  RESERVADO:  'reservado',
  EM_USO:     'em_uso',
  MANUTENCAO: 'manutencao',
  BAIXADO:    'baixado'
});

var CATEGORIA_ATIVO = Object.freeze({
  AUDIOVISUAL:    'audiovisual',
  INFORMATICA:    'informatica',
  MOBILIARIO:     'mobiliario',
  INFRAESTRUTURA: 'infraestrutura',
  OUTRO:          'outro'
});

// ── FSM ───────────────────────────────────────────────────────────────

var _TRANSICOES_ATIVO = {
  'disponivel': ['reservado', 'em_uso', 'manutencao', 'baixado'],
  'reservado':  ['em_uso', 'disponivel', 'baixado'],
  'em_uso':     ['disponivel', 'manutencao', 'baixado'],
  'manutencao': ['disponivel', 'baixado'],
  'baixado':    []   // terminal
};

if (typeof FsmGuardian !== 'undefined') {
  try { FsmGuardian.registrar('ativos', _TRANSICOES_ATIVO); } catch (_) {}
}

// ── Categorias disponíveis (para o frontend) ──────────────────────────

var _CATEGORIAS_LABEL = {
  audiovisual:    'Audiovisual',
  informatica:    'Informática',
  mobiliario:     'Mobiliário',
  infraestrutura: 'Infraestrutura',
  outro:          'Outro'
};

// ── Engine ────────────────────────────────────────────────────────────

var AtivosEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  function _audit(evento, dados) {
    try {
      if (typeof AuditoriaService !== 'undefined')
        AuditoriaService.registrar(evento, 'espacos', dados || {});
    } catch (_) {}
  }

  function _emit(tipo, payload) {
    try {
      if (typeof SystemEvents !== 'undefined')
        SystemEvents.emit(tipo, payload || {});
    } catch (_) {}
  }

  // ── Validações ───────────────────────────────────────────────────────

  function _validar(dados) {
    if (!dados.nome || String(dados.nome).trim() === '')
      throw new Error('Nome do ativo é obrigatório.');
    if (!dados.categoria || !_CATEGORIAS_LABEL[dados.categoria])
      dados.categoria = 'outro';
    if (dados.valorAquisicao !== undefined && isNaN(Number(dados.valorAquisicao)))
      throw new Error('Valor de aquisição inválido.');
    return dados;
  }

  // ──────────────────────────────────────────────────────────────────
  // CONSULTAS
  // ──────────────────────────────────────────────────────────────────

  /**
   * Lista ativos com filtros opcionais.
   * @param {Object} filtros — { status, categoria, localizacao }
   * @param {string} orgId
   */
  function listar(filtros, orgId) {
    return AtivoRepository.listar(filtros || {}, orgId || _orgId());
  }

  /**
   * Busca ativo pelo ID.
   * @param {string} id
   * @param {string} orgId
   */
  function buscarPorId(id, orgId) {
    if (!id) throw new Error('ID é obrigatório.');
    return AtivoRepository.buscarPorId(id, orgId || _orgId());
  }

  /**
   * Retorna métricas agregadas de ativos.
   * @param {string} orgId
   */
  function metricas(orgId) {
    return AtivoRepository.metricas(orgId || _orgId());
  }

  /**
   * Retorna a lista de categorias disponíveis.
   */
  function categorias() {
    return Object.keys(_CATEGORIAS_LABEL).map(function (k) {
      return { id: k, label: _CATEGORIAS_LABEL[k] };
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // CRIAR / EDITAR
  // ──────────────────────────────────────────────────────────────────

  /**
   * Cria ou atualiza um ativo.
   * Se dados.id existir → atualizar; caso contrário → criar.
   * @param {Object} dados
   * @param {string} autor — email do usuário
   * @param {string} orgId
   */
  function salvar(dados, autor, orgId) {
    _validar(dados);
    var orgId_ = orgId || _orgId();

    if (dados.id) {
      // Atualização
      var ativoAtual = AtivoRepository.buscarPorId(dados.id, orgId_);
      if (!ativoAtual) throw new Error('Ativo não encontrado: ' + dados.id);

      // Não permite alterar status via salvar (use mudarStatus)
      dados.status = ativoAtual.status;

      var atualizado = AtivoRepository.atualizar(dados.id, dados, orgId_);

      _audit('ATIVO_ATUALIZADO', {
        id: atualizado.id, nome: atualizado.nome, autor: autor
      });
      _emit('ATIVO_ATUALIZADO', { ativoId: atualizado.id, orgId: orgId_ });

      Logger.info('ativos_engine', 'salvar', 'Ativo atualizado: ' + atualizado.id);
      return atualizado;

    } else {
      // Criação
      if (!dados.status) dados.status = 'disponivel';
      var criado = AtivoRepository.criar(dados, orgId_, autor);

      _audit('ATIVO_CRIADO', {
        id: criado.id, nome: criado.nome, categoria: criado.categoria, autor: autor
      });
      _emit('ATIVO_CRIADO', { ativoId: criado.id, orgId: orgId_ });

      Logger.info('ativos_engine', 'salvar', 'Ativo criado: ' + criado.id);
      return criado;
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // TRANSIÇÕES DE STATUS (FSM)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Executa uma transição de status via FSM.
   * @param {string} id — ID do ativo
   * @param {string} novoStatus — status destino
   * @param {string} ator — email do usuário
   * @param {string} motivo — motivo da transição
   * @param {string} orgId
   * @returns {Object} ativo atualizado
   */
  function mudarStatus(id, novoStatus, ator, motivo, orgId) {
    var orgId_ = orgId || _orgId();
    var ativo = AtivoRepository.buscarPorId(id, orgId_);
    if (!ativo) throw new Error('Ativo não encontrado: ' + id);

    var statusAtual = ativo.status;

    // Validação FSM
    var permitidos = _TRANSICOES_ATIVO[statusAtual] || [];
    if (permitidos.indexOf(novoStatus) === -1) {
      throw new Error(
        'Transição inválida: ' + statusAtual + ' → ' + novoStatus +
        '. Permitidos: ' + (permitidos.length ? permitidos.join(', ') : 'nenhum (estado terminal)')
      );
    }

    // Atualiza campos dependentes do status
    var dadosUpdate = { status: novoStatus };
    if (novoStatus === 'disponivel') {
      dadosUpdate.responsavel = '';
      dadosUpdate.acaoId      = '';
    }
    if (novoStatus === 'manutencao') {
      dadosUpdate.ultimaManutencao = agora();
    }
    if (novoStatus === 'baixado') {
      dadosUpdate.responsavel = '';
      dadosUpdate.acaoId      = '';
    }

    var ativoAtualizado = AtivoRepository.atualizar(id, dadosUpdate, orgId_);

    // Registra movimentação
    AtivoRepository.registrarMovimentacao(
      id, 'transicao', statusAtual, novoStatus, ator, motivo, orgId_
    );

    // Auditoria e evento
    _audit('ATIVO_STATUS_ALTERADO', {
      id: id, de: statusAtual, para: novoStatus, ator: ator, motivo: motivo
    });

    var eventoTipo = novoStatus === 'baixado'    ? 'ATIVO_BAIXADO'
                   : novoStatus === 'manutencao' ? 'ATIVO_EM_MANUTENCAO'
                   : novoStatus === 'em_uso'     ? 'ATIVO_EM_USO'
                   : novoStatus === 'disponivel' ? 'ATIVO_DISPONIBILIZADO'
                   : 'ATIVO_STATUS_ALTERADO';

    _emit(eventoTipo, {
      ativoId: id, orgId: orgId_, de: statusAtual, para: novoStatus, ator: ator
    });

    Logger.info('ativos_engine', 'mudarStatus',
      'Ativo ' + id + ': ' + statusAtual + ' → ' + novoStatus + ' por ' + ator);

    return ativoAtualizado;
  }

  /**
   * Registra saída para uso em uma Ação.
   * Transição: disponivel/reservado → em_uso
   * @param {string} id
   * @param {string} acaoId
   * @param {string} responsavel — email de quem está usando
   * @param {string} ator
   * @param {string} orgId
   */
  function registrarUso(id, acaoId, responsavel, ator, orgId) {
    var orgId_ = orgId || _orgId();
    var ativo = AtivoRepository.buscarPorId(id, orgId_);
    if (!ativo) throw new Error('Ativo não encontrado: ' + id);

    var permitidos = _TRANSICOES_ATIVO[ativo.status] || [];
    if (permitidos.indexOf('em_uso') === -1)
      throw new Error('Ativo ' + id + ' não pode ser colocado em uso a partir de: ' + ativo.status);

    var atualizado = AtivoRepository.atualizar(id, {
      status:      'em_uso',
      acaoId:      acaoId      || '',
      responsavel: responsavel || ator || ''
    }, orgId_);

    AtivoRepository.registrarMovimentacao(
      id, 'emprestimo', ativo.status, 'em_uso', ator,
      'Registrado para uso' + (acaoId ? ' na ação ' + acaoId : ''), orgId_
    );

    _audit('ATIVO_EM_USO', { id: id, acaoId: acaoId, responsavel: responsavel, ator: ator });
    _emit('ATIVO_EM_USO', { ativoId: id, acaoId: acaoId, orgId: orgId_ });

    return atualizado;
  }

  /**
   * Registra devolução de um ativo.
   * Transição: em_uso → disponivel
   * @param {string} id
   * @param {string} ator
   * @param {string} motivo
   * @param {string} orgId
   */
  function registrarDevolucao(id, ator, motivo, orgId) {
    return mudarStatus(id, 'disponivel', ator, motivo || 'Devolução', orgId);
  }

  /**
   * Envia ativo para manutenção.
   * @param {string} id
   * @param {string} ator
   * @param {string} descricaoProblema
   * @param {string} orgId
   */
  function enviarParaManutencao(id, ator, descricaoProblema, orgId) {
    return mudarStatus(id, 'manutencao', ator, descricaoProblema || 'Manutenção', orgId);
  }

  /**
   * Retorna ativo da manutenção para disponível.
   * @param {string} id
   * @param {string} ator
   * @param {string} orgId
   */
  function concluirManutencao(id, ator, orgId) {
    return mudarStatus(id, 'disponivel', ator, 'Manutenção concluída', orgId);
  }

  /**
   * Dá baixa definitiva em um ativo.
   * @param {string} id
   * @param {string} ator
   * @param {string} motivoBaixa — razão da baixa
   * @param {string} orgId
   */
  function registrarBaixa(id, ator, motivoBaixa, orgId) {
    return mudarStatus(id, 'baixado', ator, motivoBaixa || 'Baixa patrimonial', orgId);
  }

  // ── Interface pública ─────────────────────────────────────────────

  return {
    listar:               listar,
    buscarPorId:          buscarPorId,
    metricas:             metricas,
    categorias:           categorias,
    salvar:               salvar,
    mudarStatus:          mudarStatus,
    registrarUso:         registrarUso,
    registrarDevolucao:   registrarDevolucao,
    enviarParaManutencao: enviarParaManutencao,
    concluirManutencao:   concluirManutencao,
    registrarBaixa:       registrarBaixa,
    STATUS:               STATUS_ATIVO,
    CATEGORIAS:           CATEGORIA_ATIVO
  };

})();
