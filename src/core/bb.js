(function () {
    // Estado global do BB
    window.bbEntidade = null;
    window.controlandoBB = false;
    
    // ID único para gerenciar a instância ativa do BB do jogador
    let playerBBIdAtivo = 0;

    /**
     * Cria a entidade do Bebê (BB) para controle do jogador
     */
    window.spawnEntidadePlayerBB = function (x, y, gameConfig) {
        const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
        if (!palco) return;

        playerBBIdAtivo++;
        const meuId = playerBBIdAtivo;
        const config = gameConfig || window.config || {};

        // O BB do player é tratado como entidade única
        const idElemento = 'pet-bb';
        const antigo = document.getElementById(idElemento);
        if (antigo) antigo.remove();
        
        if (window.bbEntidade?.corpoRoboAbertoElemento) {
            window.bbEntidade.corpoRoboAbertoElemento.remove();
        }

        // Cria elemento do BB
        const img = document.createElement('img');
        const spritePadrao = config.spriteBB || '../../assets/personagem/bb/bb-parado.png';
        img.src = spritePadrao;
        img.id = idElemento;
        img.className = 'entidade-player-bb';
        // CSS seco, sem transição
        img.style.cssText = 'position: absolute; width: 32px; height: 32px; image-rendering: pixelated; z-index: 100; pointer-events: none; transform-origin: center center;';
        img.style.left = x + 'px';
        img.style.bottom = y + 'px';

        if (window.LAYERS && window.LAYERS.INIMIGOS) {
            window.adicionarAoLayer(img, window.LAYERS.INIMIGOS);
        } else {
            palco.appendChild(img);
        }

        // Configuração do BB com mesma física do cao
        const bb = {
            elemento: img,
            tipo: 'bb',
            x: x,
            y: y,
            largura: 9,
            altura: 15,
            offsetX: 11,
            velocidadeY: 0,
            noChao: false,
            movendoHorizontal: false,
            direcao: 'd',
            contadorAnimacao: 0,
            frameAtual: 0,
            cooldownPulo: 0,
            coyoteAtivo: true,
            coyoteTimeSegundos: Math.max(0, Number(config.coyoteTimeSegundosBB ?? config.coyoteTimeSegundosPets ?? 0.06)),
            coyoteFramesRestantes: 0,
            jumpBufferAtivo: true,
            jumpBufferSegundos: Math.max(0, Number(config.jumpBufferSegundosBB ?? config.jumpBufferSegundosPets ?? 0.06)),
            jumpBufferFramesRestantes: 0,
            jumpBufferTeclaAnterior: false,
            cooldownTrocaCorpo: 0,
            ePressionadoAnterior: false,
            qPressionadoAnterior: false,
            emAnimacaoAbertura: false,
            sendoPuxadoPelaGarra: false,
            framesAnimacaoAbertura: 0,
            spriteAberturaAtual: '',
            corpoRoboAbertoElemento: null,
            garraControle: null,
            garraDirecao: 1,
            garraPontoInicial: null,
            spriteParado: spritePadrao,
            spriteAndando: config.spriteBBAndando || '../../assets/personagem/bb/bb-andando.png',
            spriteInteracao: config.spriteBBInteracao || '../../assets/personagem/bb/bb-interacao.png',
            interagindo: false,
            // Suporte a Inventário e Controle de Base
            inventario: [],
            coleteSlots: Array.from({ length: 6 }, () => null),
            cintoSlot: null,
            temColete: true,
            temCinto: true,
            estaAgachado: false
        };
        bb.id = meuId;

        // Inicializa um sistema de crafting dedicado ao BB
        bb.craftingSystem = window.criarSistemaCraftingJogador({
            controle: bb,
            config: config,
            elemento: img,
            salvarInventario: () => {}, // O inventário do BB é volátil (não persiste no save global)
            acaoAtiva: (acao) => {
                if (!window.controlandoBB) return false;
                const teclas = window.playerControle?.teclas || {};
                const binds = window.controlesConfig?.[acao] || [];
                return binds.some(k => teclas[k] || teclas[k.toLowerCase()] || teclas[k.toUpperCase()]);
            },
            consumirAcao: (acao) => {
                const teclas = window.playerControle?.teclas || {};
                const binds = window.controlesConfig?.[acao] || [];
                binds.forEach(k => {
                    teclas[k] = false;
                    teclas[k.toLowerCase()] = false;
                    teclas[k.toUpperCase()] = false;
                });
            }
        });

        window.bbEntidade = bb;


        requestAnimationFrame(() => cicloVidaBB(bb, meuId));
        return bb;
    };

    // Shim para manter compatibilidade com o sistema de ejeção do player
    window.inicializarBB = function (x, y, cfg) {
        return window.spawnEntidadePlayerBB(x, y, cfg);
    };

    function bbPodeFecharNoPlayer(bb, player) {
        // Apenas o BB controlado pode fechar no player
        if (!bb || !player || !window.controlandoBB || window.bbEntidade !== bb) {
            return false;
        }

        const hitboxBB = {
            x: bb.x + (bb.offsetX || 0),
            y: bb.y,
            largura: bb.largura || 9,
            altura: bb.altura
        };

        const hitboxPlayer = {
            x: player.x + (player.offsetX || 0),
            y: player.y,
            largura: player.largura,
            altura: player.altura
        };

        return window.detectarColisaoHitbox(hitboxBB, hitboxPlayer, 0, 0, 0);
    }

    function obterPetControlavelColidindo(bb) {
        if (!bb || typeof window.detectarColisaoHitbox !== 'function') {
            return null;
        }

        const hitboxBB = {
            x: bb.x + (bb.offsetX || 0),
            y: bb.y,
            largura: bb.largura,
            altura: bb.altura
        };

        const pets = [
            { entidade: window.caoEntidade, flag: 'controlandoCao' },
            { entidade: window.gatoEntidade, flag: 'controlandoGato' }
        ];

        for (const petInfo of pets) {
            const pet = petInfo.entidade;
            if (!pet) continue;

            const hitboxPet = {
                x: pet.x,
                y: pet.y,
                largura: pet.largura,
                altura: pet.altura
            };

            if (window.detectarColisaoHitbox(hitboxBB, hitboxPet, -15, -15, -15)) {
                return petInfo;
            }
        }

        return null;
    }

    function obterInimigoPresoColidindo(bb) {
        if (!bb || !Array.isArray(window.inimigos) || typeof window.detectarColisaoHitbox !== 'function') {
            return null;
        }

        const hitboxBB = {
            x: bb.x + (bb.offsetX || 0),
            y: bb.y,
            largura: bb.largura,
            altura: bb.altura
        };

        const fenoId = window.GAME_CONSTANTS?.INIMIGO_FENO_ID ?? 5;
        for (const inimigo of window.inimigos) {
            if (!inimigo || inimigo.estaMorto || inimigo.estaMorrendo) continue;
            if (inimigo.tipo === fenoId) continue;
            if (!inimigo.presoPorPet) continue;

            const hitboxInimigo = {
                x: inimigo.x + (inimigo.offsetX || 0),
                y: inimigo.y,
                largura: inimigo.largura,
                altura: inimigo.altura
            };

            if (window.detectarColisaoHitbox(hitboxBB, hitboxInimigo, -12, -12, -12)) {
                return inimigo;
            }
        }

        return null;
    }

    function soltarInimigoDosPets(inimigo) {
        const petCao = window.caoEntidade;
        const petGato = window.gatoEntidade;

        if (petCao?.inimigoPreso === inimigo) {
            petCao.inimigoPreso = null;
        }

        if (petGato?.inimigoPreso === inimigo) {
            petGato.inimigoPreso = null;
        }
    }

    function obterSpritesAberturaBB(config) {
        return [
            config.spriteAberturaPlayer1 || '../../assets/personagem/personagem_parado2.png',
            config.spriteAberturaPlayer2 || '../../assets/personagem/per_abrindo1.png',
            config.spriteAberturaPlayer3 || '../../assets/personagem/per_abrindo2.png',
            config.spriteAberturaPlayerFinal || '../../assets/personagem/per_aberto.png'
        ];
    }

    function atualizarPosicaoCorpoAbertoBB(bb) {
        if (!bb?.corpoRoboAbertoElemento) return;
        const xBase = bb.garraPontoInicial ? bb.garraPontoInicial.x : bb.x;
        const yBase = bb.garraPontoInicial ? bb.garraPontoInicial.y : bb.y;
        bb.corpoRoboAbertoElemento.style.left = xBase + 'px';
        bb.corpoRoboAbertoElemento.style.bottom = yBase + 'px';
    }

    // Variáveis globais para chute
    let chuteAtivo = false;
    let direcaoChute = null;
    let tempoChute = 0;

    function finalizarResgateBB(bb, config) {
        if (!bb) return false;

        const player = window.playerControle;
        const direcaoKnock = player && typeof player.x === 'number'
            ? (bb.x < player.x ? -1 : 1)
            : (bb.garraDirecao || 1);

        bb.sendoPuxadoPelaGarra = false;
        bb.emAnimacaoAbertura = false;
        bb.framesAnimacaoAbertura = 0;
        bb.spriteAberturaAtual = '';
        bb.stunned = false;
        bb.stunTimer = 0;
        bb.garraControle = null;
        bb.garraPontoInicial = null;

        if (bb.elemento) {
            bb.elemento.style.display = 'block';
        }

        if (typeof window.aplicarKnockback === 'function') {
            const forca = typeof window.obterForcaKnockback === 'function'
                ? window.obterForcaKnockback(config, 'bbKick')
                : Number(config?.bbKickKnockbackForce ?? config?.knockbackInimigo ?? 150);
            window.aplicarKnockback(bb, forca, direcaoKnock, 15);
        }


        // Marca chute como ativo e guarda direção
        chuteAtivo = true;
        direcaoChute = bb.direcao;
        tempoChute = 18; // frames de duração do chute (ajuste se necessário)
        if (window.console) console.log('[BB] Chute iniciado. Direção:', direcaoChute);
        window.AudioManager?.playSFX('chute', 0.4);
        window.AudioManager?.playSFX('impacto', 0.6);

        if (typeof window.criarAnimacaoImpacto2Frames === 'function') {
            window.criarAnimacaoImpacto2Frames({
                x: bb.x + ((bb.largura || 32) / 2),
                y: bb.y + ((bb.altura || 32) / 2),
                largura: 40,
                altura: 40,
                offsetY: 6,
                opacidade: 1,
                frameDurationMs: 130
            });
        }

        return true;
    }

    function iniciarAnimacaoAberturaBB(bb, config, opcoes = {}) {
        if (!bb || bb.emAnimacaoAbertura || bb.sendoPuxadoPelaGarra || bb.estaMorto || bb.estaMorrendo) {
            return false;
        }

        const sprites = obterSpritesAberturaBB(config).filter((sprite) => typeof sprite === 'string' && sprite.trim() !== '');
        if (sprites.length === 0) return false;

        bb.emAnimacaoAbertura = true;
        bb.sendoPuxadoPelaGarra = false;
        bb.framesAnimacaoAbertura = 0;
        bb.spriteAberturaAtual = sprites[0];
        bb.stunned = true;
        bb.stunTimer = Math.max(180, Number(config.bbStunResgateFrames ?? 9999));
        bb.garraControle = opcoes.controle || null;
        bb.garraDirecao = Number.isFinite(opcoes.direcao) && opcoes.direcao !== 0 ? opcoes.direcao : (bb.direcao === 'e' ? -1 : 1);
        bb.garraPontoInicial = {
            x: Number(opcoes.x ?? bb.x ?? 0),
            y: Number(opcoes.y ?? bb.y ?? 0)
        };

        if (bb.elemento) {
            bb.elemento.style.display = 'none';
        }

        if (bb.corpoRoboAbertoElemento) {
            bb.corpoRoboAbertoElemento.remove();
        }

        const corpoAberto = document.createElement('img');
        corpoAberto.className = 'bb-corpo-aberto-resgate';
        corpoAberto.style.position = 'absolute';
        corpoAberto.style.width = '32px';
        corpoAberto.style.height = '32px';
        corpoAberto.style.imageRendering = 'pixelated';
        corpoAberto.style.pointerEvents = 'none';
        corpoAberto.style.zIndex = '99';
        corpoAberto.style.left = bb.garraPontoInicial.x + 'px';
        corpoAberto.style.bottom = bb.garraPontoInicial.y + 'px';
        corpoAberto.src = sprites[0];

        const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
        if (palco) {
            if (window.LAYERS?.INIMIGOS && typeof window.adicionarAoLayer === 'function') {
                window.adicionarAoLayer(corpoAberto, window.LAYERS.INIMIGOS);
            } else {
                palco.appendChild(corpoAberto);
            }
        }

        bb.corpoRoboAbertoElemento = corpoAberto;
        window.AudioManager?.playSFX('engrenagem', 0.5);
        return true;
    }


    function atualizarAnimacaoAberturaBB(bb, config) {
        if (!bb?.emAnimacaoAbertura) return false;

        const sprites = obterSpritesAberturaBB(config).filter((sprite) => typeof sprite === 'string' && sprite.trim() !== '');
        if (sprites.length === 0) return false;

        const tempoFrame = Math.max(1, Number(config.tempoAberturaFrame ?? 20));
        const indiceFrame = Math.min(sprites.length - 1, Math.floor(bb.framesAnimacaoAbertura / tempoFrame));
        bb.spriteAberturaAtual = sprites[indiceFrame] || sprites[sprites.length - 1];

        if (bb.corpoRoboAbertoElemento) {
            bb.corpoRoboAbertoElemento.src = bb.spriteAberturaAtual;
            atualizarPosicaoCorpoAbertoBB(bb);
        }

        bb.framesAnimacaoAbertura += 1;
        const totalFrames = tempoFrame * sprites.length;
        if (bb.framesAnimacaoAbertura >= totalFrames) {
            bb.emAnimacaoAbertura = false;
            bb.sendoPuxadoPelaGarra = true;
            bb.framesAnimacaoAbertura = 0;
            bb.spriteAberturaAtual = sprites[sprites.length - 1] || bb.spriteAberturaAtual;
            if (bb.elemento) {
                bb.elemento.style.display = 'block';
            }
            if (bb.corpoRoboAbertoElemento) {
                bb.corpoRoboAbertoElemento.src = bb.spriteAberturaAtual;
                atualizarPosicaoCorpoAbertoBB(bb);
            }
            window.AudioManager?.playSFX('engrenagem', 0.45);
            return false;
        }

        return true;
    }

    function atualizarPuxoBB(bb, config) {
        if (!bb?.sendoPuxadoPelaGarra) return false;

        const controle = bb.garraControle || window.playerControle;
        const player = window.playerControle;
        const direcao = bb.garraDirecao || 1;
        const garraDist = Math.max(0, Number(controle?.garraDist || 0));
        const alvoX = controle && typeof controle.x === 'number'
            ? Number(controle.x) + (garraDist * direcao)
            : Number(player?.x || bb.x || 0);
        const alvoY = Number(controle?.y ?? player?.y ?? bb.y ?? 0);

        const velocidadePuxo = Math.max(1, Number(config?.garraVelocidadePuxo ?? 3));
        const deltaX = alvoX - bb.x;
        const deltaY = alvoY - bb.y;
        const distancia = Math.hypot(deltaX, deltaY);

        if (distancia <= Math.max(4, Number(config?.garraPuxoDistanciaParada ?? 10))) {
            return finalizarResgateBB(bb, config);
        }

        const passo = velocidadePuxo / Math.max(1, Math.ceil(velocidadePuxo / 2));
        bb.x += (deltaX / Math.max(distancia, 0.0001)) * passo;
        bb.y += (deltaY / Math.max(distancia, 0.0001)) * passo;

        if (bb.elemento) {
            bb.elemento.style.left = bb.x + 'px';
            bb.elemento.style.bottom = bb.y + 'px';
        }

        if (bb.corpoRoboAbertoElemento) {
            atualizarPosicaoCorpoAbertoBB(bb);
        }

        bb.velocidadeY = 0;
        bb.movendoHorizontal = false;
        bb.noChao = false;
        bb.stunned = true;
        bb.stunTimer = Math.max(bb.stunTimer || 0, 9999);

        if (typeof window.detectarColisaoHitbox === 'function' && player) {
            const hitboxBB = {
                x: bb.x + (bb.offsetX || 0),
                y: bb.y,
                largura: bb.largura,
                altura: bb.altura
            };
            const hitboxPlayer = {
                x: player.x + (player.offsetX || 0),
                y: player.y,
                largura: player.largura,
                altura: player.altura
            };

            if (window.detectarColisaoHitbox(hitboxBB, hitboxPlayer, 0, 0, 0)) {
                return finalizarResgateBB(bb, config);
            }
        }

        return true;
    }


    function bbAbrirInimigoPreso(bb, inimigo, config, teclas) {
        if (!bb || !inimigo || inimigo.estaMorto || inimigo.estaMorrendo) {
            return false;
        }

        inimigo.stunned = true;
        inimigo.stunTimer = 9999;
        inimigo.presoPorPet = false;
        inimigo.presoPorPetTipo = null;
        soltarInimigoDosPets(inimigo);

        bb.movendoHorizontal = false;
        bb.contadorAnimacao = 0;
        bb.frameAtual = 0;

        const spriteFinalAbertura = config.spriteAberturaPlayerFinal || '../../assets/personagem/per_aberto.png';
        const sequenciaAbertura = [
            config.spriteAberturaPlayer1,
            config.spriteAberturaPlayer2,
            config.spriteAberturaPlayer3,
            spriteFinalAbertura
        ].filter((sprite) => typeof sprite === 'string' && sprite.trim() !== '');

        const frameAnimacao = Math.max(1, Number(config.tempoAberturaFrame ?? 20));
        const tempoEtapaMs = Math.max(40, Math.round((1000 / 60) * frameAnimacao));

        const xCorpoAberto = Number(inimigo.x || 0);
        const yCorpoAberto = Number(inimigo.y || 0);

        let indiceSprite = 0;
        const rodarAbertura = () => {
            if (!inimigo || inimigo.estaMorto || inimigo.estaMorrendo || !inimigo.elemento) {
                return;
            }

            const spriteAtual = sequenciaAbertura[Math.min(indiceSprite, sequenciaAbertura.length - 1)] || spriteFinalAbertura;
            inimigo.elemento.src = spriteAtual;

            if (indiceSprite < sequenciaAbertura.length - 1) {
                indiceSprite++;
                setTimeout(rodarAbertura, tempoEtapaMs);
                return;
            }
            if (typeof window.criarRoboAbertoInterativo === 'function') {
                window.criarRoboAbertoInterativo(xCorpoAberto, yCorpoAberto, {
                    origem: 'inimigo-aberto-bb',
                    imagemPath: spriteFinalAbertura
                });
            }
            window.AudioManager?.playSFX('engrenagem', 0.45);
        };

        rodarAbertura();
        window.AudioManager?.playSFX('engrenagem', 0.6);

        if (teclas) {
            teclas['e'] = false;
            teclas['E'] = false;
            teclas['KeyE'] = false;
        }

        return true;
    }

    function bbAssumirControleDoPet(bb, petInfo, teclas) {
        if (!bb || !petInfo || !petInfo.flag) return false;

        // Interrompe qualquer animação residual do BB antes de passar controle ao pet.
        bb.movendoHorizontal = false;
        bb.interagindo = false;
        bb.contadorAnimacao = 0;
        bb.frameAtual = 0;
        if (bb.elemento) {
            bb.elemento.src = bb.spriteParado;
        }

        window.controlandoBB = false;
        window.controlandoCao = false;
        window.controlandoGato = false;
        window[petInfo.flag] = true;
        window.retornoControlePetParaBB = true;
        window.cameraZoomFactor = 1.5;

        if (teclas) {
            teclas['q'] = false;
            teclas['Q'] = false;
            teclas['KeyQ'] = false;
        }

        window.AudioManager?.playSFX('engrenagem', 0.5);
        return true;
    }

    function obterRoboAbertoColidindo(bb) {
        if (!bb || typeof window.detectarColisaoHitbox !== 'function') {
            return null;
        }

        const hitboxBB = {
            x: bb.x + (bb.offsetX || 0),
            y: bb.y,
            largura: bb.largura,
            altura: bb.altura
        };

        if (typeof window.buscarRoboAbertoPorColisao === 'function') {
            return window.buscarRoboAbertoPorColisao(hitboxBB);
        }

        const roboAberto = window.roboAbertoData;
        if (!roboAberto || !roboAberto.ativo) return null;
        return window.detectarColisaoHitbox(hitboxBB, roboAberto, 0, 0, 0) ? roboAberto : null;
    }

    function manterCascoOriginalNoLocal(x, y) {
        const posX = Number(x || 0);
        const posY = Number(y || 0);

        if (typeof window.criarRoboAbertoInterativo === 'function') {
            window.criarRoboAbertoInterativo(posX, posY, {
                origem: 'residual'
            });
            return;
        }

        const layerUI = window.LAYERS?.UI;
        const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
        if (!palco) return;

        const casco = document.createElement('img');
        casco.src = '../../assets/personagem/per_aberto.png';
        casco.className = 'robo-aberto-residual';
        casco.style.position = 'absolute';
        casco.style.left = posX + 'px';
        casco.style.bottom = posY + 'px';
        casco.style.width = '32px';
        casco.style.height = '32px';
        casco.style.imageRendering = 'pixelated';
        casco.style.pointerEvents = 'none';

        if (layerUI && typeof window.adicionarAoLayer === 'function') {
            window.adicionarAoLayer(casco, layerUI);
        } else {
            palco.appendChild(casco);
        }
    }

    function bbAssumirCorpoDoRobo(player, roboAberto) {
        if (!player || !roboAberto || !roboAberto.ativo) {
            return false;
        }

        const xOriginal = Number(player.x || 0);
        const yOriginal = Number(player.y || 0);
        const novoX = Number(roboAberto.spawnX || 0);
        const novoY = Number(roboAberto.spawnY || 0);

        const mudouDePosicao = xOriginal !== novoX || yOriginal !== novoY;
        if (mudouDePosicao && window.sistemaAbertura?.isAberto?.()) {
            manterCascoOriginalNoLocal(xOriginal, yOriginal);
        }

        player.x = novoX;
        player.y = novoY;
        player.velocidadeX = 0;
        player.velocidadeY = 0;
        player.estaAgachado = false;

        if (window.bbEntidade) {
            window.bbEntidade.cooldownTrocaCorpo = 18;
        }

        if (typeof window.consumirRoboAbertoFase === 'function') {
            window.consumirRoboAbertoFase(roboAberto);
        }

        // Fecha usando o fluxo padrão para manter a animação normal.
        // O corpo usado é consumido; o casco residual fica no local original.
        if (window.sistemaAbertura?.isAberto?.()) {
            return !!window.sistemaAbertura.iniciarFechamento?.();
        }

        return false;
    }

    function cicloVidaBB(bb, idControle) {
        // BUG FIX: Garante que múltiplos NPCs mantenham seus loops ativos.
        // Se for o BB do player, permitimos apenas o loop do ID mais recente para evitar duplicidade na ejeção.
        const ehInstanciaPlayer = window.bbEntidade === bb;
        if (ehInstanciaPlayer && playerBBIdAtivo !== idControle) return;
        if (!bb || !bb.elemento || !bb.elemento.parentNode) return;

        const player = window.playerControle;

        if (!window.isPaused && bb && window.config) {
            const config = window.config;



            // Lógica de cancelamento do chute se apertar direção contrária
            if (chuteAtivo && direcaoChute !== null && tempoChute > 0) {
                const teclas = window.playerControle?.teclas || {};
                // Se olhando para direita e pressionar esquerda
                if (direcaoChute === 'd' && (teclas['a'] || teclas['A'] || teclas['ArrowLeft'])) {
                    chuteAtivo = false;
                    direcaoChute = null;
                    tempoChute = 0;
                    if (window.console) console.log('[BB] Chute cancelado: pressionou esquerda durante chute para direita');
                }
                // Se olhando para esquerda e pressionar direita
                else if (direcaoChute === 'e' && (teclas['d'] || teclas['D'] || teclas['ArrowRight'])) {
                    chuteAtivo = false;
                    direcaoChute = null;
                    tempoChute = 0;
                    if (window.console) console.log('[BB] Chute cancelado: pressionou direita durante chute para esquerda');
                }
            }

            // Reduz o tempo do chute se ativo
            if (chuteAtivo && tempoChute > 0) {
                tempoChute--;
                if (tempoChute <= 0) {
                    chuteAtivo = false;
                    direcaoChute = null;
                    if (window.console) console.log('[BB] Chute finalizado por tempo.');
                }
            }

            if (bb.emAnimacaoAbertura) {
                atualizarAnimacaoAberturaBB(bb, config);
            }

            if (bb.sendoPuxadoPelaGarra) {
                atualizarPuxoBB(bb, config);
            }

            if (bb.emAnimacaoAbertura || bb.sendoPuxadoPelaGarra) {
                if (bb.elemento) {
                    bb.elemento.style.left = bb.x + 'px';
                    bb.elemento.style.bottom = bb.y + 'px';
                    bb.elemento.style.display = bb.emAnimacaoAbertura ? 'none' : 'block';
                }

                requestAnimationFrame(() => cicloVidaBB(bb, idControle));
                return;
            }

            // Configurações de física (iguais ao cao)
            let forcaPuloBase = (config.gravidadeUniversal 
                ? (config.forcaGravidade?.forcaPulo ?? 10) 
                : (config.forcaPuloCao ?? 10)) - 2;

            let gravidade = config.gravidadeUniversal 
                ? (config.forcaGravidade?.gravidade ?? 0.5) 
                : (config.gravidadeCao ?? 0.5);
                
            let velocidadeBase = (config.velocidadeCao || 3) - 2;
            
            // Garante velocidade de NPC se não estiver sendo controlado
            const ehInstanciaAtiva = window.bbEntidade === bb;
            let teclasParaFisica = {};

            if (bb.cooldownPulo > 0) bb.cooldownPulo--;
            if (bb.cooldownTrocaCorpo > 0) bb.cooldownTrocaCorpo--;
            if (Number(bb.cooldownInteracaoRoboAposMusgo || 0) > 0) bb.cooldownInteracaoRoboAposMusgo--;
            if (Number(bb.cooldownInteracaoAlavanca || 0) > 0) bb.cooldownInteracaoAlavanca--;

            if (window.controlandoBB && ehInstanciaAtiva) {
                const teclas = window.playerControle?.teclas || {};
                const ePressionadoFrame = !!(teclas['e'] || teclas['E'] || teclas['KeyE']);
                const qPressionadoFrame = !!(teclas['q'] || teclas['Q'] || teclas['KeyQ']);

                bb.movendoHorizontal = false;
                let deslocX = 0;

                // Movimento horizontal
                if (teclas['a'] || teclas['A'] || teclas['ArrowLeft']) {
                    deslocX = -velocidadeBase;
                    bb.direcao = 'e';
                    bb.movendoHorizontal = true;
                } else if (teclas['d'] || teclas['D'] || teclas['ArrowRight']) {
                    deslocX = velocidadeBase;
                    bb.direcao = 'd';
                    bb.movendoHorizontal = true;
                }

                // Lógica de Agachar (necessária para posicionar ou evoluir a base)
                const baixoBinds = window.controlesConfig?.['baixo'] || ['s', 'S', 'ArrowDown'];
                bb.estaAgachado = baixoBinds.some(k => teclas[k]);

                // Processa interações de Crafting/Base (Menu, Evoluir ou Recolher)
                if (bb.craftingSystem) {
                    bb.craftingSystem.processarInteracaoCraft();
                }

                if (deslocX !== 0) {
                    window.aplicarDeslocamentoHorizontalComColisaoPadrao(bb, deslocX, window.plataformas, {
                        maxPasso: 1,
                        cancelarKnockbackAoColidir: true
                    });
                    
                    // Colisão com vidro da cápsula
                    if (typeof window.verificarColisaoComVidroCapsula === 'function') {
                        const hitboxBB = {
                            x: bb.x + (bb.offsetX || 0),
                            y: bb.y,
                            largura: bb.largura,
                            altura: bb.altura
                        };
                        const vidroColidido = window.verificarColisaoComVidroCapsula(hitboxBB);
                        if (vidroColidido) {
                            if (deslocX > 0) {
                                bb.x = vidroColidido.x - (bb.largura + bb.offsetX);
                            } else {
                                bb.x = (vidroColidido.x + vidroColidido.largura) - bb.offsetX;
                            }
                        }
                    }
                }

                // Pulo
                teclasParaFisica[' '] = !!teclas[' '];

                // Controle de pet (Q)
                const qPressionado = qPressionadoFrame;
                if (qPressionado && !bb.qPressionadoAnterior) {
                    const petControlavel = obterPetControlavelColidindo(bb);
                    if (petControlavel) {
                        bbAssumirControleDoPet(bb, petControlavel, teclas);
                    } else {
                        // sem efeito
                    }
                }

                // Interação E
                const ePressionado = ePressionadoFrame;
                if (ePressionado && !bb.ePressionadoAnterior) {
                    bb.interagindo = true;
                    setTimeout(() => { bb.interagindo = false; }, 300);
                    let interagiuComMusgo = false;
                    let interagiuComAlavanca = false;
                    let interagiuComRoboDesativado = false;
                    let interagiuComInimigoPreso = false;
                    let interagiuComRoboAberto = false;

                    interagiuComMusgo = !!window.interagirComMusgoAlvo?.(bb, teclas);

                    if (!interagiuComMusgo && Number(bb.cooldownInteracaoAlavanca || 0) <= 0) {
                        interagiuComAlavanca = !!window.interagirComAlavanca?.(bb, teclas, { exigeAgachado: false });
                    }

                    if (!interagiuComMusgo && !interagiuComAlavanca && Number(bb.cooldownInteracaoRoboAposMusgo || 0) <= 0) {
                        interagiuComRoboDesativado = !!window.interagirComRoboDesativado?.(bb, teclas);
                    }

                    if (!interagiuComMusgo && !interagiuComAlavanca && !interagiuComRoboDesativado) {
                        const inimigoPreso = obterInimigoPresoColidindo(bb);
                        if (inimigoPreso) {
                            const abriuInimigo = bbAbrirInimigoPreso(bb, inimigoPreso, config, teclas);
                            if (abriuInimigo) {
                                interagiuComInimigoPreso = true;

                            }
                        }
                    }

                    if (!interagiuComAlavanca && !interagiuComRoboDesativado && !interagiuComInimigoPreso) {
                    const roboColidindo = (bb.cooldownTrocaCorpo > 0 || Number(bb.cooldownInteracaoRoboAposMusgo || 0) > 0)
                        ? null
                        : obterRoboAbertoColidindo(bb);

                    if (roboColidindo) {
                        const assumiuCorpo = bbAssumirCorpoDoRobo(player, roboColidindo);
                        if (assumiuCorpo) {
                            interagiuComRoboAberto = true;

                            teclas['e'] = false;
                            teclas['E'] = false;
                            teclas['KeyE'] = false;
                        }
                    }
                    }

                    if (!interagiuComMusgo && !interagiuComAlavanca && !interagiuComRoboDesativado && !interagiuComInimigoPreso && !interagiuComRoboAberto && window.sistemaAbertura?.isAberto?.() && bbPodeFecharNoPlayer(bb, player)) {
                        const iniciouFechamento = window.sistemaAbertura.iniciarFechamento?.();
                        if (iniciouFechamento) {

                            teclas['e'] = false;
                            teclas['E'] = false;
                            teclas['KeyE'] = false;
                        }
                    }

                    if (!interagiuComMusgo && !interagiuComAlavanca && !interagiuComRoboDesativado && !interagiuComInimigoPreso && !interagiuComRoboAberto) {
                        // sem alvo válido
                    }
                }
                bb.qPressionadoAnterior = qPressionado;
                bb.ePressionadoAnterior = ePressionado;
            }

            // No modo Runner, o BB sempre anima andando se estiver no chão
            if (window.faseAtualData?.modoRunner && bb.noChao) {
                bb.movendoHorizontal = true;
            }

            // Gravidade e física vertical
            if (typeof window.aplicarFisica === 'function') {
                window.aplicarFisica(bb, teclasParaFisica, forcaPuloBase, gravidade, 30);
            }

            if (Number(bb.framesKnockbackRestante || 0) > 0 && Number(bb.velocidadeKnockback || 0) !== 0) {
                bb.movendoHorizontal = true;
                bb.direcao = bb.velocidadeKnockback < 0 ? 'e' : 'd';

                if (typeof window.aplicarDeslocamentoHorizontalComColisaoPadrao === 'function') {
                    window.aplicarDeslocamentoHorizontalComColisaoPadrao(bb, bb.velocidadeKnockback, window.plataformas, {
                        maxPasso: 1,
                        cancelarKnockbackAoColidir: true
                    });
                } else {
                    bb.x += bb.velocidadeKnockback;
                }

                bb.framesKnockbackRestante = Math.max(0, Number(bb.framesKnockbackRestante || 0) - 1);
                if (bb.framesKnockbackRestante <= 0) {
                    bb.velocidadeKnockback = 0;
                }
            }

            // Colisão vertical
            bb.noChao = false;
            if (typeof window.verificarColisaoComTiles === 'function') {
                if (bb.velocidadeY <= 0) {
                    const hitSolo = window.verificarColisaoComTiles(
                        bb.x + bb.offsetX,
                        bb.y,
                        bb.largura,
                        6,
                        window.plataformas
                    );
                    if (hitSolo) {
                        bb.noChao = true;
                        bb.y = window.aplicarSnapColisaoPadrao(bb.y, 0, bb.altura, hitSolo, 'cima');
                        bb.velocidadeY = 0;
                    }
                } else if (bb.velocidadeY > 0) {
                    const hitTeto = window.verificarColisaoComTiles(
                        bb.x + bb.offsetX,
                        bb.y + (bb.altura - 6),
                        bb.largura,
                        6,
                        window.plataformas
                    );
                    // Se for colisão com o teto de um robô aberto e o BB estiver subindo, ignora.
                    if (hitTeto && hitTeto.tipo === 'meio' && hitTeto.direcao === 'superior') {
                        // Ignora esta colisão, não aplica snap nem zera velocidade
                    }
                    // Se houver colisão com o teto (e não for o robô aberto subindo)
                    else if (hitTeto) {
                        const permiteCorrecaoQuina = hitTeto.tipo !== 'estaca';
                        if (permiteCorrecaoQuina && typeof window.tentarCorrecaoQuinaSubida === 'function') {
                            const corrigiuQuina = window.tentarCorrecaoQuinaSubida(bb, window.plataformas, {
                                maxDeslocamento: Math.max(0, Number(config.cornerCorrectionPxBB ?? config.cornerCorrectionPxPets ?? 4)),
                                passo: 1,
                                probeYOffset: bb.altura - 6,
                                probeAltura: 6
                            });
                            if (!corrigiuQuina) {
                                bb.y = window.aplicarSnapColisaoPadrao(bb.y, 0, bb.altura, hitTeto, 'baixo');
                                bb.velocidadeY = 0;
                            }
                        } else {
                            bb.y = window.aplicarSnapColisaoPadrao(bb.y, 0, bb.altura, hitTeto, 'baixo');
                            bb.velocidadeY = 0;
                        }
                    }
                }
            }

            if (typeof window.atualizarParaquedasBB === 'function') {
                window.atualizarParaquedasBB(bb, config);
            }
        }

        // Sincronização visual
        if (bb.interagindo) {
            bb.elemento.src = bb.spriteInteracao;
        } else {
            const teclas = window.playerControle?.teclas || {};
            const inputHorizontalAtivo =
                (window.controlandoBB && window.bbEntidade === bb) &&
                (teclas['a'] || teclas['A'] || teclas['ArrowLeft'] || teclas['d'] || teclas['D'] || teclas['ArrowRight']);

            if (bb.movendoHorizontal && (bb.noChao || inputHorizontalAtivo || !window.controlandoBB)) {
                bb.contadorAnimacao++;
                if (bb.contadorAnimacao >= 10) {
                    bb.frameAtual = bb.frameAtual === 0 ? 1 : 0;
                    bb.elemento.src = bb.frameAtual === 0 ? bb.spriteParado : bb.spriteAndando;
                    bb.contadorAnimacao = 0;
                }
            } else {
                // Parado no chão (ou sem input horizontal)
                bb.elemento.src = bb.spriteParado;
                bb.contadorAnimacao = 0;
                bb.frameAtual = 0;
            }
        }

        bb.elemento.style.left = bb.x + 'px';
        bb.elemento.style.bottom = bb.y + 'px';

        // // Aplicar rotação de pulo (igual ao cao)
        // Flip seco, sem animação de inclinação
        bb.elemento.style.transform = bb.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';



        requestAnimationFrame(() => cicloVidaBB(bb, idControle));
    }

    /**
     * Função de console para ativar o modo de controle do BB
     * Uso: window.controlarBB()
     */
    window.controlarBB = function () {
        if (!window.bbEntidade) {
            const player = window.playerControle;
            if (!player) {
                console.error('BB não inicializado e player não encontrado');
                return;
            }
            // Inicializa BB na posição do player
            window.inicializarBB(player.x, player.y, window.config);
        }
        
        // Garante que a colisão está correta (fix para cache)
        if (window.bbEntidade) {
            window.bbEntidade.largura = 9;
            window.bbEntidade.offsetX = 11;
        }
        
        window.controlandoBB = true;
        // Mesmo comportamento dos pets: ao assumir controle, aplica ampliacao da camera.
        window.cameraZoomFactor = 1.5;
    };

    /**
     * Função para voltar ao controle do player
     */
    window.controlarPlayer = function () {
        if (window.playerControle?.bloqueadoPorResgateBB) {
            console.log('Player indisponível após resgate. Continue com o BB.');
            return;
        }

        window.controlandoBB = false;
        // Reset camera zoom when returning control to player
        window.cameraZoomFactor = 1;
    };

    /**
     * Remove a entidade BB ativa e encerra o modo de controle
     */
    window.despawnBB = function () {
        window.controlandoBB = false;
        
        // Limpa BB do player
        const bb = window.bbEntidade;
        if (bb) {
            if (bb.corpoRoboAbertoElemento) bb.corpoRoboAbertoElemento.remove();
            if (bb.elemento) bb.elemento.remove();
            
            bb.emAnimacaoAbertura = false;
            bb.sendoPuxadoPelaGarra = false;
            playerBBIdAtivo++;
            window.bbEntidade = null;
        }
    };

    /**
     * Posiciona o BB no palco se não estiver
     */
    window.garantirBBNoEstado = function (x, y) {
        if (!window.bbEntidade || !window.bbEntidade.elemento) {
            window.inicializarBB(x || 100, y || 100, window.config);
        }
    };

})();
