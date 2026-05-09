(function () {
    const BLOCO_TAMANHO = 32;
    const ALTURA_LANCAMENTO_BLOCOS = 6;

    const estado = {
        ativo: false,
        paraquedasBB: null
    };

    function obterPalco() {
        return document.getElementById('game-stage') || document.getElementById('jogo-container');
    }

    function adicionarNoLayerOuPalco(elemento, layer) {
        if (typeof window.adicionarAoLayer === 'function' && layer) {
            window.adicionarAoLayer(elemento, layer);
            return;
        }

        const palco = obterPalco();
        if (palco) palco.appendChild(elemento);
    }

    function piscarBrancoAlgumasVezes(elemento, repeticoes = 6, intervaloMs = 180) {
        if (!elemento) return Promise.resolve();

        return new Promise((resolve) => {
            let i = 0;

            const executarPiscada = () => {
                if (i >= repeticoes) {
                    resolve();
                    return;
                }

                // Reusa exatamente o mesmo flash branco usado no dano do jogador.
                if (typeof flashElement === 'function') {
                    flashElement(elemento, 140, 8);
                }

                i++;
                setTimeout(executarPiscada, intervaloMs);
            };

            executarPiscada();
        });
    }

    // Efeito centralizado para evitar duplicidade entre airdrop e resgate do BB.
    window.criarExplosaoSinalizador = function (x, y, opcoes = {}) {
        const largura = Number(opcoes.largura ?? 32);
        const altura = Number(opcoes.altura ?? 32);
        const escalaFinal = Number(opcoes.escalaFinal ?? 4);
        const duracaoMs = Number(opcoes.duracaoMs ?? 800);
        const src = opcoes.src || '../../assets/personagem/explosao.png';
        const layer = opcoes.layer || window.LAYERS?.EFEITOS;

        const explosao = document.createElement('img');
        explosao.src = src;
        explosao.style.position = 'absolute';
        explosao.style.width = largura + 'px';
        explosao.style.height = altura + 'px';
        explosao.style.left = (x - 12) + 'px';
        explosao.style.bottom = (y - 12) + 'px';
        explosao.style.imageRendering = 'pixelated';
        explosao.style.pointerEvents = 'none';
        explosao.style.transform = 'scale(0.1)';
        explosao.style.transition = `transform ${duracaoMs}ms ease-out, opacity ${duracaoMs}ms ease-out`;

        adicionarNoLayerOuPalco(explosao, layer);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                explosao.style.transform = `scale(${escalaFinal})`;
                explosao.style.opacity = '0';
            });
        });

        setTimeout(() => explosao.remove(), duracaoMs);
    };

    function garantirParaquedasBB(config) {
        if (estado.paraquedasBB && estado.paraquedasBB.isConnected) {
            return estado.paraquedasBB;
        }

        const paraquedas = document.createElement('img');
        paraquedas.src = (config && config.spriteParaquedas) || '../../assets/personagem/paraquedas.png';
        paraquedas.style.cssText = 'position:absolute;width:32px;height:32px;image-rendering:pixelated;pointer-events:none;display:none;z-index:24;';
        adicionarNoLayerOuPalco(paraquedas, window.LAYERS?.ITENS);
        estado.paraquedasBB = paraquedas;
        return paraquedas;
    }

    window.atualizarParaquedasBB = function (bb, config) {
        if (!bb || !bb.elemento) return;

        const paraquedas = garantirParaquedasBB(config);

        if (bb.usandoParaquedas) {
            if (bb.velocidadeY < -1.5) bb.velocidadeY = -1.5;

            paraquedas.style.display = 'block';
            paraquedas.style.left = bb.x + 'px';
            paraquedas.style.bottom = (bb.y + 32) + 'px';
            paraquedas.style.transform = bb.elemento.style.transform;

            if (bb.noChao) {
                bb.usandoParaquedas = false;
                paraquedas.style.display = 'none';
            }
        } else if (paraquedas.style.display !== 'none') {
            paraquedas.style.display = 'none';
        }
    };

    window.iniciarResgateMorteComBB = function (opcoes = {}) {
        const controle = opcoes.controle || window.playerControle;
        const elemento = opcoes.elemento || document.getElementById('player');
        const config = opcoes.config || window.config || {};

        if (estado.ativo) {
            return true;
        }

        if (!controle || !elemento) {
            return false;
        }

        estado.ativo = true;

        const origemX = controle.x;
        const origemY = controle.y;
        const centroX = origemX + ((controle.offsetX || 0) + ((controle.largura || 20) / 2));
        const centroY = origemY + ((controle.altura || 25) / 2);

        controle.estaMorrendo = false;
        controle.stunned = true;
        controle.stunTimer = 999999;
        controle.bloqueadoPorResgateBB = true;

        window.controlandoCao = false;
        window.controlandoGato = false;

        // Pets ativos aguardam no lugar até o BB encostar para voltar a seguir.
        if (window.caoEntidade) window.caoEntidade.estaSeguindo = false;
        if (window.gatoEntidade) window.gatoEntidade.estaSeguindo = false;

        piscarBrancoAlgumasVezes(elemento).then(() => {
            window.criarExplosaoSinalizador(centroX, centroY, {
                layer: window.LAYERS?.EFEITOS,
                escalaFinal: 4,
                duracaoMs: 800
            });

            window.AudioManager?.playSFX('impacto', 0.8);

            elemento.style.display = 'none';
            elemento.style.pointerEvents = 'none';
            elemento.style.filter = 'none';

            // Remove o corpo da área jogável para não receber dano/colisão depois da transição.
            controle.x = -9999;
            controle.y = -9999;
            controle.velocidadeY = 0;
            controle.noChao = true;

            if (!window.bbEntidade || !window.bbEntidade.elemento) {
                window.inicializarBB?.(origemX, origemY, config);
            }

            const bb = window.bbEntidade;
            if (!bb) {
                estado.ativo = false;
                return;
            }

            bb.x = origemX;
            bb.y = origemY + (ALTURA_LANCAMENTO_BLOCOS * BLOCO_TAMANHO);
            bb.velocidadeY = 0;
            bb.noChao = false;
            bb.usandoParaquedas = true;
            bb.movendoHorizontal = false;

            // Reusa o mesmo caminho oficial do console (camera + zoom + estado do BB).
            if (typeof window.controlarBB === 'function') {
                window.controlarBB();
            } else {
                console.warn('[RESGATE_BB] window.controlarBB indisponível; aplicando fallback mínimo.');
                window.controlandoBB = true;
                window.cameraZoomFactor = 1.5;
            }
        });

        return true;
    };
})();
