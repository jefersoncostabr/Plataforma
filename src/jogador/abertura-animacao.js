(function () {
    function criarSistemaAberturaJogador(opcoes = {}) {
        const {
            controle,
            config,
            acaoAtiva = () => false,
            consumirAcao = () => {}
        } = opcoes;

        if (!controle || !config) {
            throw new Error('Controle e config são obrigatórios para o sistema de abertura.');
        }

        const TOTAL_FRAMES_ABERTURA = 4;

        function obterTempoTotalAnimacao() {
            return Number(config.tempoAberturaFrame ?? 20) * TOTAL_FRAMES_ABERTURA;
        }

        function iniciarAbertura() {
            if (controle.abrindo || controle.fechando) return false;
            
            controle.tempoAbertura = obterTempoTotalAnimacao();
            controle.frameAbertura = 0;
            controle.abrindo = true;
            controle.fechando = false;
            controle.estaoAberto = false;
            controle.estaAgachado = false;

            window.AudioManager?.playSFX('engrenagem', 0.5);
            return true;
        }

        function iniciarFechamento() {
            if (controle.abrindo || controle.fechando) return false;

            controle.tempoAbertura = obterTempoTotalAnimacao();
            controle.frameAbertura = 3;
            controle.abrindo = false;
            controle.fechando = true;
            controle.estaoAberto = false;
            controle.estaAgachado = false;

            window.AudioManager?.playSFX('engrenagem', 0.5);
            return true;
        }

        function processarEntradaAbertura() {
            if (!acaoAtiva('abertura')) return false;

            // Consome imediatamente para garantir acionamento por toque único.
            consumirAcao('abertura');

            if (controle.abrindo || controle.fechando) return false;

            if (controle.estaoAberto) {
                // Se já está aberto, fecha
                return iniciarFechamento();
            } else if (!controle.abrindo) {
                // Se não está aberto e não está abrindo, inicia a abertura
                return iniciarAbertura();
            }

            return false;
        }

        function atualizarTemporizadores() {
            const tempoFrameNormal = Number(config.tempoAberturaFrame ?? 20);
            const tempoTotal = obterTempoTotalAnimacao();

            if (controle.abrindo && (controle.tempoAbertura || 0) > 0) {
                controle.tempoAbertura--;

                // A animação é controlada por tempo de frame para garantir a ordem:
                // per_parado2 -> per_abrindo1 -> per_abrindo2 -> per_aberto.
                const decorrido = tempoTotal - controle.tempoAbertura;
                const frameAtual = Math.floor(decorrido / tempoFrameNormal);
                controle.frameAbertura = Math.min(frameAtual, 3);

                // Quando o timer chega a zero, trava imediatamente no último frame.
                if ((controle.tempoAbertura || 0) <= 0) {
                    controle.tempoAbertura = 0;
                    controle.abrindo = false;
                    controle.fechando = false;
                    controle.estaoAberto = true;
                    controle.frameAbertura = 3;
                }
                return;
            }

            if (controle.fechando && (controle.tempoAbertura || 0) > 0) {
                controle.tempoAbertura--;

                // Fecha em ordem reversa: per_aberto -> per_abrindo2 -> per_abrindo1 -> per_parado2.
                const decorrido = tempoTotal - controle.tempoAbertura;
                const frameAtual = Math.floor(decorrido / tempoFrameNormal);
                controle.frameAbertura = Math.max(0, 3 - frameAtual);

                if ((controle.tempoAbertura || 0) <= 0) {
                    controle.tempoAbertura = 0;
                    controle.abrindo = false;
                    controle.fechando = false;
                    controle.estaoAberto = false;
                    controle.frameAbertura = 0;
                }
            }
        }

        function obterSpriteAbertura() {
            if (!controle.estaoAberto && !controle.abrindo && !controle.fechando && (controle.tempoAbertura || 0) <= 0) return null;

            const sprites = [
                config.spriteAberturaPlayer1 || 'assets/personagem/personagem_parado2.png',
                config.spriteAberturaPlayer2 || 'assets/personagem/per_abrindo1.png',
                config.spriteAberturaPlayer3 || 'assets/personagem/per_abrindo2.png',
                config.spriteAberturaPlayerFinal || 'assets/personagem/per_aberto.png'
            ];

            return sprites[controle.frameAbertura || 0] || sprites[3];
        }

        window.sistemaAbertura = {
            processarEntrada: processarEntradaAbertura,
            atualizarTemporizadores: atualizarTemporizadores,
            obterSprite: obterSpriteAbertura,
            isAberto: () => controle.estaoAberto || false
        };
    }

    window.criarSistemaAberturaJogador = criarSistemaAberturaJogador;
})();
