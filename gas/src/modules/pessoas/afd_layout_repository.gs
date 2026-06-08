/**
 * @file afd_layout_repository.gs
 * @layer repository
 * @description Repositório de Layouts de Importação AFD.
 *
 *   Armazena definições flexíveis de como interpretar arquivos de ponto.
 *   Separa o dado bruto (posições fixas) da estrutura interna normalizada.
 *
 *   JSON canônico: afd_layouts.json
 *   Pré-seeded: iDClass Bio Prox (Control iD) — analisado do arquivo real do CCBJ.
 *
 *   Estrutura de um layout:
 *   - camposComuns: campos presentes em TODOS os tipos de registro (NSR, tipo, datetime)
 *   - camposPorTipo: campos adicionais específicos por tipo ('3', '5', etc.)
 *   - tiposRegistro: metadados de cada tipo (descrição, se ignora, se é batida)
 *   - mapeamentoCampos: campo do arquivo → campo interno normalizado
 *   - padraoDeteccao: regex aplicado às primeiras linhas para auto-detecção
 *
 * @depends data_layer.gs
 */

var AfdLayoutRepository = (function() {

  var ARQUIVO = 'afd_layouts.json';

  // ─── Layout builtin: iDClass Bio Prox (Control iD) ─────────────────────────
  //
  // Estrutura analisada do arquivo real do CCBJ.
  //
  // Formato por tipo de registro:
  //   Todos: [NSR:9][TIPO:1][DATETIME_ISO:25] → primeiros 35 chars comuns
  //
  //   Tipo 3 (batida de ponto):
  //     [PIS:12][HASH:4]   → pos 35..46 / 47..50
  //
  //   Tipo 5 (cadastro de funcionário):
  //     [ACAO:1][PIS:12][NOME:50][CNPJ_SEQ:15][HASH:4]
  //     → pos 35 / 36..47 / 48..97 / 98..112 / 113..116
  //
  //   Tipo 2 (informações do empregador):
  //     [CNPJ:12][...][RAZAO_SOCIAL:150][ENDERECO:100][HASH:4]
  //
  //   Tipo 6 (evento técnico/sincronização):
  //     [COD_EVENTO:2]   → pos 35..36  (ignorado no processamento)
  //
  //   Tipo 1 (cabeçalho) e Tipo 9 (trailer): ignorados no processamento de batidas.

  var LAYOUT_IDCLASS_V1 = {
    id:          'iDClass-BioProx-v1',
    nome:        'iDClass Bio Prox',
    fornecedor:  'Control iD',
    modelo:      'iDClass Bio Prox',
    versao:      '1',
    ativo:       true,
    builtin:     true,
    tipoArquivo: 'TXT',
    encoding:    'UTF-8',
    // Regex testado contra as primeiras 5 linhas do arquivo para auto-detecção.
    // Padrão: 9 dígitos + [12356] + data ISO com timezone -0300
    padraoDeteccao: '^\\d{9}[123569]\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}[+-]\\d{4}',
    tiposRegistro: {
      '1': { descricao: 'Cabeçalho do arquivo',          ignorar: true  },
      '2': { descricao: 'Informações do empregador',     ignorar: false },
      '3': { descricao: 'Batida de ponto',               ignorar: false, tipoBatida:   true  },
      '5': { descricao: 'Cadastro de funcionário',       ignorar: false, tipoCadastro: true  },
      '6': { descricao: 'Evento técnico/sincronização',  ignorar: true  },
      '9': { descricao: 'Trailer / assinatura digital',  ignorar: true  }
    },
    // Campos comuns a todos os tipos de registro
    camposComuns: [
      {
        nome: 'nsr', posInicio: 0, comprimento: 9, tipo: 'inteiro',
        descricao: 'Número Sequencial de Registro',
        visivel: true, editavel: false, ordenacao: 1
      },
      {
        nome: 'tipoRegistro', posInicio: 9, comprimento: 1, tipo: 'string',
        descricao: 'Tipo de registro (1/2/3/5/6/9)',
        visivel: false, editavel: false, ordenacao: 2
      },
      {
        nome: 'datetimeOriginal', posInicio: 10, comprimento: 25, tipo: 'datetime_iso',
        descricao: 'Data e hora com timezone (ISO 8601)',
        visivel: true, editavel: false, ordenacao: 3
      }
    ],
    // Campos específicos por tipo de registro
    camposPorTipo: {
      '3': [
        {
          nome: 'pis', posInicio: 35, comprimento: 12, tipo: 'string_digits',
          descricao: 'PIS/NIS do colaborador (12 posições)',
          visivel: true, editavel: false, ordenacao: 4
        },
        {
          nome: 'hash', posInicio: 47, comprimento: 4, tipo: 'string',
          descricao: 'Hash de integridade da linha',
          visivel: false, editavel: false, ordenacao: 5
        }
      ],
      '5': [
        {
          nome: 'acao', posInicio: 35, comprimento: 1, tipo: 'string',
          descricao: 'Ação no equipamento: I=Inclusão, A=Alteração, E=Exclusão',
          visivel: true, editavel: false, ordenacao: 4
        },
        {
          nome: 'pis', posInicio: 36, comprimento: 12, tipo: 'string_digits',
          descricao: 'PIS/NIS do colaborador',
          visivel: true, editavel: false, ordenacao: 5
        },
        {
          nome: 'nome', posInicio: 48, comprimento: 50, tipo: 'string_trim',
          descricao: 'Nome do colaborador (50 chars, padded)',
          visivel: true, editavel: false, ordenacao: 6
        },
        {
          nome: 'cnpjSeq', posInicio: 98, comprimento: 15, tipo: 'string',
          descricao: 'Sequência CNPJ do equipamento',
          visivel: false, editavel: false, ordenacao: 7
        },
        {
          nome: 'hash', posInicio: 113, comprimento: 4, tipo: 'string',
          descricao: 'Hash de integridade da linha',
          visivel: false, editavel: false, ordenacao: 8
        }
      ],
      '2': [
        {
          nome: 'cnpj', posInicio: 35, comprimento: 12, tipo: 'string',
          descricao: 'CNPJ do empregador',
          visivel: false, editavel: false, ordenacao: 4
        },
        {
          nome: 'razaoSocial', posInicio: 75, comprimento: 150, tipo: 'string_trim',
          descricao: 'Razão social da empresa',
          visivel: false, editavel: false, ordenacao: 5
        },
        {
          nome: 'endereco', posInicio: 225, comprimento: 100, tipo: 'string_trim',
          descricao: 'Endereço do empregador',
          visivel: false, editavel: false, ordenacao: 6
        },
        {
          nome: 'hash', posInicio: -4, comprimento: 4, tipo: 'string',
          descricao: 'Hash de integridade (últimos 4 chars)',
          visivel: false, editavel: false, ordenacao: 7
        }
      ],
      '6': [
        {
          nome: 'codEvento', posInicio: 35, comprimento: 2, tipo: 'string',
          descricao: 'Código do evento técnico',
          visivel: false, editavel: false, ordenacao: 4
        }
      ]
    },
    // Mapeamento: nome do campo no arquivo → nome do campo interno normalizado
    mapeamentoCampos: {
      nsr:              'nsr',
      tipoRegistro:     'tipoRegistro',
      datetimeOriginal: 'datetimeOriginal',
      pis:              'pis',
      nome:             'nomeNoEquipamento',
      acao:             'acaoEquipamento',
      hash:             'hash',
      cnpj:             'cnpjEmpregador',
      razaoSocial:      'razaoSocialEmpregador'
    },
    criadoEm: '2026-06-08',
    orgId:    null   // null = layout global compartilhado entre todas as orgs
  };

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  function _lerTodos() {
    return readJSON(ARQUIVO) || [];
  }

  function listar(orgId) {
    return _lerTodos().filter(function(l) {
      return l.ativo && (l.orgId === null || l.orgId === orgId);
    });
  }

  function obter(id) {
    return _lerTodos().find(function(l){ return l.id === id; }) || null;
  }

  function salvar(orgId, dados) {
    if (dados.builtin) throw new Error('Layouts builtin não podem ser editados. Use duplicar() para criar uma variante.');
    var id = dados.id || gerarId('LAYOUT');
    modifyJSON(ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(l){ return l.id === id; });
      var reg = Object.assign({}, dados, {
        id:           id,
        orgId:        orgId,
        atualizadoEm: new Date().toISOString()
      });
      if (idx >= 0) lista[idx] = reg;
      else lista.push(reg);
      return lista;
    });
    return id;
  }

  function excluir(id) {
    var layout = obter(id);
    if (!layout) throw new Error('Layout não encontrado: ' + id);
    if (layout.builtin) throw new Error('Layouts builtin não podem ser excluídos. Desative-o com ativo=false.');
    modifyJSON(ARQUIVO, function(lista) {
      return (lista || []).filter(function(l){ return l.id !== id; });
    });
    return { ok: true };
  }

  /**
   * Cria uma cópia customizável de um layout existente.
   * O clone não é builtin — pode ser editado e excluído livremente.
   */
  function duplicar(orgId, idOrigem, nomeNovo) {
    var origem = obter(idOrigem);
    if (!origem) throw new Error('Layout não encontrado: ' + idOrigem);
    var clone = JSON.parse(JSON.stringify(origem));
    delete clone.id;
    clone.nome    = nomeNovo || (origem.nome + ' (cópia)');
    clone.builtin = false;
    clone.orgId   = orgId;
    clone.criadoEm = new Date().toISOString();
    delete clone.atualizadoEm;
    return salvar(orgId, clone);
  }

  /**
   * Tenta detectar o layout correto para um conteúdo de arquivo.
   * Testa o padraoDeteccao de cada layout ativo contra as primeiras 5 linhas.
   * Retorna o id do primeiro layout que bate, ou null se nenhum.
   */
  function detectarLayout(orgId, conteudo) {
    var primeiras = (conteudo || '').split(/\r?\n/).slice(0, 5).join('\n');
    var layouts   = listar(orgId);
    for (var i = 0; i < layouts.length; i++) {
      var l = layouts[i];
      if (!l.padraoDeteccao) continue;
      try {
        if (new RegExp(l.padraoDeteccao, 'm').test(primeiras)) return l.id;
      } catch(_) {}
    }
    return null;
  }

  // ─── Inicialização ───────────────────────────────────────────────────────────

  function prepararIndice() {
    var lista = _lerTodos();
    var existe = lista.some(function(l){ return l.id === LAYOUT_IDCLASS_V1.id; });
    if (!existe) {
      modifyJSON(ARQUIVO, function(l) {
        if (!Array.isArray(l)) l = [];
        l.unshift(LAYOUT_IDCLASS_V1);
        return l;
      });
      Logger.info('afd_layout_repository', 'prepararIndice', 'Layout builtin iDClass Bio Prox v1 instalado.');
    }
    return { ok: true, layouts: listar(null).length };
  }

  return {
    listar:          listar,
    obter:           obter,
    salvar:          salvar,
    excluir:         excluir,
    duplicar:        duplicar,
    detectarLayout:  detectarLayout,
    prepararIndice:  prepararIndice,
    BUILTIN_IDCLASS: LAYOUT_IDCLASS_V1.id
  };

})();
