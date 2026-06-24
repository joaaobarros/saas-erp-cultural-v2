/**
 * @file analise_controller.gs
 * @layer controller
 * @description Estúdio de Análises Visuais — persiste análises criadas pelo usuário
 * @depends GasResponse, AuditoriaService, PropertiesService
 */

var _ANALISE_PROP_KEY = 'ANALISE_STUDIO_ITEMS';

function ctrl_analise_listar() {
  return GasResponse.wrap(function() {
    var raw = PropertiesService.getScriptProperties().getProperty(_ANALISE_PROP_KEY);
    return raw ? JSON.parse(raw) : [];
  }, 'ctrl_analise_listar');
}

function ctrl_analise_salvar(params) {
  return GasResponse.wrap(function() {
    var raw = PropertiesService.getScriptProperties().getProperty(_ANALISE_PROP_KEY);
    var lista = raw ? JSON.parse(raw) : [];
    var item = params || {};
    if (!item.titulo) throw new Error('Título obrigatório');
    if (!item.tipo)   throw new Error('Tipo de gráfico obrigatório');

    if (item.id) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) { if (lista[i].id === item.id) { idx = i; break; } }
      if (idx >= 0) {
        var merged = {};
        for (var k in lista[idx]) { merged[k] = lista[idx][k]; }
        for (var k in item)       { merged[k] = item[k]; }
        merged.atualizadoEm = new Date().toISOString();
        lista[idx] = merged;
      } else {
        item.criadoEm = new Date().toISOString();
        lista.push(item);
      }
    } else {
      item.id = Utilities.getUuid();
      item.criadoEm = new Date().toISOString();
      lista.push(item);
    }

    PropertiesService.getScriptProperties().setProperty(_ANALISE_PROP_KEY, JSON.stringify(lista));
    AuditoriaService.registrar('ANALISE_SALVAR', 'analise_studio', { titulo: item.titulo, tipo: item.tipo });
    return { id: item.id };
  }, 'ctrl_analise_salvar');
}

function ctrl_analise_excluir(params) {
  return GasResponse.wrap(function() {
    var raw = PropertiesService.getScriptProperties().getProperty(_ANALISE_PROP_KEY);
    var lista = raw ? JSON.parse(raw) : [];
    var id = (params || {}).id;
    lista = lista.filter(function(x) { return x.id !== id; });
    PropertiesService.getScriptProperties().setProperty(_ANALISE_PROP_KEY, JSON.stringify(lista));
    AuditoriaService.registrar('ANALISE_EXCLUIR', 'analise_studio', { id: id });
    return true;
  }, 'ctrl_analise_excluir');
}

function ctrl_analise_importar_dados(params) {
  return GasResponse.wrap(function() {
    var modulo = (params || {}).modulo || 'operacional';

    if (modulo === 'financeiro') {
      var d = ctrl_dashboard_financeiro();
      if (!d.ok || !d.data) return { colunas: ['Indicador', 'Valor (R$)'], linhas: [] };
      var fin = d.data;
      var linhas = [];
      if (fin.contratos) {
        linhas.push(['Orçamento Previsto',   fin.contratos.totalPrevisto   || 0]);
        linhas.push(['Orçamento Executado',  fin.contratos.totalExecutado  || 0]);
      }
      if (fin.remanejamentos) linhas.push(['Remanejamentos Pendentes', fin.remanejamentos.pendentes || 0]);
      if (fin.aditivos)       linhas.push(['Aditivos em Análise',      fin.aditivos.emAnalise       || 0]);
      return { colunas: ['Indicador', 'Valor (R$)'], linhas: linhas };
    }

    if (modulo === 'estoque') {
      var d = ctrl_dashboard_estoque();
      if (!d.ok || !d.data) return { colunas: ['Categoria', 'Itens'], linhas: [] };
      var est = d.data || {};
      var linhas = [];
      var pc = est.porCategoria || {};
      Object.keys(pc).forEach(function(k) { linhas.push([k, pc[k] || 0]); });
      return { colunas: ['Categoria', 'Itens'], linhas: linhas };
    }

    // padrão: operacional
    var d = ctrl_dashboard_operacional();
    if (!d.ok || !d.data) return { colunas: ['Indicador', 'Quantidade'], linhas: [] };
    var op = d.data || {};
    var linhas = [];
    if (op.tarefas) {
      linhas.push(['Tarefas em Dia',    (op.tarefas.total || 0) - (op.tarefas.atrasadas || 0)]);
      linhas.push(['Tarefas Atrasadas', op.tarefas.atrasadas || 0]);
    }
    if (op.espacos) linhas.push(['Reservas Hoje',    op.espacos.reservasHoje  || 0]);
    if (op.balcao)  linhas.push(['Demandas Abertas', op.balcao.abertas         || 0]);
    if (op.alertas) linhas.push(['Alertas Não Lidos',op.alertas.naoLidos       || 0]);
    return { colunas: ['Indicador', 'Quantidade'], linhas: linhas };
  }, 'ctrl_analise_importar_dados');
}
