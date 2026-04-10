# Planejamento de Refatoração: `movimentacao.js`

Este documento descreve a estratégia para modularizar o arquivo `movimentacao.js`, que atualmente centraliza excessivas responsabilidades (God File). O objetivo é dividir o código em módulos especializados.

## 1. Módulos Identificados para Extração

### 📦 `playerInventory.js` (Sistema de Inventário)
**Responsabilidade:** Gerenciar o que o jogador carrega, salvar o progresso e a lógica de descarte de itens.
*   **Funções a mover:** `carregarInventarioSalvo`, `salvarInventario`, `limparInventarioSalvo`.
*   **Lógica de Drop:** `droparItemJogador` (LIFO) e `droparItensInimigo`.
*   **Estado:** Constante `INVENTARIO_STORAGE_KEY`.

### 🪂 `airdrop.js` (Suporte Aéreo)
**Responsabilidade:** Controlar a mecânica do sinalizador e o spawn de suprimentos.
*   **Funções a mover:** `dispararSinalizador`.
*   **Componentes:** Lógica de subida do projétil, animação de explosão e temporizador de queda da caixa.

### 🛠️ `playerAbilities.js` (Habilidades Especiais)
**Responsabilidade:** Máquinas de estado para equipamentos complexos que não são física básica.
*   **Garra (Claw):** Estados da animação (`prep`, `esticando`, `catching`, `voltando`), gerenciamento dos segmentos do braço e detecção de captura.
*   **Jetpack:** Lógica de combustível (`timerVooRestante`), estados de voo e modo pairar (`hovering`).
*   **Paraquedas:** Controle de descida lenta.

### 📊 `playerHUD.js` (Interface do Usuário)
**Responsabilidade:** Renderização visual do status do jogador.
*   **Componentes:** Criação do `hudElemento`, função `atualizarHUD` (círculos de vida e quadrados de escudo).
*   **Visual:** `atualizarVisualEscudo` e filtros de cor para itens sem munição ou danificados.

### ⚔️ `playerCombat.js` (Combate e Projéteis)
**Responsabilidade:** Gerenciar projéteis e áreas de ataque.
*   **Funções a mover:** Atualização do array `window.projeteis`, colisão de projéteis com inimigos/cenário.
*   **Mecânicas:** Super Descida (impacto no chão e efeito de stun em área).

## 2. Nova Estrutura do `movimentacao.js`

O arquivo original passará a atuar como um **Orquestrador de Física e Input**. O loop `atualizar()` deverá ser simplificado para chamadas de alto nível:

```javascript
function atualizar() {
    if (window.isPaused) return;

    Input.read();
    Fisica.aplicarGravidade(controle);
    
    // Chamadas aos módulos extraídos
    Abilities.updateClaw(controle);
    Combat.updateProjectiles();
    HUD.render(controle);

    requestAnimationFrame(atualizar);
}
```