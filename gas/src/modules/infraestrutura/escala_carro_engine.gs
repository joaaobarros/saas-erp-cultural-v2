/**
 * @file modules/infraestrutura/escala_carro_engine.gs
 * @layer modules/infraestrutura
 * @description Engine de Escala de Disponibilidade de Veículos.
 *
 *   Regras de negócio:
 *   - Apenas habilitador, admin, superadmin e gestor com setor 'infraestrutura'
 *     podem criar, editar ou remover escalas.
 *   - Escala ausente = veículo livre (escala restringe, não habilita).
 *   - calcularDisponibilidade() considera janelas de escala, reservas aprovadas
 *     e o tempo de deslocamento entre o ponto de chegada da última reserva e o
 *     ponto de partida da nova, acrescido de 5 minutos de buffer.
 *   - Cálculo de tempo de rota: Maps.newDirectionFinder() (GAS Maps service).
 *
 * @depends modules/infraestrutura/escala_carro_repository.gs,
 *          modules/infraestrutura/veiculos_repository.gs,
 *          modules/infraestrutura/reserva_carro_repository.gs,
 *          core/services/acesso_service.gs,
 *          core/services/auditoria_service.gs
 */

var EscalaCarroEngine = (function() {

  var BUFFER_MIN = 5; // minutos extras de garantia em todo deslocamento

  // ── Helpers de permissão ────────────────────────────────────────────────────

  function _getRegistro(email) {
    try {
      var a = AcessoService.verificar(email);
      return (a && a.registro) ? a.registro : {};
    } catch(_) { return {}; }
  }

  /**
   * Verifica se o usuário pode gerenciar veículos e escalas.
   * Habilitadores, admin e superadmin têm acesso irrestrito.
   * Gestores precisam ter 'infraestrutura' em setoresGerenciados.
   */
  function podAprovarCarro(email) {
    var reg   = _getRegistro(email);
    var papel = (reg.papel || '').toLowerCase();
    if (['habilitador', 'admin', 'superadmin'].indexOf(papel) >= 0) return true;
    if (papel === 'gestor') {
      var setores = Array.isArray(reg.setoresGerenciados) ? reg.setoresGerenciados : [];
      return setores.indexOf('infraestrutura') >= 0;
    }
    return false;
  }

  function _getOrgId() { return getOrgConfig().orgId; }

  // ── Helpers de horário ──────────────────────────────────────────────────────

  function _horaParaMin(hora) {
    if (!hora) return -1;
    var p = String(hora).split(':');
    var h = parseInt(p[0], 10), m = parseInt(p[1], 10);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  }

  function _minParaHora(min) {
    if (min < 0) return '00:00';
    var h = Math.floor(min / 60);
    var m = min % 60;
    return (h < 10 ? '0' + h : String(h)) + ':' + (m < 10 ? '0' + m : String(m));
  }

  // ── Cálculo de tempo entre dois locais ──────────────────────────────────────

  /**
   * Estima tempo de viagem em minutos entre dois endereços usando GAS Maps.
   * Retorna BUFFER_MIN como fallback em caso de erro (distância desconhecida = buffer mínimo).
   */
  function _calcularTempoEntre(origem, destino) {
    if (!origem || !destino || origem === destino) return 0;
    try {
      var finder = Maps.newDirectionFinder()
        .setOrigin(String(origem))
        .setDestination(String(destino))
        .setMode(Maps.DirectionFinder.Mode.DRIVING);
      var res = finder.getDirections();
      if (!res || !res.routes || !res.routes.length) return BUFFER_MIN;
      var legs = res.routes[0].legs;
      if (!legs || !legs.length) return BUFFER_MIN;
      var segundos = 0;
      for (var i = 0; i < legs.length; i++) {
        segundos += (legs[i].duration && legs[i].duration.value) ? legs[i].duration.value : 0;
      }
      return Math.ceil(segundos / 60);
    } catch(e) {
      Logger.warn('escala_carro_engine', '_calcularTempoEntre', e.message);
      return BUFFER_MIN;
    }
  }

  // ── Janelas de escala ───────────────────────────────────────────────────────

  /**
   * Retorna janelas de disponibilidade definidas pela escala para o dia/veículo.
   * Se não houver escala cadastrada, retorna [] — interpretado como livre o dia inteiro.
   *
   * @returns {Array<{inicio: string, fim: string}>}
   */
  function getJanelasNaData(data, veiculoId, orgId) {
    return EscalaCarroRepository.listarParaData(data, veiculoId || 'default', orgId);
  }

  // ── Disponibilidade ─────────────────────────────────────────────────────────

  /**
   * Calcula janelas disponíveis no dia, considerando:
   *   1. Janelas permitidas pela escala (vazio = livre o dia inteiro).
   *   2. Reservas APROVADAS do veículo na data (bloqueios).
   *   3. Tempo de deslocamento do ponto de chegada de cada reserva até localSaida + BUFFER_MIN.
   *
   * @param {string} data         — 'YYYY-MM-DD'
   * @param {string} localSaida   — endereço de partida da nova reserva
   * @param {string} veiculoId
   * @param {string} orgId
   * @param {string} [ignorarId]  — ID de reserva a ignorar (edição)
   * @returns {{ janelas: Array, bloqueios: Array, proximoHorario: string|null }}
   *
   *   janelas:  [{inicio, fim}] livres após subtrair bloqueios+buffers das janelas permitidas
   *   bloqueios: [{inicio, fim, descricao}] slots ocupados (reserva + buffer de deslocamento)
   *   proximoHorario: 'HH:MM' primeiro minuto disponível considerando hora atual (ou null)
   */
  function calcularDisponibilidade(data, localSaida, veiculoId, orgId, ignorarId) {
    var vid = veiculoId || 'default';

    var janelasEscala  = getJanelasNaData(data, vid, orgId);
    var reservasAprov  = ReservaCarroRepository.listarAprovadasNaData(data, vid, orgId);

    // Ordena reservas por horaSaida
    reservasAprov.sort(function(a, b) {
      return _horaParaMin(a.horaSaida) - _horaParaMin(b.horaSaida);
    });

    // Monta lista de bloqueios: cada reserva + janela de buffer após ela
    var bloqueios = [];
    reservasAprov.forEach(function(r) {
      if (ignorarId && r.id === ignorarId) return;
      var fimReserva = _horaParaMin(r.horaChegadaEstimada || r.horaChegada);
      bloqueios.push({
        inicio:    _horaParaMin(r.horaSaida),
        fim:       fimReserva,
        descricao: 'Reserva ' + r.horaSaida + '–' + (r.horaChegadaEstimada || r.horaChegada)
      });

      // Buffer de deslocamento: localChegada da reserva → localSaida da nova
      var localChegadaReserva = (r.rota && r.rota.localChegada) ? r.rota.localChegada : '';
      if (localChegadaReserva && localSaida) {
        var tempoDeslocMin = _calcularTempoEntre(localChegadaReserva, localSaida);
        var bufferTotal    = tempoDeslocMin + BUFFER_MIN;
        if (bufferTotal > 0) {
          bloqueios.push({
            inicio:    fimReserva,
            fim:       fimReserva + bufferTotal,
            descricao: 'Buffer deslocamento (' + bufferTotal + ' min)',
            isBuffer:  true
          });
        }
      }
    });

    // Janelas livres = janelas permitidas minus bloqueios
    // Se não há escala → considera 00:00–23:59 como janela única
    var BASE_INICIO = 0;
    var BASE_FIM    = 23 * 60 + 59;
    var janelasBase = janelasEscala.length > 0
      ? janelasEscala.map(function(j) {
          return { inicio: _horaParaMin(j.inicio), fim: _horaParaMin(j.fim) };
        })
      : [{ inicio: BASE_INICIO, fim: BASE_FIM }];

    // Subtrai bloqueios das janelas base usando interval subtraction
    var livres = janelasBase;
    bloqueios.forEach(function(b) {
      var novas = [];
      livres.forEach(function(j) {
        if (b.fim <= j.inicio || b.inicio >= j.fim) {
          // sem sobreposição
          novas.push(j);
        } else {
          // parte antes do bloqueio
          if (b.inicio > j.inicio) novas.push({ inicio: j.inicio, fim: b.inicio });
          // parte após o bloqueio
          if (b.fim < j.fim)       novas.push({ inicio: b.fim,    fim: j.fim    });
        }
      });
      livres = novas;
    });

    // Filtra janelas com duração mínima de 1 minuto
    livres = livres.filter(function(j) { return j.fim - j.inicio >= 1; });

    var janelasFormatadas  = livres.map(function(j) {
      return { inicio: _minParaHora(j.inicio), fim: _minParaHora(j.fim) };
    });
    var bloqueiosFormatados = bloqueios.map(function(b) {
      return {
        inicio:    _minParaHora(b.inicio),
        fim:       _minParaHora(b.fim),
        descricao: b.descricao,
        isBuffer:  !!b.isBuffer
      };
    });

    // Próximo horário disponível a partir de agora
    var proximoHorario = null;
    var agoraMins = _horaAtualMin();
    for (var k = 0; k < livres.length; k++) {
      if (livres[k].fim > agoraMins) {
        proximoHorario = _minParaHora(Math.max(livres[k].inicio, agoraMins));
        break;
      }
    }

    return {
      janelas:        janelasFormatadas,
      bloqueios:      bloqueiosFormatados,
      proximoHorario: proximoHorario
    };
  }

  function _horaAtualMin() {
    try {
      var tz  = getOrgConfig().timezone || 'America/Fortaleza';
      var agr = Utilities.formatDate(new Date(), tz, 'HH:mm');
      return _horaParaMin(agr);
    } catch(_) { return 0; }
  }

  // ── Cálculo de rota completa ────────────────────────────────────────────────

  /**
   * Calcula tempo total de viagem e sugere horário de chegada.
   * Usa Maps.newDirectionFinder() com waypoints para paradas intermediárias.
   * Adiciona BUFFER_MIN ao tempo retornado pelo Maps.
   *
   * @param {{ origem, destino, paradas, data, hora }} params
   * @returns {{ minutos, km, horaChegadaSugerida }}
   */
  function calcularTempoRota(params) {
    if (!params.origem || !params.destino) throw new Error('Origem e destino são obrigatórios.');
    try {
      var finder = Maps.newDirectionFinder()
        .setOrigin(String(params.origem))
        .setDestination(String(params.destino))
        .setMode(Maps.DirectionFinder.Mode.DRIVING);

      var paradas = Array.isArray(params.paradas) ? params.paradas : [];
      paradas.forEach(function(p) {
        var local = (typeof p === 'string') ? p : (p.local || '');
        if (local) finder.addWaypoint(local);
      });

      var res = finder.getDirections();
      if (!res || !res.routes || !res.routes.length) throw new Error('Nenhuma rota encontrada.');

      var legs = res.routes[0].legs;
      var totalSeg  = 0;
      var totalMtrs = 0;
      for (var i = 0; i < legs.length; i++) {
        totalSeg  += (legs[i].duration && legs[i].duration.value)  ? legs[i].duration.value  : 0;
        totalMtrs += (legs[i].distance && legs[i].distance.value)  ? legs[i].distance.value  : 0;
      }

      var minutos = Math.ceil(totalSeg / 60) + BUFFER_MIN;
      var km      = Math.round(totalMtrs / 100) / 10;

      // Calcula hora de chegada sugerida
      var horaSaidaMin = _horaParaMin(params.hora || '08:00');
      var chegadaMin   = horaSaidaMin + minutos;
      var horaChegadaSugerida = _minParaHora(chegadaMin);

      return { minutos: minutos, km: km, horaChegadaSugerida: horaChegadaSugerida };
    } catch(e) {
      Logger.warn('escala_carro_engine', 'calcularTempoRota', e.message);
      throw new Error('Não foi possível calcular a rota: ' + e.message);
    }
  }

  // ── CRUD de escalas ─────────────────────────────────────────────────────────

  /**
   * Cria uma ou mais escalas. Aceita item único ou { lote: [{...}] }.
   */
  function criarEscala(dados, email) {
    if (!podAprovarCarro(email))
      throw new Error('Sem permissão para gerenciar escalas de veículos.');
    var orgId = _getOrgId();

    var itens = [];
    if (Array.isArray(dados.lote)) {
      itens = dados.lote;
    } else {
      itens = [dados];
    }

    var criados = [];
    itens.forEach(function(item) {
      _validarEscala(item);
      var esc = EscalaCarroRepository.inserir(
        Object.assign({}, item, { criadoPor: email }),
        orgId
      );
      AuditoriaService.registrar('ESCALA_CARRO_CRIADA', 'escala_carro', {
        entidadeId: esc.id, orgId: orgId, usuario: email
      });
      criados.push(esc);
    });

    return criados.length === 1 ? criados[0] : criados;
  }

  function _validarEscala(item) {
    if (!item.horaInicio || !item.horaFim)
      throw new Error('Horário de início e fim são obrigatórios.');
    if (_horaParaMin(item.horaInicio) >= _horaParaMin(item.horaFim))
      throw new Error('Hora de fim deve ser posterior à hora de início.');
    if (item.tipo === 'especifica' && !item.data)
      throw new Error('Data é obrigatória para escala de tipo específica.');
    if (item.tipo !== 'especifica') {
      if (!Array.isArray(item.diasSemana) || item.diasSemana.length === 0)
        throw new Error('Dias da semana são obrigatórios para escala semanal.');
      if (!item.dataInicio || !item.dataFim)
        throw new Error('Período de vigência (dataInicio e dataFim) é obrigatório para escala semanal.');
      if (item.dataInicio > item.dataFim)
        throw new Error('Data de início da vigência deve ser anterior à data de fim.');
    }
  }

  function listarEscalas(filtros, email) {
    if (!podAprovarCarro(email))
      throw new Error('Sem permissão para visualizar escalas de veículos.');
    return EscalaCarroRepository.listar(filtros || {}, _getOrgId());
  }

  function atualizarEscala(id, patch, email) {
    if (!podAprovarCarro(email))
      throw new Error('Sem permissão para editar escalas de veículos.');
    var orgId = _getOrgId();
    var esc   = EscalaCarroRepository.buscarPorId(id, orgId);
    if (!esc) throw new Error('Escala não encontrada: ' + id);
    var atualizado = EscalaCarroRepository.atualizar(id, patch, orgId);
    AuditoriaService.registrar('ESCALA_CARRO_ATUALIZADA', 'escala_carro', {
      entidadeId: id, orgId: orgId, usuario: email
    });
    return atualizado;
  }

  function removerEscala(id, email) {
    if (!podAprovarCarro(email))
      throw new Error('Sem permissão para remover escalas de veículos.');
    var orgId = _getOrgId();
    var esc   = EscalaCarroRepository.buscarPorId(id, orgId);
    if (!esc) throw new Error('Escala não encontrada: ' + id);
    var atualizado = EscalaCarroRepository.atualizar(id, { ativo: false }, orgId);
    AuditoriaService.registrar('ESCALA_CARRO_REMOVIDA', 'escala_carro', {
      entidadeId: id, orgId: orgId, usuario: email
    });
    return atualizado;
  }

  // ── CRUD de veículos ────────────────────────────────────────────────────────

  function listarVeiculos(email) {
    // Qualquer usuário autenticado pode ver a frota
    return VeiculosRepository.listar(_getOrgId());
  }

  function salvarVeiculo(dados, email) {
    if (!podAprovarCarro(email))
      throw new Error('Sem permissão para gerenciar veículos.');
    var orgId = _getOrgId();
    if (dados.id) {
      var vei = VeiculosRepository.buscarPorId(dados.id, orgId);
      if (!vei) throw new Error('Veículo não encontrado: ' + dados.id);
      var atualizado = VeiculosRepository.atualizar(dados.id, dados, orgId);
      AuditoriaService.registrar('VEICULO_ATUALIZADO', 'veiculos', {
        entidadeId: dados.id, orgId: orgId, usuario: email
      });
      return atualizado;
    }
    var criado = VeiculosRepository.inserir(dados, orgId);
    AuditoriaService.registrar('VEICULO_CRIADO', 'veiculos', {
      entidadeId: criado.id, orgId: orgId, usuario: email
    });
    return criado;
  }

  return {
    podAprovarCarro:        podAprovarCarro,
    getJanelasNaData:       getJanelasNaData,
    calcularDisponibilidade: calcularDisponibilidade,
    calcularTempoRota:      calcularTempoRota,
    criarEscala:            criarEscala,
    listarEscalas:          listarEscalas,
    atualizarEscala:        atualizarEscala,
    removerEscala:          removerEscala,
    listarVeiculos:         listarVeiculos,
    salvarVeiculo:          salvarVeiculo
  };

})();
