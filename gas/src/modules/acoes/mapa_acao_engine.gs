/**
 * @file modules/acoes/mapa_acao_engine.gs
 * @layer modules/acoes
 * @description Engine de Mapas de Evento.
 *
 * Um MapaAcao representa um LOCAL de execução dentro de uma Ação.
 * Cada mapa contém:
 *   - layers: camadas nomeadas e coloridas (criadas pelo usuário)
 *   - elementos: espaços ou objetos posicionados no canvas SVG
 *
 * Dois modos de criação:
 *   'novo'     — canvas em branco com layers padrão
 *   'espacos'  — importa espaços posicionados (mapaConfig) do mapa CCBJ
 *
 * @depends mapa_acao_repository.gs, acao_repository.gs,
 *          core/services/config_service.gs, core/services/auditoria_service.gs,
 *          modules/espacos/reserva_engine.gs, core/utils.gs
 */

var MapaAcaoEngine = (function () {

  // ─── Layers padrão para novos mapas ─────────────────────────────────────

  function _layersPadrao() {
    var ts = new Date().getTime();
    return [
      {
        id:        'layer_' + ts + '_a',
        nome:      'Estrutura Física',
        descricao: 'Palcos, praticáveis, tendas e delimitações',
        cor:       '#3b82f6',
        icone:     'architecture',
        visivel:   true
      },
      {
        id:        'layer_' + ts + '_b',
        nome:      'Equipamentos',
        descricao: 'Som, luz, audiovisual e demais equipamentos',
        cor:       '#f59e0b',
        icone:     'settings',
        visivel:   true
      },
      {
        id:        'layer_' + ts + '_c',
        nome:      'Logística',
        descricao: 'Mobiliário, controle de fluxo e sinalização',
        cor:       '#10b981',
        icone:     'local_shipping',
        visivel:   true
      }
    ];
  }

  // ─── Criar / Atualizar ────────────────────────────────────────────────────

  /**
   * Cria ou atualiza um MapaAcao (sem importação de espaços reais).
   * @param {Object} dados  — { id?, acaoId*, nome*, descricao?, tipoBase?, layers?, elementos?, terreno? }
   * @param {string} email
   * @param {string} orgId
   */
  function salvar(dados, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    try {
      if (!dados || !dados.acaoId) throw new Error('acaoId é obrigatório.');
      if (!dados.nome || !String(dados.nome).trim()) throw new Error('Nome do local é obrigatório.');

      if (dados.id) {
        // ── Atualizar ────────────────────────────────────────────────────
        var existente = MapaAcaoRepository.buscarPorId(orgId, dados.id);
        if (!existente) throw new Error('Mapa não encontrado: ' + dados.id);

        var campos = ['nome', 'descricao', 'ordem', 'layers', 'elementos', 'terreno'];
        campos.forEach(function(c) {
          if (dados[c] !== undefined) existente[c] = dados[c];
        });

        MapaAcaoRepository.salvar(orgId, existente);
        _auditoria('MAPA_ACAO_ATUALIZADO', existente.id, email, { nome: existente.nome, acaoId: existente.acaoId });
        return { ok: true, id: existente.id };

      } else {
        // ── Criar ────────────────────────────────────────────────────────
        var mapasSiblings = MapaAcaoRepository.buscarPorAcao(orgId, dados.acaoId);
        var novo = {
          id:        'mapaacao_' + new Date().getTime() + '_' + Math.random().toString(36).slice(2, 6),
          acaoId:    dados.acaoId,
          orgId:     orgId,
          nome:      String(dados.nome).trim(),
          descricao: (dados.descricao || '').trim(),
          tipoBase:  dados.tipoBase || 'novo',
          ordem:     mapasSiblings.length,
          layers:    dados.layers    || _layersPadrao(),
          elementos: dados.elementos || [],
          terreno:   dados.terreno   || null,
          criadoPor: email,
          criadoEm:  new Date().toISOString()
        };

        MapaAcaoRepository.salvar(orgId, novo);
        _auditoria('MAPA_ACAO_CRIADO', novo.id, email, { nome: novo.nome, acaoId: novo.acaoId, tipoBase: novo.tipoBase });
        return { ok: true, id: novo.id };
      }

    } catch(e) {
      Logger.error('mapa_acao_engine', 'salvar', e.message);
      return { ok: false, erro: e.message };
    }
  }

  // ─── Criar a partir dos espaços reais ────────────────────────────────────

  /**
   * Cria um MapaAcao importando espaços posicionados do mapa CCBJ.
   * Cada espaço com mapaConfig vira um elemento tipo 'espaco' com espacoOriginalId.
   * O terreno (polígono do campus) é copiado junto.
   *
   * @param {string} acaoId
   * @param {string} nome     — nome do local no evento
   * @param {string} email
   * @param {string} orgId
   */
  function criarDeEspacos(acaoId, nome, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    try {
      if (!acaoId) throw new Error('acaoId é obrigatório.');
      if (!nome || !String(nome).trim()) throw new Error('Nome do local é obrigatório.');

      var espacos  = SistemaConfigService.getEspacos ? SistemaConfigService.getEspacos() : [];
      var terreno  = null;
      try { terreno = SistemaConfigService.getTerreno ? SistemaConfigService.getTerreno(orgId) : null; } catch(_) {}

      var layers  = _layersPadrao();
      var layerId = layers[0].id; // layer padrão: Estrutura Física

      var ts = new Date().getTime();
      var elementos = [];
      espacos.forEach(function(esp, i) {
        if (!esp.mapaConfig || !esp.mapaConfig.cx) return;
        elementos.push({
          id:               'el_' + ts + '_' + i,
          tipo:             'espaco',
          nome:             esp.nome || 'Espaço',
          layerId:          layerId,
          mapaConfig:       JSON.parse(JSON.stringify(esp.mapaConfig)),
          espacoOriginalId: esp.id,
          responsaveis:     esp.responsaveis || [],
          itensNecessarios: esp.itensFixos   || [],
          capacidade:       esp.capacidade   || 0,
          notas:            ''
        });
      });

      var mapasSiblings = MapaAcaoRepository.buscarPorAcao(orgId, acaoId);
      var novo = {
        id:        'mapaacao_' + ts + '_' + Math.random().toString(36).slice(2, 6),
        acaoId:    acaoId,
        orgId:     orgId,
        nome:      String(nome).trim(),
        descricao: 'Importado do mapa de espaços do CCBJ',
        tipoBase:  'espacos',
        ordem:     mapasSiblings.length,
        layers:    layers,
        elementos: elementos,
        terreno:   terreno,
        criadoPor: email,
        criadoEm:  new Date().toISOString()
      };

      MapaAcaoRepository.salvar(orgId, novo);
      _auditoria('MAPA_ACAO_CRIADO', novo.id, email, {
        nome: novo.nome, acaoId: acaoId, tipoBase: 'espacos', elementosImportados: elementos.length
      });
      return { ok: true, id: novo.id, elementosImportados: elementos.length };

    } catch(e) {
      Logger.error('mapa_acao_engine', 'criarDeEspacos', e.message);
      return { ok: false, erro: e.message };
    }
  }

  // ─── Excluir ─────────────────────────────────────────────────────────────

  function excluir(id, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    try {
      var mapa = MapaAcaoRepository.buscarPorId(orgId, id);
      if (!mapa) throw new Error('Mapa não encontrado: ' + id);
      var removido = MapaAcaoRepository.excluir(orgId, id);
      _auditoria('MAPA_ACAO_EXCLUIDO', id, email, { nome: mapa.nome, acaoId: mapa.acaoId });
      return { ok: removido };
    } catch(e) {
      Logger.error('mapa_acao_engine', 'excluir', e.message);
      return { ok: false, erro: e.message };
    }
  }

  // ─── Reservar espaço original ─────────────────────────────────────────────

  /**
   * Cria uma Reserva no espaço original a partir de um elemento do mapa.
   * A reserva fica vinculada à Ação via acaoId.
   *
   * @param {Object} params — { mapaId, elementoId, data, horaInicio, horaTermino, observacoes? }
   * @param {string} email
   * @param {string} orgId
   */
  function reservarEspacoOriginal(params, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    try {
      if (!params.mapaId    ) throw new Error('mapaId é obrigatório.');
      if (!params.elementoId) throw new Error('elementoId é obrigatório.');
      if (!params.data      ) throw new Error('data é obrigatória (YYYY-MM-DD).');
      if (!params.horaInicio) throw new Error('horaInicio é obrigatório (HH:MM).');
      if (!params.horaTermino) throw new Error('horaTermino é obrigatório (HH:MM).');

      var mapa = MapaAcaoRepository.buscarPorId(orgId, params.mapaId);
      if (!mapa) throw new Error('Mapa não encontrado: ' + params.mapaId);

      var elemento = (mapa.elementos || []).filter(function(el) {
        return el.id === params.elementoId;
      })[0];
      if (!elemento) throw new Error('Elemento não encontrado: ' + params.elementoId);
      if (!elemento.espacoOriginalId) throw new Error('Este elemento não tem espaço original vinculado.');

      var acao = AcaoRepository.buscarPorId(orgId, mapa.acaoId);
      if (!acao) throw new Error('Ação não encontrada: ' + mapa.acaoId);

      var dadosReserva = {
        sala:        elemento.espacoOriginalId,
        salaNome:    elemento.nome,
        data:        params.data,
        horaInicio:  params.horaInicio,
        horaTermino: params.horaTermino,
        nomeAcao:    acao.nome,
        tipoAcao:    acao.tipo || '',
        responsavel: params.responsavel || email,
        setor:       params.setor       || acao.setor || '',
        observacoes: params.observacoes || ('Reserva via mapa do evento: ' + mapa.nome),
        acaoId:      mapa.acaoId
      };

      var reserva = ReservaEngine.criar(dadosReserva, email, orgId);
      return { ok: true, reserva: reserva };

    } catch(e) {
      Logger.error('mapa_acao_engine', 'reservarEspacoOriginal', e.message);
      return { ok: false, erro: e.message };
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function _auditoria(evento, id, email, detalhes) {
    try {
      AuditoriaService.registrar({
        acao: evento, entidade: 'mapa_acao', entidadeId: id,
        usuario: email, detalhes: detalhes
      });
    } catch(_) {}
  }

  // ─── Criar a partir de seleção manual ────────────────────────────────────

  /**
   * Cria um MapaAcao com apenas os espaços escolhidos pelo usuário.
   * Espaços CCBJ com mapaConfig usam a posição real; os sem mapaConfig
   * recebem posição automática em grade. Espaços personalizados (sem ID
   * no banco de espaços) são criados como tipo 'espaco_virtual'.
   *
   * @param {Object} params — { acaoId*, nome*, descricao?,
   *                            espacosIds: string[], espacosCustom: [{nome}] }
   * @param {string} email
   * @param {string} orgId
   */
  function criarDeSelecao(params, email, orgId) {
    orgId = orgId || getOrgConfig().orgId;
    try {
      params = params || {};
      if (!params.acaoId) throw new Error('acaoId é obrigatório.');
      if (!params.nome || !String(params.nome).trim()) throw new Error('Nome do local é obrigatório.');

      var espacosIds    = params.espacosIds   || [];
      var espacosCustom = params.espacosCustom || [];

      var todos  = SistemaConfigService.getEspacos ? SistemaConfigService.getEspacos() : [];
      var terreno = null;
      try { terreno = SistemaConfigService.getTerreno ? SistemaConfigService.getTerreno(orgId) : null; } catch(_) {}

      var layers  = _layersPadrao();
      var layerId = layers[0].id;
      var ts      = new Date().getTime();
      var elementos = [];
      var gridIdx = 0;

      function _autoPos(idx) {
        var cols = 4, col = idx % cols, row = Math.floor(idx / cols);
        return { cx: 120 + col * 160, cy: 120 + row * 120 };
      }

      // Espaços CCBJ selecionados
      todos.forEach(function(esp, i) {
        if (espacosIds.indexOf(esp.id) === -1) return;
        var cfg;
        if (esp.mapaConfig && esp.mapaConfig.cx) {
          cfg = JSON.parse(JSON.stringify(esp.mapaConfig));
        } else {
          var pos = _autoPos(gridIdx++);
          cfg = { forma: 'rect', cx: pos.cx, cy: pos.cy, w: 120, h: 80, r: 0, rotacao: 0 };
        }
        elementos.push({
          id:               'el_' + ts + '_s' + i,
          tipo:             'espaco',
          nome:             esp.nome || 'Espaço',
          layerId:          layerId,
          mapaConfig:       cfg,
          espacoOriginalId: esp.id,
          responsaveis:     esp.responsaveis    || [],
          itensNecessarios: esp.itensFixos       || [],
          capacidade:       esp.capacidade       || 0,
          notas:            ''
        });
      });

      // Espaços personalizados (sem vínculo com banco)
      espacosCustom.forEach(function(cust, j) {
        if (!cust || !cust.nome) return;
        var pos = _autoPos(gridIdx++);
        elementos.push({
          id:               'el_' + ts + '_c' + j,
          tipo:             'espaco_virtual',
          nome:             String(cust.nome).trim(),
          layerId:          layerId,
          mapaConfig:       { forma: 'rect', cx: pos.cx, cy: pos.cy, w: 120, h: 80, r: 0, rotacao: 0 },
          espacoOriginalId: null,
          responsaveis:     [],
          itensNecessarios: [],
          capacidade:       0,
          notas:            ''
        });
      });

      var mapasSiblings = MapaAcaoRepository.buscarPorAcao(orgId, params.acaoId);
      var novo = {
        id:        'mapaacao_' + ts + '_' + Math.random().toString(36).slice(2, 6),
        acaoId:    params.acaoId,
        orgId:     orgId,
        nome:      String(params.nome).trim(),
        descricao: (params.descricao || '').trim() || 'Espaços selecionados manualmente',
        tipoBase:  'selecao',
        ordem:     mapasSiblings.length,
        layers:    layers,
        elementos: elementos,
        terreno:   terreno,
        criadoPor: email,
        criadoEm:  new Date().toISOString()
      };

      MapaAcaoRepository.salvar(orgId, novo);
      _auditoria('MAPA_ACAO_CRIADO', novo.id, email, {
        nome: novo.nome, acaoId: params.acaoId, tipoBase: 'selecao',
        espacosCCBJ: espacosIds.length, espacosCustom: espacosCustom.length,
        elementosImportados: elementos.length
      });
      return { ok: true, id: novo.id, elementosImportados: elementos.length };

    } catch(e) {
      Logger.error('mapa_acao_engine', 'criarDeSelecao', e.message);
      return { ok: false, erro: e.message };
    }
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  return {
    salvar:                salvar,
    criarDeEspacos:        criarDeEspacos,
    criarDeSelecao:        criarDeSelecao,
    excluir:               excluir,
    reservarEspacoOriginal: reservarEspacoOriginal
  };

})();
