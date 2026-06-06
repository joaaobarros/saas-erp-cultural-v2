/**
 * @file core/utils.gs
 * @layer core
 * @description Utilitários globais do sistema.
 *
 * ABA_PARA_MODULO: mapa canônico de abas por planilha.
 * REGRA: qualquer nova aba deve ser registrada aqui E em setup.gs simultaneamente.
 */

// ─── Mapa canônico de planilhas e abas ───────────────────────────────────────
// Formato: { PLANILHA: { ALIAS: 'Nome real da aba' } }
// _getSheet() usa este mapa — nunca usar string literal de aba fora daqui.

var ABA_PARA_MODULO = {
  MASTER: {
    Configuracoes:        'Configuracoes',
    Itens:                'Itens',
    Listas:               'Listas',
    PreferenciasUsuarios: 'PreferenciasUsuarios',
    EventLog:             'EventLog',
    Auditoria:            'Auditoria',
    AuditoriaFsm:         'AuditoriaFsm',
    AlertasLog:           'AlertasLog'
  },
  ACOES: {
    Acoes:           'Acoes',
    Habilitacoes:    'Habilitacoes',
    AcoesRecursos:   'AcoesRecursos',
    HabDiaria:       'HabDiaria',
    Indicadores:     'Indicadores',
    Metas:           'Metas'
  },
  ESPACOS: {
    Reservas:            'Reservas',
    ReservasItens:       'ReservasItens',
    EmprestimosItens:    'EmprestimosItens',
    Chaves:              'Chaves',
    Protocolos:          'Protocolos',
    Ativos:              'Ativos',
    MovimentacoesAtivos: 'MovimentacoesAtivos',
    Manutencoes:         'Manutencoes',
    UsoAtivos:           'UsoAtivos',
    BaixasAtivos:        'BaixasAtivos',
    AlertasInfra:        'AlertasInfra',
    Solicitacoes:        'Solicitacoes',
    ReservasCarro:       'ReservasCarro'
  },
  PESSOAL: {
    Tarefas:   'Tarefas',
    Demandas:  'Demandas',
    Processos: 'Processos'
  },
  EQUIPES: {
    Funcionarios:  'Funcionarios',
    Vinculos:      'Vinculos',
    Escalas:       'Escalas',
    Ferias:        'Ferias',
    Ocorrencias:   'Ocorrencias',
    Afastamentos:  'Afastamentos',
    ParametrosRH:  'ParametrosRH',
    Avaliacoes:    'Avaliacoes'
  },
  FINANCEIRO: {
    Contratos:      'Contratos',
    ContratosVersoes:'ContratosVersoes',
    Rubricas:       'Rubricas',
    Pagamentos:     'Pagamentos',
    Contratacoes:   'Contratacoes',
    Orcamentos:     'Orcamentos',
    Remanejamentos: 'Remanejamentos',
    Aditivos:       'Aditivos',
    FontesRecurso:  'FontesRecurso',
    Pregoes:        'Pregoes'
  },
  RELATORIOS: {
    CODIP:        'CODIP',
    RelGerencial: 'RelGerencial',
    Exportacoes:  'Exportacoes'
  },
  REUNIOES: {
    Reunioes:        'Reunioes',
    Encaminhamentos: 'Encaminhamentos',
    Atas:            'Atas'
  },
  COMUNICACAO: {
    Demandas:  'Demandas',
    Entregas:  'Entregas',
    Versoes:   'Versoes',
    AgendaRECE:'AgendaRECE'
  },
  PUBLICO: {
    Inscricoes:   'Inscricoes',
    Presencas:    'Presencas',
    Pesquisas:    'Pesquisas',
    Certificados: 'Certificados'
  },
  ESCUTA: {
    Pesquisas:   'Pesquisas',
    Respostas:   'Respostas',
    Indicadores: 'Indicadores'
  }
};

// ─── Geração de IDs ──────────────────────────────────────────────────────────

/**
 * Gera ID único prefixado.
 * @param {string} prefixo — ex: 'acao', 'reserva', 'tarefa'
 */
function gerarId(prefixo) {
  return (prefixo || 'id') + '_' + new Date().getTime() + '_' + Math.random().toString(36).slice(2, 9);
}

// ─── Datas e Tempo ───────────────────────────────────────────────────────────

function agora() {
  return new Date().toISOString();
}

/**
 * Formata data ISO para exibição (dd/mm/yyyy hh:mm).
 */
function formatarData(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso);
    return Utilities.formatDate(d, getOrgConfig().timezone, 'dd/MM/yyyy HH:mm');
  } catch(e) {
    return iso;
  }
}

/**
 * Retorna verdadeiro se data1 < data2 (strings ISO 8601).
 */
function dataAnterior(data1, data2) {
  return new Date(data1) < new Date(data2);
}

// ─── Lock ────────────────────────────────────────────────────────────────────

/**
 * Obtém lock exclusivo com retry. Preservado do legado.
 * @param {number} [timeoutMs=30000]
 */
function obterLockComRetry(timeoutMs) {
  var lock = LockService.getScriptLock();
  lock.waitLock(timeoutMs || 30000);
  return lock;
}

// ─── Acesso a Sheets ─────────────────────────────────────────────────────────

// Cache de referências de aba por execução — evita openById + getSheetByName repetidos.
// Mesmo padrão de _dataFolderCache em data_layer.gs.
var _sheetCache = {};

/**
 * Retorna referência a uma aba de uma planilha pelo ID registrado em PropertiesService.
 * Reutiliza a referência em cache dentro da mesma execução GAS.
 * @param {string} chaveProps — ex: 'SHEET_ID_MASTER', 'SHEET_ID_ACOES'
 * @param {string} nomeAba    — nome real da aba (usar ABA_PARA_MODULO)
 */
function _getSheet(chaveProps, nomeAba) {
  var cacheKey = chaveProps + ':' + nomeAba;
  if (_sheetCache[cacheKey]) return _sheetCache[cacheKey];

  var sheetId = PropertiesService.getScriptProperties().getProperty(chaveProps);
  if (!sheetId) {
    Logger.error('utils', '_getSheet', 'Planilha não configurada: ' + chaveProps);
    throw new Error('Planilha não configurada: ' + chaveProps);
  }
  var aba = SpreadsheetApp.openById(sheetId).getSheetByName(nomeAba);
  if (!aba) {
    Logger.error('utils', '_getSheet', 'Aba não encontrada: ' + nomeAba + ' em ' + chaveProps);
    throw new Error('Aba não encontrada: ' + nomeAba);
  }
  _sheetCache[cacheKey] = aba;
  return aba;
}

// ─── Validação ───────────────────────────────────────────────────────────────

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

function validarCpf(cpf) {
  cpf = (cpf || '').replace(/[^\d]/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  var soma = 0;
  for (var i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  var r = (soma * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(cpf[9])) return false;
  soma = 0;
  for (var j = 0; j < 10; j++) soma += parseInt(cpf[j]) * (11 - j);
  r = (soma * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(cpf[10]);
}

// ─── Strings ─────────────────────────────────────────────────────────────────

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Sanitiza input externo (portal público) — remove tags e escapa caracteres perigosos.
 */
function sanitizarInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}
