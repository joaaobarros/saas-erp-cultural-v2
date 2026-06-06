/**
 * @file controllers/taskhub_controller.gs
 * @layer controllers
 * @description TaskHub — Centro de Controle unificado. Fase 10.
 *
 * Agrega em uma única resposta: tarefas atribuídas + aprovações pendentes +
 * demandas de comunicação + encaminhamentos de reuniões + alertas não lidos.
 * Prioriza por prazo + SLA consumido + urgência.
 *
 * @depends tarefa_repository.gs, reuniao_repository.gs, balcao_repository.gs,
 *          alertas_engine.gs, solicitacao_reserva_repository.gs, acesso_service.gs
 */

/**
 * Caixa de entrada unificada do usuário logado.
 * Retorna pendências de todos os módulos priorizadas.
 */
function ctrl_taskhub_minha_caixa(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');

    var orgId  = getOrgConfig().orgId;
    var hoje   = new Date();
    var itens  = [];

    // ── 1. Tarefas atribuídas ao usuário ─────────────────────────────────
    try {
      var tarefas = TarefaRepository.listar(orgId, { responsavel: email });
      tarefas.filter(function(t) {
        return t.status !== 'concluida' && t.status !== 'cancelada';
      }).forEach(function(t) {
        itens.push(_itemCaixa('tarefa', t.id, t.titulo, t.prazo, t.prioridade, 'tarefas', {
          status: t.status, acaoId: t.acaoId
        }));
      });
    } catch(e) { Logger.warn('taskhub', 'tarefas', e.message); }

    // ── 2. Encaminhamentos de reuniões (como responsável) ─────────────────
    try {
      var encs = ReuniaoRepository.listarEncaminhamentosPendentes(orgId, email);
      encs.forEach(function(e) {
        itens.push(_itemCaixa('encaminhamento', e.encId, e.texto, e.prazo, 'media', 'reunioes', {
          reuniaoId: e.reuniaoId, reuniaoTitulo: e.reuniaoTitulo, vencido: e.vencido
        }));
      });
    } catch(e) { Logger.warn('taskhub', 'encaminhamentos', e.message); }

    // ── 3. Demandas de comunicação (como executor) ─────────────────────────
    try {
      var demandas = BalcaoRepository.listar(orgId, { executor: email });
      demandas.filter(function(d) {
        return d.status !== 'concluida' && d.status !== 'cancelada';
      }).forEach(function(d) {
        itens.push(_itemCaixa('demanda', d.id, d.titulo, d.dataLimite, d.urgencia, 'comunicacao', {
          tipo: d.tipo, status: d.status, slaPct: _calcularSlaPct(d)
        }));
      });
    } catch(e) { Logger.warn('taskhub', 'demandas', e.message); }

    // ── 4. Aprovações pendentes (solicitações de reserva para gestores) ───
    try {
      var papel = acesso.registro && acesso.registro.papel;
      if (['gestor','admin','superadmin'].includes(papel)) {
        var solic = readJSON('solicitacoes_reserva.json') || [];
        solic.filter(function(s) {
          return s.orgId === orgId && s.status === 'pendente';
        }).forEach(function(s) {
          itens.push(_itemCaixa('aprovacao', s.id,
            'Aprovar reserva de "' + (s.espacoNome || s.espacoId) + '" por ' + (s.solicitante || '—'),
            null, 'alta', 'espacos', { tipo: 'reserva', solicitante: s.solicitante }));
        });
      }
    } catch(e) { Logger.warn('taskhub', 'aprovacoes', e.message); }

    // ── 5. Alertas não lidos (todos os módulos) ───────────────────────────
    try {
      var alertas = AlertasEngine.listarAtivos(orgId, { somenteNaoLidos: true });
      alertas.slice(0, 10).forEach(function(a) {
        itens.push(_itemCaixa('alerta', a.id, a.mensagem, null, _alertaSevToUrgencia(a.severidade),
          a.modulo, { tipo: a.tipo, severidade: a.severidade, entidade: a.entidade }));
      });
    } catch(e) { Logger.warn('taskhub', 'alertas', e.message); }

    // ── Priorização final ─────────────────────────────────────────────────
    itens = _priorizar(itens, hoje);

    return {
      total:   itens.length,
      urgente: itens.filter(function(i) { return i.urgencia === 'critica' || i.urgencia === 'alta'; }).length,
      hoje:    itens.filter(function(i) { return i.grupoHoje; }).length,
      itens:   itens
    };
  }, 'ctrl_taskhub_minha_caixa');
}

/**
 * Visão "Meu Time" — carga de trabalho por pessoa (gestores).
 */
function ctrl_taskhub_meu_time(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var papel = acesso.registro && acesso.registro.papel;
    if (!['gestor','coordenador','admin','superadmin'].includes(papel)) throw new Error('Sem permissão');

    var orgId = getOrgConfig().orgId;
    var hoje  = new Date();

    // Mapear por pessoa: { email → { tarefas, demandas, encaminhamentos, atrasado } }
    var carga = {};

    function _registrar(pEmail, tipo, vencido) {
      if (!pEmail) return;
      carga[pEmail] = carga[pEmail] || { email: pEmail, tarefas: 0, demandas: 0, encaminhamentos: 0, atrasados: 0 };
      carga[pEmail][tipo]++;
      if (vencido) carga[pEmail].atrasados++;
    }

    try {
      var tarefas = TarefaRepository.listar(orgId, {});
      tarefas.filter(function(t) { return t.status !== 'concluida' && t.status !== 'cancelada'; })
        .forEach(function(t) {
          _registrar(t.responsavel, 'tarefas', t.prazo && new Date(t.prazo) < hoje);
        });
    } catch(e) { /* silencioso */ }

    try {
      var demandas = BalcaoRepository.listar(orgId, {});
      demandas.filter(function(d) { return d.status !== 'concluida' && d.status !== 'cancelada'; })
        .forEach(function(d) {
          _registrar(d.executor, 'demandas', d.dataLimite && new Date(d.dataLimite) < hoje);
        });
    } catch(e) { /* silencioso */ }

    try {
      var encs = ReuniaoRepository.listarEncaminhamentosPendentes(orgId, null);
      encs.forEach(function(e) {
        _registrar(e.responsavel, 'encaminhamentos', e.vencido);
      });
    } catch(e) { /* silencioso */ }

    // Enriquecer com nomes via mapa bulk (evita N+1 calls)
    var nomeMap = {};
    try {
      AcessoService.listarUsuarios().forEach(function(u) {
        if (u.email) nomeMap[u.email] = u.nome || u.email;
      });
    } catch(e) { /* silencioso */ }

    var resultado = Object.keys(carga).map(function(k) {
      var p = carga[k];
      p.nome = nomeMap[k] || k.replace(/@.*$/, '');
      return p;
    });
    resultado.sort(function(a, b) {
      var totalA = a.tarefas + a.demandas + a.encaminhamentos;
      var totalB = b.tarefas + b.demandas + b.encaminhamentos;
      return totalB - totalA;
    });
    return { pessoas: resultado, totalPessoas: resultado.length };
  }, 'ctrl_taskhub_meu_time');
}

/**
 * Visão "Produtividade" — tarefas concluídas, tempo médio, taxa on-time.
 */
function ctrl_taskhub_produtividade(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');

    var orgId = getOrgConfig().orgId;
    var dias  = (params && params.dias) || 30;
    var desde = new Date(new Date().getTime() - dias * 86400000);

    var concluidas = 0;
    var noPrazo    = 0;
    var totalMs    = 0;

    try {
      var tarefas = TarefaRepository.listar(orgId, { responsavel: email });
      tarefas.filter(function(t) {
        return t.status === 'concluida' && t.concluidaEm && new Date(t.concluidaEm) >= desde;
      }).forEach(function(t) {
        concluidas++;
        if (t.prazo && new Date(t.concluidaEm) <= new Date(t.prazo)) noPrazo++;
        if (t.criadoEm && t.concluidaEm) {
          totalMs += new Date(t.concluidaEm) - new Date(t.criadoEm);
        }
      });
    } catch(e) { /* silencioso */ }

    var mediaHoras = concluidas > 0 ? Math.round(totalMs / concluidas / 3600000) : 0;
    var taxaNoPrazo = concluidas > 0 ? Math.round(100 * noPrazo / concluidas) : 0;

    return {
      periodo:     dias + ' dias',
      concluidas:  concluidas,
      noPrazo:     noPrazo,
      atrasadas:   concluidas - noPrazo,
      taxaNoPrazo: taxaNoPrazo,
      mediaHoras:  mediaHoras,
      mediaDias:   Math.round(mediaHoras / 24 * 10) / 10
    };
  }, 'ctrl_taskhub_produtividade');
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function _itemCaixa(tipo, id, titulo, prazo, urgencia, modulo, extras) {
  var hoje   = new Date();
  var amanha = new Date(hoje.getTime() + 86400000);
  var prazoDate = prazo ? new Date(prazo) : null;
  var vencido   = prazoDate && prazoDate < hoje;
  var ehHoje    = prazoDate && prazoDate >= hoje && prazoDate <= amanha;
  var ehSemana  = prazoDate && prazoDate > amanha && prazoDate <= new Date(hoje.getTime() + 7 * 86400000);

  return Object.assign({
    tipo:       tipo,
    id:         id,
    titulo:     titulo || '—',
    prazo:      prazo  || null,
    urgencia:   urgencia || 'media',
    modulo:     modulo,
    vencido:    vencido,
    grupoHoje:  vencido || ehHoje,
    grupoSemana: ehSemana,
    grupoDepois: !vencido && !ehHoje && !ehSemana
  }, extras || {});
}

function _priorizar(itens, hoje) {
  var URGENCIA_PESO = { critica: 0, alta: 1, media: 2, baixa: 3 };
  return itens.sort(function(a, b) {
    // Vencidos primeiro
    if (a.vencido !== b.vencido) return a.vencido ? -1 : 1;
    // Depois por urgência
    var uA = URGENCIA_PESO[a.urgencia] !== undefined ? URGENCIA_PESO[a.urgencia] : 2;
    var uB = URGENCIA_PESO[b.urgencia] !== undefined ? URGENCIA_PESO[b.urgencia] : 2;
    if (uA !== uB) return uA - uB;
    // Depois por prazo
    if (a.prazo && b.prazo) return new Date(a.prazo) - new Date(b.prazo);
    if (a.prazo) return -1;
    if (b.prazo) return 1;
    return 0;
  });
}

function _calcularSlaPct(demanda) {
  if (!demanda.dataSubmissao || !demanda.dataLimite) return 0;
  var total   = new Date(demanda.dataLimite) - new Date(demanda.dataSubmissao);
  var decorrido = new Date() - new Date(demanda.dataSubmissao);
  if (total <= 0) return 100;
  return Math.min(100, Math.round(100 * decorrido / total));
}

function _alertaSevToUrgencia(severidade) {
  if (severidade === 'URGENTE') return 'alta';
  if (severidade === 'ATENCAO') return 'media';
  return 'baixa';
}
