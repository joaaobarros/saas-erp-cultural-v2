/**
 * @file core/logger.gs
 * @layer core
 * @description Logger centralizado com níveis e rastreabilidade de módulo.
 *
 * Uso:
 *   Logger.info('reserva_engine', 'criar', 'Reserva criada', { id, sala });
 *   Logger.warn('fsm_guardian', 'validar', 'Transição inválida');
 *   Logger.error('tarefa_engine', 'salvar', 'Falha ao persistir');
 *
 * Níveis: DEBUG < INFO < WARN < ERROR
 * Saída: console.log do GAS (visível no Stackdriver / Apps Script Logs)
 */

var Logger = (function () {

  var NIVEL_ATUAL = 'INFO'; // configurável via SistemaConfigService.getDebugLevel()

  var NIVEIS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

  function _logar(nivel, modulo, operacao, mensagem, dados) {
    if (NIVEIS[nivel] < NIVEIS[NIVEL_ATUAL]) return;

    var ts    = new Date().toISOString();
    var extra = dados ? ' | ' + JSON.stringify(dados) : '';
    var linha = '[' + nivel + '] ' + ts + ' | ' + modulo + '.' + operacao + ': ' + mensagem + extra;

    switch (nivel) {
      case 'ERROR': console.error(linha); break;
      case 'WARN':  console.warn(linha);  break;
      default:      console.log(linha);
    }
  }

  return {
    debug: function(modulo, op, msg, dados) { _logar('DEBUG', modulo, op, msg, dados); },
    info:  function(modulo, op, msg, dados) { _logar('INFO',  modulo, op, msg, dados); },
    warn:  function(modulo, op, msg, dados) { _logar('WARN',  modulo, op, msg, dados); },
    error: function(modulo, op, msg, dados) { _logar('ERROR', modulo, op, msg, dados); },
    setNivel: function(nivel) { if (NIVEIS[nivel] !== undefined) NIVEL_ATUAL = nivel; }
  };

})();
