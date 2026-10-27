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
node --test tools/testes/controls-menu-css.test.cjs tools/testes/phase-editor-random-enemies.test.cjs tools/testes/combat-tatsumaki-vfx.test.cjs tools/testes/bonus-phase.test.cjs tools/testes/player-jump-tilt.test.cjs tools/testes/enemy-jump-tilt.test.cjs tools/testes/tronco-quebravel.test.cjs
```

O Node.js mostra o resultado de cada teste:
- `pass` = passou ✅
- `fail` = falhou, algo precisa ser corrigido ❌

---

## ▶️ Rodar apenas um teste

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

Verifica a função compartilhada usada pelo jogador, pelos pets e pelos inimigos: inclinação ao subir e cair, direção do giro, espelhamento para a esquerda, rotação zero no chão, limite de 20 graus e desativação durante o jetpack. Também verifica que entradas sem entidade ou elemento não causam erro.

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

---

## 🐾 Teste manual dos pets

O arquivo `teste-animacao-pets.html` **não** é um teste automatizado e **não** roda com `node --test`. Abra-o no navegador para conferir as animações dos pets. 🎮

---

## 📌 Resumo rápido

| O que fazer | Comando / ação | Resultado esperado |
|-------------|----------------|---------------------|
| Verificar Node.js | `node --version` | Número da versão ✅ |
| Rodar todos os testes | `node --test ...` | Saída com `pass` ou `fail` |
| Rodar um teste específico | `node --test <arquivo>` | Saída com `pass` ou `fail` |
| Testar animações dos pets | Abrir `teste-animacao-pets.html` no navegador | Animações visíveis no navegador 🐾 |
