(function () {
    function criarSistemaJetpackJogador(opcoes = {}) {
        const {
            controle,
            config,
            acaoAtiva = () => false,
            aplicarFisica = () => {}
        } = opcoes;

        if (!controle || !config) {
            throw new Error('Controle e config são obrigatórios para o sistema de jetpack.');
        }

        function podeUsarJetpack() {
            return !!controle.temJetpack && !controle.itensGuardadosNoCinto;
        }

        function iniciarJetpack() {
            window.AudioManager?.playSFX('fogueteligando', 0.5);
            // Inicia o som de propulsão contínua (loop)
            if (window.AudioManager && !controle._jetpackLoop) {
                controle._jetpackLoop = typeof window.AudioManager.createSFX === 'function' 
                    ? window.AudioManager.createSFX('trusterhover', 0.3, true) 
                    : null;
                controle._jetpackLoop?.play().catch(() => {});
            }
            controle.jetpackAtivo = true;
            if ((controle.timerVooRestante || 0) <= 0) {
                controle.timerVooRestante = Number(config.jetpackDuracaoVoo ?? 360);
            }
            controle.framesVoando = 0;
            controle.timerAtivacaoJetpack = 0;
        }

        // Expõe para ativação externa (ex: auto-reparo no inventário)
        controle.iniciarJetpack = iniciarJetpack;

        function desligarJetpack(iniciarCooldown = false) {
            // Para o som de propulsão quando o jetpack desliga
            if (controle._jetpackLoop) {
                controle._jetpackLoop.pause();
                controle._jetpackLoop = null;
            }
            controle.jetpackAtivo = false;
            controle.jetpackHovering = false;
            controle.velocidadeY = 0;
            controle.timerAtivacaoJetpack = 0;

            if (iniciarCooldown) {
                controle.cooldownVooJetpack = Number(config.jetpackCooldown ?? 180);
            }
        }

        function atualizarCooldownJetpack() {
            if ((controle.cooldownVooJetpack || 0) > 0) {
                controle.cooldownVooJetpack--;
            }
        }

        function atualizarJetpack(opcoesAtualizacao = {}) {
            const {
                teclaPuloAtiva = false,
                puloAcabouDeSerPressionado = false,
                forcaPuloFinal = 0
            } = opcoesAtualizacao;

            if (!podeUsarJetpack()) {
                controle.timerAtivacaoJetpack = 0;
                if (controle.jetpackAtivo) {
                    desligarJetpack(false);
                }

                aplicarFisica(
                    controle,
                    { ...controle.teclas, ' ': teclaPuloAtiva },
                    forcaPuloFinal,
                    config.inimigoGravidade,
                    config.inimigoPuloCooldown
                );
                return false;
            }

            const segurandoCimaAtivacao = acaoAtiva('cima');

            if (segurandoCimaAtivacao && puloAcabouDeSerPressionado && !controle.jetpackAtivo && (controle.cooldownVooJetpack || 0) === 0) {
                iniciarJetpack();
            } else if (acaoAtiva('pulo') && (controle.cooldownVooJetpack || 0) === 0) {
                controle.timerAtivacaoJetpack = (controle.timerAtivacaoJetpack || 0) + 1;
                if (controle.timerAtivacaoJetpack >= Number(config.jetpackTempoAtivacao ?? 120) && !controle.jetpackAtivo) {
                    iniciarJetpack();
                }
            } else {
                controle.timerAtivacaoJetpack = 0;
            }

            if (controle.jetpackAtivo) {
                controle.timerVooRestante = (controle.timerVooRestante || 0) - 1;
                controle.framesVoando = (controle.framesVoando || 0) + 1;

                const subindo = !!(acaoAtiva('cima') || controle.teclas?.ArrowUp || controle.teclas?.w || controle.teclas?.W);

                if (subindo) {
                    controle.velocidadeY = Number(config.jetpackForcaVoo ?? 2);
                    controle.jetpackHovering = false;
                } else if (puloAcabouDeSerPressionado) {
                    controle.jetpackHovering = !controle.jetpackHovering;
                }

                if (controle.jetpackHovering) {
                    controle.velocidadeY = 0;
                } else if (!subindo) {
                    controle.velocidadeY = -1;
                }

                controle.y += controle.velocidadeY;

                if ((controle.timerVooRestante || 0) <= 0) {
                    desligarJetpack(true);
                } else if (controle.noChao && (controle.framesVoando || 0) > 10) {
                    desligarJetpack(false);
                }

                return true;
            }

            aplicarFisica(
                controle,
                { ...controle.teclas, ' ': teclaPuloAtiva },
                forcaPuloFinal,
                config.inimigoGravidade,
                config.inimigoPuloCooldown
            );

            return false;
        }

        return {
            podeUsarJetpack,
            iniciarJetpack,
            desligarJetpack,
            atualizarCooldownJetpack,
            atualizarJetpack
        };
    }

    window.criarSistemaJetpackJogador = criarSistemaJetpackJogador;
})();