/**
 * @file controllers/manual_controller.gs
 * @layer controllers
 * @description Controller do Manual: busca semântica via IA para mapear queries
 *              em linguagem natural para seções do manual do sistema.
 *              Usa failover dual-provider: Groq (llama) → Gemini (Flash).
 *              Se ambos falharem, retorna ids vazios e o frontend cai no motor clássico.
 * @depends core/services/ia_service.gs (IAService), core/services/acesso_service.gs
 */

/**
 * Mapa canônico de seções: id → descrição compacta para o prompt da IA.
 * Mantido aqui (backend) para que o prompt nunca dependa do frontend.
 */
var _MANUAL_SECOES_CONTEXTO = {
  'home':           'Início, menu lateral, navegação, logout, notificações toast',
  'dashboard':      'Dashboard com 3 pilares: operacional (espaços, equipe, ações, tarefas, SLA), financeiro (contratos, execução orçamentária) e estratégico (KPIs, riscos)',
  'taskhub':        'Meu Centro / TaskHub: painel pessoal com pendências priorizadas (Urgente/Hoje/Semana/Mais Tarde), Meu Dia, Meu Time, Produtividade, aniversariantes',
  'acoes':          'Ações Culturais: criar e gerenciar eventos/projetos, fluxo Planejada→Em Produção→Em Execução→Concluída→Arquivada|Cancelada, orçamento próprio, localização (sede/território/itinerante/virtual), Kanban, vínculo estratégico, publicar agenda pública',
  'estrategia':     'Estratégia: objetivos (curto/médio/longo prazo), KPIs automáticos, riscos do mês, calendário estratégico, vincular ações a objetivos',
  'publico':        'Público: inscrições em ações, fila de espera, presenças por sessão, certificados (min 75% frequência), pesquisas de satisfação NPS, portal de inscrição público',
  'parcerias':      'Parcerias institucionais: cadastro, vínculo com ações culturais',
  'acervo':         'Acervo Cultural: imagens e documentos com controle de autorização LGPD (Não verificado/Autorizado/Restrito/Sem pessoas)',
  'espacos':        'Infraestrutura/Espaços: calendário de reservas, solicitar reserva, chaves (retirada/devolução), inventário de ativos/patrimônio, editor de mapa/planta (mover, redimensionar, girar, editar vértices, mesclar)',
  'aprovacoes':     'Aprovações: central de solicitações pendentes — reservas de espaço, novos acessos de usuário, reservas de carro, permissões; aprovar ou recusar com justificativa',
  'reservas-carro': 'Reserva de Veículo: solicitar uso do carro institucional, informar data/horários/destino/paradas/passageiros, aguardar aprovação, geocodificação automática',
  'pessoas':        'Colaboradores: cadastro central (CLT/PJ/Bolsista/Professor/Voluntário/Estagiário), status (Ativo/Afastado/Desligado), Meu Perfil (auto-edição: pronomes/endereço/contato emergência/gênero/raça/PcD/família/alergias), data nascimento para aniversariantes, desligamento bloqueia e-mails',
  'ponto':          'Ponto & Escalas: espelho mensal de ponto, banco de horas automático, alertas CLT (jornada >10h, sem intervalo, BH excessivo), regime diário ou semanal (professores), solicitar férias, importar AFD (relógio ponto Colabore/iDClass), afastamentos',
  'rh':             'RH — Configurações: equipe, PCCS (plano de cargos carreiras salários, tabelas por ano), histórico de eventos estruturados (Promoção/Reajuste/Mudança Cargo/Mudança Carga/Admissão/Advertência com nível e gravidade/Desligamento), férias (período aquisitivo e janela concessiva calculados, acordo de férias), avaliações, documentos, folha de pagamento, rescisão, indicadores RH (clima, disciplinar, jornada)',
  'contratacoes':   'Contratações: solicitação de contratação de prestadores externos (serviço/compra/bolsa), fluxo Rascunho→Submetida→Devolvida|Aprovada Gestor→Aguard.Cotações→Aprovada Financeiro→Em Execução→Concluída|Rejeitada|Cancelada',
  'escuta':         'Escuta Institucional: pesquisa de clima (8 dimensões UWES/JDC/CVF/NR-1), Pulse (pergunta rápida), Escuta Espontânea (relato livre anônimo), resultados agregados nunca individuais, publicar pesquisas, alertas de clima baixo',
  'escuta-lgpd':    'Pesquisa & LGPD: metodologia das 8 dimensões científicas, garantias de anonimato (desvinculação automática ao responder), conformidade LGPD, limiares de confiança (bloqueado <15%)',
  'financeiro':     'Financeiro: contratos de prestadores (rascunho→ativo→encerrado), fontes de recurso, remanejamento orçamentário (fluxo multi-aprovação), aditivos de prazo/valor, exportação CSV para prestação de contas',
  'tarefas':        'Tarefas: criar/atribuir tarefas com prioridade (baixa/média/alta/crítica), status (pendente/em andamento/bloqueada/concluída/cancelada), prazo, vínculo com Ação ou Reserva ou Contrato, comentários, visão da equipe para gestores',
  'reunioes':       'Reuniões: registrar pautas, participantes, discussões, decisões, encaminhamentos (com responsável e prazo — notifica por e-mail e aparece no Meu Centro), finalizar e gerar ata, aprovar ata, arquivar',
  'comunicacao':    'Comunicação: demandas de materiais de divulgação, registro RECE (eventos externos para agenda pública), enviar comunicados internos',
  'balcao':         'Balcão de Atendimento: solicitar serviços de comunicação (design/foto/vídeo/texto/social/impresso), SLA automático por tipo, executor envia versões, demandante revisa, aba de comentários, fluxo Rascunho→Submetida→Em Análise→Em Execução→Revisão→Aprovada→Concluída',
  'relatorios':     'Relatórios: exportações por módulo (CODIP público, CSV financeiro, AFD ponto, relatório climático escuta, saídas estoque), link para BI Demográfico',
  'bi-demografico': 'BI Demográfico: análise demográfica da equipe (gênero, raça/cor, PcD, orientação, faixa etária, por setor) e dos beneficiários (território mapa de calor, gênero, faixa etária); dados de Meu Perfil; grupos <5 ocultados; visível só para RH/Admin',
  'voluntarios':    'Voluntários: cadastro (nome/e-mail/telefone/competências), alocações em ações (função/horário/status: convidado→confirmado→presente→concluído), convite por e-mail',
  'agentes':        'Agentes Culturais: cadastro de artistas e produtores PF/PJ (CPF/CNPJ, nome artístico, áreas artísticas, linguagens, especialidades), histórico de participação em ações',
  'admin':          'Administração: gerenciar usuários (aprovar/editar papel/revogar acesso), Cadastros Base (espaços/setores/categorias/módulos), features por usuário, identidade visual (cores/tema), banco de dados (diagnóstico), configurações da org (dados/turnos), auditoria completa, SuperAdmin (todas as orgs)'
};

// ── Providers de IA ───────────────────────────────────────────────

var _GROQ_URL        = 'https://api.groq.com/openai/v1/chat/completions';
var _GROQ_MODEL      = 'llama-3.1-8b-instant';

// OpenRouter — fallback quando Groq esgota tokens ou rate-limita
// Endpoint OpenAI-compatible; modelo econômico para busca
var _OPENROUTER_URL   = 'https://openrouter.ai/api/v1/chat/completions';
var _OPENROUTER_MODEL = 'mistralai/mistral-7b-instruct';  // rápido e barato para classificação

/**
 * Constrói o prompt de busca semântica para a IA.
 */
function _buildPrompt(query) {
  var lista = Object.keys(_MANUAL_SECOES_CONTEXTO).map(function(id) {
    return id + ': ' + _MANUAL_SECOES_CONTEXTO[id];
  }).join('\n');

  return 'Você é um assistente de busca de manual de sistema ERP cultural. ' +
    'Sua única tarefa é identificar quais seções do manual são relevantes para a query do usuário.\n\n' +
    'QUERY DO USUÁRIO: "' + query + '"\n\n' +
    'SEÇÕES DISPONÍVEIS (id: descrição):\n' + lista + '\n\n' +
    'EXEMPLOS:\n' +
    '- Query "como tirar férias" → {"ids":["ponto","rh"]}\n' +
    '- Query "banco de horas negativo" → {"ids":["ponto"]}\n' +
    '- Query "advertência verbal" → {"ids":["rh"]}\n' +
    '- Query "como aprovar uma reserva" → {"ids":["aprovacoes","espacos"]}\n' +
    '- Query "salário e PCCS" → {"ids":["rh"]}\n' +
    '- Query "aniversário da equipe" → {"ids":["taskhub","pessoas"]}\n\n' +
    'Retorne APENAS um JSON válido no formato {"ids": ["id1", "id2"]} ' +
    'com os IDs das seções mais relevantes em ordem de relevância. ' +
    'Máximo 3 seções. Mínimo 1. Use apenas IDs da lista. Sem texto antes ou depois do JSON.';
}

/**
 * Tenta chamar a API Groq. Retorna { ok, ids } ou { ok: false }.
 */
function _chamarGroq(prompt) {
  try {
    var apiKey = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');
    if (!apiKey) return { ok: false };
    var response = UrlFetchApp.fetch(_GROQ_URL, {
      method: 'post', contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + apiKey },
      payload: JSON.stringify({
        model: _GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: 0.1
      }),
      muteHttpExceptions: true
    });
    var json = JSON.parse(response.getContentText());
    if (json.error) return { ok: false };
    var texto = (json.choices && json.choices[0]) ? json.choices[0].message.content : '';
    return _extrairIds(texto);
  } catch (e) {
    return { ok: false };
  }
}

/**
 * Tenta chamar o OpenRouter (fallback). API compatível com OpenAI.
 * Retorna { ok, ids } ou { ok: false }.
 */
function _chamarOpenRouter(prompt) {
  try {
    var apiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
    if (!apiKey) return { ok: false };
    var response = UrlFetchApp.fetch(_OPENROUTER_URL, {
      method: 'post', contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'HTTP-Referer': 'https://script.google.com',
        'X-Title': 'CCBJ-ERP-Manual'
      },
      payload: JSON.stringify({
        model: _OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: 0.1
      }),
      muteHttpExceptions: true
    });
    var json = JSON.parse(response.getContentText());
    if (json.error) return { ok: false };
    var texto = (json.choices && json.choices[0]) ? json.choices[0].message.content : '';
    return _extrairIds(texto);
  } catch (e) {
    return { ok: false };
  }
}

/**
 * Extrai e valida os IDs de seção do texto retornado pela IA.
 */
function _extrairIds(texto) {
  try {
    var inicio = texto.indexOf('{');
    var fim    = texto.lastIndexOf('}');
    if (inicio === -1 || fim === -1) return { ok: false };
    var parsed = JSON.parse(texto.substring(inicio, fim + 1));
    if (!Array.isArray(parsed.ids)) return { ok: false };
    var validos = parsed.ids.filter(function(id) { return !!_MANUAL_SECOES_CONTEXTO[id]; });
    return validos.length ? { ok: true, ids: validos } : { ok: false };
  } catch (e) {
    return { ok: false };
  }
}

// ── Controller público ────────────────────────────────────────────

/**
 * Busca semântica com IA: interpreta query em linguagem natural e retorna
 * os IDs das seções mais relevantes do manual.
 * Failover: Groq → Gemini → [] (silencioso, frontend cai no motor clássico).
 *
 * @param {string} query  Texto livre digitado pelo usuário
 * @returns {{ ok: boolean, ids: string[] }}
 */
function ctrl_manual_buscar_ia(query) {
  return GasResponse.wrap(function() {
    AcessoService.verificar();

    var q = String(query || '').trim();
    if (!q || q.length < 2) return { ids: [] };

    var prompt = _buildPrompt(q);

    var resultado = _chamarGroq(prompt);
    if (!resultado.ok) resultado = _chamarOpenRouter(prompt);
    if (!resultado.ok) return { ids: [] };

    return { ids: resultado.ids };
  }, 'ctrl_manual_buscar_ia');
}
