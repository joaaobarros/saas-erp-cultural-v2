/**
 * @file core/setup.gs
 * @layer core
 * @description Inicialização do sistema e schema canônico de abas.
 *
 * REGRA CRÍTICA: ABA_PARA_MODULO (utils.gs) e o schema aqui devem estar
 * SEMPRE sincronizados. Adicionar aba em um → adicionar no outro.
 *
 * inicializarSistema()   — primeiro boot de uma nova organização
 * verificarTodasAbas()   — health check: confirma que todas as abas existem
 * recriarEstrutura()     — recria abas faltantes (safe, não deleta dados)
 */

// Chaves PropertiesService para IDs das planilhas
var PROP_SHEETS = {
  MASTER:      'SHEET_ID_MASTER',
  ACOES:       'SHEET_ID_ACOES',
  ESPACOS:     'SHEET_ID_ESPACOS',
  PESSOAL:     'SHEET_ID_PESSOAL',
  EQUIPES:     'SHEET_ID_EQUIPES',
  FINANCEIRO:  'SHEET_ID_FINANCEIRO',
  RELATORIOS:  'SHEET_ID_RELATORIOS',
  REUNIOES:    'SHEET_ID_REUNIOES',
  COMUNICACAO: 'SHEET_ID_COMUNICACAO',
  PUBLICO:     'SHEET_ID_PUBLICO',
  ESCUTA:      'SHEET_ID_ESCUTA'
};

// Schema de abas esperadas por planilha
var SCHEMA_ABAS = {
  MASTER: [
    'Configuracoes', 'Itens', 'Listas', 'PreferenciasUsuarios',
    'EventLog', 'Auditoria', 'AuditoriaFsm', 'AlertasLog'
  ],
  ACOES: [
    'Acoes', 'Habilitacoes', 'AcoesRecursos', 'HabDiaria', 'Indicadores', 'Metas'
  ],
  ESPACOS: [
    'Reservas', 'ReservasItens', 'EmprestimosItens', 'Chaves', 'Protocolos',
    'Ativos', 'MovimentacoesAtivos', 'Manutencoes', 'UsoAtivos', 'BaixasAtivos',
    'AlertasInfra', 'Solicitacoes'
  ],
  PESSOAL: ['Tarefas', 'Demandas', 'Processos'],
  EQUIPES: [
    'Funcionarios', 'Vinculos', 'Escalas', 'Ferias', 'Ocorrencias',
    'Afastamentos', 'ParametrosRH', 'Avaliacoes'
  ],
  FINANCEIRO: [
    'Contratos', 'ContratosVersoes', 'Rubricas', 'Pagamentos',
    'Contratacoes', 'Orcamentos', 'Remanejamentos', 'Aditivos', 'FontesRecurso'
  ],
  RELATORIOS: ['CODIP', 'RelGerencial', 'Exportacoes'],
  REUNIOES:   ['Reunioes', 'Encaminhamentos', 'Atas'],
  COMUNICACAO:['Demandas', 'Entregas', 'Versoes', 'AgendaRECE'],
  PUBLICO:    ['Inscricoes', 'Presencas', 'Pesquisas', 'Certificados'],
  ESCUTA:     ['Pesquisas', 'Respostas', 'Indicadores']
};

/**
 * Inicialização completa do sistema para uma nova organização.
 * Executar apenas uma vez por deployment.
 */
function inicializarSistema() {
  var org = getOrgConfig();
  if (!org.orgId) throw new Error('[setup] ORG_ID não configurado. Defina via PropertiesService.');

  Logger.info('setup', 'inicializarSistema', 'Iniciando para: ' + org.nome + ' (' + org.orgId + ')');

  _criarOuRegistrarPlanilhas();
  recriarEstrutura();
  SystemEvents.garantirAbaEventLog();
  if (typeof TarefaRepository !== 'undefined' &&
      typeof TarefaRepository.garantirCabecalhoIndice === 'function') {
    TarefaRepository.garantirCabecalhoIndice();
    TarefaRepository.protegerIndice();
  }

  // Fase 1.4 — Ativos: garante cabeçalhos nas abas ESPACOS de patrimônio
  if (typeof AtivoRepository !== 'undefined' &&
      typeof AtivoRepository.prepararIndice === 'function') {
    AtivoRepository.prepararIndice();
  }

  // Fase 2.1 — Reservas: garante cabeçalho em ESPACOS.Reservas
  if (typeof ReservaRepository !== 'undefined' &&
      typeof ReservaRepository.prepararIndice === 'function') {
    ReservaRepository.prepararIndice();
  }

  // Fase 2.2 — Empréstimos: garante cabeçalhos em MASTER.Itens + ESPACOS.EmprestimosItens
  if (typeof ReservasItensRepository !== 'undefined' &&
      typeof ReservasItensRepository.prepararIndice === 'function') {
    ReservasItensRepository.prepararIndice();
  }

  // Fase 2.3 — Chaves: garante cabeçalho em ESPACOS.Chaves
  if (typeof ChaveRepository !== 'undefined' &&
      typeof ChaveRepository.prepararIndice === 'function') {
    ChaveRepository.prepararIndice();
  }

  // Registra o superadmin inicial (email de quem executa este script pela primeira vez)
  // Se ADMIN_EMAIL estiver configurado em PropertiesService, usa ele; caso contrário, usa a sessão ativa.
  var adminProp  = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || '';
  var adminEmail = adminProp || Session.getActiveUser().getEmail() || '';
  if (adminEmail && typeof AcessoService !== 'undefined') {
    AcessoService.registrarSuperAdmin(adminEmail);
    Logger.info('setup', 'inicializarSistema', 'SuperAdmin registrado: ' + adminEmail);
  }

  Logger.info('setup', 'inicializarSistema', 'Sistema inicializado com sucesso.');
  return verificarTodasAbas();
}

/**
 * Verifica se todas as abas esperadas existem.
 * @returns {{ ok: boolean, abas_faltando: string[], total: number, presentes: number }}
 */
function verificarTodasAbas() {
  var props      = PropertiesService.getScriptProperties();
  var faltando   = [];
  var total      = 0;
  var presentes  = 0;

  Object.keys(SCHEMA_ABAS).forEach(function(planilhaNome) {
    var sheetId = props.getProperty(PROP_SHEETS[planilhaNome]);
    if (!sheetId) {
      SCHEMA_ABAS[planilhaNome].forEach(function(aba) {
        faltando.push(planilhaNome + '.' + aba + ' (planilha não registrada)');
        total++;
      });
      return;
    }

    try {
      var ss = SpreadsheetApp.openById(sheetId);
      SCHEMA_ABAS[planilhaNome].forEach(function(nomeAba) {
        total++;
        if (ss.getSheetByName(nomeAba)) {
          presentes++;
        } else {
          faltando.push(planilhaNome + '.' + nomeAba);
        }
      });
    } catch (e) {
      SCHEMA_ABAS[planilhaNome].forEach(function(aba) {
        faltando.push(planilhaNome + '.' + aba + ' (planilha inacessível)');
      });
      total += SCHEMA_ABAS[planilhaNome].length;
    }
  });

  var resultado = {
    ok:            faltando.length === 0,
    abas_faltando: faltando,
    total:         total,
    presentes:     presentes,
    percentual:    total > 0 ? Math.round((presentes / total) * 100) : 0
  };

  if (!resultado.ok) {
    Logger.warn('setup', 'verificarTodasAbas',
      presentes + '/' + total + ' abas presentes. Faltando: ' + faltando.join(', '));
  } else {
    Logger.info('setup', 'verificarTodasAbas', '100% das abas presentes (' + total + ')');
  }

  return resultado;
}

/**
 * Recria abas faltantes em todas as planilhas. Safe: não deleta dados existentes.
 */
function recriarEstrutura() {
  var props = PropertiesService.getScriptProperties();

  Object.keys(SCHEMA_ABAS).forEach(function(planilhaNome) {
    var sheetId = props.getProperty(PROP_SHEETS[planilhaNome]);
    if (!sheetId) return;

    try {
      var ss = SpreadsheetApp.openById(sheetId);
      SCHEMA_ABAS[planilhaNome].forEach(function(nomeAba) {
        if (!ss.getSheetByName(nomeAba)) {
          ss.insertSheet(nomeAba);
          Logger.info('setup', 'recriarEstrutura', 'Aba criada: ' + planilhaNome + '.' + nomeAba);
        }
      });
    } catch (e) {
      Logger.warn('setup', 'recriarEstrutura', planilhaNome + ': ' + e.message);
    }
  });
}

// ─── Privados ─────────────────────────────────────────────────────────────────

function _criarOuRegistrarPlanilhas() {
  var props = PropertiesService.getScriptProperties();
  var org   = getOrgConfig();

  Object.keys(PROP_SHEETS).forEach(function(nome) {
    var propKey = PROP_SHEETS[nome];
    if (props.getProperty(propKey)) return; // já registrada

    var titulo = org.nome + '_' + nome;
    var ss     = SpreadsheetApp.create(titulo);
    props.setProperty(propKey, ss.getId());
    Logger.info('setup', '_criarOuRegistrarPlanilhas', 'Planilha criada: ' + titulo + ' → ' + ss.getId());
  });
}
