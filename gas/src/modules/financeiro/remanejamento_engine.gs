/**
 * @file modules/financeiro/remanejamento_engine.gs
 * @layer modules/financeiro
 * @description Repositório e Engine de Remanejamentos Orçamentários.
 *
 * Fonte de verdade: remanejamentos_orcamentarios.json (Drive)
 *
 * FSM de status:
 *   rascunho → aguard_financeiro [sempre]
 *   aguard_financeiro → aguard_direcao [se valorTotal >= threshold]
 *   aguard_financeiro → aprovado [se valorTotal < threshold]
 *   aguard_direcao → aprovado
 *   aprovado → efetivado
 *   rascunho | aguard_financeiro | aguard_direcao → rejeitado (terminal)
 *
 * Threshold configurável em config_org.json.remanejamentoThreshold (padrão: 5000)
 *
 * @depends core/data_layer.gs (readJSON, modifyJSON)
 *          core/services/fsm_guardian.gs (FsmGuardian)
 *          core/services/auditoria_service.gs (AuditoriaService)
 *          core/event_bus_backend.gs (SystemEvents)
 *          core/utils.gs (gerarId, agora)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 *          modules/financeiro/orcamento_guard.gs (OrcamentoGuard)
 */

// ── Constantes ────────────────────────────────────────────────────

var STATUS_REMANEJAMENTO = Object.freeze({
  RASCUNHO:          'rascunho',
  AGUARD_FINANCEIRO: 'aguard_financeiro',
  AGUARD_DIRECAO:    'aguard_direcao',
  APROVADO:          'aprovado',
  EFETIVADO:         'efetivado',
  REJEITADO:         'rejeitado'
});

// ── FSM ───────────────────────────────────────────────────────────

var _TRANSICOES_REMANEJAMENTO = {
  rascunho:          ['aguard_financeiro', 'rejeitado'],
  aguard_financeiro: ['aguard_direcao', 'aprovado', 'rejeitado'],
  aguard_direcao:    ['aprovado', 'rejeitado'],
  aprovado:          ['efetivado'],
  efetivado:         [],
  rejeitado:         []
};

if (typeof FsmGuardian !== 'undefined') {
  try { FsmGuardian.registrar('remanejamentos', _TRANSICOES_REMANEJAMENTO); } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════
// REPOSITÓRIO
// ═══════════════════════════════════════════════════════════════

var RemanejamentoRepository = (function () {

  var _ARQUIVO = 'remanejamentos_orcamentarios.json';

  function _orgId(orgId) { return orgId || getOrgConfig().orgId; }

  function listar(orgId, filtros) {
    orgId   = _orgId(orgId);
    filtros = filtros || {};
    var todos = readJSON(_ARQUIVO) || [];
    return todos.filter(function (r) {
      if (r.orgId && r.orgId !== orgId) return false;
      if (filtros.status    && r.status    !== filtros.status)    return false;
      if (filtros.contratoId && r.contratoId !== filtros.contratoId) return false;
      return true;
    }).sort(function (a, b) {
      return String(b.criadoEm || '').localeCompare(String(a.criadoEm || ''));
    });
  }

  function buscarPorId(orgId, id) {
    orgId = _orgId(orgId);
    var todos = readJSON(_ARQUIVO) || [];
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].id === id && (todos[i].orgId === orgId || !todos[i].orgId)) return todos[i];
    }
    return null;
  }

  function salvar(orgId, dados) {
    orgId       = _orgId(orgId);
    dados       = dados || {};
    dados.orgId = orgId;
    var agr     = agora ? agora() : new Date().toISOString();
    var isNovo  = !dados.id;
    if (isNovo) {
      dados.id       = gerarId('rem');
      dados.numero   = dados.numero || ('REM-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4));
      dados.criadoEm = agr;
      dados.versao   = 1;
      if (!dados.status)    dados.status    = STATUS_REMANEJAMENTO.RASCUNHO;
      if (!dados.aprovacoes) dados.aprovacoes = [];
    } else {
      dados.versao = (dados.versao || 0) + 1;
    }
    dados.atualizadoEm = agr;

    modifyJSON(_ARQUIVO, function (lista) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === dados.id) { idx = i; break; }
      }
      if (idx >= 0) lista[idx] = dados;
      else lista.push(dados);
      return lista;
    });
    return { id: dados.id, isNovo: isNovo };
  }

  return { listar: listar, buscarPorId: buscarPorId, salvar: salvar };
})();

// ═══════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════

var RemanejamentoEngine = (function () {

  var _THRESHOLD_DEFAULT = 5000;

  function _orgId() { return getOrgConfig().orgId; }

  function _audit(evento, dados) {
    try { if (typeof AuditoriaService !== 'undefined') AuditoriaService.registrar(evento, 'financeiro', dados || {}); } catch (_) {}
  }

  function _emit(tipo, payload) {
    try { if (typeof SystemEvents !== 'undefined') SystemEvents.emit(tipo, payload || {}); } catch (_) {}
  }

  function _threshold(orgId) {
    try {
      if (typeof SistemaConfigService !== 'undefined') {
        var cfg = SistemaConfigService.getConfig(orgId);
        return (cfg && cfg.remanejamentoThreshold) ? Number(cfg.remanejamentoThreshold) : _THRESHOLD_DEFAULT;
      }
    } catch (_) {}
    return _THRESHOLD_DEFAULT;
  }

  function _transitar(rem, novoStatus, emailOperador, orgId) {
    var atual = rem.status || STATUS_REMANEJAMENTO.RASCUNHO;
    if (typeof FsmGuardian !== 'undefined') {
      FsmGuardian.validarTransicao('remanejamentos', atual, novoStatus);
    } else {
      var perm = _TRANSICOES_REMANEJAMENTO[atual] || [];
      if (perm.indexOf(novoStatus) === -1)
        throw new Error('Transição inválida: "' + atual + '" → "' + novoStatus + '".');
    }
    // Snapshot antes de estados terminais
    if (novoStatus === STATUS_REMANEJAMENTO.REJEITADO) {
      _audit('REMANEJAMENTO_SNAPSHOT_REJEITADO', {
        snapshot: JSON.parse(JSON.stringify(rem)), operador: emailOperador || ''
      });
    }
    rem.status = novoStatus;
    rem[novoStatus + 'Em']  = new Date().toISOString();
    rem[novoStatus + 'Por'] = emailOperador || '';
    RemanejamentoRepository.salvar(orgId, rem);
    _audit('REMANEJAMENTO_' + novoStatus.toUpperCase(), {
      id: rem.id, numero: rem.numero, de: atual, para: novoStatus, operador: emailOperador || ''
    });
    return rem;
  }

  // ── CRUD ─────────────────────────────────────────────────────

  function listar(filtros, orgId) {
    return RemanejamentoRepository.listar(orgId || _orgId(), filtros || {});
  }

  function buscarPorId(id, orgId) {
    return RemanejamentoRepository.buscarPorId(orgId || _orgId(), id);
  }

  function salvar(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!dados || !dados.contratoId)  throw new Error('contratoId é obrigatório.');
    if (!dados.origemRubricaId)       throw new Error('origemRubricaId é obrigatório.');
    if (!dados.destinoRubricaId)      throw new Error('destinoRubricaId é obrigatório.');
    if (!dados.valor || dados.valor <= 0) throw new Error('Valor deve ser positivo.');
    if (!dados.justificativa || !String(dados.justificativa).trim())
      throw new Error('Justificativa é obrigatória.');
    if (dados.status && dados.status !== STATUS_REMANEJAMENTO.RASCUNHO)
      throw new Error('Apenas remanejamentos em RASCUNHO podem ser editados.');

    if (!dados.id) dados.criadoPor = emailOperador || '';
    var resultado = RemanejamentoRepository.salvar(orgId, dados);
    _audit(resultado.isNovo ? 'REMANEJAMENTO_CRIADO' : 'REMANEJAMENTO_ATUALIZADO', {
      id: resultado.id, numero: dados.numero, operador: emailOperador || ''
    });
    return resultado.id;
  }

  // ── FLUXO DE APROVAÇÃO ────────────────────────────────────────

  function submeter(id, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var rem = RemanejamentoRepository.buscarPorId(orgId, id);
    if (!rem) throw new Error('Remanejamento não encontrado: ' + id);
    if (rem.status !== STATUS_REMANEJAMENTO.RASCUNHO)
      throw new Error('Apenas remanejamentos em RASCUNHO podem ser submetidos.');

    // Captura snapshot de saldos antes da aprovação
    if (typeof OrcamentoGuard !== 'undefined') {
      rem.snapshotOrigem  = OrcamentoGuard.snapshotSaldo(rem.contratoId, rem.origemRubricaId, orgId);
      rem.snapshotDestino = OrcamentoGuard.snapshotSaldo(rem.contratoId, rem.destinoRubricaId, orgId);
      // Verifica saldo suficiente na origem
      if (rem.snapshotOrigem && rem.snapshotOrigem.saldoDisponivel < rem.valor) {
        throw new Error(
          'Saldo insuficiente na rubrica de origem "' + (rem.snapshotOrigem.rubricaNome || rem.origemRubricaId) + '". ' +
          'Saldo: R$ ' + rem.snapshotOrigem.saldoDisponivel.toFixed(2) + ' | ' +
          'Valor do remanejamento: R$ ' + rem.valor.toFixed(2)
        );
      }
    }

    _transitar(rem, STATUS_REMANEJAMENTO.AGUARD_FINANCEIRO, emailOperador, orgId);
    _emit('MUTATION_CRITICAL', { tipo: 'remanejamento_submetido', id: id, orgId: orgId });
    return { ok: true, id: id, numero: rem.numero };
  }

  function aprovarFinanceiro(id, parecer, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var rem = RemanejamentoRepository.buscarPorId(orgId, id);
    if (!rem) throw new Error('Remanejamento não encontrado: ' + id);

    rem.aprovacoes = rem.aprovacoes || [];
    rem.aprovacoes.push({
      papel: 'financeiro', email: emailOperador || '', parecer: parecer || '',
      decisao: 'aprovado', timestamp: new Date().toISOString()
    });

    var threshold = _threshold(orgId);
    var proximo   = rem.valor >= threshold
      ? STATUS_REMANEJAMENTO.AGUARD_DIRECAO
      : STATUS_REMANEJAMENTO.APROVADO;

    _transitar(rem, proximo, emailOperador, orgId);
    return { ok: true, id: id, proximoStatus: proximo };
  }

  function aprovarDirecao(id, parecer, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var rem = RemanejamentoRepository.buscarPorId(orgId, id);
    if (!rem) throw new Error('Remanejamento não encontrado: ' + id);

    rem.aprovacoes = rem.aprovacoes || [];
    rem.aprovacoes.push({
      papel: 'direcao', email: emailOperador || '', parecer: parecer || '',
      decisao: 'aprovado', timestamp: new Date().toISOString()
    });

    _transitar(rem, STATUS_REMANEJAMENTO.APROVADO, emailOperador, orgId);
    return { ok: true, id: id };
  }

  function rejeitar(id, parecer, papel, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!parecer) throw new Error('Parecer de rejeição é obrigatório.');
    var rem = RemanejamentoRepository.buscarPorId(orgId, id);
    if (!rem) throw new Error('Remanejamento não encontrado: ' + id);

    rem.aprovacoes = rem.aprovacoes || [];
    rem.aprovacoes.push({
      papel: papel || emailOperador || '', email: emailOperador || '', parecer: parecer,
      decisao: 'rejeitado', timestamp: new Date().toISOString()
    });

    _transitar(rem, STATUS_REMANEJAMENTO.REJEITADO, emailOperador, orgId);
    return { ok: true, id: id };
  }

  /**
   * Efetivar: transfere o valor da rubrica de origem para a de destino em contratos.json.
   * Só executa com status APROVADO — nunca antes.
   */
  function efetivar(id, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var rem = RemanejamentoRepository.buscarPorId(orgId, id);
    if (!rem) throw new Error('Remanejamento não encontrado: ' + id);
    if (rem.status !== STATUS_REMANEJAMENTO.APROVADO)
      throw new Error('Apenas remanejamentos APROVADOS podem ser efetivados. Status: ' + rem.status);

    // Aplica na origem (reduz valorTotal) e no destino (aumenta valorTotal) em contratos.json
    modifyJSON('contratos.json', function (contratos) {
      for (var i = 0; i < contratos.length; i++) {
        var c = contratos[i];
        if (c.id !== rem.contratoId) continue;
        var metas = c.metas || [];
        for (var m = 0; m < metas.length; m++) {
          var rubs = metas[m].rubricas || [];
          for (var r = 0; r < rubs.length; r++) {
            if (rubs[r].id === rem.origemRubricaId) {
              rubs[r].valorTotal = Math.max(0, (rubs[r].valorTotal || 0) - rem.valor);
            }
            if (rubs[r].id === rem.destinoRubricaId) {
              rubs[r].valorTotal = (rubs[r].valorTotal || 0) + rem.valor;
            }
          }
          metas[m].rubricas = rubs;
        }
        contratos[i].metas = metas;
        contratos[i].atualizadoEm = new Date().toISOString();
        break;
      }
      return contratos;
    });

    _transitar(rem, STATUS_REMANEJAMENTO.EFETIVADO, emailOperador, orgId);
    _emit('MUTATION_CRITICAL', { tipo: 'remanejamento_efetivado', id: id, valor: rem.valor, orgId: orgId });
    return { ok: true, id: id, numero: rem.numero };
  }

  // ── Métricas ──────────────────────────────────────────────────

  function obterMetricas(orgId) {
    orgId = orgId || _orgId();
    var lista = RemanejamentoRepository.listar(orgId);
    var valorEfetivado = 0;
    lista.forEach(function (r) {
      if (r.status === STATUS_REMANEJAMENTO.EFETIVADO) valorEfetivado += r.valor || 0;
    });
    return {
      total:             lista.length,
      rascunhos:         lista.filter(function(r){ return r.status === STATUS_REMANEJAMENTO.RASCUNHO; }).length,
      pendentes:         lista.filter(function(r){ return r.status === STATUS_REMANEJAMENTO.AGUARD_FINANCEIRO || r.status === STATUS_REMANEJAMENTO.AGUARD_DIRECAO; }).length,
      aprovados:         lista.filter(function(r){ return r.status === STATUS_REMANEJAMENTO.APROVADO; }).length,
      efetivados:        lista.filter(function(r){ return r.status === STATUS_REMANEJAMENTO.EFETIVADO; }).length,
      rejeitados:        lista.filter(function(r){ return r.status === STATUS_REMANEJAMENTO.REJEITADO; }).length,
      valorEfetivado:    valorEfetivado,
      geradoEm:          new Date().toISOString()
    };
  }

  return {
    STATUS_REMANEJAMENTO: STATUS_REMANEJAMENTO,
    listar:           listar,
    buscarPorId:      buscarPorId,
    salvar:           salvar,
    submeter:         submeter,
    aprovarFinanceiro: aprovarFinanceiro,
    aprovarDirecao:   aprovarDirecao,
    rejeitar:         rejeitar,
    efetivar:         efetivar,
    obterMetricas:    obterMetricas
  };
})();
