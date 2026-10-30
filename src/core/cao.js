(function () {
    const CAO_STORAGE_KEY = 'plataformaCaoResgatado';
    const GATO_STORAGE_KEY = 'plataformaGatoResgatado';
    const GALINHA_STORAGE_KEY = 'plataformaGalinhaResgatada';

    window.isCaoResgatado = localStorage.getItem(CAO_STORAGE_KEY) === 'true';
    window.caoNaBase = localStorage.getItem('plataformaCaoNaBase') === 'true';
    window.isGatoResgatado = localStorage.getItem(GATO_STORAGE_KEY) === 'true';
    window.gatoNaBase = localStorage.getItem('plataformaGatoNaBase') === 'true';
    window.isGalinhaResgatada = localStorage.getItem(GALINHA_STORAGE_KEY) === 'true';
    window.galinhaNaBase = localStorage.getItem('plataformaGalinhaNaBase') === 'true';

    // Estado para múltiplos pets
    window.idPetsAtivos = { cao: 0, gato: 0, galinha: 0 };
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
            : tipo === 'gato'
                ? (config.spriteGato || '../../assets/personagem/gato_parado.png')
                : (config.spriteGalinha || '../../assets/personagem/galinha/galinha_parado.png');
            
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
            coyoteAtivo: true,
            coyoteTimeSegundos: Math.max(0, Number(config.coyoteTimeSegundosPets ?? 0.06)),
            coyoteFramesRestantes: 0,
            jumpBufferAtivo: true,
            jumpBufferSegundos: Math.max(0, Number(config.jumpBufferSegundosPets ?? 0.06)),
            jumpBufferFramesRestantes: 0,
            jumpBufferTeclaAnterior: false,
            mordendo: false,
            kPressionadoAnterior: false,
            spriteParado: spriteBase,
            spriteAndando: tipo === 'cao' 
                ? (config.spriteCaoAndando || '../../assets/personagem/cao_mov.png')
                : tipo === 'gato'
                    ? (config.spriteGatoAndando || '../../assets/personagem/gato_andando.png')
                    : (config.spriteGalinhaAndando || '../../assets/personagem/galinha/galinha_andando.png'),
            spriteVoando: tipo === 'galinha'
                ? (config.spriteGalinhaVoando || '../../assets/personagem/galinha/galinha_voando.png')
                : null,
            spriteParadoInteragindo: tipo === 'galinha'
                ? (config.spriteGalinhaParadoInteragindo || '../../assets/personagem/galinha/galinha_parado_interagindo.png')
                : null,
            spriteVoandoInteragindo: tipo === 'galinha'
                ? (config.spriteGalinhaVoandoInteragindo || '../../assets/personagem/galinha/galinha_voando_interagindo.png')
                : null,
            estaSeguindo: true,    // Novo: controla se o NPC deve seguir o player
            ultimoToqueQ: 0,       // Restaurado para Double Tap
            qPressionadoAnterior: false, // Restaurado para Double Tap
            itemArrastado: null,   // NOVO: Referência ao item segurado (para gato)
            inimigoPreso: null,    // NOVO: Referência ao inimigo segurado
            latidoPressionadoAnterior: false, // NOVO: Controle discreto para detecção de clique do latido
            inimigoAlvo: null,              // Referência ao inimigo em perseguição
            cooldownAtaqueInimigo: 0        // Cooldown após colidir antes de caçar de novo
        };

        // REGISTRO GLOBAL
        if (tipo === 'cao') window.caoEntidade = pet;
        else if (tipo === 'gato') window.gatoEntidade = pet;
        else if (tipo === 'galinha') window.galinhaEntidade = pet;
        
        requestAnimationFrame(() => cicloVidaPet(pet, meuId));
    };

    // Aliases para compatibilidade
    window.inicializarCaoNPC = (x, y, cfg) => window.inicializarPetNPC('cao', x, y, cfg);
    window.iniciarCao = (pos, cfg) => window.inicializarPetNPC('cao', pos.x, pos.y, cfg);
    window.iniciarGato = (pos, cfg) => window.inicializarPetNPC('gato', pos.x, pos.y, cfg);
    window.iniciarGalinha = (pos, cfg) => window.inicializarPetNPC('galinha', pos.x, pos.y, cfg);

    function cicloVidaPet(pet, idControle) {
        // Se o pet foi reinicializado, este loop antigo deve morrer
        if (window.idPetsAtivos[pet.tipo] !== idControle) {
            return;
        }

        // Se o pet foi desativado (enviado para a base), removemos ele da fase e paramos o ciclo de vida
        const naBase = pet.tipo === 'cao' ? window.caoNaBase : pet.tipo === 'gato' ? window.gatoNaBase : window.galinhaNaBase;
        if (naBase) {
            if (pet.elemento) pet.elemento.remove();
            if (pet.tipo === 'cao' && window.caoEntidade === pet) window.caoEntidade = null;
            if (pet.tipo === 'gato' && window.gatoEntidade === pet) window.gatoEntidade = null;
            if (pet.tipo === 'galinha' && window.galinhaEntidade === pet) window.galinhaEntidade = null;
            return;
        }

        const player = window.playerControle;
        const alvoPrincipalSeguimento = (window.controlandoBB && window.bbEntidade) ? window.bbEntidade : player;
        const alvoSeguimento = pet.tipo === 'galinha' && window.gatoEntidade && !window.gatoNaBase
            ? window.gatoEntidade
            : alvoPrincipalSeguimento;
        
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
                                    (pet.tipo === 'gato' && window.controlandoGato) ||
                                    (pet.tipo === 'galinha' && window.controlandoGalinha);

            if (sendoControlado) {
                const teclas = window.playerControle?.teclas || {};
                const apertouE = !!(teclas['e'] || teclas['E'] || teclas['KeyE']);
                if (apertouE && !pet.ePressionadoAnterior) {
                    pet.tempoAnimacaoInteracao = Date.now() + 250;
                }
                pet.ePressionadoAnterior = apertouE;

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
                    
                    // Colisão com vidro da cápsula
                    if (typeof window.verificarColisaoComVidroCapsula === 'function') {
                        const hitboxPet = {
                            x: pet.x + (pet.offsetX || 0),
                            y: pet.y,
                            largura: pet.largura,
                            altura: pet.altura
                        };
                        const vidroColidido = window.verificarColisaoComVidroCapsula(hitboxPet);
                        if (vidroColidido) {
                            if (deslocX > 0) {
                                pet.x = vidroColidido.x - (pet.largura + pet.offsetX);
                            } else {
                                pet.x = (vidroColidido.x + vidroColidido.largura) - pet.offsetX;
                            }
                        }
                    }
                }
                
                // Tenta subir degraus (meio-bloco) automaticamente
                if (deslocX !== 0 && typeof window.tentarAutoDegrau === 'function') {
                    window.tentarAutoDegrau(pet, window.plataformas, config);
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
                        else if (pet.tipo === 'gato') window.controlandoGato = false;
                        else if (pet.tipo === 'galinha') window.controlandoGalinha = false;

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
                pet.mordendo = !!pet.inimigoPreso || !!pet.itemArrastado;

                // Re-ativa o seguimento se o jogador encostar no pet
                const colidindoComPlayer = typeof window.detectarColisaoHitbox === 'function' && 
                                          window.detectarColisaoHitbox(pet, alvoSeguimento, 0, 0, 0);
                if (colidindoComPlayer) pet.estaSeguindo = true;

                // Decrementa o cooldown de ataque do pet
                if (pet.cooldownAtaqueInimigo > 0) {
                    pet.cooldownAtaqueInimigo--;
                }

                // --- 1. BUSCA DE INIMIGO NA ÁREA DE PROXIMIDADE DO JOGADOR ---
                const raioDetecaoX = Number(config.petRaioDetecaoInimigoX ?? 250);
                const raioDetecaoY = Number(config.petRaioDetecaoInimigoY ?? 120);

                // Verifica se a mecânica está habilitada: CÃO + SKILL CÃOBATENTE ou GATO + SKILL GATOBATENTE
                const temSkillCaobatente = !!(typeof window.temSkill === 'function' && (window.temSkill('Cãobatente') || window.temSkill('Caobatente')));
                const temSkillGatobatente = !!(typeof window.temSkill === 'function' && (window.temSkill('Gato de bolas') || window.temSkill('Gatobatente') || window.temSkill('Gatinho Batente')));
                const podeCacarInimigos = (pet.tipo === 'cao' && temSkillCaobatente) || (pet.tipo === 'gato' && temSkillGatobatente);

                // Valida se o inimigo que ele já estava perseguindo continua válido
                if (pet.inimigoAlvo) {
                    const inimigoExiste = window.inimigos && window.inimigos.includes(pet.inimigoAlvo);
                    const inimigoVivo = pet.inimigoAlvo && !pet.inimigoAlvo.estaMorto && !pet.inimigoAlvo.estaMorrendo;
                    const pertoDoPlayer = alvoSeguimento && (Math.abs(pet.inimigoAlvo.x - alvoSeguimento.x) <= (raioDetecaoX * 1.5));

                    if (!podeCacarInimigos || !inimigoExiste || !inimigoVivo || !pertoDoPlayer) {
                        pet.inimigoAlvo = null; // Alvo inválido, sem skill ou fugiu para muito longe: desiste
                    }
                }

                // Busca ou atualiza dinamicamente o alvo caso apareça um inimigo mais próximo
                if (podeCacarInimigos && pet.cooldownAtaqueInimigo === 0 && !pet.inimigoPreso && !pet.itemArrastado &&
                    alvoSeguimento && !alvoSeguimento.estaMorrendo && window.inimigos && Array.isArray(window.inimigos)) {

                    // Se já estiver perseguindo um alvo, calcula a distância atual dele menos 10px 
                    // (margem de estabilidade para só trocar se o novo inimigo for claramente mais próximo)
                    let distReferencia = pet.inimigoAlvo 
                        ? (Math.hypot(pet.inimigoAlvo.x - pet.x, pet.inimigoAlvo.y - pet.y) - 10)
                        : Infinity;

                    let melhorAlvo = pet.inimigoAlvo;
                    const fenoId = window.GAME_CONSTANTS?.INIMIGO_FENO_ID ?? 5;

                    for (let i = 0; i < window.inimigos.length; i++) {
                        const inim = window.inimigos[i];
                        if (!inim || inim.estaMorto || inim.estaMorrendo || inim.tipo === fenoId) continue;

                        // Verifica se o inimigo está dentro da área de proximidade do JOGADOR
                        const distDoPlayerX = Math.abs(inim.x - alvoSeguimento.x);
                        const distDoPlayerY = Math.abs(inim.y - alvoSeguimento.y);

                        if (distDoPlayerX <= raioDetecaoX && distDoPlayerY <= raioDetecaoY) {
                            // Mede a distância entre este inimigo e o CÃO
                            const distDoPet = Math.hypot(inim.x - pet.x, inim.y - pet.y);

                            // Se este inimigo estiver mais perto do Cão que o alvo atual, assume como novo alvo
                            if (distDoPet < distReferencia) {
                                distReferencia = distDoPet;
                                melhorAlvo = inim;
                            }
                        }
                    }

                    pet.inimigoAlvo = melhorAlvo;
                }

                // --- 2. DEFINIÇÃO DO ALVO DE MOVIMENTO (INIMIGO OU JOGADOR) ---
                const perseguindoInimigo = !!(podeCacarInimigos && pet.inimigoAlvo);
                let xAlvoPet;
                let yAlvoPet;
                let distSeguir;

                if (perseguindoInimigo) {
                    xAlvoPet = pet.inimigoAlvo.x;
                    yAlvoPet = pet.inimigoAlvo.y;
                    distSeguir = 0; // Corre até encostar no inimigo
                } else {
                    xAlvoPet = alvoSeguimento ? alvoSeguimento.x : pet.x;
                    yAlvoPet = alvoSeguimento ? alvoSeguimento.y : pet.y;
                    distSeguir = pet.tipo === 'galinha'
                        ? 12
                        : (pet.tipo === 'cao' ? config.distanciaMinimaCaoSeguir : config.distanciaMinimaGatoSeguir) || 45;
                }

                const alvoAcimaPet = yAlvoPet > pet.y + 40;

                // Desvio de teto (apenas ao seguir o jogador)
                if (!perseguindoInimigo && alvoAcimaPet && pet.noChao && typeof window.IAUtils !== 'undefined') {
                    if (window.IAUtils.estaSobTeto(pet)) {
                        const saidaX = window.IAUtils.encontrarSaidaTeto(pet, xAlvoPet > pet.x ? 1 : -1);
                        if (saidaX !== null) {
                            xAlvoPet = saidaX;
                        }
                    }
                }

                const deltaX = xAlvoPet - pet.x;
                pet.movendoHorizontal = false;

                // --- 3. MOVIMENTO HORIZONTAL COM FÍSICA E COLISÃO ---
                const deveMover = perseguindoInimigo
                    ? Math.abs(deltaX) > 4
                    : (pet.estaSeguindo && alvoSeguimento && !alvoSeguimento.estaMorrendo && Math.abs(deltaX) > distSeguir);

                if (deveMover) {
                    const direcaoX = Math.sign(deltaX);
                    // Corre com velocidade levemente ampliada no ataque
                    const velMovimento = perseguindoInimigo ? (velocidadeFinal * 1.15) : velocidadeFinal;
                    const deslocX = direcaoX * velMovimento;

                    window.aplicarDeslocamentoHorizontalComColisaoPadrao(pet, deslocX, window.plataformas, {
                        maxPasso: 1,
                        cancelarKnockbackAoColidir: true
                    });

                    pet.direcao = direcaoX > 0 ? 'd' : 'e';
                    pet.movendoHorizontal = true;

                    // Salto de obstáculo se encontrar parede à frente
                    const margemCheck = direcaoX > 0 ? 25 : -5;
                    const bloqueioFrente = window.verificarColisaoComTiles(pet.x + margemCheck, pet.y + 5, 5, 5, window.plataformas);
                    if (bloqueioFrente && pet.noChao && pet.cooldownPulo === 0) {
                        pet.velocidadeY = forcaPulo;
                        pet.cooldownPulo = 45;
                    }
                }

                // Salto se o alvo estiver no alto
                const alcancePuloY = config.caoAlcancePuloY || 32;
                if (pet.noChao && pet.cooldownPulo === 0 && (yAlvoPet > pet.y + alcancePuloY) && Math.abs(deltaX) < (config.caoAlcancePuloX || 80)) {
                    pet.velocidadeY = forcaPulo;
                    pet.cooldownPulo = 45;
                }

                // --- 4. VERIFICAÇÃO DE COLISÃO COM O INIMIGO ---
                if (perseguindoInimigo && pet.inimigoAlvo) {
                    const hitboxPet = {
                        x: pet.x + (pet.offsetX || 0),
                        y: pet.y,
                        largura: pet.largura,
                        altura: pet.altura
                    };
                    const hitboxInimigo = {
                        x: pet.inimigoAlvo.x + (pet.inimigoAlvo.offsetX || 0),
                        y: pet.inimigoAlvo.y,
                        largura: pet.inimigoAlvo.largura || 20,
                        altura: pet.inimigoAlvo.altura || 20
                    };

                    const colidiuComInimigo = typeof window.detectarColisaoHitbox === 'function' &&
                        window.detectarColisaoHitbox(hitboxPet, hitboxInimigo, 0, 0, 0);

                    if (colidiuComInimigo) {
                        const inimigo = pet.inimigoAlvo;

                        // --- ANIMAÇÃO VISUAL: Efeito de Garra (ataque_pet.png) ---
                        const palco = document.getElementById('game-stage') || document.getElementById('jogo-container') || document.body;
                        if (palco) {
                            const vfxGarra = document.createElement('img');
                            vfxGarra.src = config.spriteAtaquePet || 'assets/vfx/ataque_pet.png';
                            vfxGarra.className = 'vfx-ataque-garra-pet';
                            const tam = 32;
                            const flipFator = pet.direcao === 'e' ? -1 : 1;
                            const centroInimigoX = inimigo.x + ((inimigo.largura || 20) / 2);
                            const centroInimigoY = inimigo.y + ((inimigo.altura || 20) / 2);

                            vfxGarra.style.cssText = `
                                position: absolute;
                                width: ${tam}px;
                                height: ${tam}px;
                                left: ${Math.round(centroInimigoX - (tam / 2))}px;
                                bottom: ${Math.round(centroInimigoY - (tam / 2))}px;
                                image-rendering: pixelated;
                                pointer-events: none;
                                z-index: 120;
                                transform-origin: center center;
                                transform: scale(0.6) scaleX(${flipFator});
                                opacity: 1;
                                transition: transform 0.12s ease-out, opacity 0.15s ease-out;
                            `;

                            if (typeof window.adicionarAoLayer === 'function' && window.LAYERS?.EFEITOS) {
                                window.adicionarAoLayer(vfxGarra, window.LAYERS.EFEITOS);
                            } else {
                                palco.appendChild(vfxGarra);
                            }

                            // Dispara a expansão e o fade-out do golpe de garra
                            requestAnimationFrame(() => {
                                vfxGarra.style.transform = `scale(1.25) scaleX(${flipFator})`;
                                vfxGarra.style.opacity = '0';
                            });

                            // Remove o elemento após o término da animação
                            setTimeout(() => {
                                if (vfxGarra.isConnected) vfxGarra.remove();
                            }, 160);
                        }

                        // Pisca o inimigo atingido (flash rápido de dano)
                        if (typeof window.flashRapido === 'function' && inimigo.elemento) {
                            window.flashRapido(inimigo.elemento);
                        }

                        // 1. APLICA 1 PONTO DE DANO AO INIMIGO (só para Cãobatente, não para Gatobatente)
                        const danoAtaquePet = Number(config.petDanoAtaque ?? 1);
                        if (!(pet.tipo === 'gato' && temSkillGatobatente)) {
                            inimigo.vida = (inimigo.vida || 0) + danoAtaquePet;
                        }

                        // Efeito sonoro do impacto
                        window.AudioManager?.playSFX('espada.mp3', 0.6);

                        // Pequeno salto de recuo no pet
                        pet.velocidadeY = 4;

                        // Direção do empurrão do inimigo
                        const direcaoKnockback = pet.direcao === 'd' ? 1 : -1;

                        // Obtém o limite de vida máxima do inimigo
                        const limiteVidaInimigo = typeof window.obterLimiteVidaInimigo === 'function'
                            ? window.obterLimiteVidaInimigo(config, inimigo.vidaMax)
                            : Number(inimigo.vidaMax ?? config.inimigoVidaMax ?? 3);

                        // Se o dano atingir a vida limite, derrota o inimigo
                        if (!(pet.tipo === 'gato' && temSkillGatobatente)) {
                            if (inimigo.vida >= limiteVidaInimigo) {
                                if (typeof window.prepararMorteInimigo === 'function') {
                                    window.prepararMorteInimigo(inimigo, direcaoKnockback);
                                } else if (typeof window.removerInimigoDerrotado === 'function') {
                                    window.removerInimigoDerrotado(inimigo);
                                }
                            } else {
                                // Se ainda sobreviveu, aplica atordoamento (1s) e empurrão
                                inimigo.stunned = true;
                                inimigo.stunTimer = Number(config.petStunDuracaoInimigo ?? 60);
                                inimigo.velocidadeKnockback = direcaoKnockback * 4;
                                inimigo.framesKnockbackRestante = 8;
                            }
                        } else {
                            // Gatobatente: sem dano, mas mantém pequeno efeito de stun/empurrão para parecer igual ao Caobatente
                            inimigo.stunned = true;
                            inimigo.stunTimer = Number(config.petStunDuracaoInimigo ?? 40);
                            inimigo.velocidadeKnockback = direcaoKnockback * 3;
                            inimigo.framesKnockbackRestante = 6;
                        }

                        // 2. FINALIZA A PERSEGUIÇÃO E ATIVA O COOLDOWN DO CÃO
                        pet.inimigoAlvo = null;

                        // Tempo de recarga do cão/gato para usar a skill novamente:
                        // Padrão: 4 segundos (240 frames a 60fps)
                        const segundosCooldown = Number(config.petCooldownAtaqueSegundos ?? 10);
                        let cooldownBase = Number(config.petCooldownAtaque ?? Math.round(segundosCooldown * 60));
                        // Gatobatente tem cooldown pela metade
                        if (pet.tipo === 'gato' && temSkillGatobatente) {
                            cooldownBase = Math.max(1, Math.round(cooldownBase / 2));
                        }
                        pet.cooldownAtaqueInimigo = cooldownBase;
                    }
                }

                // --- 5. SEGURANÇA: TELEPORTE SE CAIR OU FICAR MUITO LONGE ---
                const distMax = config.distanciaMaxTeleporteCao || 600;
                if (!pet.inimigoPreso && (pet.y < -128 || (alvoSeguimento && Math.abs(alvoSeguimento.x - pet.x) > distMax))) {
                    if (alvoSeguimento && alvoSeguimento.noChao) {
                        pet.x = alvoSeguimento.x - (alvoSeguimento.direcao === 'd' ? 32 : -32);
                        pet.y = alvoSeguimento.y;
                        pet.velocidadeY = 0;
                        pet.inimigoAlvo = null;
                    }
                }
            }

            // No modo Runner, pets sempre animam andando se estiverem no chão
            if (window.faseAtualData?.modoRunner && pet.noChao) {
                pet.movendoHorizontal = true;
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
                    // Se for colisão com o teto de um robô aberto e o pet estiver subindo, ignora.
                    if (hitTeto && hitTeto.tipo === 'meio' && hitTeto.direcao === 'superior') {
                        // Ignora esta colisão, não aplica snap nem zera velocidade
                    }
                    // Se houver colisão com o teto (e não for o robô aberto subindo)
                    else if (hitTeto) {
                        const permiteCorrecaoQuina = hitTeto.tipo !== 'estaca';
                        if (permiteCorrecaoQuina && typeof window.tentarCorrecaoQuinaSubida === 'function') {
                            const corrigiuQuina = window.tentarCorrecaoQuinaSubida(pet, window.plataformas, {
                                maxDeslocamento: Math.max(0, Number(config.cornerCorrectionPxPets ?? 4)),
                                passo: 1,
                                probeYOffset: pet.altura - 6,
                                probeAltura: 6
                            });
                            if (corrigiuQuina) {
                                // Mantém subida suave quando pega apenas a quina
                            } else {
                                pet.y = window.aplicarSnapColisaoPadrao(pet.y, 0, pet.altura, hitTeto, 'baixo');
                                pet.velocidadeY = 0;
                            }
                        } else {
                            pet.y = window.aplicarSnapColisaoPadrao(pet.y, 0, pet.altura, hitTeto, 'baixo');
                            pet.velocidadeY = 0;
                        }
                    }
                }
            }

            // --- LÓGICA DE HABILIDADES PASSIVAS (Manter mordida/Loot) ---
            window.PetAbilities?.atualizarEfeitosHabilidades(pet, config);
        }

        // Sincronização Visual
        if (pet.tipo === 'galinha') {
            const agora = Date.now();
            const teclas = window.playerControle?.teclas || {};
            const apertouE = !!(teclas['e'] || teclas['E'] || teclas['KeyE']);
            const interagindo = apertouE || agora < (pet.tempoAnimacaoInteracao || 0);

            if (!pet.noChao) {
                pet.elemento.src = interagindo
                    ? pet.spriteVoandoInteragindo
                    : pet.spriteVoando;
                pet.contadorAnimacao = 0;
                pet.frameAtual = 0;
            } else if (interagindo) {
                pet.elemento.src = pet.spriteParadoInteragindo;
                pet.contadorAnimacao = 0;
                pet.frameAtual = 0;
            } else if (pet.movendoHorizontal) {
                pet.contadorAnimacao = (pet.contadorAnimacao || 0) + 1;
                if (pet.contadorAnimacao >= 10) {
                    pet.frameAtual = pet.frameAtual === 0 ? 1 : 0;
                    pet.elemento.src = pet.frameAtual === 0
                        ? pet.spriteParado
                        : pet.spriteAndando;
                    pet.contadorAnimacao = 0;
                }
            } else {
                pet.elemento.src = pet.spriteParado;
                pet.contadorAnimacao = 0;
                pet.frameAtual = 0;
            }
        } else if (pet.mordendo) {
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
        const key = tipo === 'cao' ? CAO_STORAGE_KEY : tipo === 'gato' ? GATO_STORAGE_KEY : GALINHA_STORAGE_KEY;
        if (localStorage.getItem(key) === 'true') return;

        if (tipo === 'cao') {
            window.isCaoResgatado = true;
            window.TutorialControles?.registrarItemColetado?.('cao');
        } else if (tipo === 'gato') {
            window.isGatoResgatado = true;
            window.TutorialControles?.registrarItemColetado?.('gato');
        } else {
            window.isGalinhaResgatada = true;
            window.TutorialControles?.registrarItemColetado?.('galinha');
        }
        
        localStorage.setItem(key, 'true');
        
        if (window.AudioManager) {
            window.AudioManager.playSFX('madeiraQuebrando', 0.7);
        }

        if (gaiolaObj) {
            if (gaiolaObj.elementoGaiola) gaiolaObj.elementoGaiola.remove();
            if (gaiolaObj.elementoPet) gaiolaObj.elementoPet.remove();
            
            if (tipo === 'cao') window.iniciarCao({ x: gaiolaObj.x, y: gaiolaObj.y }, config || window.config);
            else if (tipo === 'gato') window.iniciarGato({ x: gaiolaObj.x, y: gaiolaObj.y }, config || window.config);
            else window.iniciarGalinha({ x: gaiolaObj.x, y: gaiolaObj.y }, config || window.config);
            
            if (typeof window.criarEfeitoParticulas === 'function') {
                window.criarEfeitoParticulas(gaiolaObj.x + 16, gaiolaObj.y + 16, 'madeira');
            }
        }
    };

    window.resetarResgatePets = function(opcoes = {}) {
        const removerPetsAtivos = !!opcoes.removerPetsAtivos;

        window.isCaoResgatado = false;
        window.isGatoResgatado = false;
        window.isGalinhaResgatada = false;
        window.caoNaBase = false;
        window.gatoNaBase = false;
        window.galinhaNaBase = false;

        localStorage.removeItem(CAO_STORAGE_KEY);
        localStorage.removeItem(GATO_STORAGE_KEY);
        localStorage.removeItem(GALINHA_STORAGE_KEY);
        localStorage.removeItem('plataformaCaoNaBase');
        localStorage.removeItem('plataformaGatoNaBase');
        localStorage.removeItem('plataformaGalinhaNaBase');

        if (removerPetsAtivos) {
            if (window.caoEntidade?.elemento) window.caoEntidade.elemento.remove();
            if (window.gatoEntidade?.elemento) window.gatoEntidade.elemento.remove();
            if (window.galinhaEntidade?.elemento) window.galinhaEntidade.elemento.remove();
            window.caoEntidade = null;
            window.gatoEntidade = null;
            window.galinhaEntidade = null;
        }

        return true;
    };

    // Compatibilidade retroativa para chamadas antigas.
    window.resetarResgateCao = function() {
        return window.resetarResgatePets();
    };

})();
