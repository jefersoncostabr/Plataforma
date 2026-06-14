// console.log('[IDLE/FILE] animacao.js carregado');


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

function atualizarAnimacao(controle, elemento, spriteParado, spriteAndando, spriteNoAr, spriteAgachado, spriteAgachadoAndando, spriteCarregando1, spriteCarregando2, spriteCarregando3, spriteCarregando4, spriteCarregando5, spriteCarregando6) {

    // Logs temporários para diagnosticar quando o idle/respiração não roda.
const __debugIdle = false;

    // Permite inspeção via DevTools mesmo sem setar a flag corretamente (fallback seguro)
    // Quando DEBUG_IDLE_PLAYER não está setado, mas ainda assim você quer logs, use: window.__DEBUG_IDLE_FORCE = true;
    const __debugIdleForce = false;



    // Mesmo em modo debug, não há garantia que o animador rode.
    // Este log inicial ajuda a confirmar que a função está sendo executada.
    if ((__debugIdle || __debugIdleForce) && !controle._idle2sDbgInitLogged) {

        controle._idle2sDbgInitLogged = true;
        console.log('[IDLE/DBG] iniciar', {
            tipo: controle?.tipo,
            temArma: !!controle?.temArma,
            itensGuardadosNoCinto: !!controle?.itensGuardadosNoCinto
        });
    }

    const __agoraMs = (typeof performance !== 'undefined' && typeof performance.now === 'function')
        ? performance.now()
        : Date.now();
    if (__debugIdle) {
        // Evita spam: loga só a cada ~30 frames.
        controle._idle2sDbgCounter = (controle._idle2sDbgCounter || 0) + 1;
        if (controle._idle2sDbgCounter % 30 === 0) {
            console.log('[IDLE/DBG]', {
                noChao: !!controle.noChao,
                movendoHorizontal: !!controle.movendoHorizontal,
                estaAgachado: !!controle.estaAgachado,
                carregando: !!controle.carregando,
                estaoAberto: !!controle.estaoAberto,
                abrindo: !!controle.abrindo,
                tempoAbertura: Number(controle.tempoAbertura || 0),
                chutando: !!controle.chutando,
                tempoChute: Number(controle.tempoChute || 0),
                tipo: controle.tipo,
                itensGuardadosNoCinto: !!controle.itensGuardadosNoCinto,
                temArma: !!controle.temArma,
                _idle2sAtivo: !!controle._idle2sAtivo,
                _idle2sTimerMs: Number(controle._idle2sTimerMs || 0)
            });
        }
        controle._idle2sUltimoMs = controle._idle2sUltimoMs ?? __agoraMs;
    }

    const desativarRespiracaoOciosaPet = controle?.tipo === 'cao' || controle?.tipo === 'gato';

    const agoraMs = (typeof performance !== 'undefined' && typeof performance.now === 'function')
        ? performance.now()
        : Date.now();
    const eletricidadeTemporariaAtiva = Number(controle.eletricidadeTemporariaAte || 0) > agoraMs;
    controle.eletricidadeTemporariaAtiva = eletricidadeTemporariaAtiva;
    const vfxEletricidadeAtivo = !!controle.carregando || eletricidadeTemporariaAtiva || !!controle.garra2Ativa;
    
    if (controle.contadorAnimacao === undefined) {
        controle.contadorAnimacao = 0;
        controle.frameAtual = 0;
    }

    // Garante estado numérico válido do timer de idle para evitar NaN em runtime.
    if (!Number.isFinite(controle._idle2sTimerMs)) {
        controle._idle2sTimerMs = 0;
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

    // VFX de eletricidade (ativa ao segurar T ou por 60s no duplo toque de T)
    if (controle.vfxEletricidadeElemento && vfxEletricidadeAtivo) {
        controle.vfxEletricidadeElemento.style.display = 'block';
        const seqEletricidade = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2]; // 1-6 e volta
        if (controle._vfxElecTimer === undefined) {
            controle._vfxElecTimer = 0;
            controle._vfxElecIdx = 0;
        }
        controle._vfxElecTimer++;
        if (controle._vfxElecTimer >= 7) { // Velocidade da eletricidade
            controle._vfxElecTimer = 0;
            controle._vfxElecIdx = (controle._vfxElecIdx + 1) % seqEletricidade.length;
            const frameNum = seqEletricidade[controle._vfxElecIdx];
            controle.vfxEletricidadeElemento.src = `assets/vfx/eletreciade_player/eletrecidade${frameNum}.png`;
        }
    }

    // 2. Animação de Carregamento (Tecla T)
    if (controle.carregando && controle.noChao) {
        resetIdleTimers();
        if (controle.timerCarregando === undefined || controle.frameCarregandoAtual === undefined) {
            controle.timerCarregando = 0;
            controle.frameCarregandoAtual = 0;
        }

        const delayFrame1 = 20; // Duração do primeiro frame (aprox. 0.3s)
        const frameDuration = 5; // Duração de cada frame subsequente (aprox. 0.08s)
        const totalLoadingFrames = 6;
        const loadingSprites = [spriteCarregando1, spriteCarregando2, spriteCarregando3, spriteCarregando4, spriteCarregando5, spriteCarregando6];

        if (controle.frameCarregandoAtual === 0 && controle.timerCarregando < delayFrame1) {
            definirSpriteSeValido(elemento, loadingSprites[0], spriteParado);
            controle.timerCarregando++; // Incrementa o timer para o primeiro frame
        } else if (controle.frameCarregandoAtual < totalLoadingFrames - 1) {
            // Avança para o próximo frame após sua duração
            if (controle.timerCarregando >= frameDuration) {
                controle.frameCarregandoAtual++;
                controle.timerCarregando = 0; // Reseta o timer para o novo frame
            } else {
                controle.timerCarregando++;
            }
            definirSpriteSeValido(elemento, loadingSprites[controle.frameCarregandoAtual], spriteParado);
        } else {
            // Fica no último frame enquanto o jogador segurar o botão
            definirSpriteSeValido(elemento, loadingSprites[totalLoadingFrames - 1], spriteParado);
        }

        // Bloqueia as demais animações de movimento/idle
        controle.contadorAnimacao = 0;
        controle.frameAtual = 0;
        return;
    } else {
        if (controle.timerCarregando > 0 || controle.frameCarregandoAtual > 0) { // Reseta apenas se estava ativo
            controle.timerCarregando = 0;
            controle.frameCarregandoAtual = 0;
        }
        if (controle.vfxEletricidadeElemento && !vfxEletricidadeAtivo) {
            controle.vfxEletricidadeElemento.style.display = 'none';
            controle._vfxElecTimer = undefined;
            controle._vfxElecIdx = undefined;
        }
    }

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
