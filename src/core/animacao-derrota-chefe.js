(function () {
    const bossAnimados = new Set();
    let animacaoAtiva = false;
    const DISTANCIA_LATERAL_CHEFE = 96; // 64 + 32
    const ATRASO_INICIO_MS = 900;
    const VELOCIDADE_APROXIMACAO_PX_FRAME = 4;
    const TOLERANCIA_APROXIMACAO_PX = 2;
    const TEMPO_TELA_PRETA_MS = 3000;

    function lerp(a, b, t) {
        return a + (b - a) * Math.max(0, Math.min(1, t));
    }

    function obterSpriteGarra(config) {
        if (typeof window.obterSpriteItem === 'function') {
            return window.obterSpriteItem('garra_catching', config, 'equipado');
        }
        return '../../assets/personagem/garra_catching.png';
    }

    function sincronizarPosicaoInimigo(inimigo) {
        if (!inimigo?.elemento) return;
        inimigo.elemento.style.left = `${Number(inimigo.x || 0)}px`;
        inimigo.elemento.style.bottom = `${Number(inimigo.y || 0)}px`;
        inimigo.elemento.style.transform = inimigo.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
    }

    function sincronizarVisuaisChefeCutscene(inimigo) {
        if (!inimigo || typeof window.sincronizarAcessoriosEntidade !== 'function') return;

        window.sincronizarAcessoriosEntidade(inimigo, {
            garraElemento: inimigo.garraElemento,
            armaElemento: inimigo.armaElemento,
            escudoElemento: inimigo.escudoElemento,
            botaElemento: inimigo.botaElemento,
            jetpackElemento: inimigo.jetpackElemento,
            cintoElemento: inimigo.cintoElemento,
            coleteElemento: inimigo.coleteElemento,
            bateriaElemento: inimigo.bateriaElemento,
            bbCabecaElemento: inimigo.bbCabecaElemento
        }, { forçarSincroniaGarra: true });
    }

    function posicionarGarra(garraElemento, x, y, direcao, spriteGarra) {
        if (!garraElemento) return;
        garraElemento.style.display = 'block';
        garraElemento.style.left = `${x}px`;
        garraElemento.style.bottom = `${y}px`;
        garraElemento.style.transform = direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
        if (spriteGarra) garraElemento.src = spriteGarra;
    }

    function forcarVisualParadoChefe(inimigo, spriteParado, spriteBotaParada) {
        if (!inimigo?.elemento) return;
        inimigo.elemento.src = spriteParado;
        inimigo.elemento.style.filter = 'none';
        inimigo.elemento.style.opacity = '1';
        inimigo.elemento.style.display = 'block';
        if (inimigo.botaElemento) {
            inimigo.botaElemento.src = spriteBotaParada;
        }
    }

    function criarOverlayFadePreto() {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = '#000';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '999999';
        overlay.style.transition = 'opacity 250ms linear';
        return overlay;
    }

    async function executarFadePretoEAvancarFase() {
        if (window.__cutsceneBossFadeEmCurso) return;
        window.__cutsceneBossFadeEmCurso = true;

        const overlay = criarOverlayFadePreto();
        document.body.appendChild(overlay);

        const transicao = new Promise((resolve) => {
            let finalizado = false;
            const concluir = async () => {
                if (finalizado) return;
                finalizado = true;

                await new Promise((resolveEspera) => {
                    window.setTimeout(resolveEspera, TEMPO_TELA_PRETA_MS);
                });

                const proximoIndice = Number(window.nivelAtual || 0) + 1;
                console.log('[CutsceneChefe] fade-preto-finalizado', { proximoIndice });

                if (proximoIndice >= window.niveis.length) {
                    console.warn('[CutsceneChefe] nao existe proxima fase para carregar.');
                    overlay.remove();
                    window.__cutsceneBossFadeEmCurso = false;
                    resolve(false);
                    return;
                }

                if (typeof window.carregarFase === 'function') {
                    try {
                        window.__transicaoFaseAtiva = true;
                        window.nivelAtual = proximoIndice;
                        await window.carregarFase(window.niveis[window.nivelAtual]);
                        console.log('[CutsceneChefe] proxima-fase-carregada', { nivelAtual: window.nivelAtual });
                        resolve(true);
                    } catch (erro) {
                        console.error('[CutsceneChefe] erro ao carregar proxima fase:', erro);
                        resolve(false);
                    } finally {
                        window.__transicaoFaseAtiva = false;
                        overlay.remove();
                        window.__cutsceneBossFadeEmCurso = false;
                    }
                    return;
                }

                overlay.remove();
                window.__cutsceneBossFadeEmCurso = false;
                resolve(false);
            };

            overlay.addEventListener('transitionend', (event) => {
                if (event.propertyName === 'opacity') concluir();
            }, { once: true });

            window.setTimeout(concluir, 300);
        });

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });

        return transicao;
    }

    function iniciarAnimacaoDerrotaChefeEvento(inimigo) {
        if (!inimigo) return false;

        const bossId = String(inimigo.bossId || '').trim();
        if (!bossId || bossAnimados.has(bossId) || animacaoAtiva) return false;

        const player = window.playerControle;
        const palco = document.getElementById('game-stage');
        if (!player?.elemento || !palco) return false;

        bossAnimados.add(bossId);
        animacaoAtiva = true;
        inimigo.cutsceneDerrotaChefeAtiva = true;

        // Evita herdar tremor residual do golpe de morte; o tremor da cutscene
        // deve acontecer apenas no momento da captura pela garra.
        window.cameraTremorAtivo = false;
        window.cameraTremorTempoRestante = 0;

        const config = window.config || {};
        const spriteParadoChefe = config.spriteParadoInimigo || '../../assets/personagem/Personagem_parado.png';
        const spriteBotaParadaChefe = config.spriteBotaParado || '../../assets/personagem/bota_parado.png';
        const spriteGarra = obterSpriteGarra(config);
        const layerUI = document.getElementById('layer-ui') || palco;

        forcarVisualParadoChefe(inimigo, spriteParadoChefe, spriteBotaParadaChefe);

        const estadoPlayer = {
            stunned: !!player.stunned,
            stunTimer: Number(player.stunTimer || 0),
            velocidadeHorizontalAtual: Number(player.velocidadeHorizontalAtual || 0),
            velocidadeY: Number(player.velocidadeY || 0),
            movendoHorizontal: !!player.movendoHorizontal,
            estaoAberto: !!player.estaoAberto
        };

        const idsEquipamentosPlayer = [
            'player-weapon',
            'player-shield',
            'player-boots',
            'player-jetpack',
            'player-jet-fire',
            'player-claw',
            'player-belt',
            'player-vest'
        ];
        const estadoVisibilidadeEquipamentos = idsEquipamentosPlayer.map((id) => {
            const el = document.getElementById(id);
            const displayAnterior = el ? el.style.display : null;
            if (el) el.style.display = 'none';
            return { el, displayAnterior };
        });

        const estadoInimigo = {
            x: Number(inimigo.x || 0),
            y: Number(inimigo.y || 0),
            direcao: inimigo.direcao,
            temGarra: !!inimigo.temGarra,
            garraAnimEstado: inimigo.garraAnimEstado,
            garraDist: Number(inimigo.garraDist || 0),
            garraTimer: Number(inimigo.garraTimer || 0),
            garraItemCarregado: inimigo.garraItemCarregado
        };

        const lado = Number(inimigo.x || 0) >= Number(player.x || 0) ? 1 : -1;

        const bbElemento = document.createElement('img');
        bbElemento.src = config.spriteBB || 'assets/personagem/bb/bb-parado.png';
        bbElemento.style.position = 'absolute';
        bbElemento.style.width = '32px';
        bbElemento.style.height = '32px';
        bbElemento.style.imageRendering = 'pixelated';
        bbElemento.style.pointerEvents = 'none';
        bbElemento.style.zIndex = '55';
        layerUI.appendChild(bbElemento);

        player.stunned = true;
        player.stunTimer = Math.max(120, Number(player.stunTimer || 0));
        player.velocidadeHorizontalAtual = 0;
        player.movendoHorizontal = false;
        player.estaoAberto = true;

        inimigo.temGarra = true;
        inimigo.garraAnimEstado = 'cutscene';
        inimigo.garraDist = 0;
        inimigo.garraTimer = 0;
        inimigo.garraItemCarregado = null;

        if (!inimigo.garraElemento && typeof window.inicializarVisualEquipamentoEntidade === 'function') {
            window.inicializarVisualEquipamentoEntidade(inimigo, inimigo.elemento?.parentElement || palco, config);
        }
        if (typeof window.sincronizarAcessoriosEntidade === 'function') {
            window.sincronizarAcessoriosEntidade(inimigo, {
                garraElemento: inimigo.garraElemento,
                armaElemento: inimigo.armaElemento,
                escudoElemento: inimigo.escudoElemento,
                botaElemento: inimigo.botaElemento,
                jetpackElemento: inimigo.jetpackElemento,
                cintoElemento: inimigo.cintoElemento,
                coleteElemento: inimigo.coleteElemento,
                bateriaElemento: inimigo.bateriaElemento,
                bbCabecaElemento: inimigo.bbCabecaElemento
            }, { forçarSincroniaGarra: true });
        }

        const garraElemento = inimigo.garraElemento;

        const durExtensao = 380;
        const durPuxao = 1800;
        const durSegura = 260;
        const durTotal = durExtensao + durPuxao + durSegura;
        let capturaRegistrada = false;
        let ultimoDecorrido = 0;
        let etapaAtual = 'espera';

        const registrarEtapa = (proximaEtapa) => {
            if (etapaAtual === proximaEtapa) return;
            etapaAtual = proximaEtapa;
        };

        const tick = (inicio) => {
            const agora = (typeof performance !== 'undefined' && typeof performance.now === 'function')
                ? performance.now()
                : Date.now();
            const decorrido = agora - inicio;

            player.stunned = true;
            player.stunTimer = Math.max(2, Number(player.stunTimer || 0));
            player.velocidadeHorizontalAtual = 0;
            player.movendoHorizontal = false;
            player.estaoAberto = true;

            const px = Number(player.x || 0);
            const py = Number(player.y || 0);

            forcarVisualParadoChefe(inimigo, spriteParadoChefe, spriteBotaParadaChefe);
            inimigo.x = px + (DISTANCIA_LATERAL_CHEFE * lado);
            inimigo.y = Number(estadoInimigo.y || py);
            inimigo.direcao = lado > 0 ? 'e' : 'd';
            sincronizarPosicaoInimigo(inimigo);
            sincronizarVisuaisChefeCutscene(inimigo);

            const alvoX = px + 8;
            const alvoY = py + 8;
            const baseMaoX = Number(inimigo.x || 0);
            const baseMaoY = Number(inimigo.y || 0) + 6;
            // Inicio da captura do BB: transicao do fim da extensao para o inicio do puxao.
            const acabouDeCapturar = !capturaRegistrada
                && ultimoDecorrido < durExtensao
                && decorrido >= durExtensao;

            if (decorrido <= durExtensao) {
                registrarEtapa('extensao');
                const t = decorrido / durExtensao;
                const gx = lerp(baseMaoX, alvoX, t);
                const gy = lerp(baseMaoY, alvoY, t);
                posicionarGarra(garraElemento, gx, gy, inimigo.direcao, spriteGarra);

                bbElemento.style.left = `${px}px`;
                bbElemento.style.bottom = `${py + 10}px`;
            } else if (decorrido <= (durExtensao + durPuxao)) {
                registrarEtapa('puxao');
                if (acabouDeCapturar) {
                    capturaRegistrada = true;
                    console.log('[CutsceneChefe] captura-bb', {
                        bossId,
                        decorrido: Math.round(decorrido),
                        durExtensao,
                        etapa: 'puxao'
                    });
                }
                if (inimigo.elemento) {
                    inimigo.elemento.src = config.spriteParadoInimigo || '../../assets/personagem/Personagem_parado.png';
                }
                const t = (decorrido - durExtensao) / durPuxao;
                const gx = lerp(alvoX, baseMaoX, t);
                const gy = lerp(alvoY, baseMaoY, t);
                posicionarGarra(garraElemento, gx, gy, inimigo.direcao, spriteGarra);

                bbElemento.style.left = `${gx}px`;
                bbElemento.style.bottom = `${gy}px`;
            } else if (decorrido <= durTotal) {
                registrarEtapa('segura');
                posicionarGarra(garraElemento, baseMaoX, baseMaoY, inimigo.direcao, spriteGarra);
                bbElemento.style.left = `${baseMaoX}px`;
                bbElemento.style.bottom = `${baseMaoY}px`;
            } else {
                registrarEtapa('finalizada');
                bbElemento.remove();
                inimigo.cutsceneDerrotaChefeAtiva = false;

                executarFadePretoEAvancarFase()
                    .finally(() => {
                        estadoVisibilidadeEquipamentos.forEach(({ el, displayAnterior }) => {
                            if (!el) return;
                            el.style.display = displayAnterior || '';
                        });

                        player.stunned = estadoPlayer.stunned;
                        player.stunTimer = estadoPlayer.stunTimer;
                        player.velocidadeHorizontalAtual = estadoPlayer.velocidadeHorizontalAtual;
                        player.velocidadeY = estadoPlayer.velocidadeY;
                        player.movendoHorizontal = estadoPlayer.movendoHorizontal;
                        player.estaoAberto = estadoPlayer.estaoAberto;

                        inimigo.x = estadoInimigo.x;
                        inimigo.y = estadoInimigo.y;
                        inimigo.direcao = estadoInimigo.direcao;
                        inimigo.temGarra = estadoInimigo.temGarra;
                        inimigo.garraAnimEstado = estadoInimigo.garraAnimEstado || 'idle';
                        inimigo.garraDist = estadoInimigo.garraDist;
                        inimigo.garraTimer = estadoInimigo.garraTimer;
                        inimigo.garraItemCarregado = estadoInimigo.garraItemCarregado;

                        if (garraElemento && !inimigo.temGarra) {
                            garraElemento.style.display = 'none';
                        }

                        if (typeof window.atualizarVisualGarra === 'function') {
                            window.atualizarVisualGarra();
                        }

                        animacaoAtiva = false;
                    });
                return;
            }

            ultimoDecorrido = decorrido;
            requestAnimationFrame(() => tick(inicio));
        };

        const iniciarGarraComAtraso = () => {
            registrarEtapa('espera');
            requestAnimationFrame((inicioEspera) => {
                const esperarInicio = (agora) => {
                    const decorridoEspera = agora - inicioEspera;
                    if (decorridoEspera < ATRASO_INICIO_MS) {
                        requestAnimationFrame(esperarInicio);
                        return;
                    }

                    console.log('[CutsceneChefe] atraso-espera', {
                        esperadoMs: ATRASO_INICIO_MS,
                        realMs: Math.round(decorridoEspera)
                    });

                    registrarEtapa('inicio');
                    requestAnimationFrame(() => tick(agora));
                };

                requestAnimationFrame(esperarInicio);
            });
        };

        const aproximarChefe = () => {
            const px = Number(player.x || 0);
            const py = Number(player.y || 0);
            const alvoX = px + (DISTANCIA_LATERAL_CHEFE * lado);
            const deltaX = alvoX - Number(inimigo.x || 0);

            if (Math.abs(deltaX) <= TOLERANCIA_APROXIMACAO_PX) {
                forcarVisualParadoChefe(inimigo, spriteParadoChefe, spriteBotaParadaChefe);
                inimigo.x = alvoX;
                inimigo.y = Number(estadoInimigo.y || py);
                inimigo.direcao = lado > 0 ? 'e' : 'd';
                sincronizarPosicaoInimigo(inimigo);
                sincronizarVisuaisChefeCutscene(inimigo);
                iniciarGarraComAtraso();
                return;
            }

            const passo = Math.sign(deltaX) * Math.min(Math.abs(deltaX), VELOCIDADE_APROXIMACAO_PX_FRAME);
            forcarVisualParadoChefe(inimigo, spriteParadoChefe, spriteBotaParadaChefe);
            inimigo.x = Number(inimigo.x || 0) + passo;
            inimigo.y = Number(estadoInimigo.y || py);
            inimigo.direcao = passo > 0 ? 'e' : 'd';
            sincronizarPosicaoInimigo(inimigo);
            sincronizarVisuaisChefeCutscene(inimigo);

            requestAnimationFrame(aproximarChefe);
        };

        registrarEtapa('aproximacao');
        requestAnimationFrame(aproximarChefe);
        return true;
    }

    window.iniciarAnimacaoDerrotaChefeEvento = iniciarAnimacaoDerrotaChefeEvento;
})();
