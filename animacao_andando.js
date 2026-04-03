/**
 * Atualiza o frame de animação baseado no estado de movimento.
 * Deve ser chamada dentro do loop principal (requestAnimationFrame).
 */
function atualizarAnimacao(controle, elemento, spriteParado, spriteAndando) {
    // Se o personagem estiver chutando, não altera o sprite aqui para evitar conflitos
    if (controle.chutando || (controle.tempoChute > 0)) return;

    // Inicializa contadores se não existirem
    if (controle.contadorAnimacao === undefined) {
        controle.contadorAnimacao = 0;
        controle.frameAtual = 0;
    }

    // Só anima se estiver movendo horizontalmente E estiver no chão
    if (controle.movendoHorizontal && controle.noChao) {
        controle.contadorAnimacao++;

        // Troca o frame a cada 10 quadros (aprox. 6 vezes por segundo em 60fps)
        if (controle.contadorAnimacao >= 10) {
            controle.frameAtual = controle.frameAtual === 0 ? 1 : 0;
            elemento.src = controle.frameAtual === 0 ? spriteParado : spriteAndando;
            controle.contadorAnimacao = 0;
        }
    } else {
        // Se estiver parado ou no ar, reseta para o sprite parado
        elemento.src = spriteParado;
        controle.contadorAnimacao = 0;
        controle.frameAtual = 0;
    }
}