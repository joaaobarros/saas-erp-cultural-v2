/**
 * @file modules/estoque/previsao_estoque_engine.gs
 * @layer modules/estoque
 * @description Engine de Previsão de Estoque — Fase 75.
 *
 * Calcula taxa de consumo histórica (consumíveis) e cobertura de eventos
 * futuros (duráveis) para alimentar o pipeline visual e os alertas inteligentes.
 *
 * @depends modules/estoque/item_estoque_repository.gs (ItemEstoqueRepository)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 */

var PrevisaoEstoqueEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  // Dias-padrão de histórico para calcular taxa de consumo
  var _DIAS_HISTORICO_PADRAO = 30;

  // Prazo mínimo em dias para disparar alerta ESTOQUE_PREVISTO_ACABAR
  var _PRAZO_ALERTA_DIAS = 7;

  // Limiar padrão de saldo "baixo" (usado quando item não tem limiarConfiguracao)
  var _LIMIAR_BAIXO_PADRAO = 5;

  /**
   * Calcula taxa de consumo histórica de um item com base nas saídas registradas.
   *
   * @param {string} itemId
   * @param {string} orgId
   * @param {number} diasHistorico — janela de análise em dias (padrão: 30)
   * @returns {{
   *   itemId: string,
   *   mediaDiaria: number,       — unidades consumidas por dia (média)
   *   totalConsumido: number,    — total de saídas no período
   *   diasAnalisados: number,    — dias efetivos analisados
   *   unidade: string,           — unidade de medida do item
   *   diasAteEsgotar: number|null — null se taxa = 0 ou saldo = 0
   * }}
   */
  function calcularTaxaConsumo(itemId, orgId, diasHistorico) {
    orgId         = orgId         || _orgId();
    diasHistorico = diasHistorico || _DIAS_HISTORICO_PADRAO;

    var item = ItemEstoqueRepository.buscarPorId(itemId, orgId);
    if (!item) throw new Error('[PrevisaoEstoqueEngine] Item não encontrado: ' + itemId);

    var dataCorte = new Date();
    dataCorte.setDate(dataCorte.getDate() - diasHistorico);
    var dataCorteISO = dataCorte.toISOString().slice(0, 10);

    // Lê todas as saídas do item no período
    var movs = ItemEstoqueRepository.listarMovimentacoes({
      itemId:     itemId,
      dataInicio: dataCorteISO
    }, orgId).filter(function (m) {
      return m.tipo === 'saida_solicitacao' || m.tipo === 'saida_ajuste';
    });

    var totalConsumido = movs.reduce(function (s, m) { return s + m.quantidade; }, 0);
    var mediaDiaria    = diasHistorico > 0 ? totalConsumido / diasHistorico : 0;

    var saldoTotal     = ItemEstoqueRepository.getSaldoTotal(itemId, orgId);
    var diasAteEsgotar = (mediaDiaria > 0 && saldoTotal > 0)
      ? Math.floor(saldoTotal / mediaDiaria)
      : null;

    return {
      itemId:          itemId,
      mediaDiaria:     Math.round(mediaDiaria * 100) / 100,
      totalConsumido:  totalConsumido,
      diasAnalisados:  diasHistorico,
      unidade:         item.unidadeMedida || '',
      saldoAtual:      saldoTotal,
      diasAteEsgotar:  diasAteEsgotar
    };
  }

  /**
   * Calcula cobertura para itens duráveis com base em reservas futuras
   * que declaram materiaisReservados contendo o itemId.
   *
   * @param {string} itemId
   * @param {string} orgId
   * @param {number} horizonte — dias futuros a considerar (padrão: 30)
   * @returns {Array<{
   *   data: string,
   *   reservaId: string,
   *   nomeReserva: string,
   *   qtdNecessaria: number,
   *   qtdDisponivel: number,
   *   deficit: number
   * }>}
   */
  function calcularCoberturaDuraveis(itemId, orgId, horizonte) {
    orgId     = orgId     || _orgId();
    horizonte = horizonte || _DIAS_HISTORICO_PADRAO;

    var hoje     = new Date();
    var hojeISO  = hoje.toISOString().slice(0, 10);
    var limite   = new Date(hoje.getTime() + horizonte * 86400000);
    var limiteISO = limite.toISOString().slice(0, 10);

    var reservas = [];
    try { reservas = readJSON('reservas.json') || []; } catch (e) { reservas = []; }

    var saldoDisponivel = ItemEstoqueRepository.getSaldoDisponivel(itemId, orgId);
    var resultado = [];

    reservas.filter(function (r) {
      if (r.orgId !== orgId) return false;
      if (r.status === 'cancelada' || r.status === 'encerrada') return false;
      if (!Array.isArray(r.materiaisReservados) || r.materiaisReservados.length === 0) return false;
      var dataR = (r.dataInicio || r.data || '').slice(0, 10);
      return dataR >= hojeISO && dataR <= limiteISO;
    }).forEach(function (r) {
      var mat = r.materiaisReservados.filter(function (m) { return m.itemId === itemId; });
      if (mat.length === 0) return;
      var qtdNecessaria = mat.reduce(function (s, m) { return s + (m.quantidade || m.qtd || 0); }, 0);
      resultado.push({
        data:           (r.dataInicio || r.data || '').slice(0, 10),
        reservaId:      r.id,
        nomeReserva:    r.nomeAcao || r.titulo || r.id,
        qtdNecessaria:  qtdNecessaria,
        qtdDisponivel:  saldoDisponivel,
        deficit:        Math.max(0, qtdNecessaria - saldoDisponivel)
      });
    });

    return resultado.sort(function (a, b) { return a.data.localeCompare(b.data); });
  }

  /**
   * Retorna previsão completa de todos os itens críticos do org.
   * Usado pelo pipeline visual para montar os dados de progresso.
   *
   * @param {string} orgId
   * @param {number} diasHistorico
   * @returns {Array<Object>} — um objeto por item
   */
  function previsaoTodosItens(orgId, diasHistorico) {
    orgId         = orgId         || _orgId();
    diasHistorico = diasHistorico || _DIAS_HISTORICO_PADRAO;

    var itens     = ItemEstoqueRepository.listar({}, orgId);
    var depositos = ItemEstoqueRepository.listarDepositos(orgId);

    return itens.map(function (item) {
      var taxa;
      try {
        taxa = calcularTaxaConsumo(item.id, orgId, diasHistorico);
      } catch (e) {
        taxa = { mediaDiaria: 0, totalConsumido: 0, diasAteEsgotar: null, saldoAtual: 0 };
      }

      var saldos      = ItemEstoqueRepository.getSaldo(item.id, orgId);
      var saldoTotal  = saldos.reduce(function (a, s) { return a + s.quantidade; }, 0);
      var alocado     = saldos.reduce(function (a, s) { return a + s.quantidadeAlocada; }, 0);
      var disponivel  = saldoTotal - alocado;

      // Monta visão por depósito (para as barras do pipeline)
      var porDeposito = depositos.map(function (dep) {
        var entradas = saldos.filter(function (s) { return s.depositoId === dep.id; });
        var qty      = entradas.reduce(function (a, s) { return a + s.quantidade; }, 0);
        var aloc     = entradas.reduce(function (a, s) { return a + s.quantidadeAlocada; }, 0);
        return {
          depositoId:   dep.id,
          depositoNome: dep.nome,
          depositoCod:  dep.codigo,
          tipo:         dep.tipo,
          quantidade:   qty,
          alocado:      aloc,
          disponivel:   qty - aloc
        };
      }).filter(function (d) { return d.quantidade > 0 || d.tipo === 'rapido'; });

      // Determina alerta
      var limiar = item.limiarBaixo || _LIMIAR_BAIXO_PADRAO;
      var alerta = null;
      if (item.critico) {
        if (saldoTotal === 0)                         alerta = 'zerado';
        else if (saldoTotal <= limiar)                alerta = 'baixo';
        else if (taxa.diasAteEsgotar !== null &&
                 taxa.diasAteEsgotar < _PRAZO_ALERTA_DIAS) alerta = 'previsto_acabar';
      }

      return {
        item:          item,
        saldoTotal:    saldoTotal,
        alocado:       alocado,
        disponivel:    disponivel,
        porDeposito:   porDeposito,
        taxa:          taxa,
        alerta:        alerta,
        limiar:        limiar
      };
    }).sort(function (a, b) {
      var p = { zerado: 0, baixo: 1, previsto_acabar: 2 };
      var pa = p[a.alerta] !== undefined ? p[a.alerta] : 3;
      var pb = p[b.alerta] !== undefined ? p[b.alerta] : 3;
      if (pa !== pb) return pa - pb;
      return a.item.descricao.localeCompare(b.item.descricao);
    });
  }

  /**
   * Limiar de alerta de estoque (usado pelo AlertasEngine).
   */
  function getLimiarBaixo() { return _LIMIAR_BAIXO_PADRAO; }
  function getPrazoAlertaDias() { return _PRAZO_ALERTA_DIAS; }

  return {
    calcularTaxaConsumo:      calcularTaxaConsumo,
    calcularCoberturaDuraveis: calcularCoberturaDuraveis,
    previsaoTodosItens:       previsaoTodosItens,
    getLimiarBaixo:           getLimiarBaixo,
    getPrazoAlertaDias:       getPrazoAlertaDias
  };

})();
