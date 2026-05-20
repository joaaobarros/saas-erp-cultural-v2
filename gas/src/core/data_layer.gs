/**
 * @file core/data_layer.gs
 * @layer core
 * @description Camada de persistência em arquivos JSON no Google Drive.
 *
 * JSON é a fonte de verdade para dados com estrutura hierárquica.
 * Sheets são índices sincronizados (leitura rápida), nunca fonte primária para esses domínios.
 *
 * SEGURANÇA:
 *   - readJSON: retorna [] em caso de corrupção SEM sobrescrever (preserva para diagnóstico)
 *   - modifyJSON: lança exceção em corrupção — impede escrita sobre dado inválido
 *   - writeJSON/modifyJSON: sempre sob LockService (sem race condition)
 *
 * USO:
 *   var tarefas = readJSON('tarefas.json');
 *   modifyJSON('tarefas.json', function(lista) { lista.push(novaTarefa); return lista; });
 */

var _dataFolderCache = null;

/**
 * Localiza a pasta de dados da organização no Drive.
 * Usa ID em PropertiesService para acesso direto; fallback para busca por nome.
 */
function getDataFolder() {
  if (_dataFolderCache) return _dataFolderCache;

  var props      = PropertiesService.getScriptProperties();
  var folderId   = props.getProperty('FOLDER_ID_DATA');
  var folderNome = getOrgConfig().dataFolder;

  if (folderId) {
    try {
      _dataFolderCache = DriveApp.getFolderById(folderId);
      return _dataFolderCache;
    } catch (e) {
      Logger.warn('data_layer', 'getDataFolder', 'ID de pasta inválido, re-registrando.');
    }
  }

  var iter   = DriveApp.getFoldersByName(folderNome);
  var folder = iter.hasNext() ? iter.next() : DriveApp.createFolder(folderNome);
  props.setProperty('FOLDER_ID_DATA', folder.getId());
  _dataFolderCache = folder;
  Logger.info('data_layer', 'getDataFolder', 'Pasta registrada: ' + folder.getId());
  return folder;
}

/**
 * Localiza ou cria um arquivo JSON dentro da pasta de dados.
 */
function getFile(nome) {
  var pasta    = getDataFolder();
  var arquivos = pasta.getFilesByName(nome);
  if (arquivos.hasNext()) return arquivos.next();
  Logger.info('data_layer', 'getFile', 'Criando arquivo: ' + nome);
  return pasta.createFile(nome, JSON.stringify([]));
}

/**
 * Lê e parseia arquivo JSON. Retorna [] em caso de corrupção sem sobrescrever.
 * @param {string} nome — ex: 'tarefas.json'
 * @returns {Array}
 */
function readJSON(nome) {
  try {
    var conteudo = getFile(nome).getBlob().getDataAsString();
    return JSON.parse(conteudo || '[]');
  } catch (e) {
    Logger.error('data_layer', 'readJSON', 'Falha em "' + nome + '": ' + e.message);
    return [];
  }
}

/**
 * Serializa e salva dado JSON sob lock exclusivo.
 * Para escritas simples onde o chamador já preparou o dado completo.
 */
function writeJSON(nome, data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    getFile(nome).setContent(JSON.stringify(data));
  } catch (e) {
    Logger.error('data_layer', 'writeJSON', 'Falha em "' + nome + '": ' + e.message);
    throw new Error('Falha ao salvar dados: ' + nome);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Operação atômica: lê → modifica → salva sob o mesmo lock.
 * OBRIGATÓRIO para qualquer read-modify-write (evita race condition).
 *
 * @param {string}   nome — nome do arquivo JSON
 * @param {Function} fn   — recebe array atual, retorna array modificado
 * @returns resultado retornado por fn
 * @throws se arquivo corrompido ou fn lançar exceção
 */
function modifyJSON(nome, fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var arquivo  = getFile(nome);
    var conteudo = arquivo.getBlob().getDataAsString();
    var lista    = JSON.parse(conteudo || '[]');
    var resultado = fn(lista);
    arquivo.setContent(JSON.stringify(resultado !== undefined ? resultado : lista));
    return resultado;
  } catch (e) {
    Logger.error('data_layer', 'modifyJSON', 'Falha em "' + nome + '": ' + e.message);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Lê arquivo JSON e retorna mapa indexado por 'id'.
 */
function readJSONAsMap(nome) {
  var lista = readJSON(nome);
  return lista.reduce(function(map, item) {
    if (item && item.id) map[item.id] = item;
    return map;
  }, {});
}

/**
 * Invalida cache da pasta de dados (útil em testes ou após mudança de PropertiesService).
 */
function invalidarCacheDataFolder() {
  _dataFolderCache = null;
}
