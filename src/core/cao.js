(function () {
    const CAO_STORAGE_KEY = 'plataformaCaoResgatado';
    const GATO_STORAGE_KEY = 'plataformaGatoResgatado';

    window.isCaoResgatado = localStorage.getItem(CAO_STORAGE_KEY) === 'true';
    window.caoNaBase = localStorage.getItem('plataformaCaoNaBase') === 'true';
    window.isGatoResgatado = localStorage.getItem(GATO_STORAGE_KEY) === 'true';
    window.gatoNaBase = localStorage.getItem('plataformaGatoNaBase') === 'true';

    // Estado para múltiplos pets
    window.idPetsAtivos = { cao: 0, gato: 0 };
    let config = {}; // Variável para armazenar as configurações do jogo

    /**
     * Inicializa ou reposiciona um Pet NPC próximo ao jogador.
     */
    window.inicializarPetNPC = function (tipo, x, y, gameConfig) {
        const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
        if (!palco) return;

        window.idPetsAtivos[tipo]++;
        const meuId = window.idPetsAtivos[tipo];

        config = gameConfig || window.config || {}; // Armazena as configurações

        // Remove instância anterior do mesmo tipo
        const idElemento = `pet-${tipo}`;
        const antigo = document.getElementById(idElemento);
        if (antigo) antigo.remove();

        const img = document.createElement('img');
        const spriteBase = tipo === 'cao' 
            ? (config.spriteCao || '../../assets/personagem/cao_parado.png')
            : (config.spriteGato || '../../assets/personagem/gato_parado.png');
            
        img.src = spriteBase;
        img.id = idElemento;
        img.className = `npc-pet npc-${tipo}`;
        // Z-index 100 para garantir que ele fique sempre visível sobre o cenário
        img.style.cssText = `position: absolute; width: 32px; height: 32px; image-rendering: pixelated; z-index: 100; pointer-events: none; transform-origin: center center; transition: transform 0.05s linear;`;
        img.style.left = x + 'px';
        img.style.bottom = y + 'px';
        
        if (window.LAYERS && window.LAYERS.INIMIGOS) {
            window.adicionarAoLayer(img, window.LAYERS.INIMIGOS);
        } else {
            palco.appendChild(img);
        }

        const pet = {
            elemento: img,
            tipo: tipo,
            x: x,
            y: y,
            largura: 20,
            altura: 15,
            offsetX: 5,
            velocidadeY: 0,
            noChao: false,
            movendoHorizontal: false,
            direcao: 'd',
            contadorAnimacao: 0,
            frameAtual: 0,
            cooldownPulo: 0,
            mordendo: false,
            kPressionadoAnterior: false,
            spriteParado: spriteBase,
            spriteAndando: tipo === 'cao' 
                ? (config.spriteCaoAndando || '../../assets/personagem/cao_mov.png')
                : (config.spriteGatoAndando || '../../assets/personagem/gato_andando.png'),
            estaSeguindo: true,    // Novo: controla se o NPC deve seguir o player
            ultimoToqueQ: 0,       // Restaurado para Double Tap
            qPressionadoAnterior: false, // Restaurado para Double Tap
            itemArrastado: null,   // NOVO: Referência ao item segurado (para gato)
            inimigoPreso: null,    // NOVO: Referência ao inimigo segurado
            latidoPressionadoAnterior: false // NOVO: Controle discreto para detecção de clique do latido
        };

        // REGISTRO GLOBAL
        if (tipo === 'cao') window.caoEntidade = pet;
        else window.gatoEntidade = pet;
        
        requestAnimationFrame(() => cicloVidaPet(pet, meuId));
    };

    // Aliases para compatibilidade
    window.inicializarCaoNPC = (x, y, cfg) => window.inicializarPetNPC('cao', x, y, cfg);
    window.iniciarCao = (pos, cfg) => window.inicializarPetNPC('cao', pos.x, pos.y, cfg);
    window.iniciarGato = (pos, cfg) => window.inicializarPetNPC('gato', pos.x, pos.y, cfg);

    function cicloVidaPet(pet, idControle) {
        // Se o pet foi reinicializado, este loop antigo deve morrer
        if (window.idPetsAtivos[pet.tipo] !== idControle) {
            return;
        }

        const player = window.playerControle;
        const alvoSeguimento = (window.controlandoBB && window.bbEntidade) ? window.bbEntidade : player;
        
        // 1. Processamento de Lógica e Física (Apenas se o jogo NÃO estiver pausado)
        if (!window.isPaused && pet && window.config) {
            
            // Refresca os valores baseados no toggle universal a cada frame
            let forcaPuloBase = window.config.gravidadeUniversal ? (window.config.forcaGravidade?.forcaPulo ?? 10) : (window.config.forcaPuloCao ?? 10);
            let gravidade = window.config.gravidadeUniversal ? (window.config.forcaGravidade?.gravidade ?? 0.5) : (window.config.gravidadeCao ?? 0.5);
            let velocidadeBase = pet.tipo === 'cao' ? (config.velocidadeCao || 3) : (config.velocidadeGato || 3);

            // Ajustes Hardcoded para o Gato
            if (pet.tipo === 'gato') {
                forcaPuloBase += 1;
                gravidade -= 0.1;
                velocidadeBase += 1;
            }

            const multiplicadorCarga = pet.tipo === 'cao' ? (pet.inimigoPreso ? 0.3 : 1) : (pet.itemArrastado ? 0.5 : 1);
            const forcaPulo = forcaPuloBase * multiplicadorCarga;
            const velocidadeFinal = velocidadeBase * multiplicadorCarga;
            let teclasParaFisica = {}; // Centraliza intenção de pulo

            // Decrementa o tempo de espera do pulo a cada frame
            if (pet.cooldownPulo > 0) {
                pet.cooldownPulo--;
            }

            const sendoControlado = (pet.tipo === 'cao' && window.controlandoCao) ||
                                    (pet.tipo === 'gato' && window.controlandoGato);

            if (sendoControlado) {
                const teclas = window.playerControle?.teclas || {};

                if (typeof window.atualizarCamera === 'function') {
                    window.cameraZoomFactor = 1.5;
                    // Ajusta a câmera para centralizar o pet com um leve deslocamento à esquerda (configurável).
                    const ajusteEsquerdaPet = Number(config.cameraAjusteEsquerdaPetBB ?? 32);
                    const centroPetX = Number(pet.x || 0) + Number(pet.offsetX || 0) + (Number(pet.largura || 20) / 2) + ajusteEsquerdaPet;
                    const centroPetY = Number(pet.y || 0) + (Number(pet.altura || 20) / 2);
                    window.atualizarCamera(centroPetX, centroPetY, window.mundoLargura, window.mundoAltura);
                }

                pet.movendoHorizontal = false;
                let deslocX = 0;
                if (teclas['a'] || teclas['A'] || teclas['ArrowLeft']) {
                    deslocX = -velocidadeFinal;
                    pet.direcao = 'e';
                    pet.movendoHorizontal = true;
                } else if (teclas['d'] || teclas['D'] || teclas['ArrowRight']) {
                    deslocX = velocidadeFinal;
                    pet.direcao = 'd';
                    pet.movendoHorizontal = true;
                }
                if (deslocX !== 0) {
                    window.aplicarDeslocamentoHorizontalComColisaoPadrao(pet, deslocX, window.plataformas, {
                        maxPasso: 1,
                        cancelarKnockbackAoColidir: true
                    });
                }
                // Mapeia teclas de pulo para o sistema de física
                // Ajuste: Removido o mapeamento de 'w' e 'ArrowUp' para que apenas o Espaço execute o pulo.
                teclasParaFisica[' '] = !!teclas[' '];
                
                // Lógica de mordida: Enquanto 'k', 'v' ou 'x' estiverem pressionados
                const kPressionado = teclas['k'] || teclas['K'] || teclas['KeyK'];
                const vPressionado = teclas['v'] || teclas['V'] || teclas['KeyV'];
                const xPressionado = teclas['x'] || teclas['X'] || teclas['KeyX'];
                const latidoAtivo = !!(kPressionado || vPressionado || xPressionado);

                // --- LÓGICA DE HABILIDADE ATIVA (Refatorada para PetAbilities) ---
                if (latidoAtivo && !pet.latidoPressionadoAnterior) {
                    if (window.PetAbilities) {
                        window.PetAbilities.executarHabilidadeAtiva(pet, config);
                    } else {
                        console.error(`[cao.js] ERRO CRÍTICO: window.PetAbilities não encontrado! ` +
                                      `Verifique se 'src/core/pet-habilidades.js' está incluído no seu HTML ANTES do 'src/core/cao.js'.`);
                    }
                }
                pet.latidoPressionadoAnterior = latidoAtivo;
                const apertandoChute = latidoAtivo || !!(
                    (window.teclasPressionadas && (window.teclasPressionadas['k'] || window.teclasPressionadas['K'])) ||
                    (window.playerControle?.acoesDiscretas?.chute)
                );
                pet.mordendo = apertandoChute || !!pet.inimigoPreso || !!pet.itemArrastado;
                // --- LÓGICA DE RETORNO (Double Tap Q) ---
                const apertouQ = !!(teclas['q'] || teclas['Q'] || teclas['KeyQ']);
                if (apertouQ && !pet.qPressionadoAnterior) {
                    const agora = Date.now();
                    if (agora - (pet.ultimoToqueQ || 0) < 300) {
                        if (pet.tipo === 'cao') window.controlandoCao = false;
                        else window.controlandoGato = false;

                        if (window.retornoControlePetParaBB && window.bbEntidade) {
                            window.controlandoBB = true;
                            window.retornoControlePetParaBB = false;
                            window.cameraZoomFactor = 1.5;
                        } else {
                            window.controlandoBB = false;
                            if (window.cameraZoomFactor) window.cameraZoomFactor = 1;
                        }

                        pet.estaSeguindo = false; // Fica parado ao voltar pro player até que o player o toque
                        
                        // CONSUMIR ENTRADA: Limpa o estado do Q para evitar que o movimento.js
                        // detecte a tecla e retome o controle do cão imediatamente.
                        teclas['q'] = false;
                        teclas['Q'] = false;
                        if (teclas['KeyQ']) teclas['KeyQ'] = false;

                        window.AudioManager?.playSFX('engrenagem', 0.5);
                    }
                    pet.ultimoToqueQ = agora;
                }
                pet.qPressionadoAnterior = apertouQ;
            } else {
            pet.mordendo = !!pet.inimigoPreso || !!pet.itemArrastado; // Mantém o visual de segurando mesmo em modo NPC

            // Re-ativa o seguimento se o alvo atual encostar (player normal ou BB em modo resgate)
            const colidindoComPlayer = typeof window.detectarColisaoHitbox === 'function' && 
                                      window.detectarColisaoHitbox(pet, alvoSeguimento, 0, 0, 0);
            if (colidindoComPlayer) pet.estaSeguindo = true;

            const deltaX = alvoSeguimento ? (alvoSeguimento.x - pet.x) : 0;
            const distSeguir = (pet.tipo === 'cao' ? config.distanciaMinimaCaoSeguir : config.distanciaMinimaGatoSeguir) || 45;
            pet.movendoHorizontal = false;

            // Inteligência de Seguimento e Movimento Horizontal com Colisão
            if (pet.estaSeguindo && alvoSeguimento && !alvoSeguimento.estaMorrendo && Math.abs(deltaX) > distSeguir) {
                const direcaoX = Math.sign(deltaX);
                const deslocX = direcaoX * velocidadeFinal;
                
                // Usa o sistema global de movimento para evitar atravessar paredes
                window.aplicarDeslocamentoHorizontalComColisaoPadrao(pet, deslocX, window.plataformas, {
                    maxPasso: 1,
                    cancelarKnockbackAoColidir: true
                });

                pet.direcao = direcaoX > 0 ? 'd' : 'e';
                pet.movendoHorizontal = true;

                // Salto de Obstrução (Se bater em algo e estiver no chão, tenta pular)
                const margemCheck = direcaoX > 0 ? 25 : -5;
                const bloqueioFrente = window.verificarColisaoComTiles(pet.x + margemCheck, pet.y + 5, 5, 5, window.plataformas);
                if (bloqueioFrente && pet.noChao && pet.cooldownPulo === 0) {
                    pet.velocidadeY = forcaPulo;
                    pet.cooldownPulo = 45; // Aumentado para evitar pulos repetitivos (kikando)
                }
            }

            // Salta se o jogador estiver acima (em plataformas altas)
            const alcancePuloY = config.caoAlcancePuloY || 32;
            if (pet.estaSeguindo && alvoSeguimento && pet.noChao && pet.cooldownPulo === 0 && (alvoSeguimento.y > pet.y + alcancePuloY) && Math.abs(deltaX) < (config.caoAlcancePuloX || 80)) {
                pet.velocidadeY = forcaPulo;
                pet.cooldownPulo = 45; // Sincronizado com o cooldown de obstrução
            }
            // Segurança: Teleporte se estiver muito longe ou caiu em buraco
            const distMax = config.distanciaMaxTeleporteCao || 600;
            if (!pet.inimigoPreso && (pet.y < -128 || (alvoSeguimento && Math.abs(alvoSeguimento.x - pet.x) > distMax))) {
                if (alvoSeguimento && alvoSeguimento.noChao) {
                    pet.x = alvoSeguimento.x - (alvoSeguimento.direcao === 'd' ? 32 : -32);
                    pet.y = alvoSeguimento.y;
                    pet.velocidadeY = 0;
                }
            }
            }

            // --- MECÂNICA DE TRAMPOLIM ---
            // 1. O Pet pula na cabeça do Jogador
             if (pet.velocidadeY < 0 && player && !player.estaMorrendo) {
                const hitboxPetBase = {
                    x: pet.x + pet.offsetX,
                    y: pet.y,
                    largura: pet.largura,
                    altura: 6
                };
                const hitboxPlayerTopo = {
                    x: player.x + (player.offsetX || 0),
                    y: player.y + (player.altura || 25) - 4, // Pega o topo do player
                    largura: player.largura || 20,
                    altura: 8
                };

                const colidiuTrampolim = typeof window.detectarColisaoHitbox === 'function' &&
                                         window.detectarColisaoHitbox(hitboxPetBase, hitboxPlayerTopo, 0, 0, 0);

                if (colidiuTrampolim) {
                    pet.velocidadeY = config.forcaPuloCaoTrampolim || 10; 
                    pet.noChao = false;
                    window.AudioManager?.playSFX('pulo', 0.6);
                }
            }

            // 2. O Jogador pula na cabeça do Pet (Trampolim inverso)
            if (player && player.velocidadeY < 0 && !player.estaMorrendo) {
                const hitboxPlayerBase = {
                    x: player.x + (player.offsetX || 0),
                    y: player.y,
                    largura: player.largura || 20,
                    altura: 6
                };
                const hitboxPetTopo = {
                    x: pet.x + pet.offsetX,
                    y: pet.y + pet.altura - 4,
                    largura: pet.largura,
                    altura: 8
                };

                if (typeof window.detectarColisaoHitbox === 'function' &&
                    window.detectarColisaoHitbox(hitboxPlayerBase, hitboxPetTopo, 0, 0, 0)) {
                    player.velocidadeY = (window.config?.forcaPuloPlayer || 10);
                    player.noChao = false;
                    window.AudioManager?.playSFX('pulo', 0.6);
                }
            }

            // Gravidade e Física Vertical (Sempre ativa)
            if (typeof window.aplicarFisica === 'function') { 
                window.aplicarFisica(pet, teclasParaFisica, forcaPulo, gravidade, 30);
            }

            // 4. Colisão Vertical REFINADA (Melhoria vinda do docs/cao.js)
            pet.noChao = false;
            if (typeof window.verificarColisaoComTiles === 'function') {
                if (pet.velocidadeY <= 0) {
                    const hitSolo = window.verificarColisaoComTiles(
                        pet.x + pet.offsetX, 
                        pet.y, 
                        pet.largura, 
                        6, // Checa apenas os 6px de baixo para maior estabilidade
                        window.plataformas
                    );
                    if (hitSolo) {
                        pet.noChao = true;
                        pet.y = window.aplicarSnapColisaoPadrao(pet.y, 0, pet.altura, hitSolo, 'cima');
                        pet.velocidadeY = 0;
                    }
                } else if (pet.velocidadeY > 0) {
                    const hitTeto = window.verificarColisaoComTiles(
                        pet.x + pet.offsetX, 
                        pet.y + (pet.altura - 6), // Ajustado para detectar o topo real da hitbox
                        pet.largura, 
                        6, // Checa os 6px de cima
                        window.plataformas
                    );
                    if (hitTeto) {
                        pet.y = window.aplicarSnapColisaoPadrao(pet.y, 0, pet.altura, hitTeto, 'baixo');
                        pet.velocidadeY = 0;
                    }
                }
            }

            // --- LÓGICA DE HABILIDADES PASSIVAS (Manter mordida/Loot) ---
            window.PetAbilities?.atualizarEfeitosHabilidades(pet, config);
        }

        // Sincronização Visual
        if (pet.mordendo) {
            pet.elemento.src = pet.tipo === 'cao' 
                ? (config.spriteCaoMordendo || '../../assets/personagem/cao_mordendo.png')
                : (config.spriteGatoMordendo || '../../assets/personagem/gato_mordendo.png');
        } else if (typeof window.atualizarAnimacao === 'function') {
            window.atualizarAnimacao(pet, pet.elemento, pet.spriteParado, pet.spriteAndando, null, null, null);
        }

        pet.elemento.style.left = pet.x + 'px';
        pet.elemento.style.bottom = pet.y + 'px';

        if (typeof window.aplicarRotacaoVerticalPet === 'function') {
            window.aplicarRotacaoVerticalPet(pet);
        } else {
            pet.elemento.style.transform = pet.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
        }

        requestAnimationFrame(() => cicloVidaPet(pet, idControle));
    }

    // ESCUTA GLOBAL DE EVENTOS (Deep Debug)
    document.addEventListener('keydown', (e) => {
    }, true); // O parâmetro 'true' (capture) garante que peguemos a tecla antes de outros scripts

    /**
     * Função para liberar um pet da gaiola.
     * Chamada pelo gaiola.js quando o player colide.
     */
    window.libertarPet = function (tipo, gaiolaObj) {
        const key = tipo === 'cao' ? CAO_STORAGE_KEY : GATO_STORAGE_KEY;
        if (localStorage.getItem(key) === 'true') return;

        if (tipo === 'cao') window.isCaoResgatado = true;
        else window.isGatoResgatado = true;
        
        localStorage.setItem(key, 'true');
        
        if (window.AudioManager) {
            window.AudioManager.playSFX('madeiraQuebrando', 0.7);
        }

        if (gaiolaObj) {
            if (gaiolaObj.elementoGaiola) gaiolaObj.elementoGaiola.remove();
            if (gaiolaObj.elementoPet) gaiolaObj.elementoPet.remove();
            
            if (tipo === 'cao') window.iniciarCao({ x: gaiolaObj.x, y: gaiolaObj.y }, config || window.config);
            else window.iniciarGato({ x: gaiolaObj.x, y: gaiolaObj.y }, config || window.config);
            
            if (typeof window.criarEfeitoParticulas === 'function') {
                window.criarEfeitoParticulas(gaiolaObj.x + 16, gaiolaObj.y + 16, 'madeira');
            }
        }
    };

    window.resetarResgateCao = function() {
        window.isCaoResgatado = false;
        localStorage.removeItem(CAO_STORAGE_KEY);
    };

})();