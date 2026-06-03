/**
 * @file core/services/permissoes_v2_engine.gs
 * @layer core/services
 * @description Motor de permissões v2 — matriz papel × módulo × ação.
 *
 * Implementa a permissão por papel (RBAC) com base nos módulos do menu.
 * Cada papel tem acesso a um conjunto de módulos com três níveis de ação:
 *   visualizar, editar, excluir
 *
 * MÓDULOS (correspondem ao campo `modulo` em _MODULOS_MENU no frontend):
 *   ACOES, ESPACOS, PESSOAS, FINANCEIRO, COMUNICACAO,
 *   TAREFAS, REUNIOES, RELATORIOS, ADMIN, MASTER, PUBLICO
 *
 * PAPÉIS (hierarquia decrescente de privilégio):
 *   superadmin > admin > gestor > {financeiro, rh, comunicacao, habilitador} > colaborador
 *
 * HIERARQUIA DE EDIÇÃO (ctrl_acesso_editarPapel / revogar):
 *   superadmin: pode editar qualquer usuário (exceto remover a si mesmo)
 *   admin:      pode editar colaborador, habilitador, rh, financeiro, comunicacao, gestor
 *               NÃO pode editar/revogar admin ou superadmin
 *
 * @depends core/services/acesso_service.gs (AcessoService)
 */

var PermissoesV2Engine = (function () {

  // ── Módulos do sistema ────────────────────────────────────────────────────
  // Correspondem ao campo `modulo` em _MODULOS_MENU no frontend (index.html).
  var _MODULOS = [
    'ACOES', 'ESPACOS', 'PESSOAS', 'FINANCEIRO', 'COMUNICACAO',
    'TAREFAS', 'REUNIOES', 'RELATORIOS', 'ADMIN', 'MASTER', 'PUBLICO'
  ];

  // Papéis válidos do sistema — sincronizado com PAPEIS_VALIDOS em acesso_service.gs
  // Hierarquia: superadmin > admin > gestor > coordenador > {financeiro,rh,comunicacao,habilitador} > colaborador
  // habilitador = equipe de infraestrutura: habilita espaços, confirma reservas, aprova veículos
  // coordenador = coordenação de projetos/ações, nível abaixo de gestor
  var _PAPEIS_VALIDOS = [
    'colaborador', 'habilitador', 'rh', 'financeiro',
    'comunicacao', 'coordenador', 'gestor', 'admin', 'superadmin'
  ];

  // ── Helper compacto ───────────────────────────────────────────────────────
  function _p(v, e, x) { return { visualizar: !!v, editar: !!e, excluir: !!x }; }

  // ── Matriz base: papel → módulo → ação ───────────────────────────────────
  //
  //  Adaptado da matriz v1 (mod_permissoes_v2.gs) para os módulos e papéis do v2.
  //  Leia cada linha como: "o papel X pode [visualizar|editar|excluir] o módulo Y?"
  //
  var _MATRIZ = {

    superadmin: {
      ACOES:       _p(1,1,1), ESPACOS:     _p(1,1,1), PESSOAS:    _p(1,1,1),
      FINANCEIRO:  _p(1,1,1), COMUNICACAO: _p(1,1,1), TAREFAS:    _p(1,1,1),
      REUNIOES:    _p(1,1,1), RELATORIOS:  _p(1,1,1), ADMIN:      _p(1,1,1),
      MASTER:      _p(1,1,1), PUBLICO:     _p(1,1,1)
    },

    admin: {
      // Admin não tem acesso a excluir em FINANCEIRO/PESSOAS (sensível),
      // mas gerencia tudo mais. Vê o painel ADMIN para gerenciar usuários.
      ACOES:       _p(1,1,1), ESPACOS:     _p(1,1,1), PESSOAS:    _p(1,1,0),
      FINANCEIRO:  _p(1,1,0), COMUNICACAO: _p(1,1,1), TAREFAS:    _p(1,1,1),
      REUNIOES:    _p(1,1,1), RELATORIOS:  _p(1,1,0), ADMIN:      _p(1,1,0),
      MASTER:      _p(1,1,0), PUBLICO:     _p(1,1,0)
    },

    gestor: {
      // Visão gerencial ampla: edita projetos, espaços, tarefas.
      // Acesso de leitura a financeiro e pessoas (para acompanhamento).
      // Não acessa painel admin.
      ACOES:       _p(1,1,0), ESPACOS:     _p(1,1,0), PESSOAS:    _p(1,0,0),
      FINANCEIRO:  _p(1,0,0), COMUNICACAO: _p(1,0,0), TAREFAS:    _p(1,1,0),
      REUNIOES:    _p(1,1,0), RELATORIOS:  _p(1,0,0), ADMIN:      _p(0,0,0),
      MASTER:      _p(1,0,0), PUBLICO:     _p(1,0,0)
    },

    financeiro: {
      // Domínio financeiro completo. Lê pessoas para folha/contratos.
      // Sem acesso a comunicação, admin, master.
      ACOES:       _p(1,0,0), ESPACOS:     _p(1,0,0), PESSOAS:    _p(1,0,0),
      FINANCEIRO:  _p(1,1,1), COMUNICACAO: _p(0,0,0), TAREFAS:    _p(1,1,0),
      REUNIOES:    _p(1,0,0), RELATORIOS:  _p(1,1,0), ADMIN:      _p(0,0,0),
      MASTER:      _p(0,0,0), PUBLICO:     _p(0,0,0)
    },

    rh: {
      // Domínio RH/Pessoas completo. Acesso de leitura a financeiro (folha).
      // Sem acesso a comunicação, admin, master.
      ACOES:       _p(1,0,0), ESPACOS:     _p(1,0,0), PESSOAS:    _p(1,1,1),
      FINANCEIRO:  _p(1,0,0), COMUNICACAO: _p(0,0,0), TAREFAS:    _p(1,1,0),
      REUNIOES:    _p(1,0,0), RELATORIOS:  _p(1,1,0), ADMIN:      _p(0,0,0),
      MASTER:      _p(0,0,0), PUBLICO:     _p(0,0,0)
    },

    comunicacao: {
      // Domínio comunicação completo + edita ações e público.
      // Visualiza espaços (para saber o que está disponível). Sem financeiro/pessoas/admin.
      ACOES:       _p(1,1,0), ESPACOS:     _p(1,0,0), PESSOAS:    _p(0,0,0),
      FINANCEIRO:  _p(0,0,0), COMUNICACAO: _p(1,1,1), TAREFAS:    _p(1,1,0),
      REUNIOES:    _p(1,0,0), RELATORIOS:  _p(0,0,0), ADMIN:      _p(0,0,0),
      MASTER:      _p(0,0,0), PUBLICO:     _p(1,1,0)
    },

    coordenador: {
      // Coordenação de projetos/ações — abaixo de gestor.
      // Cria e edita ações, reúniões, agentes, voluntários, parcerias, acervo.
      // Lê financeiro e pessoas para acompanhamento. Sem admin/master.
      ACOES:       _p(1,1,0), ESPACOS:     _p(1,0,0), PESSOAS:    _p(1,0,0),
      FINANCEIRO:  _p(1,0,0), COMUNICACAO: _p(1,0,0), TAREFAS:    _p(1,1,0),
      REUNIOES:    _p(1,1,0), RELATORIOS:  _p(0,0,0), ADMIN:      _p(0,0,0),
      MASTER:      _p(0,0,0), PUBLICO:     _p(1,1,0)
    },

    habilitador: {
      // Equipe de infraestrutura: habilita espaços, confirma reservas sem dono,
      // aprova veículos. Sem financeiro, pessoas (privacidade), admin, master.
      ACOES:       _p(1,0,0), ESPACOS:     _p(1,1,0), PESSOAS:    _p(0,0,0),
      FINANCEIRO:  _p(0,0,0), COMUNICACAO: _p(0,0,0), TAREFAS:    _p(1,1,0),
      REUNIOES:    _p(1,0,0), RELATORIOS:  _p(0,0,0), ADMIN:      _p(0,0,0),
      MASTER:      _p(0,0,0), PUBLICO:     _p(0,0,0)
    },

    colaborador: {
      // Acesso mínimo: vê ações/espaços (como usuário final), gerencia suas tarefas.
      // Sem financeiro, pessoas (privacidade), admin, master.
      ACOES:       _p(1,0,0), ESPACOS:     _p(1,0,0), PESSOAS:    _p(0,0,0),
      FINANCEIRO:  _p(0,0,0), COMUNICACAO: _p(1,0,0), TAREFAS:    _p(1,1,0),
      REUNIOES:    _p(1,0,0), RELATORIOS:  _p(0,0,0), ADMIN:      _p(0,0,0),
      MASTER:      _p(0,0,0), PUBLICO:     _p(1,0,0)
    }

  };

  // ── Hierarquia de edição de papéis ──────────────────────────────────────

  // Papéis que admin (não superadmin) pode atribuir/revogar
  var _PAPEIS_EDITAVEIS_POR_ADMIN = [
    'colaborador', 'habilitador', 'rh', 'financeiro', 'comunicacao', 'coordenador', 'gestor'
  ];

  // ── API ──────────────────────────────────────────────────────────────────

  /**
   * Retorna o objeto de permissões para um email.
   * Chamado por PermissoesService.obter(email).
   *
   * @param {string} email
   * @returns {{ email, perfil_base, permissoes_finais }}
   */
  function obterPermissoes(email) {
    try {
      var acesso = AcessoService.verificar(email);
      var papel  = (acesso && acesso.registro && acesso.registro.papel)
                   ? String(acesso.registro.papel).toLowerCase()
                   : 'colaborador';

      if (_PAPEIS_VALIDOS.indexOf(papel) === -1) papel = 'colaborador';

      return {
        email:             email,
        perfil_base:       papel,
        permissoes_finais: _MATRIZ[papel] || _MATRIZ.colaborador
      };
    } catch (e) {
      return {
        email:             email,
        perfil_base:       'colaborador',
        permissoes_finais: _MATRIZ.colaborador
      };
    }
  }

  /**
   * Retorna o map módulo → {visualizar, editar, excluir} para um papel.
   * Conveniente para incluir no boot sem chamar AcessoService novamente.
   *
   * @param {string} papel
   * @returns {Object}
   */
  function obterMatrizPorPapel(papel) {
    var p = String(papel || '').toLowerCase();
    if (_PAPEIS_VALIDOS.indexOf(p) === -1) p = 'colaborador';
    return _MATRIZ[p] || _MATRIZ.colaborador;
  }

  /**
   * Verifica se o caller pode editar/revogar o targetPapel.
   *
   * @param {string} callerPapel  — papel de quem está operando
   * @param {string} targetPapel  — papel do usuário-alvo
   * @returns {boolean}
   */
  function podeEditarUsuario(callerPapel, targetPapel) {
    var caller = String(callerPapel || '').toLowerCase();
    var target = String(targetPapel || '').toLowerCase();
    if (caller === 'superadmin') return true;
    if (caller === 'admin') return _PAPEIS_EDITAVEIS_POR_ADMIN.indexOf(target) !== -1;
    return false;
  }

  /**
   * Retorna os papéis que o caller pode atribuir (para popular selects).
   *
   * @param {string} callerPapel
   * @returns {string[]}
   */
  function papeisAtribuiveisPor(callerPapel) {
    var caller = String(callerPapel || '').toLowerCase();
    if (caller === 'superadmin') return _PAPEIS_VALIDOS.slice();
    if (caller === 'admin')      return _PAPEIS_EDITAVEIS_POR_ADMIN.slice();
    return [];
  }

  /**
   * Mescla a matriz base do papel com overrides por módulo definidos para o usuário.
   * Apenas os módulos/ações presentes em overrides são substituídos; o restante usa o padrão do papel.
   *
   * @param {string} papel
   * @param {Object} overrides — { MODULO: { visualizar?, editar?, excluir? }, ... }
   * @returns {Object} matriz final módulo → {visualizar, editar, excluir}
   */
  function mergeOverrides(papel, overrides) {
    var p    = String(papel || '').toLowerCase();
    if (_PAPEIS_VALIDOS.indexOf(p) === -1) p = 'colaborador';
    var base = _MATRIZ[p];
    if (!overrides || typeof overrides !== 'object' || Object.keys(overrides).length === 0) return base;
    var result = {};
    _MODULOS.forEach(function(m) {
      var b = base[m] || _p(0,0,0);
      var o = overrides[m];
      result[m] = {
        visualizar: (o && o.visualizar !== undefined) ? !!o.visualizar : b.visualizar,
        editar:     (o && o.editar     !== undefined) ? !!o.editar     : b.editar,
        excluir:    (o && o.excluir    !== undefined) ? !!o.excluir    : b.excluir
      };
    });
    return result;
  }

  // ── Catálogo de features por módulo ─────────────────────────────────────────
  // Fonte de verdade para controles intra-módulo (além de visualizar/editar/excluir).
  // Para adicionar nova feature: inserir aqui. Overrides por usuário funcionam automaticamente.
  // Campos: id (único dentro do módulo), label (exibição), papeis (padrão com acesso).
  var _FEATURES = {
    ACOES: [
      { id: 'publicar_agenda',       label: 'Publicar na agenda pública',          papeis: ['admin','superadmin','comunicacao','coordenador','gestor'] },
      { id: 'aprovar_acao',          label: 'Aprovar / recusar ação',              papeis: ['admin','superadmin','gestor','coordenador'] },
      { id: 'editar_mapa_acao',      label: 'Editar mapa de ação',                 papeis: ['admin','superadmin','gestor','coordenador'] }
    ],
    ESPACOS: [
      { id: 'reservar_espaco',       label: 'Fazer reserva de espaço',             papeis: ['colaborador','habilitador','rh','financeiro','comunicacao','coordenador','gestor','admin','superadmin'] },
      { id: 'aprovar_reserva',       label: 'Aprovar reservas de espaço',          papeis: ['admin','superadmin','gestor','habilitador'] },
      { id: 'gerenciar_espacos',     label: 'Criar / editar / desativar espaços',  papeis: ['admin','superadmin','habilitador'] },
      { id: 'gerenciar_chaves',      label: 'Gerenciar chaves de espaços',         papeis: ['admin','superadmin','habilitador'] },
      { id: 'gerenciar_ativos',      label: 'Gerenciar ativos e inventário',       papeis: ['admin','superadmin','habilitador'] },
      { id: 'reservar_carro',        label: 'Reservar carro institucional',        papeis: ['colaborador','habilitador','rh','financeiro','comunicacao','coordenador','gestor','admin','superadmin'] },
      { id: 'aprovar_reserva_carro', label: 'Aprovar reserva de carro',            papeis: ['admin','superadmin','gestor','habilitador'] }
    ],
    PESSOAS: [
      { id: 'aprovar_ferias',        label: 'Aprovar férias / afastamento',        papeis: ['admin','superadmin','rh','gestor'] },
      { id: 'aprovar_remanejamento', label: 'Aprovar remanejamento',               papeis: ['admin','superadmin','rh','gestor'] },
      { id: 'ver_salario',           label: 'Ver dados salariais',                 papeis: ['admin','superadmin','rh','financeiro'] },
      { id: 'gerar_holerite',        label: 'Gerar / cancelar holerites',          papeis: ['admin','superadmin','rh'] },
      { id: 'lancar_ponto_outros',   label: 'Lançar / editar ponto de outros',     papeis: ['admin','superadmin','rh'] },
      { id: 'gerir_escuta',          label: 'Gerir pesquisas de escuta (Escuta)',  papeis: ['admin','superadmin','rh','comunicacao','coordenador','gestor'] }
    ],
    FINANCEIRO: [
      { id: 'aprovar_contrato',      label: 'Aprovar contratos / aditivos',        papeis: ['admin','superadmin','financeiro','gestor'] },
      { id: 'aprovar_orcamento',     label: 'Aprovar / remanejar orçamento',       papeis: ['admin','superadmin','financeiro','gestor'] },
      { id: 'ver_relatorio_completo',label: 'Ver relatório financeiro completo',   papeis: ['admin','superadmin','financeiro','gestor'] }
    ],
    COMUNICACAO: [
      { id: 'publicar_escuta',       label: 'Publicar pesquisa (Escuta)',          papeis: ['admin','superadmin','comunicacao','coordenador','gestor'] },
      { id: 'enviar_comunicado',     label: 'Enviar comunicado / e-mail em massa', papeis: ['admin','superadmin','comunicacao'] },
      { id: 'gerir_balcao',          label: 'Gerir fila do Balcão',                papeis: ['admin','superadmin','comunicacao','coordenador'] }
    ],
    TAREFAS: [
      { id: 'ver_tarefas_equipe',    label: 'Ver tarefas de toda a equipe',        papeis: ['admin','superadmin','gestor','coordenador','rh'] },
      { id: 'atribuir_tarefas',      label: 'Criar e atribuir tarefas para outros',papeis: ['admin','superadmin','gestor','coordenador','comunicacao'] }
    ],
    REUNIOES: [
      { id: 'criar_pauta',           label: 'Criar / editar pautas',               papeis: ['admin','superadmin','gestor','coordenador'] },
      { id: 'fechar_reuniao',        label: 'Finalizar / arquivar reunião',        papeis: ['admin','superadmin','gestor','coordenador'] }
    ],
    ADMIN: [
      { id: 'gerenciar_usuarios',    label: 'Gerenciar usuários e acessos',        papeis: ['admin','superadmin'] },
      { id: 'configurar_org',        label: 'Configurar organização / expediente', papeis: ['admin','superadmin'] },
      { id: 'banco_de_dados',        label: 'Acessar painel banco de dados',       papeis: ['admin','superadmin'] }
    ]
  };

  /**
   * Retorna map modulo → { feature_id: boolean } para um papel + overrides.
   * Chamado pelo BootService para incluir featuresAtivas no boot.
   *
   * @param {string} papel
   * @param {Object} featuresOverride — { MODULO: { feature_id: boolean }, ... }
   * @returns {Object}
   */
  function obterFeaturesPorPapel(papel, featuresOverride) {
    var p = String(papel || '').toLowerCase();
    if (_PAPEIS_VALIDOS.indexOf(p) === -1) p = 'colaborador';
    var result = {};
    Object.keys(_FEATURES).forEach(function(modulo) {
      result[modulo] = {};
      _FEATURES[modulo].forEach(function(feat) {
        var padrao = feat.papeis.indexOf(p) !== -1;
        var ovr = (featuresOverride && featuresOverride[modulo] && featuresOverride[modulo][feat.id]);
        result[modulo][feat.id] = (ovr !== undefined) ? !!ovr : padrao;
      });
    });
    return result;
  }

  // Labels legíveis para uso no frontend (matrix de permissões por módulo)
  var _MODULO_LABELS = {
    ACOES:       'Ações',        ESPACOS:     'Espaços',
    PESSOAS:     'Pessoas',      FINANCEIRO:  'Financeiro',
    COMUNICACAO: 'Comunicação',  TAREFAS:     'Tarefas',
    REUNIOES:    'Reuniões',     RELATORIOS:  'Relatórios',
    ADMIN:       'Administração',MASTER:      'Master',
    PUBLICO:     'Público'
  };

  return {
    obterPermissoes:        obterPermissoes,
    obterMatrizPorPapel:    obterMatrizPorPapel,
    mergeOverrides:         mergeOverrides,
    obterFeaturesPorPapel:  obterFeaturesPorPapel,
    podeEditarUsuario:      podeEditarUsuario,
    papeisAtribuiveisPor:   papeisAtribuiveisPor,
    MODULOS:                _MODULOS,
    MODULO_LABELS:          _MODULO_LABELS,
    PAPEIS_VALIDOS:         _PAPEIS_VALIDOS,
    PAPEIS_EDITAVEIS_POR_ADMIN: _PAPEIS_EDITAVEIS_POR_ADMIN,
    MATRIZ:                 _MATRIZ,
    FEATURES:               _FEATURES
  };

})();
