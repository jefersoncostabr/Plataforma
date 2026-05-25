# Planejamento: criar e “envelopar” NPC BB para reaproveitamento (instanciável)

## Objetivo
Criar um **NPC BB novo** (baseado no comportamento já existente do BB em `src/core/bb.js`) para que ele:
- seja **instanciável por fase** (spawn/despawn como entidades do estilo “inimigo”);
- funcione “como o inimigo que já tem no jogo” (ou seja: fluxo de atualização/vida semelhante ao padrão do motor de inimigos);
- permita **reaproveitamento** de lógica e estrutura (evitar copiar/colar o BB como singleton);
- **não quebrar** o “BB inimigo” atual (`inimigo.ehBBInimigo`) que já existe no jogo.

---

## Informação coletada (estado atual)
- **BB controlável do player** existe hoje como singleton lógico no `src/core/bb.js`:
  - `window.bbEntidade`
  - `window.controlandoBB`
  - `window.inicializarBB(x, y, gameConfig)`
  - `cicloVidaBB(bb, idControle)` com atualização por `requestAnimationFrame`
  - `window.despawnBB()` para remover DOM/estado
- Interações do BB atual dependem fortemente do ambiente global:
  - `window.playerControle`, `window.config`, `window.plataformas`, `window.controlesConfig`
  - interações com crafting/base: `bb.craftingSystem.processarInteracaoCraft()`
  - resgate/abertura: `window.sistemaAbertura.*`
  - colisões/flags com inimigos (ex.: `window.inimigos` e `inimigo.presoPorPet`, `inimigo.emAberturaPorBB`)
- **Inimigos do jogo** são atualizados em loop central em `src/inimigos/inimigo.js`:
  - iteram sobre `window.inimigos[]`
  - possuem flags e estados próprios (ex.: `ehBBInimigo` para “inimigo que virou BB”)

---

## Escolha de abordagem (definida)
**Envelopar como instanciável, em estilo “inimigo”** (sem manter singleton rígido).
- Preferência: **campo separado / arquivo separado** (não misturar em `resetarInimigos`).
- Implementação alvo:
  - Criar uma API “NPC BB” com spawn/despawn
  - Criar lista global (ex.: `window.bbNPCs[]`) e integrá-la no update do jogo
  - Manter compatibilidade com a lógica atual do BB (player-controlado) por shims.

---

## Requisitos de design (o que o “envelope” deve oferecer)
1. **Instanciável por fase**
   - Uma fase pode criar N instâncias de BB NPC (ou pelo menos 1 sem exigir singleton).
2. **Loop de atualização compatível**
   - Atualização deve acontecer em fluxo central (padrão do inimigo) ou com RAF controlado por instância, desde que não crie vazamentos (timers/raf) e siga o comportamento atual.
3. **Interface mínima por instância**
   - `update()` (ou internal RAF)
   - `destroy()`
   - `setControlado(boolean)` para indicar qual instância responde ao input do player.
4. **Compatibilidade**
   - `window.controlarBB()`, `window.controlarPlayer()`, `window.despawnBB()` devem continuar funcionando (podendo atuar sobre a instância “ativa/controlada”).
5. **Isolamento do “BB inimigo”**
   - O sistema atual de `inimigo.ehBBInimigo` deve continuar intacto.
   - Evitar colisões de flags/nomes globais (ex.: não reutilizar `inimigo.bb*` de forma acoplada com o NPC BB controlável).

---

## Estrutura proposta
### Entidades/estruturas globais
- `window.bbNPCs = []` (lista de instâncias BB)
- `window.bbNPCAtivoId` (opcional) para controlar qual instância recebe input.
- `window.bbEntidade` como shim (referência para “instância ativa”) para não quebrar código que ainda depende do singleton.

### Dados de spawn (configuração por instância)
- `id` (opcional)
- `x`, `y`
- `direcao` (opcional, se necessário para flip/sprites)
- `configOverrides` (opcional)
- `controladoPorPlayer` (bool; default: false)

---

## Plano por arquivo (escopo)

### 1) `src/core/bb.js`
**Mudanças principais**
- Converter `window.inicializarBB` em função de criação de instância (ex.: `window.spawnBBNPC`) que retorna a instância.
- Adaptar `cicloVidaBB(bb, idControle)` para operar com:
  - `bb` = estado da instância
  - `idControle` = id/controle interno da instância
- Transformar `window.despawnBB` em `instancia.destroy()` e manter shim `window.despawnBB()`.
- Criar wrapper de controle:
  - `window.controlarBB(idInstancia?)`
  - `window.controlarPlayer()`
  - (se não houver id, usar instância ativa ou a primeira disponível)

**Resultado esperado**
- O BB atual passa a ser reaproveitado em múltiplas instâncias sem duplicar lógica.

---

### 2) `src/core/inicial.js`
**Mudanças principais**
- Integrar a atualização do BB NPC no loop do jogo (estilo inimigo).
- Garantir que input e interações usem a instância **controlada**.

**Resultado esperado**
- O comportamento do BB NPC fica consistente com o motor.

---

### 3) `src/inimigos/inimigo.js`
**Mudanças prováveis (mínimas)**
- Revisar apenas para garantir que:
  - não existe dependência indevida em `window.bbEntidade`
  - nomes/flags de “BB inimigo” não colidem com a nova entidade BB NPC.

**Resultado esperado**
- `ehBBInimigo` continua funcionando como hoje.

---

## Integração com “fase/JSON” (definido: campo separado / arquivo separado)
Como a preferência foi **campo separado ou arquivo separado**, o plano de dados será:

### Opção de dados A: campo separado no json da fase
- Exemplo conceitual:
  - `bbNPCs: [{ id, pos:{x|coord}, configOverrides, controladoPorPlayer }]`

### Opção de dados B: arquivo separado
- Exemplo conceitual:
  - `config/fases/nivel_1/fase4_bb.json`
- O loader da fase deve buscar e aplicar.

**Observação**: como o pedido atual não inclui alteração do loader ainda, essa parte será concluída após identificar exatamente onde a fase carrega dados atualmente.

---

## 4) Integração com o Editor de Fases
**Mudanças em `tools/editor/editor.js` e `editor-config.js`**
- **Paleta**: Adicionar um novo `palette-item` para "NPC BB".
- **Estado (stateKey)**: Definir `bbNPCs` como uma chave de array no `EditorConfig`.
- **Lógica de Adição (`adicionarElemento`)**: 
  - Ao clicar com o item "NPC BB" selecionado, inserir um objeto `{ coord, controladoPorPlayer: false }` no array `faseData.bbNPCs`.
  - Permitir alternar a flag `controladoPorPlayer` via clique duplo ou menu de contexto no editor.
- **Renderização**: Criar um helper no `renderizador-editor.js` para desenhar o sprite do BB nas coordenadas indicadas.

**Resultado esperado**
- O designer de níveis pode espalhar múltiplos BBs pelo mapa e definir qual deles (se houver) começa sob controle do jogador.

---

## 5) Carregamento e Criação do Mundo (Motor)
**Mudanças em `src/core/inicial.js` -> `carregarFase(nomeArquivo)`**
- **Reset**: Adicionar `window.bbNPCs = [];` e limpar elementos DOM existentes de BBs anteriores no início do carregamento.
- **Spawn**: Após a inicialização da posição do jogador e antes do carregamento de inimigos, iterar sobre `fase.bbNPCs`:
  ```javascript
  if (Array.isArray(fase.bbNPCs)) {
      fase.bbNPCs.forEach(config => {
          const pos = window.gridParaPixels(config.coord);
          const instancia = window.spawnBBNPC(pos.x, pos.y, config);
          window.bbNPCs.push(instancia);
      });
  }
  ```

---

## Plano de execução (checklist)
1. Criar scaffolding no `src/core/bb.js` para instanciar e armazenar em `window.bbNPCs[]`.
2. Criar método `destroy()` e shims para manter compatibilidade.
3. **Implementar lógica de leitura no `carregarFase` de `src/core/inicial.js`.**
4. **Atualizar o Editor de Fases para suportar a nova categoria "NPC BB".**
5. Adicionar suporte de spawn via fase (campo/arquivo separado).
6. Testar:
   - spawn/despawn
   - controle do player no BB NPC
   - crafting/interações
   - resgate/abertura
   - garantir que `ehBBInimigo` não quebrou.

---

## Critérios de sucesso
- O BB NPC aparece e se comporta conforme o BB existente. (pegar a física,  hitbox sprites do jogador quando bb)
- Não há vazamento de timers/RAF após despawn.
- É possível ter BB NPC em uma fase sem usar singleton fixo.
- O “BB inimigo” continua funcionando.

---

## Arquivos que devem ser revisados após esta etapa
- `src/core/inicial.js` (ponto exato de loop/spawn de entidades)
- Loader de fase e editor (onde a fase consome JSON)

---

## Registro
- Documento criado para planejar a implementação do envelope do BB como entidade instanciável e reaproveitável.
