(function () {
    function criarSistemaCombateCorpoACorpoJogador(opcoes = {}) {
        const {
            controle,
            config,
            acaoAtiva = () => false,
            detectarColisaoHitbox,
            obterKnockback = () => Number(config?.knockbackBase ?? config?.knockbackInimigo ?? 150),
            animarDanoAlvo = () => {},
            virarFenoParaFonteDano = () => {},
            processarMorteFeno = () => {},
            removerInimigoDerrotado = () => {}
        } = opcoes;

        if (!controle || !config) {
            throw new Error('Controle e config são obrigatórios para o sistema de combate corpo a corpo.');
        }

        if (typeof detectarColisaoHitbox !== 'function') {
            throw new Error('detectarColisaoHitbox é obrigatório para o sistema de combate corpo a corpo.');
        }

        function cancelarChuteSeAgachado() {
            if (!controle.estaAgachado) return false;

            controle.tempoChute = 0;
            controle.chutando = false;
            controle.framesImpulsoRestante = 0;
            controle.velocidadeDash = 0;
            return true;
        }

        function atualizarEstadoChute() {
            if (cancelarChuteSeAgachado()) {
                return;
            }

            controle.chutando = (controle.tempoChute || 0) > 0;
        }

        function iniciarChute(inimigos = window.inimigos) {
            if (cancelarChuteSeAgachado()) {
                return false;
            }

            controle.tempoChute = Number(config.tempoChute ?? 0);
            const cooldownBaseChute = Number(config.cooldownChute ?? 0);
            const multiplicadorCooldownChute = Number(controle.multiplicadorCooldownChute ?? 1);
            controle.cooldownChute = cooldownBaseChute > 0
                ? Math.max(1, Math.round(cooldownBaseChute * multiplicadorCooldownChute))
                : 0;

            window.AudioManager?.playSFX('chute', 0.4);

            const duracaoDash = 10;
            const botaAtivaNoChute = ((controle.temBota && !controle.botaVermelha) || controle.eletricidadeTemporariaAtiva) && !controle.itensGuardadosNoCinto;
            const multiplicadorChute = botaAtivaNoChute ? 2 : 1;
            controle.framesImpulsoRestante = duracaoDash;
            controle.velocidadeDash = (Number(config.impulsoChute ?? 0) * multiplicadorChute) / duracaoDash;
            window.TutorialControles?.registrarAcao?.('chute');

            if (Array.isArray(inimigos)) {
                inimigos.forEach((inimigo) => {
                    if (inimigo) inimigo.foiAtingidoNesteChute = false;
                });
            }

            atualizarEstadoChute();
            return true;
        }

        function processarEntradaChute(inimigos = window.inimigos) {
            // Ataque combinado: baixo + chute (verificado antes do cancelamento por agachar)
            const agoraMs = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
            if (acaoAtiva('baixo') && acaoAtiva('chute') && (controle.cooldownChute || 0) === 0 && !controle.chuteDuploAtivo && !(controle.chuteDuploCooldownAte && agoraMs < controle.chuteDuploCooldownAte)) {
                console.log('[ATAQUE] Novo ataque (baixo + chute) ativado');
                controle.estaAgachado = false;
                controle.chuteDuploAtivo = true;
                controle.sequenciaChuteDuplo = true;
                controle.chuteDuploCooldownAte = agoraMs + 800;
                return iniciarChute(inimigos);
            }

            if (controle.estaAgachado) {
                cancelarChuteSeAgachado();
                return false;
            }

            if (acaoAtiva('chute') && (controle.cooldownChute || 0) === 0) {
                return iniciarChute(inimigos);
            }
            return false;
        }

        function aplicarImpulsoChute() {
            if (cancelarChuteSeAgachado()) return;
            if ((controle.framesImpulsoRestante || 0) <= 0) return;

            const direcaoDash = controle.direcao === 'd' ? 1 : -1;
            controle.x += (controle.velocidadeDash || 0) * direcaoDash;
            controle.framesImpulsoRestante--;
        }

        function criarHitboxAtaque() {
            const larguraPlayer = Number(controle.largura || 32);
            const offsetX = Number(config.ATAQUE_OFFSET_X ?? 0);
            const larguraAtaque = Number(config.ATAQUE_LARGURA ?? 0);
            const ataqueX = controle.direcao === 'd'
                ? controle.x + offsetX
                : controle.x + (larguraPlayer - offsetX - larguraAtaque);

            return {
                x: ataqueX,
                y: controle.y + Number(config.ATAQUE_OFFSET_Y ?? 0),
                largura: larguraAtaque,
                altura: Number(config.ATAQUE_ALTURA ?? 0)
            };
        }

        function processarAcertoChuteEmInimigo(inimigo) {
            if (!controle.chutando || !inimigo || inimigo.estaMorto || inimigo.bbRobo || inimigo.ehBBInimigo || inimigo.foiAtingidoNesteChute) {
                return false;
            }

            const hitboxAtaque = criarHitboxAtaque();
            const hitboxInimigo = {
                x: inimigo.x + (inimigo.offsetX || 0),
                y: inimigo.y,
                largura: inimigo.largura,
                altura: inimigo.altura
            };

            if (!detectarColisaoHitbox(hitboxAtaque, hitboxInimigo, 0, 0, 0)) {
                return false;
            }

            const pontoImpacto = (typeof window.calcularCentroColisaoHitboxes === 'function')
                ? window.calcularCentroColisaoHitboxes(hitboxAtaque, hitboxInimigo)
                : null;
            const impactoX = pontoImpacto?.x ?? (hitboxInimigo.x + (hitboxInimigo.largura / 2));
            const impactoY = pontoImpacto?.y ?? (hitboxInimigo.y + (hitboxInimigo.altura / 2));

            if (typeof window.criarAnimacaoImpacto2Frames === 'function') {
                window.criarAnimacaoImpacto2Frames({
                    x: impactoX,
                    y: impactoY,
                    largura: 40,
                    altura: 40,
                    offsetY: 6,
                    opacidade: 1,
                    frameDurationMs: 130
                });
            } else {
                console.warn('[VFX] criarAnimacaoImpacto2Frames indisponivel no chute contra inimigo.');
            }

            inimigo.foiAtingidoNesteChute = true;
            inimigo.estaColetando = false;
            inimigo.timerColeta = 0;
            const danoBase = Number(controle.danoChute || 1);
            const bonusDanoEletrico = controle.eletricidadeTemporariaAtiva ? 1 : 0;
            const dano = danoBase + bonusDanoEletrico;
            inimigo.vida = (inimigo.vida || 0) + dano;

            window.AudioManager?.playSFX('impacto', 0.6);

            // Respeita a vida máxima definida no tipo do inimigo
            const limiteVidaInimigo = typeof window.obterLimiteVidaInimigo === 'function'
                ? window.obterLimiteVidaInimigo(config, inimigo.vidaMax)
                : Number(inimigo.vidaMax ?? config.inimigoVidaMax ?? 3);

            if (inimigo.vida < limiteVidaInimigo) {
                animarDanoAlvo(inimigo);
            }

            const direcaoKnockback = controle.direcao === 'd' ? 1 : -1;
            const forcaRecuo = window.obterForcaKnockback(config, 'playerChute');
            window.aplicarKnockback(inimigo, forcaRecuo, direcaoKnockback, 15);

            virarFenoParaFonteDano(inimigo, controle.x + ((controle.largura || 32) / 2));

            if (inimigo.vida >= limiteVidaInimigo) {
                window.prepararMorteInimigo?.(inimigo, direcaoKnockback);
            }

            return true;
        }

        function atualizarTemporizadores() {
            if ((controle.cooldownChute || 0) > 0) {
                controle.cooldownChute--;
            }

            if ((controle.tempoChute || 0) > 0) {
                controle.tempoChute--;
            }

            // Sequência: após o chute normal, inicia chute para o lado contrário
            if ((controle.tempoChute || 0) === 0 && controle.sequenciaChuteDuplo) {
                controle.sequenciaChuteDuplo = false;
                controle.estaAgachado = false;
                controle.direcao = controle.direcao === 'd' ? 'e' : 'd';
                iniciarChute(window.inimigos);
                // libera novo gatilho após o segundo chute terminar
                const liberar = () => {
                    if ((controle.tempoChute || 0) === 0) {
                        controle.chuteDuploAtivo = false;
                    } else {
                        requestAnimationFrame(liberar);
                    }
                };
                requestAnimationFrame(liberar);
            }

            atualizarEstadoChute();
        }

        return {
            atualizarEstadoChute,
            iniciarChute,
            processarEntradaChute,
            aplicarImpulsoChute,
            obterHitboxAtaque: criarHitboxAtaque,
            processarAcertoChuteEmInimigo,
            atualizarTemporizadores
        };
    }

    window.criarSistemaCombateCorpoACorpoJogador = criarSistemaCombateCorpoACorpoJogador;
})();
