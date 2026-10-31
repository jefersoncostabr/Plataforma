# 🧪 Testes do projeto

Este diretório contém testes automatizados e uma página de teste manual.

---

## 📋 Antes de começar

É necessário ter o Node.js instalado. Confira no terminal:

```powershell
node --version
```

Se aparecer um número de versão, está **pronto**. ✅  
Os testes automatizados usam o próprio Node.js; não precisam de instalação de dependências.

---

## ▶️ Rodar todos os testes automatizados

Abra o terminal na pasta principal do projeto e execute:

```powershell
node --test tools/testes/controls-menu-css.test.cjs tools/testes/phase-editor-random-enemies.test.cjs tools/testes/combat-tatsumaki-vfx.test.cjs tools/testes/bonus-phase.test.cjs tools/testes/player-jump-tilt.test.cjs tools/testes/enemy-jump-tilt.test.cjs tools/testes/tronco-quebravel.test.cjs tools/testes/cheat-menu-phase-transition.test.cjs tools/testes/pet-follow-distance.test.cjs tools/testes/pet-animation.test.cjs tools/testes/galinha-controle.test.cjs tools/testes/armas-cinto-municao.test.cjs tools/testes/crafting-reciclagem.test.cjs tools/testes/sons.test.cjs tools/testes/reiniciar-hard-preserva-skills.test.cjs tools/testes/jogador.test.cjs tools/testes/itens-inventario.test.cjs tools/testes/hud.test.cjs tools/testes/outros-blocos.test.cjs tools/testes/audio-manager.test.cjs tools/testes/hud-arma-xp.test.cjs tools/testes/editor-spawn-inimigo.test.cjs tools/testes/save-slots.test.cjs tools/testes/colisoes.test.cjs tools/testes/configuracoes.test.cjs tools/testes/audio-musica.test.cjs
```

O Node.js mostra o resultado de cada teste:
- `pass` = passou ✅
- `fail` = falhou, algo precisa ser corrigido ❌

---

## ▶️ Rodar apenas um teste

### Pets: distância de acompanhamento e animação

```powershell
node --test tools/testes/pet-follow-distance.test.cjs tools/testes/pet-animation.test.cjs
```

Verifica que o cão usa a distância configurada de 30 pixels, que o gato continua usando o padrão de 45 pixels e que cão e gato recebem os sprites de andar corretos.

### Controle da galinha com Adestramento

```powershell
node --test tools/testes/galinha-controle.test.cjs
```

Verifica que a galinha pode ser assumida com Q quando o jogador tem Adestramento, recebe os comandos de movimento, retorna ao jogador com dois toques em Q e é incluída no foco da câmera e na limpeza de estado durante transições. Também verifica os sprites existentes para caminhada, voo e interação com E, além da lógica que os seleciona.

### Menu de controles

```powershell
node --test tools/testes/controls-menu-css.test.cjs
```

### Editor de fases e inimigos aleatórios

```powershell
node --test tools/testes/phase-editor-random-enemies.test.cjs
```

### Combate e VFX da Tatsumaki

```powershell
node --test tools/testes/combat-tatsumaki-vfx.test.cjs
```

### Fase bônus

```powershell
node --test tools/testes/bonus-phase.test.cjs
```

Verifica as recompensas de XP por dificuldade, o atraso de 1 segundo, a animação da recompensa, a restauração de vida, escudo e munição, e o comportamento quando o jogador morre.

### Inclinação de jogador, pets e inimigos durante o pulo

```powershell
node --test tools/testes/player-jump-tilt.test.cjs
```

Verifica a função compartilhada usada pelo jogador, pelos pets e pelos inimigos: inclinação ao subir e cair, direção do giro, espelhamento para a esquerda, rotação zero no chão, limite de 20 graus e desativação durante o jetpack. Também cobre a inclinação do jogador ao planar: inclina enquanto uma tecla lateral está pressionada e zera imediatamente ao soltar, mesmo com inércia. Verifica ainda que entradas sem entidade ou elemento não causam erro.

### Inclinação dos inimigos durante o pulo

```powershell
node --test tools/testes/enemy-jump-tilt.test.cjs
```

Executa o trecho real de atualização visual da IA dos inimigos com a função compartilhada. Verifica a inclinação ao subir e cair, o sentido corrigido, o espelhamento para a esquerda, a rotação zero no chão e a desativação durante o jetpack.

### Troncos quebráveis

```powershell
node --test tools/testes/tronco-quebravel.test.cjs
```

Verifica os 6 pontos de vida do tronco vertical, o dano único por chute, os efeitos de impacto, a animação de quebra horizontal e a colisão unidirecional dos troncos baixo e cima.

### Menu cheats e troca de fase

```powershell
node --test tools/testes/cheat-menu-phase-transition.test.cjs
```

Executa a lógica real do menu cheats para verificar a seleção de fase, o fechamento do menu antes do carregamento, a validação de entrada inválida e a limpeza do menu de skills e dos estados de pausa na transição.

### Armas, cinto e munição

```powershell
node --test tools/testes/armas-cinto-municao.test.cjs
```

### Crafting e reciclagem

```powershell
node --test tools/testes/crafting-reciclagem.test.cjs
```

### Sons

```powershell
node --test tools/testes/sons.test.cjs
```

### Reiniciar hard preservando skills

```powershell
node --test tools/testes/reiniciar-hard-preserva-skills.test.cjs
```

Verifica que, ao reiniciar em modo hard, as skills desbloqueadas são preservadas conforme o comportamento esperado.

### Jogador: controles, movimento e combate

```powershell
node --test tools/testes/jogador.test.cjs
```

Verifica entrada lateral, pulo simples e duplo, desaceleração no ar, colisão horizontal com parede, cooldown e alcance do chute, dano e derrota do inimigo, dano por estaca com cooldown de proteção e restauração de vida.

### Itens: mochila e inventário

```powershell
node --test tools/testes/itens-inventario.test.cjs
```

Verifica coleta, equipagem e desequipagem de arma, uso de restauração, capacidade do colete, pilhas de até cinco unidades, inclusão e remoção de itens, ordem dos slots e preservação de slots vazios. Também verifica o consumo do Airdrop Plus armazenado.

### HUD

```powershell
node --test tools/testes/hud.test.cjs
```

Verifica corações restantes, pontos de skill, escudo e ocultação do HUD sem a skill Visão.

### HUD: casos extremos de exibição

```powershell
node --test tools/testes/hud-arma-xp.test.cjs
```

Verifica que skillPoints negativos são exibidos como zero, que ícones de escudo não aparecem quando a proteção está esgotada e que todos os corações ficam cheios quando não há dano.

### Pets, salvamentos e editor

```powershell
node --test tools/testes/outros-blocos.test.cjs
```

Verifica resgate e persistência do cão, interação da gaiola, mordida e entrada do latido do cão, isolamento e limpeza de slots de salvamento, controles remapeados, importação/exportação JSON do editor, salvamento no servidor ou em rascunho local, adição/remoção de blocos, pausa e colisões entre hitboxes.

### AudioManager

```powershell
node --test tools/testes/audio-manager.test.cjs
```

Verifica persistência e limites do volume mestre, reprodução de SFX simultâneos, limpeza após falha de carregamento e interrupção dos sons ativos.

### Áudio: música de fundo

```powershell
node --test tools/testes/audio-musica.test.cjs
```

Verifica que `createSFX` cria sons com loop configurável rastreados em `_activeSounds`, que `stopAllSounds` pausa sons em loop e limpa a lista, e que `playPasso` não sobrepõe chamadas enquanto o passo anterior não terminou.

### Editor de fases: spawn e inimigos

```powershell
node --test tools/testes/editor-spawn-inimigo.test.cjs
```

Verifica que a fase vazia tem `posicaoInicialJogador` com valor padrão, que `normalizeFaseData` preserva a posição do jogador quando definida, que `ENEMY_DEFS` inclui inimigo melee e atirador e que os arrays de inimigos são inicializados vazios na fase nova.

### Slots de salvamento

```powershell
node --test tools/testes/save-slots.test.cjs
```

Verifica que o slot ativo padrão é `slot1` e pode ser trocado, que a dificuldade é salva e travada corretamente após `lockDifficultyForSlot`, que um slot ocupado é detectado após gravar dado e que `clearSlot` remove todos os dados do slot.

### Colisões

```powershell
node --test tools/testes/colisoes.test.cjs
```

Verifica que `detectarColisaoHitbox` retorna `true` quando hitboxes se sobrepõem e `false` quando estão afastadas, e que `verificarAreaTotalmenteLivre` bloqueia posições ocupadas por tiles sólidos.

### Configurações

```powershell
node --test tools/testes/configuracoes.test.cjs
```

Verifica que `configuracoes.json` é um JSON válido, que contém os campos de física obrigatórios (`velocidadePlayer`, `forcaPuloPlayer`, `gravidadePlayer`) com valores positivos, que `faseInicial` está definida e que `escudoTirosProtegidos` é um número válido.

---

## 📌 Resumo rápido

| O que fazer | Comando / ação | Resultado esperado |
|-------------|----------------|---------------------|
| Verificar Node.js | `node --version` | Número da versão ✅ |
| Rodar todos os testes | `node --test tools/testes/*.test.cjs` | Saída com `pass` ou `fail` |
| Rodar um teste específico | `node --test tools/testes/<arquivo>.test.cjs` | Saída com `pass` ou `fail` |

---

## 🗒️ Sugestões de testes para adicionar

Testes pendentes, organizados por área do jogo. Ainda não implementados.

### Itens e inventário (`src/itens/itens.js`, `src/ui/mochila.js`)

- Usar item plus de XP/SP (o projeto só possui Airdrop Plus e munição plus; o Airdrop Plus já tem teste de consumo)

### Sistema

- Transições de fase: carregar próxima fase, resetar estado da fase, tela de carregamento
- Menu de pausa: abrir/fechar, opções (continuar, reiniciar, voltar ao menu), sobreposição ao jogo

### Colisões e física

- Player com plataforma: pisar e atravessar plataforma unidirecional por baixo
- Player com inimigo: dano, recuo, invencibilidade
- Projetil/ataque com inimigo e cenário
