/**
 * @file modules/financeiro/orcamento_guard.gs
 * @layer modules/financeiro
 * @description OrcamentoGuard — verificação real de saldo orçamentário.
 *
 * Substitui o stub definido em solicitacao_engine.gs (Fase 3).
 * Lê contratos.json, localiza a rubrica pelo ID e verifica saldo disponível.
 *
 * Saldo disponível = rubrica.valorTotal - totalComprometido - totalExecutado
 *
 * Chamado por SolicitacaoEngine.submeter() antes de aceitar a solicitação.
 * Chamado por RemanejamentoEngine antes de registrar comprometimento.
 *
 * @depends core/data_layer.gs (readJSON, modifyJSON)
 *          core/logger.gs (Logger)
 *          core/services/auditoria_service.gs (AuditoriaService)
 */

var OrcamentoGuard = (function () {

  var _ARQUIVO_CONTRATOS = 'contratos.json';

  // ── Helpers ───────────────────────────────────────────────────

  function _encontrarRubrica(contratoId, rubricaId, orgId, lista) {
    for (var i = 0; i < lista.length; i++) {
      var c = lista[i];
      if (c.id !== contratoId) continue;
      if (orgId && c.orgId && c.orgId !== orgId) continue;
      var metas = c.metas || [];
      for (var m = 0; m < metas.length; m++) {
        var rubricas = metas[m].rubricas || [];
        for (var r = 0; r < rubricas.length; r++) {
          if (rubricas[r].id === rubricaId) {
            return { contrato: c, meta: metas[m], rubrica: rubricas[r], ci: i, mi: m, ri: r };
          }
        }
      }
    }
    return null;
  }

  function _calcularSaldo(rubrica) {
    var valorTotal        = rubrica.valorTotal        || 0;
    var totalComprometido = rubrica.totalComprometido || 0;
    var totalExecutado    = rubrica.totalExecutado    || 0;
    return valorTotal - totalComprometido - totalExecutado;
  }

  function _audit(evento, dados) {
    try {
      if (typeof AuditoriaService !== 'undefined')
        AuditoriaService.registrar(evento, 'financeiro', dados || {});
    } catch (_) {}
  }

  // ── API Pública ───────────────────────────────────────────────

  /**
   * Verifica se há saldo disponível na rubrica.
   * Lança Error se não houver orçamento suficiente.
   * Se contratoId ou rubricaId estiverem vazios, passa sem bloquear (sinaliza aviso).
   *
   * @param {string} contratoId
   * @param {string} rubricaId
   * @param {number} valor
   * @param {string} orgId
   */
  function assertDisponivel(contratoId, rubricaId, valor, orgId) {
    if (!contratoId || !rubricaId) {
      Logger.info('orcamento_guard', 'assertDisponivel',
        'Sem contratoId/rubricaId — verificação orçamentária ignorada (valor: ' + valor + ')');
      return { ok: true, aviso: 'Solicitação sem vínculo orçamentário. Vincule a um contrato para controle de saldo.' };
    }

    try {
      var lista = readJSON(_ARQUIVO_CONTRATOS) || [];
      var encontrado = _encontrarRubrica(contratoId, rubricaId, orgId, lista);

      if (!encontrado) {
        Logger.warn('orcamento_guard', 'assertDisponivel',
          'Contrato/rubrica não localizado — contratoId:' + contratoId + ' rubricaId:' + rubricaId);
        _audit('ORCAMENTO_RUBRICA_NAO_ENCONTRADA', {
          contratoId: contratoId, rubricaId: rubricaId, valor: valor, orgId: orgId
        });
        throw new Error(
          'Rubrica "' + rubricaId + '" não encontrada no contrato "' + contratoId + '". ' +
          'Verifique se o contrato e a rubrica estão cadastrados corretamente.'
        );
      }

      var saldo = _calcularSaldo(encontrado.rubrica);
      Logger.info('orcamento_guard', 'assertDisponivel',
        'Rubrica:' + rubricaId + ' valorTotal:' + encontrado.rubrica.valorTotal +
        ' comprometido:' + (encontrado.rubrica.totalComprometido || 0) +
        ' executado:'    + (encontrado.rubrica.totalExecutado    || 0) +
        ' saldo:'        + saldo + ' solicitado:' + valor);

      _audit('ORCAMENTO_VERIFICACAO', {
        contratoId: contratoId, rubricaId: rubricaId,
        valor: valor, saldo: saldo, orgId: orgId
      });

      if (valor > saldo) {
        throw new Error(
          'Saldo insuficiente na rubrica "' + (encontrado.rubrica.nome || rubricaId) + '". ' +
          'Saldo disponível: R$ ' + saldo.toFixed(2) + '. ' +
          'Valor solicitado: R$ ' + valor.toFixed(2) + '.'
        );
      }

      return {
        ok:     true,
        saldo:  saldo,
        rubrica: encontrado.rubrica.nome || rubricaId
      };

    } catch (e) {
      if (e.message && e.message.indexOf('Saldo insuf') === 0) throw e;
      if (e.message && e.message.indexOf('Rubrica') === 0) throw e;
      // Erro de leitura do JSON — não bloqueia, mas loga
      Logger.error('orcamento_guard', 'assertDisponivel', 'Erro ao verificar: ' + e.message);
      _audit('ORCAMENTO_ERRO_VERIFICACAO', { contratoId: contratoId, rubricaId: rubricaId, erro: e.message });
      return { ok: true, aviso: 'Verificação orçamentária indisponível: ' + e.message };
    }
  }

  /**
   * Compromete valor na rubrica (incrementa totalComprometido).
   * Chamado quando uma solicitação passa para em_execucao.
   */
  function comprometer(contratoId, rubricaId, valor, contexto, orgId) {
    if (!contratoId || !rubricaId || !valor) return { ok: false, motivo: 'Parâmetros insuficientes.' };
    try {
      modifyJSON(_ARQUIVO_CONTRATOS, function (lista) {
        var enc = _encontrarRubrica(contratoId, rubricaId, orgId, lista);
        if (!enc) return lista;
        var rub = enc.rubrica;
        rub.totalComprometido = (rub.totalComprometido || 0) + valor;
        lista[enc.ci].metas[enc.mi].rubricas[enc.ri] = rub;
        return lista;
      });
      _audit('ORCAMENTO_COMPROMETIDO', {
        contratoId: contratoId, rubricaId: rubricaId, valor: valor, contexto: contexto || '', orgId: orgId
      });
      return { ok: true };
    } catch (e) {
      Logger.error('orcamento_guard', 'comprometer', e.message);
      return { ok: false, motivo: e.message };
    }
  }

  /**
   * Libera valor comprometido (decrementa totalComprometido).
   * Chamado quando solicitação é rejeitada ou cancelada após comprometimento.
   */
  function liberar(contratoId, rubricaId, valor, contexto, orgId) {
    if (!contratoId || !rubricaId || !valor) return { ok: false, motivo: 'Parâmetros insuficientes.' };
    try {
      modifyJSON(_ARQUIVO_CONTRATOS, function (lista) {
        var enc = _encontrarRubrica(contratoId, rubricaId, orgId, lista);
        if (!enc) return lista;
        var rub = enc.rubrica;
        rub.totalComprometido = Math.max(0, (rub.totalComprometido || 0) - valor);
        lista[enc.ci].metas[enc.mi].rubricas[enc.ri] = rub;
        return lista;
      });
      _audit('ORCAMENTO_LIBERADO', {
        contratoId: contratoId, rubricaId: rubricaId, valor: valor, contexto: contexto || '', orgId: orgId
      });
      return { ok: true };
    } catch (e) {
      Logger.error('orcamento_guard', 'liberar', e.message);
      return { ok: false, motivo: e.message };
    }
  }

  /**
   * Efetivar pagamento: move de comprometido para executado.
   * Chamado quando um pagamento é registrado definitivamente.
   */
  function efetivarPagamento(contratoId, rubricaId, valor, orgId) {
    if (!contratoId || !rubricaId || !valor) return { ok: false, motivo: 'Parâmetros insuficientes.' };
    try {
      modifyJSON(_ARQUIVO_CONTRATOS, function (lista) {
        var enc = _encontrarRubrica(contratoId, rubricaId, orgId, lista);
        if (!enc) return lista;
        var rub = enc.rubrica;
        var comp = rub.totalComprometido || 0;
        var mov = Math.min(valor, comp);
        rub.totalComprometido = Math.max(0, comp - mov);
        rub.totalExecutado    = (rub.totalExecutado || 0) + valor;
        lista[enc.ci].metas[enc.mi].rubricas[enc.ri] = rub;
        return lista;
      });
      _audit('ORCAMENTO_EXECUTADO', {
        contratoId: contratoId, rubricaId: rubricaId, valor: valor, orgId: orgId
      });
      return { ok: true };
    } catch (e) {
      Logger.error('orcamento_guard', 'efetivarPagamento', e.message);
      return { ok: false, motivo: e.message };
    }
  }

  /**
   * Retorna snapshot do saldo atual de uma rubrica (para auditoria).
   */
  function snapshotSaldo(contratoId, rubricaId, orgId) {
    try {
      var lista = readJSON(_ARQUIVO_CONTRATOS) || [];
      var enc = _encontrarRubrica(contratoId, rubricaId, orgId, lista);
      if (!enc) return null;
      var rub = enc.rubrica;
      return {
        contratoId:          contratoId,
        rubricaId:           rubricaId,
        rubricaNome:         rub.nome || '',
        valorTotal:          rub.valorTotal        || 0,
        totalComprometido:   rub.totalComprometido || 0,
        totalExecutado:      rub.totalExecutado    || 0,
        saldoDisponivel:     _calcularSaldo(rub),
        capturadoEm:         new Date().toISOString()
      };
    } catch (e) {
      Logger.error('orcamento_guard', 'snapshotSaldo', e.message);
      return null;
    }
  }

  return {
    assertDisponivel: assertDisponivel,
    comprometer:      comprometer,
    liberar:          liberar,
    efetivarPagamento:efetivarPagamento,
    snapshotSaldo:    snapshotSaldo
  };
})();
