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
    'EventLog', 'Auditoria', 'AuditoriaFsm', 'AlertasLog', 'Contratados',
    'AgentesCulturais', 'Voluntarios'
  ],
  ACOES: [
    'Acoes', 'Habilitacoes', 'AcoesRecursos', 'HabDiaria', 'Indicadores', 'Metas',
    'Acervo', 'Parcerias'
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

  // Fase 5 — Ações: garante cabeçalho em ACOES.Acoes
  if (typeof AcaoRepository !== 'undefined' &&
      typeof AcaoRepository.prepararIndice === 'function') {
    AcaoRepository.prepararIndice();
  }

  // Fase 6 — RECE: garante aba COMUNICACAO.AgendaRECE + JSON índice
  if (typeof ReceRepository !== 'undefined' &&
      typeof ReceRepository.prepararIndice === 'function') {
    ReceRepository.prepararIndice(org.orgId);
  }

  // Fase 6 — TokenService: garante aba MASTER.Tokens
  if (typeof TokenService !== 'undefined' &&
      typeof TokenService.garantirAbaTokens === 'function') {
    TokenService.garantirAbaTokens();
  }

  // Fase 6 — EventBus: migração do EventLog para schema de 11 colunas
  SystemEvents.garantirAbaEventLog();

  // Fase 7 — Público: índice de inscrições, presenças, pesquisas, certificados e consentimentos
  if (typeof PublicoRepository !== 'undefined' &&
      typeof PublicoRepository.prepararIndice === 'function') {
    PublicoRepository.prepararIndice(org.orgId);
  }
  if (typeof ConsentimentoService !== 'undefined' &&
      typeof ConsentimentoService.prepararIndice === 'function') {
    ConsentimentoService.prepararIndice();
  }

  // Fase 8 — Agentes Culturais
  if (typeof AgenteCulturalRepository !== 'undefined' &&
      typeof AgenteCulturalRepository.prepararIndice === 'function') {
    AgenteCulturalRepository.prepararIndice();
  }

  // Fase 8 — Acervo Digital
  if (typeof AcervoRepository !== 'undefined' &&
      typeof AcervoRepository.prepararIndice === 'function') {
    AcervoRepository.prepararIndice();
  }

  // Fase 8 — Voluntários
  if (typeof VoluntarioRepository !== 'undefined' &&
      typeof VoluntarioRepository.prepararIndice === 'function') {
    VoluntarioRepository.prepararIndice();
  }

  // Fase 8 — Parcerias
  if (typeof ParceriaRepository !== 'undefined' &&
      typeof ParceriaRepository.prepararIndice === 'function') {
    ParceriaRepository.prepararIndice();
  }

  // Fase 10 — Reuniões: garante cabeçalho em REUNIOES.Reunioes
  if (typeof ReuniaoRepository !== 'undefined' &&
      typeof ReuniaoRepository.prepararIndice === 'function') {
    ReuniaoRepository.prepararIndice();
  }

  // Fase 10 — Balcão: garante cabeçalho em COMUNICACAO.Demandas
  if (typeof BalcaoRepository !== 'undefined' &&
      typeof BalcaoRepository.prepararIndice === 'function') {
    BalcaoRepository.prepararIndice();
  }

  // Fase 10 — AlertasEngine: garante aba MASTER.AlertasLog
  if (typeof AlertasEngine !== 'undefined' &&
      typeof AlertasEngine.garantirAbaAlertasLog === 'function') {
    AlertasEngine.garantirAbaAlertasLog();
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
    // ── Uso público ──────────────────────────────────────────────────────
    { id:'esp-01', nome:'Sala de Cultura Digital',          tipoEspaco:'multiuso',    capacidade:40,  possuiChaves:true,  aceitaReserva:true,  numeroPlanta:1,  categoria:'uso_publico' },
    { id:'esp-03', nome:'Cineclube',                         tipoEspaco:'auditorio',   capacidade:30,  possuiChaves:true,  aceitaReserva:true,  numeroPlanta:3,  categoria:'uso_publico' },
    { id:'esp-04', nome:'Multigaleria',                      tipoEspaco:'galeria',     capacidade:100, possuiChaves:true,  aceitaReserva:true,  numeroPlanta:4,  categoria:'uso_publico' },
    { id:'esp-11', nome:'Sala Multiuso / Ação Cultural',     tipoEspaco:'multiuso',    capacidade:50,  possuiChaves:false, aceitaReserva:true,  numeroPlanta:11, categoria:'uso_publico' },
    { id:'esp-12', nome:'Biblioteca',                        tipoEspaco:'biblioteca',  capacidade:30,  possuiChaves:true,  aceitaReserva:true,  numeroPlanta:12, categoria:'uso_publico' },
    { id:'esp-13', nome:'Sala de Dança',                     tipoEspaco:'sala_danca',  capacidade:40,  possuiChaves:true,  aceitaReserva:true,  numeroPlanta:13, categoria:'uso_publico' },
    { id:'esp-15', nome:'Estúdio',                           tipoEspaco:'estudio',     capacidade:20,  possuiChaves:true,  aceitaReserva:true,  numeroPlanta:15, categoria:'uso_publico' },
    { id:'esp-17', nome:'Bicicletário',                      tipoEspaco:'externo',     capacidade:50,  possuiChaves:false, aceitaReserva:false, numeroPlanta:17, categoria:'servicos'    },
    { id:'esp-18', nome:'Estacionamento',                    tipoEspaco:'externo',     capacidade:100, possuiChaves:false, aceitaReserva:false, numeroPlanta:18, categoria:'externo'     },
    { id:'esp-20', nome:'Banheiros (20 e 34)',                tipoEspaco:'sanitario',   capacidade:0,   possuiChaves:false, aceitaReserva:false, numeroPlanta:20, categoria:'servicos'    },
    { id:'esp-21', nome:'Escola de Cultura e Artes',         tipoEspaco:'multiuso',    capacidade:30,  possuiChaves:true,  aceitaReserva:true,  numeroPlanta:21, categoria:'uso_publico' },
    { id:'esp-23', nome:'Pátio Central',                     tipoEspaco:'circulacao',  capacidade:300, possuiChaves:false, aceitaReserva:true,  numeroPlanta:23, categoria:'uso_publico' },
    { id:'esp-25', nome:'Teatro',                            tipoEspaco:'auditorio',   capacidade:200, possuiChaves:true,  aceitaReserva:true,  numeroPlanta:25, categoria:'uso_publico' },
    { id:'esp-27', nome:'Praça de Convivência e Alimentação',tipoEspaco:'praca',       capacidade:150, possuiChaves:false, aceitaReserva:true,  numeroPlanta:27, categoria:'uso_publico' },
    { id:'esp-28', nome:'Espaço Paulo Freire',               tipoEspaco:'espaco_ext',  capacidade:200, possuiChaves:false, aceitaReserva:true,  numeroPlanta:28, categoria:'uso_publico' },
    { id:'esp-29', nome:'Espaço Marielle',                   tipoEspaco:'espaco_ext',  capacidade:80,  possuiChaves:false, aceitaReserva:true,  numeroPlanta:29, categoria:'uso_publico' },
    { id:'esp-30', nome:'Campinho Rafael Agostinho',         tipoEspaco:'espaco_ext',  capacidade:100, possuiChaves:false, aceitaReserva:true,  numeroPlanta:30, categoria:'uso_publico' },
    { id:'esp-31', nome:'Espaço Alternativo de Dança',       tipoEspaco:'sala_danca',  capacidade:30,  possuiChaves:true,  aceitaReserva:true,  numeroPlanta:31, categoria:'uso_publico' },
    { id:'esp-35', nome:'Camarins',                          tipoEspaco:'suporte',     capacidade:15,  possuiChaves:true,  aceitaReserva:true,  numeroPlanta:35, categoria:'uso_publico' },
    // ── Equipes internas ─────────────────────────────────────────────────
    { id:'esp-02', nome:'NArTE',                             tipoEspaco:'escritorio',  capacidade:15,  possuiChaves:true,  aceitaReserva:false, numeroPlanta:2,  categoria:'equipes'     },
    { id:'esp-05', nome:'Administrativo',                    tipoEspaco:'escritorio',  capacidade:10,  possuiChaves:true,  aceitaReserva:false, numeroPlanta:5,  categoria:'equipes'     },
    { id:'esp-06', nome:'Infraestrutura',                    tipoEspaco:'escritorio',  capacidade:5,   possuiChaves:true,  aceitaReserva:false, numeroPlanta:6,  categoria:'equipes'     },
    { id:'esp-07', nome:'Vestiário e Almoxarifado',          tipoEspaco:'almoxarifado',capacidade:10,  possuiChaves:true,  aceitaReserva:false, numeroPlanta:7,  categoria:'equipes'     },
    { id:'esp-08', nome:'Acesso / Circulação Interna',       tipoEspaco:'circulacao',  capacidade:0,   possuiChaves:false, aceitaReserva:false, numeroPlanta:8,  categoria:'servicos'    },
    { id:'esp-09', nome:'Sala de Elétrica',                  tipoEspaco:'tecnico',     capacidade:3,   possuiChaves:true,  aceitaReserva:false, numeroPlanta:9,  categoria:'tecnico'     },
    { id:'esp-10', nome:'Copa',                              tipoEspaco:'servicos',    capacidade:10,  possuiChaves:false, aceitaReserva:false, numeroPlanta:10, categoria:'servicos'    },
    { id:'esp-14', nome:'Sala de Máquinas (14 e 33)',        tipoEspaco:'tecnico',     capacidade:3,   possuiChaves:true,  aceitaReserva:false, numeroPlanta:14, categoria:'tecnico'     },
    { id:'esp-19', nome:'Gestão',                            tipoEspaco:'escritorio',  capacidade:8,   possuiChaves:true,  aceitaReserva:false, numeroPlanta:19, categoria:'equipes'     },
    { id:'esp-22', nome:'Comunicação',                       tipoEspaco:'escritorio',  capacidade:8,   possuiChaves:true,  aceitaReserva:false, numeroPlanta:22, categoria:'equipes'     },
    { id:'esp-24', nome:'Sala de TI',                        tipoEspaco:'tecnico',     capacidade:5,   possuiChaves:true,  aceitaReserva:false, numeroPlanta:24, categoria:'tecnico'     },
    { id:'esp-26', nome:'Sala de Vigilância',                tipoEspaco:'tecnico',     capacidade:3,   possuiChaves:true,  aceitaReserva:false, numeroPlanta:26, categoria:'tecnico'     },
    { id:'esp-32', nome:'Sala de Técnica',                   tipoEspaco:'tecnico',     capacidade:5,   possuiChaves:true,  aceitaReserva:false, numeroPlanta:32, categoria:'tecnico'     },
    { id:'esp-36', nome:'Vestiário e Almoxarifado (36)',      tipoEspaco:'almoxarifado',capacidade:10,  possuiChaves:true,  aceitaReserva:false, numeroPlanta:36, categoria:'equipes'     },
    { id:'esp-37', nome:'Espaço de Descanso',                tipoEspaco:'servicos',    capacidade:15,  possuiChaves:false, aceitaReserva:false, numeroPlanta:37, categoria:'servicos'    }
  ];

  var criados = 0;
  modifyJSON('espacos_config.json', function(lista) {
    if (!Array.isArray(lista)) lista = [];
    espacos.forEach(function(e) {
      if (lista.some(function(l) { return l.id === e.id && l.orgId === orgId; })) return;
      lista.push(Object.assign({
        orgId: orgId, descricao: '', horarioFuncionamento: { abertura: '08:00', fechamento: '22:00' },
        responsaveis: [], itensFixos: {}, equipamentosVinculados: [], tags: [],
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

// ─── Funções globais de fase (executar no GAS Editor) ─────────────────────────

/**
 * Fase 6 — RECE: prepara aba AgendaRECE + JSON índice.
 * Executar uma vez após deploy da Fase 6.
 */
function fase6_rece_prepararIndice() {
  var org = getOrgConfig();
  ReceRepository.prepararIndice(org.orgId);
  TokenService.garantirAbaTokens();
  SystemEvents.garantirAbaEventLog();
  Logger.info('setup', 'fase6_rece_prepararIndice', 'RECE, Tokens e EventLog prontos.');
  return { ok: true, orgId: org.orgId };
}

/**
 * Fase 7 — Público: prepara índice de Inscrições, Presenças, Pesquisas,
 * Certificados (PUBLICO.*) e Consentimentos (MASTER.Consentimentos).
 * Executar uma vez após deploy da Fase 7.
 */
function fase7_publico_prepararIndice() {
  var org = getOrgConfig();
  PublicoRepository.prepararIndice(org.orgId);
  ConsentimentoService.prepararIndice();
  Logger.info('setup', 'fase7_publico_prepararIndice', 'Índices PUBLICO e Consentimentos prontos.');
  return { ok: true, orgId: org.orgId };
}

/**
 * Fase 8 — Agentes, Acervo, Voluntários, Parcerias:
 *   MASTER.AgentesCulturais, MASTER.Voluntarios,
 *   ACOES.Acervo, ACOES.Parcerias
 * Executar uma vez após deploy da Fase 8.
 */
function fase8_prepararIndice() {
  AgenteCulturalRepository.prepararIndice();
  AcervoRepository.prepararIndice();
  VoluntarioRepository.prepararIndice();
  ParceriaRepository.prepararIndice();
  Logger.info('setup', 'fase8_prepararIndice',
    'Índices F8 prontos: AgentesCulturais, Acervo, Voluntarios, Parcerias.');
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 9 — Multi-Tenancy e Painel Admin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fase 9 — Prepara:
 *   1. Executa migração de orgId em todos os JSONs de dados existentes
 *   2. Registra esta org no OrgRegistry (painel SaaS)
 *   3. Garante que a aba MASTER.Orgs existe
 * Executar uma vez após deploy da Fase 9.
 */
function fase9_prepararIndice() {
  var org    = getOrgConfig();
  var orgId  = org.orgId;

  // 1. Migrar orgId em todos os registros existentes
  var migRes = fase9_migrarOrgId();

  // 2. Registrar esta org no registry
  try { OrgRegistryService.registrarOuAtualizar(orgId, org); } catch(e) {
    Logger.warn('setup', 'fase9_prepararIndice', 'OrgRegistry: ' + e.message);
  }

  // 3. Garantir aba MASTER.Orgs
  try {
    var ss = _getSheet('SHEET_ID_MASTER', null);
    if (!ss.getSheetByName('Orgs')) {
      var aba = ss.insertSheet('Orgs');
      aba.getRange(1, 1, 1, 6).setValues([[
        'OrgId', 'Nome', 'NomeCompleto', 'Dominio', 'Status', 'ProvisionadoEm'
      ]]);
      aba.setFrozenRows(1);
    }
  } catch(e) {
    Logger.warn('setup', 'fase9_prepararIndice', 'Aba Orgs: ' + e.message);
  }

  Logger.info('setup', 'fase9_prepararIndice',
    'Fase 9 pronta. orgId=' + orgId + '. Migrados=' + (migRes.migrados || 0));
  return { ok: true, orgId: orgId, migrados: migRes.migrados, sem_orgId: migRes.sem_orgId };
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 10 — Alertas, TaskHub, Reuniões, Balcão e Auditoria Visual
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fase 10 — Prepara:
 *   1. REUNIOES.Reunioes — índice de reuniões e encaminhamentos
 *   2. COMUNICACAO.Demandas — índice do Balcão de Demandas
 *   3. MASTER.AlertasLog — aba de alertas operacionais
 * Executar uma vez após deploy da Fase 10.
 */
function fase10_prepararIndice() {
  var org = getOrgConfig();
  var resultado = { ok: true, passos: [] };

  try {
    ReuniaoRepository.prepararIndice();
    resultado.passos.push('ReuniaoRepository: OK');
  } catch(e) {
    resultado.passos.push('ReuniaoRepository: ERRO — ' + e.message);
    resultado.ok = false;
  }

  try {
    BalcaoRepository.prepararIndice();
    resultado.passos.push('BalcaoRepository: OK');
  } catch(e) {
    resultado.passos.push('BalcaoRepository: ERRO — ' + e.message);
    resultado.ok = false;
  }

  try {
    AlertasEngine.garantirAbaAlertasLog();
    resultado.passos.push('AlertasLog: OK');
  } catch(e) {
    resultado.passos.push('AlertasLog: ERRO — ' + e.message);
    resultado.ok = false;
  }

  // Adicionar balcao_demandas.json à lista de migração de orgId
  try {
    var orgId = org.orgId;
    modifyJSON('balcao_demandas.json', function(lista) {
      if (!Array.isArray(lista)) return lista;
      lista.forEach(function(item) { if (item && !item.orgId) item.orgId = orgId; });
      return lista;
    });
    resultado.passos.push('balcao_demandas.json orgId: OK');
  } catch(e) { /* arquivo pode não existir — normal */ }

  try {
    modifyJSON('reunioes.json', function(lista) {
      if (!Array.isArray(lista)) return lista;
      var orgId = org.orgId;
      lista.forEach(function(item) { if (item && !item.orgId) item.orgId = orgId; });
      return lista;
    });
    resultado.passos.push('reunioes.json orgId: OK');
  } catch(e) { /* silencioso */ }

  Logger.info('setup', 'fase10_prepararIndice',
    'Fase 10 pronta. Passos: ' + resultado.passos.join(' | '));
  return resultado;
}

/**
 * Migração idempotente: garante que todo registro em todos os JSONs
 * de dados tenha o campo orgId preenchido com o orgId desta organização.
 *
 * SEGURO: só escreve em registros que não têm orgId. Não altera registros
 * que já possuem orgId (preserva dados multi-tenant futuros).
 */
function fase9_migrarOrgId() {
  var orgId = getOrgConfig().orgId;
  var ARQUIVOS = [
    'tarefas.json',
    'colaboradores.json',
    'ferias.json',
    'afastamentos.json',
    'ocorrencias.json',
    'contratos.json',
    'contratos_versoes.json',
    'fontes_recurso.json',
    'remanejamentos_orcamentarios.json',
    'aditivos_contratos.json',
    'acoes.json',
    'reservas.json',
    'reservas_itens.json',
    'chaves.json',
    'movimentacoes_chaves.json',
    'solicitacoes_reserva.json',
    'contratados.json',
    'habilitacoes.json',
    'solicitacoes_contratacao.json',
    'agentes_culturais.json',
    'acervo.json',
    'voluntarios.json',
    'alocacoes_voluntarios.json',
    'parcerias.json',
    'inscricoes.json',
    'presencas.json',
    'pesquisas_satisfacao.json',
    'certificados.json',
    'consentimentos.json',
    'rece_agenda.json',
    'modulos_config.json'
  ];

  var totalMigrados  = 0;
  var totalSemOrgId  = 0;
  var erros          = [];

  ARQUIVOS.forEach(function(arquivo) {
    try {
      var contadorArquivo = 0;
      modifyJSON(arquivo, function(lista) {
        if (!Array.isArray(lista)) return lista;
        lista.forEach(function(item) {
          if (item && !item.orgId) {
            item.orgId = orgId;
            contadorArquivo++;
          } else if (item && item.orgId) {
            totalSemOrgId++; // já tem orgId — conta como "já ok"
          }
        });
        return lista;
      });
      totalMigrados += contadorArquivo;
      if (contadorArquivo > 0) {
        Logger.info('setup', 'fase9_migrarOrgId', arquivo + ': ' + contadorArquivo + ' registros migrados.');
      }
    } catch(e) {
      // Arquivo pode não existir ainda — normal
      if (e.message && e.message.indexOf('não encontrado') === -1 &&
          e.message && e.message.indexOf('not found') === -1) {
        Logger.warn('setup', 'fase9_migrarOrgId', arquivo + ': ' + e.message);
        erros.push(arquivo + ': ' + e.message);
      }
    }
  });

  Logger.info('setup', 'fase9_migrarOrgId',
    'Migração concluída. ' + totalMigrados + ' registros receberam orgId=' + orgId);
  return {
    ok:        true,
    orgId:     orgId,
    migrados:  totalMigrados,
    sem_orgId: totalSemOrgId,
    erros:     erros
  };
}

/**
 * Valida isolamento: verifica que TODOS os registros em todos os JSONs
 * possuem orgId. Retorna relatório com arquivos/contagens suspeitas.
 * Executar no GAS Editor para auditoria de integridade.
 */
function fase9_validarIsolamento() {
  var orgId   = getOrgConfig().orgId;
  var ARQUIVOS = [
    'tarefas.json','colaboradores.json','contratos.json','acoes.json',
    'reservas.json','chaves.json','contratados.json','agentes_culturais.json',
    'acervo.json','voluntarios.json','parcerias.json','inscricoes.json',
    'rece_agenda.json'
  ];

  var problemas = [];
  var ok        = 0;

  ARQUIVOS.forEach(function(arquivo) {
    try {
      var lista = readJSON(arquivo);
      if (!Array.isArray(lista)) return;
      var semOrgId    = lista.filter(function(r) { return !r.orgId; }).length;
      var outroOrgId  = lista.filter(function(r) { return r.orgId && r.orgId !== orgId; }).length;
      var correto     = lista.length - semOrgId - outroOrgId;
      if (semOrgId > 0 || outroOrgId > 0) {
        problemas.push({ arquivo: arquivo, total: lista.length, semOrgId: semOrgId, outroOrgId: outroOrgId, correto: correto });
      } else {
        ok++;
      }
    } catch(e) { /* arquivo não existe */ }
  });

  var resultado = {
    ok:        problemas.length === 0,
    orgId:     orgId,
    arquivosOk: ok,
    problemas: problemas
  };
  Logger.info('setup', 'fase9_validarIsolamento', JSON.stringify(resultado));
  return resultado;
}
