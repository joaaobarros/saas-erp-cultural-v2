/**
 * @file core/config.gs
 * @layer core
 * @description Configuração organizacional centralizada com orgId obrigatório.
 *
 * PROPRIEDADES CONFIGURÁVEIS via PropertiesService.getScriptProperties():
 *   ORG_ID              — identificador único da organização (gerado na primeira execução)
 *   ORG_NOME            — nome curto                        (default: "CCBJ")
 *   ORG_NOME_COMPLETO   — nome completo
 *   ORG_SISTEMA_TITULO  — título do webapp
 *   ORG_DATA_FOLDER     — nome da pasta Drive de dados      (default: orgId + "_DATA")
 *   ORG_LOGO_URL        — URL do logotipo para emails
 *   ORG_DOMINIO         — domínio de email autorizado
 *   ORG_TIMEZONE        — timezone                          (default: "America/Fortaleza")
 *
 * REGRA: nenhuma constante de organização pode ser hardcoded.
 * Acesso via SistemaConfigService (config_service.gs) para configurações expandidas.
 */

var _orgConfigCache = null;

/**
 * Retorna configuração organizacional. orgId é garantido — gerado e persistido se ausente.
 * @returns {{ orgId, nome, nomeCompleto, titulo, dataFolder, logoUrl, dominio, timezone }}
 */
function getOrgConfig() {
  if (_orgConfigCache) return _orgConfigCache;

  var props = PropertiesService.getScriptProperties();
  var orgId = props.getProperty('ORG_ID') || _gerarEPersistirOrgId(props);
  var nome  = props.getProperty('ORG_NOME') || 'CCBJ';

  _orgConfigCache = {
    orgId:          orgId,
    nome:           nome,
    nomeCompleto:   props.getProperty('ORG_NOME_COMPLETO')    || 'Centro Cultural Bom Jardim',
    titulo:         props.getProperty('ORG_SISTEMA_TITULO')   || 'Sistema ' + nome,
    dataFolder:     props.getProperty('ORG_DATA_FOLDER')      || (orgId + '_DATA'),
    logoUrl:        props.getProperty('ORG_LOGO_URL')         || '',
    dominio:        props.getProperty('ORG_DOMINIO')          || '',
    timezone:       props.getProperty('ORG_TIMEZONE')         || 'America/Fortaleza',
    // Nome do assistente de IA — configurar via PropertiesService:IA_ASSISTENTE_NOME
    nomeAssistente: props.getProperty('IA_ASSISTENTE_NOME')   || nome + ' Assistente'
  };

  return _orgConfigCache;
}

/**
 * Invalida o cache — necessário após alterar PropertiesService em runtime.
 */
function invalidarCacheOrgConfig() {
  _orgConfigCache = null;
}

/**
 * Expõe apenas dados seguros para o contexto público (Portal Externo e boot do frontend).
 * Inclui paleta de cores e logoUrl para que a UI aplique a identidade visual no carregamento.
 * NUNCA expor dados internos (orgId, domínio, emails, etc.) por esta função.
 */
function getPublicOrgConfig() {
  var cfg    = getOrgConfig();
  var paleta = {};
  var logoUrl = cfg.logoUrl || '';
  try {
    paleta  = SistemaConfigService.getPaleta();
    logoUrl = SistemaConfigService.getLogoUrl() || logoUrl;
  } catch(_) {}
  return {
    nome:     cfg.nome,
    titulo:   cfg.titulo,
    logoUrl:  logoUrl,
    timezone: cfg.timezone,
    paleta:   paleta
  };
}

// ─── Configuração Operacional do Sistema ─────────────────────────────────────

var _sistemaConfigCache = null;

/**
 * Parâmetros operacionais (horários, turnos). Delegado ao SistemaConfigService
 * para leitura — este método mantém compatibilidade com código que acessa diretamente.
 * @returns {{ reservaHoraInicio, reservaHoraFim, turno* }}
 */
function getSistemaConfig() {
  if (_sistemaConfigCache) return _sistemaConfigCache;

  var props = PropertiesService.getScriptProperties();
  _sistemaConfigCache = {
    reservaHoraInicio: props.getProperty('RESERVA_HORA_INICIO') || '08:00',
    reservaHoraFim:    props.getProperty('RESERVA_HORA_FIM')    || '22:00',
    turnoManhaIni:     props.getProperty('TURNO_MANHA_INI')     || '08:00',
    turnoManhaFim:     props.getProperty('TURNO_MANHA_FIM')     || '12:00',
    turnoTardeIni:     props.getProperty('TURNO_TARDE_INI')     || '12:00',
    turnoTardeFim:     props.getProperty('TURNO_TARDE_FIM')     || '18:00',
    turnoNoiteIni:     props.getProperty('TURNO_NOITE_INI')     || '18:00',
    turnoNoiteFim:     props.getProperty('TURNO_NOITE_FIM')     || '22:00'
  };
  return _sistemaConfigCache;
}

function invalidarCacheSistemaConfig() {
  _sistemaConfigCache = null;
}

// ─── Privados ────────────────────────────────────────────────────────────────

function _gerarEPersistirOrgId(props) {
  var id = 'org_' + new Date().getTime() + '_' + Math.random().toString(36).slice(2, 8);
  props.setProperty('ORG_ID', id);
  console.log('[config] orgId gerado e persistido: ' + id);
  return id;
}
