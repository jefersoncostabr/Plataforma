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
node --test tools/testes/controls-menu-css.test.cjs tools/testes/phase-editor-random-enemies.test.cjs tools/testes/combat-tatsumaki-vfx.test.cjs tools/testes/bonus-phase.test.cjs tools/testes/player-jump-tilt.test.cjs tools/testes/enemy-jump-tilt.test.cjs tools/testes/tronco-quebravel.test.cjs tools/testes/cheat-menu-phase-transition.test.cjs tools/testes/pet-follow-distance.test.cjs tools/testes/pet-animation.test.cjs tools/testes/armas-cinto-municao.test.cjs tools/testes/crafting-reciclagem.test.cjs tools/testes/sons.test.cjs tools/testes/reiniciar-hard-preserva-skills.test.cjs
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

---

## 📌 Resumo rápido

| O que fazer | Comando / ação | Resultado esperado |
|-------------|----------------|---------------------|
| Verificar Node.js | `node --version` | Número da versão ✅ |
| Rodar todos os testes | `node --test tools/testes/*.test.cjs` | Saída com `pass` ou `fail` |
| Rodar um teste específico | `node --test tools/testes/<arquivo>.test.cjs` | Saída com `pass` ou `fail` |
