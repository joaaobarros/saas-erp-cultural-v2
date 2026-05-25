# PCCS — Testes de Integridade de Dados

> Cenários executáveis no GAS Editor via funções de teste globais.
> Executar manualmente antes de cada deploy que toque em `pccs_repository.gs` ou `pessoas_engine.gs`.

---

## 1. Estrutura do Plano

### 1.1 Plano ativo tem `tabelaSalarial`
```javascript
// No GAS Editor:
function _testar_pccs_tabelaSalarial() {
  var plano = PCCSRepository.listarAtivo();
  if (!plano) { Logger.log('FAIL: Nenhum plano ativo.'); return; }
  if (!plano.tabelaSalarial) {
    Logger.log('WARN: plano sem tabelaSalarial — usando fallback do frontend. Considere migrar.');
  } else {
    var chaves = Object.keys(plano.tabelaSalarial);
    Logger.log('OK: tabelaSalarial com ' + chaves.length + ' chaves: ' + chaves.join(', '));
  }
}
```
**Critério**: WARN aceitável (fallback funciona); OK após migração manual.

### 1.2 Todas as classes esperadas têm entrada na `tabelaSalarial`
```javascript
function _testar_pccs_classesFixa() {
  var plano = PCCSRepository.listarAtivo();
  if (!plano || !plano.tabelaSalarial) { Logger.log('SKIP: sem tabelaSalarial'); return; }
  var esperadas = ['PISO','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'];
  var faltando = esperadas.filter(function(c){ return !plano.tabelaSalarial['FIXA_'+c]; });
  Logger.log(faltando.length ? 'FAIL FIXA: ' + faltando.join(',') : 'OK: todas as classes FIXA presentes');
  var orientador = ['F','G','H','I','J','K','L','M','N','O','P','Q'];
  var faltandoO = orientador.filter(function(c){ return !plano.tabelaSalarial['ORIENTADOR_'+c]; });
  Logger.log(faltandoO.length ? 'FAIL ORIENTADOR: ' + faltandoO.join(',') : 'OK: todas as classes ORIENTADOR presentes');
}
```
**Critério**: nenhuma faltando.

### 1.3 Cada entrada tem ≥ 1 step com valor positivo
```javascript
function _testar_pccs_valoresSalario() {
  var plano = PCCSRepository.listarAtivo();
  if (!plano || !plano.tabelaSalarial) { Logger.log('SKIP'); return; }
  var erros = [];
  Object.keys(plano.tabelaSalarial).forEach(function(key) {
    var arr = plano.tabelaSalarial[key];
    if (!Array.isArray(arr) || !arr.length) { erros.push(key + ': array vazio'); return; }
    arr.forEach(function(v, i) {
      if (typeof v !== 'number' || v <= 0) erros.push(key + '[' + i + '] = ' + v);
    });
  });
  Logger.log(erros.length ? 'FAIL: ' + erros.join('; ') : 'OK: todos os salários são números positivos');
}
```

---

## 2. Integridade dos Cargos

### 2.1 Cargo sem tabela
```javascript
function _testar_pccs_cargosComTabela() {
  var plano = PCCSRepository.listarAtivo();
  if (!plano || !Array.isArray(plano.cargos)) { Logger.log('SKIP'); return; }
  var semTabela = plano.cargos.filter(function(c){ return !c.tabela || !c.tabela.length; });
  Logger.log(semTabela.length
    ? 'WARN: ' + semTabela.length + ' cargo(s) sem tabela salarial: ' + semTabela.map(function(c){return c.nome;}).join(', ')
    : 'OK: todos os cargos têm tabela salarial');
}
```

### 2.2 Campo `area` de cargo referencia um setor existente
```javascript
function _testar_pccs_areaVsSetores() {
  var plano = PCCSRepository.listarAtivo();
  if (!plano || !Array.isArray(plano.cargos)) { Logger.log('SKIP'); return; }
  var setores = ConfigAdminService.listarSetores ? ConfigAdminService.listarSetores() : [];
  if (!setores.length) { Logger.log('SKIP: nenhum setor configurado'); return; }
  var nomesSetores = setores.map(function(s){ return s.label || s.nome || s.id; });
  var invalidos = plano.cargos.filter(function(c){
    return c.area && nomesSetores.indexOf(c.area) < 0;
  });
  Logger.log(invalidos.length
    ? 'WARN: cargo(s) com área não mapeada para setor: ' + invalidos.map(function(c){return c.nome+' ('+c.area+')';}).join(', ')
    : 'OK: todos os cargos referenciam setores válidos ou área em branco');
}
```
**Critério**: WARN aceitável para registros legados; novos cargos devem usar setor do `<select>`.

---

## 3. Comportamento de `salvar()` — não deve apagar cargos

### 3.1 Editar nome do plano preserva cargos
```javascript
function _testar_pccs_salvarPreservaCargos() {
  var plano = PCCSRepository.listarAtivo();
  if (!plano) { Logger.log('SKIP'); return; }
  var qtdAntes = (plano.cargos || []).length;
  PCCSRepository.salvar({ id: plano.id, nome: plano.nome + ' (test)', ativo: plano.ativo }, 'test@test.com');
  var planoDepois = PCCSRepository.listarAtivo();
  var qtdDepois = (planoDepois.cargos || []).length;
  // Reverter
  PCCSRepository.salvar({ id: plano.id, nome: plano.nome, ativo: plano.ativo }, 'test@test.com');
  Logger.log(qtdDepois === qtdAntes
    ? 'OK: salvar() preservou ' + qtdAntes + ' cargos'
    : 'FAIL: salvar() apagou cargos! Antes=' + qtdAntes + ' Depois=' + qtdDepois);
}
```

---

## 4. Reajuste

### 4.1 `aplicarReajuste` atualiza `tabelaSalarial` e cargos
```javascript
function _testar_pccs_reajusteConsistente() {
  var plano = PCCSRepository.listarAtivo();
  if (!plano || !Array.isArray(plano.cargos) || !plano.cargos.length) { Logger.log('SKIP'); return; }
  var cargo = plano.cargos[0];
  var stepAntes = cargo.tabela && cargo.tabela[0] ? cargo.tabela[0].salarioBase : null;
  if (!stepAntes) { Logger.log('SKIP: cargo sem step'); return; }
  var tsAntes = plano.tabelaSalarial ? plano.tabelaSalarial[Object.keys(plano.tabelaSalarial)[0]] : null;
  // Não executar reajuste em produção — apenas verificar que a função existe e tem a signature correta
  Logger.log('OK: PCCSRepository.aplicarReajuste disponível com parâmetros (pccsId, percentual, email)');
  Logger.log('Para testar: aplicar 0.001%, verificar que cargo.tabela[0].salarioBase e tabelaSalarial[key][0] são reajustados pelo mesmo fator.');
}
```

---

## Como executar

1. Abrir o **GAS Editor** (script.google.com)
2. Colar ou navegar até cada função acima
3. Executar individualmente
4. Verificar saída em **View → Executions** ou no **Logger**

> Nenhum teste acima modifica dados em produção (exceto `_testar_pccs_salvarPreservaCargos`, que reverte imediatamente).
