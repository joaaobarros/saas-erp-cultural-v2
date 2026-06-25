/**
 * @file analise_controller.gs
 * @layer controller
 * @description Estúdio de Análises Visuais — CRUD + datasets de todos os módulos + cruzamentos
 * @depends GasResponse, AuditoriaService, PropertiesService
 */

var _ANALISE_PROP_KEY = 'ANALISE_STUDIO_ITEMS';

// ─── Helpers internos ─────────────────────────────────────────────────────────

function _analise_agrupar(lista, campo) {
  var mapa = {};
  (lista||[]).forEach(function(item) {
    var v = (item && item[campo]) ? String(item[campo]) : '—';
    mapa[v] = (mapa[v] || 0) + 1;
  });
  return mapa;
}

// Filtro de data global — setado antes de chamar _analise_dataset para aplicar período
var _analise_filtro_global = null;

function _analise_filtrar_por_data(lista, campo) {
  if (!_analise_filtro_global) return lista;
  var de  = _analise_filtro_global.de  ? new Date(_analise_filtro_global.de)  : null;
  var ate = _analise_filtro_global.ate ? new Date(_analise_filtro_global.ate + 'T23:59:59') : null;
  if (!de && !ate) return lista;
  return (lista||[]).filter(function(item) {
    var raw = item[campo];
    if (!raw) return true;
    var d = (raw instanceof Date) ? raw : new Date(String(raw).slice(0,10));
    if (isNaN(d.getTime())) return true;
    if (de  && d < de)  return false;
    if (ate && d > ate) return false;
    return true;
  });
}

function _analise_mapaParaLinhas(mapa, limite) {
  var pares = Object.keys(mapa).map(function(k) { return [k, mapa[k]]; });
  pares.sort(function(a,b){ return b[1]-a[1]; });
  return limite ? pares.slice(0, limite) : pares;
}

function _analise_porMes(lista, campoData) {
  var mapa = {};
  (lista||[]).forEach(function(item) {
    var d = String((item && item[campoData]) || '').slice(0,7);
    if (!d || d.length < 7) return;
    mapa[d] = (mapa[d] || 0) + 1;
  });
  var pares = Object.keys(mapa).sort().map(function(k) { return [k, mapa[k]]; });
  return pares.slice(-12);
}

function _analise_fmtMes(isoMes) {
  var meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var partes = String(isoMes).split('-');
  if (partes.length < 2) return isoMes;
  var m = parseInt(partes[1],10)-1;
  return meses[m] + '/' + partes[0];
}

// ─── CRUD de análises salvas ──────────────────────────────────────────────────

function ctrl_analise_listar() {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    var raw   = PropertiesService.getScriptProperties().getProperty(_ANALISE_PROP_KEY);
    var lista = raw ? JSON.parse(raw) : [];
    return lista.filter(function(item) { return _analise_podeVer(item, email); });
  }, 'ctrl_analise_listar');
}

function _analise_podeVer(item, email) {
  if (!item.donoEmail) return true;           // legado sem dono = público
  if (item.donoEmail === email) return true;  // dono sempre vê
  var vis = item.visibilidade || 'publica';
  if (vis === 'privada') return false;
  if (vis === 'publica') return true;
  if (vis === 'restrita') {
    var cc = item.compartilhadoCom || [];
    for (var i = 0; i < cc.length; i++) {
      var e = cc[i];
      if (e.tipo === 'pessoa' && e.valor === email) return true;
      var perfil = _analise_getUserPerfil(email);
      if (e.tipo === 'setor' && perfil.setor && perfil.setor === e.valor) return true;
      if (e.tipo === 'cargo' && perfil.cargo && perfil.cargo === e.valor) return true;
    }
    return false;
  }
  return true;
}

var _analise_perfilCache_ = {};
function _analise_getUserPerfil(email) {
  if (_analise_perfilCache_[email]) return _analise_perfilCache_[email];
  try {
    var d = ctrl_pessoas_listar({});
    var perfil = { setor: '', cargo: '' };
    if (d.ok && d.data) {
      for (var i = 0; i < d.data.length; i++) {
        var p = d.data[i];
        if (p.email === email || p.emailInstitucional === email) {
          perfil = { setor: p.setor || '', cargo: p.cargo || '' };
          break;
        }
      }
    }
    _analise_perfilCache_[email] = perfil;
    return perfil;
  } catch(e) {
    _analise_perfilCache_[email] = { setor: '', cargo: '' };
    return _analise_perfilCache_[email];
  }
}

function ctrl_analise_salvar(params) {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    var raw   = PropertiesService.getScriptProperties().getProperty(_ANALISE_PROP_KEY);
    var lista = raw ? JSON.parse(raw) : [];
    var item  = params || {};
    if (!item.titulo) throw new Error('Título obrigatório');
    if (!item.tipo)   throw new Error('Tipo de gráfico obrigatório');
    if (item.id) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) { if (lista[i].id === item.id) { idx = i; break; } }
      if (idx >= 0) {
        // só o dono pode editar
        if (lista[idx].donoEmail && lista[idx].donoEmail !== email) throw new Error('Sem permissão para editar esta análise.');
        for (var k in item) { lista[idx][k] = item[k]; }
        lista[idx].atualizadoEm = new Date().toISOString();
      } else {
        item.donoEmail = email;
        item.criadoEm  = new Date().toISOString();
        lista.push(item);
      }
    } else {
      item.id        = Utilities.getUuid();
      item.donoEmail = email;
      item.criadoEm  = new Date().toISOString();
      lista.push(item);
    }
    PropertiesService.getScriptProperties().setProperty(_ANALISE_PROP_KEY, JSON.stringify(lista));
    AuditoriaService.registrar('ANALISE_SALVAR', 'analise_studio', { titulo: item.titulo, tipo: item.tipo, vis: item.visibilidade });
    return { id: item.id };
  }, 'ctrl_analise_salvar');
}

function ctrl_analise_excluir(params) {
  return GasResponse.wrap(function() {
    var raw   = PropertiesService.getScriptProperties().getProperty(_ANALISE_PROP_KEY);
    var lista = raw ? JSON.parse(raw) : [];
    var id    = (params || {}).id;
    lista     = lista.filter(function(x) { return x.id !== id; });
    PropertiesService.getScriptProperties().setProperty(_ANALISE_PROP_KEY, JSON.stringify(lista));
    AuditoriaService.registrar('ANALISE_EXCLUIR', 'analise_studio', { id: id });
    return true;
  }, 'ctrl_analise_excluir');
}

// ─── Catálogo de datasets ─────────────────────────────────────────────────────

var _ANALISE_CATALOGO = [
  // Espaços
  { id:'reservas_espaco',         modulo:'Espaços',         label:'Reservas por espaço',           desc:'Quantidade de reservas por sala ou espaço' },
  { id:'reservas_setor',          modulo:'Espaços',         label:'Reservas por setor',            desc:'Reservas agrupadas por setor solicitante' },
  { id:'reservas_mes',            modulo:'Espaços',         label:'Reservas por mês',              desc:'Evolução mensal do número de reservas' },
  { id:'carros_destino',          modulo:'Espaços',         label:'Viagens por destino',           desc:'Reservas de veículo agrupadas por destino' },
  { id:'carros_setor',            modulo:'Espaços',         label:'Viagens por setor',             desc:'Uso de veículos por setor solicitante' },
  { id:'ativos_status',           modulo:'Espaços',         label:'Patrimônio por status',         desc:'Ativos/patrimônio: disponível, em uso, manutenção…' },
  // Tarefas
  { id:'tarefas_status',          modulo:'Tarefas',         label:'Tarefas por status',            desc:'Distribuição por status atual (aberta, atrasada, concluída…)' },
  { id:'tarefas_setor',           modulo:'Tarefas',         label:'Tarefas por setor',             desc:'Volume total de tarefas por setor' },
  { id:'tarefas_responsavel',     modulo:'Tarefas',         label:'Tarefas por responsável',       desc:'Carga de trabalho por pessoa' },
  { id:'tarefas_prioridade',      modulo:'Tarefas',         label:'Tarefas por prioridade',        desc:'Distribuição: urgente, alta, normal, baixa' },
  // Reuniões
  { id:'reunioes_tipo',           modulo:'Reuniões',        label:'Reuniões por tipo',             desc:'Distribuição das reuniões por tipo' },
  { id:'reunioes_mes',            modulo:'Reuniões',        label:'Reuniões por mês',              desc:'Evolução mensal do número de reuniões' },
  { id:'encaminhamentos_status',  modulo:'Reuniões',        label:'Encaminhamentos por status',    desc:'Status dos encaminhamentos das atas' },
  // Financeiro
  { id:'financeiro_execucao',     modulo:'Financeiro',      label:'Execução orçamentária',         desc:'Previsto vs. executado (valores R$)' },
  { id:'financeiro_rubrica',      modulo:'Financeiro',      label:'Valor por rubrica',             desc:'Distribuição de valores por rubrica' },
  { id:'contratos_status',        modulo:'Financeiro',      label:'Contratos por status',          desc:'Contratos: ativos, suspensos, encerrados, cancelados' },
  { id:'contratos_fonte',         modulo:'Financeiro',      label:'Contratos por fonte',           desc:'Distribuição de contratos por fonte de recurso' },
  // Pessoas
  { id:'pessoas_setor',           modulo:'Pessoas',         label:'Colaboradores por setor',       desc:'Headcount de colaboradores ativos por setor' },
  { id:'pessoas_cargo',           modulo:'Pessoas',         label:'Colaboradores por cargo',       desc:'Distribuição por cargo ou função' },
  { id:'pessoas_vinculo',         modulo:'Pessoas',         label:'Colaboradores por vínculo',     desc:'CLT, PJ, bolsista, voluntário…' },
  // Ações Culturais
  { id:'acoes_status',            modulo:'Ações Culturais', label:'Ações por status',              desc:'Distribuição das ações por status atual' },
  { id:'acoes_tipo',              modulo:'Ações Culturais', label:'Ações por tipo',                desc:'Distribuição por tipo de ação cultural' },
  { id:'acoes_mes',               modulo:'Ações Culturais', label:'Ações por mês',                desc:'Evolução mensal de criação de ações' },
  // Público
  { id:'publico_acao',            modulo:'Público',         label:'Público por ação',              desc:'Inscrições por ação cultural' },
  { id:'publico_mes',             modulo:'Público',         label:'Inscrições por mês',            desc:'Evolução mensal de inscrições' },
  { id:'presencas_acao',          modulo:'Público',         label:'Presenças por ação',            desc:'Taxa de presença confirmada por ação' },
  // Estoque
  { id:'estoque_categoria',       modulo:'Estoque',         label:'Itens por categoria',           desc:'Quantidade de itens por categoria de estoque' },
  // Comunicação
  { id:'balcao_status',           modulo:'Comunicação',     label:'Demandas por status',           desc:'Demandas do balcão agrupadas por status' },
  { id:'balcao_tipo',             modulo:'Comunicação',     label:'Demandas por tipo',             desc:'Design, foto, vídeo, texto, social…' },
  { id:'balcao_setor',            modulo:'Comunicação',     label:'Demandas por setor',            desc:'Demandas originadas por setor' },
  // Escuta
  { id:'escuta_pesquisa',         modulo:'Escuta',          label:'Resultados de escuta',          desc:'Indicadores das pesquisas de escuta organizacional' },
  // Cruzamentos
  { id:'cruzar_pessoas_tarefas',  modulo:'Cruzamentos',     label:'Pessoas × Tarefas (setor)',     desc:'2 séries: headcount e volume de tarefas por setor' },
  { id:'cruzar_reservas_tarefas', modulo:'Cruzamentos',     label:'Reservas × Tarefas (setor)',    desc:'2 séries: uso de espaços e tarefas por setor' },
  { id:'cruzar_acoes_publico_mes',modulo:'Cruzamentos',     label:'Ações × Público (mês)',         desc:'2 séries: ações criadas e inscrições por mês' },
];

function ctrl_analise_catalogo() {
  return GasResponse.wrap(function() {
    return _ANALISE_CATALOGO;
  }, 'ctrl_analise_catalogo');
}

// ─── Importação — dispatcher ──────────────────────────────────────────────────

function ctrl_analise_importar_dados(params) {
  return GasResponse.wrap(function() {
    var id = (params || {}).modulo || (params || {}).id || 'operacional';
    var filtro = null;
    if ((params||{}).de || (params||{}).ate) filtro = { de: (params||{}).de, ate: (params||{}).ate };
    _analise_filtro_global = filtro;
    try { return _analise_dataset(id); }
    finally { _analise_filtro_global = null; }
  }, 'ctrl_analise_importar_dados');
}

function _analise_dataset(id) {
  var FN = {
    // backward compat
    'operacional':              _ds_reservas_espaco,
    'financeiro':               _ds_financeiro_execucao,
    'estoque':                  _ds_estoque_categoria,
    // Espaços
    'reservas_espaco':          _ds_reservas_espaco,
    'reservas_setor':           _ds_reservas_setor,
    'reservas_mes':             _ds_reservas_mes,
    'carros_destino':           _ds_carros_destino,
    'carros_setor':             _ds_carros_setor,
    // Tarefas
    'tarefas_status':           _ds_tarefas_status,
    'tarefas_setor':            _ds_tarefas_setor,
    'tarefas_responsavel':      _ds_tarefas_responsavel,
    // Reuniões
    'reunioes_tipo':            _ds_reunioes_tipo,
    'reunioes_mes':             _ds_reunioes_mes,
    'encaminhamentos_status':   _ds_encaminhamentos_status,
    // Financeiro
    'financeiro_execucao':      _ds_financeiro_execucao,
    'financeiro_rubrica':       _ds_financeiro_rubrica,
    // Pessoas
    'pessoas_setor':            _ds_pessoas_setor,
    'pessoas_cargo':            _ds_pessoas_cargo,
    'pessoas_vinculo':          _ds_pessoas_vinculo,
    // Ações
    'acoes_status':             _ds_acoes_status,
    'acoes_tipo':               _ds_acoes_tipo,
    'acoes_mes':                _ds_acoes_mes,
    // Público
    'publico_acao':             _ds_publico_acao,
    'publico_mes':              _ds_publico_mes,
    // Estoque
    'estoque_categoria':        _ds_estoque_categoria,
    // Comunicação
    'balcao_status':            _ds_balcao_status,
    // Escuta
    'escuta_pesquisa':          _ds_escuta_pesquisa,
    // Cruzamentos
    'cruzar_pessoas_tarefas':   _cruzar_pessoas_tarefas,
    'cruzar_reservas_tarefas':  _cruzar_reservas_tarefas,
    'cruzar_acoes_publico_mes': _cruzar_acoes_publico_mes,
  };
  var fn = FN[id];
  if (!fn) return { colunas: ['Label','Valor'], linhas: [] };
  try { return fn(); }
  catch(e) { return { colunas: ['Label','Valor'], linhas: [], erro: e.message }; }
}

// ─── Espaços ──────────────────────────────────────────────────────────────────

function _ds_reservas_espaco() {
  var d = ctrl_dashboard_operacional();
  if (!d.ok || !d.data) return { colunas:['Espaço','Reservas'], linhas:[] };
  var t = d.data.tendencias || {};
  var linhas = (t.top5Salas || []).map(function(p){ return [p[0], p[1]||0]; });
  if (!linhas.length) linhas = [['Reservas Hoje', (d.data.espacos||{}).reservasHoje||0]];
  return { colunas:['Espaço','Reservas'], linhas:linhas };
}

function _ds_reservas_setor() {
  var d = ctrl_dashboard_operacional();
  if (!d.ok || !d.data) return { colunas:['Setor','Reservas'], linhas:[] };
  var t = d.data.tendencias || {};
  var linhas = (t.top5Setores || []).map(function(p){ return [p[0], p[1]||0]; });
  return { colunas:['Setor','Reservas'], linhas:linhas };
}

function _ds_reservas_mes() {
  var d = ctrl_dashboard_operacional();
  if (!d.ok || !d.data) return { colunas:['Mês','Reservas'], linhas:[] };
  var t = d.data.tendencias || {};
  var linhas = (t.ultimos6Meses || []).map(function(p){ return [p[0], p[1]||0]; });
  return { colunas:['Mês','Reservas'], linhas:linhas };
}

function _ds_carros_destino() {
  try {
    var orgId = getOrgConfig().orgId;
    var lista = ReservaCarroRepository.listar(orgId, {}) || [];
    return { colunas:['Destino','Viagens'], linhas:_analise_mapaParaLinhas(_analise_agrupar(lista,'destino'), 15) };
  } catch(e) { return { colunas:['Destino','Viagens'], linhas:[] }; }
}

function _ds_carros_setor() {
  try {
    var orgId = getOrgConfig().orgId;
    var lista = ReservaCarroRepository.listar(orgId, {}) || [];
    return { colunas:['Setor','Viagens'], linhas:_analise_mapaParaLinhas(_analise_agrupar(lista,'setor')) };
  } catch(e) { return { colunas:['Setor','Viagens'], linhas:[] }; }
}

// ─── Tarefas ──────────────────────────────────────────────────────────────────

function _ds_tarefas_status() {
  try {
    var d = ctrl_tarefas_metricas();
    if (!d.ok || !d.data) return { colunas:['Status','Tarefas'], linhas:[] };
    var m = d.data;
    var em_dia = Math.max(0, (m.abertas||0) - (m.atrasadas||0) - (m.bloqueadas||0));
    return { colunas:['Status','Tarefas'], linhas:[
      ['Em andamento', em_dia],
      ['Concluídas',   m.concluidas||0],
      ['Atrasadas',    m.atrasadas||0],
      ['Bloqueadas',   m.bloqueadas||0],
    ].filter(function(r){ return r[1] > 0; }) };
  } catch(e) { return { colunas:['Status','Tarefas'], linhas:[] }; }
}

function _ds_tarefas_setor() {
  try {
    var d = ctrl_tarefas_gestao();
    if (!d.ok || !d.data) return { colunas:['Setor','Tarefas'], linhas:[] };
    var linhas = (d.data.porSetor || []).map(function(s){ return [s.setor, s.total||0]; });
    linhas.sort(function(a,b){ return b[1]-a[1]; });
    return { colunas:['Setor','Tarefas'], linhas:linhas };
  } catch(e) { return { colunas:['Setor','Tarefas'], linhas:[] }; }
}

function _ds_tarefas_responsavel() {
  try {
    var d = ctrl_tarefas_gestao();
    if (!d.ok || !d.data) return { colunas:['Responsável','Tarefas'], linhas:[] };
    var linhas = (d.data.porResponsavel || []).map(function(r){ return [r.nome||r.email, r.total||0]; });
    linhas.sort(function(a,b){ return b[1]-a[1]; });
    return { colunas:['Responsável','Tarefas'], linhas:linhas.slice(0,20) };
  } catch(e) { return { colunas:['Responsável','Tarefas'], linhas:[] }; }
}

// ─── Reuniões ─────────────────────────────────────────────────────────────────

function _ds_reunioes_tipo() {
  try {
    var d = ctrl_reunioes_dashboard({});
    if (!d.ok || !d.data) return { colunas:['Tipo','Reuniões'], linhas:[] };
    return { colunas:['Tipo','Reuniões'], linhas:_analise_mapaParaLinhas(_analise_agrupar(d.data.lista||[],'tipo')) };
  } catch(e) { return { colunas:['Tipo','Reuniões'], linhas:[] }; }
}

function _ds_reunioes_mes() {
  try {
    var d = ctrl_reunioes_dashboard({});
    if (!d.ok || !d.data) return { colunas:['Mês','Reuniões'], linhas:[] };
    var pares = _analise_porMes(d.data.lista||[], 'data');
    return { colunas:['Mês','Reuniões'], linhas:pares.map(function(p){ return [_analise_fmtMes(p[0]), p[1]]; }) };
  } catch(e) { return { colunas:['Mês','Reuniões'], linhas:[] }; }
}

function _ds_encaminhamentos_status() {
  try {
    var d = ctrl_reunioes_metricas_encaminhamentos({});
    if (!d.ok || !d.data) return { colunas:['Status','Encaminhamentos'], linhas:[] };
    var m = d.data;
    var linhas = [];
    ['pendentes','concluidos','atrasados','emAndamento','cancelados'].forEach(function(k){
      if (typeof m[k] !== 'undefined') linhas.push([k.replace(/([A-Z])/g,' $1').replace(/^./,function(c){return c.toUpperCase();}), m[k]||0]);
    });
    if (!linhas.length) Object.keys(m).forEach(function(k){ if(typeof m[k]==='number') linhas.push([k, m[k]]); });
    return { colunas:['Status','Encaminhamentos'], linhas:linhas.filter(function(r){ return r[1]>0; }) };
  } catch(e) { return { colunas:['Status','Encaminhamentos'], linhas:[] }; }
}

// ─── Financeiro ───────────────────────────────────────────────────────────────

function _ds_financeiro_execucao() {
  var d = ctrl_dashboard_financeiro();
  if (!d.ok || !d.data) return { colunas:['Indicador','Valor (R$)'], linhas:[] };
  var fin = d.data;
  var linhas = [];
  if (fin.contratos) {
    if (fin.contratos.totalPrevisto  !== undefined) linhas.push(['Previsto',   fin.contratos.totalPrevisto||0]);
    if (fin.contratos.totalExecutado !== undefined) linhas.push(['Executado',  fin.contratos.totalExecutado||0]);
  }
  if (fin.remanejamentos) linhas.push(['Remanejamentos pendentes', fin.remanejamentos.pendentes||0]);
  if (fin.aditivos)       linhas.push(['Aditivos em análise',      fin.aditivos.emAnalise||0]);
  return { colunas:['Indicador','Valor (R$)'], linhas:linhas };
}

function _ds_financeiro_rubrica() {
  var d = ctrl_dashboard_financeiro();
  if (!d.ok || !d.data) return { colunas:['Rubrica','Valor (R$)'], linhas:[] };
  var fin = d.data;
  var linhas = [];
  if (fin.porRubrica) {
    Object.keys(fin.porRubrica).forEach(function(k){ linhas.push([k, fin.porRubrica[k]||0]); });
  } else if (fin.contratos && fin.contratos.lista) {
    var mapa = {};
    (fin.contratos.lista||[]).forEach(function(c){
      var r = c.rubrica || c.fonteRecurso || c.fonte || '—';
      mapa[r] = (mapa[r]||0) + (c.valorTotal||c.valor||1);
    });
    Object.keys(mapa).forEach(function(k){ linhas.push([k, mapa[k]]); });
  }
  linhas.sort(function(a,b){ return b[1]-a[1]; });
  return { colunas:['Rubrica','Valor (R$)'], linhas:linhas };
}

// ─── Pessoas ──────────────────────────────────────────────────────────────────

function _ds_pessoas_setor() {
  try {
    var d = ctrl_pessoas_metricas();
    if (d.ok && d.data) {
      var m = d.data;
      var linhas = [];
      if (m.porSetor) {
        if (Array.isArray(m.porSetor)) {
          linhas = m.porSetor.map(function(s){ return [s.setor||s.nome||s.key||'—', s.count||s.total||s.n||0]; });
        } else {
          Object.keys(m.porSetor).forEach(function(k){ linhas.push([k, m.porSetor[k]||0]); });
        }
        linhas.sort(function(a,b){ return b[1]-a[1]; });
        return { colunas:['Setor','Colaboradores'], linhas:linhas };
      }
    }
    // fallback: listar e agrupar
    var dl = ctrl_pessoas_listar({});
    var lista = (dl.ok && dl.data) ? (dl.data||[]) : [];
    lista = lista.filter(function(p){ return !p.status || p.status === 'ativo'; });
    return { colunas:['Setor','Colaboradores'], linhas:_analise_mapaParaLinhas(_analise_agrupar(lista,'setor')) };
  } catch(e) { return { colunas:['Setor','Colaboradores'], linhas:[] }; }
}

function _ds_pessoas_cargo() {
  try {
    var d = ctrl_pessoas_listar({});
    if (!d.ok || !d.data) return { colunas:['Cargo','Colaboradores'], linhas:[] };
    var lista = (d.data||[]).filter(function(p){ return !p.status || p.status === 'ativo'; });
    return { colunas:['Cargo','Colaboradores'], linhas:_analise_mapaParaLinhas(_analise_agrupar(lista,'cargo'), 15) };
  } catch(e) { return { colunas:['Cargo','Colaboradores'], linhas:[] }; }
}

function _ds_pessoas_vinculo() {
  try {
    var d = ctrl_pessoas_listar({});
    if (!d.ok || !d.data) return { colunas:['Vínculo','Colaboradores'], linhas:[] };
    var lista = (d.data||[]).filter(function(p){ return !p.status || p.status === 'ativo'; });
    return { colunas:['Vínculo','Colaboradores'], linhas:_analise_mapaParaLinhas(_analise_agrupar(lista,'vinculo')) };
  } catch(e) { return { colunas:['Vínculo','Colaboradores'], linhas:[] }; }
}

// ─── Ações Culturais ──────────────────────────────────────────────────────────

function _ds_acoes_status() {
  try {
    var d = ctrl_acoes_listar({});
    if (!d.ok || !d.data) return { colunas:['Status','Ações'], linhas:[] };
    return { colunas:['Status','Ações'], linhas:_analise_mapaParaLinhas(_analise_agrupar(d.data||[],'status')) };
  } catch(e) { return { colunas:['Status','Ações'], linhas:[] }; }
}

function _ds_acoes_tipo() {
  try {
    var d = ctrl_acoes_listar({});
    if (!d.ok || !d.data) return { colunas:['Tipo','Ações'], linhas:[] };
    return { colunas:['Tipo','Ações'], linhas:_analise_mapaParaLinhas(_analise_agrupar(d.data||[],'tipo')) };
  } catch(e) { return { colunas:['Tipo','Ações'], linhas:[] }; }
}

function _ds_acoes_mes() {
  try {
    var d = ctrl_acoes_listar({});
    if (!d.ok || !d.data) return { colunas:['Mês','Ações'], linhas:[] };
    var pares = _analise_porMes(d.data||[], 'criadoEm');
    return { colunas:['Mês','Ações'], linhas:pares.map(function(p){ return [_analise_fmtMes(p[0]), p[1]]; }) };
  } catch(e) { return { colunas:['Mês','Ações'], linhas:[] }; }
}

// ─── Público ──────────────────────────────────────────────────────────────────

function _ds_publico_acao() {
  try {
    var d = ctrl_publico_listarInscricoes({});
    if (!d.ok || !d.data) return { colunas:['Ação','Inscrições'], linhas:[] };
    var lista = d.data || [];
    var mapa  = {};
    lista.forEach(function(i){
      var k = i.acaoTitulo || i.acao || i.titulo || i.acaoId || '—';
      mapa[k] = (mapa[k]||0) + 1;
    });
    return { colunas:['Ação','Inscrições'], linhas:_analise_mapaParaLinhas(mapa, 15) };
  } catch(e) { return { colunas:['Ação','Inscrições'], linhas:[] }; }
}

function _ds_publico_mes() {
  try {
    var d = ctrl_publico_listarInscricoes({});
    if (!d.ok || !d.data) return { colunas:['Mês','Inscrições'], linhas:[] };
    var pares = _analise_porMes(d.data||[], 'criadoEm');
    return { colunas:['Mês','Inscrições'], linhas:pares.map(function(p){ return [_analise_fmtMes(p[0]), p[1]]; }) };
  } catch(e) { return { colunas:['Mês','Inscrições'], linhas:[] }; }
}

// ─── Estoque ──────────────────────────────────────────────────────────────────

function _ds_estoque_categoria() {
  var d = ctrl_dashboard_estoque();
  if (!d.ok || !d.data) return { colunas:['Categoria','Itens'], linhas:[] };
  var pc = (d.data||{}).porCategoria || {};
  var linhas = [];
  Object.keys(pc).forEach(function(k){ linhas.push([k, pc[k]||0]); });
  linhas.sort(function(a,b){ return b[1]-a[1]; });
  return { colunas:['Categoria','Itens'], linhas:linhas };
}

// ─── Comunicação ──────────────────────────────────────────────────────────────

function _ds_balcao_status() {
  try {
    var d = ctrl_balcao_metricas({});
    if (!d.ok || !d.data) return { colunas:['Status','Demandas'], linhas:[] };
    var m = d.data;
    var campos = ['abertas','emAndamento','pendentes','concluidas','canceladas','arquivadas'];
    var linhas = [];
    campos.forEach(function(k){
      if (typeof m[k] !== 'undefined') {
        var label = k.replace(/([A-Z])/g,' $1').replace(/^./,function(c){ return c.toUpperCase(); });
        linhas.push([label, m[k]||0]);
      }
    });
    if (!linhas.length) Object.keys(m).forEach(function(k){ if(typeof m[k]==='number') linhas.push([k, m[k]]); });
    return { colunas:['Status','Demandas'], linhas:linhas.filter(function(r){ return r[1]>0; }) };
  } catch(e) { return { colunas:['Status','Demandas'], linhas:[] }; }
}

// ─── Escuta ───────────────────────────────────────────────────────────────────

function _ds_escuta_pesquisa() {
  try {
    var d = ctrl_escuta_metricas({});
    if (!d.ok || !d.data) return { colunas:['Indicador','Valor'], linhas:[] };
    var m = d.data;
    var linhas = [];
    var campos = ['totalPesquisas','totalRespostas','ativas','encerradas','mediaAvaliacao','nps'];
    campos.forEach(function(k){
      if (typeof m[k] !== 'undefined') {
        var label = k.replace(/([A-Z])/g,' $1').replace(/^./,function(c){ return c.toUpperCase(); });
        linhas.push([label, typeof m[k]==='number' ? Math.round(m[k]*10)/10 : 0]);
      }
    });
    if (!linhas.length) Object.keys(m).forEach(function(k){ if(typeof m[k]==='number') linhas.push([k, Math.round(m[k]*10)/10]); });
    return { colunas:['Indicador','Valor'], linhas:linhas };
  } catch(e) { return { colunas:['Indicador','Valor'], linhas:[] }; }
}

// ─── Cruzamentos ──────────────────────────────────────────────────────────────

function ctrl_analise_cruzar(params) {
  return GasResponse.wrap(function() {
    var modo = (params||{}).modo || '';
    var dsA  = (params||{}).dsA;
    var dsB  = (params||{}).dsB;
    if      (modo === 'pessoas_x_tarefas'   || (!modo && dsA==='pessoas_setor'  && dsB==='tarefas_setor'))   return _cruzar_pessoas_tarefas();
    if      (modo === 'reservas_x_tarefas'  || (!modo && dsA==='reservas_setor' && dsB==='tarefas_setor'))   return _cruzar_reservas_tarefas();
    if      (modo === 'acoes_x_publico_mes' || (!modo && dsA==='acoes_mes'      && dsB==='publico_mes'))      return _cruzar_acoes_publico_mes();
    if (dsA && dsB) return _cruzar_custom(dsA, dsB);
    throw new Error('Especifique modo ou dsA+dsB.');
  }, 'ctrl_analise_cruzar');
}

function _cruzar_pessoas_tarefas() {
  var ps = _ds_pessoas_setor();
  var ts = _ds_tarefas_setor();
  return _juntar(ps.linhas, ts.linhas, 'Setor', 'Colaboradores', 'Tarefas');
}

function _cruzar_reservas_tarefas() {
  var rs = _ds_reservas_setor();
  var ts = _ds_tarefas_setor();
  return _juntar(rs.linhas, ts.linhas, 'Setor', 'Reservas', 'Tarefas');
}

function _cruzar_acoes_publico_mes() {
  var as = _ds_acoes_mes();
  var ps = _ds_publico_mes();
  var linhas = _juntar(as.linhas, ps.linhas, 'Mês', 'Ações', 'Inscrições').linhas;
  linhas.sort(function(a,b){ return String(a[0]).localeCompare(String(b[0])); });
  return { colunas:['Mês','Ações','Inscrições'], linhas:linhas };
}

function _juntar(linhasA, linhasB, colLabel, colA, colB) {
  var mpA = {};
  (linhasA||[]).forEach(function(r){ mpA[r[0]] = r[1]||0; });
  var mpB = {};
  (linhasB||[]).forEach(function(r){ mpB[r[0]] = r[1]||0; });
  var keys = {};
  (linhasA||[]).forEach(function(r){ keys[r[0]] = true; });
  (linhasB||[]).forEach(function(r){ keys[r[0]] = true; });
  var linhas = Object.keys(keys).map(function(k){ return [k, mpA[k]||0, mpB[k]||0]; });
  linhas.sort(function(a,b){ return (b[1]+b[2])-(a[1]+a[2]); });
  return { colunas:[colLabel, colA, colB], linhas:linhas };
}

function _cruzar_custom(dsA, dsB) {
  var dA = _analise_dataset(dsA);
  var dB = _analise_dataset(dsB);
  var colA = dA.colunas[1] || dsA;
  var colB = dB.colunas[1] || dsB;
  return _juntar(dA.linhas, dB.linhas, 'Chave', colA, colB);
}

// ─── Dashboard Builder ────────────────────────────────────────────────────────

var _ANALISE_DASHBOARD_KEY = 'ANALISE_DASHBOARD_ITEMS';

function ctrl_analise_dashboard_listar() {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    var raw   = PropertiesService.getScriptProperties().getProperty(_ANALISE_DASHBOARD_KEY);
    var lista = raw ? JSON.parse(raw) : [];
    return lista.filter(function(item) { return _analise_podeVer(item, email); });
  }, 'ctrl_analise_dashboard_listar');
}

function ctrl_analise_dashboard_salvar(params) {
  return GasResponse.wrap(function() {
    var email = getEmailSessao();
    var raw   = PropertiesService.getScriptProperties().getProperty(_ANALISE_DASHBOARD_KEY);
    var lista = raw ? JSON.parse(raw) : [];
    var item  = params || {};
    if (!item.titulo) throw new Error('Título obrigatório');
    if (item.id) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) { if (lista[i].id === item.id) { idx = i; break; } }
      if (idx >= 0) {
        if (lista[idx].donoEmail && lista[idx].donoEmail !== email) throw new Error('Sem permissão para editar este dashboard.');
        for (var k in item) { lista[idx][k] = item[k]; }
        lista[idx].atualizadoEm = new Date().toISOString();
      } else {
        item.donoEmail = email;
        item.criadoEm  = new Date().toISOString();
        lista.push(item);
      }
    } else {
      item.id        = Utilities.getUuid();
      item.donoEmail = email;
      item.criadoEm  = new Date().toISOString();
      lista.push(item);
    }
    PropertiesService.getScriptProperties().setProperty(_ANALISE_DASHBOARD_KEY, JSON.stringify(lista));
    AuditoriaService.registrar('DASHBOARD_SALVAR', 'analise_studio', { titulo: item.titulo, widgets: (item.widgets||[]).length });
    return { id: item.id };
  }, 'ctrl_analise_dashboard_salvar');
}

function ctrl_analise_dashboard_excluir(params) {
  return GasResponse.wrap(function() {
    var raw   = PropertiesService.getScriptProperties().getProperty(_ANALISE_DASHBOARD_KEY);
    var lista = raw ? JSON.parse(raw) : [];
    var id    = (params || {}).id;
    lista     = lista.filter(function(x) { return x.id !== id; });
    PropertiesService.getScriptProperties().setProperty(_ANALISE_DASHBOARD_KEY, JSON.stringify(lista));
    AuditoriaService.registrar('DASHBOARD_EXCLUIR', 'analise_studio', { id: id });
    return true;
  }, 'ctrl_analise_dashboard_excluir');
}

function ctrl_analise_widget_dados(params) {
  return GasResponse.wrap(function() {
    var dsId  = (params || {}).dsId;
    var dsId2 = (params || {}).dsId2;
    if (!dsId) throw new Error('dsId obrigatório');
    if (dsId2) return _cruzar_custom(dsId, dsId2);
    return _analise_dataset(dsId);
  }, 'ctrl_analise_widget_dados');
}
