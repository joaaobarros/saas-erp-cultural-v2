/**
 * @file modules/interatividade/templates_repository.gs
 * @layer modules/interatividade
 * @description Repositório de Templates de Sessões Interativas.
 *   Templates sistema são constantes JS (não persistidas em Drive).
 *   Templates da org ficam em templates_interatividade_{orgId}.json no Drive.
 * @depends DataLayer.gs
 */

var _TEMPLATES_SISTEMA = [
  {
    id: 'TPL_SISTEMA_001',
    titulo: 'Quiz de Conhecimentos',
    descricao: 'Avalie o aprendizado com perguntas de múltipla escolha e gabarito.',
    categoria: 'quiz', icone: '🧠', cor: '#3b82f6',
    modoIdentidade: 'escolha',
    gamificacao: { habilitada: true, pontosPorAcerto: 10, bonusVelocidade: false },
    atividades: [
      { tipo:'quiz', texto:'Pergunta de exemplo 1', opcoes:['Opção A','Opção B','Opção C','Opção D'],
        gabarito:'Opção A', pontos:10, tempo:30, instrucoes:'' },
      { tipo:'quiz', texto:'Pergunta de exemplo 2', opcoes:['Verdadeiro','Falso'],
        gabarito:'Verdadeiro', pontos:10, tempo:20, instrucoes:'' }
    ],
    criadoPor: 'sistema', publico: true, criadoEm: '', atualizadoEm: ''
  },
  {
    id: 'TPL_SISTEMA_002',
    titulo: 'Quebra-Gelo',
    descricao: 'Inicie sessões com atividades leves de apresentação e votação.',
    categoria: 'icebreaker', icone: '🌊', cor: '#10b981',
    modoIdentidade: 'anonimo',
    gamificacao: { habilitada: false, pontosPorAcerto: 0, bonusVelocidade: false },
    atividades: [
      { tipo:'enquete', texto:'Como você está hoje?',
        opcoes:['🔥 Animado!','😊 Bem','😐 Normal','😴 Cansado'], tempo:0, instrucoes:'' },
      { tipo:'nuvem', texto:'Em uma palavra: o que você espera desta sessão?', tempo:0, instrucoes:'' },
      { tipo:'votacao', texto:'Qual pauta priorizar hoje?', opcoes:['Tema A','Tema B','Tema C'],
        votos_por_part:2, tempo:0, instrucoes:'' }
    ],
    criadoPor: 'sistema', publico: true, criadoEm: '', atualizadoEm: ''
  },
  {
    id: 'TPL_SISTEMA_003',
    titulo: 'Retrospectiva / Feedback',
    descricao: 'Coleta estruturada de pontos positivos, melhorias e ações.',
    categoria: 'feedback', icone: '🔄', cor: '#f59e0b',
    modoIdentidade: 'anonimo',
    gamificacao: { habilitada: false, pontosPorAcerto: 0, bonusVelocidade: false },
    atividades: [
      { tipo:'brainstorm', texto:'O que funcionou bem? (pontos positivos)',
        instrucoes:'Seja específico — cite situações concretas.', tempo:0 },
      { tipo:'brainstorm', texto:'O que pode melhorar?',
        instrucoes:'Foque em processos, não em pessoas.', tempo:0 },
      { tipo:'brainstorm', texto:'Que ações concretas devemos tomar?',
        instrucoes:'Proponha ações realizáveis com responsável e prazo.', tempo:0 },
      { tipo:'votacao', texto:'Priorize as ações propostas (vote nas 3 mais importantes)',
        opcoes:[], votos_por_part:3, instrucoes:'As opções virão das respostas da atividade anterior.', tempo:0 }
    ],
    criadoPor: 'sistema', publico: true, criadoEm: '', atualizadoEm: ''
  },
  {
    id: 'TPL_SISTEMA_004',
    titulo: 'Apresentação Participativa',
    descricao: 'Sessão com enquetes, Q&A e coleta de palavras durante uma apresentação.',
    categoria: 'apresentacao', icone: '🎤', cor: '#8b5cf6',
    modoIdentidade: 'nome_real',
    gamificacao: { habilitada: false, pontosPorAcerto: 0, bonusVelocidade: false },
    atividades: [
      { tipo:'enquete', texto:'O que você já sabe sobre este tema?',
        opcoes:['Muito','Alguma coisa','Pouco','Nada'], tempo:0, instrucoes:'' },
      { tipo:'nuvem', texto:'Quais palavras você associa a este tema?', tempo:0, instrucoes:'' },
      { tipo:'qa', texto:'Envie suas perguntas ao apresentador',
        instrucoes:'As perguntas aparecerão no painel do host em tempo real.', tempo:0 },
      { tipo:'enquete', texto:'Como você avalia esta apresentação?',
        opcoes:['⭐⭐⭐⭐⭐ Excelente','⭐⭐⭐⭐ Boa','⭐⭐⭐ Regular','⭐⭐ Fraca'], tempo:0, instrucoes:'' }
    ],
    criadoPor: 'sistema', publico: true, criadoEm: '', atualizadoEm: ''
  }
];

var TemplatesInteratividadeRepository = (function() {

  function _file(orgId) { return 'templates_interatividade_' + orgId + '.json'; }

  function _gerarId() {
    return 'TPL_' + Date.now() + '_' + Math.random().toString(36).slice(2,8).toUpperCase();
  }

  // ── Listagem ─────────────────────────────────────────────────────────────────

  function listarTemplates(orgId, filtros, emailUsuario) {
    filtros = filtros || {};
    var orgTemplates = readJSON(_file(orgId)) || [];
    var visiveis = orgTemplates.filter(function(t) {
      return t.publico || (emailUsuario && t.criadoPor === emailUsuario);
    });
    var todos = _TEMPLATES_SISTEMA.concat(visiveis);
    if (filtros.categoria) {
      todos = todos.filter(function(t) { return t.categoria === filtros.categoria; });
    }
    if (filtros.criadoPor) {
      todos = todos.filter(function(t) { return t.criadoPor === filtros.criadoPor; });
    }
    return todos;
  }

  function buscarPorId(orgId, id) {
    var sis = _TEMPLATES_SISTEMA.filter(function(t) { return t.id === id; })[0];
    if (sis) return sis;
    var lista = readJSON(_file(orgId)) || [];
    return lista.filter(function(t) { return t.id === id; })[0] || null;
  }

  // ── Escrita ──────────────────────────────────────────────────────────────────

  function criarTemplate(orgId, dados, emailUsuario) {
    var agora = new Date().toISOString();
    var tpl = {
      id:             _gerarId(),
      titulo:         dados.titulo || 'Novo Template',
      descricao:      dados.descricao || '',
      categoria:      dados.categoria || 'custom',
      icone:          dados.icone || '📋',
      cor:            dados.cor || '#6b7280',
      modoIdentidade: dados.modoIdentidade || 'escolha',
      gamificacao:    dados.gamificacao || { habilitada: false, pontosPorAcerto: 10, bonusVelocidade: false },
      atividades:     dados.atividades || [],
      criadoPor:      emailUsuario || 'sistema',
      publico:        dados.publico !== false,
      criadoEm:       agora,
      atualizadoEm:   agora
    };
    modifyJSON(_file(orgId), function(lista) {
      if (!Array.isArray(lista)) lista = [];
      lista.push(tpl);
      return lista;
    });
    return tpl;
  }

  function atualizarTemplate(orgId, id, campos, emailUsuario, papel) {
    if (_TEMPLATES_SISTEMA.some(function(t) { return t.id === id; })) {
      throw new Error('Templates do sistema não podem ser editados.');
    }
    var resultado;
    modifyJSON(_file(orgId), function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(t) { return t.id === id; });
      if (idx < 0) throw new Error('Template não encontrado: ' + id);
      var t = lista[idx];
      if (t.criadoPor !== emailUsuario && !['admin','superadmin'].includes(papel)) {
        throw new Error('Sem permissão para editar este template.');
      }
      lista[idx] = Object.assign({}, t, campos, { atualizadoEm: new Date().toISOString() });
      resultado = lista[idx];
      return lista;
    });
    return resultado;
  }

  function excluirTemplate(orgId, id, emailUsuario, papel) {
    if (_TEMPLATES_SISTEMA.some(function(t) { return t.id === id; })) {
      throw new Error('Templates do sistema não podem ser excluídos.');
    }
    modifyJSON(_file(orgId), function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(t) { return t.id === id; });
      if (idx < 0) throw new Error('Template não encontrado: ' + id);
      var t = lista[idx];
      if (t.criadoPor !== emailUsuario && !['admin','superadmin'].includes(papel)) {
        throw new Error('Sem permissão para excluir este template.');
      }
      lista.splice(idx, 1);
      return lista;
    });
    return { ok: true };
  }

  // ── Índice (stub) ─────────────────────────────────────────────────────────────

  function prepararIndice() {
    return { ok: true };
  }

  return {
    listarTemplates:   listarTemplates,
    buscarPorId:       buscarPorId,
    criarTemplate:     criarTemplate,
    atualizarTemplate: atualizarTemplate,
    excluirTemplate:   excluirTemplate,
    prepararIndice:    prepararIndice
  };
})();
