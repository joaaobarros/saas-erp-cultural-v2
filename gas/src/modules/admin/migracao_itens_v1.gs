/**
 * @file modules/admin/migracao_itens_v1.gs
 * @layer modules/admin
 * @description Migração única de itens do V1 (CCBJ_ESPACOS.Itens) para V2 (MASTER.Itens).
 *
 * COMO USAR:
 *   1. No GAS Editor do V2, acesse Configurações do Projeto → Propriedades do Script.
 *   2. Adicione: V1_ESPACOS_SHEET_ID = <ID da planilha CCBJ_ESPACOS do V1>
 *      (encontrar no V1 em Script Properties → SHEET_ID_ESPACOS)
 *   3. Execute migrar_itens_v1() no GAS Editor.
 *   4. Retorna { ok: true, importados: N, ignorados: M }
 *
 * Mapeamento de colunas V1 → V2:
 *   [0] ID Item        → ignorado (V2 gera novo ID)
 *   [1] Nome           → nome (obrigatório)
 *   [2] Categoria      → categoria
 *   [3] Quantidade Total → quantidadeTotal
 *   [4] Localização    → localizacao (string — JSON de sala→qty no V1)
 *   [5] Status de Uso  → ignorado
 *
 * @depends modules/espacos/almoxarifado_engine.gs (AlmoxarifadoEngine)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 */

function migrar_itens_v1() {
  var V1_ESPACOS_ID = PropertiesService.getScriptProperties()
                        .getProperty('V1_ESPACOS_SHEET_ID');
  if (!V1_ESPACOS_ID) {
    throw new Error(
      'Configure V1_ESPACOS_SHEET_ID em Script Properties antes de migrar. ' +
      'O valor está em Script Properties do V1 sob a chave SHEET_ID_ESPACOS.'
    );
  }

  var ss  = SpreadsheetApp.openById(V1_ESPACOS_ID);
  var aba = ss.getSheetByName('Itens');
  if (!aba) throw new Error('Aba "Itens" não encontrada na planilha V1 (' + V1_ESPACOS_ID + ').');

  var dados    = aba.getDataRange().getValues();
  var orgId    = getOrgConfig().orgId;
  var importados = 0;
  var ignorados  = 0;
  var erros      = [];

  // Linha 0 é cabeçalho
  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    var nome  = String(linha[1] || '').trim();
    if (!nome) { ignorados++; continue; }

    var item = {
      nome:            nome,
      categoria:       String(linha[2] || '').trim().toLowerCase() || 'geral',
      quantidadeTotal: Math.max(0, Number(linha[3]) || 0),
      localizacao:     String(linha[4] || '').trim(),
      descricao:       ''
    };

    try {
      AlmoxarifadoEngine.salvarItem(item, 'migracao_v1', orgId);
      importados++;
      Logger.info('migracao_itens_v1', 'migrar_itens_v1', 'Importado: ' + nome);
    } catch (e) {
      erros.push(nome + ': ' + e.message);
      ignorados++;
      Logger.warn('migracao_itens_v1', 'migrar_itens_v1', 'Erro em "' + nome + '": ' + e.message);
    }
  }

  if (erros.length > 0) {
    Logger.warn('migracao_itens_v1', 'migrar_itens_v1',
      'Erros (' + erros.length + '): ' + erros.join(' | '));
  }

  return { ok: true, importados: importados, ignorados: ignorados, erros: erros };
}
