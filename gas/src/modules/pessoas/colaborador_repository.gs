/**
 * @file modules/pessoas/colaborador_repository.gs
 * @layer modules/pessoas
 * @description Repositório canônico de Colaboradores.
 *
 * Fonte de verdade: colaboradores.json (Drive)
 * Índice auxiliar: EQUIPES.Funcionarios (Sheet — somente leitura operacional)
 *
 * Sub-coleções (JSONs separados com referência por idColaborador):
 *   ferias.json, escalas.json, avaliacoes.json, historico_rh.json
 *
 * REGRA: nenhum outro módulo lê/escreve esses arquivos diretamente.
 * Todo acesso passa por ColaboradorRepository ou PessoasEngine.
 *
 * @depends core/data_layer.gs (lerJSON, salvarJSON, modifyJSON)
 *          core/services/data_gateway.gs (DataGateway)
 *          core/logger.gs (Logger)
 *          core/config.gs (getOrgConfig)
 */

var ColaboradorRepository = (function () {

  // ── Constantes ────────────────────────────────────────────────────

  var _ARQUIVO_COLABORADORES = 'colaboradores.json';
  var _ARQUIVO_FERIAS        = 'ferias.json';
  var _ARQUIVO_ESCALAS       = 'escalas.json';
  var _ARQUIVO_AVALIACOES    = 'avaliacoes.json';
  var _ARQUIVO_HISTORICO     = 'historico_rh.json';
  var _ARQUIVO_AFASTAMENTOS  = 'afastamentos.json';
  var _ARQUIVO_OCORRENCIAS   = 'ocorrencias.json';

  var _SHEET_KEY = 'SHEET_ID_EQUIPES';
  var _ABA       = 'Funcionarios';

  var _HEADERS = [
    'ID', 'OrgId', 'Nome', 'EmailInstitucional', 'EmailPessoal',
    'Setor', 'Cargo', 'Status', 'TipoVinculo', 'DataAdmissao',
    'DataNascimento', 'CriadoEm', 'AtualizadoEm', 'CPF_Mascarado', 'Funcoes', 'Ativo'
  ];

  // ── Helpers internos ──────────────────────────────────────────────

  function _orgIdPadrao(orgId) {
    return orgId || getOrgConfig().orgId;
  }

  function _agora() {
    return new Date().toISOString();
  }

  function _mascaraCPF(cpf) {
    if (!cpf) return '';
    var s = String(cpf).replace(/\D/g, '');
    if (s.length !== 11) return '***';
    return s.slice(0, 3) + '.***.***-' + s.slice(9);
  }

  // ── Índice Sheet ──────────────────────────────────────────────────

  function _garantirCabecalhoIndice() {
    try {
      var aba = DataGateway.obterAba(_SHEET_KEY, _ABA);
      if (!aba) return;
      var atual = aba.getLastRow() > 0
        ? aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), _HEADERS.length)).getValues()[0]
        : [];
      var vazio = atual.every(function (v) { return !v; });
      if (vazio || String(atual[0] || '').trim() !== 'ID') {
        aba.getRange(1, 1, 1, _HEADERS.length).setValues([_HEADERS]);
        aba.setFrozenRows(1);
      }
    } catch (e) {
      Logger.warn('colaborador_repository', '_garantirCabecalhoIndice', e.message);
    }
  }

  function _serializarIndice(c) {
    var funcoes = Array.isArray(c.funcoes)
      ? c.funcoes.map(function (f) { return f.tipo || f; }).join(',')
      : (c.funcoes || '');
    return [
      c.id               || '',
      c.orgId            || '',
      c.nome             || '',
      c.emailInstitucional || '',
      c.emailPessoal     || '',
      c.setor            || '',
      c.cargo            || '',
      c.status           || '',
      c.tipoVinculo      || '',
      c.dataAdmissao     || '',
      c.dataNascimento   || '',
      c.criadoEm         || '',
      c.atualizadoEm     || '',
      _mascaraCPF(c.cpf),
      funcoes,
      c.ativo !== false ? 'Sim' : 'Não'
    ];
  }

  function _indexar(orgId, colaborador) {
    try {
      _garantirCabecalhoIndice();
      var linha = _serializarIndice(colaborador);
      var atualizado = DataGateway.atualizarLinhaPorColuna(
        _SHEET_KEY, _ABA, 0, colaborador.id, linha
      );
      if (!atualizado) DataGateway.salvarLinha(_SHEET_KEY, _ABA, linha);
    } catch (e) {
      Logger.warn('colaborador_repository', '_indexar', 'Falha índice: ' + e.message);
    }
  }

  function _removerDoIndice(id) {
    try {
      DataGateway.removerLinhaPorColuna(_SHEET_KEY, _ABA, 0, id);
    } catch (e) {
      Logger.warn('colaborador_repository', '_removerDoIndice', e.message);
    }
  }

  // ── Colaboradores (CRUD) ──────────────────────────────────────────

  function listar(orgId, filtros) {
    orgId   = _orgIdPadrao(orgId);
    filtros = filtros || {};
    var todos = lerJSON(_ARQUIVO_COLABORADORES) || [];
    var lista = todos.filter(function (c) {
      if (c.orgId && c.orgId !== orgId) return false;
      if (filtros.excluirDesligado && c.status === 'desligado') return false;
      if (filtros.status  && c.status  && c.status !== filtros.status)  return false;
      if (filtros.setor   && c.setor   !== filtros.setor)   return false;
      if (filtros.cargo   && c.cargo   !== filtros.cargo)   return false;
      if (filtros.ativo !== undefined && c.ativo !== filtros.ativo) return false;
      return true;
    });
    return lista.sort(function (a, b) {
      return (a.nome || '').localeCompare(b.nome || '');
    });
  }

  function buscarPorId(orgId, id) {
    orgId = _orgIdPadrao(orgId);
    var todos = lerJSON(_ARQUIVO_COLABORADORES) || [];
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].id === id && (todos[i].orgId === orgId || !todos[i].orgId)) {
        return todos[i];
      }
    }
    return null;
  }

  function buscarPorEmail(orgId, email) {
    if (!email) return null;
    orgId = _orgIdPadrao(orgId);
    email = String(email).toLowerCase().trim();
    var todos = lerJSON(_ARQUIVO_COLABORADORES) || [];
    for (var i = 0; i < todos.length; i++) {
      var c = todos[i];
      if (c.orgId && c.orgId !== orgId) continue;
      var eInst = String(c.emailInstitucional || '').toLowerCase().trim();
      var ePess = String(c.emailPessoal || c.email || '').toLowerCase().trim();
      if (eInst === email || ePess === email) return c;
    }
    return null;
  }

  function salvar(orgId, dados) {
    orgId = _orgIdPadrao(orgId);
    dados = dados || {};
    dados.orgId = orgId;

    var agr = _agora();
    var isNovo = !dados.id;

    if (isNovo) {
      dados.id       = 'col_' + Date.now();
      dados.criadoEm = agr;
      if (dados.ativo === undefined) dados.ativo = true;
      if (!dados.status) dados.status = 'ativo';
    }
    dados.atualizadoEm = agr;

    // Nunca persistir CPF em claro no índice; o campo cpf fica em colaboradores.json
    modifyJSON(_ARQUIVO_COLABORADORES, function (lista) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === dados.id) { idx = i; break; }
      }
      if (idx >= 0) {
        var prev = lista[idx];
        // Campos opcionais que jamais devem ser apagados por um form enviando string vazia.
        // O valor '' ou [] enviado pelo formulário é tratado como "não informado" quando
        // prev tem conteúdo — previne perda acidental de dados pessoais/profissionais.
        // Para apagar intencionalmente um campo, use null (sentinel explícito).
        var _CAMPOS_PROTEGIDOS = [
          'nomeApelido','pronomes','emailPessoal','dataNascimento','numRegistro','pis',
          'genero','sexualidade','racaCor','telefone','contatoEmergencia',
          'tipoSanguineo','alergias','observacoesPessoais','restricoesAlimentares',
          'restricoesOutro','endereco','funcoes','substituicoes','cpf',
          'salarioBruto','salario','fotoPerfil','beneficios',
          'pcd','pcdTipos','pcdSuporte','pcdSuporteDescricao'
        ];
        Object.keys(prev).forEach(function(k) {
          if (dados[k] === undefined) {
            dados[k] = prev[k];
          } else if (_CAMPOS_PROTEGIDOS.indexOf(k) !== -1 && dados[k] !== null) {
            var eVazio = dados[k] === '' ||
              (Array.isArray(dados[k]) && dados[k].length === 0) ||
              (dados[k] && typeof dados[k] === 'object' && !Array.isArray(dados[k]) &&
               Object.keys(dados[k]).every(function(sk){ return !dados[k][sk]; }));
            var prevTemDado = prev[k] !== '' && prev[k] !== null && prev[k] !== undefined &&
              !(Array.isArray(prev[k]) && prev[k].length === 0);
            if (eVazio && prevTemDado) dados[k] = prev[k];
          }
        });
        if (dados.status === undefined || dados.status === null) dados.status = prev.status || 'ativo';
        if (dados.ativo  === undefined) dados.ativo = prev.ativo !== false;
        if (!dados.criadoEm) dados.criadoEm = prev.criadoEm;
        lista[idx] = dados;
      } else {
        lista.push(dados);
      }
      return lista;
    });

    _indexar(orgId, dados);
    return { id: dados.id, isNovo: isNovo };
  }

  function excluir(orgId, id) {
    orgId = _orgIdPadrao(orgId);
    modifyJSON(_ARQUIVO_COLABORADORES, function (lista) {
      return lista.filter(function (c) { return c.id !== id || c.orgId !== orgId; });
    });
    _removerDoIndice(id);
    return true;
  }

  // ── Férias ────────────────────────────────────────────────────────

  function listarFerias(filtros) {
    var todos = lerJSON(_ARQUIVO_FERIAS) || [];
    filtros = filtros || {};
    return todos.filter(function (f) {
      if (filtros.orgId && f.orgId !== filtros.orgId) return false;
      if (filtros.idColaborador && f.idColaborador !== filtros.idColaborador) return false;
      if (filtros.status && f.status !== filtros.status) return false;
      return true;
    });
  }

  function buscarFeriasPorId(id) {
    var todos = lerJSON(_ARQUIVO_FERIAS) || [];
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].id === id) return todos[i];
    }
    return null;
  }

  function salvarFerias(dados) {
    dados = dados || {};
    var isNovo = !dados.id;
    var agr    = _agora();
    if (isNovo) {
      dados.id       = 'fer_' + Date.now();
      dados.criadoEm = agr;
      if (!dados.status) dados.status = 'pendente';
    }
    dados.atualizadoEm = agr;
    modifyJSON(_ARQUIVO_FERIAS, function (lista) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === dados.id) { idx = i; break; }
      }
      if (idx >= 0) lista[idx] = dados; else lista.push(dados);
      return lista;
    });
    return { id: dados.id, isNovo: isNovo };
  }

  // ── Escalas ───────────────────────────────────────────────────────

  function listarEscalas(filtros) {
    var todos = lerJSON(_ARQUIVO_ESCALAS) || [];
    filtros = filtros || {};
    return todos.filter(function (e) {
      if (filtros.orgId && e.orgId !== filtros.orgId) return false;
      if (filtros.idColaborador && e.idColaborador !== filtros.idColaborador) return false;
      if (filtros.setor && e.setor !== filtros.setor) return false;
      return true;
    });
  }

  function salvarEscala(dados) {
    dados = dados || {};
    var isNovo = !dados.id;
    var agr    = _agora();
    if (isNovo) {
      dados.id       = 'esc_' + Date.now();
      dados.criadoEm = agr;
    }
    dados.atualizadoEm = agr;
    modifyJSON(_ARQUIVO_ESCALAS, function (lista) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === dados.id) { idx = i; break; }
      }
      if (idx >= 0) lista[idx] = dados; else lista.push(dados);
      return lista;
    });
    return { id: dados.id, isNovo: isNovo };
  }

  function excluirEscala(id) {
    modifyJSON(_ARQUIVO_ESCALAS, function (lista) {
      return lista.filter(function (e) { return e.id !== id; });
    });
    return true;
  }

  // ── Avaliações ────────────────────────────────────────────────────

  function listarAvaliacoes(filtros) {
    var todos = lerJSON(_ARQUIVO_AVALIACOES) || [];
    filtros = filtros || {};
    return todos.filter(function (a) {
      if (filtros.orgId && a.orgId !== filtros.orgId) return false;
      if (filtros.idColaborador && a.idColaborador !== filtros.idColaborador) return false;
      return true;
    });
  }

  function salvarAvaliacao(dados) {
    dados = dados || {};
    var isNovo = !dados.id;
    var agr    = _agora();
    if (isNovo) {
      dados.id       = 'aval_' + Date.now();
      dados.criadoEm = agr;
    }
    dados.atualizadoEm = agr;
    modifyJSON(_ARQUIVO_AVALIACOES, function (lista) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === dados.id) { idx = i; break; }
      }
      if (idx >= 0) lista[idx] = dados; else lista.push(dados);
      return lista;
    });
    return { id: dados.id, isNovo: isNovo };
  }

  function excluirAvaliacao(id) {
    modifyJSON(_ARQUIVO_AVALIACOES, function (lista) {
      return lista.filter(function (a) { return a.id !== id; });
    });
    return true;
  }

  // ── Histórico RH ─────────────────────────────────────────────────

  function listarHistorico(filtros) {
    var todos = lerJSON(_ARQUIVO_HISTORICO) || [];
    filtros = filtros || {};
    return todos.filter(function (h) {
      if (filtros.orgId && h.orgId !== filtros.orgId) return false;
      if (filtros.idColaborador && h.idColaborador !== filtros.idColaborador) return false;
      if (filtros.tipo && h.tipo !== filtros.tipo) return false;
      return true;
    }).sort(function (a, b) {
      return String(b.criadoEm || '').localeCompare(String(a.criadoEm || ''));
    });
  }

  function salvarHistorico(dados) {
    dados = dados || {};
    var isNovo = !dados.id;
    var agr    = _agora();
    if (isNovo) {
      dados.id       = 'hrh_' + Date.now();
      dados.criadoEm = agr;
    }
    dados.atualizadoEm = agr;
    modifyJSON(_ARQUIVO_HISTORICO, function (lista) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === dados.id) { idx = i; break; }
      }
      if (idx >= 0) lista[idx] = dados; else lista.push(dados);
      return lista;
    });
    return { id: dados.id, isNovo: isNovo };
  }

  function excluirHistorico(id) {
    modifyJSON(_ARQUIVO_HISTORICO, function (lista) {
      return lista.filter(function (h) { return h.id !== id; });
    });
    return true;
  }

  // ── Afastamentos ─────────────────────────────────────────────────

  function listarAfastamentos(filtros) {
    var todos = lerJSON(_ARQUIVO_AFASTAMENTOS) || [];
    filtros = filtros || {};
    return todos.filter(function (a) {
      if (filtros.orgId          && a.orgId          !== filtros.orgId)          return false;
      if (filtros.idColaborador  && a.idColaborador  !== filtros.idColaborador)  return false;
      if (filtros.status         && a.status         !== filtros.status)         return false;
      if (filtros.tipo           && a.tipo           !== filtros.tipo)           return false;
      return true;
    }).sort(function (a, b) {
      return String(b.criadoEm || '').localeCompare(String(a.criadoEm || ''));
    });
  }

  function buscarAfastamentoPorId(id) {
    var todos = lerJSON(_ARQUIVO_AFASTAMENTOS) || [];
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].id === id) return todos[i];
    }
    return null;
  }

  function salvarAfastamento(dados) {
    dados = dados || {};
    var isNovo = !dados.id;
    var agr    = _agora();
    if (isNovo) {
      dados.id       = 'afa_' + Date.now();
      dados.criadoEm = agr;
      if (!dados.status) dados.status = 'rascunho';
    }
    dados.atualizadoEm = agr;
    modifyJSON(_ARQUIVO_AFASTAMENTOS, function (lista) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === dados.id) { idx = i; break; }
      }
      if (idx >= 0) lista[idx] = dados; else lista.push(dados);
      return lista;
    });
    return { id: dados.id, isNovo: isNovo };
  }

  function excluirAfastamento(id) {
    modifyJSON(_ARQUIVO_AFASTAMENTOS, function (lista) {
      return lista.filter(function (a) { return a.id !== id; });
    });
    return true;
  }

  // ── Ocorrências ───────────────────────────────────────────────────

  function listarOcorrencias(filtros) {
    var todos = lerJSON(_ARQUIVO_OCORRENCIAS) || [];
    filtros = filtros || {};
    return todos.filter(function (o) {
      if (filtros.orgId         && o.orgId         !== filtros.orgId)         return false;
      if (filtros.idColaborador && o.idColaborador !== filtros.idColaborador) return false;
      if (filtros.tipo          && o.tipo          !== filtros.tipo)          return false;
      return true;
    }).sort(function (a, b) {
      return String(b.criadoEm || '').localeCompare(String(a.criadoEm || ''));
    });
  }

  function salvarOcorrencia(dados) {
    dados = dados || {};
    var isNovo = !dados.id;
    var agr    = _agora();
    if (isNovo) {
      dados.id       = 'oco_' + Date.now();
      dados.criadoEm = agr;
    }
    dados.atualizadoEm = agr;
    modifyJSON(_ARQUIVO_OCORRENCIAS, function (lista) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === dados.id) { idx = i; break; }
      }
      if (idx >= 0) lista[idx] = dados; else lista.push(dados);
      return lista;
    });
    return { id: dados.id, isNovo: isNovo };
  }

  function excluirOcorrencia(id) {
    modifyJSON(_ARQUIVO_OCORRENCIAS, function (lista) {
      return lista.filter(function (o) { return o.id !== id; });
    });
    return true;
  }

  // ── Manutenção do índice ──────────────────────────────────────────

  function protegerIndice() {
    try {
      _garantirCabecalhoIndice();
      var aba = DataGateway.obterAba(_SHEET_KEY, _ABA);
      if (!aba) return { ok: false, mensagem: 'Aba EQUIPES.Funcionarios não localizada.' };
      var protecoes = aba.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      var existente = protecoes.some(function (p) {
        return p.getDescription && p.getDescription() === 'Indice read-only: colaboradores.json e a fonte canonica';
      });
      if (!existente) {
        var p = aba.protect().setDescription('Indice read-only: colaboradores.json e a fonte canonica');
        p.setWarningOnly(true);
      }
      return { ok: true, mensagem: 'Índice EQUIPES.Funcionarios marcado como somente leitura operacional.' };
    } catch (e) {
      Logger.warn('colaborador_repository', 'protegerIndice', e.message);
      return { ok: false, mensagem: e.message };
    }
  }

  /**
   * Migração: funde funcionarios.json (legado) + EQUIPES.Funcionarios (Sheet)
   * em colaboradores.json. Idempotente: não duplica por id.
   */
  function migrarFuncionariosParaColaboradores(orgId) {
    orgId = _orgIdPadrao(orgId);
    var importados = 0;
    var ignorados  = 0;

    var legadoJson = lerJSON('funcionarios.json') || [];
    legadoJson.forEach(function (f) {
      var idLeg = f.id || ('col_legacy_' + Date.now() + '_' + Math.random());
      var existente = buscarPorId(orgId, idLeg);
      if (existente) { ignorados++; return; }
      var colab = {
        id:                 idLeg,
        orgId:              orgId,
        nome:               f.nome || '',
        emailInstitucional: f.email_institucional || f.emailInstitucional || '',
        emailPessoal:       f.email_pessoal       || f.emailPessoal       || f.email || '',
        cpf:                f.cpf                 || '',
        setor:              f.setor               || '',
        cargo:              f.cargo               || f.funcao             || '',
        tipoVinculo:        f.tipoVinculo         || f.tipo_vinculo       || 'clt',
        dataAdmissao:       f.dataAdmissao        || f.data_admissao      || '',
        funcoes:            f.funcoes             || [],
        substituicoes:      f.substituicoes       || [],
        status:             f.ativo === false ? 'desligado' : 'ativo',
        ativo:              f.ativo !== false,
        criadoEm:           f.criadoEm            || new Date().toISOString(),
        atualizadoEm:       new Date().toISOString(),
        origem:             'migracao_funcionarios_json'
      };
      salvar(orgId, colab);
      importados++;
    });

    return {
      ok: true,
      importados: importados,
      ignorados:  ignorados,
      mensagem:   'Migração concluída: ' + importados + ' importados, ' + ignorados + ' ignorados (já existiam).'
    };
  }

  // ── API pública ───────────────────────────────────────────────────

  return {
    // Colaboradores
    listar:               listar,
    buscarPorId:          buscarPorId,
    buscarPorEmail:       buscarPorEmail,
    salvar:               salvar,
    excluir:              excluir,

    // Férias
    listarFerias:         listarFerias,
    buscarFeriasPorId:    buscarFeriasPorId,
    salvarFerias:         salvarFerias,

    // Escalas
    listarEscalas:        listarEscalas,
    salvarEscala:         salvarEscala,
    excluirEscala:        excluirEscala,

    // Avaliações
    listarAvaliacoes:     listarAvaliacoes,
    salvarAvaliacao:      salvarAvaliacao,
    excluirAvaliacao:     excluirAvaliacao,

    // Histórico RH
    listarHistorico:      listarHistorico,
    salvarHistorico:      salvarHistorico,
    excluirHistorico:     excluirHistorico,

    // Afastamentos
    listarAfastamentos:       listarAfastamentos,
    buscarAfastamentoPorId:   buscarAfastamentoPorId,
    salvarAfastamento:        salvarAfastamento,
    excluirAfastamento:       excluirAfastamento,

    // Ocorrências
    listarOcorrencias:        listarOcorrencias,
    salvarOcorrencia:         salvarOcorrencia,
    excluirOcorrencia:        excluirOcorrencia,

    // Manutenção
    garantirCabecalhoIndice: _garantirCabecalhoIndice,
    protegerIndice:          protegerIndice,
    migrarFuncionariosParaColaboradores: migrarFuncionariosParaColaboradores
  };

})();
