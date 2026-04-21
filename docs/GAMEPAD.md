# Planejamento de Implementação: Suporte a Gamepad

Este documento descreve a estratégia para integrar o suporte a controles (Xbox, PlayStation, Genéricos) ao jogo, utilizando a **Gamepad API** do navegador.

## 1. Arquitetura de Integração

A integração será feita no arquivo `src/jogador/controles.js`. O objetivo é que as funções `acaoAtiva()` e `consumirAcao()` passem a consultar tanto o teclado quanto o Gamepad de forma transparente para o resto do motor (`movimento.js`, `ia-inimigo.js`, etc).

### Fluxo de Dados:
1. **Detecção**: Listener `gamepadconnected`.
2. **Polling**: No loop de `atualizar()` do jogador, chamaremos uma função para ler o estado atual do controle.
3. **Mapeamento**: Traduzir IDs de botões (0, 1, 2...) para as strings de ação existentes (`'pulo'`, `'tiro'`, etc).
4. **Deadzone**: Implementar uma zona morta para os analógicos para evitar "drift" (movimento fantasma).

## 2. Mapeamento Proposto (Padrão "Standard")

| Ação | Botão Gamepad (Xbox/PS) | Eixo/ID |
| :--- | :--- | :--- |
| **Esquerda/Direita** | Analógico Esquerdo / D-Pad | Axis 0 / Buttons 14, 15 |
| **Cima/Baixo** | Analógico Esquerdo / D-Pad | Axis 1 / Buttons 12, 13 |
| **Pulo** | Botão A / Cross | Button 0 |
| **Chute** | Botão X / Square | Button 2 |
| **Tiro** | Botão Y / Triangle | Button 3 |
| **Garra** | Botão B / Circle | Button 1 |
| **Cinto** | R1 / RB | Button 5 |
| **Interagir** | L1 / LB | Button 4 |
| **Mochila** | Select / Share | Button 8 |
| **Menu/Pause** | Start / Options | Button 9 |

## 3. Plano de Ação

### Passo 1: Utilitário de Gamepad
Criar uma função helper para ler o estado do Gamepad.

### Passo 2: Atualização do `controles.js`
Modificar a função `acaoAtiva` para:
```javascript
function acaoAtiva(controle, acao) {
    // Verifica Teclado (Lógica atual)
    const teclado = verificarTeclado(controle, acao);
    
    // Verifica Gamepad
    const gp = navigator.getGamepads()[0]; // Pega o primeiro controle
    if (gp) {
        const gamepadAtivo = verificarBindsGamepad(gp, acao);
        return teclado || gamepadAtivo;
    }
    return teclado;
}
```

### Passo 3: Tratamento de Eixos (Analógicos)
Os analógicos retornam valores entre -1 e 1. Precisamos de um limiar (Threshold):
- **Direita**: `axes[0] > 0.5`
- **Esquerda**: `axes[0] < -0.5`
- **Baixo**: `axes[1] > 0.5` (Útil para Agachar e Super Descida)

## 4. Desafios e Soluções

### Double Tap (Dash)
A lógica de dash atual depende de `keydown`. Para o Gamepad, teremos que implementar um rastreador de tempo manual dentro do polling para detectar dois toques rápidos no D-Pad ou inclinações rápidas do analógico.

### Ações Discretas (Menus)
Botões de menu (Mochila, Pause) não podem disparar 60 vezes por segundo. Precisamos de uma trava (debounce) para que um clique no botão Start abra e feche o menu apenas uma vez.

## 5. Próximos Snippets de Código Sugeridos

```javascript
// Exemplo de detecção de zona morta
function checkAnalog(value) {
    const deadzone = 0.25;
    return Math.abs(value) > deadzone ? value : 0;
}
```

---
*Documento gerado para auxiliar na refatoração do sistema de input.*
