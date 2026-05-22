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
    'EventLog', 'Auditoria', 'AuditoriaFsm', 'AlertasLog', 'Contratados'
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
    'Contratacoes', 'SolicitacoesContratacao', 'Orcamentos', 'Remanejamentos', 'Aditivos', 'FontesRecurso'
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

  // Fase 3 — Contratados Externos: garante cabeçalho em MASTER.Contratados
  if (typeof ContratadoRepository !== 'undefined' &&
      typeof ContratadoRepository.garantirIndice === 'function') {
    ContratadoRepository.garantirIndice();
  }

  // Fase 3 — Solicitações de Contratação: garante cabeçalho em FINANCEIRO.SolicitacoesContratacao
  if (typeof SolicitacaoRepository !== 'undefined' &&
      typeof SolicitacaoRepository.garantirIndice === 'function') {
    SolicitacaoRepository.garantirIndice();
  }

  // Fase 4 — Fontes de Recurso, Remanejamentos e Aditivos (JSON canônico, sem índice Sheet)
  Logger.info('setup', 'inicializarSistema', 'Fase 4: fontes_recurso.json, remanejamentos_orcamentarios.json e aditivos_contratos.json serão criados ao primeiro uso.');

  // Fase 4.5 — Solicitations sheet + seeds de dados iniciais
  if (typeof SolicitacaoReservaRepository !== 'undefined' &&
      typeof SolicitacaoReservaRepository.prepararIndice === 'function') {
    SolicitacaoReservaRepository.prepararIndice();
  }
  try { setup_espacos_iniciais(); } catch(e) { Logger.warn('setup', 'inicializarSistema', 'setup_espacos_iniciais: ' + e.message); }
  try { setup_pccs_inicial(); }    catch(e) { Logger.warn('setup', 'inicializarSistema', 'setup_pccs_inicial: ' + e.message); }
  try { setup_categorias_itens_iniciais(); } catch(e) { Logger.warn('setup', 'inicializarSistema', 'setup_categorias_itens: ' + e.message); }

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

// ─── Seeds de Dados Iniciais ──────────────────────────────────────────────────

/**
 * Seed: 8 espaços iniciais do CCBJ.
 * Idempotente: ignora IDs já existentes no espacos_config.json.
 */
function setup_espacos_iniciais() {
  var orgId = getOrgConfig().orgId;
  var email = Session.getActiveUser().getEmail() || 'setup@sistema';
  var agora_ = agora();

  var espacos = [
    { id:'SAL-001', nome:'Teatro',          tipoEspaco:'auditorio',  capacidade:200, possuiChaves:true,  aceitaReserva:true  },
    { id:'SAL-002', nome:'Sala de Dança',   tipoEspaco:'sala_danca', capacidade:50,  possuiChaves:true,  aceitaReserva:true  },
    { id:'SAL-003', nome:'Biblioteca',      tipoEspaco:'biblioteca', capacidade:30,  possuiChaves:true,  aceitaReserva:true  },
    { id:'SAL-004', nome:'Multigaleria',    tipoEspaco:'multiuso',   capacidade:100, possuiChaves:true,  aceitaReserva:true  },
    { id:'SAL-005', nome:'Estúdio',         tipoEspaco:'estudio',    capacidade:20,  possuiChaves:true,  aceitaReserva:true  },
    { id:'SAL-006', nome:'Sala Multiuso',   tipoEspaco:'multiuso',   capacidade:40,  possuiChaves:false, aceitaReserva:true  },
    { id:'SAL-007', nome:'Praça Central',   tipoEspaco:'praca',      capacidade:300, possuiChaves:false, aceitaReserva:false },
    { id:'SAL-008', nome:'Áreas Abertas',   tipoEspaco:'externo',    capacidade:500, possuiChaves:false, aceitaReserva:false }
  ];

  var criados = 0;
  modifyJSON('espacos_config.json', function(lista) {
    if (!Array.isArray(lista)) lista = [];
    espacos.forEach(function(e) {
      if (lista.some(function(l) { return l.id === e.id && l.orgId === orgId; })) return;
      lista.push(Object.assign({
        orgId: orgId, descricao: '', horarioFuncionamento: { abertura: '08:00', fechamento: '22:00' },
        responsaveisPorTurno: [], itensFixos: {}, equipamentosVinculados: [], tags: [],
        bloqueios: [], ativo: true, criadoEm: agora_, atualizadoEm: agora_, criadoPor: email, versao: 1
      }, e));
      criados++;
    });
    return lista;
  });

  if (typeof SistemaConfigService !== 'undefined') SistemaConfigService.invalidarCache();
  Logger.info('setup', 'setup_espacos_iniciais', 'Criados: ' + criados + ' espaços.');
  return { criados: criados };
}

/**
 * Seed: PCCS inicial com 7 cargos.
 * Idempotente: não cria se já existir um PCCS ativo com o mesmo nome.
 */
function setup_pccs_inicial() {
  if (typeof PCCSRepository === 'undefined')
    return { erro: 'PCCSRepository não disponível.' };

  var orgId  = getOrgConfig().orgId;
  var email  = Session.getActiveUser().getEmail() || 'setup@sistema';
  var pccsId = 'PCCS-001';

  var existente = PCCSRepository.listarTodos().find(function(p) { return p.id === pccsId; });
  if (existente) return { criados: 0, msg: 'PCCS ' + pccsId + ' já existe.' };

  var cargos = [
    { id:'CRG-001', nome:'Diretor',                   tipo:'estrategico', descricao:'Gestão executiva e estratégica',
      tabela:[{ nivel:'A', classe:'I', referencia:1, salarioBase:8000 }] },
    { id:'CRG-002', nome:'Coordenador de Projetos',   tipo:'tatico',      descricao:'Coordenação de projetos e equipes',
      tabela:[{ nivel:'A', classe:'I', referencia:1, salarioBase:4500 }] },
    { id:'CRG-003', nome:'Técnico Operacional',       tipo:'operacional',  descricao:'Execução técnica de atividades',
      tabela:[{ nivel:'A', classe:'I', referencia:1, salarioBase:2500 }] },
    { id:'CRG-004', nome:'Educador / Artista Educador', tipo:'operacional', descricao:'Ensino e mediação cultural',
      tabela:[{ nivel:'A', classe:'I', referencia:1, salarioBase:2800 }] },
    { id:'CRG-005', nome:'Assistente Administrativo', tipo:'operacional',  descricao:'Suporte administrativo e financeiro',
      tabela:[{ nivel:'A', classe:'I', referencia:1, salarioBase:2000 }] },
    { id:'CRG-006', nome:'Auxiliar',                  tipo:'operacional',  descricao:'Atividades de apoio operacional',
      tabela:[{ nivel:'A', classe:'I', referencia:1, salarioBase:1800 }] },
    { id:'CRG-007', nome:'Estagiário',                tipo:'operacional',  descricao:'Estágio curricular ou extracurricular',
      tabela:[{ nivel:'A', classe:'I', referencia:1, salarioBase:1000 }] }
  ];

  PCCSRepository.salvar({
    id: pccsId, nome: 'PCCS CCBJ 2026',
    vigencia: { inicio: '2026-01-01', fim: '2026-12-31' },
    ativo: true, cargos: cargos
  }, email);

  Logger.info('setup', 'setup_pccs_inicial', 'PCCS criado com ' + cargos.length + ' cargos.');
  return { criados: cargos.length };
}

/**
 * Seed: 6 categorias iniciais de itens de almoxarifado.
 * Idempotente.
 */
function setup_categorias_itens_iniciais() {
  var orgId = getOrgConfig().orgId;
  var email = Session.getActiveUser().getEmail() || 'setup@sistema';
  var agora_ = agora();

  var categorias = [
    { id:'CAT-001', nome:'Equipamento Audiovisual',  descricao:'Câmeras, projetores, caixas de som, microfones' },
    { id:'CAT-002', nome:'Equipamento de Informática', descricao:'Notebooks, monitores, roteadores' },
    { id:'CAT-003', nome:'Mobiliário',               descricao:'Cadeiras, mesas, palcos, arquibancadas' },
    { id:'CAT-004', nome:'Material Gráfico',         descricao:'Banners, faixas, painéis, impressos' },
    { id:'CAT-005', nome:'Insumo',                   descricao:'Papel, tinta, material de limpeza' },
    { id:'CAT-006', nome:'Outro',                    descricao:'Itens sem categoria específica' }
  ];

  var criados = 0;
  modifyJSON('categorias_itens_config.json', function(lista) {
    if (!Array.isArray(lista)) lista = [];
    categorias.forEach(function(c) {
      if (lista.some(function(l) { return l.id === c.id && l.orgId === orgId; })) return;
      lista.push(Object.assign({ orgId: orgId, ativo: true,
        criadoPor: email, atualizadoEm: agora_ }, c));
      criados++;
    });
    return lista;
  });

  Logger.info('setup', 'setup_categorias_itens_iniciais', 'Criadas: ' + criados + ' categorias.');
  return { criados: criados };
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
