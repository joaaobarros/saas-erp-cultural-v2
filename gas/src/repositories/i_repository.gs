/**
 * @file repositories/i_repository.gs
 * @layer repositories
 * @description Interface IRepository — contrato único de persistência para todos os domínios.
 *
 * REGRA ARQUITETURAL:
 *   Todo repositório de domínio implementa esta interface.
 *   orgId é OBRIGATÓRIO em toda operação — nenhum dado existe sem tenant.
 *   Engines nunca sabem se a fonte é JSON Drive ou Google Sheets.
 *
 * IMPLEMENTAÇÕES CONCRETAS:
 *   JsonDriveRepository  — fonte canônica para dados hierárquicos (tarefas, colaboradores, etc.)
 *   SheetsRepository     — fonte canônica para dados tabulares (reservas, chaves, contratos, etc.)
 *
 * USO (em engines):
 *   var tarefa = TarefaRepository.buscarPorId(orgId, tarefaId);
 *   TarefaRepository.salvar(orgId, tarefa);
 *
 * PADRÃO DE SINCRONIZAÇÃO (para JsonDriveRepository):
 *   salvar() → persiste em JSON → tenta sync no índice Sheet (falha silenciosa)
 *   A falha na Sheet nunca compromete o dado — JSON é a fonte de verdade.
 */

// ─── Interface contratual ─────────────────────────────────────────────────────
// Documentação dos métodos que todo repositório deve implementar.
// GAS não tem interfaces nativas — este arquivo serve como contrato documentado.

/**
 * @interface IRepository
 *
 * listar(orgId, filtros)         → Array<Entidade>
 * buscarPorId(orgId, id)         → Entidade | null
 * salvar(orgId, entidade)        → Entidade  (insert ou update — decide por presença de id)
 * excluir(orgId, id)             → boolean
 * indexar(orgId, entidade)       → void      (sync do índice Sheet — opcional, nunca lança)
 */

// ─── JsonDriveRepository (repositório base para fontes JSON) ─────────────────

/**
 * Fábrica de repositórios baseados em JSON Drive.
 * Elimina boilerplate nos repositórios concretos.
 *
 * @param {string} arquivoJson — ex: 'tarefas.json'
 * @param {Function} [fnIndexar] — função opcional de sync do índice Sheet
 */
function criarJsonRepository(arquivoJson, fnIndexar) {
  return {

    listar: function(orgId, filtros) {
      filtros = filtros || {};
      var lista = readJSON(arquivoJson).filter(function(e) {
        if (e.orgId && e.orgId !== orgId) return false;
        return Object.keys(filtros).every(function(k) {
          return filtros[k] === undefined || e[k] === filtros[k];
        });
      });
      return lista;
    },

    buscarPorId: function(orgId, id) {
      return readJSON(arquivoJson).find(function(e) {
        return e.id === id && (!e.orgId || e.orgId === orgId);
      }) || null;
    },

    salvar: function(orgId, entidade) {
      if (!entidade.id) entidade.id = gerarId(arquivoJson.replace('.json', ''));
      entidade.orgId       = orgId;
      entidade.atualizadoEm = agora();
      if (!entidade.criadoEm) entidade.criadoEm = agora();
      if (!entidade.versao)   entidade.versao    = 1;
      else                    entidade.versao     = (entidade.versao || 0) + 1;

      modifyJSON(arquivoJson, function(lista) {
        var idx = lista.findIndex(function(e) { return e.id === entidade.id && (!e.orgId || e.orgId === orgId); });
        if (idx >= 0) lista[idx] = entidade;
        else          lista.push(entidade);
        return lista;
      });

      if (typeof fnIndexar === 'function') {
        try { fnIndexar(orgId, entidade); } catch(e) {
          Logger.warn('i_repository', 'indexar', arquivoJson + ': ' + e.message);
        }
      }

      return entidade;
    },

    excluir: function(orgId, id) {
      var encontrado = false;
      modifyJSON(arquivoJson, function(lista) {
        var nova = lista.filter(function(e) {
          if (e.id === id && (!e.orgId || e.orgId === orgId)) {
            encontrado = true;
            return false;
          }
          return true;
        });
        return nova;
      });
      return encontrado;
    },

    indexar: typeof fnIndexar === 'function' ? fnIndexar : function() {}
  };
}

// ─── SheetsRepository (repositório base para fontes Sheet canônicas) ──────────

/**
 * Fábrica de repositórios baseados em Google Sheets (para domínios onde Sheet é canônica).
 *
 * @param {string} spreadsheetKey — chave PropertiesService (ex: 'SHEET_ID_ESPACOS')
 * @param {string} nomeAba        — nome da aba (usar ABA_PARA_MODULO)
 * @param {Object} mapeamentoColunas — { campo: indiceColuna } — ex: { id: 0, status: 3 }
 * @param {Function} [fnDeserializar] — converte linha em objeto
 * @param {Function} [fnSerializar]   — converte objeto em linha
 */
function criarSheetsRepository(spreadsheetKey, nomeAba, mapeamentoColunas, fnDeserializar, fnSerializar) {
  var colId    = mapeamentoColunas.id    !== undefined ? mapeamentoColunas.id    : 0;
  var colOrgId = mapeamentoColunas.orgId !== undefined ? mapeamentoColunas.orgId : 1;

  return {

    listar: function(orgId, filtros) {
      filtros = filtros || {};
      var linhas = DataGateway.obterTodos(spreadsheetKey, nomeAba);
      return linhas
        .filter(function(l) { return !orgId || String(l[colOrgId] || '') === String(orgId); })
        .map(function(l) { return fnDeserializar ? fnDeserializar(l) : l; })
        .filter(function(e) {
          return Object.keys(filtros).every(function(k) {
            return filtros[k] === undefined || e[k] === filtros[k];
          });
        });
    },

    buscarPorId: function(orgId, id) {
      var linha = DataGateway.buscarPorColuna(spreadsheetKey, nomeAba, colId, id);
      if (!linha) return null;
      if (orgId && String(linha[colOrgId] || '') !== String(orgId)) return null;
      return fnDeserializar ? fnDeserializar(linha) : linha;
    },

    salvar: function(orgId, entidade) {
      if (!entidade.id) entidade.id = gerarId(nomeAba.toLowerCase());
      entidade.orgId        = orgId;
      entidade.atualizadoEm = agora();
      if (!entidade.criadoEm) entidade.criadoEm = agora();

      var linha = fnSerializar ? fnSerializar(entidade) : entidade;
      var atualizado = DataGateway.atualizarLinhaPorColuna(spreadsheetKey, nomeAba, colId, entidade.id, linha);
      if (!atualizado) DataGateway.salvarLinha(spreadsheetKey, nomeAba, linha);
      return entidade;
    },

    excluir: function(orgId, id) {
      return DataGateway.removerLinhaPorColuna(spreadsheetKey, nomeAba, colId, id);
    },

    indexar: function() {}
  };
}
