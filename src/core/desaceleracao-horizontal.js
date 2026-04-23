/**
 * Aplica desaceleração horizontal gradual a uma entidade.
 *
 * @param {Object} controle - O objeto de controle da entidade (jogador ou inimigo).
 * @param {Object} config - As configurações globais do jogo.
 */
window.aplicarDesaceleracaoHorizontal = function(controle, config) {
    // Valores padrão, podem ser configurados em configuracoes.json
    const desaceleracao = Number(config.desaceleracaoHorizontal ?? 0.5);
    const limiteVelocidadeMinima = Number(config.limiteVelocidadeMinimaHorizontal ?? 0.1);

    if (controle.velocidadeHorizontalAtual === undefined) {
        controle.velocidadeHorizontalAtual = 0;
    }

    // Aplica desaceleração se a velocidade atual não for zero
    if (Math.abs(controle.velocidadeHorizontalAtual) > limiteVelocidadeMinima) {
        if (controle.velocidadeHorizontalAtual > 0) {
            controle.velocidadeHorizontalAtual = Math.max(0, controle.velocidadeHorizontalAtual - desaceleracao);
        } else {
            controle.velocidadeHorizontalAtual = Math.min(0, controle.velocidadeHorizontalAtual + desaceleracao);
        }
        controle.x += controle.velocidadeHorizontalAtual;
    } else {
        // Se a velocidade for muito baixa, para completamente para evitar micro-movimentos
        controle.velocidadeHorizontalAtual = 0;
    }
};