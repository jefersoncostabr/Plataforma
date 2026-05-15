/**
 * Gerencia a inteligência artificial de perseguição dos inimigos.
 * Faz com que todos os inimigos na lista global window.inimigos sigam o jogador no eixo X.
 * 
 * @param {number} velocidade - Velocidade de perseguição (pixels por quadro).
 * @param {string} spriteParado - Caminho da imagem parado.
 * @param {string} spriteAndando - Caminho da imagem andando.
 * @param {string} spriteChute - Caminho da imagem chutando.
 * @param {string} spriteNoAr - Caminho da imagem no ar (usado para morte).
 */
function iniciarIAInimigos(velocidade = 1, spriteParado, spriteAndando, spriteChute, spriteNoAr) {
    const config = window.config || {}; // Usa as configurações globais

    if (typeof window.sincronizarAcessoriosEntidade !== 'function') {
        console.error('IA: Erro ao carregar sincronizacao-visual.js. A IA visual pode falhar.');
    }

    if (typeof window.obterForcaKnockback !== 'function' || typeof window.aplicarKnockback !== 'function') {
        console.error('IA: Erro crítico! Funções de knockback não encontradas em inicial.js.');
    }

    /**
     * Inicia a sequência de lançamento (morte cartoon).
     */
    window.prepararMorteInimigo = (inimigo, direcaoX) => {
        if (inimigo.estaMorrendo || inimigo.estaMorto) return;

        // Dropa os itens que o inimigo possui no chão antes de iniciar a animação de voo
        if (typeof window.droparItensInimigo === 'function') {
            window.droparItensInimigo(inimigo);
        }

        // Remove os acessórios visuais do inimigo imediatamente para que o corpo voe "limpo"
        limparVisuaisInimigo(inimigo);

        // Limpa o inventário lógico para garantir que não haverá processamento residual ou drop duplicado
        if (Array.isArray(inimigo.inventario)) inimigo.inventario = [];
        if (Array.isArray(inimigo.coleteSlots)) inimigo.coleteSlots = [];
        inimigo.cintoSlot = null;
        inimigo.estaColetando = false;

        inimigo.estaMorrendo = true;
        inimigo.framesMorrendo = config.inimigoMorteDuracaoVoo ?? 35; // Duração do voo
        inimigo.velocidadeY = config.inimigoMorteImpulsoY ?? 9;    // Impulso para cima
        
        // Direção: usa a informada ou a oposta da face do inimigo
        const dir = direcaoX !== undefined ? Math.sign(direcaoX) : (inimigo.direcao === 'd' ? -1 : 1);
        inimigo.velocidadeKnockback = dir * 4;

        if (inimigo.elemento) {
            inimigo.elemento.style.filter = 'brightness(2) grayscale(0.5)';
            inimigo.elemento.style.pointerEvents = 'none';
        }

        // Desativa comportamentos de IA
        inimigo.perseguindo = false;
        inimigo.estaColetando = false;
        if (inimigo.garraAnimEstado !== 'idle') {
            inimigo.garraAnimEstado = 'idle';
            if (inimigo.garraBracos) inimigo.garraBracos.forEach(b => b.remove());
            inimigo.garraBracos = [];
        }
    };

    // Default values for jump delay
    config.inimigoPuloDelayMin = config.inimigoPuloDelayMin ?? 5; // Default 5 frames
    config.inimigoPuloDelayMax = config.inimigoPuloDelayMax ?? 20; // Default 20 frames

    function animarDanoAlvo(inimigo) {
        if (!inimigo || !inimigo.elemento) return;
        if (typeof piscaLeve === 'function') {
            piscaLeve(inimigo.elemento);
        } else if (typeof flashElement === 'function') {
            flashElement(inimigo.elemento, 120, 8);
        }
    }

    function detectarEstacaEmPonto(x, y) {
        if (typeof verificarColisaoComTiles !== 'function') return null;
        const hit = verificarColisaoComTiles(x, y, 1, 1, window.plataformas);
        return (hit && hit.tipo === 'estaca') ? hit : null;
    }

    function analisarPerigoEstacaFrente(inimigo, direcao, distanciaFrente = 12) {
        const baseX = inimigo.x + (inimigo.offsetX || 0);
        const probeX = direcao > 0
            ? baseX + inimigo.largura + distanciaFrente
            : baseX - distanciaFrente;

        const yPe = inimigo.y + 2;
        const yMeio = inimigo.y + Math.floor((inimigo.altura || 30) * 0.5);
        const yCabeca = inimigo.y + Math.max(2, (inimigo.altura || 30) - 2);

        const hits = [
            detectarEstacaEmPonto(probeX, yPe),
            detectarEstacaEmPonto(probeX, yMeio),
            detectarEstacaEmPonto(probeX, yCabeca)
        ].filter(Boolean);

        const temUp = hits.some(h => h.direcao === 'cima');
        const temLateral = direcao > 0
            ? hits.some(h => h.direcao === 'esquerda')
            : hits.some(h => h.direcao === 'direita');

        return { up: temUp, lateral: temLateral };
    }

    function temEstacaBaixoNoArcoDoPulo(inimigo, direcao) {
        const baseX = inimigo.x + (inimigo.offsetX || 0);
        const centroX = baseX + (inimigo.largura / 2);
        const deslocFrente = Number(config.inimigoEstacaDownProbeFrenteX ?? 8);
        const frenteX = direcao > 0
            ? baseX + inimigo.largura + deslocFrente
            : baseX - deslocFrente;

        const yInicial = Number(config.inimigoEstacaDownProbeYInicial ?? 8);
        const yPasso = Number(config.inimigoEstacaDownProbeYPasso ?? 8);
        const yNiveis = Math.max(1, Number(config.inimigoEstacaDownProbeNiveis ?? 3));

        const pontosX = [centroX, frenteX];
        const pontosY = [];
        for (let nivel = 0; nivel < yNiveis; nivel++) {
            pontosY.push(inimigo.y + (inimigo.altura || 30) + yInicial + (nivel * yPasso));
        }

        for (const px of pontosX) {
            for (const py of pontosY) {
                const hit = detectarEstacaEmPonto(px, py);
                if (hit && hit.direcao === 'baixo') return true;
            }
        }

        return false;
    }

    function aplicarDeslocamentoHorizontalComColisao(ent, deslocX) {
        if (typeof window.aplicarDeslocamentoHorizontalComColisaoPadrao === 'function') {
            return window.aplicarDeslocamentoHorizontalComColisaoPadrao(ent, deslocX, window.plataformas, {
                config,
                maxPasso: config.inimigoKnockbackPassoMax ?? 1,
                cancelarKnockbackAoColidir: true
            });
        }

        if (!ent || !deslocX) return;

        const maxPasso = Math.max(0.25, Number(config.inimigoKnockbackPassoMax ?? 1));
        const passos = Math.max(1, Math.ceil(Math.abs(deslocX) / maxPasso));
        const passoX = deslocX / passos;

        for (let p = 0; p < passos; p++) {
            const xAnteriorPasso = ent.x;
            ent.x += passoX;

            if (typeof verificarColisaoComTiles === 'function' &&
                verificarColisaoComTiles(ent.x + (ent.offsetX || 0), ent.y, ent.largura, ent.altura, window.plataformas)) {
                ent.x = xAnteriorPasso;
                ent.framesKnockbackRestante = 0;
                ent.velocidadeKnockback = 0;
                break;
            }

            if (typeof limitarPosicaoAoPalco === 'function') {
                const posAjustada = limitarPosicaoAoPalco(
                    ent.x + (ent.offsetX || 0),
                    ent.y,
                    ent.largura,
                    ent.altura
                );
                ent.x = posAjustada.x - (ent.offsetX || 0);
            }
        }
    }

    function obterRoboAbertoMaisProximo(inimigo) {
        if (!inimigo || !Array.isArray(window.robosAbertosData)) return null;

        let melhor = null;
        let melhorDist = Number.POSITIVE_INFINITY;
        for (const robo of window.robosAbertosData) {
            if (!robo || !robo.ativo) continue;
            const alvoX = Number(robo.spawnX ?? robo.x ?? 0);
            const alvoY = Number(robo.spawnY ?? robo.y ?? 0);
            const dx = alvoX - Number(inimigo.x || 0);
            const dy = alvoY - Number(inimigo.y || 0);
            const dist = (dx * dx) + (dy * dy);
            if (dist < melhorDist) {
                melhorDist = dist;
                melhor = robo;
            }
        }

        return melhor;
    }

    function iniciarFechamentoBBInimigo(inimigo, roboAlvo) {
        if (!inimigo || !roboAlvo || !roboAlvo.ativo || inimigo.emFechamentoPorBB) return false;

        inimigo.emFechamentoPorBB = true;
        inimigo.faseFechamentoBB = 'interacao';
        inimigo.timerFechamentoBB = Math.max(6, Math.floor((Number(config.tempoAberturaFrame ?? 20) * 0.5)));
        inimigo.roboFechamentoBB = roboAlvo;
        inimigo.stunned = true;
        inimigo.stunTimer = 9999;
        inimigo.perseguindo = false;
        inimigo.afastando = false;
        inimigo.tempoAfastamento = 0;
        inimigo.tempoChute = 0;
        inimigo.cooldownChute = 0;
        inimigo.framesImpulsoRestante = 0;
        inimigo.velocidadeDash = 0;

        inimigo.x = Number(roboAlvo.spawnX ?? roboAlvo.x ?? inimigo.x);
        inimigo.y = Number(roboAlvo.spawnY ?? roboAlvo.y ?? inimigo.y);

        if (inimigo.elemento) {
            inimigo.elemento.style.left = inimigo.x + 'px';
            inimigo.elemento.style.bottom = inimigo.y + 'px';
            inimigo.elemento.style.opacity = '1';
            inimigo.elemento.src = config.spriteBBInteracao || config.spriteBB || '../../assets/personagem/bb/bb-interacao.png';
        }

        window.AudioManager?.playSFX('engrenagem', 0.45);
        return true;
    }

    function atualizarFechamentoBBInimigo(inimigo) {
        if (!inimigo || !inimigo.emFechamentoPorBB) return false;

        if (inimigo.faseFechamentoBB === 'interacao') {
            inimigo.timerFechamentoBB--;
            if (inimigo.elemento) {
                inimigo.elemento.src = config.spriteBBInteracao || config.spriteBB || '../../assets/personagem/bb/bb-interacao.png';
            }
            if (inimigo.timerFechamentoBB <= 0) {
                inimigo.faseFechamentoBB = 'sumir';
                inimigo.timerFechamentoBB = Math.max(3, Math.floor((Number(config.tempoAberturaFrame ?? 20) * 0.25)));
                if (inimigo.elemento) inimigo.elemento.style.opacity = '0';
            }
            return true;
        }

        if (inimigo.faseFechamentoBB === 'sumir') {
            inimigo.timerFechamentoBB--;
            if (inimigo.timerFechamentoBB <= 0) {
                inimigo.faseFechamentoBB = 'fechando';
                inimigo.indiceFechamentoBB = 0;
                inimigo.timerFechamentoBB = Math.max(4, Number(config.tempoAberturaFrame ?? 20));
                inimigo.spritesFechamentoBB = [
                    config.spriteAberturaPlayer3,
                    config.spriteAberturaPlayer2,
                    config.spriteAberturaPlayer1,
                    config.spriteParadoInimigo
                ].filter((s) => typeof s === 'string' && s.trim() !== '');
                if (inimigo.elemento) inimigo.elemento.style.opacity = '1';
            }
            return true;
        }

        if (inimigo.faseFechamentoBB === 'fechando') {
            const lista = Array.isArray(inimigo.spritesFechamentoBB) && inimigo.spritesFechamentoBB.length > 0
                ? inimigo.spritesFechamentoBB
                : [config.spriteParadoInimigo || '../../assets/personagem/Personagem_parado.png'];

            const idx = Math.min(inimigo.indiceFechamentoBB || 0, lista.length - 1);
            if (inimigo.elemento) {
                inimigo.elemento.src = lista[idx];
                inimigo.elemento.style.left = inimigo.x + 'px';
                inimigo.elemento.style.bottom = inimigo.y + 'px';
            }

            inimigo.timerFechamentoBB--;
            if (inimigo.timerFechamentoBB <= 0) {
                inimigo.indiceFechamentoBB = (inimigo.indiceFechamentoBB || 0) + 1;
                if (inimigo.indiceFechamentoBB >= lista.length) {
                    if (typeof window.consumirRoboAbertoFase === 'function' && inimigo.roboFechamentoBB) {
                        window.consumirRoboAbertoFase(inimigo.roboFechamentoBB);
                    }

                    inimigo.emFechamentoPorBB = false;
                    inimigo.faseFechamentoBB = null;
                    inimigo.roboFechamentoBB = null;
                    inimigo.spritesFechamentoBB = null;
                    inimigo.stunned = false;
                    inimigo.stunTimer = 0;
                    inimigo.ehBBInimigo = false;
                    inimigo.perseguindo = true;
                    inimigo.contadorAnimacao = 0;
                    inimigo.frameAtual = 0;
                    inimigo.tempoChute = 0;
                    inimigo.cooldownChute = 0;
                    if (inimigo.elemento) {
                        inimigo.elemento.style.opacity = '1';
                        inimigo.elemento.src = config.spriteParadoInimigo || '../../assets/personagem/Personagem_parado.png';
                    }
                    window.AudioManager?.playSFX('engrenagem', 0.5);
                } else {
                    inimigo.timerFechamentoBB = Math.max(4, Number(config.tempoAberturaFrame ?? 20));
                }
            }
            return true;
        }

        return true;
    }

    function inimigoColetarItemGarra(inimigo, item) {
        if (!item || !item.tipo) return;
        if (item.coletavel === false || window.itemDefinitions?.[item.tipo]?.coletavel === false) return;

        const tipo = item.tipo;

        // 1. Atualiza estado lógico (Flags fundamentais para comportamento e visual)
        if (tipo === 'revolver') {
            inimigo.temArma = true;
            inimigo.municao = config.maxMunicao || 5;
        } else if (tipo === 'escudo') {
            inimigo.temEscudo = true;
            inimigo.escudoVermelho = false;
            inimigo.escudoProtegido = 0;
        } else if (tipo === 'bota') {
            inimigo.temBota = true;
            inimigo.botaVermelha = false;
        } else if (tipo === 'jetpack') inimigo.temJetpack = true;
        else if (tipo === 'garra') inimigo.temGarra = true;
        else if (tipo === 'cinto') inimigo.temCinto = true;
        else if (tipo === 'colete') inimigo.temColete = true;

        // 2. Aplica efeitos do itemDefinitions se disponível
        if (window.itemDefinitions && window.itemDefinitions[item.tipo]) {
            const itemData = window.itemDefinitions[item.tipo];
            if (window.aplicarEfeitoColeta && typeof window.aplicarEfeitoColeta === 'function') {
                window.aplicarEfeitoColeta(inimigo, itemData);
            } else if (itemData.efeitos && itemData.efeitos.inimigo) {
                for (const [chave, valor] of Object.entries(itemData.efeitos.inimigo)) {
                    inimigo[chave] = valor;
                }
            }

            if (tipo === 'restauracao') {
                window.aplicarRestauracaoPadrao?.(inimigo, config, {
                    atualizarVisualEscudo: () => {
                        if (inimigo.escudoElemento) {
                            inimigo.escudoElemento.style.filter = inimigo.escudoVermelho ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
                        }
                    }
                });
            }
        }

        // 3. Atualiza o visual via helper centralizado (Sincroniza flags com o DOM)
        if (typeof window.inicializarVisualEquipamentoEntidade === 'function') {
            window.inicializarVisualEquipamentoEntidade(inimigo, inimigo.elemento.parentElement, config);
        }

        // 4. Registra no inventário e limpa o item físico
        if (tipo !== 'airdrop' && tipo !== 'restauracao' && !inimigo.inventario.includes(tipo)) {
            inimigo.inventario.push(tipo);
        }
        if (typeof window.removerVisualItemColetavel === 'function') {
            window.removerVisualItemColetavel(item);
        } else if (item.elemento && typeof item.elemento.remove === 'function') {
            item.elemento.remove();
        }
    }

    function limparVisuaisInimigo(inimigo) {
        if (!inimigo) return;

        const elementos = [
            'armaElemento',
            'botaElemento',
            'escudoElemento',
            'jetpackElemento',
            'jetFogoElemento',
            'garraElemento',
            'cintoElemento',
            'coleteElemento'
        ];

        elementos.forEach((chave) => {
            const el = inimigo[chave];
            if (el && typeof el.remove === 'function') el.remove();
            inimigo[chave] = null;
        });

        if (Array.isArray(inimigo.garraBracos)) {
            inimigo.garraBracos.forEach((braco) => {
                if (braco && typeof braco.remove === 'function') braco.remove();
            });
        }
        inimigo.garraBracos = [];

        if (inimigo._jetpackLoop) {
            inimigo._jetpackLoop.pause();
            inimigo._jetpackLoop = null;
        }

        inimigo.temArma = false;
        inimigo.temBota = false;
        inimigo.temEscudo = false;
        inimigo.temJetpack = false;
        inimigo.temGarra = false;
        inimigo.temCinto = false;
        inimigo.temColete = false;
        inimigo.jetpackAtivo = false;
    }

    window.limparVisuaisInimigo = limparVisuaisInimigo;

    function aplicarDanoEspinhoInimigo(inimigo, hitEstaca) {
        if (!inimigo || !hitEstaca || hitEstaca.tipo !== 'estaca') return false;
        if ((inimigo.cooldownDanoEspinho || 0) > 0) return false;

        inimigo.cooldownDanoEspinho = Number(config.cooldownDanoEspinhoInimigo ?? config.cooldownDanoEspinho ?? 24);

        // Knockback sempre acontece ao tocar estaca.
        if (hitEstaca.direcao === 'cima') {
            const impulsoVertical = Number(config.knockbackEspinhoInimigoUpY ?? config.knockbackEspinhoUpY ?? 6);
            inimigo.velocidadeY = Math.max(inimigo.velocidadeY || 0, impulsoVertical);
        }

        if (hitEstaca.direcao !== 'cima' && hitEstaca.esquerdaReal !== undefined && hitEstaca.direitaReal !== undefined) {
            const centroEstaca = (hitEstaca.esquerdaReal + hitEstaca.direitaReal) / 2;
            const centroInimigo = inimigo.x + (inimigo.offsetX || 0) + ((inimigo.largura || 0) / 2);
            const direcaoKnock = centroInimigo < centroEstaca ? -1 : 1;
            
            window.aplicarKnockback(inimigo, window.obterForcaKnockback(config, 'espinho'), direcaoKnock, 10);
        } else if (hitEstaca.direcao === 'cima') {
            inimigo.framesKnockbackRestante = 0;
            inimigo.velocidadeKnockback = 0;
        }

        const escudoBloqueouEspinho = typeof window.aplicarImpactoEscudoPadrao === 'function'
            ? !!window.aplicarImpactoEscudoPadrao(inimigo, config, {
                alvoVisual: inimigo.escudoElemento,
                flashElement: typeof flashElement === 'function' ? flashElement : null,
                duracaoFlash: 120,
                intensidadeFlash: 6
            })?.bloqueou
            : window.temEscudoAtivoPadrao(inimigo);

        if (escudoBloqueouEspinho) {
            return false;
        }

        const dano = Number(config.danoEspinhoInimigo ?? config.danoEspinho ?? 1);
        inimigo.vida = (inimigo.vida || 0) + dano;

        if (typeof piscaLeve === 'function' && inimigo.elemento) {
            piscaLeve(inimigo.elemento);
        }

        const limiteVida = Number(config.inimigoVidaMax ?? 3);
        return inimigo.vida >= limiteVida;
    }

    window.resetarInimigos = (dadosInimigos) => {
        // Limpa referências antigas e remove armas
        if (window.inimigos) {
            window.inimigos.forEach(inim => {
                limparVisuaisInimigo(inim);
                if (inim.elemento) inim.elemento.remove();
            });
        }
        window.inimigos = [];
        
        const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
        if (!palco) return;
        dadosInimigos.forEach(dado => {
            const posStr = typeof dado === 'object' ? (dado.pos.coord || dado.pos) : dado;
            const direcao = (typeof dado === 'object' && dado.pos.direcao) ? dado.pos.direcao : 'e';
            // Obtém as coordenadas X e Y usando a função global gridParaPixels
            const pos = typeof window.gridParaPixels === 'function' ? window.gridParaPixels(posStr) : {x: 0, y: 0};
            
            const inimigoImg = document.createElement('img'); // Variável correta para o elemento imagem do inimigo
            const tipo = dado.tipo !== undefined ? dado.tipo : 1;
            if (tipo === window.GAME_CONSTANTS.INIMIGO_FENO_ID) {
                // Tenta pegar da config local, depois da global, e por fim o caminho fixo
                inimigoImg.src = window.obterSpriteItem('feno', config, 'equipado');
            } else {
                inimigoImg.src = spriteParado;
            }
            inimigoImg.style.position = 'absolute';
            inimigoImg.style.width = '32px';
            inimigoImg.style.height = '32px';
            inimigoImg.style.left = pos.x + 'px';
            inimigoImg.style.bottom = pos.y + 'px';
            inimigoImg.style.zIndex = '4';
            inimigoImg.style.imageRendering = 'pixelated';
            inimigoImg.style.transform = direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
            if (typeof adicionarAoLayer === 'function' && window.LAYERS?.INIMIGOS) {
                adicionarAoLayer(inimigoImg, window.LAYERS.INIMIGOS);
            } else {
                palco.appendChild(inimigoImg);
            }

            window.inimigos.push({
                x: pos.x,
                y: pos.y,
                startX: pos.x,
                startY: pos.y,
                spriteBase: inimigoImg.src,
                largura: config.HITBOX_LARGURA,
                altura: config.HITBOX_ALTURA,
                alturaEmPe: config.HITBOX_ALTURA,
                offsetX: config.HITBOX_OFFSET_X,
                elemento: inimigoImg,
                perseguindo: false,
                tipo: tipo,
                ...window.GAME_CONSTANTS.TIPOS_INIMIGO[tipo],
                framesKnockbackRestante: 0,
                velocidadeKnockback: 0,
                puloTimer: 0,
                jumpQueued: false,
                noChao: false,
                velocidadeY: 0,
                isEnemy: true,
                garraAnimEstado: 'idle',
                garraTimer: 0,
                garraDist: 0,
                garraBracos: [],
                garraItemCarregado: null,
                cooldownGarra: 60,
                cooldownDanoEspinho: 0,
                estaAgachado: false,
                spriteParadoAgachado: window.obterSpriteItem('agachado', config, 'equipado'),
                spriteAndandoAgachado: window.obterSpriteItem('agachado2', config, 'equipado')
            });

            const inimigoObj = window.inimigos[window.inimigos.length - 1];
            inimigoObj.inventario = [];
            if (inimigoObj.temArma) inimigoObj.inventario.push('revolver');
            if (inimigoObj.temEscudo) inimigoObj.inventario.push('escudo');
            if (inimigoObj.temBota) inimigoObj.inventario.push('bota');
            if (inimigoObj.temJetpack) inimigoObj.inventario.push('jetpack');
            if (inimigoObj.temGarra) inimigoObj.inventario.push('garra');
            if (inimigoObj.temCinto) inimigoObj.inventario.push('cinto');
            if (inimigoObj.temColete) inimigoObj.inventario.push('colete');

            // Inicialização visual centralizada
            window.inicializarVisualEquipamentoEntidade(inimigoObj, inimigoImg.parentElement, config);
            if (inimigoObj.temArma) inimigoObj.municao = config.maxMunicao || 5;

            // Sincroniza posições iniciais
            [inimigoObj.armaElemento, inimigoObj.escudoElemento, inimigoObj.botaElemento, inimigoObj.jetpackElemento, inimigoObj.garraElemento, inimigoObj.cintoElemento, inimigoObj.coleteElemento].forEach(el => {
                if (el) {
                    el.style.left = pos.x + 'px';
                    el.style.bottom = pos.y + 'px';
                    el.style.transform = inimigoImg.style.transform;
                }
            });
        });
    };

    function atualizarIA() {
        // Atualiza a referência das configurações no topo para evitar erro de inicialização
        const config = window.config || {};

        if (window.isPaused) {
            requestAnimationFrame(atualizarIA);
            return;
        }

        // Se a configuração de debug estiver ativa, pula a lógica de movimento
        if (config.debugInimigosParados) {
            requestAnimationFrame(atualizarIA);
            return;
        }

        const player = document.getElementById('player');
        
        // Só executa se houver um jogador e inimigos no mapa
        if (player && window.inimigos && window.inimigos.length > 0) {
            const playerX = parseInt(player.style.left) || 0;
            const playerY = parseInt(player.style.bottom) || 0;
            const playerControle = window.playerControle;
            const armaduraSemPiloto = !!(playerControle?.estaoAberto || playerControle?.fechando);
            const alvoPerseguicao = armaduraSemPiloto ? null : playerControle;
            const alvoPerseguicaoX = Number(alvoPerseguicao?.x ?? playerX);
            const alvoPerseguicaoY = Number(alvoPerseguicao?.y ?? playerY);
            const alcanceTiro = Number(config.distanciaTiroInimigo ?? 300);
            const distanciaAtivacao = config.inimigoDistanciaAtivacao || 300; // Distância para o inimigo começar a perseguir o jogador

            const velAtivaBase = Number(config.velocidadeInimigoBase ?? velocidade);
            const gravidadeInimigoAtual = config.gravidadeUniversal ? (config.forcaGravidade?.gravidade ?? 0.5) : (config.inimigoGravidade ?? 0.5);
            const forcaPuloInimigoBase = config.gravidadeUniversal ? (config.forcaGravidade?.forcaPulo ?? 10) : (config.inimigoForcaPulo ?? 10);

            // Usamos um loop for reverso para permitir a remoção segura de inimigos que caem no buraco
            for (let i = window.inimigos.length - 1; i >= 0; i--) {
                const inimigo = window.inimigos[i];
                if (!inimigo) continue;

                if (inimigo && inimigo.estaMorrendo) {
                    // Usa a gravidade universal ou a gravidade específica do inimigo
                    inimigo.velocidadeY -= gravidadeInimigoAtual;
                    inimigo.y += inimigo.velocidadeY;
                    inimigo.x += inimigo.velocidadeKnockback;

                    inimigo.elemento.style.left = inimigo.x + 'px';
                    inimigo.elemento.style.bottom = inimigo.y + 'px';
                    
                    // Rotação cartoon: 12 graus por frame baseado na direção
                    const rot = (35 - inimigo.framesMorrendo) * 12 * (inimigo.velocidadeKnockback > 0 ? 1 : -1);
                    const flip = inimigo.velocidadeKnockback > 0 ? 1 : -1;
                    inimigo.elemento.style.transform = `scaleX(${flip}) rotate(${rot}deg)`;

                    // Sincroniza acessórios no voo da morte via helper global
                    window.sincronizarAcessoriosEntidade(inimigo, {
                        armaElemento: inimigo.armaElemento,
                        escudoElemento: inimigo.escudoElemento,
                        botaElemento: inimigo.botaElemento,
                        jetpackElemento: inimigo.jetpackElemento,
                        garraElemento: inimigo.garraElemento,
                        cintoElemento: inimigo.cintoElemento,
                        coleteElemento: inimigo.coleteElemento
                    }, { forçarSincroniaGarra: true });

                    inimigo.framesMorrendo--;
                    // Morte definitiva quando o timer acaba ou sai da tela
                    if (inimigo.framesMorrendo <= 0 || inimigo.y < -64) {
                        if (inimigo.tipo === window.GAME_CONSTANTS.INIMIGO_FENO_ID) {
                            window.processarMorteFeno?.(inimigo);
                        } else {
                            window.removerInimigoDerrotado?.(inimigo, { droparItens: false });
                        }
                    }
                    continue; // Pula o processamento da IA normal
                }

                if (inimigo.emFechamentoPorBB) {
                    atualizarFechamentoBBInimigo(inimigo);
                    continue;
                }

                // Lógica especial para o Alvo de Feno (Tipo 5)
                if (inimigo.tipo === window.GAME_CONSTANTS.INIMIGO_FENO_ID) {
                    // Durante destruição/respawn, o alvo fica fora da física.
                    if (inimigo.estaMorto) {
                        continue;
                    }

                    const xAnteriorFeno = inimigo.x;

                    // Aplica knockback se estiver ativo
                    if (inimigo.framesKnockbackRestante > 0) {
                        window.aplicarDeslocamentoHorizontalComColisaoPadrao(inimigo, inimigo.velocidadeKnockback, window.plataformas, { config, maxPasso: config.inimigoKnockbackPassoMax ?? 1, cancelarKnockbackAoColidir: true });
                        inimigo.framesKnockbackRestante--;
                        inimigo.elemento.style.transform = inimigo.velocidadeKnockback > 0 ? 'scaleX(1)' : 'scaleX(-1)';
                    }

                    // Colisão Horizontal com as laterais das plataformas (Snap) para o feno
                    const hitFenoH = typeof verificarColisaoComTiles === 'function' ? 
                        verificarColisaoComTiles(inimigo.x + (inimigo.offsetX || 0), inimigo.y, inimigo.largura, inimigo.altura, window.plataformas) : null;
                    if (hitFenoH) {
                        if (inimigo.x > xAnteriorFeno) { // Direita
                            inimigo.x = window.aplicarSnapColisaoPadrao(inimigo.x, inimigo.offsetX || 0, inimigo.largura, hitFenoH, 'direita');
                        } else if (inimigo.x < xAnteriorFeno) { // Esquerda
                            inimigo.x = window.aplicarSnapColisaoPadrao(inimigo.x, inimigo.offsetX || 0, inimigo.largura, hitFenoH, 'esquerda');
                        }
                    }

                    // Garante que o alvo de feno não saia das bordas horizontais do palco (Clamping)
                    if (typeof limitarPosicaoAoPalco === 'function') {
                        const posAjustada = limitarPosicaoAoPalco(
                            inimigo.x + (inimigo.offsetX || 0), 
                            inimigo.y, 
                            inimigo.largura, 
                            inimigo.altura
                        );
                        inimigo.x = posAjustada.x - (inimigo.offsetX || 0);
                        // Nota: Não ajustamos o Y aqui para permitir que ele caia em buracos se empurrado
                    }

                    // Aplica gravidade continuamente para o feno não ficar "flutuando"
                    inimigo.noChao = false;
                    if (typeof aplicarFisica === 'function') {
                        aplicarFisica(inimigo, {}, 0, gravidadeInimigoAtual, 0);
                    }
                    // Sincroniza posição visual e pula toda a IA
                    inimigo.elemento.style.left = inimigo.x + 'px';
                    inimigo.elemento.style.bottom = inimigo.y + 'px';
                    
                    // Verifica colisão com solo para o alvo não atravessar o chão no knockback
                    const hitFenoV = typeof verificarColisaoComTiles === 'function' ? 
                        verificarColisaoComTiles(inimigo.x + (inimigo.offsetX || 0), inimigo.y, inimigo.largura, inimigo.altura, window.plataformas) : null;
                    if (hitFenoV) {
                        inimigo.noChao = true;
                        inimigo.velocidadeY = 0;
                        inimigo.y = window.aplicarSnapColisaoPadrao(inimigo.y, 0, inimigo.altura, hitFenoV, 'cima');
                    }
                    continue; 
                }

                let xAnterior = inimigo.x;

                if (inimigo.emAberturaPorBB) {
                    inimigo.perseguindo = false;
                    inimigo.afastando = false;
                    inimigo.tempoAfastamento = 0;
                    if (inimigo.elemento) {
                        inimigo.elemento.style.left = inimigo.x + 'px';
                        inimigo.elemento.style.bottom = inimigo.y + 'px';
                    }
                    continue;
                }

                // Refinamento IA: Detecta itens de interesse (AirDrop ou equipamentos que ainda não possui)
                const bbPodeBuscarRobo = !!(inimigo.ehBBInimigo && !inimigo.stunned && Number(inimigo.stunTimer || 0) <= 0);
                const roboAlvoBB = bbPodeBuscarRobo ? obterRoboAbertoMaisProximo(inimigo) : null;
                const bbTemRoboAlvo = !!(bbPodeBuscarRobo && roboAlvoBB && roboAlvoBB.ativo);

                const itemInteresse = (inimigo.ehBBInimigo ? null : window.itensColetaveis?.find(it => {
                    if (it.coletavel === false || window.itemDefinitions?.[it.tipo]?.coletavel === false) return false;
                    // Se já possui o item e não é consumível, ignora
                    const jaTem = it.tipo !== 'airdrop' && it.tipo !== 'restauracao' && inimigo.inventario.includes(it.tipo);
                    if (jaTem) return false;

                    // Se for restauração, só se interessa se estiver sem munição ou com escudo danificado
                    if (it.tipo === 'restauracao') {
                        const precisaMunicao = inimigo.temArma && (inimigo.municao || 0) < (config.maxMunicao || 5);
                        const precisaEscudo = inimigo.temEscudo && (inimigo.escudoVermelho || (inimigo.escudoProtegido || 0) > 0);
                        if (!precisaMunicao && !precisaEscudo) return false;
                    }

                    return Math.abs(it.x - inimigo.x) <= 220 && Math.abs(it.y - inimigo.y) <= 160;
                }));
                
                // Se houver um item de interesse por perto, ele vira o alvo prioritário da IA
                const xAlvo = bbTemRoboAlvo
                    ? Number(roboAlvoBB.spawnX ?? roboAlvoBB.x ?? alvoPerseguicaoX)
                    : (itemInteresse ? itemInteresse.x : alvoPerseguicaoX);
                const yAlvo = bbTemRoboAlvo
                    ? Number(roboAlvoBB.spawnY ?? roboAlvoBB.y ?? alvoPerseguicaoY)
                    : (itemInteresse ? itemInteresse.y : alvoPerseguicaoY);
                
                // Navegação Inteligente: Desvio de teto (Reactive Pathfinding)
                let xAlvoNavegacao = xAlvo;
                const alvoAcimaIA = yAlvo > inimigo.y + 40;
                if (alvoAcimaIA && inimigo.noChao && typeof window.IAUtils !== 'undefined') {
                    if (window.IAUtils.estaSobTeto(inimigo)) {
                        const saidaX = window.IAUtils.encontrarSaidaTeto(inimigo, xAlvo > inimigo.x ? 1 : -1);
                        if (saidaX !== null) {
                            xAlvoNavegacao = saidaX;
                        }
                    }
                }

                if (typeof window.inicializarEstadoCinto === 'function') {
                    window.inicializarEstadoCinto(inimigo);
                }

                const elementosEquipamentoInimigo = {
                    armaElemento: inimigo.armaElemento,
                    escudoElemento: inimigo.escudoElemento,
                    botaElemento: inimigo.botaElemento,
                    jetpackElemento: inimigo.jetpackElemento,
                    jetFogoElemento: inimigo.jetFogoElemento,
                    garraElemento: inimigo.garraElemento,
                    coleteElemento: inimigo.coleteElemento
                };

                // Lógica de IA: agacha quando já está sob teto baixo OU quando detecta passagem baixa à frente.
                const alturaAgachado = Number(config.agachadoHitboxAltura ?? 16);
                const alturaEmPe = Number(inimigo.alturaEmPe || config.HITBOX_ALTURA || 30);
                const dirAlvo = xAlvo >= inimigo.x ? 1 : -1;
                const lookAhead = Math.max(8, Math.ceil(velAtivaBase * 3));
                const frenteX = dirAlvo > 0
                    ? inimigo.x + (inimigo.offsetX || 0) + inimigo.largura + lookAhead
                    : inimigo.x + (inimigo.offsetX || 0) - lookAhead;

                let precisaAgacharAgora = false;
                let precisaAgacharAFrente = false;
                if (typeof verificarColisaoComTiles === 'function') {
                    const faixaTopoEmPe = Math.max(1, alturaEmPe - alturaAgachado);

                    // Já está em um ponto onde em pé colidiria no topo.
                    const bloqueioEmPeAtual = verificarColisaoComTiles(
                        inimigo.x + (inimigo.offsetX || 0),
                        inimigo.y + alturaAgachado,
                        inimigo.largura,
                        faixaTopoEmPe,
                        window.plataformas
                    );
                    precisaAgacharAgora = !!bloqueioEmPeAtual;

                    // Detecta passagem baixa logo à frente: em pé bloqueia, agachado passa.
                    const bloqueioEmPeFrente = verificarColisaoComTiles(
                        frenteX,
                        inimigo.y + alturaAgachado,
                        2,
                        faixaTopoEmPe,
                        window.plataformas
                    );
                    const bloqueioAgachadoFrente = verificarColisaoComTiles(
                        frenteX,
                        inimigo.y + 2,
                        2,
                        Math.max(1, alturaAgachado - 3),
                        window.plataformas
                    );
                    precisaAgacharAFrente = !!bloqueioEmPeFrente && !bloqueioAgachadoFrente;
                }

                const contarEquipamentosVisiveis = () => {
                    let total = 0;
                    const coleteBloqueiaAgachamento = !!config.coleteRecolhivelNoCinto;
                    if (inimigo.temArma) total++;
                    if (inimigo.temEscudo || inimigo.escudoVermelho) total++;
                    if (inimigo.temBota) total++;
                    if (inimigo.temJetpack) total++;
                    if (inimigo.temGarra) total++;
                    if (inimigo.temColete && coleteBloqueiaAgachamento) total++;
                    return total;
                };

                const precisaPassagemBaixa = precisaAgacharAgora || precisaAgacharAFrente;

                if (inimigo.temCinto && typeof window.alternarItensNoCintoPortador === 'function') {
                    if (precisaPassagemBaixa && contarEquipamentosVisiveis() > 0 && !inimigo.itensGuardadosNoCinto && !inimigo.cintoAnimando) {
                        window.alternarItensNoCintoPortador({
                            portador: inimigo,
                            elementoBase: inimigo.elemento,
                            cintoElemento: inimigo.cintoElemento,
                            ...elementosEquipamentoInimigo,
                            flashElement: (typeof flashElement === 'function') ? flashElement : undefined,
                            guardar: true
                        });
                    } else if (!precisaPassagemBaixa && inimigo.itensGuardadosNoCinto && !inimigo.cintoAnimando) {
                        window.alternarItensNoCintoPortador({
                            portador: inimigo,
                            elementoBase: inimigo.elemento,
                            cintoElemento: inimigo.cintoElemento,
                            ...elementosEquipamentoInimigo,
                            flashElement: (typeof flashElement === 'function') ? flashElement : undefined,
                            guardar: false
                        });
                    }
                }

                if (typeof window.atualizarVisibilidadeEquipamentosCintoPortador === 'function') {
                    window.atualizarVisibilidadeEquipamentosCintoPortador(inimigo, elementosEquipamentoInimigo);
                }

                const temEquipamentoVisivelBloqueandoAgachamento = contarEquipamentosVisiveis() > 0 && !inimigo.itensGuardadosNoCinto;
                inimigo.precisaAgacharPassagem = precisaAgacharAFrente;
                inimigo.estaAgachado = precisaPassagemBaixa && !temEquipamentoVisivelBloqueandoAgachamento;

                if (inimigo.estaAgachado && (inimigo.tempoChute || 0) > 0) {
                    inimigo.tempoChute = 0;
                    inimigo.framesImpulsoRestante = 0;
                    inimigo.velocidadeDash = 0;
                    inimigo.jaAtacouNesteChute = true;
                }
                
                // Ajusta a hitbox de acordo com o estado agachado (ANTES das colisões, como o player)
                inimigo.altura = inimigo.estaAgachado
                    ? (config.agachadoHitboxAltura ?? 16)
                    : (inimigo.alturaEmPe || config.HITBOX_ALTURA);

                const estaChutando = !inimigo.ehBBInimigo && inimigo.tempoChute > 0;

                // Unificação da velocidade: tratamos como número e aplicamos bônus se for tipo 3
                let velAtiva = velAtivaBase;
                if (inimigo.tipo === window.GAME_CONSTANTS.TIPOS_INIMIGO[3].id) {
                    velAtiva += Number(config.bonusVelocidadeBota ?? 2);
                }
                
                // Penalidade de velocidade para o escudo ativo (igual ao player)
                if (window.temEscudoAtivoPadrao(inimigo)) {
                    const penalidade = Number(config.escudoVelocidadeReduzida ?? 2);
                    velAtiva = Math.max(0.5, velAtiva - penalidade); // Garante no mínimo 0.5 de velocidade
                }

                const distanciaAtual = Math.abs(xAlvo - inimigo.x);
                
                // Inicializa propriedades de combate se não existirem
                if (inimigo.tempoChute === undefined) { // This block runs only once per enemy creation
                    inimigo.tempoChute = 0;
                    inimigo.cooldownChute = 0;
                    inimigo.cooldownTiro = 0;
                    inimigo.escudoProtegido = 0;
                    inimigo.escudoVermelho = false;
                    inimigo.inventario = [];
                    inimigo.estaColetando = false;
                    inimigo.timerColeta = 0;
                    inimigo.municao = config.maxMunicao || 5;
                    inimigo.direcao = 'e';
                    // Propriedades já foram definidas via spread do TIPOS_INIMIGO no objeto
                    inimigo.jetpackAtivo = false;
                    inimigo.timerVooRestante = 0;
                    inimigo.framesVoando = 0;
                    
                    inimigo.patrulhaTimer = 60; // 1 segundo (60 frames)
                    inimigo.estadoPatrulha = 'parado'; // 'parado' ou 'caminhando'
                    inimigo.direcaoPatrulha = Math.random() < 0.5 ? 'e' : 'd';
                    inimigo.cooldownVooJetpack = 0;
                    inimigo.framesImpulsoRestante = 0;
                    inimigo.velocidadeDash = 0;
                    inimigo.garraDirecaoAnim = 'e'; // Direção inicial da garra

                    inimigo.stunned = false; // Inicializa estado de stun
                    inimigo.stunTimer = 0;  // Inicializa timer de stun
                    
                    // Inicializa sprites de agachado (garante consistência para todos os inimigos)
                    inimigo.spriteParadoAgachado = window.obterSpriteItem('agachado', config, 'equipado');
                    inimigo.spriteAndandoAgachado = window.obterSpriteItem('agachado2', config, 'equipado');
                    
                    // Preenche inventário inicial baseado no tipo
                    if (inimigo.temArma) inimigo.inventario.push('revolver');
                    if (inimigo.temEscudo) inimigo.inventario.push('escudo');
                    if (inimigo.temBota) inimigo.inventario.push('bota');
                    if (inimigo.temJetpack) inimigo.inventario.push('jetpack');
                    if (inimigo.temGarra) inimigo.inventario.push('garra');
                    if (inimigo.temCinto) inimigo.inventario.push('cinto');
                    if (inimigo.temColete) inimigo.inventario.push('colete');
                    inimigo.cooldownPulo = 0;
                    inimigo.velocidadeY = 0;
                    inimigo.cooldownVooJetpack = 0;
                    inimigo.noChao = false;
                    inimigo.framesKnockbackRestante = 0; // Inicializa frames de knockback
                    inimigo.velocidadeKnockback = 0; // Inicializa velocidade de knockback
                    inimigo.jumpQueued = false; // Inicializa a flag de pulo agendado
                    inimigo.puloTimer = 0;
                    inimigo.afastando = false;
                    inimigo.tempoAfastamento = 0;
                    inimigo.cooldownAfastamento = 0;
                }
                // End of one-time initialization block

                // Atualiza timers de chute
                if (!inimigo.ehBBInimigo && inimigo.tempoChute > 0) inimigo.tempoChute--;
                if (!inimigo.ehBBInimigo && inimigo.cooldownChute > 0) inimigo.cooldownChute--;
                if (inimigo.ehBBInimigo) {
                    inimigo.tempoChute = 0;
                    inimigo.cooldownChute = 0;
                    inimigo.framesImpulsoRestante = 0;
                    inimigo.velocidadeDash = 0;
                }
                if (inimigo.cooldownTiro > 0) inimigo.cooldownTiro--;
                if (inimigo.puloTimer > 0) inimigo.puloTimer--; // Decrementa o timer de pulo
                if (inimigo.tempoAfastamento > 0) inimigo.tempoAfastamento--;
                if (inimigo.cooldownAfastamento > 0) inimigo.cooldownAfastamento--;
                if (inimigo.cooldownPulo > 0) inimigo.cooldownPulo--;
                if (inimigo.cooldownVooJetpack > 0) inimigo.cooldownVooJetpack--;
                if (inimigo.cooldownGarra > 0) inimigo.cooldownGarra--; // Decrementa o cooldown da garra

                // Lógica da Animação da Garra (Estilo Cartoon) para o inimigo
                if (inimigo.temGarra && inimigo.garraAnimEstado !== 'idle' && !inimigo.stunned) {
            const velGarra = config.velocidadeGarra || 8;
            const distMax = config.garraAlcanceInimigo || 160;
                    const dirX = inimigo.garraDirecaoAnim === 'd' ? 1 : -1;

                    // Sincroniza todos os segmentos do braço com a posição atual do inimigo
                    inimigo.garraBracos.forEach((braco, index) => {
                        const offset = index * 32;
                        braco.style.left = (inimigo.x + (offset * dirX)) + 'px';
                        braco.style.bottom = inimigo.y + 'px';
                    });

                    // Sincroniza a posição da "mão" (a garra na ponta) com o inimigo e a distância atual
                    inimigo.garraElemento.style.left = (inimigo.x + (inimigo.garraDist * dirX)) + 'px';
                    inimigo.garraElemento.style.bottom = inimigo.y + 'px';
                    inimigo.garraElemento.style.transform = (inimigo.garraDirecaoAnim === 'e' ? 'scaleX(-1)' : 'scaleX(1)');

                    if (inimigo.garraAnimEstado === 'prep') {
                        inimigo.garraElemento.src = window.obterSpriteItem('garra_using1', config);
                        inimigo.garraTimer--;
                        if (inimigo.garraTimer <= 0) {
                            inimigo.garraAnimEstado = 'esticando';
                        }
                    } else if (inimigo.garraAnimEstado === 'esticando') {
                        const proxDist = inimigo.garraDist + velGarra;
                        const tipX = inimigo.x + (proxDist * dirX);

                        // Verifica colisão com o cenário antes de avançar
                        if (typeof verificarColisaoComTiles === 'function' && 
                            verificarColisaoComTiles(tipX, inimigo.y, 32, 32, window.plataformas)) {
                            if (typeof window.criarImpactoVerticalGarra === 'function') {
                                window.criarImpactoVerticalGarra(tipX, inimigo.y);
                            }
                            inimigo.garraAnimEstado = 'catching'; // Estado de "pegando"
                            inimigo.garraTimer = 18;
                            inimigo.garraElemento.src = '../../assets/personagem/garra_catching.png';
                        } else {
                            inimigo.garraDist = proxDist;
                        }

                        inimigo.garraElemento.src = window.obterSpriteItem('garra_using1', config);
                        if (inimigo.garraDist > distMax) {
                            inimigo.garraDist = distMax;
                        }

                        let grabbedSomething = false;
                        // Check for PLAYER collision
                        const hitboxGarra = {
                            x: parseInt(inimigo.garraElemento.style.left),
                            y: parseInt(inimigo.garraElemento.style.bottom),
                            largura: 32,
                            altura: 32
                        };
                        const playerCapturavel = window.playerControle && !window.playerControle.estaoAberto;
                        const hitboxPlayer = playerCapturavel ? {
                            x: window.playerControle.x + (window.playerControle.offsetX || 0),
                            y: window.playerControle.y,
                            largura: window.playerControle.largura,
                            altura: window.playerControle.altura
                        } : null;

                        if (hitboxPlayer && detectarColisaoHitbox(hitboxGarra, hitboxPlayer, 0, 0, 0)) {
                            inimigo.garraItemCarregado = window.playerControle;
                            window.playerControle.stunned = true;
                            window.playerControle.stunTimer = config.garraStunDurationPlayer || 120; // Default 2 seconds
                            window.playerControle.elemento.style.filter = 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)';
                            inimigo.garraAnimEstado = 'voltando'; // Estado de "voltando" com o item
                            inimigo.garraElemento.src = '../../assets/personagem/garra_catching.png';
                            grabbedSomething = true;
                        }

                        // Check for ITEMS collision (only if player not grabbed)
                        if (!grabbedSomething) {
                            for (let k = window.itensColetaveis.length - 1; k >= 0; k--) {
                                const item = window.itensColetaveis[k];
                                const hitboxItem = { x: item.x, y: item.y, largura: 32, altura: 32 };
                                if (detectarColisaoHitbox(hitboxGarra, hitboxItem, 0, 0, 0)) {
                                    inimigo.garraItemCarregado = item;
                                    window.itensColetaveis.splice(k, 1);
                                    inimigo.garraAnimEstado = 'voltando'; // Estado de "voltando" com o item
                                    inimigo.garraElemento.src = '../../assets/personagem/garra_catching.png';
                                    grabbedSomething = true;
                                    break;
                                }
                            }
                        }

                        // Cria segmentos do braço
                        if (inimigo.garraDist > 0 && inimigo.garraDist % 32 < velGarra && inimigo.garraDist <= distMax) {
                            const braco = document.createElement('img'); // Segmento do braço
                            braco.src = (inimigo.garraBracos.length === 0) ? '../../assets/personagem/garra_using2.png' : '../../assets/personagem/garra_braco.png';
                            braco.className = 'enemy-claw-arm';
                            braco.style.position = 'absolute';
                            braco.style.width = '32px';
                            braco.style.height = '32px';
                            braco.style.zIndex = '8';
                            braco.style.imageRendering = 'pixelated';
                            braco.style.pointerEvents = 'none';
                            const offsetBraco = (inimigo.garraBracos.length * 32);
                            braco.style.left = (inimigo.x + (offsetBraco * dirX)) + 'px';
                            braco.style.bottom = inimigo.y + 'px';
                            braco.style.transform = inimigo.garraDirecaoAnim === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
                            inimigo.elemento.parentElement.appendChild(braco);
                            inimigo.garraBracos.push(braco);
                        }
                        if (inimigo.garraDist >= distMax && inimigo.garraItemCarregado === null) { // Garra atingiu o limite e não pegou nada
                            inimigo.garraAnimEstado = 'catching';
                            inimigo.garraTimer = 18;
                            inimigo.garraElemento.src = '../../assets/personagem/garra_catching.png';
                        }
                    } else if (inimigo.garraAnimEstado === 'catching') {
                        inimigo.garraTimer--;
                        if (inimigo.garraTimer <= 0) inimigo.garraAnimEstado = 'voltando';
                    } else if (inimigo.garraAnimEstado === 'voltando') { // Retraindo a garra
                        inimigo.garraDist -= velGarra;
                        if (inimigo.garraItemCarregado && inimigo.garraItemCarregado.elemento) {
                            inimigo.garraElemento.src = '../../assets/personagem/garra_catching.png'; // Mantém o sprite de "pegando" durante a retração
                            const carried = inimigo.garraItemCarregado;
                            carried.elemento.style.left = inimigo.garraElemento.style.left;
                            carried.elemento.style.bottom = inimigo.garraElemento.style.bottom;
                            
                            // Atualiza coordenadas lógicas (importante para o player não teleportar ao ser solto)
                            carried.x = parseInt(inimigo.garraElemento.style.left);
                            carried.y = parseInt(inimigo.garraElemento.style.bottom);

                            // If player is carried, update their associated elements too
                            if (inimigo.garraItemCarregado.id === 'player') {
                                if (typeof window.sincronizarAcessoriosPortador === 'function') {
                                    window.sincronizarAcessoriosPortador(window.playerControle, {
                                        armaElemento: window.playerControle.armaElemento,
                                        escudoElemento: window.playerControle.escudoElemento,
                                        botaElemento: window.playerControle.botaElemento,
                                        jetpackElemento: window.playerControle.jetpackElemento,
                                        garraElemento: window.playerControle.garraElemento,
                                        cintoElemento: window.playerControle.cintoElemento,
                                        coleteElemento: window.playerControle.coleteElemento
                                    }, { forçarSincroniaGarra: true });
                                } else {
                                    if (window.playerControle.armaElemento) window.playerControle.armaElemento.style.left = inimigo.garraElemento.style.left;
                                    if (window.playerControle.armaElemento) window.playerControle.armaElemento.style.bottom = inimigo.garraElemento.style.bottom;
                                    if (window.playerControle.escudoElemento) window.playerControle.escudoElemento.style.left = inimigo.garraElemento.style.left;
                                    if (window.playerControle.escudoElemento) window.playerControle.escudoElemento.style.bottom = inimigo.garraElemento.style.bottom;
                                    if (window.playerControle.botaElemento) window.playerControle.botaElemento.style.left = inimigo.garraElemento.style.left;
                                    if (window.playerControle.botaElemento) window.playerControle.botaElemento.style.bottom = inimigo.garraElemento.style.bottom;
                                    if (window.playerControle.jetpackElemento) window.playerControle.jetpackElemento.style.left = inimigo.garraElemento.style.left;
                                    if (window.playerControle.jetpackElemento) window.playerControle.jetpackElemento.style.bottom = inimigo.garraElemento.style.bottom;
                                    if (window.playerControle.garraElemento) window.playerControle.garraElemento.style.left = inimigo.garraElemento.style.left;
                                    if (window.playerControle.garraElemento) window.playerControle.garraElemento.style.bottom = inimigo.garraElemento.style.bottom;
                                    if (window.playerControle.cintoElemento) window.playerControle.cintoElemento.style.left = inimigo.garraElemento.style.left;
                                    if (window.playerControle.cintoElemento) window.playerControle.cintoElemento.style.bottom = inimigo.garraElemento.style.bottom;
                                    if (window.playerControle.coleteElemento) window.playerControle.coleteElemento.style.left = inimigo.garraElemento.style.left;
                                    if (window.playerControle.coleteElemento) window.playerControle.coleteElemento.style.bottom = inimigo.garraElemento.style.bottom;
                                }
                            }
                        }
                        if (inimigo.garraDist % 32 < velGarra && inimigo.garraBracos.length > 0) {
                            const ultimoBraco = inimigo.garraBracos.pop();
                            ultimoBraco.remove();
                        }

                        if (inimigo.garraItemCarregado && inimigo.garraDist <= velGarra) {
                            if (inimigo.garraItemCarregado.id === 'player') {
                                const playerAtingido = inimigo.garraItemCarregado;
                                playerAtingido.stunned = false;
                                playerAtingido.stunTimer = 0;
                                playerAtingido.elemento.style.filter = 'none';
                                
                                // Apply damage to player
                                let escudoBloqueou = false;
                                if (typeof window.aplicarImpactoEscudoPadrao === 'function') {
                                    escudoBloqueou = !!window.aplicarImpactoEscudoPadrao(playerAtingido, config, {
                                        alvoVisual: playerAtingido.escudoElemento || window.escudoElemento,
                                        flashElement: typeof flashElement === 'function' ? flashElement : null,
                                        atualizarVisualEscudo: window.atualizarVisualEscudo,
                                        salvarInventario: window.salvarInventario,
                                        duracaoFlash: 150,
                                        intensidadeFlash: 6
                                    })?.bloqueou || false;
                                }

                                if (!escudoBloqueou) {
                                    playerAtingido.dano = (playerAtingido.dano || 0) + (window.playerControle?.danoChute || 1); // Aplica o dano do chute do jogador

                                    if (typeof window.criarAnimacaoImpacto2Frames === 'function') {
                                        const larguraPlayer = Number(playerAtingido.largura || 20);
                                        const alturaPlayer = Number(playerAtingido.altura || 25);
                                        const impactoX = Number(playerAtingido.x || 0) + Number(playerAtingido.offsetX || 0) + (larguraPlayer / 2);
                                        const impactoY = Number(playerAtingido.y || 0) + (alturaPlayer / 2);

                                        window.criarAnimacaoImpacto2Frames({
                                            x: impactoX,
                                            y: impactoY,
                                            largura: 40,
                                            altura: 40,
                                            offsetY: 6,
                                            opacidade: 1,
                                            frameDurationMs: 130
                                        });
                                    }
                                }

                                // Knockback player
                                const direcaoKnockback = (inimigo.direcao === 'd' ? 1 : -1);
                                const forca = window.obterForcaKnockback(config, 'inimigoChute');
                                window.aplicarKnockback(playerAtingido, forca, direcaoKnockback, 15);

                                // ADICIONADO: Checagem de morte fatal após soltar da garra
                                const limiteVida = playerAtingido.maxVida || 3;
                                if (playerAtingido.dano >= limiteVida) {
                                    if (typeof window.prepararMorteJogador === 'function') {
                                        window.prepararMorteJogador(direcaoKnockback);
                                    }
                                }

                            } else { // It's an item
                                // Enemy collects the item
                                inimigoColetarItemGarra(inimigo, inimigo.garraItemCarregado);
                            }
                            inimigo.garraItemCarregado = null;
                            inimigo.garraAnimEstado = 'idle';
                            inimigo.garraElemento.src = config.spriteGarraPlayer || '../../assets/personagem/garra.png'; // Volta ao sprite normal da garra
                            inimigo.garraBracos.forEach(b => b.remove());
                            inimigo.garraBracos = [];
                            inimigo.cooldownGarra = 120; // Define cooldown de 2 segundos (120 frames)
                        }
                        if (inimigo.garraDist <= 0 && inimigo.garraItemCarregado === null) {
                            inimigo.garraAnimEstado = 'idle';
                            inimigo.garraElemento.src = config.spriteGarraPlayer || '../../assets/personagem/garra.png';
                            inimigo.garraBracos.forEach(b => b.remove()); // Remove os segmentos do braço
                            inimigo.garraBracos = [];
                            inimigo.cooldownGarra = 120; // Define cooldown de 2 segundos (120 frames)
                        }
                    }
                }

                // Aplica knockback se estiver ativo
                if (inimigo.framesKnockbackRestante > 0) {
                    window.aplicarDeslocamentoHorizontalComColisaoPadrao(inimigo, inimigo.velocidadeKnockback, window.plataformas, { config, maxPasso: config.inimigoKnockbackPassoMax ?? 1, cancelarKnockbackAoColidir: true });
                    inimigo.framesKnockbackRestante--;
                }
                // Decrementa o timer de stun
                if (inimigo.stunTimer > 0) inimigo.stunTimer--;

                let iaBloqueadaPorStun = false;

                // Lógica de Stun: Se o inimigo estiver atordoado, ele não faz mais nada
                if (inimigo.stunned) {
                    if (inimigo.stunTimer <= 0) {
                        inimigo.stunned = false; // Fim do stun
                    } else {
                        iaBloqueadaPorStun = true;
                        if (inimigo.ehBBInimigo && inimigo.elemento) {
                            inimigo.elemento.src = config.spriteBBInteracao || config.spriteBB || '../../assets/personagem/bb/bb-interacao.png';
                        }
                        // Faz o inimigo olhar de um lado para o outro
                        if (inimigo.stunTimer % 15 === 0) { // Troca de direção a cada 15 frames (aprox. 0.25s)
                            inimigo.direcao = (inimigo.direcao === 'd' ? 'e' : 'd');
                            inimigo.elemento.style.transform = inimigo.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
                        }
                    }
                }

                // RESGATE BB: Se o jogador está em resgate, inimigos devem zerar perseguição
                const emResgateBB = window.playerControle?.bloqueadoPorResgateBB === true;
                if (emResgateBB) {
                    inimigo.perseguindo = false;
                    inimigo.afastando = false;
                    inimigo.tempoAfastamento = 0;
                }

                // Armadura aberta: não perseguir/travar no player vazio.
                if (!alvoPerseguicao) {
                    inimigo.perseguindo = false;
                    inimigo.afastando = false;
                    inimigo.tempoAfastamento = 0;
                }

                if (!iaBloqueadaPorStun && bbTemRoboAlvo && typeof window.detectarColisaoHitbox === 'function') {
                    const hitboxInimigoBB = {
                        x: inimigo.x + (inimigo.offsetX || 0),
                        y: inimigo.y,
                        largura: inimigo.largura,
                        altura: inimigo.altura
                    };
                    const hitboxRoboAlvo = {
                        x: Number(roboAlvoBB.x ?? roboAlvoBB.spawnX ?? 0),
                        y: Number(roboAlvoBB.y ?? roboAlvoBB.spawnY ?? 0),
                        largura: Number(roboAlvoBB.largura ?? 18),
                        altura: Number(roboAlvoBB.altura ?? 16)
                    };

                    if (window.detectarColisaoHitbox(hitboxInimigoBB, hitboxRoboAlvo, 0, 0, 0)) {
                        iniciarFechamentoBBInimigo(inimigo, roboAlvoBB);
                        continue;
                    }
                }

                // Lógica de detecção de proximidade excessiva com o jogador
                const distanciaX = Math.abs(alvoPerseguicaoX - inimigo.x);
                const distanciaY = Math.abs(alvoPerseguicaoY - inimigo.y);
                const distanciaMinima = config.inimigoDistanciaMinimaAtaque || 20;

                if (!iaBloqueadaPorStun && inimigo.perseguindo && distanciaX <= distanciaMinima && distanciaY <= distanciaMinima && !inimigo.afastando && inimigo.tempoAfastamento === 0 && inimigo.cooldownAfastamento === 0) {
                    // Inimigo está muito próximo do jogador - inicia afastamento
                    inimigo.afastando = true;
                    inimigo.tempoAfastamento = config.inimigoTempoAfastamento || 30; // Removido console.log de debug
                    // console.log('Inimigo muito próximo do jogador - iniciando afastamento');
                }

                // Lógica de afastamento
                if (!iaBloqueadaPorStun && inimigo.afastando && inimigo.tempoAfastamento > 0) {
                    const velocidadeAfastamento = config.inimigoVelocidadeAfastamento || 3;
                    // Afasta-se na direção oposta ao jogador
                    if (inimigo.x < alvoPerseguicaoX) {
                        inimigo.x -= velocidadeAfastamento;
                        inimigo.direcao = 'e';
                        inimigo.elemento.style.transform = 'scaleX(-1)';
                    } else {
                        inimigo.x += velocidadeAfastamento;
                        inimigo.direcao = 'd';
                        inimigo.elemento.style.transform = 'scaleX(1)';
                    }

                    // Aplicar snap e colisão horizontal durante o afastamento (com sub-stepping implícito)
                    const limiteX = limitarPosicaoAoPalco(inimigo.x + (inimigo.offsetX || 0), inimigo.y, inimigo.largura, inimigo.altura);
                    inimigo.x = limiteX.x - (inimigo.offsetX || 0);
                    
                    verificarSnapInimigo(inimigo, xAnterior);
                } else if (!iaBloqueadaPorStun && inimigo.afastando && inimigo.tempoAfastamento === 0) {
                    // Terminou o afastamento - volta ao comportamento normal
                    inimigo.afastando = false;
                    inimigo.cooldownAfastamento = config.inimigoCooldownAfastamento || 60; // Removido console.log de debug
                    // console.log('Inimigo terminou afastamento - cooldown iniciado');
                }

                // Lógica de detecção de projétil vindo (radar de ameaça)
                const projVindo = window.projeteis ? window.projeteis.find(proj => {
                    // Distância ao inimigo na direção do projétil
                    const dx = proj.direcao === 1 ? inimigo.x - proj.x : proj.x - inimigo.x;
                    const dy = Math.abs((proj.y + config.PROJETIL_ALTURA / 2) - (inimigo.y + config.HITBOX_ALTURA / 2));
                    const chegaPerto = dx >= 0 && dx <= config.inimigoPuloDistanciaAlerta;
                    const mesmaAltura = dy <= config.HITBOX_ALTURA;
                    const vemNaDirecao = (proj.direcao === 1 && proj.x < inimigo.x) || (proj.direcao === -1 && proj.x > inimigo.x); // Removido console.log de debug
                    
                    if (chegaPerto && mesmaAltura && vemNaDirecao) { // Removido console.log de debug
                        // console.log('Inimigo detectou projétil vindo em sua direção!');
                    }
                    return chegaPerto && mesmaAltura && vemNaDirecao;
                }) : null;

                // Unificação da força de pulo: todos os tipos usam a mesma base numérica
                let forcaPuloInimigo = forcaPuloInimigoBase;
                if (inimigo.tipo === window.GAME_CONSTANTS.TIPOS_INIMIGO[3].id) { // Inimigo com bota
                    forcaPuloInimigo += Number(config.bonusPuloBota ?? 1.5);
                }

                // Ativa a perseguição se o jogador estiver perto OU se detectar um tiro vindo no radar
                // Não ativa perseguição se o jogador está em resgate do BB
                if (!iaBloqueadaPorStun && !inimigo.perseguindo && !emResgateBB && (alvoPerseguicao || bbTemRoboAlvo) && (distanciaAtual <= distanciaAtivacao || projVindo || itemInteresse || bbTemRoboAlvo || (inimigo.temGarra && distanciaAtual <= (config.garraAlcanceInimigo || 160)))) {
                    inimigo.perseguindo = true; // Removido console.log de debug
                    // console.log("Inimigo ativado! Motivo: " + (projVindo ? "Tiro detectado" : "Proximidade"));
                }

                // Lógica de pulo de desvio (usa o projVindo detectado acima)
                if (!iaBloqueadaPorStun && projVindo && inimigo.noChao && inimigo.puloTimer === 0 && !inimigo.jumpQueued) {
                    // Define um delay randômico antes de pular
                    inimigo.puloTimer = Math.floor(Math.random() * (config.inimigoPuloDelayMax - config.inimigoPuloDelayMin + 1)) + config.inimigoPuloDelayMin;
                    inimigo.jumpQueued = true; // Marca que um pulo foi agendado
                }

                // Executa o pulo ou VOO se o timer chegou a zero e foi agendado
                if (!iaBloqueadaPorStun && inimigo.puloTimer === 0 && inimigo.jumpQueued) {
                    if (inimigo.temJetpack && !inimigo.itensGuardadosNoCinto && !inimigo.jetpackAtivo && inimigo.cooldownVooJetpack === 0) {
                        window.AudioManager?.playSFX('fogueteligando', 0.4);
                        // Inicia o som de propulsão contínua para o inimigo
                        if (window.AudioManager && !inimigo._jetpackLoop) {
                            inimigo._jetpackLoop = typeof window.AudioManager.createSFX === 'function'
                                ? window.AudioManager.createSFX('trusterhover', 0.2, true)
                                : null;
                            inimigo._jetpackLoop?.play().catch(() => {});
                        }
                        inimigo.jetpackAtivo = true;
                        if (inimigo.timerVooRestante <= 0) {
                            inimigo.timerVooRestante = config.jetpackDuracaoVoo || 360;
                        }
                        inimigo.framesVoando = 0;
                        inimigo.jumpQueued = false;
                    } else if (inimigo.noChao) {
                        if (inimigo.noChao) { // Só pula se ainda estiver no chão
                            inimigo.velocidadeY = forcaPuloInimigo;
                            inimigo.noChao = false;
                            inimigo.jumpQueued = false;
                        }
                    }
                }

                // Lógica de Física ou Voo do Jetpack
                if (inimigo.jetpackAtivo) {
                    inimigo.timerVooRestante--;
                    inimigo.framesVoando++;
                    
                    // Decisão da IA: voar para cima se o alvo estiver acima
                    const subir = yAlvo > inimigo.y + 10;
                    if (subir) {
                        inimigo.velocidadeY = config.jetpackForcaVoo || 2;
                    } else {
                        inimigo.velocidadeY = -1;
                    }
                    inimigo.y += inimigo.velocidadeY;

                    // Lógica de Desativação 1: Tanque vazio. 
                    // O inimigo perde a sustentação e o equipamento entra em cooldown.
                    if (inimigo.timerVooRestante <= 0) {
                        if (inimigo._jetpackLoop) {
                            inimigo._jetpackLoop.pause();
                            inimigo._jetpackLoop = null;
                        }
                        inimigo.jetpackAtivo = false;
                        inimigo.velocidadeY = 0;
                        inimigo.cooldownVooJetpack = config.jetpackCooldown || 180;
                    } 
                    // Lógica de Desativação 2: Contato com o solo.
                    // O inimigo interrompe o voo ao pousar em uma plataforma, preservando o combustível restante.
                    else if (inimigo.noChao && inimigo.framesVoando > 10) {
                        if (inimigo._jetpackLoop) {
                            inimigo._jetpackLoop.pause();
                            inimigo._jetpackLoop = null;
                        }
                        inimigo.jetpackAtivo = false;
                        inimigo.velocidadeY = 0;
                    }
                } else if (typeof aplicarFisica === 'function') {
                    const inimigoTeclasParaFisica = { ' ': window.debugInimigoTeclas && window.debugInimigoTeclas[' '] };
                    aplicarFisica(inimigo, inimigoTeclasParaFisica, forcaPuloInimigo, gravidadeInimigoAtual, config.inimigoPuloCooldown || 0);
                }

                // Colisão Vertical constante para garantir que o inimigo pule e caia corretamente
                inimigo.noChao = false;
                const hitV = typeof verificarColisaoComTiles === 'function' ? verificarColisaoComTiles(inimigo.x + (inimigo.offsetX || 0), inimigo.y, inimigo.largura, inimigo.altura, window.plataformas) : null;
                let ignorarSnapVerticalNesteFrame = false;
                let ignorarColisaoHorizontalNesteFrame = false;

                if (inimigo.cooldownDanoEspinho > 0) inimigo.cooldownDanoEspinho--;
                if (hitV && hitV.tipo === 'estaca') {
                    const morreuPorEspinho = aplicarDanoEspinhoInimigo(inimigo, hitV);
                    if (!morreuPorEspinho && hitV.direcao === 'cima') {
                        // Evita grudar em quinas laterais ao tomar dano de estaca para cima.
                        ignorarSnapVerticalNesteFrame = true;
                        ignorarColisaoHorizontalNesteFrame = true;
                        inimigo.noChao = false;

                        if (hitV.esquerdaReal !== undefined && hitV.direitaReal !== undefined) {
                            const centroEstaca = (hitV.esquerdaReal + hitV.direitaReal) / 2;
                            const centroInimigo = inimigo.x + (inimigo.offsetX || 0) + ((inimigo.largura || 0) / 2);
                            const direcaoSaida = centroInimigo < centroEstaca ? -1 : 1;
                            inimigo.x += direcaoSaida * 6;
                        }
                    }
                    if (morreuPorEspinho) {
                        if (inimigo.tipo === window.GAME_CONSTANTS.INIMIGO_FENO_ID) {
                            if (typeof window.processarMorteFeno === 'function') {
                                window.processarMorteFeno(inimigo);
                            }
                        } else {
                            limparVisuaisInimigo(inimigo);
                            inimigo.elemento.remove();
                            window.inimigos.splice(i, 1);
                        }
                        continue;
                    }
                }

                if (hitV && !ignorarSnapVerticalNesteFrame) {
                    if (inimigo.velocidadeY < 0) {
                        inimigo.noChao = true;
                        inimigo.velocidadeY = 0;
                        inimigo.y = window.aplicarSnapColisaoPadrao(inimigo.y, 0, inimigo.altura, hitV, 'cima');
                        inimigo.puloTimer = 0;
                        inimigo.jumpQueued = false;
                    } else if (inimigo.velocidadeY > 0) { // Subindo
                        // Se for colisão com o teto de um robô aberto e o inimigo estiver subindo, ignora.
                        if (hitV.tipo === 'meio' && hitV.direcao === 'superior') {
                            // Não faz nada, efetivamente ignorando a colisão
                        } else {
                            inimigo.velocidadeY = 0;
                            inimigo.y = window.aplicarSnapColisaoPadrao(inimigo.y, 0, inimigo.altura, hitV, 'baixo');
                        }
                    }
                }

                // Remove o inimigo se ele cair no buraco (fora da tela)
                if (inimigo.y < -64) {
                    limparVisuaisInimigo(inimigo);
                    inimigo.elemento.remove();
                    window.inimigos.splice(i, 1);
                    continue;
                }

                // Lógica de Coleta de Itens pelos Inimigos
                if (!inimigo.estaColetando && !inimigo.afastando && !estaChutando && window.itensColetaveis) {
                    for (let j = window.itensColetaveis.length - 1; j >= 0; j--) {
                        const item = window.itensColetaveis[j];
                        if (item.coletavel === false || window.itemDefinitions?.[item.tipo]?.coletavel === false) continue;
                        
                        // Usa a função de hitbox global com margem extra para facilitar a coleta
                        const hitboxInimigoBody = { x: inimigo.x + (inimigo.offsetX || 0), y: inimigo.y, largura: inimigo.largura, altura: inimigo.altura };
                        const hitboxItemBody = { x: item.x, y: item.y, largura: 32, altura: 32 };

                        if (typeof detectarColisaoHitbox === 'function' && detectarColisaoHitbox(hitboxInimigoBody, hitboxItemBody, -6, -6, -6)) {
                            
                            // O inimigo só tenta pegar o que ele ainda não tem
                            if (item.tipo !== 'airdrop' && 
                                ((item.tipo === 'revolver' && inimigo.temArma && inimigo.municao > 0) ||
                                 (item.tipo === 'doze' && inimigo.temArma && inimigo.municao > 0) ||
                                 (item.tipo === 'escudo' && inimigo.temEscudo) ||
                                 (item.tipo === 'bota' && inimigo.temBota) ||
                                 (item.tipo === 'jetpack' && inimigo.temJetpack) ||
                                 (item.tipo === 'cinto' && inimigo.temCinto) ||
                                 (item.tipo === 'garra' && inimigo.temGarra) ||
                                 (item.tipo === 'colete' && inimigo.temColete))) continue;

                            // Se for um item de restauração, o inimigo só coleta se precisar
                            if (item.tipo === 'restauracao') {
                                const maxMun = (inimigo.heldWeaponType === 'doze') ? 2 : 5;
                                const precisaRestaurarMunicao = inimigo.temArma && inimigo.municao < maxMun;
                                const precisaRestaurarEscudo = inimigo.temEscudo && inimigo.escudoVermelho;
                                if (!precisaRestaurarMunicao && !precisaRestaurarEscudo) {
                                    continue; // Não precisa do item de restauração
                                }
                            }


                            inimigo.estaColetando = true;
                            // Usa valores do config ou fallback para 100 frames
                            inimigo.timerColeta = (item.tipo === 'airdrop') 
                                ? (config.tempoColetaAirdrop || 150) 
                                : (config.tempoColetaItem || 100);
                            inimigo.itemSendoColetado = item;
                            break;
                        }
                    }
                }

                if (inimigo.estaColetando) {
                    inimigo.timerColeta--;
                    
                    // Verifica se o item ainda existe (evita coletar itens que já sumiram ou foram pegos)
                    if (!window.itensColetaveis?.includes(inimigo.itemSendoColetado)) {
                        inimigo.estaColetando = false;
                        inimigo.itemSendoColetado = null;
                    }

                    // Olha de um lado para o outro a cada 30 frames
                    if (inimigo.timerColeta % 30 === 0) {
                        inimigo.direcao = (inimigo.direcao === 'd' ? 'e' : 'd');
                        inimigo.elemento.style.transform = inimigo.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
                    }

                    if (inimigo.timerColeta <= 0) {
                        inimigoColetarItemGarra(inimigo, inimigo.itemSendoColetado);
                        if (inimigo.itemSendoColetado?.coletavel !== false && window.itemDefinitions?.[inimigo.itemSendoColetado?.tipo]?.coletavel !== false) {
                            const itemIndex = window.itensColetaveis.indexOf(inimigo.itemSendoColetado);
                            if (itemIndex !== -1) window.itensColetaveis.splice(itemIndex, 1);
                        }
                        inimigo.estaColetando = false;
                    }
                }

                let movendoDestaVez = false;
                // Ações que dependem da ativação (movimento e ataque) - só se não estiver afastando, coletando ou usando a garra
                if (!iaBloqueadaPorStun && inimigo.perseguindo && !inimigo.afastando && !inimigo.estaColetando) {
                    // Lógica para INICIAR o chute
                    if (!inimigo.ehBBInimigo && !inimigo.estaAgachado && distanciaAtual <= config.distanciaAtaqueInimigo && inimigo.cooldownChute === 0) {
                        inimigo.tempoChute = config.tempoChute;
                        inimigo.cooldownChute = config.cooldownChute;
                        window.AudioManager?.playSFX('chute', 0.3);
                        inimigo.jaAtacouNesteChute = false;

                        // 1 em 4 tentativas (25%) ele anda para frente enquanto chuta
                        inimigo.andarAoChutar = Math.random() < 0.25;

                        // Dash do inimigo (Suave e com bônus de bota)
                        const duracaoDash = 10;
                        const multiplicadorChute = (inimigo.temBota && !inimigo.itensGuardadosNoCinto) ? 2 : 1;
                        
                        inimigo.framesImpulsoRestante = duracaoDash;
                        inimigo.velocidadeDash = (config.impulsoChute * multiplicadorChute) / duracaoDash;
                    }

                    // Lógica para INICIAR o disparo
                    if (!inimigo.ehBBInimigo && inimigo.temArma && !inimigo.itensGuardadosNoCinto && distanciaAtual <= alcanceTiro && distanciaAtual > config.distanciaAtaqueInimigo && inimigo.cooldownTiro === 0 && inimigo.municao > 0) {
                        inimigo.cooldownTiro = config.cooldownTiro;
                        inimigo.municao--;
                        window.AudioManager?.playSFX('disparo', 0.4);
                        
                        const dir = inimigo.direcao === 'd' ? 1 : -1;
                        const xPartida = (inimigo.direcao === 'd') ? inimigo.x + 32 : inimigo.x - config.PROJETIL_LARGURA;
                        const yPartida = inimigo.y + 12;

                        const projElemento = document.createElement('img');
                        projElemento.src = config.spriteProjetil;
                        projElemento.style.position = 'absolute';
                        projElemento.style.width = config.PROJETIL_LARGURA + 'px';
                        projElemento.style.height = config.PROJETIL_ALTURA + 'px';
                        projElemento.style.left = xPartida + 'px';
                        projElemento.style.bottom = yPartida + 'px';
                        projElemento.style.imageRendering = 'pixelated';
                        adicionarAoLayer(projElemento, window.LAYERS.PROJETEIS);

                        window.projeteis.push({
                            x: xPartida,
                            y: yPartida,
                            direcao: dir,
                            elemento: projElemento,
                            origem: 'inimigo'
                        });
                        
                        // Efeito visual de disparo na arma do inimigo
                        if (typeof flashRapido === 'function' && inimigo.armaElemento) {
                            flashRapido(inimigo.armaElemento);
                        }
                        // Aciona a nova animação de inclinação no inimigo
                        if (typeof aplicarRecuoRevolver === 'function' && inimigo.armaElemento) {
                            aplicarRecuoRevolver(inimigo.armaElemento);
                        }
                        
                        // console.log(`Inimigo disparou! Munição restante: ${inimigo.municao}`); // Removido console.log de debug
                    }

                    // Lógica de perseguição: move-se na direção do Alvo (AirDrop ou Player)
                    // Aplica velocidade reduzida se estiver agachado
                    let velEfetivaMovimento = velAtiva;
                    if (inimigo.estaAgachado) {
                        const multiplicadorAgachado = Number(config.agachadoMultiplicadorVelocidade ?? 0.55);
                        velEfetivaMovimento = velAtiva * multiplicadorAgachado;
                    }
                    
                    const lookaheadMin = Number(config.inimigoEstacaLookaheadMin ?? 10);
                    const lookaheadBonus = Number(config.inimigoEstacaLookaheadBonus ?? 8);
                    const distanciaPerigo = Math.max(lookaheadMin, Math.ceil(velEfetivaMovimento) + lookaheadBonus);
                    const perigoDireita = analisarPerigoEstacaFrente(inimigo, 1, distanciaPerigo);
                    const perigoEsquerda = analisarPerigoEstacaFrente(inimigo, -1, distanciaPerigo);

                    if (inimigo.x < xAlvoNavegacao - velEfetivaMovimento) {
                        if ((inimigo.tempoChute === 0 || inimigo.andarAoChutar) && inimigo.garraAnimEstado === 'idle') {
                            // Estaca da direita/esquerda à frente: não avança nessa direção.
                            if (!perigoDireita.lateral) {
                                // Estaca up à frente: prioriza salto por cima (se não houver estaca down no arco).
                                if (perigoDireita.up) {
                                    if (inimigo.noChao && (inimigo.cooldownPulo || 0) === 0 && inimigo.puloTimer === 0 && !inimigo.jumpQueued && !inimigo.estaAgachado && !temEstacaBaixoNoArcoDoPulo(inimigo, 1)) {
                                        inimigo.puloTimer = 0;
                                        inimigo.jumpQueued = true;
                                    }
                                } else {
                                    inimigo.x += velEfetivaMovimento;
                                    inimigo.direcao = 'd';
                                    movendoDestaVez = true;
                                }
                            }
                        }
                    } else if (inimigo.x > xAlvoNavegacao + velEfetivaMovimento) {
                        if ((inimigo.tempoChute === 0 || inimigo.andarAoChutar) && inimigo.garraAnimEstado === 'idle') {
                            if (!perigoEsquerda.lateral) {
                                if (perigoEsquerda.up) {
                                    if (inimigo.noChao && (inimigo.cooldownPulo || 0) === 0 && inimigo.puloTimer === 0 && !inimigo.jumpQueued && !inimigo.estaAgachado && !temEstacaBaixoNoArcoDoPulo(inimigo, -1)) {
                                        inimigo.puloTimer = 0;
                                        inimigo.jumpQueued = true;
                                    }
                                } else {
                                    inimigo.x -= velEfetivaMovimento;
                                    inimigo.direcao = 'e';
                                    movendoDestaVez = true;
                                }
                            }
                        }
                    }

                    // Lógica para INICIAR a Garra (se tiver e estiver no alcance)
                    if (!inimigo.ehBBInimigo && inimigo.temGarra && !inimigo.itensGuardadosNoCinto && inimigo.garraAnimEstado === 'idle' && inimigo.cooldownGarra === 0 && distanciaAtual <= (config.garraAlcanceInimigo || 160)) {
                        window.AudioManager?.playSFX('engrenagem', 0.3);
                        inimigo.garraAnimEstado = 'prep';
                        inimigo.garraTimer = 18;
                        inimigo.garraDirecaoAnim = (inimigo.x < xAlvo) ? 'd' : 'e';
                    }
                } else if (!iaBloqueadaPorStun && !inimigo.perseguindo && !inimigo.estaColetando) {
                    // Lógica de Patrulha Aleatória: 1s parado, 1s andando devagar
                    inimigo.patrulhaTimer--;
                    
                    if (inimigo.patrulhaTimer <= 0) {
                        // Alterna estado
                        inimigo.estadoPatrulha = (inimigo.estadoPatrulha === 'parado') ? 'caminhando' : 'parado';
                        inimigo.patrulhaTimer = 60; // Reset para 1 segundo
                        
                        if (inimigo.estadoPatrulha === 'caminhando') {
                            inimigo.direcaoPatrulha = Math.random() < 0.5 ? 'e' : 'd';
                        }
                    }

                    if (inimigo.estadoPatrulha === 'caminhando') {
                        const velPatrulha = velAtiva * 0.3; // Caminha bem devagar
                        const dirSign = inimigo.direcaoPatrulha === 'd' ? 1 : -1;
                        const dirPatrulha = inimigo.direcaoPatrulha === 'd' ? 1 : -1;
                        const lookaheadPatrulha = Number(config.inimigoEstacaLookaheadPatrulha ?? 14);
                        const perigoPatrulha = analisarPerigoEstacaFrente(inimigo, dirPatrulha, lookaheadPatrulha);
                        
                        // Verificação de segurança (parede ou buraco à frente)
                        const margemCheck = (inimigo.direcaoPatrulha === 'd' ? 20 : -20);
                        const checkX = inimigo.x + (inimigo.offsetX || 0) + (inimigo.largura / 2) + margemCheck;
                        
                        const temChao = typeof verificarColisaoComTiles === 'function' && 
                                        verificarColisaoComTiles(checkX, inimigo.y - 10, 2, 2, window.plataformas);
                        const temParede = typeof verificarColisaoComTiles === 'function' && 
                                          verificarColisaoComTiles(checkX, inimigo.y + 10, 2, 2, window.plataformas);

                        if (perigoPatrulha.lateral) {
                            inimigo.estadoPatrulha = 'parado';
                            inimigo.patrulhaTimer = 60;
                        } else if (perigoPatrulha.up) {
                            if (inimigo.noChao && (inimigo.cooldownPulo || 0) === 0 && inimigo.puloTimer === 0 && !inimigo.jumpQueued && !inimigo.estaAgachado && !temEstacaBaixoNoArcoDoPulo(inimigo, dirPatrulha)) {
                                inimigo.puloTimer = 0;
                                inimigo.jumpQueued = true;
                            }
                        } else if (temChao && !temParede) {
                            inimigo.x += velPatrulha * dirSign;
                            inimigo.direcao = inimigo.direcaoPatrulha;
                            movendoDestaVez = true;
                        } else {
                            // Se encontrar obstáculo, para imediatamente
                            inimigo.estadoPatrulha = 'parado';
                            inimigo.patrulhaTimer = 60;
                        }
                    }
                }

                // Lógica de Pulo por Diferença de Altura (Apenas se estiver perseguindo e NÃO agachado)
                if (!iaBloqueadaPorStun && inimigo.perseguindo && inimigo.noChao && (inimigo.cooldownPulo || 0) === 0 && yAlvo > inimigo.y + 31 && !inimigo.estaAgachado) {
                    const distXAlvo = Math.abs(xAlvo - inimigo.x);
                    const dirPuloAltura = xAlvo >= inimigo.x ? 1 : -1;
                    if (distXAlvo < 64 && inimigo.puloTimer === 0 && !inimigo.jumpQueued && !temEstacaBaixoNoArcoDoPulo(inimigo, dirPuloAltura)) {
                        inimigo.puloTimer = Math.floor(Math.random() * (config.inimigoPuloDelayMax - config.inimigoPuloDelayMin + 1)) + config.inimigoPuloDelayMin;
                        inimigo.jumpQueued = true;
                    }
                }

                // Lógica de Salto de Fé (Gap Jumping - Apenas se estiver perseguindo e NÃO agachado)
                if (!iaBloqueadaPorStun && inimigo.perseguindo && movendoDestaVez && inimigo.noChao && (inimigo.cooldownPulo || 0) === 0 && !inimigo.estaAgachado) {
                    const checkX = (inimigo.direcao === 'd') 
                        ? inimigo.x + (inimigo.offsetX || 0) + inimigo.largura + 10 
                        : inimigo.x + (inimigo.offsetX || 0) - 10;
                    
                    const checkY = inimigo.y - 10;
                    
                    if (typeof verificarColisaoComTiles === 'function' &&
                        !verificarColisaoComTiles(checkX, checkY, 2, 2, window.plataformas) && inimigo.puloTimer === 0 && !inimigo.jumpQueued) {
                        const minDelay = config.inimigoPuloDelayMinGap ?? 0;
                        const maxDelay = config.inimigoPuloDelayMaxGap ?? 10;
                        const dirGap = inimigo.direcao === 'd' ? 1 : -1;
                        if (!temEstacaBaixoNoArcoDoPulo(inimigo, dirGap)) {
                            inimigo.puloTimer = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
                            inimigo.jumpQueued = true;
                        }
                    }
                }

                // Gerenciamento de Animação e Estados Visuais
                if (!inimigo.stunned && !inimigo.estaColetando) {
                    const controleAnimacao = {
                        movendoHorizontal: movendoDestaVez,
                        noChao: inimigo.noChao,
                        contadorAnimacao: inimigo.contadorAnimacao || 0,
                        frameAtual: inimigo.frameAtual || 0,
                        chutando: inimigo.tempoChute > 0
                    };

                    // Seleciona sprites baseado em agachamento
                    const spriteParadoBase = inimigo.ehBBInimigo
                        ? (config.spriteBB || spriteParado)
                        : (config.spriteParadoInimigo || spriteParado);
                    const spriteAndandoBase = inimigo.ehBBInimigo
                        ? (config.spriteBBAndando || spriteAndando)
                        : (config.spriteAndandoInimigo || spriteAndando);
                    const usarSpriteAgachado = inimigo.estaAgachado && !inimigo.ehBBInimigo;

                    const spriteParadoUsado = usarSpriteAgachado
                        ? inimigo.spriteParadoAgachado 
                        : spriteParadoBase;
                    const spriteAndandoUsado = usarSpriteAgachado
                        ? inimigo.spriteAndandoAgachado
                        : spriteAndandoBase;
                    const spriteNoArUsado = inimigo.ehBBInimigo
                        ? (config.spriteBBAndando || config.spriteNoArInimigo || spriteNoAr)
                        : (config.spriteNoArInimigo || spriteNoAr);

                    if (typeof atualizarAnimacao === 'function') {
                        atualizarAnimacao(
                            controleAnimacao, 
                            inimigo.elemento, 
                            spriteParadoUsado,
                            spriteAndandoUsado
                            ,
                            spriteNoArUsado // Passa o sprite de "no ar"
                        );
                        // Salva o estado da animação no objeto do inimigo para o próximo frame
                        inimigo.contadorAnimacao = controleAnimacao.contadorAnimacao;
                        inimigo.frameAtual = controleAnimacao.frameAtual;
                    }

                    if (estaChutando) {
                        inimigo.elemento.src = config.spriteChuteInimigo || spriteChute;

                        if (inimigo.framesImpulsoRestante > 0) {
                            const direcaoDash = (inimigo.direcao === 'd' ? 1 : -1);
                            inimigo.x += inimigo.velocidadeDash * direcaoDash;
                            inimigo.framesImpulsoRestante--;
                        }
                    }
                }

                // Lógica da Attackbox do Inimigo (Apenas se estiver perseguindo/atacando)
                if (!iaBloqueadaPorStun && inimigo.perseguindo && inimigo.tempoChute > 0 && !inimigo.jaAtacouNesteChute && window.playerControle && !window.playerControle.estaoAberto) {
                    const ataqueOffsetX = config.INIMIGO_ATAQUE_OFFSET_X ?? config.ATAQUE_OFFSET_X;
                    const ataqueOffsetY = config.INIMIGO_ATAQUE_OFFSET_Y ?? config.ATAQUE_OFFSET_Y;
                    const ataqueLargura = config.INIMIGO_ATAQUE_LARGURA ?? config.ATAQUE_LARGURA;
                    const ataqueAltura = config.INIMIGO_ATAQUE_ALTURA ?? config.ATAQUE_ALTURA;

                    let ataqueX = (inimigo.direcao === 'd') 
                        ? inimigo.x + ataqueOffsetX 
                        : inimigo.x + (32 - ataqueOffsetX - ataqueLargura);

                    const hitboxAtaqueInimigo = {
                        x: ataqueX,
                        y: inimigo.y + ataqueOffsetY,
                        largura: ataqueLargura,
                        altura: ataqueAltura
                    };

                    const hurtboxPlayer = { 
                        x: window.playerControle.x + (window.playerControle.offsetX || 0), 
                        y: window.playerControle.y, 
                        largura: window.playerControle.largura, 
                        altura: window.playerControle.altura 
                    };

                    if (typeof detectarColisaoHitbox === 'function' && 
                        detectarColisaoHitbox(hitboxAtaqueInimigo, hurtboxPlayer, 0, 0, 0)) {
                        
                        window.AudioManager?.playSFX('impacto', 0.7);
                        inimigo.jaAtacouNesteChute = true;
                        
                        if (!window.temEscudoAtivoPadrao(window.playerControle)) {
                            window.playerControle.dano = (window.playerControle.dano || 0) + 1;

                            if (typeof window.criarAnimacaoImpacto2Frames === 'function') {
                                const pontoImpacto = (typeof window.calcularCentroColisaoHitboxes === 'function')
                                    ? window.calcularCentroColisaoHitboxes(hitboxAtaqueInimigo, hurtboxPlayer)
                                    : null;

                                window.criarAnimacaoImpacto2Frames({
                                    x: pontoImpacto?.x ?? (hurtboxPlayer.x + (hurtboxPlayer.largura / 2)),
                                    y: pontoImpacto?.y ?? (hurtboxPlayer.y + (hurtboxPlayer.altura / 2)),
                                    largura: 40,
                                    altura: 40,
                                    offsetY: 6,
                                    opacidade: 1,
                                    frameDurationMs: 130
                                });
                            }
                            
                            if (typeof flashComVibacao === 'function') {
                                flashComVibacao(document.getElementById('player'));
                            }
                        } else {
                            if (typeof piscaLeve === 'function' && window.escudoElemento) {
                                piscaLeve(window.escudoElemento);
                            }
                        }
                        
                        const direcaoKnockback = (inimigo.direcao === 'd' ? 1 : -1);
                        const valorKnockback = window.obterKnockbackRecebidoPadrao(window.playerControle, config, 'inimigoChute');
                        const duracaoRecuo = 15;
                        
                        window.playerControle.framesKnockbackRestante = duracaoRecuo;
                        window.playerControle.velocidadeKnockback = (valorKnockback / duracaoRecuo) * direcaoKnockback;

                        const limiteVida = window.playerControle.maxVida || 3;
                        if (window.playerControle.dano >= limiteVida) {
                            if (typeof window.prepararMorteJogador === 'function') {
                                window.prepararMorteJogador(inimigo.direcao === 'd' ? 1 : -1);
                            }
                        }
                    }
                }

                // Colisão Horizontal com as laterais das plataformas (após perseguição/dash)
                if (!ignorarColisaoHorizontalNesteFrame && typeof verificarColisaoComTiles === 'function' && 
                    verificarColisaoComTiles(inimigo.x + (inimigo.offsetX || 0), inimigo.y, inimigo.largura, inimigo.altura, window.plataformas)) {
                    
                    // Item 1: Pulo por Obstrução (Wall Detection)
                    if (!iaBloqueadaPorStun && inimigo.noChao && (inimigo.cooldownPulo || 0) === 0 && inimigo.puloTimer === 0 && !inimigo.jumpQueued && !inimigo.estaAgachado && !inimigo.precisaAgacharPassagem && !temEstacaBaixoNoArcoDoPulo(inimigo, inimigo.direcao === 'd' ? 1 : -1)) {
                        // Agenda o pulo com um delay aleatório
                        inimigo.puloTimer = Math.floor(Math.random() * (config.inimigoPuloDelayMax - config.inimigoPuloDelayMin + 1)) + config.inimigoPuloDelayMin;
                        inimigo.jumpQueued = true; // Removido console.log de debug
                        // console.log('Inimigo iniciou timer de pulo por obstrução:', inimigo.puloTimer, 'frames'); // Comentado conforme solicitado
                    }
                    verificarSnapInimigo(inimigo, xAnterior);
                }

                function verificarSnapInimigo(ent, xAnt) {
                    const hit = typeof verificarColisaoComTiles === 'function' ? 
                        verificarColisaoComTiles(ent.x + (ent.offsetX || 0), ent.y, ent.largura, ent.altura, window.plataformas) : null;
                    if (hit) {
                        if (ent.x > xAnt) { // Direita
                            ent.x = window.aplicarSnapColisaoPadrao(ent.x, ent.offsetX || 0, ent.largura, hit, 'direita');
                        } else if (ent.x < xAnt) { // Esquerda
                            ent.x = window.aplicarSnapColisaoPadrao(ent.x, ent.offsetX || 0, ent.largura, hit, 'esquerda');
                        }
                        return true;
                    }
                    return false;
                }


                // Garante que o inimigo permaneça dentro dos limites do palco (Clamping)
                if (typeof limitarPosicaoAoPalco === 'function') {
                    const posAjustada = limitarPosicaoAoPalco(
                        inimigo.x + (inimigo.offsetX || 0), 
                        inimigo.y, 
                        inimigo.largura, 
                        inimigo.altura
                    );
                    inimigo.x = posAjustada.x - (inimigo.offsetX || 0);
                    // Removido o ajuste de Y para permitir que o inimigo caia em buracos
                    // inimigo.y = posAjustada.y;
                }

                // Atualiza a posição no DOM (Sempre, para refletir gravidade, movimento e knockback)
                inimigo.elemento.style.left = inimigo.x + 'px';
                inimigo.elemento.style.bottom = inimigo.y + 'px';
                inimigo.elemento.style.transform = inimigo.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';

                // Prepara transforms e offsets específicos antes da sincronização global
                const direcaoFator = inimigo.direcao === 'e' ? 1 : -1;
                const anguloRecuo = (inimigo.armaElemento?.dataset.recoil === 'true') ? (15 * direcaoFator) : 0;
                const transformArma = (inimigo.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)') + ` rotate(${anguloRecuo}deg)`;

                const tremorFogo = (Math.random() * 3) - 1.5;
                const mostrarFogo = !!(inimigo.jetpackAtivo && playerY > inimigo.y + 10 && (inimigo.timerVooRestante % 4 < 2));
                if (inimigo.jetFogoElemento) inimigo.jetFogoElemento.style.display = mostrarFogo ? 'block' : 'none';

                // Sincroniza posição de todos os acessórios via helper centralizado
                window.sincronizarAcessoriosEntidade(inimigo, {
                    armaElemento: inimigo.armaElemento,
                    escudoElemento: inimigo.escudoElemento,
                    botaElemento: inimigo.botaElemento,
                    jetpackElemento: inimigo.jetpackElemento,
                    jetFogoElemento: inimigo.jetFogoElemento,
                    garraElemento: inimigo.garraElemento,
                    cintoElemento: inimigo.cintoElemento,
                    coleteElemento: inimigo.coleteElemento
                }, {
                    transformArma,
                    offsetYFogo: -4 + tremorFogo
                });

                // Lógica de atualização de sprites e filtros (mantida aqui por ser específica da lógica do item)
                if (inimigo.armaElemento) {
                    inimigo.armaElemento.style.filter = (inimigo.municao <= 0) ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
                }

                if (inimigo.escudoElemento && inimigo.temEscudo) {
                    inimigo.escudoElemento.style.filter = inimigo.escudoVermelho ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
                }

                if (inimigo.botaElemento && inimigo.temBota) {
                    if (estaChutando) inimigo.botaElemento.src = config.spriteBotaChutando || '../../assets/personagem/bota_chutando.png';
                    else if (!inimigo.noChao) inimigo.botaElemento.src = config.spriteBotaNoAr || '../../assets/personagem/bota_no_ar.png';
                    else if (movendoDestaVez) inimigo.botaElemento.src = (inimigo.frameAtual === 1) ? (config.spriteBotaAndando || '../../assets/personagem/bota_andando.png') : (config.spriteBotaParado || '../../assets/personagem/bota_parado.png');
                    else inimigo.botaElemento.src = config.spriteBotaParado || '../../assets/personagem/bota_parado.png';
                }

                if (inimigo.jetpackElemento && inimigo.temJetpack) {
                    inimigo.jetpackElemento.style.filter = (inimigo.cooldownVooJetpack > 0) ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
                }
            }
        }

        // Verificação de colisão com vidro da cápsula para todos os inimigos
        if (typeof window.verificarColisaoComVidroCapsula === 'function') {
            for (const inimigo of window.inimigos) {
                if (!inimigo || inimigo.estaMorto) continue;

                const hitboxInimigo = {
                    x: inimigo.x + (inimigo.offsetX || 0),
                    y: inimigo.y,
                    largura: inimigo.largura,
                    altura: inimigo.altura
                };
                const vidroColidido = window.verificarColisaoComVidroCapsula(hitboxInimigo);
                if (vidroColidido) {
                    // Faz snap colisão: empurra para fora do vidro
                    const centroInimigo = inimigo.x + (inimigo.offsetX || 0) + inimigo.largura / 2;
                    const centroVidro = vidroColidido.x + vidroColidido.largura / 2;
                    
                    if (centroInimigo < centroVidro) {
                        // Inimigo à esquerda do vidro
                        inimigo.x = vidroColidido.x - (inimigo.largura + inimigo.offsetX);
                    } else {
                        // Inimigo à direita do vidro
                        inimigo.x = (vidroColidido.x + vidroColidido.largura) - inimigo.offsetX;
                    }
                }
            }
        }

        // Mantém o loop de movimentação da IA
        requestAnimationFrame(atualizarIA);
    }

    // Inicia o ciclo de atualização
    requestAnimationFrame(atualizarIA);
}
