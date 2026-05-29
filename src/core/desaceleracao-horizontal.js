/**
 * Aplica desaceleração horizontal gradual a uma entidade.
 *
 * @param {Object} controle - O objeto de controle da entidade (jogador ou inimigo).
 * @param {Object} config - As configurações globais do jogo.
 */
// Aplica desaceleração horizontal diferenciada para chão e ar (game feel moderno)
window.aplicarDesaceleracaoHorizontal = function(controle, config) {
    // Constantes ajustáveis
    // Valores padrão anteriores:
    // const GROUND_FRICTION = 0.7; // 0.7 = para em ~0.1s se vel=7
    // const AIR_DRAG = 0.18; // 0.18 = para em ~0.4s se vel=3
    // const AIR_CONTROL_FACTOR = 0.6; // 0.6 = reduz para 60% ao soltar

    // Usa valores do config se disponíveis, senão valores exagerados para teste
    const GROUND_FRICTION = Number(config?.desaceleracaoChao ?? 0.6); // Parada quase instantânea no chão
    const AIR_DRAG = Number(config?.desaceleracaoAr ?? 0.18); // Para quase no ar
        const AIR_CONTROL_FACTOR = Number(config?.airControlFactor ?? 0.8); // Reduz para 70% ao soltar no ar (mantém mais inércia)
    const limiteVelocidadeMinima = Number(config?.limiteVelocidadeMinimaHorizontal ?? 0.1);

    // Debug: Mostra só ao inverter direção ou aplicar air control

    if (controle.velocidadeHorizontalAtual === undefined) {
        controle.velocidadeHorizontalAtual = 0;
    }

    // Se está no chão, aplica fricção forte
    if (controle.noChao) {
        if (Math.abs(controle.velocidadeHorizontalAtual) > limiteVelocidadeMinima) {
            // Se o jogador mudou de direção, para imediatamente
            if (controle.inputInverterDirecao) {
                controle.velocidadeHorizontalAtual = -controle.velocidadeHorizontalAtual;
                controle.inputInverterDirecao = false;
            } else {
                if (controle.velocidadeHorizontalAtual > 0) {
                    controle.velocidadeHorizontalAtual = Math.max(0, controle.velocidadeHorizontalAtual - GROUND_FRICTION);
                } else {
                    controle.velocidadeHorizontalAtual = Math.min(0, controle.velocidadeHorizontalAtual + GROUND_FRICTION);
                }
            }
            controle.x += controle.velocidadeHorizontalAtual;
            // console.log('[DEBUG] Chão: velocidadeHorizontalAtual após fricção:', controle.velocidadeHorizontalAtual);
        } else {
            controle.velocidadeHorizontalAtual = 0;
        }
    } else {
        // No ar: aplica "air control" (reduz para 60% ao soltar, desaceleração leve)
        if (controle.inputSoltouNoAr && !controle._airControlAplicado) {
            controle.velocidadeHorizontalAtual *= AIR_CONTROL_FACTOR;
            controle._airControlAplicado = true;
        }
        if (Math.abs(controle.velocidadeHorizontalAtual) > limiteVelocidadeMinima) {
            if (controle.velocidadeHorizontalAtual > 0) {
                controle.velocidadeHorizontalAtual = Math.max(0, controle.velocidadeHorizontalAtual - AIR_DRAG);
            } else {
                controle.velocidadeHorizontalAtual = Math.min(0, controle.velocidadeHorizontalAtual + AIR_DRAG);
            }
            controle.x += controle.velocidadeHorizontalAtual;
            // console.log('[DEBUG] Ar: velocidadeHorizontalAtual após drag:', controle.velocidadeHorizontalAtual);
        } else {
            controle.velocidadeHorizontalAtual = 0;
        }
        // Reset flag ao tocar o chão
        if (controle.noChao) controle._airControlAplicado = false;
    }
};