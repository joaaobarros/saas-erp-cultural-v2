/**
 * @file modules/estoque/migracao_estoque_v1.gs
 * @layer modules/estoque
 * @description Migração de bens permanentes (Patrimônio/Ativos) do V1 para o
 *              módulo Estoque V2 (Fase 78). Não há consumíveis V1 a importar.
 *
 * @depends modules/estoque/item_estoque_repository.gs (ItemEstoqueRepository)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 */

// ─── Migração de Ativos (Patrimônio) V1 → Estoque V2 ──────────────────────────

/**
 * PASSO 1 — Inspeciona ESPACOS.Ativos para verificar os dados antes de migrar.
 * Executar no GAS Editor.
 */
function fase78_inspecionar_ativos_v1() {
  try {
    var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID_ESPACOS');
    if (!sheetId) { console.log('ERRO: SHEET_ID_ESPACOS não configurada.'); return { ok: false }; }
    var ss  = SpreadsheetApp.openById(sheetId);
    var aba = ss.getSheetByName('Ativos');
    if (!aba) { console.log('ERRO: aba "Ativos" não encontrada em ESPACOS.'); return { ok: false }; }
    console.log('Ativos em ESPACOS: ' + aba.getLastRow() + ' linhas (inclui cabeçalho)');
    if (aba.getLastRow() < 2) { console.log('Aba vazia.'); return { ok: true, total: 0 }; }
    var headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    console.log('Headers: ' + JSON.stringify(headers));
    var amostras = aba.getRange(2, 1, Math.min(3, aba.getLastRow() - 1), aba.getLastColumn()).getValues();
    amostras.forEach(function(r, i) { console.log('Linha ' + (i+2) + ': ' + JSON.stringify(r)); });
    return { ok: true, headers: headers, total: aba.getLastRow() - 1 };
  } catch (e) {
    console.log('ERRO: ' + e.message);
    return { ok: false, erro: e.message };
  }
}

/**
 * PASSO 2 — Migra ESPACOS.Ativos → ESTOQUE.ItensEstoque (tipo=Permanente).
 * Idempotente: pula itens já existentes por referencia/nome.
 *
 * @param {Object} opcoes {
 *   modoTeste?   — se true, apenas mostra o que faria (padrão: false)
 *   tombado?     — true = marca como tombado (padrão: false)
 *   situacao?    — situação padrão (padrão: 'Ativo')
 * }
 */
function fase78_migrar_ativos_para_estoque(opcoes) {
  opcoes = opcoes || {};
  var modoTeste  = opcoes.modoTeste === true;
  var tombado    = opcoes.tombado   === true;
  var situacao   = opcoes.situacao  || 'Ativo';
  var orgId      = getOrgConfig().orgId;
  var resultado  = { ok: true, importados: 0, ignorados: 0, erros: 0, detalhes: [] };

  try {
    var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID_ESPACOS');
    if (!sheetId) throw new Error('SHEET_ID_ESPACOS não configurada. Execute inicializarSistema().');
    var aba = SpreadsheetApp.openById(sheetId).getSheetByName('Ativos');
    if (!aba || aba.getLastRow() < 2) {
      resultado.detalhes.push('Aba ESPACOS.Ativos vazia — nada a migrar.');
      return resultado;
    }

    ItemEstoqueRepository.prepararIndice();

    var headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0]
      .map(function(h) { return String(h).trim().toLowerCase(); });
    var dados = aba.getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn()).getValues();

    // Índice de colunas pelo header (case-insensitive)
    function col(nome) { return headers.indexOf(nome.toLowerCase()); }

    // Cache de deduplicação
    var existentes = ItemEstoqueRepository.listar({ tipo: 'Permanente' }, orgId);
    var existeMap  = {};
    existentes.forEach(function(e) {
      if (e.referencia) existeMap[e.referencia.toLowerCase()] = true;
      existeMap[e.descricao.toLowerCase()] = true;
    });

    dados.forEach(function(row, ri) {
      try {
        var nome = col('nome') >= 0 ? String(row[col('nome')] || '').trim() : '';
        if (!nome) { resultado.ignorados++; return; }

        var codigo = col('codigo') >= 0 ? String(row[col('codigo')] || '').trim() : '';
        var chave  = (codigo || nome).toLowerCase();
        if (existeMap[chave]) {
          resultado.ignorados++;
          resultado.detalhes.push('[linha '+(ri+2)+'] IGNORADO (já existe): ' + nome);
          return;
        }

        var cat = col('categoria') >= 0 ? String(row[col('categoria')] || '').trim() : 'Geral';
        var loc = col('localizacao') >= 0 ? String(row[col('localizacao')] || '').trim() : '';
        var resp = col('responsavel') >= 0 ? String(row[col('responsavel')] || '').trim() : '';
        var val  = col('valoraquisicao') >= 0 ? Number(row[col('valoraquisicao')] || 0) : 0;
        var dataAq = col('dataaquisicao') >= 0 ? String(row[col('dataaquisicao')] || '').trim() : '';
        var nf   = col('notafiscal') >= 0 ? String(row[col('notafiscal')] || '').trim() : '';
        var vida = col('vidautilanow') >= 0 ? Number(row[col('vidautilanow')] || 0) : 0;
        var proxManut = col('proximamanutencao') >= 0 ? String(row[col('proximamanutencao')] || '').trim() : '';
        var tipo = col('tipo') >= 0 ? String(row[col('tipo')] || '').trim() : '';
        var numPat = codigo || '';

        // statusItem derivado do status V1
        var statusV1 = col('status') >= 0 ? String(row[col('status')] || '').toLowerCase() : 'disponivel';
        var statusMap = { disponivel: 'disponivel', em_uso: 'em_uso', reservado: 'em_uso', manutencao: 'manutencao', baixado: 'baixado' };
        var statusItem = statusMap[statusV1] || 'disponivel';

        var item = {
          descricao:           nome,
          referencia:          codigo,
          categoria:           cat || 'Geral',
          marcaFabricante:     col('fornecedor') >= 0 ? String(row[col('fornecedor')] || '').trim() : '',
          situacao:            situacao,
          unidadeMedida:       'un',
          valorUnitario:       val,
          descricaoPregao:     col('descricao') >= 0 ? String(row[col('descricao')] || '').trim() : '',
          tipo:                'Permanente',
          tombado:             tombado,
          numeroPatrimonio:    numPat,
          statusItem:          statusItem,
          localizacao:         loc,
          responsavel:         resp,
          dataAquisicao:       dataAq ? String(dataAq).slice(0, 10) : '',
          notaFiscal:          nf,
          vidaUtilAnos:        vida,
          proximaManutencao:   proxManut,
          visivelSolicitantes: false,
          critico:             false
        };

        if (modoTeste) {
          resultado.detalhes.push('[linha '+(ri+2)+'] TESTE: ' + nome + ' → statusItem=' + statusItem);
          resultado.importados++;
          return;
        }

        ItemEstoqueRepository.criar(item, orgId);
        existeMap[chave] = true;
        resultado.importados++;
        resultado.detalhes.push('[linha '+(ri+2)+'] CRIADO: ' + nome);

      } catch (eItem) {
        resultado.erros++;
        resultado.detalhes.push('[linha '+(ri+2)+'] ERRO: ' + eItem.message);
      }
    });

    console.log('[fase78] Concluído. Importados=' + resultado.importados + ' Ignorados=' + resultado.ignorados + ' Erros=' + resultado.erros);
    return resultado;
  } catch (e) {
    Logger.error('migracao_estoque_v1', 'fase78_migrar_ativos_para_estoque', e.message);
    resultado.ok = false;
    resultado.erro = e.message;
    return resultado;
  }
}

// ─── Utilitários administrativos ───────────────────────────────────────────────

/**
 * Remove todos os itens (e saldos) do estoque V2 para a org atual.
 * Executar no GAS Editor para limpar dados importados incorretamente.
 */
function fase75_limpar_itens_estoque_v2() {
  var orgId   = getOrgConfig().orgId;
  var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID_ESTOQUE');
  if (!sheetId) return { ok: false, erro: 'SHEET_ID_ESTOQUE não configurada. Execute inicializarSistema().' };

  var ss = SpreadsheetApp.openById(sheetId);
  var removidos = 0;

  ['ItensEstoque', 'SaldoEstoque'].forEach(function(nomeAba) {
    var aba = ss.getSheetByName(nomeAba);
    if (!aba || aba.getLastRow() < 2) return;
    var rows = aba.getRange(2, 1, aba.getLastRow() - 1, 2).getValues();
    for (var i = rows.length - 1; i >= 0; i--) {
      if (rows[i][1] === orgId) { aba.deleteRow(i + 2); removidos++; }
    }
  });

  Logger.info('migracao_estoque_v1', 'fase75_limpar_itens_estoque_v2', 'Removidos: ' + removidos);
  return { ok: true, removidos: removidos };
}

/**
 * Adiciona a coluna "Tipo" (Consumível/Permanente) ao cabeçalho de ItensEstoque.
 * Executar UMA VEZ após o deploy que adiciona o campo tipo ao repositório.
 */
function fase75_adicionar_coluna_tipo() {
  var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID_ESTOQUE');
  if (!sheetId) return { ok: false, erro: 'SHEET_ID_ESTOQUE não configurada. Execute inicializarSistema().' };

  var aba = SpreadsheetApp.openById(sheetId).getSheetByName('ItensEstoque');
  if (!aba) return { ok: false, erro: 'Aba ItensEstoque não encontrada.' };

  var headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  if (headers.indexOf('Tipo') !== -1) return { ok: true, msg: 'Coluna Tipo já existe.' };

  var colNova = aba.getLastColumn() + 1;
  aba.getRange(1, colNova).setValue('Tipo');
  return { ok: true, msg: 'Coluna Tipo adicionada na col ' + colNova + '.' };
}
