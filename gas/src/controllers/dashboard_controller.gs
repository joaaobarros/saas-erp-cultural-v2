/**
 * @file dashboard_controller.gs
 * @layer controller
 * @description Dashboard unificado: operacional, financeiro e estratégico.
 *   Agrega métricas de múltiplos módulos em chamadas otimizadas para o cockpit executivo.
 *   Fase 11.3 — Dashboards Reais + IA Analítica.
 * @depends estrategia_engine.gs, acoes_controller.gs, reservas_controller.gs,
 *           contratos_controller.gs, pessoas_controller.gs, escuta_engine.gs
 */

// ─── Helper de contexto ──────────────────────────────────────────────────────

function _ctxDash() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro ? (acesso.registro.papel || 'colaborador') : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

// ─── Dashboard Operacional ───────────────────────────────────────────────────

/**
 * Dashboard operacional: ocupação de espaços, SLAs, tarefas em atraso,
 * demandas abertas, alertas não lidos.
 */
function ctrl_dashboard_operacional(params) {
  return GasResponse.wrap(function() {
    var ctx = _ctxDash();
    var orgId = ctx.orgId;
    var resultado = {};

    // Reservas — taxa de ocupação e situação atual
    try {
      var reservas = ReservaRepository.listarTodas
        ? ReservaRepository.listarTodas(orgId)
        : (lerJSON('reservas.json') || []).filter(function(r){ return r.orgId === orgId; });
      var hoje = new Date().toISOString().split('T')[0];
      var reservasHoje   = reservas.filter(function(r){ return (r.data||'').startsWith(hoje); });
      var reservasAtivas = reservas.filter(function(r){ return r.status === 'em_uso'; });
      var reservasAgend  = reservas.filter(function(r){ return r.status === 'confirmado'; });
      resultado.espacos = {
        reservasHoje:    reservasHoje.length,
        reservasAtivas:  reservasAtivas.length,
        reservasAgendadas: reservasAgend.length
      };
    } catch(e) { resultado.espacos = null; }

    // Tarefas — pendentes e em atraso
    try {
      var tarefas = lerJSON('tarefas.json') || [];
      tarefas = tarefas.filter(function(t){ return t.orgId === orgId; });
      var agora = new Date();
      var atrasadas = tarefas.filter(function(t){
        return t.status !== 'concluida' && t.status !== 'cancelada' && t.prazo && new Date(t.prazo) < agora;
      });
      resultado.tarefas = {
        total:     tarefas.filter(function(t){ return t.status !== 'cancelada'; }).length,
        atrasadas: atrasadas.length,
        hoje:      tarefas.filter(function(t){
          return t.prazo && t.prazo.startsWith(hoje) && t.status !== 'concluida';
        }).length
      };
    } catch(e) { resultado.tarefas = null; }

    // Demandas Balcão — SLA
    try {
      var demandas = lerJSON('balcao_demandas.json') || [];
      demandas = demandas.filter(function(d){ return d.orgId === orgId; });
      var abertas  = demandas.filter(function(d){ return !['encerrada','cancelada'].includes(d.status); });
      resultado.balcao = {
        abertas: abertas.length,
        atrasadas: abertas.filter(function(d){
          return d.prazoSLA && new Date(d.prazoSLA) < agora;
        }).length
      };
    } catch(e) { resultado.balcao = null; }

    // Alertas não lidos
    try {
      var naoLidos = AlertasEngine.contarNaoLidos
        ? AlertasEngine.contarNaoLidos(orgId)
        : 0;
      resultado.alertas = { naoLidos: naoLidos };
    } catch(e) { resultado.alertas = { naoLidos: 0 }; }

    // Chaves vencidas
    try {
      var chaves = ChaveRepository
        ? ChaveRepository.listarAtrasadas(orgId)
        : [];
      resultado.chaves = { atrasadas: chaves.length };
    } catch(e) { resultado.chaves = { atrasadas: 0 }; }

    return resultado;
  }, 'ctrl_dashboard_operacional');
}

// ─── Dashboard Financeiro ────────────────────────────────────────────────────

/**
 * Dashboard financeiro: execução orçamentária por contrato/meta/rubrica,
 * fluxo de caixa previsto, remanejamentos pendentes, aditivos em análise.
 */
function ctrl_dashboard_financeiro(params) {
  return GasResponse.wrap(function() {
    var ctx   = _ctxDash();
    var orgId = ctx.orgId;
    var resultado = {};

    // Contratos — execução orçamentária
    try {
      var contratos = lerJSON('contratos.json') || [];
      contratos = contratos.filter(function(c){ return c.orgId === orgId; });
      var ativos    = contratos.filter(function(c){ return c.status === 'ativo'; });
      var totalPrevisto = 0, totalExecutado = 0;
      ativos.forEach(function(c) {
        var valor = Number(c.valorTotal || 0);
        totalPrevisto += valor;
        // execução: soma dos pagamentos realizados (campo pagamentos[])
        var pags = Array.isArray(c.pagamentos) ? c.pagamentos : [];
        pags.forEach(function(p){ totalExecutado += Number(p.valor||0); });
      });
      var pctExecucao = totalPrevisto > 0 ? Math.round((totalExecutado/totalPrevisto)*100) : 0;
      resultado.contratos = {
        total:          contratos.length,
        ativos:         ativos.length,
        totalPrevisto:  totalPrevisto,
        totalExecutado: totalExecutado,
        pctExecucao:    pctExecucao
      };
    } catch(e) { resultado.contratos = null; }

    // Remanejamentos pendentes
    try {
      var rems = lerJSON('remanejamentos.json') || [];
      rems = rems.filter(function(r){ return r.orgId === orgId; });
      resultado.remanejamentos = {
        pendentes: rems.filter(function(r){ return r.status === 'submetido' || r.status === 'aguardando_gestor'; }).length,
        total:     rems.length
      };
    } catch(e) { resultado.remanejamentos = null; }

    // Aditivos em análise
    try {
      var aditivos = lerJSON('aditivos.json') || [];
      aditivos = aditivos.filter(function(a){ return a.orgId === orgId; });
      resultado.aditivos = {
        emAnalise: aditivos.filter(function(a){ return ['submetido','aprovado_interno'].indexOf(a.status) >= 0; }).length,
        total:     aditivos.length
      };
    } catch(e) { resultado.aditivos = null; }

    // Fontes de Recurso — saldos
    try {
      var fontes = lerJSON('fontes_recurso.json') || [];
      fontes = fontes.filter(function(f){ return f.orgId === orgId && f.status === 'ativo'; });
      var totalFontes = 0;
      fontes.forEach(function(f){ totalFontes += Number(f.valor||0); });
      resultado.fontes = { ativas: fontes.length, totalValor: totalFontes };
    } catch(e) { resultado.fontes = null; }

    return resultado;
  }, 'ctrl_dashboard_financeiro');
}

// ─── Dashboard Estratégico ────────────────────────────────────────────────────

/**
 * Dashboard estratégico: KPIs reais calculados pelo EstrategiaEngine,
 * riscos do mês, objetivos por horizonte, clima organizacional.
 */
function ctrl_dashboard_estrategico(params) {
  return GasResponse.wrap(function() {
    var ctx   = _ctxDash();
    var orgId = ctx.orgId;
    var resultado = {};

    // KPIs calculados
    try {
      resultado.kpis = EstrategiaEngine.calcularKPIs(orgId);
    } catch(e) { resultado.kpis = null; }

    // Riscos do mês
    try {
      resultado.riscos = EstrategiaEngine.calcularRiscos(orgId);
    } catch(e) { resultado.riscos = null; }

    // Objetivos estratégicos por status
    try {
      var objetivos = EstrategiaRepository.listar(orgId);
      resultado.objetivos = {
        total:     objetivos.length,
        ativos:    objetivos.filter(function(o){ return o.status === 'ativo'; }).length,
        emRevisao: objetivos.filter(function(o){ return o.status === 'em_revisao'; }).length,
        concluidos: objetivos.filter(function(o){ return o.status === 'concluido'; }).length
      };
    } catch(e) { resultado.objetivos = null; }

    // Última pesquisa de clima
    try {
      var evolucao = EscutaEngine.obterEvolucaoClimaHistorica(orgId, 2);
      resultado.clima = evolucao.length > 0 ? evolucao[evolucao.length-1] : null;
    } catch(e) { resultado.clima = null; }

    // Ações em execução
    try {
      var acoes = lerJSON('acoes.json') || [];
      acoes = acoes.filter(function(a){ return a.orgId === orgId; });
      resultado.acoes = {
        total:       acoes.length,
        emExecucao:  acoes.filter(function(a){ return a.status === 'em_execucao'; }).length,
        planejadas:  acoes.filter(function(a){ return a.status === 'planejada'; }).length,
        concluidas:  acoes.filter(function(a){ return a.status === 'concluida'; }).length
      };
    } catch(e) { resultado.acoes = null; }

    return resultado;
  }, 'ctrl_dashboard_estrategico');
}

// ─── IA Analítica ────────────────────────────────────────────────────────────

/**
 * Gera insights analíticos a partir das métricas usando IA (Groq/fallback).
 * @param {object} params - { tipo: 'operacional'|'financeiro'|'estrategico' }
 */
function ctrl_dashboard_insights_ia(params) {
  return GasResponse.wrap(function() {
    params  = params || {};
    var ctx = _ctxDash();
    if (['admin','superadmin','coordenador','gestor'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado.');

    var tipo = params.tipo || 'estrategico';
    var orgId = ctx.orgId;

    // Coleta métricas do tipo solicitado
    var metricas;
    if (tipo === 'operacional') {
      metricas = GasResponse.wrap(function(){ return ctrl_dashboard_operacional({}).data; },
        '_ia_inner').data || {};
    } else if (tipo === 'financeiro') {
      metricas = GasResponse.wrap(function(){ return ctrl_dashboard_financeiro({}).data; },
        '_ia_inner').data || {};
    } else {
      metricas = GasResponse.wrap(function(){ return ctrl_dashboard_estrategico({}).data; },
        '_ia_inner').data || {};
    }

    var insights = [];

    // Análise baseada em regras (sempre disponível, sem IA externa)
    insights = insights.concat(_gerarInsightsRegras(tipo, metricas));

    // Análise via IA (Groq) — se disponível
    if (typeof IaService !== 'undefined') {
      try {
        var contexto = [
          'Você é um assistente de gestão cultural. Analise estas métricas e gere 3 insights executivos concisos (máx 2 frases cada):',
          JSON.stringify(metricas, null, 2)
        ].join('\n');
        var resIA = IaService.completar(contexto, { maxTokens: 400, orgId: orgId });
        if (resIA && resIA.texto) {
          insights.push({ tipo: 'ia', severidade: 'INFO', texto: resIA.texto });
        }
      } catch(e) {
        Logger.warn('dashboard', 'ctrl_dashboard_insights_ia', 'IA indisponível: ' + e.message);
      }
    }

    return { tipo: tipo, insights: insights };
  }, 'ctrl_dashboard_insights_ia');
}

/**
 * Gera relatório narrativo do período (IA analítica).
 */
function ctrl_dashboard_relatorio_ia(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var ctx = _ctxDash();
    if (['admin','superadmin','coordenador'].indexOf(ctx.papel) < 0)
      throw new Error('Acesso negado — papel coordenador+ necessário.');

    var orgId    = ctx.orgId;
    var periodo  = params.periodo || 'trimestral';

    try {
      return EstrategiaEngine.gerarRelatorio(orgId, { periodo: periodo });
    } catch(e) {
      throw new Error('Erro ao gerar relatório: ' + e.message);
    }
  }, 'ctrl_dashboard_relatorio_ia');
}

// ─── Helpers de análise por regras ───────────────────────────────────────────

function _gerarInsightsRegras(tipo, m) {
  var insights = [];
  if (!m) return insights;

  if (tipo === 'operacional') {
    if (m.tarefas && m.tarefas.atrasadas > 5)
      insights.push({ tipo: 'regra', severidade: 'ATENÇÃO',
        texto: m.tarefas.atrasadas + ' tarefas em atraso. Revisar prioridades da equipe.' });
    if (m.alertas && m.alertas.naoLidos > 10)
      insights.push({ tipo: 'regra', severidade: 'URGENTE',
        texto: m.alertas.naoLidos + ' alertas não lidos acumulados.' });
    if (m.balcao && m.balcao.atrasadas > 0)
      insights.push({ tipo: 'regra', severidade: 'ATENÇÃO',
        texto: m.balcao.atrasadas + ' demandas com SLA vencido no Balcão.' });
  }

  if (tipo === 'financeiro') {
    if (m.contratos && m.contratos.pctExecucao < 30)
      insights.push({ tipo: 'regra', severidade: 'ATENÇÃO',
        texto: 'Execução orçamentária em ' + m.contratos.pctExecucao + '%. Risco de devolução de recursos.' });
    if (m.contratos && m.contratos.pctExecucao > 90)
      insights.push({ tipo: 'regra', severidade: 'INFO',
        texto: 'Execução acima de 90%. Verificar disponibilidade para novas rubricas.' });
    if (m.remanejamentos && m.remanejamentos.pendentes > 2)
      insights.push({ tipo: 'regra', severidade: 'INFO',
        texto: m.remanejamentos.pendentes + ' remanejamentos aguardando aprovação.' });
  }

  if (tipo === 'estrategico') {
    if (m.riscos && Array.isArray(m.riscos)) {
      var urgentes = m.riscos.filter(function(r){ return r.severidade === 'URGENTE'; });
      if (urgentes.length > 0)
        insights.push({ tipo: 'regra', severidade: 'URGENTE',
          texto: urgentes.length + ' risco(s) urgente(s) identificado(s) este mês.' });
    }
    if (m.clima && m.clima.mediaPonderada && m.clima.mediaPonderada < 3)
      insights.push({ tipo: 'regra', severidade: 'URGENTE',
        texto: 'Clima organizacional crítico (média ' + m.clima.mediaPonderada + '/5). Ação imediata necessária.' });
    if (m.kpis && m.kpis.execucaoOrcamentaria && m.kpis.execucaoOrcamentaria < 0.3)
      insights.push({ tipo: 'regra', severidade: 'ATENÇÃO',
        texto: 'Execução orçamentária abaixo de 30% — risco de prestação de contas.' });
  }

  return insights;
}
