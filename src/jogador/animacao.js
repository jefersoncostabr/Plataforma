/**
 * Atualiza o frame de animação baseado no estado de movimento.
 * Deve ser chamada dentro do loop principal (requestAnimationFrame).
 */
function definirSpriteSeValido(elemento, sprite, fallbackSprite) {
    const spriteValido = typeof sprite === 'string' && sprite.trim() !== ''
        ? sprite
        : (typeof fallbackSprite === 'string' && fallbackSprite.trim() !== '' ? fallbackSprite : null);

    if (!elemento || !spriteValido) return false;
    elemento.src = spriteValido;
    return true;
}

function atualizarAnimacao(controle, elemento, spriteParado, spriteAndando, spriteNoAr, spriteAgachado, spriteAgachadoAndando) {
    const desativarRespiracaoOciosaPet = controle?.tipo === 'cao' || controle?.tipo === 'gato';

    // 1. Inicialização de contadores e estado de ociosidade
    if (controle._idle2sAtivo == null) {
        controle._idle2sAtivo = false;
        controle._idle2sTimerMs = 0;
        controle._idle2sUltimoMs = null;
        controle._idle2sAlterna = false;
    }
    
    if (controle.contadorAnimacao === undefined) {
        controle.contadorAnimacao = 0;
        controle.frameAtual = 0;
    }

    // Função auxiliar para resetar os timers de ociosidade quando o jogador agir
    const resetIdleTimers = () => {
        if (!controle._idle2sAtivo && (controle._idle2sTimerMs || 0) === 0) return;
        controle._idle2sAtivo = false;
        controle._idle2sTimerMs = 0;
        controle._idle2sUltimoMs = null;
        controle._idle2sAlterna = false;
    };

    const agachadoParado = spriteAgachado || spriteParado;
    const agachadoAndando = spriteAgachadoAndando || agachadoParado;

    if (controle.estaAgachado && controle.noChao) {
        resetIdleTimers();
        controle.contadorAnimacao++;

        // Mantém o frame base enquanto estiver agachado parado
        if (!controle.movendoHorizontal) {
            definirSpriteSeValido(elemento, agachadoParado, spriteParado);
            controle.contadorAnimacao = 0;
            controle.frameAtual = 0;
            return;
        }

        // Alterna entre os sprites de agachado ao andar
        if (controle.contadorAnimacao >= 10) {
            controle.frameAtual = controle.frameAtual === 0 ? 1 : 0;
            definirSpriteSeValido(
                elemento,
                controle.frameAtual === 0 ? agachadoParado : agachadoAndando,
                spriteParado
            );
            controle.contadorAnimacao = 0;
        }
        return;
    }

    // Estado final da abertura: trava o sprite em "aberto" sem voltar para animações normais.
    if (controle.estaoAberto) {
        resetIdleTimers();
        definirSpriteSeValido(
            elemento,
            window.config?.spriteAberturaPlayerFinal || 'assets/personagem/per_aberto.png',
            spriteParado
        );
        return;
    }

    // Enquanto abre, o sprite é controlado exclusivamente pela timeline da abertura.
    if (controle.abrindo || (controle.tempoAbertura > 0)) {
        resetIdleTimers();
        const spriteAbertura = window.sistemaAbertura?.obterSprite?.();
        if (spriteAbertura) {
            definirSpriteSeValido(elemento, spriteAbertura, spriteParado);
        }
        return;
    }

    // Se o personagem estiver chutando, não altera o sprite aqui para evitar conflitos
    if (controle.chutando || (controle.tempoChute > 0)) {
        resetIdleTimers();
        return;
    }

    // Só anima se estiver movendo horizontalmente E estiver no chão
    if (controle.movendoHorizontal && controle.noChao) {
        resetIdleTimers();
        controle.contadorAnimacao++;

        // Troca o frame a cada 10 quadros (aprox. 6 vezes por segundo em 60fps)
        if (controle.contadorAnimacao >= 10) {
            controle.frameAtual = controle.frameAtual === 0 ? 1 : 0;
            definirSpriteSeValido(
                elemento,
                controle.frameAtual === 0 ? spriteParado : spriteAndando,
                spriteParado
            );
            //console.log('[ANIMACAO] 🔄 Frame trocado para:', elemento.src);
            controle.contadorAnimacao = 0;
        }
    } else if (!controle.noChao && spriteNoAr) {
        resetIdleTimers();
        // Se estiver no ar, usa o sprite específico para pulo/queda
        definirSpriteSeValido(elemento, spriteNoAr, spriteParado);
        controle.contadorAnimacao = 0;
        controle.frameAtual = 0;
    } else {
        if (desativarRespiracaoOciosaPet) {
            resetIdleTimers();
            definirSpriteSeValido(elemento, spriteParado);
            controle.contadorAnimacao = 0;
            controle.frameAtual = 0;
            return;
        }

        // ESTADO OCIOSO (IDLE) - Lógica de respiração após 2 segundos de inatividade
        const agoraMs = (performance?.now ? performance.now() : Date.now());
        const delta = controle._idle2sUltimoMs ? Math.max(0, agoraMs - controle._idle2sUltimoMs) : 0;
        controle._idle2sUltimoMs = agoraMs;

        // Seleciona os sprites de respiração (idle) armados se o revólver estiver em mãos.
        // Prioridade: controle -> config -> fallback local.
        const estaArmadoIdle = controle.temArma && !controle.itensGuardadosNoCinto;
        const cfg = window.config || {};

        const spriteParado2Desarmado =
            controle.spriteParado2 ||
            cfg.spriteParado2Player ||
            cfg.spriteParadoOciosoPlayer ||
            'assets/personagem/personagem_parado2.png';
        const spriteParadoRespDesarmado =
            controle.spriteParadoResp ||
            cfg.spriteParadoRespPlayer ||
            cfg.spriteRespiracaoPlayer ||
            'assets/personagem/per_parado_resp.png';

        const spriteParado2Armado =
            controle.spriteParado2Armado ||
            cfg.spriteParado2ArmadoPlayer ||
            'assets/personagem/per_armado/per_ocio_armado.png';
        const spriteParadoRespArmado =
            controle.spriteParadoRespArmado ||
            cfg.spriteParadoRespArmadoPlayer ||
            'assets/personagem/per_armado/per_par_res_armado.png';

        const IMAGEM_PARADO2 = estaArmadoIdle ? spriteParado2Armado : spriteParado2Desarmado;
        const IMAGEM_PARADO_RESP = estaArmadoIdle ? spriteParadoRespArmado : spriteParadoRespDesarmado;

        if (!controle._idle2sAtivo) {
            controle._idle2sTimerMs += delta;
            if (controle._idle2sTimerMs >= 2000) {
                controle._idle2sAtivo = true;
                controle._idle2sTimerMs = 0;
                controle._idle2sAlterna = false;
                definirSpriteSeValido(elemento, IMAGEM_PARADO2, spriteParado);
            } else {
                // Enquanto espera o timer de 2s, mantém o sprite parado base
                definirSpriteSeValido(elemento, spriteParado);
            }
        } else {
            // Alterna os sprites de respiração (Animação Ativa)
            controle._idle2sTimerMs += delta;
            if (controle._idle2sTimerMs >= 800) {
                controle._idle2sTimerMs = 0;
                controle._idle2sAlterna = !controle._idle2sAlterna;
                definirSpriteSeValido(
                    elemento,
                    controle._idle2sAlterna ? IMAGEM_PARADO2 : IMAGEM_PARADO_RESP,
                    spriteParado
                );
            }
            // Note: Se estiver ativo mas não no frame de troca, não fazemos nada 
            // para que o sprite atual seja mantido e não resetado para spriteParado.
        }

        controle.contadorAnimacao = 0;
        controle.frameAtual = 0;
    }
}
