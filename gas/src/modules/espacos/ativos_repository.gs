/**
 * @file modules/espacos/ativos_repository.gs
 * @layer modules/espacos
 * @description Repositório canônico de Ativos (Equipamentos/Patrimônio).
 *
 * Fonte de verdade: ESPACOS.Ativos (Sheet — tabular simples, visível à equipe)
 *   Cada ativo é uma linha na aba Ativos.
 *   Movimentações são registradas em ESPACOS.MovimentacoesAtivos (append-only).
 *   Baixas formais são registradas em ESPACOS.BaixasAtivos (append-only).
 *   Manutenções são registradas em ESPACOS.Manutencoes (append-only).
 *
 * Schema de cada Ativo:
 *   { id, orgId, nome, codigo, categoria, descricao, status,
 *     localizacao, responsavel, acaoId,
 *     valorAquisicao, dataAquisicao, fornecedor, notaFiscal, vidaUtilAnos,
 *     proximaManutencao, ultimaManutencao,
 *     criadoEm, atualizadoEm, criadoPor, versao }
 *
 * REGRA: nenhum outro módulo lê/escreve ESPACOS.Ativos diretamente.
 *
 * @depends core/services/data_gateway.gs (DataGateway)
 *          core/utils.gs (gerarId, agora, _getSheet)
 *          core/logger.gs (Logger)
 *          core/config.gs (getOrgConfig)
 */

var AtivoRepository = (function () {

  var _SHEET_KEY = 'SHEET_ID_ESPACOS';
  var _ABA       = 'Ativos';
  var _ABA_MOV   = 'MovimentacoesAtivos';
  var _ABA_BAIXA = 'BaixasAtivos';
  var _ABA_MANUT = 'Manutencoes';

  // Colunas da aba Ativos (posição 1-based — atenção ao indexar)
  var _HEADERS = [
    'ID', 'OrgId', 'Nome', 'Codigo', 'Categoria', 'Descricao',
    'Status', 'Localizacao', 'Responsavel', 'AcaoId',
    'ValorAquisicao', 'DataAquisicao', 'Fornecedor', 'NotaFiscal', 'VidaUtilAnos',
    'ProximaManutencao', 'UltimaManutencao',
    'CriadoEm', 'AtualizadoEm', 'CriadoPor', 'Versao'
  ];

  // Mapa coluna → índice 0-based
  var _COL = {};
  _HEADERS.forEach(function (h, i) { _COL[h] = i; });

  // ── Helpers internos ──────────────────────────────────────────────────

  function _orgId() { return getOrgConfig().orgId; }

  /** Deserializa uma linha da Sheet em objeto Ativo */
  function _linhaParaAtivo(row) {
    return {
      id:                 row[_COL.ID]               || '',
      orgId:              row[_COL.OrgId]             || '',
      nome:               row[_COL.Nome]              || '',
      codigo:             row[_COL.Codigo]            || '',
      categoria:          row[_COL.Categoria]         || 'outro',
      descricao:          row[_COL.Descricao]         || '',
      status:             row[_COL.Status]            || 'disponivel',
      localizacao:        row[_COL.Localizacao]       || '',
      responsavel:        row[_COL.Responsavel]       || '',
      acaoId:             row[_COL.AcaoId]            || '',
      valorAquisicao:     Number(row[_COL.ValorAquisicao] || 0),
      dataAquisicao:      row[_COL.DataAquisicao]     || '',
      fornecedor:         row[_COL.Fornecedor]        || '',
      notaFiscal:         row[_COL.NotaFiscal]        || '',
      vidaUtilAnos:       Number(row[_COL.VidaUtilAnos] || 0),
      proximaManutencao:  row[_COL.ProximaManutencao] || '',
      ultimaManutencao:   row[_COL.UltimaManutencao]  || '',
      criadoEm:           row[_COL.CriadoEm]          || '',
      atualizadoEm:       row[_COL.AtualizadoEm]      || '',
      criadoPor:          row[_COL.CriadoPor]         || '',
      versao:             Number(row[_COL.Versao] || 1)
    };
  }

  /** Serializa um objeto Ativo em linha da Sheet */
  function _ativoParaLinha(a) {
    return [
      a.id               || '',
      a.orgId            || '',
      a.nome             || '',
      a.codigo           || '',
      a.categoria        || 'outro',
      a.descricao        || '',
      a.status           || 'disponivel',
      a.localizacao      || '',
      a.responsavel      || '',
      a.acaoId           || '',
      a.valorAquisicao   || 0,
      a.dataAquisicao    || '',
      a.fornecedor       || '',
      a.notaFiscal       || '',
      a.vidaUtilAnos     || 0,
      a.proximaManutencao|| '',
      a.ultimaManutencao || '',
      a.criadoEm         || '',
      a.atualizadoEm     || '',
      a.criadoPor        || '',
      a.versao           || 1
    ];
  }

  /** Obtém a aba Ativos (cria cabeçalho se vazia) */
  function _aba() {
    return DataGateway.obterAba(_SHEET_KEY, _ABA);
  }

  /** Lê TODAS as linhas de dados (exceto cabeçalho) como objetos */
  function _todosAtivos(orgId) {
    try {
      var aba = _aba();
      if (!aba) return [];
      var lastRow = aba.getLastRow();
      if (lastRow < 2) return [];
      var dados = aba.getRange(2, 1, lastRow - 1, _HEADERS.length).getValues();
      return dados
        .filter(function (r) { return r[_COL.ID] && r[_COL.OrgId] === (orgId || _orgId()); })
        .map(_linhaParaAtivo);
    } catch (e) {
      Logger.warn('ativos_repository', '_todosAtivos', e.message);
      return [];
    }
  }

  /** Localiza a linha (1-based) de um ativo pelo ID */
  function _encontrarLinha(id, orgId) {
    try {
      var aba = _aba();
      if (!aba) return -1;
      var lastRow = aba.getLastRow();
      if (lastRow < 2) return -1;
      var ids    = aba.getRange(2, _COL.ID + 1,    lastRow - 1, 1).getValues();
      var orgIds = aba.getRange(2, _COL.OrgId + 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (ids[i][0] === id && orgIds[i][0] === (orgId || _orgId())) return i + 2;
      }
      return -1;
    } catch (e) {
      Logger.warn('ativos_repository', '_encontrarLinha', e.message);
      return -1;
    }
  }

  // ── Índice (cabeçalho + proteção) ─────────────────────────────────────

  function prepararIndice() {
    try {
      var aba = DataGateway.obterAba(_SHEET_KEY, _ABA);
      if (!aba) return { ok: false, erro: 'Aba Ativos não encontrada.' };

      var primeiraLinha = aba.getLastRow() > 0
        ? aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), _HEADERS.length)).getValues()[0]
        : [];
      var semCabecalho = primeiraLinha.every(function (v) { return !v; })
                      || String(primeiraLinha[0] || '').trim() !== 'ID';

      if (semCabecalho) {
        aba.getRange(1, 1, 1, _HEADERS.length).setValues([_HEADERS]);
        aba.setFrozenRows(1);
        Logger.info('ativos_repository', 'prepararIndice', 'Cabeçalho criado em ESPACOS.Ativos');
      }

      // Também garante cabeçalhos nas abas auxiliares
      _garantirAbaAuxiliar(_ABA_MOV, [
        'ID', 'AtivoId', 'OrgId', 'Tipo', 'StatusAnterior', 'StatusNovo',
        'Ator', 'Motivo', 'AcaoId', 'DataHora'
      ]);
      _garantirAbaAuxiliar(_ABA_BAIXA, [
        'ID', 'AtivoId', 'OrgId', 'MotivoBaixa', 'ValorResidual',
        'Destinacao', 'Ator', 'DataBaixa'
      ]);
      _garantirAbaAuxiliar(_ABA_MANUT, [
        'ID', 'AtivoId', 'OrgId', 'Tipo', 'Descricao', 'Custo',
        'Fornecedor', 'DataInicio', 'DataFim', 'Status', 'Ator'
      ]);

      return { ok: true };
    } catch (e) {
      Logger.error('ativos_repository', 'prepararIndice', e.message);
      return { ok: false, erro: e.message };
    }
  }

  function _garantirAbaAuxiliar(nomeAba, headers) {
    try {
      var aba = DataGateway.obterAba(_SHEET_KEY, nomeAba);
      if (!aba) return;
      var primeira = aba.getLastRow() > 0
        ? aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), headers.length)).getValues()[0]
        : [];
      var semCab = primeira.every(function (v) { return !v; })
                || String(primeira[0] || '').trim() !== headers[0];
      if (semCab) {
        aba.getRange(1, 1, 1, headers.length).setValues([headers]);
        aba.setFrozenRows(1);
      }
    } catch (_) {}
  }

  // ── CRUD principal ─────────────────────────────────────────────────────

  /**
   * Lista ativos com filtros opcionais.
   * @param {Object} filtros — { status, categoria, localizacao }
   * @param {string} orgId
   */
  function listar(filtros, orgId) {
    var lista = _todosAtivos(orgId);
    filtros = filtros || {};
    if (filtros.status    ) lista = lista.filter(function (a) { return a.status    === filtros.status; });
    if (filtros.categoria ) lista = lista.filter(function (a) { return a.categoria === filtros.categoria; });
    if (filtros.localizacao) lista = lista.filter(function (a) { return a.localizacao === filtros.localizacao; });
    return lista;
  }

  /**
   * Busca ativo pelo ID.
   * @param {string} id
   * @param {string} orgId
   * @returns {Object|null}
   */
  function buscarPorId(id, orgId) {
    var lista = _todosAtivos(orgId);
    return lista.find(function (a) { return a.id === id; }) || null;
  }

  /**
   * Insere um novo ativo na Sheet.
   * @param {Object} dados — campos do ativo (sem id/criadoEm/etc.)
   * @param {string} orgId
   * @param {string} autor — email do criador
   * @returns {Object} ativo criado
   */
  function criar(dados, orgId, autor) {
    var aba = _aba();
    if (!aba) throw new Error('Aba ESPACOS.Ativos não encontrada.');

    var agora_ = agora();
    var ativo = {
      id:               gerarId('ativo'),
      orgId:            orgId || _orgId(),
      nome:             dados.nome             || '',
      codigo:           dados.codigo           || '',
      categoria:        dados.categoria        || 'outro',
      descricao:        dados.descricao        || '',
      status:           dados.status           || 'disponivel',
      localizacao:      dados.localizacao      || '',
      responsavel:      dados.responsavel      || '',
      acaoId:           dados.acaoId           || '',
      valorAquisicao:   Number(dados.valorAquisicao || 0),
      dataAquisicao:    dados.dataAquisicao    || '',
      fornecedor:       dados.fornecedor       || '',
      notaFiscal:       dados.notaFiscal       || '',
      vidaUtilAnos:     Number(dados.vidaUtilAnos || 0),
      proximaManutencao:dados.proximaManutencao|| '',
      ultimaManutencao: dados.ultimaManutencao || '',
      criadoEm:         agora_,
      atualizadoEm:     agora_,
      criadoPor:        autor || '',
      versao:           1
    };

    aba.appendRow(_ativoParaLinha(ativo));
    return ativo;
  }

  /**
   * Atualiza um ativo existente (por ID).
   * @param {string} id
   * @param {Object} dados — campos a atualizar
   * @param {string} orgId
   * @returns {Object} ativo atualizado
   */
  function atualizar(id, dados, orgId) {
    var linha = _encontrarLinha(id, orgId);
    if (linha === -1) throw new Error('Ativo não encontrado: ' + id);

    var aba = _aba();
    var rowAtual = aba.getRange(linha, 1, 1, _HEADERS.length).getValues()[0];
    var ativoAtual = _linhaParaAtivo(rowAtual);

    var ativoAtualizado = {
      id:               ativoAtual.id,
      orgId:            ativoAtual.orgId,
      nome:             dados.nome             !== undefined ? dados.nome             : ativoAtual.nome,
      codigo:           dados.codigo           !== undefined ? dados.codigo           : ativoAtual.codigo,
      categoria:        dados.categoria        !== undefined ? dados.categoria        : ativoAtual.categoria,
      descricao:        dados.descricao        !== undefined ? dados.descricao        : ativoAtual.descricao,
      status:           dados.status           !== undefined ? dados.status           : ativoAtual.status,
      localizacao:      dados.localizacao      !== undefined ? dados.localizacao      : ativoAtual.localizacao,
      responsavel:      dados.responsavel      !== undefined ? dados.responsavel      : ativoAtual.responsavel,
      acaoId:           dados.acaoId           !== undefined ? dados.acaoId           : ativoAtual.acaoId,
      valorAquisicao:   dados.valorAquisicao   !== undefined ? Number(dados.valorAquisicao) : ativoAtual.valorAquisicao,
      dataAquisicao:    dados.dataAquisicao    !== undefined ? dados.dataAquisicao    : ativoAtual.dataAquisicao,
      fornecedor:       dados.fornecedor       !== undefined ? dados.fornecedor       : ativoAtual.fornecedor,
      notaFiscal:       dados.notaFiscal       !== undefined ? dados.notaFiscal       : ativoAtual.notaFiscal,
      vidaUtilAnos:     dados.vidaUtilAnos     !== undefined ? Number(dados.vidaUtilAnos) : ativoAtual.vidaUtilAnos,
      proximaManutencao:dados.proximaManutencao!== undefined ? dados.proximaManutencao: ativoAtual.proximaManutencao,
      ultimaManutencao: dados.ultimaManutencao !== undefined ? dados.ultimaManutencao : ativoAtual.ultimaManutencao,
      criadoEm:         ativoAtual.criadoEm,
      atualizadoEm:     agora(),
      criadoPor:        ativoAtual.criadoPor,
      versao:           ativoAtual.versao + 1
    };

    aba.getRange(linha, 1, 1, _HEADERS.length).setValues([_ativoParaLinha(ativoAtualizado)]);
    return ativoAtualizado;
  }

  /**
   * Registra uma movimentação de status na aba MovimentacoesAtivos (append-only).
   * @param {string} ativoId
   * @param {string} tipo — 'transicao' | 'emprestimo' | 'devolucao' | 'manutencao' | 'baixa'
   * @param {string} statusAnterior
   * @param {string} statusNovo
   * @param {string} ator
   * @param {string} motivo
   * @param {string} orgId
   */
  function registrarMovimentacao(ativoId, tipo, statusAnterior, statusNovo, ator, motivo, orgId) {
    try {
      var aba = DataGateway.obterAba(_SHEET_KEY, _ABA_MOV);
      if (!aba) return;
      aba.appendRow([
        gerarId('mov'),
        ativoId,
        orgId || _orgId(),
        tipo || 'transicao',
        statusAnterior || '',
        statusNovo || '',
        ator || '',
        motivo || '',
        '',       // acaoId — preenchido quando aplicável
        agora()
      ]);
    } catch (e) {
      Logger.warn('ativos_repository', 'registrarMovimentacao', e.message);
    }
  }

  /**
   * Métricas agregadas de ativos.
   * @param {string} orgId
   * @returns {Object}
   */
  function metricas(orgId) {
    var lista = _todosAtivos(orgId);
    return {
      total:       lista.length,
      disponivel:  lista.filter(function (a) { return a.status === 'disponivel'; }).length,
      reservado:   lista.filter(function (a) { return a.status === 'reservado'; }).length,
      em_uso:      lista.filter(function (a) { return a.status === 'em_uso'; }).length,
      manutencao:  lista.filter(function (a) { return a.status === 'manutencao'; }).length,
      baixado:     lista.filter(function (a) { return a.status === 'baixado'; }).length
    };
  }

  // ── Script de inicialização (GAS Editor) ───────────────────────────────

  /**
   * Executar no GAS Editor antes de usar o módulo.
   * Garante cabeçalhos nas abas ESPACOS de ativos.
   */
  function fase1_ativos_prepararIndice() {
    return prepararIndice();
  }

  // ── Pública ───────────────────────────────────────────────────────────

  return {
    prepararIndice:       prepararIndice,
    listar:               listar,
    buscarPorId:          buscarPorId,
    criar:                criar,
    atualizar:            atualizar,
    registrarMovimentacao:registrarMovimentacao,
    metricas:             metricas
  };

})();

// ── Função global (executável diretamente no GAS Editor) ─────────────────────
function fase1_ativos_prepararIndice() {
  return AtivoRepository.prepararIndice();
}
