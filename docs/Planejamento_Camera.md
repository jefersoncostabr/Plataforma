# Plano de Implementação: Câmera e Mundos Dinâmicos

Este documento descreve as etapas para permitir que as fases sejam maiores que o palco de 640x480, utilizando um sistema de câmera deslizante.

## 1. Alteração na Estrutura dos Níveis (`.json`)
Cada arquivo de fase passará a ter uma propriedade `proporcao`.
*   **Exemplo 1x1:** `640x480` (Original)
*   **Exemplo 2x3:** `960x1920` (Altura x Largura)
*   **Padrão:** Se omitido, o jogo assume `1x1`.

## 2. Nova Estrutura de HTML/CSS
Precisamos separar o **Viewport** (o que o jogador vê) do **Mundo** (onde tudo acontece).
1.  **Viewport (`#jogo-container`):** Terá `overflow: hidden` e tamanho fixo (640x480).
2.  **Mundo (`#game-stage`):** Terá o tamanho total da fase (ex: 1920px de largura). A câmera moverá este elemento usando `transform: translate()`.

## 3. Criação do Módulo `camera.js` (Etapa 1)
Criar um novo arquivo para gerenciar o estado da câmera:
*   Variáveis `window.cameraX` e `window.cameraY`.
*   Função `atualizarCamera(playerX, playerY, worldW, worldH)`:
    *   Calcula o centro da tela baseado na posição do jogador.
    *   Aplica "Clamping" (travamento) para que a câmera não mostre o vazio fora dos limites do mundo.
    *   Aplica a suavização (lerp) se desejar um movimento mais fluido.

## 4. Ajustes no `inicializador.js` (Etapa 2)
Ao carregar a fase (`carregarFase`):
1.  Ler a string de proporção (ex: `"2x3"`).
2.  Calcular largura e altura totais: `larguraTotal = 640 * proporcaoL; alturaTotal = 480 * proporcaoA;`.
3.  Redimensionar o elemento `#game-stage` para essas novas medidas.
4.  Atualizar a lógica de `limitarPosicaoAoPalco` para usar os novos limites dinâmicos em vez de valores fixos.

## 5. Ajustes no Loop de Renderização (Etapa 3)
No loop `atualizar()` de `movimentacao.js`:
1.  Chamar `window.atualizarCamera(player.x, player.y, mundo.largura, mundo.altura)`.
2.  Mover o `#game-stage` para a posição negativa da câmera:
    `gameStage.style.transform = `translate(${-window.cameraX}px, ${window.cameraY}px) scale(${config.escalaPalco})`;`

## 6. Atualização do Editor de Fases (Etapa 4)
O editor precisa:
1.  Um campo de seleção para a proporção.
2.  Expandir o grid visual de acordo com a proporção escolhida (ex: em 1x2, mostrar colunas de 1 a 40 em vez de 1 a 20).
3.  Salvar essa informação no JSON de saída.

## 7. Revisão de Coordenadas de UI
Os elementos de interface (Menu de Pause, Barra de Vida, XP) **não** devem estar dentro do `#game-stage`, caso contrário eles "fugirão" da tela quando o jogador andar. Eles devem ser movidos para um container de HUD fixo.

---

## Resumo Técnico de Conversão
| Proporção | Altura (Pixels) | Largura (Pixels) | Grid Máximo |
| :--- | :--- | :--- | :--- |
| **1x1** | 480 | 640 | a-o / 1-20 |
| **1x2** | 480 | 1280 | a-o / 1-40 |
| **2x1** | 960 | 640 | a-ad / 1-20 |
| **2x2** | 960 | 1280 | a-ad / 1-40 |
```

### Análise do Código Atual:
1.  **`cenario.js`:** Suas funções `gridParaPixels` e `renderizarPlataformas` já trabalham com coordenadas relativas ao `bottom/left`. Isso é ótimo, pois ao aumentarmos o tamanho do container `#game-stage`, elas continuarão funcionando sem alterações, apenas ocupando espaços maiores.
2.  **`movimentacao.js`:** Atualmente, o seu sistema de colisão com "limites do palco" (linha 945 e 1180) provavelmente usa valores fixos ou o tamanho do container pai. Precisaremos garantir que a função `limitarPosicaoAoPalco` receba o tamanho do nível atual.
3.  **`menu.js`:** O menu usa `palco.getBoundingClientRect()`. Quando a câmera mover o palco, o menu pode aparecer fora do lugar. Precisaremos fixar o menu ao `body` ou ao container do Viewport.