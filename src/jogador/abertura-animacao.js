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

        function atualizarEstadoAbertura() {
            controle.abrindo = (controle.tempoAbertura || 0) > 0;
        }

        function iniciarAbertura() {
            if (controle.abrindo) return false;
            
            controle.tempoAbertura = Number(config.tempoAberturaFrame ?? 20) * 4; // 4 frames de duração
            controle.frameAbertura = 0;
            controle.abrindo = true;
            controle.estaoAberto = false;

            window.AudioManager?.playSFX('engrenagem', 0.5);
            atualizarEstadoAbertura();
            return true;
        }

        function processarEntradaAbertura() {
            if (!acaoAtiva('abertura')) return false;

            // Consome imediatamente para garantir acionamento por toque único.
            consumirAcao('abertura');

            if (controle.abrindo) return false;

            if (controle.estaoAberto) {
                // Se já está aberto, fecha
                fecharAbertura();
                return false;
            } else if (!controle.abrindo) {
                // Se não está aberto e não está abrindo, inicia a abertura
                return iniciarAbertura();
            }

            return false;
        }

        function atualizarTemporizadores() {
            if ((controle.tempoAbertura || 0) > 0) {
                controle.tempoAbertura--;

                // A animação é controlada por tempo de frame para garantir a ordem:
                // per_parado2 -> per_abrindo1 -> per_abrindo2 -> per_aberto.
                const tempoFrameNormal = Number(config.tempoAberturaFrame ?? 20);
                const frameAtual = Math.floor((4 * tempoFrameNormal - controle.tempoAbertura) / tempoFrameNormal);
                controle.frameAbertura = Math.min(frameAtual, 3);

                // Quando o timer chega a zero, trava imediatamente no último frame.
                if ((controle.tempoAbertura || 0) <= 0) {
                    controle.tempoAbertura = 0;
                    controle.abrindo = false;
                    controle.estaoAberto = true;
                    controle.frameAbertura = 3;
                } else {
                    atualizarEstadoAbertura();
                }
            }
        }

        function obterSpriteAbertura() {
            if (!controle.estaoAberto && !controle.abrindo && (controle.tempoAbertura || 0) <= 0) return null;

            const sprites = [
                config.spriteAberturaPlayer1 || 'assets/personagem/personagem_parado2.png',
                config.spriteAberturaPlayer2 || 'assets/personagem/per_abrindo1.png',
                config.spriteAberturaPlayer3 || 'assets/personagem/per_abrindo2.png',
                config.spriteAberturaPlayerFinal || 'assets/personagem/per_aberto.png'
            ];

            return sprites[controle.frameAbertura || 0] || sprites[3];
        }

        function fecharAbertura() {
            controle.estaoAberto = false;
            controle.abrindo = false;
            controle.tempoAbertura = 0;
            controle.frameAbertura = 0;
        }

        window.debugAberturaEstado = function() {
            const estado = {
                abrindo: !!controle.abrindo,
                estaoAberto: !!controle.estaoAberto,
                tempoAbertura: Number(controle.tempoAbertura || 0),
                frameAbertura: Number(controle.frameAbertura || 0),
                teclaY: !!(controle.teclas?.y || controle.teclas?.Y),
                acaoAberturaAtiva: !!acaoAtiva('abertura'),
                spriteAtual: controle.elemento?.src || null
            };
            console.log('[DEBUG ABERTURA ESTADO]', estado);
            return estado;
        };

        window.sistemaAbertura = {
            processarEntrada: processarEntradaAbertura,
            atualizarTemporizadores: atualizarTemporizadores,
            obterSprite: obterSpriteAbertura,
            fechar: fecharAbertura,
            isAberto: () => controle.estaoAberto || false
        };
    }

    window.criarSistemaAberturaJogador = criarSistemaAberturaJogador;
})();
