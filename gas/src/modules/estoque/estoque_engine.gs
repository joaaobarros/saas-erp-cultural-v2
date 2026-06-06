/**
 * @file modules/estoque/estoque_engine.gs
 * @layer modules/estoque
 * @description Engine de Estoque — controle de materiais/consumíveis (Fase 73).
 *
 * FSM de SolicitacaoMaterial:
 *   pendente → separada → finalizada
 *   pendente → cancelada
 *   separada → cancelada (devolve alocação ao saldo)
 *
 * Toda movimentação de saldo é executada dentro de LockService para atomicidade.
 *
 * @depends modules/estoque/item_estoque_repository.gs (ItemEstoqueRepository)
 *          modules/estoque/solicitacao_material_repository.gs (SolicitacaoMaterialRepository)
 *          core/services/auditoria_service.gs (AuditoriaService)
 *          core/services/fsm_guardian.gs (FsmGuardian)
 *          core/event_bus_backend.gs (SystemEvents)
 *          core/events_constants.gs (EVENTOS)
 *          core/logger.gs (Logger)
 *          core/config.gs (getOrgConfig)
 *          core/utils.gs (agora)
 */

// ── FSM de SolicitacaoMaterial ────────────────────────────────────────

var _TRANSICOES_SOL_MATERIAL = {
  'pendente':   ['separada', 'cancelada'],
  'separada':   ['finalizada', 'cancelada'],
  'finalizada': ['devolvida'],
  'devolvida':  [],
  'cancelada':  []
};

if (typeof FsmGuardian !== 'undefined') {
  try { FsmGuardian.registrar('sol_material', _TRANSICOES_SOL_MATERIAL); } catch (_) {}
}

// ── Engine ─────────────────────────────────────────────────────────────

var EstoqueEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  // ──────────────────────────────────────────────────────────────────
  // CATÁLOGO DE ITENS
  // ──────────────────────────────────────────────────────────────────

  function listarItens(filtros, orgId) {
    orgId = orgId || _orgId();
    var itens = ItemEstoqueRepository.listar(filtros || {}, orgId);
    // Enriquece cada item com saldo total e disponível
    return itens.map(function (item) {
      item.saldoTotal      = ItemEstoqueRepository.getSaldoTotal(item.id, orgId);
      item.saldoDisponivel = ItemEstoqueRepository.getSaldoDisponivel(item.id, orgId);
      item.saldoPorDeposito = ItemEstoqueRepository.getSaldo(item.id, orgId);
      return item;
    });
  }

  function salvarItem(dados, autor, orgId) {
    orgId = orgId || _orgId();
    if (!dados.descricao) throw new Error('Descrição do item é obrigatória.');

    var item;
    if (dados.id) {
      item = ItemEstoqueRepository.atualizar(dados.id, dados, orgId);
      AuditoriaService.registrar('ESTOQUE_ITEM_ATUALIZADO', 'estoque', {
        itemId: item.id, descricao: item.descricao, autor: autor, orgId: orgId
      });
    } else {
      item = ItemEstoqueRepository.criar(dados, orgId);
      AuditoriaService.registrar('ESTOQUE_ITEM_CRIADO', 'estoque', {
        itemId: item.id, descricao: item.descricao, autor: autor, orgId: orgId
      });
    }
    return item;
  }

  // ──────────────────────────────────────────────────────────────────
  // MOVIMENTAÇÕES DE SALDO
  // ──────────────────────────────────────────────────────────────────

  /**
   * Registra entrada de estoque (compra, ajuste, devolução).
   * @param {Object} dados { itemId, depositoId, local, quantidade, tipo,
   *                         fornecedor?, notaFiscal?, valorUnitario?, tipoCompra?,
   *                         referencia?, observacoes? }
   */
  function registrarEntrada(dados, autor, orgId) {
    orgId = orgId || _orgId();
    if (!dados.itemId)    throw new Error('itemId é obrigatório.');
    if (!dados.depositoId) throw new Error('depositoId é obrigatório.');
    if (!dados.quantidade || dados.quantidade <= 0) throw new Error('Quantidade deve ser positiva.');

    var TIPOS_ENTRADA = ['entrada_compra', 'entrada_devolucao', 'entrada_ajuste'];
    if (TIPOS_ENTRADA.indexOf(dados.tipo) === -1) {
      dados.tipo = 'entrada_compra';
    }

    var item = ItemEstoqueRepository.buscarPorId(dados.itemId, orgId);
    if (!item) throw new Error('Item não encontrado: ' + dados.itemId);

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      ItemEstoqueRepository.atualizarSaldo(
        dados.itemId, dados.depositoId, dados.local || '', dados.quantidade, 0, orgId
      );
      var mov = ItemEstoqueRepository.registrarMovimentacao({
        tipo:          dados.tipo,
        itemId:        dados.itemId,
        descricaoItem: item.descricao,
        depositoId:    dados.depositoId,
        local:         dados.local || '',
        quantidade:    dados.quantidade,
        valorUnitario: dados.valorUnitario || item.valorUnitario || 0,
        referencia:    dados.referencia    || dados.tipoCompra   || '',
        fornecedor:    dados.fornecedor    || '',
        notaFiscal:    dados.notaFiscal    || '',
        ator:          autor,
        observacoes:   dados.observacoes   || ''
      }, orgId);

      AuditoriaService.registrar('ESTOQUE_ENTRADA', 'estoque', {
        movId: mov.id, itemId: dados.itemId, tipo: dados.tipo,
        quantidade: dados.quantidade, autor: autor, orgId: orgId
      });
      return { ok: true, movimentacaoId: mov.id };
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Registra saída manual de estoque (ajuste negativo).
   * Diferente de entregarSolicitacao — não está vinculado a uma solicitação.
   */
  function registrarSaida(dados, autor, orgId) {
    orgId = orgId || _orgId();
    if (!dados.itemId)    throw new Error('itemId é obrigatório.');
    if (!dados.depositoId) throw new Error('depositoId é obrigatório.');
    if (!dados.quantidade || dados.quantidade <= 0) throw new Error('Quantidade deve ser positiva.');

    var item = ItemEstoqueRepository.buscarPorId(dados.itemId, orgId);
    if (!item) throw new Error('Item não encontrado: ' + dados.itemId);

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var saldo = ItemEstoqueRepository.getSaldo(dados.itemId, orgId);
      var entradaDeposito = saldo.filter(function (s) {
        return s.depositoId === dados.depositoId && s.local === (dados.local || '');
      })[0];
      var dispAtual = entradaDeposito
        ? Math.max(0, entradaDeposito.quantidade - entradaDeposito.quantidadeAlocada)
        : 0;
      if (dados.quantidade > dispAtual) {
        throw new Error('Saldo insuficiente. Disponível: ' + dispAtual + ', solicitado: ' + dados.quantidade);
      }

      ItemEstoqueRepository.atualizarSaldo(
        dados.itemId, dados.depositoId, dados.local || '', -dados.quantidade, 0, orgId
      );
      var mov = ItemEstoqueRepository.registrarMovimentacao({
        tipo:          'saida_ajuste',
        itemId:        dados.itemId,
        descricaoItem: item.descricao,
        depositoId:    dados.depositoId,
        local:         dados.local || '',
        quantidade:    dados.quantidade,
        valorUnitario: dados.valorUnitario || item.valorUnitario || 0,
        ator:          autor,
        observacoes:   dados.observacoes || ''
      }, orgId);

      AuditoriaService.registrar('ESTOQUE_SAIDA_AJUSTE', 'estoque', {
        movId: mov.id, itemId: dados.itemId, quantidade: dados.quantidade, autor: autor, orgId: orgId
      });
      return { ok: true, movimentacaoId: mov.id };
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Transfere quantidade de um depósito para outro.
   * Registra 2 movimentações: transferencia_saida + transferencia_entrada.
   */
  function transferirEntreDepositos(dados, autor, orgId) {
    orgId = orgId || _orgId();
    if (!dados.itemId       ) throw new Error('itemId é obrigatório.');
    if (!dados.depositoOrigem) throw new Error('depositoOrigem é obrigatório.');
    if (!dados.depositoDestino) throw new Error('depositoDestino é obrigatório.');
    if (!dados.quantidade || dados.quantidade <= 0) throw new Error('Quantidade deve ser positiva.');

    var item = ItemEstoqueRepository.buscarPorId(dados.itemId, orgId);
    if (!item) throw new Error('Item não encontrado: ' + dados.itemId);

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var saldo = ItemEstoqueRepository.getSaldo(dados.itemId, orgId);
      var entOrigem = saldo.filter(function (s) {
        return s.depositoId === dados.depositoOrigem && s.local === (dados.localOrigem || '');
      })[0];
      var dispOrigem = entOrigem ? Math.max(0, entOrigem.quantidade - entOrigem.quantidadeAlocada) : 0;
      if (dados.quantidade > dispOrigem) {
        throw new Error('Saldo insuficiente no depósito de origem. Disponível: ' + dispOrigem);
      }

      ItemEstoqueRepository.atualizarSaldo(
        dados.itemId, dados.depositoOrigem, dados.localOrigem || '', -dados.quantidade, 0, orgId
      );
      ItemEstoqueRepository.atualizarSaldo(
        dados.itemId, dados.depositoDestino, dados.localDestino || '', dados.quantidade, 0, orgId
      );

      var obs = 'Para: ' + dados.depositoDestino + (dados.localDestino ? ' / ' + dados.localDestino : '');
      var movSaida = ItemEstoqueRepository.registrarMovimentacao({
        tipo: 'transferencia_saida', itemId: dados.itemId, descricaoItem: item.descricao,
        depositoId: dados.depositoOrigem, local: dados.localOrigem || '',
        quantidade: dados.quantidade, valorUnitario: item.valorUnitario || 0,
        ator: autor, observacoes: obs
      }, orgId);
      ItemEstoqueRepository.registrarMovimentacao({
        tipo: 'transferencia_entrada', itemId: dados.itemId, descricaoItem: item.descricao,
        depositoId: dados.depositoDestino, local: dados.localDestino || '',
        quantidade: dados.quantidade, valorUnitario: item.valorUnitario || 0,
        referencia: movSaida.id, ator: autor,
        observacoes: 'De: ' + dados.depositoOrigem + (dados.localOrigem ? ' / ' + dados.localOrigem : '')
      }, orgId);

      AuditoriaService.registrar('ESTOQUE_TRANSFERENCIA', 'estoque', {
        itemId: dados.itemId, quantidade: dados.quantidade,
        origem: dados.depositoOrigem, destino: dados.depositoDestino, autor: autor, orgId: orgId
      });
      return { ok: true, movSaidaId: movSaida.id };
    } finally {
      lock.releaseLock();
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // SOLICITAÇÕES DE MATERIAL
  // ──────────────────────────────────────────────────────────────────

  /**
   * Cria uma nova solicitação de material.
   * Valida disponibilidade e incrementa quantidadeAlocada atomicamente.
   *
   * @param {Object} dados { itens: [{itemId, qtdSolicitada}], solicitante,
   *                          setorDestino, subsetorDestino?, observacoes?, reservaId? }
   */
  function novaSolicitacao(dados, autor, orgId) {
    orgId = orgId || _orgId();
    if (!Array.isArray(dados.itens) || dados.itens.length === 0) {
      throw new Error('A solicitação deve conter pelo menos um item.');
    }
    if (!dados.setorDestino) throw new Error('setorDestino é obrigatório.');

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      // 1. Valida disponibilidade de cada item
      var itensEnriquecidos = dados.itens.map(function (it) {
        var item = ItemEstoqueRepository.buscarPorId(it.itemId, orgId);
        if (!item) throw new Error('Item não encontrado: ' + it.itemId);
        var disp = ItemEstoqueRepository.getSaldoDisponivel(it.itemId, orgId);
        // Avisa mas não bloqueia se indisponível (política: cria como pendente com aviso)
        return {
          itemId:        item.id,
          descricao:     item.descricao,
          unidade:       item.unidadeMedida,
          qtdSolicitada: it.qtdSolicitada || 1,
          qtdAtendida:   0,
          valorUnitario: item.valorUnitario || 0,
          disponivelAoCriar: disp
        };
      });

      // 2. Incrementa alocada apenas para itens com saldo disponível
      itensEnriquecidos.forEach(function (it) {
        if (it.disponivelAoCriar >= it.qtdSolicitada) {
          // Aloca no primeiro depósito com saldo disponível
          var saldos = ItemEstoqueRepository.getSaldo(it.itemId, orgId)
            .filter(function (s) { return (s.quantidade - s.quantidadeAlocada) > 0; });
          var restante = it.qtdSolicitada;
          saldos.forEach(function (s) {
            if (restante <= 0) return;
            var alocar = Math.min(restante, s.quantidade - s.quantidadeAlocada);
            ItemEstoqueRepository.atualizarSaldo(
              it.itemId, s.depositoId, s.local, 0, alocar, orgId
            );
            restante -= alocar;
          });
        }
      });

      // 3. Cria a solicitação
      var agr = agora();
      var sol = SolicitacaoMaterialRepository.salvar({
        codigo:         SolicitacaoMaterialRepository.proximoCodigo(orgId),
        solicitante:    dados.solicitante  || autor,
        setorDestino:   dados.setorDestino,
        subsetorDestino: dados.subsetorDestino || '',
        status:         'pendente',
        itens:          itensEnriquecidos,
        observacoes:    dados.observacoes  || '',
        reservaId:      dados.reservaId    || '',
        dataSolicitacao: agr,
        criadoPor:      autor
      }, orgId);

      AuditoriaService.registrar('ESTOQUE_SOLICITACAO_CRIADA', 'estoque', {
        solId: sol.id, codigo: sol.codigo, setor: sol.setorDestino,
        itens: sol.itens.length, autor: autor, orgId: orgId
      });
      return sol;
    } finally {
      lock.releaseLock();
    }
  }

  function separarSolicitacao(solId, ator, orgId) {
    orgId = orgId || _orgId();
    var sol = SolicitacaoMaterialRepository.buscarPorId(solId, orgId);
    if (!sol) throw new Error('Solicitação não encontrada: ' + solId);

    FsmGuardian.transitar('sol_material', sol.status, 'separada', { id: solId, ator: ator });

    var atualizada = SolicitacaoMaterialRepository.salvar(
      Object.assign({}, sol, { status: 'separada', separadaPor: ator }),
      orgId
    );
    AuditoriaService.registrar('ESTOQUE_SOLICITACAO_SEPARADA', 'estoque', {
      solId: solId, codigo: sol.codigo, ator: ator, orgId: orgId
    });
    return atualizada;
  }

  /**
   * Finaliza entrega de uma solicitação separada.
   * Decrementa saldo real e zera a alocação dos itens.
   */
  function entregarSolicitacao(solId, receptor, ator, orgId) {
    orgId = orgId || _orgId();
    var sol = SolicitacaoMaterialRepository.buscarPorId(solId, orgId);
    if (!sol) throw new Error('Solicitação não encontrada: ' + solId);

    FsmGuardian.transitar('sol_material', sol.status, 'finalizada', { id: solId, ator: ator });

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var agr = agora();
      var itensAtualizados = sol.itens.map(function (it) {
        var qtd = it.qtdSolicitada;
        // Desconta do saldo real e zera alocação no depósito que tem o item alocado
        var saldos = ItemEstoqueRepository.getSaldo(it.itemId, orgId)
          .filter(function (s) { return s.quantidadeAlocada > 0; });
        var restante = qtd;
        saldos.forEach(function (s) {
          if (restante <= 0) return;
          var consumir = Math.min(restante, s.quantidadeAlocada);
          ItemEstoqueRepository.atualizarSaldo(
            it.itemId, s.depositoId, s.local, -consumir, -consumir, orgId
          );
          // Registra movimentação de saída por depósito
          var itemInfo = ItemEstoqueRepository.buscarPorId(it.itemId, orgId) || {};
          ItemEstoqueRepository.registrarMovimentacao({
            tipo:          'saida_solicitacao',
            itemId:        it.itemId,
            descricaoItem: it.descricao || itemInfo.descricao || '',
            depositoId:    s.depositoId,
            local:         s.local,
            quantidade:    consumir,
            valorUnitario: it.valorUnitario || 0,
            referencia:    sol.id,
            ator:          ator,
            observacoes:   JSON.stringify({
              solicitacaoId:  sol.id,
              codigo:         sol.codigo,
              setor:          sol.setorDestino,
              subsetor:       sol.subsetorDestino || '',
              solicitante:    sol.solicitante,
              receptor:       receptor
            })
          }, orgId);
          restante -= consumir;
        });
        return Object.assign({}, it, { qtdAtendida: qtd - restante });
      });

      var atualizada = SolicitacaoMaterialRepository.salvar(Object.assign({}, sol, {
        status:         'finalizada',
        itens:          itensAtualizados,
        finalizadaPor:  ator,
        receptorFinal:  receptor,
        dataFinalizacao: agr
      }), orgId);

      AuditoriaService.registrar('ESTOQUE_SOLICITACAO_ENTREGUE', 'estoque', {
        solId: solId, codigo: sol.codigo, receptor: receptor, ator: ator, orgId: orgId
      });
      return atualizada;
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Cancela uma solicitação.
   * - Se 'pendente' ou 'separada': devolve quantidadeAlocada ao saldo livre.
   * - Se 'separada': registra entrada_devolucao por item (saldo nunca foi subtraído).
   */
  function cancelarSolicitacao(solId, motivo, ator, orgId) {
    orgId = orgId || _orgId();
    var sol = SolicitacaoMaterialRepository.buscarPorId(solId, orgId);
    if (!sol) throw new Error('Solicitação não encontrada: ' + solId);

    FsmGuardian.transitar('sol_material', sol.status, 'cancelada', { id: solId, ator: ator });

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var eraSeparada = sol.status === 'separada';

      sol.itens.forEach(function (it) {
        // Libera alocação de volta ao saldo livre
        var saldos = ItemEstoqueRepository.getSaldo(it.itemId, orgId)
          .filter(function (s) { return s.quantidadeAlocada > 0; });
        var restante = it.qtdSolicitada;
        saldos.forEach(function (s) {
          if (restante <= 0) return;
          var liberar = Math.min(restante, s.quantidadeAlocada);
          ItemEstoqueRepository.atualizarSaldo(
            it.itemId, s.depositoId, s.local, 0, -liberar, orgId
          );
          if (eraSeparada) {
            var itemInfo = ItemEstoqueRepository.buscarPorId(it.itemId, orgId) || {};
            ItemEstoqueRepository.registrarMovimentacao({
              tipo:          'entrada_devolucao',
              itemId:        it.itemId,
              descricaoItem: it.descricao || itemInfo.descricao || '',
              depositoId:    s.depositoId,
              local:         s.local,
              quantidade:    liberar,
              valorUnitario: it.valorUnitario || 0,
              referencia:    sol.id,
              ator:          ator,
              observacoes:   'Cancelamento: ' + (motivo || '')
            }, orgId);
          }
          restante -= liberar;
        });
      });

      var atualizada = SolicitacaoMaterialRepository.salvar(Object.assign({}, sol, {
        status:            'cancelada',
        motivoCancelamento: motivo || '',
        canceladoPor:      ator
      }), orgId);

      AuditoriaService.registrar('ESTOQUE_SOLICITACAO_CANCELADA', 'estoque', {
        solId: solId, codigo: sol.codigo, motivo: motivo, ator: ator, orgId: orgId
      });
      return atualizada;
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Registra devolução de uma solicitação finalizada.
   * - Permanentes: restaura saldo no depósito padrão.
   * - Consumíveis: apenas registra a movimentação (saldo não restaurado).
   */
  function devolverSolicitacao(solId, ator, orgId) {
    orgId = orgId || _orgId();
    var sol = SolicitacaoMaterialRepository.buscarPorId(solId, orgId);
    if (!sol) throw new Error('Solicitação não encontrada: ' + solId);

    FsmGuardian.transitar('sol_material', sol.status, 'devolvida', { id: solId, ator: ator });

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var agr           = agora();
      var depositoPadrao = 'dep-01';

      sol.itens.forEach(function (it) {
        var qtd      = it.qtdAtendida || it.qtdSolicitada;
        if (qtd <= 0) return;
        var itemInfo = ItemEstoqueRepository.buscarPorId(it.itemId, orgId) || {};

        if (itemInfo.tipo === 'Permanente') {
          ItemEstoqueRepository.atualizarSaldo(
            it.itemId, depositoPadrao, '', qtd, 0, orgId
          );
        }

        ItemEstoqueRepository.registrarMovimentacao({
          tipo:          'entrada_devolucao',
          itemId:        it.itemId,
          descricaoItem: it.descricao || itemInfo.descricao || '',
          depositoId:    depositoPadrao,
          local:         '',
          quantidade:    qtd,
          valorUnitario: it.valorUnitario || 0,
          referencia:    sol.id,
          ator:          ator,
          observacoes:   'Devolução: ' + sol.codigo
        }, orgId);
      });

      var atualizada = SolicitacaoMaterialRepository.salvar(Object.assign({}, sol, {
        status:        'devolvida',
        devolvidaPor:  ator,
        dataDevolucao: agr
      }), orgId);

      AuditoriaService.registrar('ESTOQUE_SOLICITACAO_DEVOLVIDA', 'estoque', {
        solId: solId, codigo: sol.codigo, ator: ator, orgId: orgId
      });
      return atualizada;
    } finally {
      lock.releaseLock();
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // RELATÓRIOS E MÉTRICAS
  // ──────────────────────────────────────────────────────────────────

  function metricas(orgId) {
    orgId = orgId || _orgId();
    var mItens = ItemEstoqueRepository.metricas(orgId);
    var mSol   = SolicitacaoMaterialRepository.metricas(orgId);
    return Object.assign({}, mItens, mSol);
  }

  /**
   * Relatório sintético de saídas agrupado por setor/solicitante.
   * @param {Object} filtros { dataInicio?, dataFim?, setorDestino? }
   */
  function relatorioSaidas(filtros, orgId) {
    orgId   = orgId   || _orgId();
    filtros = filtros || {};

    var movs = ItemEstoqueRepository.listarMovimentacoes(
      { tipo: 'saida_solicitacao', dataInicio: filtros.dataInicio, dataFim: filtros.dataFim },
      orgId
    );

    var mapa = {};
    movs.forEach(function (m) {
      var ctx = {};
      try { ctx = JSON.parse(m.observacoes || '{}'); } catch (e) {}
      var setor       = ctx.setor       || '—';
      var solicitante = ctx.solicitante || m.ator || '—';
      var chave       = setor + '|' + solicitante;
      if (filtros.setorDestino && setor !== filtros.setorDestino) return;
      if (!mapa[chave]) {
        mapa[chave] = { setor: setor, solicitante: solicitante, totalItens: 0, custoTotal: 0, movimentacoes: [] };
      }
      mapa[chave].totalItens += m.quantidade;
      mapa[chave].custoTotal += m.custoTotal;
      mapa[chave].movimentacoes.push(m);
    });

    return Object.keys(mapa).map(function (k) { return mapa[k]; })
      .sort(function (a, b) { return b.custoTotal - a.custoTotal; });
  }

  /**
   * Relatório sintético de entradas agrupado por mês.
   * @param {Object} filtros { dataInicio?, dataFim?, itemId? }
   */
  function relatorioEntradas(filtros, orgId) {
    orgId   = orgId   || _orgId();
    filtros = filtros || {};

    var movs = ItemEstoqueRepository.listarMovimentacoes({
      dataInicio: filtros.dataInicio,
      dataFim:    filtros.dataFim,
      itemId:     filtros.itemId
    }, orgId).filter(function (m) {
      return m.tipo === 'entrada_compra' || m.tipo === 'entrada_ajuste' || m.tipo === 'entrada_devolucao';
    });

    var mapa = {};
    movs.forEach(function (m) {
      var mes = (m.criadoEm || '').slice(0, 7); // YYYY-MM
      if (!mapa[mes]) mapa[mes] = { mes: mes, compras: 0, ajustes: 0, devolucoes: 0, quantidade: 0 };
      if (m.tipo === 'entrada_compra')    { mapa[mes].compras    += m.custoTotal; mapa[mes].quantidade += m.quantidade; }
      if (m.tipo === 'entrada_ajuste')    { mapa[mes].ajustes    += m.custoTotal; mapa[mes].quantidade += m.quantidade; }
      if (m.tipo === 'entrada_devolucao') { mapa[mes].devolucoes += m.custoTotal; mapa[mes].quantidade += m.quantidade; }
    });

    return Object.keys(mapa).sort().map(function (k) { return mapa[k]; });
  }

  /**
   * Pipeline de nível de estoque: todos os itens com saldo por depósito.
   * Itens críticos com saldo zero ou baixo vêm primeiro.
   */
  function pipelineStatus(orgId) {
    orgId = orgId || _orgId();
    var itens     = ItemEstoqueRepository.listar({}, orgId);
    var depositos = ItemEstoqueRepository.listarDepositos(orgId);

    return itens.map(function (item) {
      var saldos = ItemEstoqueRepository.getSaldo(item.id, orgId);
      var saldoTotal = saldos.reduce(function (a, s) { return a + s.quantidade; }, 0);
      var alocado    = saldos.reduce(function (a, s) { return a + s.quantidadeAlocada; }, 0);
      return {
        item:          item,
        saldoTotal:    saldoTotal,
        alocado:       alocado,
        disponivel:    saldoTotal - alocado,
        saldoPorDeposito: saldos,
        alerta:        item.critico && saldoTotal === 0 ? 'zerado'
                     : item.critico && saldoTotal <= 5  ? 'baixo'
                     : null
      };
    }).sort(function (a, b) {
      // Zerados críticos primeiro, depois baixos, depois resto
      var p = function (x) { return x.alerta === 'zerado' ? 0 : x.alerta === 'baixo' ? 1 : 2; };
      return p(a) - p(b);
    });
  }

  // ── API pública ───────────────────────────────────────────────────────

  return {
    listarItens:             listarItens,
    salvarItem:              salvarItem,
    registrarEntrada:        registrarEntrada,
    registrarSaida:          registrarSaida,
    transferirEntreDepositos: transferirEntreDepositos,
    novaSolicitacao:         novaSolicitacao,
    separarSolicitacao:      separarSolicitacao,
    entregarSolicitacao:     entregarSolicitacao,
    cancelarSolicitacao:     cancelarSolicitacao,
    devolverSolicitacao:     devolverSolicitacao,
    metricas:                metricas,
    relatorioSaidas:         relatorioSaidas,
    relatorioEntradas:       relatorioEntradas,
    pipelineStatus:          pipelineStatus
  };

})();
