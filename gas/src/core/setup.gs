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
  ESCUTA:      'SHEET_ID_ESCUTA',
  ESTOQUE:     'SHEET_ID_ESTOQUE'
};

// Schema de abas esperadas por planilha
var SCHEMA_ABAS = {
  MASTER: [
    'Configuracoes', 'Itens', 'Listas', 'PreferenciasUsuarios',
    'EventLog', 'Auditoria', 'AuditoriaFsm', 'AlertasLog', 'LogAcessos',
    'Contratados', 'AgentesCulturais', 'Voluntarios'
  ],
  ESTOQUE: [
    'ItensEstoque', 'SaldoEstoque', 'MovimentacoesEstoque'
  ],
  ACOES: [
    'Acoes', 'Habilitacoes', 'AcoesRecursos', 'HabDiaria', 'Indicadores', 'Metas',
    'Acervo', 'Parcerias', 'Estrategia'
  ],
  ESPACOS: [
    'Reservas', 'ReservasItens', 'EmprestimosItens', 'Chaves', 'Protocolos',
    'Ativos', 'MovimentacoesAtivos', 'Manutencoes', 'UsoAtivos', 'BaixasAtivos',
    'AlertasInfra', 'Solicitacoes', 'ReservasCarro', 'SolicitacoesMaterial'
  ],
  PESSOAL: ['Tarefas', 'Demandas', 'Processos'],
  EQUIPES: [
    'Funcionarios', 'Vinculos', 'Escalas', 'Ferias', 'Ocorrencias',
    'Afastamentos', 'ParametrosRH', 'Avaliacoes', 'Holerites'
  ],
  FINANCEIRO: [
    'Contratos', 'ContratosVersoes', 'Rubricas', 'Pagamentos',
    'Contratacoes', 'SolicitacoesContratacao', 'Orcamentos', 'Remanejamentos', 'Aditivos', 'FontesRecurso',
    'SolicitacoesCompra'
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

  // Fase 11.1 — Estratégia Institucional: garante aba ACOES.Estrategia
  if (typeof EstrategiaRepository !== 'undefined' &&
      typeof EstrategiaRepository.prepararIndice === 'function') {
    try { EstrategiaRepository.prepararIndice(); } catch(e) {
      Logger.warn('setup', 'inicializarSistema', 'EstrategiaRepository.prepararIndice: ' + e.message);
    }
  }

  // Fase 11.2 — Escuta Institucional: garante aba EQUIPES.Escuta
  if (typeof EscutaRepository !== 'undefined' &&
      typeof EscutaRepository.prepararIndice === 'function') {
    try { EscutaRepository.prepararIndice(); } catch(e) {
      Logger.warn('setup', 'inicializarSistema', 'EscutaRepository.prepararIndice: ' + e.message);
    }
  }

  // Fase 11.4 — Ponto Eletrônico: garante aba EQUIPES.Ponto
  if (typeof PontoRepository !== 'undefined' &&
      typeof PontoRepository.prepararIndice === 'function') {
    try { PontoRepository.prepararIndice(); } catch(e) {
      Logger.warn('setup', 'inicializarSistema', 'PontoRepository.prepararIndice: ' + e.message);
    }
  }

  // Fase 17 — Holerites: garante aba EQUIPES.Holerites
  if (typeof HoleriteRepository !== 'undefined' &&
      typeof HoleriteRepository.prepararIndice === 'function') {
    try { HoleriteRepository.prepararIndice(); } catch(e) {
      Logger.warn('setup', 'inicializarSistema', 'HoleriteRepository.prepararIndice: ' + e.message);
    }
  }

  // Fase 21 — Reserva de Veículo: garante aba ESPACOS.ReservasCarro
  if (typeof ReservaCarroRepository !== 'undefined' &&
      typeof ReservaCarroRepository.prepararIndice === 'function') {
    try { ReservaCarroRepository.prepararIndice(); } catch(e) {
      Logger.warn('setup', 'inicializarSistema', 'ReservaCarroRepository.prepararIndice: ' + e.message);
    }
  }

  // Fase 52 — Pregões / Atas de Registro de Preços: garante aba FINANCEIRO.Pregoes
  if (typeof PregaoRepository !== 'undefined' &&
      typeof PregaoRepository.prepararIndice === 'function') {
    try { PregaoRepository.prepararIndice(); } catch(e) {
      Logger.warn('setup', 'inicializarSistema', 'PregaoRepository.prepararIndice: ' + e.message);
    }
  }

  // Fase 76 — Compras/Aquisições: garante aba FINANCEIRO.SolicitacoesCompra
  if (typeof SolicitacaoCompraRepository !== 'undefined' &&
      typeof SolicitacaoCompraRepository.prepararIndice === 'function') {
    try { SolicitacaoCompraRepository.prepararIndice(); } catch(e) {
      Logger.warn('setup', 'inicializarSistema', 'SolicitacaoCompraRepository.prepararIndice: ' + e.message);
    }
  }

  // Fase 73 — Estoque: garante ESTOQUE.ItensEstoque, ESTOQUE.SaldoEstoque,
  //           ESTOQUE.MovimentacoesEstoque e ESPACOS.SolicitacoesMaterial
  if (typeof ItemEstoqueRepository !== 'undefined' &&
      typeof ItemEstoqueRepository.prepararIndice === 'function') {
    try { ItemEstoqueRepository.prepararIndice(); } catch(e) {
      Logger.warn('setup', 'inicializarSistema', 'ItemEstoqueRepository.prepararIndice: ' + e.message);
    }
  }
  if (typeof SolicitacaoMaterialRepository !== 'undefined' &&
      typeof SolicitacaoMaterialRepository.prepararIndice === 'function') {
    try { SolicitacaoMaterialRepository.prepararIndice(); } catch(e) {
      Logger.warn('setup', 'inicializarSistema', 'SolicitacaoMaterialRepository.prepararIndice: ' + e.message);
    }
  }

  try { setup_espacos_iniciais(); } catch(e) { Logger.warn('setup', 'inicializarSistema', 'setup_espacos_iniciais: ' + e.message); }
  try { setup_pccs_inicial(); }    catch(e) { Logger.warn('setup', 'inicializarSistema', 'setup_pccs_inicial: ' + e.message); }
  try { setup_categorias_itens_iniciais(); } catch(e) { Logger.warn('setup', 'inicializarSistema', 'setup_categorias_itens: ' + e.message); }
  try { setup_itens_almoxarifado_iniciais(); } catch(e) { Logger.warn('setup', 'inicializarSistema', 'setup_itens_almoxarifado: ' + e.message); }

  // Encargos trabalhistas — inicializa JSON e instala trigger anual
  try {
    var orgCfg = getOrgConfig();
    if (typeof EncargosRepository !== 'undefined') {
      EncargosRepository.inicializar(orgCfg.orgId);
      Logger.info('setup', 'inicializarSistema', 'EncargosRepository inicializado.');
    }
    _instalarTriggerAnualEncargos();
  } catch(e) { Logger.warn('setup', 'inicializarSistema', 'encargos: ' + e.message); }

  // Catálogo SEPLAG — pré-carregar os ~60 itens padrão (idempotente)
  try {
    if (typeof ItensDespesaService !== 'undefined') {
      var rCatalogo = ItensDespesaService.seed();
      Logger.info('setup', 'inicializarSistema', 'Catálogo SEPLAG: ' + rCatalogo.adicionados + ' itens adicionados, total=' + rCatalogo.total);
    }
  } catch(e) { Logger.warn('setup', 'inicializarSistema', 'catalogo_seplag_seed: ' + e.message); }

  // Índice de Contratos
  try {
    if (typeof ContratoRepository !== 'undefined') {
      ContratoRepository.garantirCabecalhoIndice();
    }
  } catch(e) { Logger.warn('setup', 'inicializarSistema', 'contratos_indice: ' + e.message); }

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
 * Seed: PCCS IDM 2025 — 131 cargos reais, tabela salarial completa.
 * Fonte: Política J.03 PCCS 2025 (Tabela Faixa Fixa + Por Orientador).
 * Idempotente: não cria se já existir PCCS-001.
 */
function setup_pccs_inicial() {
  if (typeof PCCSRepository === 'undefined')
    return { erro: 'PCCSRepository não disponível.' };

  var orgId  = getOrgConfig().orgId;
  var email  = Session.getActiveUser().getEmail() || 'setup@sistema';
  var pccsId = 'PCCS-001';

  var existente = PCCSRepository.listarTodos().find(function(p) { return p.id === pccsId; });
  if (existente) return { criados: 0, msg: 'PCCS ' + pccsId + ' já existe.' };

  // ── Tabela salarial IDM 2025 ─────────────────────────────────────
  // Chave: '<TIPO>_<CLASSE>' → [step1, step2, step3, step4, step5]
  // Crescimento step: 7,5% | Reajuste 2025: 5%
  var _SAL = {
    'FIXA_PISO': [1747.16,1747.16,1747.16,1747.16,1747.16],
    'FIXA_A':    [1796.62,1931.37,2076.22,2231.94,2399.34],
    'FIXA_B':    [2219.82,2386.30,2565.27,2757.67,2964.50],
    'FIXA_C':    [2731.49,2936.35,3156.58,3393.32,3647.82],
    'FIXA_D':    [3350.18,3601.45,3871.55,4161.92,4474.07],
    'FIXA_E':    [4098.24,4405.61,4736.03,5091.24,5473.08],
    'FIXA_F':    [5002.76,5377.96,5781.31,6214.91,6681.03],
    'FIXA_G':    [6096.42,6553.65,7045.17,7573.56,8141.57],
    'FIXA_H':    [7418.78,7975.18,8573.32,9216.32,9907.55],
    'FIXA_I':    [9017.67,9694.00,10421.05,11202.63,12042.82],
    'FIXA_J':    [10950.94,11772.26,12655.18,13604.32,14624.65],
    'FIXA_K':    [13288.50,14285.13,15356.52,16508.26,17746.38],
    'FIXA_L':    [16114.89,17323.50,18622.76,20019.47,21520.93],
    'FIXA_M':    [19532.34,20997.27,22572.06,24264.97,26084.84],
    'FIXA_N':    [23664.46,25439.29,27347.24,29398.28,31603.15],
    'FIXA_O':    [28660.68,30810.24,33121.00,35605.08,38275.46],
    'FIXA_P':    [34701.73,37304.36,40102.19,43109.86,46343.09],
    'FIXA_Q':    [42006.11,45156.57,48543.31,52184.06,56097.86],
    'ORIENTADOR_F': [5002.76,5377.96,5781.31,6214.91,6681.03],
    'ORIENTADOR_G': [6096.42,6553.65,7045.17,7573.56,8141.57],
    'ORIENTADOR_H': [7418.78,7975.18,8573.32,9216.32,9907.55],
    'ORIENTADOR_I': [9017.67,9694.00,10421.05,11202.63,12042.82],
    'ORIENTADOR_J': [10950.94,11772.26,12655.18,13604.32,14624.65],
    'ORIENTADOR_K': [13288.50,14285.13,15356.52,16508.26,17746.38],
    'ORIENTADOR_L': [16114.89,17323.50,18622.76,20019.47,21520.93],
    'ORIENTADOR_M': [19532.34,20997.27,22572.06,24264.97,26084.84],
    'ORIENTADOR_N': [23664.46,25439.29,27347.24,29398.28,31603.15],
    'ORIENTADOR_O': [28660.68,30810.24,33121.00,35605.08,38275.46],
    'ORIENTADOR_P': [34701.73,37304.36,40102.19,43109.86,46343.09],
    'ORIENTADOR_Q': [42006.11,45156.57,48543.31,52184.06,56097.86]
  };

  // Gera tabela de 5 steps para um cargo dado tipo (FIXA/ORIENTADOR) e classe (A-Q, PISO)
  function _steps(tipo, classe) {
    var s = _SAL[tipo + '_' + classe] || [];
    return s.map(function(v, i) {
      return { nivel: tipo, classe: classe, referencia: i + 1, salarioBase: v };
    });
  }

  // Mapeia grupo IDM → tipo v2
  function _tipo(grupo) {
    var m = {
      'Gestão Estratégica': 'estrategico',
      'Gestão Tática':      'tatico',
      'Assessoramento':     'assessoramento',
      'Administrativo':     'administrativo',
      'Operacional':        'operacional'
    };
    return m[grupo] || 'operacional';
  }

  // ── Cargos IDM 2025 ─────────────────────────────────────────────
  // Formato: [area, nome, classe, tipoClasse, grupo]
  var _ROWS = [
    // ── Gestão Estratégica ────────────────────────────────────────
    ['Gestão Estratégica','Diretor Presidente','O','ORIENTADOR','Gestão Estratégica'],
    ['Gestão Estratégica','Diretor Administrativo-Financeiro','M','ORIENTADOR','Gestão Estratégica'],
    ['Gestão Estratégica','Diretor de Ação Cultural','M','ORIENTADOR','Gestão Estratégica'],
    ['Gestão Estratégica','Diretor de Formação','M','ORIENTADOR','Gestão Estratégica'],
    ['Gestão Estratégica','Superintendente','L','ORIENTADOR','Gestão Estratégica'],
    ['Gestão Estratégica','Gerente Executivo II','J','ORIENTADOR','Gestão Estratégica'],
    ['Gestão Estratégica','Gerente Executivo I','I','ORIENTADOR','Gestão Estratégica'],
    ['Gestão Estratégica','Assessor de Governança','J','ORIENTADOR','Assessoramento'],
    ['Gestão Estratégica','Assessor de Gestão Cultural e Artística','J','ORIENTADOR','Assessoramento'],
    ['Gestão Estratégica','Assessor de Gestão Executiva III','J','ORIENTADOR','Assessoramento'],
    ['Gestão Estratégica','Assessor de Gestão Executiva II','I','ORIENTADOR','Assessoramento'],
    ['Gestão Estratégica','Assessor de Gestão Executiva I','H','ORIENTADOR','Assessoramento'],
    ['Gestão Estratégica','Assessor de Diretoria','G','ORIENTADOR','Assessoramento'],
    // ── Comunicação e Marketing ───────────────────────────────────
    ['Comunicação e Marketing','Gerente de Comunicação e Marketing','I','ORIENTADOR','Gestão Tática'],
    ['Comunicação e Marketing','Coordenador de Marketing e Projetos','H','ORIENTADOR','Gestão Tática'],
    ['Comunicação e Marketing','Assessor de Marketing e Projetos','G','ORIENTADOR','Assessoramento'],
    ['Comunicação e Marketing','Analista de Marketing e Projetos','F','FIXA','Administrativo'],
    ['Comunicação e Marketing','Assistente de Marketing e Projetos','D','FIXA','Administrativo'],
    ['Comunicação e Marketing','Coordenador de Comunicação','H','ORIENTADOR','Gestão Tática'],
    ['Comunicação e Marketing','Assessor de Comunicação','G','ORIENTADOR','Assessoramento'],
    ['Comunicação e Marketing','Analista de Comunicação III','F','FIXA','Administrativo'],
    ['Comunicação e Marketing','Analista de Comunicação II','E','FIXA','Administrativo'],
    ['Comunicação e Marketing','Analista de Comunicação I','D','FIXA','Administrativo'],
    ['Comunicação e Marketing','Assistente de Comunicação','C','FIXA','Administrativo'],
    // ── Inovação e TI ─────────────────────────────────────────────
    ['Inovação e TI','Gerente de Inovação e TI','J','ORIENTADOR','Gestão Tática'],
    ['Inovação e TI','Coordenador de Inovação','H','ORIENTADOR','Gestão Tática'],
    ['Inovação e TI','Assessor de Inovação','G','ORIENTADOR','Assessoramento'],
    ['Inovação e TI','Analista de Processos e Requisitos','D','FIXA','Administrativo'],
    ['Inovação e TI','Coordenador de Infraestrutura e Serviços de TI','I','ORIENTADOR','Gestão Tática'],
    ['Inovação e TI','Analista de Suporte em TI II','E','FIXA','Administrativo'],
    ['Inovação e TI','Analista de Suporte em TI I','D','FIXA','Administrativo'],
    ['Inovação e TI','Assistente de TI','C','FIXA','Administrativo'],
    // ── Monitoramento e Controle ──────────────────────────────────
    ['Monitoramento e Controle','Gerente de Monitoramento e Controle','J','ORIENTADOR','Gestão Tática'],
    ['Monitoramento e Controle','Coordenador de Monitoramento','H','ORIENTADOR','Gestão Tática'],
    ['Monitoramento e Controle','Analista de Monitoramento','D','FIXA','Administrativo'],
    ['Monitoramento e Controle','Assistente de Monitoramento','C','FIXA','Administrativo'],
    ['Monitoramento e Controle','Coordenador de Prestação de Contas','H','ORIENTADOR','Gestão Tática'],
    ['Monitoramento e Controle','Supervisor de Prestação de Contas','E','FIXA','Administrativo'],
    ['Monitoramento e Controle','Analista de Prestação de Contas','D','FIXA','Administrativo'],
    ['Monitoramento e Controle','Assistente de Prestação de Contas','C','FIXA','Administrativo'],
    // ── Administrativo Financeiro ─────────────────────────────────
    ['Administrativo Financeiro','Gerente Administrativo-Financeiro','J','ORIENTADOR','Gestão Tática'],
    ['Administrativo Financeiro','Coordenador de Compras','H','ORIENTADOR','Gestão Tática'],
    ['Administrativo Financeiro','Supervisor de Compras','F','FIXA','Administrativo'],
    ['Administrativo Financeiro','Analista de Compras','D','FIXA','Administrativo'],
    ['Administrativo Financeiro','Assistente de Compras','C','FIXA','Administrativo'],
    ['Administrativo Financeiro','Coordenador de Contratos','H','ORIENTADOR','Gestão Tática'],
    ['Administrativo Financeiro','Analista de Contratos','E','FIXA','Administrativo'],
    ['Administrativo Financeiro','Coordenador de Controle Interno','H','ORIENTADOR','Gestão Tática'],
    ['Administrativo Financeiro','Analista de Controle Interno','D','FIXA','Administrativo'],
    ['Administrativo Financeiro','Assistente de Controle Interno','B','FIXA','Administrativo'],
    ['Administrativo Financeiro','Coordenador Financeiro','H','ORIENTADOR','Gestão Tática'],
    ['Administrativo Financeiro','Supervisor Financeiro','F','FIXA','Administrativo'],
    ['Administrativo Financeiro','Analista Financeiro','D','FIXA','Administrativo'],
    ['Administrativo Financeiro','Coordenador de Tesouraria','H','ORIENTADOR','Gestão Tática'],
    ['Administrativo Financeiro','Analista de Tesouraria','E','FIXA','Administrativo'],
    ['Administrativo Financeiro','Assistente de Tesouraria','D','FIXA','Administrativo'],
    ['Administrativo Financeiro','Auxiliar de Tesouraria','A','FIXA','Administrativo'],
    ['Administrativo Financeiro','Coordenador Administrativo-Financeiro','H','ORIENTADOR','Gestão Tática'],
    ['Administrativo Financeiro','Supervisor Administrativo-Financeiro','F','FIXA','Administrativo'],
    ['Administrativo Financeiro','Analista Administrativo III','E','FIXA','Administrativo'],
    ['Administrativo Financeiro','Analista Administrativo II','D','FIXA','Administrativo'],
    ['Administrativo Financeiro','Analista Administrativo I','C','FIXA','Administrativo'],
    ['Administrativo Financeiro','Secretário','D','FIXA','Administrativo'],
    ['Administrativo Financeiro','Assistente Administrativo','A','FIXA','Administrativo'],
    ['Administrativo Financeiro','Auxiliar Administrativo','PISO','FIXA','Administrativo'],
    // ── Segurança e Infraestrutura ────────────────────────────────
    ['Segurança e Infraestrutura','Gerente Segurança e Infraestrutura','I','ORIENTADOR','Gestão Tática'],
    ['Segurança e Infraestrutura','Coordenador de Infraestrutura','H','ORIENTADOR','Gestão Tática'],
    ['Segurança e Infraestrutura','Supervisor de Infraestrutura','E','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Especialista de Infraestrutura','F','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Técnico de Infraestrutura','E','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Técnico de Segurança do Trabalho','D','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Técnico de Conservação e Manutenção','C','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Assistente de Infraestrutura','D','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Assistente de Conservação e Manutenção','B','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Eletricista','B','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Auxiliar de Serviços Gerais','PISO','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Jardineiro','PISO','FIXA','Administrativo'],
    // ── Gestão de Pessoas ─────────────────────────────────────────
    ['Gestão de Pessoas','Gerente de Pessoas','I','ORIENTADOR','Gestão Tática'],
    ['Gestão de Pessoas','Coordenador de Desenvolvimento Humano','G','ORIENTADOR','Gestão Tática'],
    ['Gestão de Pessoas','Analista de Desenvolvimento Humano','D','FIXA','Administrativo'],
    ['Gestão de Pessoas','Psicóloga Organizacional','D','FIXA','Administrativo'],
    ['Gestão de Pessoas','Assistente de Desenvolvimento Humano','B','FIXA','Administrativo'],
    ['Gestão de Pessoas','Coordenador de Departamento Pessoal','G','ORIENTADOR','Gestão Tática'],
    ['Gestão de Pessoas','Supervisor de Departamento Pessoal','E','FIXA','Administrativo'],
    ['Gestão de Pessoas','Analista de Departamento Pessoal','D','FIXA','Administrativo'],
    ['Gestão de Pessoas','Assistente de Departamento Pessoal','B','FIXA','Administrativo'],
    // ── Articulação e Cidadania ───────────────────────────────────
    ['Articulação e Cidadania','Gerente de Articulação Institucional','I','ORIENTADOR','Gestão Tática'],
    ['Articulação e Cidadania','Assessor de Articulação','H','ORIENTADOR','Assessoramento'],
    ['Articulação e Cidadania','Assessor de Cidadania Cultural','H','ORIENTADOR','Assessoramento'],
    ['Articulação e Cidadania','Coordenador de Cidadania Cultural','H','ORIENTADOR','Gestão Tática'],
    ['Articulação e Cidadania','Coordenador de Direitos Humanos','H','ORIENTADOR','Gestão Tática'],
    ['Articulação e Cidadania','Supervisor de Cidadania Cultural','F','FIXA','Operacional'],
    ['Articulação e Cidadania','Assistente Social','D','FIXA','Operacional'],
    ['Articulação e Cidadania','Técnico de Cidadania Cultural','D','FIXA','Operacional'],
    ['Articulação e Cidadania','Psicólogo Social','D','FIXA','Operacional'],
    ['Articulação e Cidadania','Educador Social','C','FIXA','Operacional'],
    ['Articulação e Cidadania','Articulador Comunitário','C','FIXA','Operacional'],
    // ── Ação Cultural e Produção ──────────────────────────────────
    ['Ação Cultural e Produção','Gerente de Ação Cultural','I','ORIENTADOR','Gestão Tática'],
    ['Ação Cultural e Produção','Coordenador de Ação Cultural','H','ORIENTADOR','Gestão Tática'],
    ['Ação Cultural e Produção','Supervisor de Ação Cultural','F','FIXA','Operacional'],
    ['Ação Cultural e Produção','Assistente de Ação Cultural','C','FIXA','Operacional'],
    ['Ação Cultural e Produção','Auxiliar de Ação Cultural','A','FIXA','Operacional'],
    ['Ação Cultural e Produção','Coordenador de Produção','H','ORIENTADOR','Gestão Tática'],
    ['Ação Cultural e Produção','Supervisor de Produção','F','FIXA','Operacional'],
    ['Ação Cultural e Produção','Produtor Cultural','D','FIXA','Operacional'],
    ['Ação Cultural e Produção','Assistente de Produção','B','FIXA','Operacional'],
    // ── Áreas Técnicas ────────────────────────────────────────────
    ['Áreas Técnicas','Coordenador Técnico','H','ORIENTADOR','Gestão Tática'],
    ['Áreas Técnicas','Produtor Audiovisual','F','FIXA','Operacional'],
    ['Áreas Técnicas','Produtor de Palco','F','FIXA','Operacional'],
    ['Áreas Técnicas','Técnico de Teatro','E','FIXA','Operacional'],
    ['Áreas Técnicas','Editor de TV e Vídeo','E','FIXA','Operacional'],
    ['Áreas Técnicas','Técnico de Audiovisual','D','FIXA','Operacional'],
    ['Áreas Técnicas','Técnico de Cinema','D','FIXA','Operacional'],
    ['Áreas Técnicas','Técnico de Som','D','FIXA','Operacional'],
    ['Áreas Técnicas','Técnico de Luz','D','FIXA','Operacional'],
    ['Áreas Técnicas','Técnico de Palco','D','FIXA','Operacional'],
    ['Áreas Técnicas','Assistente de Técnica','C','FIXA','Operacional'],
    ['Áreas Técnicas','Auxiliar Técnico','B','FIXA','Operacional'],
    ['Áreas Técnicas','Planetarista','B','FIXA','Operacional'],
    ['Áreas Técnicas','Projecionista','B','FIXA','Operacional'],
    ['Áreas Técnicas','Camareiro','A','FIXA','Operacional'],
    // ── Formação e Ação Educativa ─────────────────────────────────
    ['Formação e Ação Educativa','Gerente de Formação','I','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Programa de Laboratórios','I','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Pesquisa e Desenvolvimento','I','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação III','I','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação II','H','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador Pedagógico','G','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação I','F','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Artes Visuais','H','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Audiovisual II','H','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Audiovisual I','F','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Cinema','H','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação Patrimonial','G','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Cultura Digital','F','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Dança II','H','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Dança I','F','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Música II','H','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Música I','F','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Teatro II','H','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Teatro I','F','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Secretaria Escolar','E','FIXA','Operacional'],
    ['Formação e Ação Educativa','Supervisor Pedagógico II','F','FIXA','Operacional'],
    ['Formação e Ação Educativa','Supervisor Pedagógico I','D','FIXA','Operacional'],
    ['Formação e Ação Educativa','Analista de Formação','E','FIXA','Operacional'],
    ['Formação e Ação Educativa','Assistente de Formação','D','FIXA','Operacional'],
    ['Formação e Ação Educativa','Professor de Música','C','FIXA','Operacional'],
    ['Formação e Ação Educativa','Professor de Dança','C','FIXA','Operacional'],
    ['Formação e Ação Educativa','Professor de Teatro','C','FIXA','Operacional'],
    ['Formação e Ação Educativa','Professor de Cultura Digital','C','FIXA','Operacional'],
    ['Formação e Ação Educativa','Professor de Audiovisual','C','FIXA','Operacional'],
    ['Formação e Ação Educativa','Auxiliar Pedagógico','A','FIXA','Operacional'],
    ['Formação e Ação Educativa','Atendente Escolar','PISO','FIXA','Operacional'],
    ['Formação e Ação Educativa','Coordenador de Ação Educativa','G','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Assessor de Ação Educativa','F','ORIENTADOR','Operacional'],
    ['Formação e Ação Educativa','Supervisor de Ação Educativa','E','FIXA','Operacional'],
    ['Formação e Ação Educativa','Mediador Cultural II','D','FIXA','Operacional'],
    ['Formação e Ação Educativa','Mediador Cultural I','C','FIXA','Operacional'],
    ['Formação e Ação Educativa','Mediador Ambiental','C','FIXA','Operacional'],
    ['Formação e Ação Educativa','Assistente de Ação Educativa','B','FIXA','Operacional'],
    // ── Operação ──────────────────────────────────────────────────
    ['Operação','Coordenador de Operação','H','ORIENTADOR','Gestão Tática'],
    ['Operação','Supervisor de Operação','E','FIXA','Operacional'],
    ['Operação','Supervisor de Bilheteria','E','FIXA','Operacional'],
    ['Operação','Recepcionista Bilíngue','D','FIXA','Operacional'],
    ['Operação','Técnico de Operação','D','FIXA','Operacional'],
    ['Operação','Assistente de Operação','C','FIXA','Operacional'],
    ['Operação','Auxiliar de Operação','A','FIXA','Operacional'],
    ['Operação','Bilheteiro','A','FIXA','Operacional'],
    ['Operação','Recepcionista','PISO','FIXA','Operacional'],
    // ── Acervo e Patrimônio ───────────────────────────────────────
    ['Acervo e Patrimônio','Gerente de Museu','J','ORIENTADOR','Gestão Tática'],
    ['Acervo e Patrimônio','Coordenador de Museu','H','ORIENTADOR','Gestão Tática'],
    ['Acervo e Patrimônio','Coordenador de Conservação e Restauro','G','ORIENTADOR','Gestão Tática'],
    ['Acervo e Patrimônio','Coordenador de Pesquisa e Acervo','H','ORIENTADOR','Gestão Tática'],
    ['Acervo e Patrimônio','Supervisor de Museu','F','FIXA','Operacional'],
    ['Acervo e Patrimônio','Supervisor de Conservação e Restauro','F','FIXA','Operacional'],
    ['Acervo e Patrimônio','Supervisor de Pesquisa e Acervo','F','FIXA','Operacional'],
    ['Acervo e Patrimônio','Bibliotecário II','F','FIXA','Operacional'],
    ['Acervo e Patrimônio','Bibliotecário I','D','FIXA','Operacional'],
    ['Acervo e Patrimônio','Restaurador','F','FIXA','Operacional'],
    ['Acervo e Patrimônio','Museólogo','G','FIXA','Operacional'],
    ['Acervo e Patrimônio','Técnico de Conservação e Restauro','D','FIXA','Operacional'],
    ['Acervo e Patrimônio','Técnico de Pesquisa e Acervo','D','FIXA','Operacional'],
    ['Acervo e Patrimônio','Assistente de Pesquisa e Acervo','C','FIXA','Operacional'],
    ['Acervo e Patrimônio','Técnico de Biblioteca','B','FIXA','Operacional'],
    ['Acervo e Patrimônio','Atendente de Biblioteca','A','FIXA','Operacional'],
    // ── Cinema e Audiovisual ──────────────────────────────────────
    ['Cinema e Audiovisual','Coordenador de Planetário','H','ORIENTADOR','Gestão Tática'],
    ['Cinema e Audiovisual','Coordenador de Audiovisual','H','ORIENTADOR','Gestão Tática'],
    ['Cinema e Audiovisual','Coordenador de Cinema','H','ORIENTADOR','Gestão Tática'],
    ['Cinema e Audiovisual','Supervisor de Cinema','F','FIXA','Operacional'],
    ['Cinema e Audiovisual','Supervisor de Teatro','F','FIXA','Operacional'],
    // ── Esporte ───────────────────────────────────────────────────
    ['Esporte','Coordenador de Esporte e Lazer','H','ORIENTADOR','Gestão Tática'],
    ['Esporte','Educador Esportivo','F','FIXA','Operacional'],
    ['Esporte','Técnico Esportivo','E','FIXA','Operacional'],
    ['Esporte','Assistente Esportivo','D','FIXA','Operacional'],
    ['Esporte','Auxiliar Esportivo','B','FIXA','Operacional'],
    // ── Gastronomia ───────────────────────────────────────────────
    ['Gastronomia','Supervisor de Cozinha','F','FIXA','Operacional'],
    ['Gastronomia','Técnico de Cozinha','E','FIXA','Operacional'],
    ['Gastronomia','Nutricionista','D','FIXA','Operacional'],
    ['Gastronomia','Assistente de Cozinha','D','FIXA','Operacional'],
    ['Gastronomia','Auxiliar de Cozinha','B','FIXA','Operacional'],
    ['Gastronomia','Horticultor','B','FIXA','Operacional'],
    ['Gastronomia','Auxiliar de Estoque','A','FIXA','Operacional']
  ];

  var cargos = _ROWS.map(function(r, i) {
    var n = String(i + 1);
    while (n.length < 3) n = '0' + n;
    return {
      id:        'CRG-' + n,
      nome:      r[1],
      area:      r[0],
      tipo:      _tipo(r[4]),
      grupo:     r[4],
      descricao: r[1] + ' — ' + r[0],
      tabela:    _steps(r[3], r[2])
    };
  });

  PCCSRepository.salvar({
    id:       pccsId,
    nome:     'PCCS IDM 2025',
    vigencia: { inicio: '2025-01-01', fim: '2025-12-31' },
    parametros: {
      crescimentoStep:          0.075,
      amplitudeFaixa:           0.3355,
      crescimentoMedioClasse:   0.2178,
      pisoFaixaFixa:            1747.16,
      pisoOrientador:           1584.74,
      anoReferencia:            2025,
      reajusteAplicado:         1.05
    },
    ativo:  true,
    cargos: cargos
  }, email);

  Logger.info('setup', 'setup_pccs_inicial', 'PCCS IDM 2025 criado com ' + cargos.length + ' cargos.');
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

/**
 * Seed: Itens do Almoxarifado — catálogo padrão CCBJ.
 * Migrado do V1 catalogo_engine.gs (inicializarCatalogoPadrao).
 * Idempotente: não cria se já existir item com o mesmo ID de semente.
 * Executar via setup_itens_almoxarifado_iniciais() no GAS Editor.
 */
function setup_itens_almoxarifado_iniciais() {
  if (typeof ReservasItensRepository === 'undefined') return { criados: 0, msg: 'ReservasItensRepository indisponível.' };

  var orgId = getOrgConfig().orgId;
  var existentes = ReservasItensRepository.listarItens(orgId);
  if (existentes.length > 0) return { criados: 0, msg: 'Catálogo já populado (' + existentes.length + ' itens).' };

  var itensPadrao = [
    // Transporte
    { id:'ITEM-SEED-001', nome:'Van 20 lugares',          categoria:'transporte',       quantidadeTotal:2, localizacao:'Pátio',          descricao:'Van de 20 lugares para transporte de grupo' },
    { id:'ITEM-SEED-002', nome:'Microônibus 35 lugares',  categoria:'transporte',       quantidadeTotal:1, localizacao:'Pátio',          descricao:'Microônibus para eventos e traslados' },
    { id:'ITEM-SEED-003', nome:'Veículo de apoio',        categoria:'transporte',       quantidadeTotal:3, localizacao:'Pátio',          descricao:'Veículo de apoio operacional' },
    // Alimentação / Insumo
    { id:'ITEM-SEED-004', nome:'Kit lanche infantil',     categoria:'alimentacao',      quantidadeTotal:0, localizacao:'Copa',           descricao:'Kit lanche para público infantil' },
    { id:'ITEM-SEED-005', nome:'Refeição adulto',         categoria:'alimentacao',      quantidadeTotal:0, localizacao:'Copa',           descricao:'Refeição para equipe e convidados' },
    { id:'ITEM-SEED-006', nome:'Coffee break',            categoria:'alimentacao',      quantidadeTotal:0, localizacao:'Copa',           descricao:'Coffee break para reuniões e eventos' },
    { id:'ITEM-SEED-007', nome:'Água mineral',            categoria:'alimentacao',      quantidadeTotal:0, localizacao:'Copa',           descricao:'Água mineral para eventos' },
    // Estrutura técnica
    { id:'ITEM-SEED-008', nome:'Palco pequeno (4×6m)',    categoria:'estrutura_tecnica',quantidadeTotal:1, localizacao:'Almoxarifado',   descricao:'Palco metálico pequeno' },
    { id:'ITEM-SEED-009', nome:'Palco médio (6×8m)',      categoria:'estrutura_tecnica',quantidadeTotal:1, localizacao:'Almoxarifado',   descricao:'Palco metálico médio' },
    { id:'ITEM-SEED-010', nome:'Sistema de sonorização P',categoria:'estrutura_tecnica',quantidadeTotal:2, localizacao:'Sala de Técnica',descricao:'Sistema de som para eventos pequenos' },
    { id:'ITEM-SEED-011', nome:'Sistema de sonorização G',categoria:'estrutura_tecnica',quantidadeTotal:1, localizacao:'Sala de Técnica',descricao:'Sistema de som para grandes eventos' },
    { id:'ITEM-SEED-012', nome:'Kit iluminação cênica',   categoria:'estrutura_tecnica',quantidadeTotal:2, localizacao:'Sala de Técnica',descricao:'Kit de iluminação para apresentações' },
    { id:'ITEM-SEED-013', nome:'Gerador de energia',      categoria:'estrutura_tecnica',quantidadeTotal:1, localizacao:'Pátio',          descricao:'Gerador para áreas sem energia' },
    // Camarim
    { id:'ITEM-SEED-014', nome:'Camarim grande porte',    categoria:'camarim',          quantidadeTotal:2, localizacao:'Camarins',       descricao:'Camarim completo para grandes produções' },
    { id:'ITEM-SEED-015', nome:'Camarim pequeno',         categoria:'camarim',          quantidadeTotal:3, localizacao:'Camarins',       descricao:'Camarim individual' },
    { id:'ITEM-SEED-016', nome:'Kit camarim básico',      categoria:'camarim',          quantidadeTotal:0, localizacao:'Camarins',       descricao:'Espelho, cadeiras, mesa básica' },
    // Material gráfico
    { id:'ITEM-SEED-017', nome:'Banner padrão 120×180cm', categoria:'material_grafico', quantidadeTotal:0, localizacao:'Almoxarifado',   descricao:'Banner lona vinílica padrão' },
    { id:'ITEM-SEED-018', nome:'Folder A4 (500 unidades)',categoria:'material_grafico', quantidadeTotal:0, localizacao:'Almoxarifado',   descricao:'Folder A4 frente e verso' },
    { id:'ITEM-SEED-019', nome:'Cartaz A3',               categoria:'material_grafico', quantidadeTotal:0, localizacao:'Almoxarifado',   descricao:'Cartaz A3 para divulgação' },
    { id:'ITEM-SEED-020', nome:'Adesivos',                categoria:'material_grafico', quantidadeTotal:0, localizacao:'Almoxarifado',   descricao:'Adesivos institucionais' },
    // Equipamento audiovisual / informática
    { id:'ITEM-SEED-021', nome:'Projetor multimídia',     categoria:'audiovisual',      quantidadeTotal:3, localizacao:'Sala de TI',     descricao:'Projetor HDMI Full HD' },
    { id:'ITEM-SEED-022', nome:'Tela de projeção',        categoria:'audiovisual',      quantidadeTotal:3, localizacao:'Sala de TI',     descricao:'Tela retrátil 2m × 2m' },
    { id:'ITEM-SEED-023', nome:'Câmera fotográfica',      categoria:'audiovisual',      quantidadeTotal:2, localizacao:'NArTE',          descricao:'Câmera para registro de eventos' },
    { id:'ITEM-SEED-024', nome:'Notebook',                categoria:'informatica',      quantidadeTotal:4, localizacao:'Sala de TI',     descricao:'Notebook para uso em evento' }
  ];

  var agr = agora();
  var criados = 0;
  itensPadrao.forEach(function(dados) {
    try {
      ReservasItensRepository.salvarItem({
        id:              dados.id,
        orgId:           orgId,
        nome:            dados.nome,
        descricao:       dados.descricao,
        quantidadeTotal: dados.quantidadeTotal,
        localizacao:     dados.localizacao,
        categoria:       dados.categoria,
        criadoEm:        agr,
        atualizadoEm:    agr
      }, orgId);
      criados++;
    } catch(e) {
      Logger.warn('setup', 'setup_itens_almoxarifado_iniciais', dados.nome + ': ' + e.message);
    }
  });

  Logger.info('setup', 'setup_itens_almoxarifado_iniciais', 'Criados: ' + criados + ' itens.');
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
 * Fase 11 — Estratégia Institucional.
 * Prepara aba ACOES.Estrategia e inicializa repositório.
 * Executar uma vez no GAS Editor após deploy.
 */
function fase11_prepararIndice() {
  var resultado = { ok: true, passos: [] };

  // 11.1 — Estratégia Institucional
  try {
    EstrategiaRepository.prepararIndice();
    resultado.passos.push('EstrategiaRepository: OK');
  } catch(e) {
    resultado.passos.push('EstrategiaRepository: ERRO — ' + e.message);
    resultado.ok = false;
  }

  // 11.2 — Escuta Institucional
  try {
    EscutaRepository.prepararIndice();
    resultado.passos.push('EscutaRepository: OK');
  } catch(e) {
    resultado.passos.push('EscutaRepository: ERRO — ' + e.message);
    resultado.ok = false;
  }

  // 11.4 — Ponto Eletrônico
  try {
    PontoRepository.prepararIndice();
    resultado.passos.push('PontoRepository: OK');
  } catch(e) {
    resultado.passos.push('PontoRepository: ERRO — ' + e.message);
    resultado.ok = false;
  }

  // Migra orgId nos JSONs novos (idempotente)
  try {
    var orgId = getOrgConfig().orgId;
    var jsonsNovos = [
      'objetivos_estrategicos.json',
      'pesquisas_clima.json',
      'respostas_clima.json',
      'ponto.json',
      'banco_horas.json'
    ];
    jsonsNovos.forEach(function(arq) {
      try {
        modifyJSON(arq, function(lista) {
          if (!Array.isArray(lista)) return lista;
          lista.forEach(function(item) { if (item && !item.orgId) item.orgId = orgId; });
          return lista;
        });
      } catch(e) { /* arquivo não existe ainda — normal */ }
    });
    resultado.passos.push('orgId migrado nos JSONs Fase 11: OK');
  } catch(e) {
    resultado.passos.push('orgId migração: AVISO — ' + e.message);
  }

  Logger.info('setup', 'fase11_prepararIndice',
    'Fase 11 pronta. Passos: ' + resultado.passos.join(' | '));
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

// ═══════════════════════════════════════════════════════════════════════════
// FASE 16 — Encargos Trabalhistas automáticos
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prepara o índice de encargos trabalhistas e instala o trigger anual.
 * Executar uma vez no GAS Editor: fase16_encargos_prepararIndice()
 * Idempotente — seguro re-executar.
 */
function fase16_encargos_prepararIndice() {
  var orgId = getOrgConfig().orgId;

  // 1. Inicializa o JSON de encargos (cria com tabela 2025 se não existir)
  var doc = EncargosRepository.inicializar(orgId);
  Logger.info('setup', 'fase16_encargos_prepararIndice',
    'encargos_trabalhistas.json pronto. Ano ativo: ' + doc.anoAtivo);

  // 2. Verifica se há versão mais nova e aplica automaticamente
  var status = EncargosEngine.verificarNecessidadeAtualizacao(orgId);
  if (status.precisaAtualizar) {
    EncargosEngine.atualizarParaAno(orgId, status.anoDisponivel, 'fase16_setup');
    Logger.info('setup', 'fase16_encargos_prepararIndice',
      'Tabela atualizada para ' + status.anoDisponivel);
  }

  // 3. Instala/renova trigger automático anual
  _instalarTriggerAnualEncargos();

  return {
    ok:           true,
    anoAtivo:     doc.anoAtivo,
    anoDisponivel: status.anoDisponivel,
    triggerInstalado: true
  };
}

/**
 * Função invocada pelo trigger automático (ScriptApp time-based).
 * Aplica a tabela oficial mais recente SE o ano disponível for maior que o ativo.
 * Campos com override manual são preservados.
 *
 * Trigger: dia 1 de cada mês às 06:00 → verifica se há nova tabela disponível.
 */
function triggerAtualizacaoAnualEncargos() {
  try {
    var orgId = getOrgConfig().orgId;
    var resultado = EncargosEngine.executarAtualizacaoAutomatica(orgId);
    Logger.info('setup', 'triggerAtualizacaoAnualEncargos', JSON.stringify({
      acao: resultado.acao || 'nenhuma',
      anoAplicado: resultado.anoAplicado,
      itensAtualizados: resultado.itensAtualizados
    }));
    return resultado;
  } catch (e) {
    Logger.error('setup', 'triggerAtualizacaoAnualEncargos', e.message);
    return { ok: false, erro: e.message };
  }
}

/**
 * Instala (ou renova) o trigger mensal que verifica encargos atualizados.
 * Remove duplicatas antes de instalar.
 * Privado — chamado por inicializarSistema() e fase16_encargos_prepararIndice().
 */
function _instalarTriggerAnualEncargos() {
  try {
    // Remove triggers existentes com o mesmo handler (evita duplicatas)
    ScriptApp.getProjectTriggers().forEach(function(t) {
      if (t.getHandlerFunction() === 'triggerAtualizacaoAnualEncargos') {
        ScriptApp.deleteTrigger(t);
      }
    });
    // Instala trigger: executa no dia 1 de cada mês às 06:00
    // Verifica internamente se há nova tabela disponível (idempotente)
    ScriptApp.newTrigger('triggerAtualizacaoAnualEncargos')
      .timeBased()
      .onMonthDay(1)
      .atHour(6)
      .create();
    Logger.info('setup', '_instalarTriggerAnualEncargos',
      'Trigger triggerAtualizacaoAnualEncargos instalado (dia 1 de cada mês, 06:00).');
  } catch (e) {
    Logger.warn('setup', '_instalarTriggerAnualEncargos',
      'Não foi possível instalar trigger: ' + e.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FASE 17 — Holerites e Processamento de Folha
// ════════════════════════════════════════════════════════════════════════════

/**
 * Prepara o índice de Holerites (aba EQUIPES.Holerites).
 * Executar no GAS Editor após o deploy da Fase 17.
 * @returns {{ ok, aba }}
 */
function fase17_holerite_prepararIndice() {
  try {
    var r = HoleriteRepository.prepararIndice();
    Logger.info('setup', 'fase17_holerite_prepararIndice',
      r.ok ? 'Aba ' + r.aba + ' garantida.' : 'Falha: ' + r.motivo);
    return r;
  } catch(e) {
    Logger.error('setup', 'fase17_holerite_prepararIndice', e.message);
    return { ok: false, motivo: e.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FASE 20 — Escuta Institucional Completa
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// FASE 21 — Reserva de Veículo Institucional
// ════════════════════════════════════════════════════════════════════════════

/**
 * Prepara aba ESPACOS.ReservasCarro e garante cabeçalho do índice.
 * Executar no GAS Editor após o deploy da Fase 21.
 * @returns {{ ok, aba }}
 */
function fase21_carro_prepararIndice() {
  try {
    var r = ReservaCarroRepository.prepararIndice();
    Logger.info('setup', 'fase21_carro_prepararIndice',
      r.ok ? 'Aba ' + r.aba + ' garantida.' : 'Falha: ' + r.motivo);
    return r;
  } catch(e) {
    Logger.error('setup', 'fase21_carro_prepararIndice', e.message);
    return { ok: false, motivo: e.message };
  }
}

/**
 * Prepara índice de Escuta (aba EQUIPES.Escuta) e garante
 * que os arquivos JSON auxiliares existam no Drive.
 * Executar no GAS Editor após o deploy da Fase 20.
 * @returns {{ ok, aba }}
 */
function fase20_escuta_prepararIndice() {
  try {
    var r = EscutaRepository.prepararIndice();
    Logger.info('setup', 'fase20_escuta_prepararIndice',
      r.ok ? 'Aba ' + (r.aba || 'EQUIPES.Escuta') + ' garantida.' : 'Falha: ' + r.motivo);
    return r;
  } catch(e) {
    Logger.error('setup', 'fase20_escuta_prepararIndice', e.message);
    return { ok: false, motivo: e.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FASE 73 — Módulo Estoque (Consumíveis e Materiais)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Prepara índices do módulo Estoque e faz seed dos depósitos padrão.
 * Executar no GAS Editor após o deploy da Fase 73.
 * Idempotente — seguro reexecutar.
 * @returns {{ ok, passos }}
 */
function fase73_estoque_prepararIndice() {
  var resultado = { ok: true, passos: [] };

  try {
    var r = ItemEstoqueRepository.prepararIndice();
    resultado.passos.push('ItemEstoqueRepository: ' + r.abas.join(', '));
  } catch(e) {
    resultado.passos.push('ItemEstoqueRepository: ERRO — ' + e.message);
    resultado.ok = false;
  }

  try {
    var r2 = SolicitacaoMaterialRepository.prepararIndice();
    resultado.passos.push('SolicitacaoMaterialRepository: ' + r2.aba);
  } catch(e) {
    resultado.passos.push('SolicitacaoMaterialRepository: ERRO — ' + e.message);
    resultado.ok = false;
  }

  try {
    var seedDep = setup_depositos_iniciais();
    resultado.passos.push('Depósitos seed: ' + seedDep.criados + ' criados, ' + seedDep.ja_existiam + ' já existiam.');
  } catch(e) {
    resultado.passos.push('Depósitos seed: ERRO — ' + e.message);
  }

  Logger.info('setup', 'fase73_estoque_prepararIndice',
    'Fase 73 pronta. Passos: ' + resultado.passos.join(' | '));
  return resultado;
}

/**
 * Seed: 2 depósitos padrão CCBJ para o módulo Estoque.
 * Idempotente: ignora depósitos com ID já existente no depositos_config.json.
 */
function setup_depositos_iniciais() {
  var orgId = getOrgConfig().orgId;
  var agr   = agora();

  var depositos = [
    {
      id:       'dep-01',
      nome:     'Almoxarifado Central',
      codigo:   'Almox.',
      tipo:     'principal',
      descricao: 'Depósito principal de materiais e consumíveis do CCBJ.',
      ativo:    true
    },
    {
      id:       'dep-02',
      nome:     'Estoque Rápido Infra',
      codigo:   'Infra.',
      tipo:     'rapido',
      descricao: 'Estoque de acesso rápido para a equipe de Infraestrutura.',
      ativo:    true
    }
  ];

  var criados = 0, jaExistiam = 0;

  modifyJSON('depositos_config.json', function(lista) {
    if (!Array.isArray(lista)) lista = [];
    depositos.forEach(function(dep) {
      var jaExiste = lista.some(function(d) { return d.id === dep.id && d.orgId === orgId; });
      if (jaExiste) { jaExistiam++; return; }
      lista.push(Object.assign({}, dep, { orgId: orgId, criadoEm: agr, atualizadoEm: agr }));
      criados++;
    });
    return lista;
  });

  Logger.info('setup', 'setup_depositos_iniciais',
    'Depósitos: ' + criados + ' criados, ' + jaExistiam + ' já existiam.');
  return { criados: criados, ja_existiam: jaExistiam };
}
