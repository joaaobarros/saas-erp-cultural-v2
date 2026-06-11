/**
 * @file core/notification_engine.gs
 * @layer core
 * @description Motor de Notificações Transversais — centraliza alertas por email e internos
 *              para todos os módulos do sistema.
 *
 *              RESPONSABILIDADE:
 *              Único ponto de envio de emails de alerta operacional.
 *              Todos os módulos que precisam notificar usuários devem chamar este motor.
 *              NÃO duplicar lógica de email em módulos individuais.
 *
 *              REGRA DE NÃO-HARDCODE: o nome da organização é injetado automaticamente
 *              via {org} em todos os templates — nunca escrever o nome da org no código.
 *
 *              VERIFICAÇÕES DIÁRIAS (via Time-based Triggers):
 *              - notificacoes_verificarDiario() → função global para trigger
 *
 * @depends core/config.gs (getOrgConfig)
 * @depends core/event_bus_backend.gs (SystemEvents)
 * @depends core/logger.gs (Logger)
 */

var NotificationEngine = (function() {

  // Configuração de templates de email por tipo de alerta.
  // {org} é injetado automaticamente em _interpolar() — nunca hardcode o nome da org aqui.
  var _TEMPLATES_EMAIL = {

    processo_prazo_vencido: {
      assunto:  '[{org}] ⚠️ Processo com prazo vencido: {titulo}',
      corpo:    'O processo institucional "{titulo}" está com prazo vencido.\n\n' +
                'Responsável atual: {responsavel}\n' +
                'Status: {status}\n\n' +
                'Acesse o sistema para verificar o andamento: {url}\n\n' +
                '— {org}'
    },
    processo_inativo: {
      assunto:  '[{org}] 🔔 Processo sem atividade: {titulo}',
      corpo:    'O processo "{titulo}" está sem atividade há {dias} dias.\n\n' +
                'Responsável: {responsavel}\n' +
                'Último status: {status}\n\n' +
                'Acesse o sistema para atualizar o processo.\n\n' +
                '— {org}'
    },
    processo_tarefas_atrasadas: {
      assunto:  '[{org}] ⚠️ Tarefas atrasadas no processo: {titulo}',
      corpo:    'O processo "{titulo}" possui {quantidade} tarefa(s) atrasada(s).\n\n' +
                'Acesse o painel de processos para verificar os gargalos.\n\n' +
                '— {org}'
    },
    processo_financeiro_negativo: {
      assunto:  '[{org}] 🚨 Saldo negativo no processo: {titulo}',
      corpo:    'Atenção: o processo "{titulo}" está com saldo financeiro negativo.\n\n' +
                'Previsto: R$ {previsto}\nExecutado: R$ {executado}\n\n' +
                'Acesse o sistema para revisar o orçamento.\n\n' +
                '— {org}'
    },
    tarefa_prazo_proximo: {
      assunto:  '[{org}] 📅 Tarefa próxima do prazo: {titulo}',
      corpo:    'A tarefa "{titulo}" vence em menos de 24 horas.\n\n' +
                'Prazo: {prazo}\nStatus atual: {status}\n\n' +
                'Acesse o sistema para atualizar o andamento.\n\n' +
                '— {org}'
    },
    tarefa_atrasada: {
      assunto:  '[{org}] ⚠️ Tarefa atrasada: {titulo}',
      corpo:    'A tarefa "{titulo}" está atrasada.\n\n' +
                'Prazo era: {prazo}\nStatus atual: {status}\nResponsável: {responsavel}\n\n' +
                '— {org}'
    },
    chave_atrasada: {
      assunto:  '[{org}] 🔑 Chave não devolvida: {ref}',
      corpo:    'A chave "{ref}" ainda não foi devolvida.\n\n' +
                'Responsável: {responsavel}\nData prevista: {prazo}\n\n' +
                'Por favor, providencie a devolução urgentemente.\n\n' +
                '— {org}'
    },
    contrato_vencendo: {
      assunto:  '[{org}] 📋 Contrato vence em breve: {ref}',
      corpo:    'O contrato "{ref}" vence em {dias} dias.\n\n' +
                'Verifique se é necessário renovar ou encerrar.\n\n' +
                '— {org}'
    },
    reuniao_ata_pendente: {
      assunto:  '[{org}] 📝 Ata pendente de aprovação: {titulo}',
      corpo:    'A reunião "{titulo}" tem ata aguardando aprovação há {dias} dias.\n\n' +
                'Acesse o módulo de Reuniões para aprovar.\n\n' +
                '— {org}'
    },
    encaminhamento_atribuido: {
      assunto:  '[{org}] 📋 Encaminhamento atribuído a você: {texto}',
      corpo:    'Você recebeu um novo encaminhamento na reunião "{reuniao}".\n\n' +
                'Encaminhamento: {texto}\n' +
                'Prazo: {prazo}\n\n' +
                'Acesse o módulo de Reuniões para acompanhar.\n\n' +
                '— {org}'
    }
  };

  function _agora() { return new Date().toISOString(); }

  /**
   * Nome curto da organização — NUNCA hardcode; sempre lê de getOrgConfig().
   */
  function _getNomeOrg() {
    try { return getOrgConfig().nome || 'Sistema'; } catch(_) { return 'Sistema'; }
  }

  /**
   * Interpola {variavel} no template. Injeta automaticamente {org} com o nome
   * da organização configurada — zero hardcode necessário nos templates.
   */
  function _interpolar(template, dados) {
    var contexto = Object.assign({ org: _getNomeOrg() }, dados);
    return template.replace(/\{(\w+)\}/g, function(match, chave) {
      return contexto[chave] !== undefined ? String(contexto[chave]) : match;
    });
  }

  function _getAppUrl() {
    try { return ScriptApp.getService().getUrl() || ''; } catch(_) { return ''; }
  }

  function _isDesligado(email) {
    try {
      var c = ColaboradorRepository.buscarPorEmail(getOrgConfig().orgId, email);
      return !!(c && c.status === 'desligado');
    } catch(_e) { return false; }
  }

  function _enviarEmail(destinatario, assunto, corpo) {
    try {
      if (!destinatario || !destinatario.includes('@')) return false;
      // Bloquear emails para colaborador em processo de desligamento (flag setada por PessoasEngine)
      if (typeof EMAILS_BLOQUEADOS_DESLIGAMENTO_ATIVO !== 'undefined' &&
          Array.isArray(EMAILS_BLOQUEADOS_DESLIGAMENTO_ATIVO) &&
          EMAILS_BLOQUEADOS_DESLIGAMENTO_ATIVO.indexOf(String(destinatario).toLowerCase().trim()) !== -1) {
        Logger.info('[NotificationEngine] email bloqueado — desligamento em curso: ' + destinatario);
        return false;
      }
      if (_isDesligado(destinatario)) {
        Logger.info('[NotificationEngine] email ignorado — colaborador desligado: ' + destinatario);
        return false;
      }
      GmailApp.sendEmail(destinatario, assunto, corpo);

      SystemEvents.emit(SystemEventTypes.NOTIFICACAO_EMAIL_ENVIADA, {
        entidade:   'notificacao',
        entidadeId: '',
        usuario:    'sistema',
        contexto:   { destinatario: destinatario, assunto: assunto }
      });

      return true;
    } catch(e) {
      Logger.warn('[NotificationEngine._enviarEmail] Falha para ' + destinatario + ': ' + e.message);
      SystemEvents.emit(SystemEventTypes.NOTIFICACAO_FALHA, {
        entidade:   'notificacao',
        entidadeId: '',
        usuario:    'sistema',
        contexto:   { destinatario: destinatario, erro: e.message }
      });
      return false;
    }
  }

  return {

    // ── Alerta de Processo ────────────────────────────────────────────────────

    enviarAlertaProcesso: function(alerta) {
      var tipo    = 'processo_' + (alerta.tipo || 'alerta');
      var tpl     = _TEMPLATES_EMAIL[tipo] || _TEMPLATES_EMAIL['processo_inativo'];
      var dados   = Object.assign({
        url:        _getAppUrl(),
        responsavel: alerta.destinatario || '',
        dias:       alerta.diasSemAtividade || '',
        quantidade: alerta.quantidade || '',
        previsto:   (alerta.previsto || 0).toFixed(2),
        executado:  (alerta.executado || 0).toFixed(2)
      }, alerta);

      var assunto = _interpolar(tpl.assunto, dados);
      var corpo   = _interpolar(tpl.corpo,   dados);

      return _enviarEmail(alerta.destinatario, assunto, corpo);
    },

    // ── Alertas de Tarefas ────────────────────────────────────────────────────

    enviarAlertaTarefas: function(tarefasAtrasadas, destinatario) {
      if (!tarefasAtrasadas || !tarefasAtrasadas.length) return 0;
      var enviados = 0;

      tarefasAtrasadas.forEach(function(tarefa) {
        var tpl  = _TEMPLATES_EMAIL.tarefa_atrasada;
        var dados = {
          titulo:      tarefa.titulo      || tarefa.id,
          prazo:       tarefa.prazo       || 'sem prazo',
          status:      tarefa.status      || '',
          responsavel: tarefa.responsavel || destinatario || ''
        };
        var dest = tarefa.responsavel || destinatario;
        if (_enviarEmail(dest, _interpolar(tpl.assunto, dados), _interpolar(tpl.corpo, dados))) {
          enviados++;
        }
      });

      return enviados;
    },

    // ── Alerta de prazo próximo ───────────────────────────────────────────────

    enviarAlertaPrazoProximo: function(tarefa) {
      var tpl   = _TEMPLATES_EMAIL.tarefa_prazo_proximo;
      var dados = {
        titulo:  tarefa.titulo || tarefa.id,
        prazo:   tarefa.prazo  || '',
        status:  tarefa.status || ''
      };
      return _enviarEmail(
        tarefa.responsavel,
        _interpolar(tpl.assunto, dados),
        _interpolar(tpl.corpo, dados)
      );
    },

    // ── Alerta de chave atrasada ──────────────────────────────────────────────

    enviarAlertaChaveAtrasada: function(chave, destinatario) {
      var tpl   = _TEMPLATES_EMAIL.chave_atrasada;
      var dados = {
        ref:         chave.ref         || chave.id || '',
        responsavel: chave.responsavel || destinatario || '',
        prazo:       chave.prazo       || chave.dataDevolvida || ''
      };
      return _enviarEmail(
        destinatario || chave.responsavel,
        _interpolar(tpl.assunto, dados),
        _interpolar(tpl.corpo, dados)
      );
    },

    // ── Alerta de contrato vencendo ───────────────────────────────────────────

    enviarAlertaContratoVencendo: function(contrato, destinatario, diasParaVencer) {
      var tpl   = _TEMPLATES_EMAIL.contrato_vencendo;
      var dados = {
        ref:  contrato.descricao || contrato.nome || contrato.id,
        dias: diasParaVencer || 30
      };
      return _enviarEmail(
        destinatario,
        _interpolar(tpl.assunto, dados),
        _interpolar(tpl.corpo, dados)
      );
    },

    // ── Alerta de ata pendente ────────────────────────────────────────────────

    enviarAlertaAtaPendente: function(reuniao, destinatario, diasPendente) {
      var tpl   = _TEMPLATES_EMAIL.reuniao_ata_pendente;
      var dados = {
        titulo: reuniao.titulo || reuniao.id,
        dias:   diasPendente || 0
      };
      return _enviarEmail(
        destinatario,
        _interpolar(tpl.assunto, dados),
        _interpolar(tpl.corpo, dados)
      );
    },

    // ── Notificação de encaminhamento atribuído ───────────────────────────────

    enviarNotificacaoEncaminhamento: function(encaminhamento, reuniao) {
      var responsavel = encaminhamento.responsavel || '';
      if (!responsavel || !responsavel.includes('@')) return false;
      var tpl   = _TEMPLATES_EMAIL.encaminhamento_atribuido;
      var dados = {
        texto:  encaminhamento.texto  || '',
        reuniao: reuniao ? (reuniao.titulo || reuniao.id || '') : '',
        prazo:  encaminhamento.prazo  || 'Sem prazo definido'
      };
      return _enviarEmail(
        responsavel,
        _interpolar(tpl.assunto, dados),
        _interpolar(tpl.corpo, dados)
      );
    },

    // ── Alerta de Solicitação Interna ─────────────────────────────────────────

    enviarAlertaSolicitacao: function(alerta) {
      if (!alerta.destinatario || !alerta.destinatario.includes('@')) return false;

      // {org} é injetado automaticamente por _interpolar() — não hardcode o nome da org aqui
      var assuntos = {
        nova_solicitacao:  '[{org}] Nova Solicitação Aguarda Análise — {protocolo}',
        inativa:           '[{org}] Solicitação sem movimentação: {protocolo}',
        prazo_vencido:     '[{org}] Prazo vencido — Solicitação {protocolo}',
        saldo_insuficiente:'[{org}] Saldo insuficiente — Solicitação {protocolo}'
      };
      var corpos = {
        nova_solicitacao:  'A solicitação {protocolo} — "{titulo}" está aguardando análise.\n\nResponsável: {destinatario}\n\nAcesse o sistema para analisar.\n\n— {org}',
        inativa:           'A solicitação {protocolo} — "{titulo}" está sem movimentação há mais de 3 dias.\n\nAcesse o sistema para verificar.\n\n— {org}',
        prazo_vencido:     'A data de necessidade da solicitação {protocolo} — "{titulo}" já venceu.\n\nAcesse o sistema para providenciar.\n\n— {org}',
        saldo_insuficiente:'A solicitação {protocolo} possui saldo orçamentário insuficiente.\n\nAcesse o sistema para verificar a rubrica vinculada.\n\n— {org}'
      };

      var tipo   = alerta.tipo || 'inativa';
      var assunto = _interpolar(assuntos[tipo] || assuntos.inativa, alerta);
      var corpo   = _interpolar(corpos[tipo]   || corpos.inativa,  alerta);

      return _enviarEmail(alerta.destinatario, assunto, corpo);
    },

    // ── Verificação diária completa ───────────────────────────────────────────

    verificarTodosAlertasDiario: function() {
      var resultado = {
        processosVerificados: 0,
        tarefasVerificadas:   0,
        chaveVerificadas:     0,
        contratosVerificados: 0,
        reunioesVerificadas:  0,
        emailsEnviados:       0,
        erros:                []
      };

      // ── Processos Institucionais ─────────────────────────────────────────────
      try {
        var alertasProc = ProcessoInstitucionalEngine.detectarAlertas();
        resultado.processosVerificados = alertasProc.length;
        alertasProc.forEach(function(alerta) {
          try {
            if (NotificationEngine.enviarAlertaProcesso(alerta)) {
              resultado.emailsEnviados++;
            }
          } catch(e) {
            resultado.erros.push('processo/' + alerta.processoId + ': ' + e.message);
          }
        });
      } catch(e) {
        resultado.erros.push('processos: ' + e.message);
      }

      // ── Tarefas próximas do prazo (< 24h) ────────────────────────────────────
      try {
        var agora    = Date.now();
        var limite24h = agora + 86400000;
        var tarefas  = TarefaRepository.listar();
        resultado.tarefasVerificadas = tarefas.length;

        tarefas.forEach(function(t) {
          if (!t.prazo || !t.responsavel) return;
          if (t.status === 'concluida' || t.status === 'cancelada') return;
          var prazoMs = new Date(t.prazo).getTime();
          if (prazoMs > agora && prazoMs <= limite24h) {
            try {
              if (NotificationEngine.enviarAlertaPrazoProximo(t)) resultado.emailsEnviados++;
            } catch(e) {
              resultado.erros.push('tarefa/prazo/' + t.id + ': ' + e.message);
            }
          }
        });
      } catch(e) {
        resultado.erros.push('tarefas: ' + e.message);
      }

      // ── Contratos vencendo em 30 dias ────────────────────────────────────────
      try {
        var agora30   = Date.now() + (30 * 86400000);
        var contratacoes = lerJSON('contratacoes.json') || [];
        resultado.contratosVerificados = contratacoes.length;
        contratacoes.forEach(function(c) {
          if (!c.dataFim || !c.responsavel) return;
          if (c.status === 'encerrado' || c.status === 'cancelado') return;
          var vencimento = new Date(c.dataFim).getTime();
          if (vencimento > Date.now() && vencimento <= agora30) {
            var dias = Math.ceil((vencimento - Date.now()) / 86400000);
            try {
              if (NotificationEngine.enviarAlertaContratoVencendo(c, c.responsavel, dias)) {
                resultado.emailsEnviados++;
              }
            } catch(e) {
              resultado.erros.push('contrato/' + c.id + ': ' + e.message);
            }
          }
        });
      } catch(e) {
        resultado.erros.push('contratos: ' + e.message);
      }

      // ── Atas de reunião pendentes > 7 dias ───────────────────────────────────
      try {
        var reunioes = lerJSON('reunioes.json') || [];
        resultado.reunioesVerificadas = reunioes.length;
        var limite7d = 7 * 86400000;
        reunioes.forEach(function(r) {
          if (r.status !== 'ata_rascunho') return;
          if (!r.organizador) return;
          var diasPend = r.atualizadoEm
            ? Math.floor((Date.now() - new Date(r.atualizadoEm).getTime()) / 86400000)
            : 0;
          if (diasPend > 7) {
            try {
              if (NotificationEngine.enviarAlertaAtaPendente(r, r.organizador, diasPend)) {
                resultado.emailsEnviados++;
              }
            } catch(e) {
              resultado.erros.push('reuniao/' + r.id + ': ' + e.message);
            }
          }
        });
      } catch(e) {
        resultado.erros.push('reunioes: ' + e.message);
      }

      // ── Solicitações internas com pendências ──────────────────────────────────
      try {
        var pendenciasSol = SolicitacaoEngine.detectarPendencias();
        pendenciasSol.forEach(function(p) {
          try {
            if (NotificationEngine.enviarAlertaSolicitacao(p)) resultado.emailsEnviados++;
          } catch(e) {
            resultado.erros.push('solicitacao/' + p.solicitacaoId + ': ' + e.message);
          }
        });
      } catch(e) {
        resultado.erros.push('solicitacoes: ' + e.message);
      }

      Logger.info('[NotificationEngine.verificarTodosAlertasDiario] Resultado: ' + JSON.stringify({
        emails: resultado.emailsEnviados, erros: resultado.erros.length
      }));

      return resultado;
    }
  };
})();

// ── Trigger global (configurar como Time-based Trigger, diário) ───────────────

// ─── Aprovação por token de email ─────────────────────────────────────────────
// Funções auxiliares para gerar e enviar links de aprovação com TokenService.

var NotificationEngineTokens = (function() {

  function _getAppUrl() {
    try { return ScriptApp.getService().getUrl() || ''; } catch(_) { return ''; }
  }

  function _getNomeOrg() {
    try { return getOrgConfig().nome || 'Sistema'; } catch(e) { return 'Sistema'; }
  }

  function _linkAprovar(token) {
    return _getAppUrl() + '?secao=token_acao&token=' + token + '&acao=aprovar';
  }

  function _linkRecusar(token) {
    return _getAppUrl() + '?secao=token_acao&token=' + token + '&acao=recusar';
  }

  /**
   * Envia email de aprovação de férias/afastamento com links de aprovar/recusar.
   * @param {Object} dados — { emailGestor, colaboradorNome, periodo, afastamentoId, orgId }
   */
  function enviarSolicitacaoFerias(dados) {
    dados = dados || {};
    var token = TokenService.gerar({
      tipo: 'aprovacao_ferias',
      entidadeId: dados.afastamentoId,
      acao: 'aprovar',
      emailDestinatario: dados.emailGestor,
      orgId: dados.orgId
    });

    var org  = _getNomeOrg();
    var subj = '[' + org + '] Aprovação de férias — ' + (dados.colaboradorNome || '');
    var body = 'Solicitação de férias/afastamento pendente de aprovação.\n\n' +
               'Colaborador: ' + (dados.colaboradorNome || '') + '\n' +
               'Período: '     + (dados.periodo || '') + '\n\n' +
               '✅ APROVAR:\n' + _linkAprovar(token) + '\n\n' +
               '✖️ RECUSAR:\n' + _linkRecusar(token) + '\n\n' +
               'Este link expira em 72 horas.\n\n— ' + org;

    try {
      GmailApp.sendEmail(dados.emailGestor, subj, body);
      Logger.info('notification_engine_tokens', 'enviarSolicitacaoFerias',
        'Email enviado para ' + dados.emailGestor);
    } catch(e) {
      Logger.warn('notification_engine_tokens', 'enviarSolicitacaoFerias', e.message);
    }
    return token;
  }

  /**
   * Envia email de aprovação de remanejamento orçamentário.
   * @param {Object} dados — { emailAprovador, remanejamentoId, descricao, valor, orgId }
   */
  function enviarSolicitacaoRemanejamento(dados) {
    dados = dados || {};
    var token = TokenService.gerar({
      tipo: 'aprovacao_remanejamento',
      entidadeId: dados.remanejamentoId,
      acao: 'aprovar',
      emailDestinatario: dados.emailAprovador,
      orgId: dados.orgId
    });

    var org  = _getNomeOrg();
    var subj = '[' + org + '] Aprovação de remanejamento — ' + (dados.remanejamentoId || '');
    var body = 'Remanejamento orçamentário pendente de aprovação.\n\n' +
               'ID: '        + (dados.remanejamentoId || '') + '\n' +
               'Descrição: ' + (dados.descricao || '') + '\n' +
               'Valor: R$ '  + (dados.valor || '') + '\n\n' +
               '✅ APROVAR:\n' + _linkAprovar(token) + '\n\n' +
               '✖️ RECUSAR:\n' + _linkRecusar(token) + '\n\n' +
               'Este link expira em 72 horas.\n\n— ' + org;

    try {
      GmailApp.sendEmail(dados.emailAprovador, subj, body);
    } catch(e) {
      Logger.warn('notification_engine_tokens', 'enviarSolicitacaoRemanejamento', e.message);
    }
    return token;
  }

  /**
   * Envia email de aprovação de aditivo contratual.
   * @param {Object} dados — { emailAprovador, aditivoId, descricao, orgId }
   */
  function enviarSolicitacaoAditivo(dados) {
    dados = dados || {};
    var token = TokenService.gerar({
      tipo: 'aprovacao_aditivo',
      entidadeId: dados.aditivoId,
      acao: 'aprovar',
      emailDestinatario: dados.emailAprovador,
      orgId: dados.orgId
    });

    var org  = _getNomeOrg();
    var subj = '[' + org + '] Aprovação de aditivo — ' + (dados.aditivoId || '');
    var body = 'Aditivo contratual pendente de aprovação.\n\n' +
               'ID: '        + (dados.aditivoId || '') + '\n' +
               'Descrição: ' + (dados.descricao || '') + '\n\n' +
               '✅ APROVAR:\n' + _linkAprovar(token) + '\n\n' +
               '✖️ RECUSAR:\n' + _linkRecusar(token) + '\n\n' +
               'Este link expira em 72 horas.\n\n— ' + org;

    try {
      GmailApp.sendEmail(dados.emailAprovador, subj, body);
    } catch(e) {
      Logger.warn('notification_engine_tokens', 'enviarSolicitacaoAditivo', e.message);
    }
    return token;
  }

  return {
    enviarSolicitacaoFerias:        enviarSolicitacaoFerias,
    enviarSolicitacaoRemanejamento: enviarSolicitacaoRemanejamento,
    enviarSolicitacaoAditivo:       enviarSolicitacaoAditivo
  };

})();
function notificacoes_verificarDiario() {
  try {
    return NotificationEngine.verificarTodosAlertasDiario();
  } catch(e) {
    Logger.warn('[trigger notificacoes_verificarDiario] ' + e.message);
  }
}
