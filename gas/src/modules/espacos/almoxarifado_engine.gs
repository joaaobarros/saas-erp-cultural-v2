/**
 * @file modules/espacos/almoxarifado_engine.gs
 * @layer modules/espacos
 * @description Engine de Almoxarifado — controle de empréstimos de itens (Fase 2.2).
 *
 * FSM de empréstimo de item:
 *   solicitado → aprovado → retirado → devolvido
 *   solicitado → cancelado
 *   aprovado   → cancelado
 *   retirado   → atrasado → devolvido
 *
 * DESIGN: assertItemDisponivel() é chamado dentro de LockService antes de qualquer escrita.
 * Isso garante que nenhum empréstimo pode ser criado quando o estoque está esgotado.
 *
 * @depends modules/espacos/reservas_itens_repository.gs (ReservasItensRepository)
 *          core/services/auditoria_service.gs (AuditoriaService)
 *          core/event_bus_backend.gs (SystemEvents)
 *          core/services/fsm_guardian.gs (FsmGuardian)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 */

// ── Constantes de domínio ─────────────────────────────────────────────

var STATUS_EMPRESTIMO = Object.freeze({
  SOLICITADO: 'solicitado',
  APROVADO:   'aprovado',
  RETIRADO:   'retirado',
  ATRASADO:   'atrasado',
  DEVOLVIDO:  'devolvido',
  CANCELADO:  'cancelado'
});

// ── FSM de empréstimo ─────────────────────────────────────────────────

var _TRANSICOES_EMPRESTIMO = {
  'solicitado': ['aprovado', 'cancelado'],
  'aprovado':   ['retirado', 'cancelado'],
  'retirado':   ['devolvido', 'atrasado'],
  'atrasado':   ['devolvido'],
  'devolvido':  [],   // terminal
  'cancelado':  []    // terminal
};

if (typeof FsmGuardian !== 'undefined') {
  try { FsmGuardian.registrar('emprestimos', _TRANSICOES_EMPRESTIMO); } catch (_) {}
}

// ── Engine ────────────────────────────────────────────────────────────

var AlmoxarifadoEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  // ──────────────────────────────────────────────────────────────────
  // CATÁLOGO DE ITENS
  // ──────────────────────────────────────────────────────────────────

  /**
   * Lista itens disponíveis para empréstimo.
   * @param {Object} filtros
   * @param {string} orgId
   * @returns {Item[]}
   */
  function listarItens(filtros, orgId) {
    return ReservasItensRepository.listarItens(orgId || _orgId());
  }

  /**
   * Salva (cria ou atualiza) um item no catálogo.
   * @param {Object} dados
   * @param {string} autor
   * @param {string} orgId
   */
  function salvarItem(dados, autor, orgId) {
    if (!dados.nome) throw new Error('Nome do item é obrigatório.');
    if ((dados.quantidadeTotal || 0) < 0) throw new Error('Quantidade não pode ser negativa.');
    var item = ReservasItensRepository.salvarItem(dados, orgId || _orgId());
    AuditoriaService.registrar('ITEM_SALVO', 'espacos', {
      itemId: item.id, nome: item.nome, autor: autor, orgId: orgId
    });
    return item;
  }

  // ──────────────────────────────────────────────────────────────────
  // GUARDA DE DISPONIBILIDADE
  // ──────────────────────────────────────────────────────────────────

  /**
   * Verifica se há estoque suficiente para o empréstimo no período.
   * DEVE ser chamado dentro de LockService para garantir atomicidade.
   *
   * @param {string} itemId
   * @param {number} qtdSolicitada
   * @param {string} dataRetirada — ISO date
   * @param {string} dataDevolucao — ISO date
   * @param {string} orgId
   * @throws Error se item indisponível
   */
  function assertItemDisponivel(itemId, qtdSolicitada, dataRetirada, dataDevolucao, orgId) {
    var item = ReservasItensRepository.buscarItem(itemId, orgId);
    if (!item) throw new Error('Item não encontrado: ' + itemId);
    if (item.quantidadeTotal <= 0) throw new Error('Item "' + item.nome + '" não disponível para empréstimo.');

    var emUso = ReservasItensRepository.quantidadeEmUsoPeriodo(
      itemId, dataRetirada, dataDevolucao, orgId
    );

    var disponivel = item.quantidadeTotal - emUso;
    if (qtdSolicitada > disponivel) {
      throw new Error(
        'Estoque insuficiente para "' + item.nome + '". ' +
        'Disponível: ' + disponivel + ' | Solicitado: ' + qtdSolicitada
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // FLUXO DE EMPRÉSTIMOS
  // ──────────────────────────────────────────────────────────────────

  /**
   * Registra uma solicitação de empréstimo de item.
   *
   * @param {Object} dados — { itemId, quantidade, dataRetirada, dataDevolucao, responsavel, ... }
   * @param {string} autor
   * @param {string} orgId
   * @returns {Emprestimo}
   */
  function solicitarEmprestimo(dados, autor, orgId) {
    if (!dados.itemId)       throw new Error('Item é obrigatório.');
    if (!dados.dataRetirada) throw new Error('Data de retirada é obrigatória.');
    if (!dados.dataDevolucao)throw new Error('Data de devolução é obrigatória.');
    if (!dados.responsavel)  throw new Error('Responsável é obrigatório.');

    var qtd = Number(dados.quantidade || 1);
    if (qtd <= 0) throw new Error('Quantidade deve ser maior que zero.');

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      // Verificar disponibilidade dentro do lock — atomicidade garantida
      assertItemDisponivel(dados.itemId, qtd, dados.dataRetirada, dados.dataDevolucao, orgId);

      var item = ReservasItensRepository.buscarItem(dados.itemId, orgId);

      var emprestimo = {
        orgId:        orgId,
        itemId:       dados.itemId,
        nomeItem:     item ? item.nome : dados.nomeItem || '',
        quantidade:   qtd,
        acaoId:       dados.acaoId    || '',
        reservaId:    dados.reservaId || '',
        responsavel:  dados.responsavel,
        setor:        dados.setor || '',
        dataRetirada:     dados.dataRetirada,
        dataDevolucao:    dados.dataDevolucao,
        dataRetiradaReal: '',
        dataDevolucaoReal:'',
        status:       STATUS_EMPRESTIMO.SOLICITADO,
        aprovadoPor:  '',
        motivoCancelamento: '',
        observacoes:  dados.observacoes || '',
        criadoPor:    autor
      };

      var salvo = ReservasItensRepository.salvarEmprestimo(emprestimo);

      AuditoriaService.registrar('EMPRESTIMO_SOLICITADO', 'espacos', {
        emprestimoId: salvo.id, itemId: dados.itemId, nomeItem: salvo.nomeItem,
        quantidade: qtd, responsavel: dados.responsavel, autor: autor, orgId: orgId
      });

      Logger.info('almoxarifado_engine', 'solicitarEmprestimo', 'Solicitado: ' + salvo.id);
      return salvo;

    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Aprova uma solicitação de empréstimo.
   * @param {string} emprestimoId
   * @param {string} ator
   * @param {string} orgId
   */
  function aprovarEmprestimo(emprestimoId, ator, orgId) {
    var emp = ReservasItensRepository.buscarEmprestimo(emprestimoId, orgId);
    if (!emp) throw new Error('Empréstimo não encontrado: ' + emprestimoId);

    FsmGuardian.transitar('emprestimos', emp.status, STATUS_EMPRESTIMO.APROVADO,
      'Empréstimo ' + emprestimoId);

    ReservasItensRepository.atualizarStatusEmprestimo(
      emprestimoId, STATUS_EMPRESTIMO.APROVADO, orgId, { AprovadoPor: ator }
    );

    AuditoriaService.registrar('EMPRESTIMO_APROVADO', 'espacos', {
      emprestimoId: emprestimoId, ator: ator, orgId: orgId
    });

    return { id: emprestimoId, status: STATUS_EMPRESTIMO.APROVADO };
  }

  /**
   * Registra retirada do item (empréstimo efetivado).
   * @param {string} emprestimoId
   * @param {string} ator
   * @param {string} orgId
   */
  function registrarRetirada(emprestimoId, ator, orgId) {
    var emp = ReservasItensRepository.buscarEmprestimo(emprestimoId, orgId);
    if (!emp) throw new Error('Empréstimo não encontrado: ' + emprestimoId);

    FsmGuardian.transitar('emprestimos', emp.status, STATUS_EMPRESTIMO.RETIRADO,
      'Empréstimo ' + emprestimoId);

    var agr = agora ? agora() : new Date().toISOString();
    ReservasItensRepository.atualizarStatusEmprestimo(
      emprestimoId, STATUS_EMPRESTIMO.RETIRADO, orgId, { DataRetiradaReal: agr }
    );

    AuditoriaService.registrar('EMPRESTIMO_RETIRADO', 'espacos', {
      emprestimoId: emprestimoId, ator: ator, orgId: orgId, dataRetirada: agr
    });

    return { id: emprestimoId, status: STATUS_EMPRESTIMO.RETIRADO, dataRetiradaReal: agr };
  }

  /**
   * Registra devolução do item.
   * @param {string} emprestimoId
   * @param {string} ator
   * @param {string} observacao
   * @param {string} orgId
   */
  function registrarDevolucao(emprestimoId, ator, observacao, orgId) {
    var emp = ReservasItensRepository.buscarEmprestimo(emprestimoId, orgId);
    if (!emp) throw new Error('Empréstimo não encontrado: ' + emprestimoId);

    FsmGuardian.transitar('emprestimos', emp.status, STATUS_EMPRESTIMO.DEVOLVIDO,
      'Empréstimo ' + emprestimoId);

    var agr = agora ? agora() : new Date().toISOString();
    ReservasItensRepository.atualizarStatusEmprestimo(
      emprestimoId, STATUS_EMPRESTIMO.DEVOLVIDO, orgId, {
        DataDevolucaoReal: agr,
        Observacoes: observacao || ''
      }
    );

    AuditoriaService.registrar('EMPRESTIMO_DEVOLVIDO', 'espacos', {
      emprestimoId: emprestimoId, ator: ator, observacao: observacao || '',
      dataDevolucao: agr, orgId: orgId
    });

    Logger.info('almoxarifado_engine', 'registrarDevolucao', 'Devolvido: ' + emprestimoId);
    return { id: emprestimoId, status: STATUS_EMPRESTIMO.DEVOLVIDO, dataDevolucaoReal: agr };
  }

  /**
   * Cancela um empréstimo pendente.
   * @param {string} emprestimoId
   * @param {string} ator
   * @param {string} motivo
   * @param {string} orgId
   */
  function cancelarEmprestimo(emprestimoId, ator, motivo, orgId) {
    var emp = ReservasItensRepository.buscarEmprestimo(emprestimoId, orgId);
    if (!emp) throw new Error('Empréstimo não encontrado: ' + emprestimoId);

    FsmGuardian.transitar('emprestimos', emp.status, STATUS_EMPRESTIMO.CANCELADO,
      'Empréstimo ' + emprestimoId);

    ReservasItensRepository.atualizarStatusEmprestimo(
      emprestimoId, STATUS_EMPRESTIMO.CANCELADO, orgId, {
        MotivoCancelamento: motivo || ''
      }
    );

    AuditoriaService.registrar('EMPRESTIMO_CANCELADO', 'espacos', {
      emprestimoId: emprestimoId, ator: ator, motivo: motivo || '', orgId: orgId
    });

    return { id: emprestimoId, status: STATUS_EMPRESTIMO.CANCELADO };
  }

  /**
   * Verifica empréstimos vencidos e marca como atrasados.
   * Disparado por trigger de tempo via EventHandlerRegistry.
   * @param {string} orgId
   */
  function verificarAtrasos(orgId) {
    var hoje = new Date().toISOString().substring(0, 10);
    var emp  = ReservasItensRepository.listarEmprestimos({}, orgId || _orgId());
    var atrasados = 0;

    emp.forEach(function (e) {
      if (e.status !== STATUS_EMPRESTIMO.RETIRADO) return;
      if (e.dataDevolucao && e.dataDevolucao < hoje) {
        try {
          FsmGuardian.transitar('emprestimos', e.status, STATUS_EMPRESTIMO.ATRASADO,
            'Verificação automática de atrasos');
          ReservasItensRepository.atualizarStatusEmprestimo(
            e.id, STATUS_EMPRESTIMO.ATRASADO, orgId, {}
          );
          atrasados++;
          SystemEvents.emit(SystemEventTypes.ITEM_NOT_RETURNED || 'ITEM_NOT_RETURNED', {
            emprestimoId: e.id, itemId: e.itemId, nomeItem: e.nomeItem,
            responsavel: e.responsavel, diasAtraso: e.dataDevolucao, orgId: orgId
          });
        } catch (err) {
          Logger.warn('almoxarifado_engine', 'verificarAtrasos', 'Erro ao marcar ' + e.id + ': ' + err.message);
        }
      }
    });

    Logger.info('almoxarifado_engine', 'verificarAtrasos',
      'Verificados: ' + emp.length + ', atrasados: ' + atrasados);
    return { verificados: emp.length, atrasados: atrasados };
  }

  /**
   * Lista empréstimos com filtros.
   */
  function listarEmprestimos(filtros, orgId) {
    return ReservasItensRepository.listarEmprestimos(filtros || {}, orgId || _orgId());
  }

  /**
   * Métricas do almoxarifado.
   */
  function metricas(orgId) {
    return ReservasItensRepository.metricas(orgId || _orgId());
  }

  // ── Interface pública ─────────────────────────────────────────────

  return {
    // Catálogo
    listarItens:          listarItens,
    salvarItem:           salvarItem,
    assertItemDisponivel: assertItemDisponivel,

    // Fluxo de empréstimo
    listarEmprestimos:    listarEmprestimos,
    solicitarEmprestimo:  solicitarEmprestimo,
    aprovarEmprestimo:    aprovarEmprestimo,
    registrarRetirada:    registrarRetirada,
    registrarDevolucao:   registrarDevolucao,
    cancelarEmprestimo:   cancelarEmprestimo,

    // Operações
    verificarAtrasos:     verificarAtrasos,
    metricas:             metricas,

    // Constantes
    STATUS: STATUS_EMPRESTIMO
  };

})();
