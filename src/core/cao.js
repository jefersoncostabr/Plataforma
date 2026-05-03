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
        img.style.cssText = `position: absolute; width: 32px; height: 32px; image-rendering: pixelated; z-index: 100; pointer-events: none;`;
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
                // --- LÓGICA DE AGARRAR/SOLTAR INIMIGO (Bark interaction) ---
                if (latidoAtivo && !pet.latidoPressionadoAnterior) {
                    if (pet.tipo === 'cao') {
                        if (pet.inimigoPreso) {
                            // Solta o inimigo
                            pet.inimigoPreso.stunTimer = 60; // Mantém stun por 1s ao soltar
                            pet.inimigoPreso = null;
                            window.AudioManager?.playSFX('pulo', 0.5);
                        } else {
                            // Tenta agarrar um inimigo próximo
                            if (window.inimigos && typeof window.detectarColisaoHitbox === 'function') {
                                for (let inimigo of window.inimigos) {
                                    if (inimigo.estaMorto || inimigo.estaMorrendo || inimigo.tipo === window.GAME_CONSTANTS.INIMIGO_FENO_ID) continue;
                                    
                                    // Detecção com margem negativa (-10px) para EXPANDIR a área e facilitar a captura
                                    if (window.detectarColisaoHitbox(pet, inimigo, -10, -10, -10)) {
                                        pet.inimigoPreso = inimigo;
                                        inimigo.stunned = true;
                                        inimigo.stunTimer = 100;
                                        window.AudioManager?.playSFX('madeiraQuebrando', 0.6);
                                        break;
                                    }
                                }
                            }
                        }
                    } else if (pet.tipo === 'gato') {
                        if (pet.itemArrastado) {
                            // Solta o item
                            pet.itemArrastado.grabbedByCat = false;
                            window.itensColetaveis.push(pet.itemArrastado); // Add back to global list
                            pet.itemArrastado = null;
                            window.AudioManager?.playSFX('pulo', 0.5); // Use a different sound if available
                        } else {
                            // Tenta agarrar um item próximo
                            if (window.itensColetaveis && typeof window.detectarColisaoHitbox === 'function') {
                                for (let i = window.itensColetaveis.length - 1; i >= 0; i--) {
                                    const item = window.itensColetaveis[i];
                                    // Assuming items have x, y, largura, altura properties
                                    const hitboxItem = { x: item.x, y: item.y, largura: 32, altura: 32 }; // Default item size
                                    if (window.detectarColisaoHitbox(pet, hitboxItem, -10, -10, -10)) {
                                        pet.itemArrastado = item;
                                        item.grabbedByCat = true;
                                        window.itensColetaveis.splice(i, 1); // Remove from global list
                                        window.AudioManager?.playSFX('madeiraQuebrando', 0.6); // Use a different sound if available
                                        break;
                                    }
                                }
                            }
                        }
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

                        if (pet.tipo === 'gato' && pet.itemArrastado) {
                            // Solta o item ao retornar o controle para o player
                            pet.itemArrastado.grabbedByCat = false;
                            window.itensColetaveis.push(pet.itemArrastado);
                            pet.itemArrastado = null;
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

            // Re-ativa o seguimento se o player encostar (Melhoria vinda do docs/cao.js)
            const colidindoComPlayer = typeof window.detectarColisaoHitbox === 'function' && 
                                      window.detectarColisaoHitbox(pet, player, 0, 0, 0);
            if (colidindoComPlayer) pet.estaSeguindo = true;

            const deltaX = player ? (player.x - pet.x) : 0;
            const distSeguir = (pet.tipo === 'cao' ? config.distanciaMinimaCaoSeguir : config.distanciaMinimaGatoSeguir) || 45;
            pet.movendoHorizontal = false;

            // Inteligência de Seguimento e Movimento Horizontal com Colisão
            if (pet.estaSeguindo && player && !player.estaMorrendo && Math.abs(deltaX) > distSeguir) {
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
            if (pet.estaSeguindo && player && pet.noChao && pet.cooldownPulo === 0 && (player.y > pet.y + alcancePuloY) && Math.abs(deltaX) < (config.caoAlcancePuloX || 80)) {
                pet.velocidadeY = forcaPulo;
                pet.cooldownPulo = 45; // Sincronizado com o cooldown de obstrução
            }
            // Segurança: Teleporte se estiver muito longe ou caiu em buraco
            const distMax = config.distanciaMaxTeleporteCao || 600;
            if (!pet.inimigoPreso && (pet.y < -128 || (player && Math.abs(player.x - pet.x) > distMax))) {
                if (player && player.noChao) {
                    pet.x = player.x - (player.direcao === 'd' ? 32 : -32);
                    pet.y = player.y;
                    pet.velocidadeY = 0;
                }
            }
            }

            // --- MECÂNICA DE TRAMPOLIM ---
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

            // --- LÓGICA DE MANTER INIMIGO PRESO (Executa em ambos os modos) ---
            if (pet.tipo === 'cao' && pet.inimigoPreso) { // Only dog can hold enemies
                const inimigo = pet.inimigoPreso;
                // Ajuste: Se o inimigo morrer ou receber knockback (atingido), o cão solta automaticamente
                if (inimigo.estaMorto || inimigo.estaMorrendo || (inimigo.framesKnockbackRestante > 0)) {
                    if (inimigo.framesKnockbackRestante > 0) {
                        inimigo.stunned = false; // Sai do stun da mordida para receber o knockback normalmente
                        inimigo.stunTimer = 0;
                    }
                    pet.inimigoPreso = null;
                } else {
                    inimigo.x = pet.x;
                    inimigo.y = pet.y;
                    inimigo.stunned = true;
                    // Renova o stun para garantir que o inimigo não tente fugir ou atacar enquanto preso
                    if (inimigo.stunTimer < 30) inimigo.stunTimer = 60;
                    inimigo.noChao = pet.noChao;
                    inimigo.velocidadeY = pet.velocidadeY;
                    
                    // Atualização visual imediata do inimigo
                    if (inimigo.elemento) {
                        inimigo.elemento.style.left = inimigo.x + 'px';
                        inimigo.elemento.style.bottom = inimigo.y + 'px';
                    }
                    // Sincroniza todos os equipamentos que o inimigo possa ter coletado
                    if (typeof window.sincronizarAcessoriosEntidade === 'function') {
                        window.sincronizarAcessoriosEntidade(inimigo, {
                            armaElemento: inimigo.armaElemento,
                            escudoElemento: inimigo.escudoElemento,
                            botaElemento: inimigo.botaElemento,
                            jetpackElemento: inimigo.jetpackElemento,
                            garraElemento: inimigo.garraElemento,
                            cintoElemento: inimigo.cintoElemento,
                            coleteElemento: inimigo.coleteElemento
                        });
                    }
                }
            }
            // --- LÓGICA DE ARRASTAR ITEM (para gato) ---
            else if (pet.tipo === 'gato' && pet.itemArrastado) {
                const item = pet.itemArrastado;
                const DRAG_FACTOR = 0.15; // Adjust this value for slower/faster drag

                // Interpolate item's position towards the cat's position
                item.x += (pet.x - item.x) * DRAG_FACTOR;
                item.y += (pet.y - item.y) * DRAG_FACTOR;

                // Ensure item's visual is updated
                if (item.elemento) {
                    item.elemento.style.left = item.x + 'px';
                    item.elemento.style.bottom = item.y + 'px';
                }
                item.velocidadeY = 0; // Item should not be affected by gravity while dragged
            }
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
        pet.elemento.style.transform = pet.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
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