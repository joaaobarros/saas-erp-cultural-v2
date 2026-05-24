/**
 * @file modules/parcerias/parceria_engine.gs
 * @layer modules/parcerias
 * @description Engine de Parcerias e Co-Produções.
 *
 * FSM:
 *   proposta → negociacao → ativa → encerrada
 *           → cancelada (em qualquer estado antes de encerrada)
 *
 * @depends parceria_repository.gs, core/services/fsm_guardian.gs,
 *          core/services/auditoria_service.gs, core/event_bus_backend.gs,
 *          core/events_constants.gs, core/utils.gs, core/logger.gs
 */

var ParceriaEngine = (function () {

  var _TIPO = 'parceria';

  var _FSM = {
    proposta:   ['negociacao', 'cancelada'],
    negociacao: ['ativa', 'cancelada'],
    ativa:      ['encerrada', 'cancelada'],
    encerrada:  [],
    cancelada:  []
  };

  FsmGuardian.registrar(_TIPO, _FSM);

  // ─── Criação / Edição ─────────────────────────────────────────────────────

  function salvar(orgId, dados, emailUsuario) {
    if (!dados.nome) throw new Error('nome da parceria é obrigatório.');
    if (dados.tipo && ParceriaRepository.TIPOS.indexOf(dados.tipo) === -1) {
      throw new Error('Tipo inválido. Use: ' + ParceriaRepository.TIPOS.join(', '));
    }

    var eh_novo = !dados.id;
    var parceria;

    if (eh_novo) {
      parceria = {
        id:              gerarId('PAR'),
        orgId:           orgId,
        nome:            dados.nome.trim(),
        cnpj:            dados.cnpj || '',
        tipo:            dados.tipo || 'apoio',
        responsavel:     dados.responsavel || '',
        email:           dados.email || '',
        telefone:        dados.telefone || '',
        descricao:       dados.descricao || '',
        status:          'proposta',
        valorTotal:      dados.valorTotal || 0,
        acoesVinculadas: [],
        entregas:        [],
        historico:       [],
        avaliacao:       null
      };
      SystemEvents.emit(SystemEventTypes.PARTNERSHIP_CREATED, {
        parceiaId: parceria.id, orgId: orgId, emailUsuario: emailUsuario
      });
    } else {
      parceria = ParceriaRepository.buscarPorId(orgId, dados.id);
      if (!parceria) throw new Error('Parceria não encontrada: ' + dados.id);
      if (parceria.status === 'encerrada' || parceria.status === 'cancelada') {
        throw new Error('Parceria encerrada/cancelada não pode ser editada.');
      }
      parceria.nome        = dados.nome.trim();
      parceria.cnpj        = dados.cnpj || parceria.cnpj;
      parceria.tipo        = dados.tipo || parceria.tipo;
      parceria.responsavel = dados.responsavel || parceria.responsavel;
      parceria.email       = dados.email || parceria.email;
      parceria.telefone    = dados.telefone || parceria.telefone;
      parceria.descricao   = dados.descricao || parceria.descricao;
      parceria.valorTotal  = dados.valorTotal !== undefined ? dados.valorTotal : parceria.valorTotal;
    }

    AuditoriaService.registrar(
      eh_novo ? 'parceria_criada' : 'parceria_atualizada',
      'parcerias', { id: parceria.id, nome: parceria.nome, emailUsuario: emailUsuario }
    );
    return ParceriaRepository.salvar(parceria);
  }

  // ─── Transições de Status ─────────────────────────────────────────────────

  function mudarStatus(orgId, id, novoStatus, emailUsuario, motivo) {
    var parceria = ParceriaRepository.buscarPorId(orgId, id);
    if (!parceria) throw new Error('Parceria não encontrada: ' + id);

    FsmGuardian.transitar(_TIPO, parceria.status, novoStatus, { id: id });

    var anterior = parceria.status;
    parceria.status = novoStatus;
    parceria.historico = parceria.historico || [];
    parceria.historico.push({
      de: anterior, para: novoStatus,
      motivo: motivo || '', em: new Date().toISOString(), por: emailUsuario
    });

    AuditoriaService.registrar('parceria_status_alterado', 'parcerias', {
      id: id, de: anterior, para: novoStatus, motivo: motivo, emailUsuario: emailUsuario
    });
    SystemEvents.emit(SystemEventTypes.PARTNERSHIP_STATUS_CHANGED, {
      parceiaId: id, orgId: orgId, de: anterior, para: novoStatus
    });

    return ParceriaRepository.salvar(parceria);
  }

  // ─── Vínculos com Ações ───────────────────────────────────────────────────

  /**
   * Vincula uma Ação à parceria com papel de cada parte.
   */
  function vincularAcao(orgId, id, acaoId, acaoNome, papelParceiro, papelInstituicao) {
    var parceria = ParceriaRepository.buscarPorId(orgId, id);
    if (!parceria) throw new Error('Parceria não encontrada: ' + id);
    if (parceria.status === 'cancelada' || parceria.status === 'encerrada') {
      throw new Error('Não é possível vincular ação a parceria inativa.');
    }

    // Evitar duplicata
    var jaVinculada = (parceria.acoesVinculadas||[]).some(function(v) { return v.acaoId === acaoId; });
    if (jaVinculada) throw new Error('Ação já vinculada a esta parceria.');

    parceria.acoesVinculadas = parceria.acoesVinculadas || [];
    parceria.acoesVinculadas.push({
      acaoId: acaoId,
      acaoNome: acaoNome || '',
      papelParceiro: papelParceiro || '',
      papelInstituicao: papelInstituicao || '',
      vinculadoEm: new Date().toISOString()
    });

    AuditoriaService.registrar('parceria_acao_vinculada', 'parcerias', {
      id: id, acaoId: acaoId
    });
    return ParceriaRepository.salvar(parceria);
  }

  function desvincularAcao(orgId, id, acaoId) {
    var parceria = ParceriaRepository.buscarPorId(orgId, id);
    if (!parceria) throw new Error('Parceria não encontrada: ' + id);
    parceria.acoesVinculadas = (parceria.acoesVinculadas||[]).filter(function(v) {
      return v.acaoId !== acaoId;
    });
    AuditoriaService.registrar('parceria_acao_desvinculada', 'parcerias', { id: id, acaoId: acaoId });
    return ParceriaRepository.salvar(parceria);
  }

  // ─── Entregas ─────────────────────────────────────────────────────────────

  /**
   * Adiciona ou atualiza entrega na parceria.
   * @param {Object} entrega — { id?, descricao, responsavel (parceiro|instituicao), prazo, status }
   */
  function salvarEntrega(orgId, parceiaId, entrega, emailUsuario) {
    var parceria = ParceriaRepository.buscarPorId(orgId, parceiaId);
    if (!parceria) throw new Error('Parceria não encontrada: ' + parceiaId);
    parceria.entregas = parceria.entregas || [];

    if (entrega.id) {
      var idx = parceria.entregas.findIndex(function(e) { return e.id === entrega.id; });
      if (idx >= 0) { parceria.entregas[idx] = entrega; }
      else { parceria.entregas.push(entrega); }
    } else {
      entrega.id = gerarId('ENT');
      entrega.criadoEm = new Date().toISOString();
      parceria.entregas.push(entrega);
    }
    AuditoriaService.registrar('parceria_entrega_salva', 'parcerias', {
      id: parceiaId, entregaId: entrega.id, emailUsuario: emailUsuario
    });
    return ParceriaRepository.salvar(parceria);
  }

  // ─── Avaliação ────────────────────────────────────────────────────────────

  /**
   * Registra avaliação ao encerrar parceria.
   * @param {Object} aval — { nota (1-5), pontos_fortes, pontos_fracos, recomenda (bool) }
   */
  function avaliar(orgId, id, aval, emailUsuario) {
    var parceria = ParceriaRepository.buscarPorId(orgId, id);
    if (!parceria) throw new Error('Parceria não encontrada: ' + id);
    if (parceria.status !== 'encerrada') throw new Error('Só é possível avaliar parcerias encerradas.');
    parceria.avaliacao = {
      nota:         aval.nota || 0,
      pontos_fortes: aval.pontos_fortes || '',
      pontos_fracos: aval.pontos_fracos || '',
      recomenda:    aval.recomenda !== false,
      avaliadorEm:  new Date().toISOString(),
      avaliadorPor: emailUsuario
    };
    AuditoriaService.registrar('parceria_avaliada', 'parcerias', { id: id, emailUsuario: emailUsuario });
    return ParceriaRepository.salvar(parceria);
  }

  // ─── API Pública ──────────────────────────────────────────────────────────

  return {
    salvar:          salvar,
    mudarStatus:     mudarStatus,
    vincularAcao:    vincularAcao,
    desvincularAcao: desvincularAcao,
    salvarEntrega:   salvarEntrega,
    avaliar:         avaliar
  };

})();
