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
        const ETAPAS_PRE_ABERTURA = 2; // 1) recolhe itens do cinto 2) esconde cinto/colete
        const ETAPAS_POS_FECHAMENTO = 2; // 1) mostra cinto/colete 2) restaura itens externos

        function getDisplayParaArmaEscudo(selecaoAtual, tipo) {
            if (selecaoAtual === 'todos') return 'block';
            if (tipo === 'arma' && selecaoAtual === 'arma') return 'block';
            if (tipo === 'escudo' && selecaoAtual === 'escudo') return 'block';
            return 'none';
        }

        function aplicarVisibilidadeEquipamentos(guardados) {
            const selecao = controle.selecaoCinto || 'todos';

            if (controle.armaElemento) {
                controle.armaElemento.style.display = (controle.temArma && !guardados)
                    ? getDisplayParaArmaEscudo(selecao, 'arma')
                    : 'none';
            }

            if (controle.escudoElemento) {
                const temEscudo = !!(controle.temEscudo || controle.escudoVermelho);
                controle.escudoElemento.style.display = (temEscudo && !guardados)
                    ? getDisplayParaArmaEscudo(selecao, 'escudo')
                    : 'none';
            }

            if (controle.botaElemento) {
                controle.botaElemento.style.display = (controle.temBota && !guardados) ? 'block' : 'none';
            }

            if (controle.jetpackElemento) {
                controle.jetpackElemento.style.display = (controle.temJetpack && !guardados) ? 'block' : 'none';
            }

            if (controle.jetFogoElemento && (guardados || !controle.jetpackAtivo)) {
                controle.jetFogoElemento.style.display = 'none';
            }

            if (controle.garraElemento) {
                controle.garraElemento.style.display = (controle.temGarra && !guardados) ? 'block' : 'none';
            }
        }

        function aplicarEtapasVisuaisAbertura(etapa) {
            // Etapa 0: recolher itens (se estavam para fora)
            if (etapa >= 0 && controle.temCinto && controle._aberturaItensEstavamParaFora) {
                controle.itensGuardadosNoCinto = true;
                aplicarVisibilidadeEquipamentos(true);
            }

            // Etapa 1: esconder cinto e colete antes dos quadros de transformação
            if (etapa >= 1) {
                if (controle.cintoElemento) {
                    controle.cintoElemento.style.display = 'none';
                }
                if (controle.coleteElemento) {
                    controle.coleteElemento.style.display = 'none';
                }
            }
        }

        function aplicarEtapasVisuaisFechamento(etapa) {
            // Etapa 0..3: timeline reversa do sprite

            // Etapa 4: mostra cinto e colete
            if (etapa >= TOTAL_FRAMES_ABERTURA) {
                if (controle.cintoElemento) {
                    controle.cintoElemento.style.display = controle.temCinto ? 'block' : 'none';
                }
                if (controle.coleteElemento) {
                    controle.coleteElemento.style.display = controle.temColete ? 'block' : 'none';
                }
            }

            // Etapa 5: se estavam para fora, volta com os itens externos
            if (etapa >= (TOTAL_FRAMES_ABERTURA + 1) && controle._aberturaItensEstavamParaFora) {
                controle.itensGuardadosNoCinto = false;
                aplicarVisibilidadeEquipamentos(false);
            }
        }

        function ativarControleBBAposAbertura() {
            if (window.controlandoBB) return;

            const posX = Number(controle.x || 0);
            const posY = Number(controle.y || 0);

            if (!window.bbEntidade || !window.bbEntidade.elemento) {
                if (typeof window.inicializarBB === 'function') {
                    window.inicializarBB(posX, posY, window.config || config || {});
                }
            } else {
                window.bbEntidade.x = posX;
                window.bbEntidade.y = posY;
                if (window.bbEntidade.elemento) {
                    window.bbEntidade.elemento.style.left = posX + 'px';
                    window.bbEntidade.elemento.style.bottom = posY + 'px';
                }
            }

            window.controlandoCao = false;
            window.controlandoGato = false;

            if (typeof window.controlarBB === 'function') {
                window.controlarBB();
            } else {
                window.controlandoBB = true;
                window.cameraZoomFactor = 1.5;
            }
        }

        function obterTempoTotalAnimacao() {
            return Number(config.tempoAberturaFrame ?? 20) * (ETAPAS_PRE_ABERTURA + TOTAL_FRAMES_ABERTURA);
        }

        function obterTempoTotalFechamento() {
            return Number(config.tempoAberturaFrame ?? 20) * (TOTAL_FRAMES_ABERTURA + ETAPAS_POS_FECHAMENTO);
        }

        function iniciarAbertura() {
            if (controle.abrindo || controle.fechando) return false;
            
            controle.tempoAbertura = obterTempoTotalAnimacao();
            controle.frameAbertura = 0;
            controle.etapaAbertura = 0;
            controle.abrindo = true;
            controle.fechando = false;
            controle.estaoAberto = false;
            controle.estaAgachado = false;
            controle._aberturaItensEstavamParaFora = !!(controle.temCinto && !controle.itensGuardadosNoCinto);

            window.AudioManager?.playSFX('engrenagem', 0.5);
            return true;
        }

        function iniciarFechamento() {
            if (controle.abrindo || controle.fechando) return false;

            controle.tempoAbertura = obterTempoTotalFechamento();
            controle.frameAbertura = 3;
            controle.etapaAbertura = 0;
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
            const tempoTotalAbertura = obterTempoTotalAnimacao();
            const tempoTotalFechamento = obterTempoTotalFechamento();

            if (controle.abrindo && (controle.tempoAbertura || 0) > 0) {
                controle.tempoAbertura--;

                const decorrido = tempoTotalAbertura - controle.tempoAbertura;
                const etapaAtual = Math.min(
                    ETAPAS_PRE_ABERTURA + TOTAL_FRAMES_ABERTURA - 1,
                    Math.floor(decorrido / tempoFrameNormal)
                );

                controle.etapaAbertura = etapaAtual;
                aplicarEtapasVisuaisAbertura(etapaAtual);

                const frameSprite = Math.max(0, etapaAtual - ETAPAS_PRE_ABERTURA);
                controle.frameAbertura = Math.min(frameSprite, 3);

                // Quando o timer chega a zero, trava imediatamente no último frame.
                if ((controle.tempoAbertura || 0) <= 0) {
                    controle.tempoAbertura = 0;
                    controle.abrindo = false;
                    controle.fechando = false;
                    controle.estaoAberto = true;
                    controle.frameAbertura = 3;
                    ativarControleBBAposAbertura();
                }
                return;
            }

            if (controle.fechando && (controle.tempoAbertura || 0) > 0) {
                controle.tempoAbertura--;

                const decorrido = tempoTotalFechamento - controle.tempoAbertura;
                const etapaAtual = Math.min(
                    TOTAL_FRAMES_ABERTURA + ETAPAS_POS_FECHAMENTO - 1,
                    Math.floor(decorrido / tempoFrameNormal)
                );

                controle.etapaAbertura = etapaAtual;
                aplicarEtapasVisuaisFechamento(etapaAtual);

                // Fecha em ordem reversa: per_aberto -> per_abrindo2 -> per_abrindo1 -> per_parado2.
                if (etapaAtual < TOTAL_FRAMES_ABERTURA) {
                    controle.frameAbertura = Math.max(0, 3 - etapaAtual);
                } else {
                    controle.frameAbertura = 0;
                }

                if ((controle.tempoAbertura || 0) <= 0) {
                    controle.tempoAbertura = 0;
                    controle.abrindo = false;
                    controle.fechando = false;
                    controle.estaoAberto = false;
                    controle.frameAbertura = 0;
                    controle.etapaAbertura = 0;
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
