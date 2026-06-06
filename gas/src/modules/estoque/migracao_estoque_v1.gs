/**
 * @file modules/estoque/migracao_estoque_v1.gs
 * @layer modules/estoque
 * @description Migração de itens do V1 (patrimônio/almoxarifado antigo) para o
 *              módulo Estoque V2 (Fase 73+). Fase 75.1.
 *
 *              Patrimônio e Estoque são o mesmo domínio em V2. O campo Tombado
 *              distingue bens formalmente registrados no patrimônio institucional.
 *
 * Planilha V1: 19UKfQ4cKFKEWlK8K3JaeajsALafNdTQJOD-w_LG-Q_g (GID 15114512)
 *
 * @depends modules/estoque/item_estoque_repository.gs (ItemEstoqueRepository)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 *          core/utils.gs (gerarId, agora)
 */

var _SHEET_ID_V1_ESTOQUE = '19UKfQ4cKFKEWlK8K3JaeajsALafNdTQJOD-w_LG-Q_g';
var _GID_V1_ESTOQUE      = 1863856920;

// ─── Mapeamento de colunas V1 → V2 ────────────────────────────────────────────
// Tenta correspondência por substring (case-insensitive).
// Adicione aliases se o nome real da coluna for diferente.
var _MAPA_COLUNAS = [
  // 'item' removido de descricao — captura incorretamente "ID Item"
  { v2: 'descricao',         aliases: ['descri', 'nome', 'produto', 'material'] },
  // 'id item' e 'id_item' adicionados — capturam o código identificador do V1
  { v2: 'referencia',        aliases: ['id item', 'id_item', 'refer', 'cod', 'código', 'codigo', 'ref'] },
  { v2: 'tamanho',           aliases: ['tamanho', 'size'] },
  { v2: 'cor',               aliases: ['cor'] },
  { v2: 'marcaFabricante',   aliases: ['marca', 'fabricante', 'fornecedor'] },
  { v2: 'categoria',         aliases: ['categ', 'tipo', 'grupo', 'setor', 'classe'] },
  { v2: 'situacao',          aliases: ['situa', 'status', 'ativo', 'inativo'] },
  { v2: 'unidadeMedida',     aliases: ['unid', 'unit', 'und', 'medida'] },
  { v2: 'valorUnitario',     aliases: ['valor', 'preco', 'preço', 'custo', 'unit value', 'vl'] },
  { v2: 'descricaoPregao',   aliases: ['pregao', 'pregão', 'contrato', 'licitacao'] },
  { v2: 'critico',           aliases: ['critic', 'crítico', 'critico', 'minimo', 'mínimo'] },
  { v2: 'visivelSolicitantes', aliases: ['visivel', 'visível', 'solicita', 'disponivel'] },
  { v2: '_saldoQtd',         aliases: ['saldo', 'quantidade', 'qtd', 'estoque atual', 'qt'] },
  { v2: '_depositoId',       aliases: ['deposito', 'depósito', 'local', 'localiz'] }
];

/**
 * PASSO 1 — Inspeciona a planilha V1 e retorna headers + primeiras linhas.
 * Executar no GAS Editor para confirmar mapeamento antes de migrar.
 * Resultado: aparece nos Logs (Ctrl+Enter → Ver Logs).
 */
function fase75_inspecionar_estoque_v1() {
  try {
    var ss   = SpreadsheetApp.openById(_SHEET_ID_V1_ESTOQUE);
    var abas = ss.getSheets();

    console.log('=== PLANILHA V1 ESTOQUE ===');
    console.log('Abas disponíveis (' + abas.length + '):');
    abas.forEach(function(a, i) {
      console.log('  [' + i + '] nome="' + a.getName() + '" gid=' + a.getSheetId() + ' linhas=' + a.getLastRow());
    });

    // Localiza a aba pelo GID
    var aba = _getAbaV1(ss);
    if (!aba) {
      console.log('ERRO: aba com GID ' + _GID_V1_ESTOQUE + ' não encontrada.');
      return { ok: false, erro: 'Aba não encontrada' };
    }

    console.log('\nAba alvo: "' + aba.getName() + '" (GID=' + aba.getSheetId() + ')');
    console.log('Dimensões: ' + aba.getLastRow() + ' linhas x ' + aba.getLastColumn() + ' colunas\n');

    var lastRow = aba.getLastRow();
    var lastCol = aba.getLastColumn();
    if (lastRow < 1 || lastCol < 1) {
      console.log('AVISO: aba vazia.');
      return { ok: true, headers: [], dados: [] };
    }

    var headers = aba.getRange(1, 1, 1, lastCol).getValues()[0];
    console.log('CABEÇALHOS:');
    headers.forEach(function(h, i) {
      var mapeado = _detectarCampo(String(h));
      console.log('  col[' + i + '] = "' + h + '" → v2.' + (mapeado || '(não mapeado)'));
    });

    var numAmostras = Math.min(5, lastRow - 1);
    if (numAmostras > 0) {
      console.log('\nPRIMEIRAS ' + numAmostras + ' LINHAS:');
      var dados = aba.getRange(2, 1, numAmostras, lastCol).getValues();
      dados.forEach(function(row, ri) {
        console.log('  linha[' + (ri + 2) + ']: ' + row.map(function(c, ci) {
          return headers[ci] + '=' + JSON.stringify(c);
        }).join(' | '));
      });
    }

    return {
      ok:      true,
      aba:     aba.getName(),
      linhas:  lastRow,
      colunas: lastCol,
      headers: headers
    };
  } catch (e) {
    Logger.error('migracao_estoque_v1', 'inspecionar', e.message);
    return { ok: false, erro: e.message };
  }
}

/**
 * PASSO 2 — Migra os itens do V1 para ItemEstoqueRepository do V2.
 * Idempotente: verifica por `referencia` ou `descricao` antes de criar.
 * Retorna { ok, importados, ignorados, erros, detalhes }.
 *
 * Patrimônio e Estoque são o mesmo domínio em V2. Os itens do V1 são bens
 * físicos permanentes — importados como tipo='Permanente', tombado=false.
 *
 * @param {Object} opcoes {
 *   depositoIdPadrao? — ID do depósito para saldo inicial (padrão: 'dep-01')
 *   situacaoPadrao?   — situação dos itens sem valor (padrão: 'Ativo')
 *   categoriaPadrao?  — categoria fallback (padrão: 'Geral')
 *   tipoPadrao?       — tipo dos itens (padrão: 'Permanente' para V1)
 *   tombado?          — se true marca como bem tombado (padrão: false)
 *   importarSaldo?    — se true tenta ler coluna de saldo (padrão: true)
 *   modoTeste?        — se true mostra o que faria mas não grava (padrão: false)
 * }
 */
function fase75_importar_consumiveis_v1(opcoes) {
  opcoes = opcoes || {};
  var depositoPadrao  = opcoes.depositoIdPadrao || 'dep-01';
  var situacaoPadrao  = opcoes.situacaoPadrao   || 'Ativo';
  var categoriaPadrao = opcoes.categoriaPadrao  || 'Geral';
  var tipoPadrao      = opcoes.tipoPadrao       || 'Permanente';
  var tombado         = opcoes.tombado === true;
  var importarSaldo   = opcoes.importarSaldo !== false;
  var modoTeste       = opcoes.modoTeste === true;

  var orgId = getOrgConfig().orgId;
  var resultado = { ok: true, importados: 0, ignorados: 0, erros: 0, detalhes: [] };

  try {
    // Garante que as abas do V2 existem
    ItemEstoqueRepository.prepararIndice();

    var ss  = SpreadsheetApp.openById(_SHEET_ID_V1_ESTOQUE);
    var aba = _getAbaV1(ss);
    if (!aba) throw new Error('Aba com GID ' + _GID_V1_ESTOQUE + ' não encontrada na planilha V1.');

    var lastRow = aba.getLastRow();
    var lastCol = aba.getLastColumn();
    if (lastRow < 2) {
      resultado.detalhes.push('Planilha vazia — nenhum item para importar.');
      return resultado;
    }

    var headers = aba.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); });
    var dados   = aba.getRange(2, 1, lastRow - 1, lastCol).getValues();

    // Índice de colunas detectadas
    var idx = {};
    headers.forEach(function(h, i) {
      var campo = _detectarCampo(h);
      if (campo && idx[campo] === undefined) idx[campo] = i;
    });

    console.log('[migracao_estoque_v1] Headers detectados: ' + JSON.stringify(idx));

    // Cache de itens existentes para deduplicação
    var existentes = ItemEstoqueRepository.listar({}, orgId);
    var existRefs  = {};
    existentes.forEach(function(e) {
      if (e.referencia) existRefs[String(e.referencia).trim().toLowerCase()] = true;
      existRefs[e.descricao.trim().toLowerCase()] = true;
    });

    dados.forEach(function(row, ri) {
      try {
        var descricao = idx.descricao !== undefined ? String(row[idx.descricao] || '').trim() : '';
        if (!descricao) {
          resultado.ignorados++;
          return;
        }

        var referencia = idx.referencia !== undefined ? String(row[idx.referencia] || '').trim() : '';
        var chaveDedup = (referencia || descricao).toLowerCase();

        if (existRefs[chaveDedup]) {
          resultado.ignorados++;
          resultado.detalhes.push('[linha ' + (ri + 2) + '] IGNORADO (já existe): ' + descricao);
          return;
        }

        var item = {
          descricao:            descricao,
          referencia:           referencia,
          tamanho:              idx.tamanho           !== undefined ? String(row[idx.tamanho]           || '').trim() : '',
          cor:                  idx.cor               !== undefined ? String(row[idx.cor]               || '').trim() : '',
          marcaFabricante:      idx.marcaFabricante   !== undefined ? String(row[idx.marcaFabricante]   || '').trim() : '',
          categoria:            idx.categoria         !== undefined ? (String(row[idx.categoria] || '').trim() || categoriaPadrao) : categoriaPadrao,
          situacao:             _normalizarSituacao(idx.situacao !== undefined ? row[idx.situacao] : situacaoPadrao),
          unidadeMedida:        idx.unidadeMedida     !== undefined ? String(row[idx.unidadeMedida]     || '').trim() : 'un',
          valorUnitario:        idx.valorUnitario     !== undefined ? _parseMoeda(row[idx.valorUnitario]) : 0,
          descricaoPregao:      idx.descricaoPregao   !== undefined ? String(row[idx.descricaoPregao]   || '').trim() : '',
          critico:              idx.critico           !== undefined ? _parseBoolean(row[idx.critico]) : false,
          visivelSolicitantes:  idx.visivelSolicitantes !== undefined ? _parseBoolean(row[idx.visivelSolicitantes]) : true,
          tipo:                 tipoPadrao,
          tombado:              tombado
        };

        var saldoQtd = 0;
        if (importarSaldo && idx._saldoQtd !== undefined) {
          saldoQtd = Math.max(0, Number(row[idx._saldoQtd] || 0));
        }

        if (modoTeste) {
          resultado.detalhes.push('[linha ' + (ri + 2) + '] TESTE: ' + JSON.stringify(item) + ' saldo=' + saldoQtd);
          resultado.importados++;
          return;
        }

        var criado = ItemEstoqueRepository.criar(item, orgId);

        // Se tem saldo, registra entrada inicial no depósito padrão
        if (saldoQtd > 0) {
          var lock = LockService.getScriptLock();
          lock.waitLock(8000);
          try {
            ItemEstoqueRepository.atualizarSaldo(criado.id, depositoPadrao, '', saldoQtd, 0, orgId);
            ItemEstoqueRepository.registrarMovimentacao({
              tipo:          'entrada_ajuste',
              itemId:        criado.id,
              descricaoItem: criado.descricao,
              depositoId:    depositoPadrao,
              local:         '',
              quantidade:    saldoQtd,
              valorUnitario: criado.valorUnitario || 0,
              referencia:    'Migração V1',
              ator:          'sistema',
              observacoes:   'Importado automaticamente de V1 (Estoque Fácil) pela fase75_importar_consumiveis_v1()'
            }, orgId);
          } finally {
            lock.releaseLock();
          }
        }

        existRefs[chaveDedup] = true; // evita duplicar na mesma execução
        resultado.importados++;
        resultado.detalhes.push('[linha ' + (ri + 2) + '] CRIADO: ' + descricao + ' (saldo=' + saldoQtd + ')');

      } catch (eItem) {
        resultado.erros++;
        resultado.detalhes.push('[linha ' + (ri + 2) + '] ERRO: ' + eItem.message);
        Logger.warn('migracao_estoque_v1', 'importar', 'linha ' + (ri + 2) + ': ' + eItem.message);
      }
    });

    console.log('[migracao_estoque_v1] Concluído. Importados=' + resultado.importados + ' Ignorados=' + resultado.ignorados + ' Erros=' + resultado.erros);
    return resultado;

  } catch (e) {
    Logger.error('migracao_estoque_v1', 'fase75_importar_consumiveis_v1', e.message);
    resultado.ok  = false;
    resultado.erro = e.message;
    return resultado;
  }
}

// ─── Helpers privados ──────────────────────────────────────────────────────────

function _getAbaV1(ss) {
  var abas = ss.getSheets();
  for (var i = 0; i < abas.length; i++) {
    if (abas[i].getSheetId() === _GID_V1_ESTOQUE) return abas[i];
  }
  return null;
}

function _detectarCampo(nomeColuna) {
  var norm = String(nomeColuna).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (var i = 0; i < _MAPA_COLUNAS.length; i++) {
    var entry = _MAPA_COLUNAS[i];
    for (var j = 0; j < entry.aliases.length; j++) {
      var alias = entry.aliases[j].normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (norm.indexOf(alias) !== -1) return entry.v2;
    }
  }
  return null;
}

function _normalizarSituacao(valor) {
  if (!valor) return 'Ativo';
  var v = String(valor).toLowerCase().trim();
  if (v === 'ativo' || v === 'ativa' || v === 'true' || v === '1' || v === 'sim' || v === 'yes') return 'Ativo';
  if (v === 'inativo' || v === 'inativa' || v === 'false' || v === '0' || v === 'não' || v === 'nao') return 'Inativo';
  return 'Ativo';
}

function _parseBoolean(valor) {
  if (typeof valor === 'boolean') return valor;
  var v = String(valor).toLowerCase().trim();
  return v === 'true' || v === '1' || v === 'sim' || v === 'yes' || v === 's' || v === 'x';
}

function _parseMoeda(valor) {
  if (!valor && valor !== 0) return 0;
  if (typeof valor === 'number') return valor;
  var s = String(valor).replace(/[R$\s]/g, '').replace('.', '').replace(',', '.');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
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
