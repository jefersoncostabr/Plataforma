/**
 * Atualiza o frame de animação baseado no estado de movimento.
 * Deve ser chamada dentro do loop principal (requestAnimationFrame).
 */
function atualizarAnimacao(controle, elemento, spriteParado, spriteAndando, spriteNoAr, spriteAgachado, spriteAgachadoAndando) {
    //console.log('[ANIMACAO] Função chamada - tempo chute:', controle.tempoChute, 'chutando:', controle.chutando);
    
    // Se o personagem estiver chutando, não altera o sprite aqui para evitar conflitos
    if (controle.chutando || (controle.tempoChute > 0)) {
        //console.log('[ANIMACAO] ❌ Ignorando - personagem chutando');
        return;
    }

    // Inicializa contadores se não existirem
    if (controle.contadorAnimacao === undefined) {
        //console.log('[ANIMACAO] ⚙️ Inicializando contadores de animação');
        controle.contadorAnimacao = 0;
        controle.frameAtual = 0;
    }

    const agachadoParado = spriteAgachado || spriteParado;
    const agachadoAndando = spriteAgachadoAndando || agachadoParado;

    if (controle.estaAgachado && controle.noChao) {
        controle.contadorAnimacao++;

        // Mantém o frame base enquanto estiver agachado parado
        if (!controle.movendoHorizontal) {
            elemento.src = agachadoParado;
            controle.contadorAnimacao = 0;
            controle.frameAtual = 0;
            return;
        }

        // Alterna entre os sprites de agachado ao andar
        if (controle.contadorAnimacao >= 10) {
            controle.frameAtual = controle.frameAtual === 0 ? 1 : 0;
            elemento.src = controle.frameAtual === 0 ? agachadoParado : agachadoAndando;
            controle.contadorAnimacao = 0;
        }
        return;
    }

    // Só anima se estiver movendo horizontalmente E estiver no chão
    if (controle.movendoHorizontal && controle.noChao) {
        controle.contadorAnimacao++;

        // Troca o frame a cada 10 quadros (aprox. 6 vezes por segundo em 60fps)
        if (controle.contadorAnimacao >= 10) {
            controle.frameAtual = controle.frameAtual === 0 ? 1 : 0;
            elemento.src = controle.frameAtual === 0 ? spriteParado : spriteAndando;
            //console.log('[ANIMACAO] 🔄 Frame trocado para:', elemento.src);
            controle.contadorAnimacao = 0;
        }
    } else if (!controle.noChao && spriteNoAr) {
        // Se estiver no ar, usa o sprite específico para pulo/queda
        //console.log('[ANIMACAO] 🚀 No ar - usando sprite:', spriteNoAr);
        elemento.src = spriteNoAr;
        controle.contadorAnimacao = 0;
        controle.frameAtual = 0;
    } else {
        // Se estiver parado no chão, reseta para o sprite parado
        elemento.src = spriteParado;
        controle.contadorAnimacao = 0;
        controle.frameAtual = 0;
    }
}

