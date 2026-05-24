/**
 * @file modules/financeiro/itens_despesa_service.gs
 * @layer modules/financeiro
 * @description Catálogo SEPLAG de Itens de Despesa (Anexo I — Compatibilização).
 *
 * Armazena os ~60 itens padrão do Anexo I em `itens_despesa_config.json`.
 * NÃO É HARDCODE: a lista é editável por org via Admin.
 * - Admin pode ativar/desativar itens
 * - Admin pode adicionar itens customizados
 * - O seed inicial pode ser reexecutado via fase1_itens_despesa_seed() (idempotente)
 *
 * @depends core/data_layer.gs (readJSON, modifyJSON)
 *          core/utils.gs (gerarId)
 *          core/logger.gs (Logger)
 *          core/config.gs (getOrgConfig)
 */

var ItensDespesaService = (function () {

  var _ARQUIVO = 'itens_despesa_config.json';

  // ── Catálogo SEPLAG completo (Anexo I) ────────────────────────────
  // Fonte: Compatibilização de Itens de Despesa — OS CCBJ/SECULT-CE
  // Item especial: Pessoal (Folha de Pagamento) — tipoPessoal:true
  // Aparece apenas no Plano de Contas; não é selecionável como Item de Despesa de custeio/investimento.
  // Admin pode editar o código SEPLAG se necessário.
  var _PESSOAL_SEED = {
    nome:       'VENCIMENTOS E VANTAGENS FIXAS - PESSOAL CIVIL',
    codigo:     '3.3.50.11.00',
    itemAnexo:  'Vencimentos e vantagens fixas - Pessoal Civil',
    tipoPessoal: true  // flag especial — não aparece no dropdown de custeio/investimento
  };

  var _CATALOG_SEED = [
    { nome: 'ACERVO BIBLIOGRÁFICO',                codigo: '3.3.50.30.00', itemAnexo: 'Material de consumo' },
    { nome: 'ADIANTAMENTO A FUNCIONÁRIO',          codigo: '3.3.50.00.46', itemAnexo: 'Materiais de consumo - Suprimento de fundos' },
    { nome: 'ÁGUA E ESGOTO',                       codigo: '3.3.50.00.96', itemAnexo: 'Serviços de água e esgoto' },
    { nome: 'ALUGUÉIS',                            codigo: '3.3.50.00.84', itemAnexo: 'Outros Serviços de Terceiros - PJ' },
    { nome: 'AQUIS. BENS DE PEQ. VALOR',           codigo: '3.3.50.30.00', itemAnexo: 'Material de consumo' },
    { nome: 'ARRENDAMENTO SOFTWARES / LICENÇAS',   codigo: '3.3.50.00.84', itemAnexo: 'Outros Serviços de Terceiros - PJ' },
    { nome: 'ASSESSORIA / CONSULTORIA / TUTORIA',  codigo: '3.3.50.35.00', itemAnexo: 'Serviços de Consultoria' },
    { nome: 'ASSESSORIA / CONSULTORIA CONTÁBIL',   codigo: '3.3.50.35.00', itemAnexo: 'Serviços de Consultoria' },
    { nome: 'ASSESSORIA / CONSULTORIA JURÍDICA',   codigo: '3.3.50.35.00', itemAnexo: 'Serviços de Consultoria' },
    { nome: 'ASSESSORIA / CONSULTORIA SESMT',      codigo: '3.3.50.35.00', itemAnexo: 'Serviços de Consultoria' },
    { nome: 'ASSINATURA DE PERIÓDICOS E ANUIDADES',codigo: '3.3.50.00.04', itemAnexo: 'Assinaturas de periódicos e anuidades' },
    { nome: 'BOLSA AUXÍLIO',                       codigo: '3.3.50.00.20', itemAnexo: 'Eventos artísticos e culturais' },
    { nome: 'BUFFET / CAMARIM / ALIMENTAÇÃO / LANCHES', codigo: '3.3.50.00.26', itemAnexo: 'Fornecimento de alimentação' },
    { nome: 'CACHE',                               codigo: '3.3.50.00.20', itemAnexo: 'Eventos artísticos e culturais' },
    { nome: 'COLETA DE LIXO',                      codigo: '3.3.50.00.34', itemAnexo: 'Limpeza e conservação' },
    { nome: 'COMBUSTÍVEIS',                        codigo: '3.3.50.00.11', itemAnexo: 'Combustíveis e lubrificantes' },
    { nome: 'CORREIOS E MALOTES',                  codigo: '3.3.50.00.101', itemAnexo: 'Serviços de comunicação em geral' },
    { nome: 'DIÁRIAS VIAGEM',                      codigo: '3.3.50.14.00', itemAnexo: 'Diárias' },
    { nome: 'DIREITOS AUTORAIS',                   codigo: '3.3.50.00.15', itemAnexo: 'Direitos Autorais' },
    { nome: 'DISTRIBUIDORA DE FILMES',             codigo: '3.3.50.39.00', itemAnexo: 'Outros Serviços de Terceiros - PJ' },
    { nome: 'ENERGIA ELÉTRICA',                    codigo: '3.3.50.00.104', itemAnexo: 'Serviços de energia elétrica' },
    { nome: 'EXAMES ASO',                          codigo: '3.3.50.00.113', itemAnexo: 'Serviços hospitalares, médicos e odontológicos' },
    { nome: 'FARDAMENTO EVENTOS',                  codigo: '3.3.50.00.116', itemAnexo: 'Uniformes, tecidos e aviamentos' },
    { nome: 'FARDAMENTOS',                         codigo: '3.3.50.00.116', itemAnexo: 'Uniformes, tecidos e aviamentos' },
    { nome: 'GÁS NATURAL',                         codigo: '3.3.50.30.00', itemAnexo: 'Material de consumo' },
    { nome: 'HOSPEDAGEM',                          codigo: '3.3.50.00.32', itemAnexo: 'Hospedagens' },
    { nome: 'INSTRUMENTOS E EQUIPAMENTOS MUSICAIS',codigo: '3.3.50.30.00', itemAnexo: 'Material de consumo' },
    { nome: 'INSUMOS / INGREDIENTES',              codigo: '3.3.50.00.29', itemAnexo: 'Gêneros de alimentação' },
    { nome: 'INTERNET',                            codigo: '3.3.50.00.105', itemAnexo: 'Serviços de internet' },
    { nome: 'LOCAÇÃO DE ESTRUTURA PARA EVENTOS',   codigo: '3.3.50.00.37', itemAnexo: 'Locação de máquinas e equipamentos' },
    { nome: 'LOCAÇÃO DE VEÍCULOS / TRASLADO / FRETE', codigo: '3.3.50.00.38', itemAnexo: 'Locação de veículos' },
    { nome: 'LOCAÇÃO EQUIP./MATER./ESPAÇO',        codigo: '3.3.50.00.37', itemAnexo: 'Locação de máquinas e equipamentos' },
    { nome: 'MARCAS E PATENTES',                   codigo: '3.3.50.00.15', itemAnexo: 'Direitos Autorais' },
    { nome: 'MATERIAL DE COPA COZINHA',            codigo: '3.3.50.00.53', itemAnexo: 'Material de copa e cozinha' },
    { nome: 'MATERIAL DE ESPORTES',                codigo: '3.3.50.30.00', itemAnexo: 'Material de consumo' },
    { nome: 'MATERIAL DE EXPEDIENTE',              codigo: '3.3.50.00.55', itemAnexo: 'Material de expediente' },
    { nome: 'MATERIAL DE INFORMÁTICA',             codigo: '3.3.50.00.58', itemAnexo: 'Material de processamento de dados' },
    { nome: 'MATERIAL DE LIMPEZA',                 codigo: '3.3.50.00.56', itemAnexo: 'Material de limpeza e produção de higienização' },
    { nome: 'MATERIAL DE PROTEÇÃO E SEGURANÇA',    codigo: '3.3.50.00.59', itemAnexo: 'Material de proteção e segurança' },
    { nome: 'MATERIAL DIDÁTICO CURSOS',            codigo: '3.3.50.30.00', itemAnexo: 'Material de consumo' },
    { nome: 'MONTAGEM E DESMONTAGEM',              codigo: '3.3.50.39.00', itemAnexo: 'Outros Serviços de Terceiros - PJ' },
    { nome: 'ORG. E PRODUÇÃO DE EVENTOS',          codigo: '3.3.50.39.00', itemAnexo: 'Outros Serviços de Terceiros - PJ' },
    { nome: 'PASSAGENS',                           codigo: '3.3.50.00.07', itemAnexo: 'Bilhetes de passagem' },
    { nome: 'PESQUISA E CURADORIA',               codigo: '3.3.50.00.115', itemAnexo: 'Serviços técnicos profissionais' },
    { nome: 'PREMIAÇÃO',                           codigo: '3.3.50.39.00', itemAnexo: 'Outros Serviços de Terceiros - PJ' },
    { nome: 'PROFESSOR / PALESTRANTE / MONITOR',   codigo: '3.3.50.00.115', itemAnexo: 'Serviços técnicos profissionais' },
    { nome: 'SEGUROS',                             codigo: '3.3.50.39.00', itemAnexo: 'Outros Serviços de Terceiros - PJ' },
    { nome: 'SERV. TEC. ESPECIALIZADOS',           codigo: '3.3.50.00.115', itemAnexo: 'Serviços técnicos profissionais' },
    { nome: 'SERVIÇOS AUDIO VISUAL FOTO E VÍDEO',  codigo: '3.3.50.00.100', itemAnexo: 'Serviços de áudio, vídeo e foto' },
    { nome: 'SERVIÇO DE COMUNICAÇÃO E DIVULGAÇÃO', codigo: '3.3.50.39.00', itemAnexo: 'Outros Serviços de Terceiros - PJ' },
    { nome: 'SERVIÇOS DE LIMPEZA E CONSERVAÇÃO',   codigo: '3.3.50.00.34', itemAnexo: 'Limpeza e conservação' },
    { nome: 'SERVIÇOS DE MONITORAMENTO ELETRÔNICO',codigo: '3.3.50.39.00', itemAnexo: 'Outros Serviços de Terceiros - PJ' },
    { nome: 'SERVIÇOS DE VIGILÂNCIA E SEGURANÇA',  codigo: '3.3.50.00.119', itemAnexo: 'Vigilância ostensiva monitorada' },
    { nome: 'SERVIÇOS E MATERIAIS GRÁFICOS',       codigo: '3.3.50.00.112', itemAnexo: 'Serviços gráficos e editoriais' },
    { nome: 'SERVIÇOS E MATERIAIS DE INFORMÁTICA', codigo: '3.3.50.00.115', itemAnexo: 'Serviços técnicos profissionais' },
    { nome: 'SERVIÇOS E MATERIAL DE MANUTENÇÃO PREDIAL', codigo: '3.3.50.00.40', itemAnexo: 'Manutenção e conservação de bens imóveis' },
    { nome: 'SERVIÇOS MANUTENÇÃO MÓVEIS E EQUIPAMENTOS', codigo: '3.3.50.00.43', itemAnexo: 'Manutenção e conservação de máquinas e equipamentos' },
    { nome: 'SERVIÇOS MANUTENÇÃO VEÍCULOS',        codigo: '3.3.50.00.41', itemAnexo: 'Manutenção e conservação de bens móveis' },
    { nome: 'SERVIÇOS GRÁFICOS',                   codigo: '3.3.50.00.112', itemAnexo: 'Serviços gráficos e editoriais' },
    { nome: 'TARIFAS BANCÁRIAS',                   codigo: '3.3.50.00.95', itemAnexo: 'Serviços bancários' },
    { nome: 'TAXAS EMOLUMENTOS',                   codigo: '3.3.50.13.00', itemAnexo: 'Obrigações patronais' },
    { nome: 'TÁXI ESTACIONAMENTO',                 codigo: '3.3.50.39.00', itemAnexo: 'Outros Serviços de Terceiros - PJ' },
    { nome: 'TELEFONE',                            codigo: '3.3.50.00.101', itemAnexo: 'Serviços de comunicação em geral' },
    { nome: 'TREINAMENTOS / CURSOS',               codigo: '3.3.50.00.94', itemAnexo: 'Serviço de seleção e treinamento' }
  ];

  // ── CRUD ─────────────────────────────────────────────────────────

  function _ler() {
    try {
      var dados = readJSON(_ARQUIVO);
      return Array.isArray(dados) ? dados : (dados && Array.isArray(dados.catalogoSeplag) ? dados.catalogoSeplag : []);
    } catch (_) { return []; }
  }

  function _salvar(lista) {
    writeJSON(_ARQUIVO, lista);
  }

  /**
   * Lista todos os itens do catálogo (filtro opcional: apenas ativos).
   */
  function listar(apenasAtivos) {
    var lista = _ler();
    return apenasAtivos
      ? lista.filter(function (i) { return i.ativo !== false; })
      : lista;
  }

  /**
   * Busca item por id.
   */
  function buscarPorId(id) {
    return _ler().find(function (i) { return i.id === id; }) || null;
  }

  /**
   * Ativa ou desativa um item do catálogo.
   */
  function alterarAtivo(id, ativo) {
    var lista = _ler();
    var encontrou = false;
    lista = lista.map(function (i) {
      if (i.id === id) { i.ativo = !!ativo; encontrou = true; }
      return i;
    });
    if (!encontrou) throw new Error('Item não encontrado: ' + id);
    _salvar(lista);
    return { ok: true };
  }

  /**
   * Adiciona um item customizado ao catálogo.
   * Código SEPLAG pode ser vazio (item sem código oficial).
   */
  function adicionarItemCustom(dados) {
    if (!dados || !dados.nome) throw new Error('Nome do item é obrigatório.');
    var lista = _ler();
    var novoItem = {
      id:         gerarId('cat'),
      nome:       String(dados.nome).trim().toUpperCase(),
      codigo:     String(dados.codigo || '').trim(),
      itemAnexo:  String(dados.itemAnexo || '').trim(),
      ativo:      true,
      customizado: true,
      criadoEm:  new Date().toISOString()
    };
    lista.push(novoItem);
    _salvar(lista);
    return novoItem;
  }

  /**
   * Atualiza um item existente (nome, código SEPLAG, itemAnexo).
   */
  function atualizar(id, dados) {
    var lista = _ler();
    var encontrou = false;
    lista = lista.map(function (i) {
      if (i.id !== id) return i;
      if (dados.nome)      i.nome      = String(dados.nome).trim().toUpperCase();
      if (dados.codigo)    i.codigo    = String(dados.codigo).trim();
      if (dados.itemAnexo) i.itemAnexo = String(dados.itemAnexo).trim();
      if (dados.ativo !== undefined) i.ativo = !!dados.ativo;
      encontrou = true;
      return i;
    });
    if (!encontrou) throw new Error('Item não encontrado: ' + id);
    _salvar(lista);
    return { ok: true };
  }

  /**
   * Remove permanentemente um item customizado.
   * Itens do seed original não podem ser removidos — apenas desativados.
   */
  function remover(id) {
    var lista  = _ler();
    var item   = lista.find(function (i) { return i.id === id; });
    if (!item) throw new Error('Item não encontrado: ' + id);
    if (!item.customizado) throw new Error('Itens do catálogo padrão não podem ser removidos — use desativar.');
    _salvar(lista.filter(function (i) { return i.id !== id; }));
    return { ok: true };
  }

  // ── Seed inicial ─────────────────────────────────────────────────

  /**
   * Popula o catálogo com os ~60 itens padrão SEPLAG.
   * Idempotente: ignora itens cujo nome já existe.
   * Pode ser chamado via fase1_itens_despesa_seed() no GAS Editor.
   */
  function seed() {
    var lista = _ler();
    var nomesExistentes = lista.map(function (i) { return (i.nome || '').toUpperCase(); });
    var adicionados = 0;

    // Item especial de pessoal
    var nomePes = _PESSOAL_SEED.nome.toUpperCase();
    if (nomesExistentes.indexOf(nomePes) < 0) {
      lista.push({
        id:          gerarId('cat'),
        nome:        nomePes,
        codigo:      _PESSOAL_SEED.codigo,
        itemAnexo:   _PESSOAL_SEED.itemAnexo,
        tipoPessoal: true,
        ativo:       true,
        customizado: false,
        criadoEm:   new Date().toISOString()
      });
      nomesExistentes.push(nomePes);
      adicionados++;
    }

    // Itens de custeio/investimento
    _CATALOG_SEED.forEach(function (item) {
      var nomeUp = item.nome.toUpperCase();
      if (nomesExistentes.indexOf(nomeUp) >= 0) return; // idempotente
      lista.push({
        id:        gerarId('cat'),
        nome:      nomeUp,
        codigo:    item.codigo || '',
        itemAnexo: item.itemAnexo || '',
        ativo:     true,
        customizado: false,
        criadoEm: new Date().toISOString()
      });
      nomesExistentes.push(nomeUp);
      adicionados++;
    });

    _salvar(lista);
    return { ok: true, adicionados: adicionados, total: lista.length };
  }

  // ── API pública ───────────────────────────────────────────────────

  return {
    listar:           listar,
    buscarPorId:      buscarPorId,
    alterarAtivo:     alterarAtivo,
    adicionarItemCustom: adicionarItemCustom,
    atualizar:        atualizar,
    remover:          remover,
    seed:             seed
  };

})();

// ── Controller público ────────────────────────────────────────────────

function ctrl_catalogo_listar(apenasAtivos) {
  return GasResponse.wrap(function () {
    return ItensDespesaService.listar(apenasAtivos !== false);
  }, 'ctrl_catalogo_listar');
}

function ctrl_catalogo_adicionar(dados) {
  return GasResponse.wrap(function () {
    return ItensDespesaService.adicionarItemCustom(dados || {});
  }, 'ctrl_catalogo_adicionar');
}

function ctrl_catalogo_alterarAtivo(id, ativo) {
  return GasResponse.wrap(function () {
    return ItensDespesaService.alterarAtivo(id, ativo);
  }, 'ctrl_catalogo_alterarAtivo');
}

function ctrl_catalogo_atualizar(id, dados) {
  return GasResponse.wrap(function () {
    return ItensDespesaService.atualizar(id, dados || {});
  }, 'ctrl_catalogo_atualizar');
}

function ctrl_catalogo_remover(id) {
  return GasResponse.wrap(function () {
    return ItensDespesaService.remover(id);
  }, 'ctrl_catalogo_remover');
}

// ── Fase de setup ─────────────────────────────────────────────────────

/**
 * Executar manualmente no GAS Editor para popular o catálogo SEPLAG inicial.
 * Idempotente — pode ser executado múltiplas vezes sem duplicar.
 */
function fase1_itens_despesa_seed() {
  var result = ItensDespesaService.seed();
  Logger.log('[itens_despesa_seed] ' + JSON.stringify(result));
  return result;
}
