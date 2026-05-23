/**
 * @file modules/admin/sistema_metricas_controller.gs
 * @layer modules/admin
 * @description Controller de Observabilidade do Sistema — exclusivo para superadmin.
 *
 * Consolida dados de uso real (auditoria, FSM, segurança, governança, usuários)
 * e gera insights acionáveis sobre módulos inativos, hotspots de erro e padrões
 * de uso incorretos.
 *
 * RBAC: superadmin apenas.
 *
 * @depends core/auth_session.gs (getEmailSessao)
 *          core/services/acesso_service.gs (AcessoService)
 *          core/services/auditoria_store.gs (AuditoriaStore)
 *          core/services/metrics_engine.gs (MetricsEngine)
 *          modules/admin/modulos_registry_service.gs (ModulosRegistryService)
 *          shared/response.gs (GasResponse)
 */

// Mapeamento de módulos do catálogo → nomes usados no AuditoriaStore
var _SM_MAPA_AUDIT = {
  'ADMIN':       ['admin', 'permissoes', 'usuarios', 'acesso', 'sistema'],
  'TAREFAS':     ['tarefas'],
  'PESSOAS':     ['pessoas', 'colaboradores', 'contratados', 'rh', 'pccs'],
  'FINANCEIRO':  ['financeiro', 'contratos', 'remanejamentos', 'aditivos', 'fontes_recurso'],
  'ACOES':       ['acoes', 'acao', 'habilitacoes', 'qualificacoes'],
  'ESPACOS':     ['reservas', 'ativos', 'chaves', 'almoxarifado', 'espacos', 'solicitacao_reserva'],
  'REUNIOES':    ['reunioes'],
  'COMUNICACAO': ['comunicacao', 'rece'],
  'RELATORIOS':  ['relatorios', 'codip']
};

/**
 * Retorna o payload completo de observabilidade do sistema.
 * Aceita { periodo: 7|30|90 } dias para janela de análise (padrão: 30).
 */
function ctrl_sistema_metricas_obter(params) {
  return GasResponse.wrap(function() {
    // ── Autenticação e autorização ────────────────────────────────
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') {
      var eAcesso = new Error('Acesso negado.');
      eAcesso.code = 'PERMISSAO'; throw eAcesso;
    }
    var papel = acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador';
    if (papel !== 'superadmin') {
      var ePerm = new Error('Acesso restrito a superadmin.');
      ePerm.code = 'PERMISSAO'; throw ePerm;
    }

    // ── Janela temporal ────────────────────────────────────────────
    var periodo = (params && params.periodo) ? Number(params.periodo) : 30;
    if ([7, 30, 90].indexOf(periodo) === -1) periodo = 30;
    var agora_  = new Date();
    var inicio  = new Date(agora_.getTime() - periodo * 86400000);
    var filtros = {
      dataInicio: inicio.toISOString(),
      dataFim:    agora_.toISOString()
    };

    // ── Coleta de dados ────────────────────────────────────────────
    var statsGlobal    = AuditoriaStore.obterEstatisticas();
    var eventosCriticos = AuditoriaStore.consultar({ categoria: 'CRITICO', limite: 25 });
    var modulosComEvento = AuditoriaStore.obterModulosAtivos();

    // Falhas por módulo (consulta separada pois obterEstatisticas() só tem total global de falhas)
    var falhasPorModulo = {};
    try {
      var falhasLista = AuditoriaStore.consultar({ resultado: 'falha', limite: 500 });
      falhasLista.forEach(function(ev) {
        falhasPorModulo[ev.modulo] = (falhasPorModulo[ev.modulo] || 0) + 1;
      });
    } catch(_) {}

    var mFsm        = MetricsEngine.fsm(filtros);
    var mSeguranca  = MetricsEngine.seguranca(filtros);
    var mGovernanca = MetricsEngine.governanca(filtros);
    var mUsuarios   = MetricsEngine.usuarios(filtros);
    var mPerformance = MetricsEngine.performance(filtros);

    // ── Módulos inativos (catálogo ativo ∩ sem eventos) ───────────
    var todosModulos  = ModulosRegistryService.listarTodos();
    var modulosAtivos = todosModulos.filter(function(m) { return m.ativo; });
    var modulosInativos = modulosAtivos.filter(function(m) {
      var nomes = _SM_MAPA_AUDIT[m.id] || [m.id.toLowerCase()];
      return !nomes.some(function(nome) {
        return modulosComEvento.indexOf(nome) !== -1;
      });
    });

    // ── Hotspots de erro (taxa > 15% por módulo) ──────────────────
    var hotspots = [];
    Object.keys(statsGlobal.por_modulo || {}).forEach(function(mod) {
      var total  = statsGlobal.por_modulo[mod] || 0;
      var falhas = falhasPorModulo[mod]         || 0;
      if (total >= 5 && (falhas / total) > 0.15) {
        hotspots.push({
          modulo: mod,
          total:  total,
          falhas: falhas,
          taxa:   Math.round(falhas / total * 100)
        });
      }
    });
    hotspots.sort(function(a, b) { return b.taxa - a.taxa; });

    // ── Usuários com acessos negados repetidos ────────────────────
    var acessosNegados = {};
    try {
      AuditoriaStore.consultar({ tipo: 'ACCESS_DENIED', limite: 200 }).forEach(function(ev) {
        if (ev.usuario) {
          acessosNegados[ev.usuario] = (acessosNegados[ev.usuario] || 0) + 1;
        }
      });
    } catch(_) {}
    var usuariosNegados = Object.keys(acessosNegados)
      .filter(function(u) { return acessosNegados[u] >= 2; })
      .map(function(u) { return { usuario: u, tentativas: acessosNegados[u] }; })
      .sort(function(a, b) { return b.tentativas - a.tentativas; });

    // ── Geração de insights ───────────────────────────────────────
    var insights = [];

    if (mFsm && mFsm.totalViolacoes > 0) {
      insights.push({
        tipo:      'FSM',
        severidade:'critico',
        icone:     'account_tree',
        titulo:    'Violações de máquina de estados detectadas',
        descricao: mFsm.totalViolacoes + ' transição(ões) inválida(s) em: ' +
                   Object.keys(mFsm.porDominio || {}).join(', '),
        dados:     mFsm.porDominio || {}
      });
    }

    if (mGovernanca && mGovernanca.totalViolacoes > 0) {
      insights.push({
        tipo:      'GOVERNANCA',
        severidade:'critico',
        icone:     'policy',
        titulo:    'Violações arquiteturais registradas',
        descricao: mGovernanca.totalViolacoes + ' violação(ões). Conformidade: ' +
                   (mGovernanca.conforme ? 'OK' : 'FALHA'),
        dados:     mGovernanca.porTipo || {}
      });
    }

    hotspots.forEach(function(h) {
      insights.push({
        tipo:      'ERRO',
        severidade:'critico',
        icone:     'error',
        titulo:    'Hotspot de erros — módulo "' + h.modulo + '"',
        descricao: h.taxa + '% de falhas (' + h.falhas + '/' + h.total + ' operações registradas)',
        dados:     h
      });
    });

    if (mSeguranca && mSeguranca.totalFalhas > 0) {
      insights.push({
        tipo:      'SEGURANCA',
        severidade:'critico',
        icone:     'lock_open',
        titulo:    'Falhas de autenticação detectadas',
        descricao: mSeguranca.totalFalhas + ' falha(s) em ' +
                   (mSeguranca.usuariosAfetados || 0) + ' usuário(s)',
        dados:     mSeguranca.falhasPorEmail || {}
      });
    }

    usuariosNegados.forEach(function(u) {
      insights.push({
        tipo:      'ACESSO_NEGADO',
        severidade:'aviso',
        icone:     'no_accounts',
        titulo:    'Tentativas de acesso negado repetidas',
        descricao: u.usuario + ' — ' + u.tentativas + ' tentativa(s) bloqueada(s)',
        dados:     u
      });
    });

    modulosInativos.forEach(function(m) {
      insights.push({
        tipo:      'INATIVO',
        severidade:'aviso',
        icone:     'power_off',
        titulo:    'Módulo sem atividade — ' + m.label,
        descricao: 'Nenhum evento registrado nos últimos ' + periodo + ' dias. Considere desativar.',
        dados:     { moduloId: m.id, label: m.label }
      });
    });

    // ── Ranking de usuários ────────────────────────────────────────
    var rankingUsuarios = Object.keys(statsGlobal.por_usuario || {})
      .map(function(u) { return { usuario: u, eventos: statsGlobal.por_usuario[u] }; })
      .sort(function(a, b) { return b.eventos - a.eventos; })
      .slice(0, 10);

    // ── Ranking de módulos ─────────────────────────────────────────
    var rankingModulos = Object.keys(statsGlobal.por_modulo || {})
      .map(function(m) {
        var total  = statsGlobal.por_modulo[m] || 0;
        var falhas = falhasPorModulo[m]         || 0;
        return {
          modulo:     m,
          total:      total,
          falhas:     falhas,
          taxaErro:   total > 0 ? Math.round(falhas / total * 100) : 0
        };
      })
      .sort(function(a, b) { return b.total - a.total; });

    return {
      periodo:     periodo,
      geradoEm:    new Date().toISOString(),
      resumo: {
        totalEventos:      statsGlobal.total    || 0,
        eventosCriticos:   statsGlobal.criticos  || 0,
        falhasGlobal:      statsGlobal.falhas    || 0,
        modulosCatalogo:   todosModulos.length,
        modulosAtivos:     modulosAtivos.length,
        modulosComEvento:  modulosComEvento.length,
        usuariosUnicos:    mUsuarios && mUsuarios.usuariosUnicos ? mUsuarios.usuariosUnicos : 0
      },
      insights:        insights,
      rankingModulos:  rankingModulos,
      rankingUsuarios: rankingUsuarios,
      eventosCriticos: eventosCriticos,
      fsm:             mFsm,
      seguranca:       mSeguranca,
      governanca:      mGovernanca,
      performance:     mPerformance
    };
  }, 'ctrl_sistema_metricas_obter');
}
