/**
 * Gerencia a inteligência artificial de perseguição dos inimigos.
 * Faz com que todos os inimigos na lista global window.inimigos sigam o jogador no eixo X.
 * 
 * @param {number} velocidade - Velocidade de perseguição (pixels por quadro).
 * @param {string} spriteParado - Caminho da imagem parado.
 * @param {string} spriteAndando - Caminho da imagem andando.
 * @param {string} spriteChute - Caminho da imagem chutando.
 */
async function iniciarIAInimigos(velocidade = 1, spriteParado, spriteAndando, spriteChute) {
    // Busca as configurações do arquivo JSON
    const resposta = await fetch('config/configuracoes.json');
    const config = await resposta.json();

    // Default values for jump delay
    config.inimigoPuloDelayMin = config.inimigoPuloDelayMin ?? 5; // Default 5 frames
    config.inimigoPuloDelayMax = config.inimigoPuloDelayMax ?? 20; // Default 20 frames

    const EPSILON = 0.01;

    function obterKnockback(config, fonte = 'default') {
        const base = Number(config.knockbackBase ?? config.knockbackInimigo ?? 150);
        const ajuste = Number(config.knockbackAjustes?.[fonte] ?? 0);
        return base + ajuste;
    }

    function temEscudoAtivo() {
        return window.playerControle?.temEscudo && !window.playerControle?.escudoVermelho;
    }

    function obterKnockbackRecebido(config, fonte = 'default') {
        const valor = obterKnockback(config, fonte);
        if (temEscudoAtivo()) {
            return valor * Number(config.escudoKnockbackMultiplicador ?? 0.5);
        }
        return valor;
    }

    function inimigoColetarItemGarra(inimigo, item) {
        // This logic is adapted from the existing enemy item collection in the main loop
        // It assumes the item has already been removed from window.itensColetaveis
        // and its visual element will be removed by the caller.

        if (item.tipo === 'revolver') { inimigo.temArma = true; inimigo.municao = config.maxMunicao || 5; if (inimigo.armaElemento) inimigo.armaElemento.style.display = 'block'; }
        else if (item.tipo === 'escudo') { inimigo.temEscudo = true; inimigo.escudoVermelho = false; inimigo.escudoProtegido = 0; if (inimigo.escudoElemento) inimigo.escudoElemento.style.display = 'block'; }
        else if (item.tipo === 'bota') { inimigo.temBota = true; if (inimigo.botaElemento) inimigo.botaElemento.style.display = 'block'; }
        else if (item.tipo === 'jetpack') { inimigo.temJetpack = true; if (inimigo.jetpackElemento) inimigo.jetpackElemento.style.display = 'block'; }
        else if (item.tipo === 'garra') { inimigo.temGarra = true; if (inimigo.garraElemento) inimigo.garraElemento.style.display = 'block'; }
        else if (item.tipo === 'restauracao') {
            inimigo.municao = config.maxMunicao || 5;
            inimigo.escudoProtegido = 0;
            inimigo.escudoVermelho = false;
            inimigo.vida = Math.max(0, (inimigo.vida || 0) - 1);
            if (inimigo.inventario.includes('escudo')) {
                inimigo.temEscudo = true;
            }
            console.log("IA: Inimigo coletou item de restauração pela garra!");
        }
        else if (item.tipo === 'airdrop') {
            const conteudos = config.airdrop1?.conteudos || ['item'];
            const validosParaIA = conteudos.filter(c => c === 'item' || c === 'restauracao');
            const sorteio = validosParaIA.length > 0
                ? validosParaIA[Math.floor(Math.random() * validosParaIA.length)]
                : 'item';

            if (sorteio === 'restauracao') {
                inimigo.municao = config.maxMunicao || 5;
                inimigo.escudoProtegido = 0;
                inimigo.escudoVermelho = false;
                inimigo.vida = Math.max(0, (inimigo.vida || 0) - 1);
                if (inimigo.inventario.includes('escudo')) {
                    inimigo.temEscudo = true;
                }
                console.log("IA: Inimigo restaurou equipamentos via AirDrop pela garra!");
            } else {
                const pendentes = [];
                if (!inimigo.temArma) pendentes.push('revolver');
                if (!inimigo.temEscudo) pendentes.push('escudo');
                if (!inimigo.temBota) pendentes.push('bota');
                if (!inimigo.temJetpack) pendentes.push('jetpack');
                if (!inimigo.temGarra) pendentes.push('garra');

                if (pendentes.length > 0) {
                    const novo = pendentes[Math.floor(Math.random() * pendentes.length)];
                    if (novo === 'revolver') { inimigo.temArma = true; inimigo.municao = config.maxMunicao; if (inimigo.armaElemento) inimigo.armaElemento.style.display = 'block'; }
                    else if (novo === 'escudo') { inimigo.temEscudo = true; inimigo.escudoVermelho = false; inimigo.escudoProtegido = 0; if (inimigo.escudoElemento) inimigo.escudoElemento.style.display = 'block'; }
                    else if (novo === 'bota') { inimigo.temBota = true; if (inimigo.botaElemento) inimigo.botaElemento.style.display = 'block'; }
                    else if (novo === 'jetpack') { inimigo.temJetpack = true; if (inimigo.jetpackElemento) inimigo.jetpackElemento.style.display = 'block'; }
                    else if (novo === 'garra') { inimigo.temGarra = true; if (inimigo.garraElemento) inimigo.garraElemento.style.display = 'block'; }
                    inimigo.inventario.push(novo);
                }
            }
        }

        // Add to inventory if not already present and not a consumable like 'restauracao' or 'airdrop'
        if (item.tipo !== 'airdrop' && item.tipo !== 'restauracao' && !inimigo.inventario.includes(item.tipo)) {
            inimigo.inventario.push(item.tipo);
        }
        // Remove the item's visual element
        item.elemento.remove();
    }

    window.resetarInimigos = (dadosInimigos) => {
        // Limpa referências antigas e remove armas
        if (window.inimigos) {
            window.inimigos.forEach(inim => {
                if (inim.armaElemento) inim.armaElemento.remove();
                if (inim.botaElemento) inim.botaElemento.remove();
                if (inim.escudoElemento) inim.escudoElemento.remove();
                if (inim.jetpackElemento) inim.jetpackElemento.remove();
                if (inim.jetFogoElemento) inim.jetFogoElemento.remove();
                if (inim.garraElemento) inim.garraElemento.remove();
                if (inim.garraBracos) inim.garraBracos.forEach(b => b.remove());
            });
        }
        window.inimigos = [];
        
        const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
        if (!palco) return;
        dadosInimigos.forEach(dado => {
            const posStr = typeof dado === 'object' ? dado.pos : dado;
            // Obtém as coordenadas X e Y usando a função global gridParaPixels
            const pos = typeof window.gridParaPixels === 'function' ? window.gridParaPixels(posStr) : {x: 0, y: 0};
            
            const inimigoImg = document.createElement('img'); // Variável correta para o elemento imagem do inimigo
            const tipo = dado.tipo !== undefined ? dado.tipo : 1;
            if (tipo === 5) {
                // Tenta pegar da config local, depois da global, e por fim o caminho fixo
                inimigoImg.src = config.spriteAlvoFeno || window.config?.spriteAlvoFeno || 'assets/personagem/alvoFeno.png';
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
            palco.appendChild(inimigoImg);

            window.inimigos.push({
                x: pos.x,
                y: pos.y,
                startX: pos.x,
                startY: pos.y,
                largura: config.HITBOX_LARGURA, // Atribuir largura aqui
                altura: config.HITBOX_ALTURA,   // Atribuir altura aqui
                offsetX: config.HITBOX_OFFSET_X, // Atribuir offsetX aqui
                elemento: inimigoImg, // Usar a variável correta
                perseguindo: false,
                tipo: tipo,
                framesKnockbackRestante: 0, // Inicializa frames de knockback
                velocidadeKnockback: 0, // Inicializa velocidade de knockback
                puloTimer: 0, // Inicializa o timer de pulo
                jumpQueued: false // Inicializa a flag de pulo agendado
                ,isEnemy: true // Flag to identify as an enemy
                // Propriedades da Garra para o inimigo
                ,garraAnimEstado: 'idle' // idle, prep, esticando, catching, voltando
                ,garraTimer: 0
                ,garraDist: 0
                ,garraBracos: []
                ,garraItemCarregado: null
                ,cooldownGarra: 60 // Novo cooldown para a garra do inimigo
            });
        });
    };

    function atualizarIA() {
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
            const alcanceTiro = Number(config.distanciaTiroInimigo ?? 300);
            
            // Distância para o inimigo começar a perseguir o jogador
            const distanciaAtivacao = 300;

            const velAtivaBase = Number(config.velocidadeHorizontal ?? velocidade);

            // Usamos um loop for reverso para permitir a remoção segura de inimigos que caem no buraco
            for (let i = window.inimigos.length - 1; i >= 0; i--) {
                const inimigo = window.inimigos[i];
                
                // Lógica especial para o Alvo de Feno (Tipo 5)
                if (inimigo.tipo === 5) {
                    // Se estiver no processo de reset (vermelho), não processa física
                    if (inimigo.estaMorto) {
                        continue;
                    }

                    const xAnteriorFeno = inimigo.x;

                    // Aplica knockback se estiver ativo
                    if (inimigo.framesKnockbackRestante > 0) {
                        inimigo.x += inimigo.velocidadeKnockback;
                        inimigo.framesKnockbackRestante--;
                    }

                    // Colisão Horizontal com as laterais das plataformas (Snap) para o feno
                    if (typeof verificarColisaoComTiles === 'function' && 
                        verificarColisaoComTiles(inimigo.x + (inimigo.offsetX || 0), inimigo.y, inimigo.largura, inimigo.altura, window.plataformas)) {
                        
                        if (inimigo.x > xAnteriorFeno) { // Empurrado para Direita
                            inimigo.x = Math.floor((inimigo.x + (inimigo.offsetX || 0) + inimigo.largura) / 32) * 32 - inimigo.largura - (inimigo.offsetX || 0) - EPSILON;
                        } else if (inimigo.x < xAnteriorFeno) { // Empurrado para Esquerda
                            inimigo.x = (Math.floor((inimigo.x + (inimigo.offsetX || 0)) / 32) + 1) * 32 - (inimigo.offsetX || 0) + EPSILON;
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

                    // Aplica gravidade básica
                    if (typeof aplicarFisica === 'function' && !inimigo.noChao) {
                        aplicarFisica(inimigo, {}, 0, config.inimigoGravidade, 0);
                    }
                    // Sincroniza posição visual e pula toda a IA
                    inimigo.elemento.style.left = inimigo.x + 'px';
                    inimigo.elemento.style.bottom = inimigo.y + 'px';
                    
                    // Verifica colisão com solo para o alvo não atravessar o chão no knockback
                    if (typeof verificarColisaoComTiles === 'function' && 
                        verificarColisaoComTiles(inimigo.x + (inimigo.offsetX || 0), inimigo.y, inimigo.largura, inimigo.altura, window.plataformas)) {
                        inimigo.noChao = true;
                        inimigo.velocidadeY = 0;
                        inimigo.y = Math.floor((inimigo.y + EPSILON) / 32 + 1) * 32;
                    }
                    continue; 
                }

                let xAnterior = inimigo.x;

                // Refinamento IA: Detecta itens de interesse (AirDrop ou Jetpack se não possuir um)
                const itemInteresse = window.itensColetaveis?.find(it => 
                    (it.tipo === 'airdrop' || (it.tipo === 'jetpack' && !inimigo.temJetpack)) && 
                    Math.abs(it.x - inimigo.x) <= 192 && 
                    Math.abs(it.y - inimigo.y) <= 128
                );
                
                // Se houver um item de interesse por perto, ele vira o alvo prioritário da IA
                const xAlvo = itemInteresse ? itemInteresse.x : playerX;
                const yAlvo = itemInteresse ? itemInteresse.y : playerY;

                const estaChutando = inimigo.tempoChute > 0;

                // Unificação da velocidade: tratamos como número e aplicamos bônus se for tipo 3
                let velAtiva = velAtivaBase;
                if (inimigo.tipo === 3) {
                    velAtiva += Number(config.bonusVelocidadeBota ?? 2);
                }
                
                // Penalidade de velocidade para o escudo ativo (igual ao player)
                if (inimigo.temEscudo && !inimigo.escudoVermelho) {
                    const penalidade = Number(config.escudoVelocidadeReduzida ?? 2);
                    velAtiva = Math.max(0.5, velAtiva - penalidade); // Garante no mínimo 0.5 de velocidade
                }

                const distanciaAtual = Math.abs(playerX - inimigo.x);
                
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
                    inimigo.temArma = (inimigo.tipo === 1);
                    inimigo.temEscudo = (inimigo.tipo === 2);
                    inimigo.temBota = (inimigo.tipo === 3);
                    inimigo.temJetpack = (inimigo.tipo === 4);
                    inimigo.temGarra = (inimigo.tipo === 6);
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
                    // Preenche inventário inicial baseado no tipo
                    if (inimigo.temArma) inimigo.inventario.push('revolver');
                    if (inimigo.temEscudo) inimigo.inventario.push('escudo');
                    if (inimigo.temBota) inimigo.inventario.push('bota');
                    if (inimigo.temJetpack) inimigo.inventario.push('jetpack');
                    if (inimigo.temGarra) inimigo.inventario.push('garra');
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

                    // Cria o elemento da arma (revolver) acoplado ao inimigo
                    if (!inimigo.armaElemento) {
                        const arma = document.createElement('img');
                        arma.src = config.spriteArmaPlayer || 'assets/personagem/revolver.png';
                        arma.style.position = 'absolute';
                        arma.style.width = '32px';
                        arma.style.height = '32px';
                        arma.style.zIndex = '6'; // Mesma camada da arma do player
                        arma.style.imageRendering = 'pixelated';
                        arma.style.pointerEvents = 'none';
                        arma.style.display = inimigo.temArma ? 'block' : 'none';
                        inimigo.elemento.parentElement.appendChild(arma);
                        inimigo.armaElemento = arma;
                    }

                    // Cria o elemento visual da bota para o inimigo
                    if (!inimigo.botaElemento) {
                        const bota = document.createElement('img');
                        bota.src = config.spriteBotaParado || 'assets/personagem/bota_parado.png';
                        bota.style.position = 'absolute';
                        bota.style.width = '32px';
                        bota.style.height = '32px';
                        bota.style.zIndex = '8';
                        bota.style.imageRendering = 'pixelated';
                        bota.style.pointerEvents = 'none';
                        bota.style.display = inimigo.temBota ? 'block' : 'none';
                        inimigo.elemento.parentElement.appendChild(bota);
                        inimigo.botaElemento = bota;
                    }

                    // Cria o elemento do escudo para o inimigo tipo 2
                    if (!inimigo.escudoElemento) {
                        const escudo = document.createElement('img');
                        escudo.src = config.spriteEscudoPlayer || 'assets/personagem/escudo.png';
                        escudo.style.position = 'absolute';
                        escudo.style.width = '32px';
                        escudo.style.height = '32px';
                        escudo.style.zIndex = '7';
                        escudo.style.imageRendering = 'pixelated';
                        escudo.style.pointerEvents = 'none';
                        escudo.style.display = inimigo.temEscudo ? 'block' : 'none';
                        inimigo.elemento.parentElement.appendChild(escudo);
                        inimigo.escudoElemento = escudo;
                    }

                    // Cria o elemento do jetpack para o inimigo
                    if (!inimigo.jetpackElemento) {
                        const jetpack = document.createElement('img');
                        jetpack.src = config.spriteJetpackPlayer || 'assets/personagem/jetpack.png';
                        jetpack.style.position = 'absolute';
                        jetpack.style.width = '32px';
                        jetpack.style.height = '32px';
                        jetpack.style.zIndex = '3'; // Atrás do inimigo (4)
                        jetpack.style.imageRendering = 'pixelated';
                        jetpack.style.pointerEvents = 'none';
                        jetpack.style.display = inimigo.temJetpack ? 'block' : 'none';
                        inimigo.elemento.parentElement.appendChild(jetpack);
                        inimigo.jetpackElemento = jetpack;
                    }

                    // Cria o elemento do fogo do jetpack para o inimigo
                    if (!inimigo.jetFogoElemento) {
                        const jetFogo = document.createElement('img');
                        jetFogo.src = config.spriteJetFogo || 'assets/personagem/jet.png';
                        jetFogo.style.position = 'absolute';
                        jetFogo.style.width = '32px';
                        jetFogo.style.height = '32px';
                        jetFogo.style.zIndex = '3'; // Atrás do jetpack
                        jetFogo.style.imageRendering = 'pixelated';
                        jetFogo.style.pointerEvents = 'none';
                        jetFogo.style.display = 'none';
                        inimigo.elemento.parentElement.appendChild(jetFogo);
                        inimigo.jetFogoElemento = jetFogo;
                    }

                    // Cria o elemento visual da garra para o inimigo
                    if (!inimigo.garraElemento) {
                        const garra = document.createElement('img');
                        garra.src = config.spriteGarraPlayer || 'assets/personagem/garra.png';
                        garra.style.position = 'absolute';
                        garra.style.width = '32px';
                        garra.style.height = '32px';
                        garra.style.zIndex = '9';
                        garra.style.imageRendering = 'pixelated';
                        garra.style.pointerEvents = 'none';
                        garra.style.display = inimigo.temGarra ? 'block' : 'none';
                        inimigo.elemento.parentElement.appendChild(garra);
                        inimigo.garraElemento = garra;
                    }
                }
                // End of one-time initialization block

                // Atualiza timers de chute
                if (inimigo.tempoChute > 0) inimigo.tempoChute--;
                if (inimigo.cooldownChute > 0) inimigo.cooldownChute--;
                if (inimigo.cooldownTiro > 0) inimigo.cooldownTiro--;
                if (inimigo.puloTimer > 0) inimigo.puloTimer--; // Decrementa o timer de pulo
                if (inimigo.tempoAfastamento > 0) inimigo.tempoAfastamento--;
                if (inimigo.cooldownAfastamento > 0) inimigo.cooldownAfastamento--;
                if (inimigo.cooldownPulo > 0) inimigo.cooldownPulo--;
                if (inimigo.cooldownVooJetpack > 0) inimigo.cooldownVooJetpack--;
                if (inimigo.cooldownGarra > 0) inimigo.cooldownGarra--; // Decrementa o cooldown da garra

                // Lógica da Animação da Garra (Estilo Cartoon) para o inimigo
                if (inimigo.temGarra && inimigo.garraAnimEstado !== 'idle' && !inimigo.stunned) {
                    const velGarra = 8; // Velocidade do esticamento
                    const distMax = 32 * 5; // 5 blocos limite de esticamento (160px)
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
                        inimigo.garraElemento.src = 'assets/personagem/garra_using1.png';
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
                            inimigo.garraAnimEstado = 'catching';
                            inimigo.garraTimer = 18;
                            inimigo.garraElemento.src = 'assets/personagem/garra_catching.png';
                        } else {
                            inimigo.garraDist = proxDist;
                        }

                        inimigo.garraElemento.src = 'assets/personagem/garra_using1.png';
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
                        const hitboxPlayer = {
                            x: window.playerControle.x + (window.playerControle.offsetX || 0),
                            y: window.playerControle.y,
                            largura: window.playerControle.largura,
                            altura: window.playerControle.altura
                        };

                        if (detectarColisaoHitbox(hitboxGarra, hitboxPlayer, 0, 0, 0)) {
                            inimigo.garraItemCarregado = window.playerControle;
                            window.playerControle.stunned = true;
                            window.playerControle.stunTimer = config.garraStunDurationPlayer || 120; // Default 2 seconds
                            window.playerControle.elemento.style.filter = 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)';
                            inimigo.garraAnimEstado = 'voltando';
                            inimigo.garraElemento.src = 'assets/personagem/garra_catching.png';
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
                                    inimigo.garraAnimEstado = 'voltando';
                                    inimigo.garraElemento.src = 'assets/personagem/garra_catching.png';
                                    grabbedSomething = true;
                                    break;
                                }
                            }
                        }

                        // Cria segmentos do braço
                        if (inimigo.garraDist > 0 && inimigo.garraDist % 32 < velGarra && inimigo.garraDist <= distMax) {
                            const braco = document.createElement('img');
                            braco.src = (inimigo.garraBracos.length === 0) ? 'assets/personagem/garra_using2.png' : 'assets/personagem/garra_braco.png';
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
                        if (inimigo.garraDist >= distMax && inimigo.garraItemCarregado === null) {
                            inimigo.garraAnimEstado = 'catching';
                            inimigo.garraTimer = 18;
                            inimigo.garraElemento.src = 'assets/personagem/garra_catching.png';
                        }
                    } else if (inimigo.garraAnimEstado === 'catching') {
                        inimigo.garraTimer--;
                        if (inimigo.garraTimer <= 0) inimigo.garraAnimEstado = 'voltando';
                    } else if (inimigo.garraAnimEstado === 'voltando') {
                        inimigo.garraDist -= velGarra;
                        if (inimigo.garraItemCarregado && inimigo.garraItemCarregado.elemento) {
                            inimigo.garraElemento.src = 'assets/personagem/garra_catching.png'; // Mantém o sprite de "pegando" durante a retração
                            const carried = inimigo.garraItemCarregado;
                            carried.elemento.style.left = inimigo.garraElemento.style.left;
                            carried.elemento.style.bottom = inimigo.garraElemento.style.bottom;
                            
                            // Atualiza coordenadas lógicas (importante para o player não teleportar ao ser solto)
                            carried.x = parseInt(inimigo.garraElemento.style.left);
                            carried.y = parseInt(inimigo.garraElemento.style.bottom);

                            // If player is carried, update their associated elements too
                            if (inimigo.garraItemCarregado.id === 'player') {
                                if (window.playerControle.armaElemento) window.playerControle.armaElemento.style.left = inimigo.garraElemento.style.left;
                                if (window.playerControle.armaElemento) window.playerControle.armaElemento.style.bottom = inimigo.garraElemento.style.bottom;
                                if (window.playerControle.escudoElemento) window.playerControle.escudoElemento.style.left = inimigo.garraElemento.style.left;
                                if (window.playerControle.escudoElemento) window.playerControle.escudoElemento.style.bottom = inimigo.garraElemento.style.bottom;
                                if (window.playerControle.botaElemento) window.playerControle.botaElemento.style.left = inimigo.garraElemento.style.left;
                                if (window.playerControle.botaElemento) window.playerControle.botaElemento.style.bottom = inimigo.garraElemento.style.bottom;
                                if (window.playerControle.jetpackElemento) window.playerControle.jetpackElemento.style.left = inimigo.garraElemento.style.left;
                                if (window.playerControle.jetpackElemento) window.playerControle.jetpackElemento.style.bottom = inimigo.garraElemento.style.bottom;
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
                                if (!playerAtingido.temEscudo || playerAtingido.escudoVermelho) {
                                    playerAtingido.dano = (playerAtingido.dano || 0) + 1;
                                    if (typeof flashComVibacao === 'function') flashComVibacao(playerAtingido.elemento);
                                    const limiteVida = playerAtingido.maxVida || 3;
                                    if (playerAtingido.dano >= limiteVida) {
                                        playerAtingido.dano = 0;
                                        alert("Game Over! Você foi derrotado pela garra inimiga.");
                                        if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
                                    }
                                } else {
                                    playerAtingido.escudoProtegido = (playerAtingido.escudoProtegido || 0) + 1;
                                    const tirosProtegidos = Number(config.escudoTirosProtegidos ?? 3);
                                    if (typeof flashElement === 'function' && window.escudoElemento) flashElement(window.escudoElemento, 150, 6);
                                    if (playerAtingido.escudoProtegido >= tirosProtegidos) playerAtingido.escudoVermelho = true;
                                    window.atualizarVisualEscudo();
                                    window.salvarInventario();
                                }

                                // Knockback player
                                const direcaoKnockback = (inimigo.direcao === 'd' ? 1 : -1);
                                const valorKnockback = obterKnockbackRecebido(config, 'inimigoChute'); // Reusing kick knockback
                                const duracaoRecuo = 15;
                                playerAtingido.framesKnockbackRestante = duracaoRecuo;
                                playerAtingido.velocidadeKnockback = (valorKnockback / duracaoRecuo) * direcaoKnockback;

                            } else { // It's an item
                                // Enemy collects the item
                                inimigoColetarItemGarra(inimigo, inimigo.garraItemCarregado);
                            }
                            inimigo.garraItemCarregado = null;
                            inimigo.garraAnimEstado = 'idle';
                            inimigo.garraElemento.src = config.spriteGarraPlayer || 'assets/personagem/garra.png';
                            inimigo.garraBracos.forEach(b => b.remove());
                            inimigo.garraBracos = [];
                            inimigo.cooldownGarra = 120; // Define cooldown de 2 segundos (120 frames)
                        }
                        if (inimigo.garraDist <= 0 && inimigo.garraItemCarregado === null) {
                            inimigo.garraAnimEstado = 'idle';
                            inimigo.garraElemento.src = config.spriteGarraPlayer || 'assets/personagem/garra.png';
                            inimigo.garraBracos.forEach(b => b.remove());
                            inimigo.garraBracos = [];
                            inimigo.cooldownGarra = 120; // Define cooldown de 2 segundos (120 frames)
                        }
                    }
                }

                // Aplica knockback se estiver ativo
                if (inimigo.framesKnockbackRestante > 0) {
                    inimigo.x += inimigo.velocidadeKnockback;
                    inimigo.framesKnockbackRestante--;
                }
                // Decrementa o timer de stun
                if (inimigo.stunTimer > 0) inimigo.stunTimer--;

                // Lógica de Stun: Se o inimigo estiver atordoado, ele não faz mais nada
                if (inimigo.stunned) {
                    if (inimigo.stunTimer <= 0) {
                        inimigo.stunned = false; // Fim do stun
                        console.log(`Inimigo em x:${inimigo.x} não está mais atordoado.`);
                    } else {
                        // Faz o inimigo olhar de um lado para o outro
                        if (inimigo.stunTimer % 15 === 0) { // Troca de direção a cada 15 frames (aprox. 0.25s)
                            inimigo.direcao = (inimigo.direcao === 'd' ? 'e' : 'd');
                            inimigo.elemento.style.transform = inimigo.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
                        }
                        continue; // Pula o restante da lógica de IA para este inimigo
                    }
                }

                // Lógica de detecção de proximidade excessiva com o jogador
                const distanciaX = Math.abs(playerX - inimigo.x);
                const distanciaY = Math.abs(playerY - inimigo.y);
                const distanciaMinima = config.inimigoDistanciaMinimaAtaque || 20;

                if (inimigo.perseguindo && distanciaX <= distanciaMinima && distanciaY <= distanciaMinima && !inimigo.afastando && inimigo.tempoAfastamento === 0 && inimigo.cooldownAfastamento === 0) {
                    // Inimigo está muito próximo do jogador - inicia afastamento
                    inimigo.afastando = true;
                    inimigo.tempoAfastamento = config.inimigoTempoAfastamento || 30;
                    // console.log('Inimigo muito próximo do jogador - iniciando afastamento');
                }

                // Lógica de afastamento
                if (inimigo.afastando && inimigo.tempoAfastamento > 0) {
                    const velocidadeAfastamento = config.inimigoVelocidadeAfastamento || 3;
                    // Afasta-se na direção oposta ao jogador
                    if (inimigo.x < playerX) {
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
                } else if (inimigo.afastando && inimigo.tempoAfastamento === 0) {
                    // Terminou o afastamento - volta ao comportamento normal
                    inimigo.afastando = false;
                    inimigo.cooldownAfastamento = config.inimigoCooldownAfastamento || 60;
                    // console.log('Inimigo terminou afastamento - cooldown iniciado');
                }

                // Lógica de detecção de projétil vindo (radar de ameaça)
                const projVindo = window.projeteis ? window.projeteis.find(proj => {
                    // Distância ao inimigo na direção do projétil
                    const dx = proj.direcao === 1 ? inimigo.x - proj.x : proj.x - inimigo.x;
                    const dy = Math.abs((proj.y + config.PROJETIL_ALTURA / 2) - (inimigo.y + config.HITBOX_ALTURA / 2));
                    const chegaPerto = dx >= 0 && dx <= config.inimigoPuloDistanciaAlerta;
                    const mesmaAltura = dy <= config.HITBOX_ALTURA;
                    const vemNaDirecao = (proj.direcao === 1 && proj.x < inimigo.x) || (proj.direcao === -1 && proj.x > inimigo.x);
                    
                    if (chegaPerto && mesmaAltura && vemNaDirecao) {
                        // console.log('Inimigo detectou projétil vindo em sua direção!');
                    }
                    return chegaPerto && mesmaAltura && vemNaDirecao;
                }) : null;

                // Unificação da força de pulo: todos os tipos usam a mesma base numérica
                let forcaPuloInimigo = Number(config.inimigoForcaPulo ?? 12);
                if (inimigo.tipo === 3) {
                    forcaPuloInimigo += Number(config.bonusPuloBota ?? 1.5);
                }

                // Ativa a perseguição se o jogador estiver perto OU se detectar um tiro vindo no radar
                if (!inimigo.perseguindo && (distanciaAtual <= distanciaAtivacao || projVindo || itemInteresse || (inimigo.temGarra && distanciaAtual <= (config.garraAlcanceInimigo || 160)))) {
                    inimigo.perseguindo = true;
                    // console.log("Inimigo ativado! Motivo: " + (projVindo ? "Tiro detectado" : "Proximidade"));
                }

                // Lógica de pulo de desvio (usa o projVindo detectado acima)
                if (projVindo && inimigo.noChao && inimigo.puloTimer === 0 && !inimigo.jumpQueued) {
                    // Define um delay randômico antes de pular
                    inimigo.puloTimer = Math.floor(Math.random() * (config.inimigoPuloDelayMax - config.inimigoPuloDelayMin + 1)) + config.inimigoPuloDelayMin;
                    inimigo.jumpQueued = true; // Marca que um pulo foi agendado
                }

                // Executa o pulo ou VOO se o timer chegou a zero e foi agendado
                if (inimigo.puloTimer === 0 && inimigo.jumpQueued) {
                    if (inimigo.temJetpack && !inimigo.jetpackAtivo && inimigo.cooldownVooJetpack === 0) {
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
                        inimigo.jetpackAtivo = false;
                        inimigo.velocidadeY = 0;
                        inimigo.cooldownVooJetpack = config.jetpackCooldown || 180;
                    } 
                    // Lógica de Desativação 2: Contato com o solo.
                    // O inimigo interrompe o voo ao pousar em uma plataforma, preservando o combustível restante.
                    else if (inimigo.noChao && inimigo.framesVoando > 10) {
                        inimigo.jetpackAtivo = false;
                        inimigo.velocidadeY = 0;
                    }
                } else if (typeof aplicarFisica === 'function') {
                    const inimigoTeclasParaFisica = { ' ': window.debugInimigoTeclas && window.debugInimigoTeclas[' '] };
                    aplicarFisica(inimigo, inimigoTeclasParaFisica, forcaPuloInimigo, config.inimigoGravidade, config.inimigoPuloCooldown);
                }

                // Colisão Vertical constante para garantir que o inimigo pule e caia corretamente
                inimigo.noChao = false;
                const hitV = typeof verificarColisaoComTiles === 'function' ? verificarColisaoComTiles(inimigo.x + (inimigo.offsetX || 0), inimigo.y, inimigo.largura, inimigo.altura, window.plataformas) : null;

                if (hitV) {
                    if (inimigo.velocidadeY < 0) {
                        inimigo.noChao = true;
                        inimigo.velocidadeY = 0;
                        inimigo.y = (typeof hitV === 'object') ? hitV.topoReal : Math.floor((inimigo.y + EPSILON) / 32 + 1) * 32;
                        inimigo.puloTimer = 0;
                        inimigo.jumpQueued = false;
                    } else if (inimigo.velocidadeY > 0) {
                        inimigo.velocidadeY = 0;
                        inimigo.y = (typeof hitV === 'object') ? (hitV.baseReal - inimigo.altura) : Math.floor((inimigo.y + inimigo.altura) / 32) * 32 - inimigo.altura;
                    }
                }

                // Remove o inimigo se ele cair no buraco (fora da tela)
                if (inimigo.y < -64) {
                    if (inimigo.armaElemento) inimigo.armaElemento.remove();
                    if (inimigo.botaElemento) inimigo.botaElemento.remove();
                    if (inimigo.escudoElemento) inimigo.escudoElemento.remove();
                    if (inimigo.jetpackElemento) inimigo.jetpackElemento.remove();
                    if (inimigo.jetFogoElemento) inimigo.jetFogoElemento.remove();
                    if (inimigo.garraElemento) inimigo.garraElemento.remove();
                    if (inimigo.garraBracos) inimigo.garraBracos.forEach(b => b.remove());
                    inimigo.elemento.remove();
                    window.inimigos.splice(i, 1);
                    continue;
                }

                // Lógica de Coleta de Itens pelos Inimigos
                if (!inimigo.estaColetando && !inimigo.afastando && !estaChutando && window.itensColetaveis) {
                    for (let j = window.itensColetaveis.length - 1; j >= 0; j--) {
                        const item = window.itensColetaveis[j];
                        // Verifica colisão simples entre inimigo e item
                        if (inimigo.x < item.x + 32 && inimigo.x + 32 > item.x &&
                            inimigo.y < item.y + 32 && inimigo.y + 32 > item.y) {
                            
                            // O inimigo só tenta pegar o que ele ainda não tem
                            if (item.tipo !== 'airdrop' && 
                                ((item.tipo === 'revolver' && inimigo.temArma && inimigo.municao > 0) ||
                                 (item.tipo === 'escudo' && inimigo.temEscudo) ||
                                 (item.tipo === 'bota' && inimigo.temBota) ||
                                 (item.tipo === 'jetpack' && inimigo.temJetpack) ||
                                 (item.tipo === 'garra' && inimigo.temGarra))) continue;

                            // Se for um item de restauração, o inimigo só coleta se precisar
                            if (item.tipo === 'restauracao') {
                                const precisaRestaurarMunicao = inimigo.temArma && inimigo.municao < (config.maxMunicao || 5);
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
                    // Olha de um lado para o outro a cada 30 frames
                    if (inimigo.timerColeta % 30 === 0) {
                        inimigo.direcao = (inimigo.direcao === 'd' ? 'e' : 'd');
                        inimigo.elemento.style.transform = inimigo.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
                    }

                    if (inimigo.timerColeta <= 0) {
                        const item = inimigo.itemSendoColetado;
                        const itemIndex = window.itensColetaveis.indexOf(item);
                        if (itemIndex !== -1) {
                            if (item.tipo === 'revolver') { inimigo.temArma = true; inimigo.municao = config.maxMunicao || 5; if (inimigo.armaElemento) inimigo.armaElemento.style.display = 'block'; }
                            else if (item.tipo === 'escudo') { inimigo.temEscudo = true; inimigo.escudoVermelho = false; inimigo.escudoProtegido = 0; if (inimigo.escudoElemento) inimigo.escudoElemento.style.display = 'block'; }
                            else if (item.tipo === 'bota') { inimigo.temBota = true; if (inimigo.botaElemento) inimigo.botaElemento.style.display = 'block'; }
                            else if (item.tipo === 'jetpack') { inimigo.temJetpack = true; if (inimigo.jetpackElemento) inimigo.jetpackElemento.style.display = 'block'; }
                            else if (item.tipo === 'garra') { inimigo.temGarra = true; if (inimigo.garraElemento) inimigo.garraElemento.style.display = 'block'; }
                            else if (item.tipo === 'restauracao') { // NEW: Enemy collects restoration item
                                inimigo.municao = config.maxMunicao || 5;
                                inimigo.escudoProtegido = 0;
                                inimigo.escudoVermelho = false;
                                inimigo.vida = Math.max(0, (inimigo.vida || 0) - 1);
                                if (inimigo.inventario.includes('escudo')) { // Only restore if they had one
                                    inimigo.temEscudo = true;
                                }
                                console.log("IA: Inimigo coletou item de restauração!");
                            }

                            else if (item.tipo === 'airdrop') {
                                // Lógica restrita para o inimigo: apenas 'item' ou 'restauracao'
                                const conteudos = config.airdrop1?.conteudos || ['item'];
                                const validosParaIA = conteudos.filter(c => c === 'item' || c === 'restauracao');
                                
                                // Se não houver nada válido na config, assume 'item' como padrão
                                const sorteio = validosParaIA.length > 0 
                                    ? validosParaIA[Math.floor(Math.random() * validosParaIA.length)] 
                                    : 'item';

                                if (sorteio === 'restauracao') {
                                    inimigo.municao = config.maxMunicao || 5;
                                    inimigo.escudoProtegido = 0;
                                    inimigo.escudoVermelho = false;
                                    inimigo.vida = Math.max(0, (inimigo.vida || 0) - 1);
                                    if (inimigo.inventario.includes('escudo')) { // Only restore if they had one
                                        inimigo.temEscudo = true;
                                    }
                                    console.log("IA: Inimigo restaurou equipamentos via AirDrop!");
                                } else {
                                    // Sorteia um equipamento que o inimigo ainda não possua
                                    const pendentes = [];
                                    if (!inimigo.temArma) pendentes.push('revolver');
                                    if (!inimigo.temEscudo) pendentes.push('escudo');
                                    if (!inimigo.temBota) pendentes.push('bota');
                                    if (!inimigo.temJetpack) pendentes.push('jetpack');
                                    if (!inimigo.temGarra) pendentes.push('garra');

                                    if (pendentes.length > 0) {
                                        const novo = pendentes[Math.floor(Math.random() * pendentes.length)];
                                        if (novo === 'revolver') { inimigo.temArma = true; inimigo.municao = config.maxMunicao; if (inimigo.armaElemento) inimigo.armaElemento.style.display = 'block'; }
                                        else if (novo === 'escudo') { inimigo.temEscudo = true; inimigo.escudoVermelho = false; inimigo.escudoProtegido = 0; if (inimigo.escudoElemento) inimigo.escudoElemento.style.display = 'block'; }
                                        else if (novo === 'bota') { inimigo.temBota = true; if (inimigo.botaElemento) inimigo.botaElemento.style.display = 'block'; }
                                        else if (novo === 'jetpack') { inimigo.temJetpack = true; if (inimigo.jetpackElemento) inimigo.jetpackElemento.style.display = 'block'; }
                                        else if (novo === 'garra') { inimigo.temGarra = true; if (inimigo.garraElemento) inimigo.garraElemento.style.display = 'block'; }
                                        inimigo.inventario.push(novo);
                                    }
                                }
                            }
                            
                            if (item.tipo !== 'airdrop' && item.tipo !== 'restauracao') inimigo.inventario.push(item.tipo); // 'restauracao' is consumed, not inventoried
                            item.elemento.remove();
                            window.itensColetaveis.splice(itemIndex, 1);
                        }
                        inimigo.estaColetando = false;
                    }
                }

                let movendoDestaVez = false;
                // Ações que dependem da ativação (movimento e ataque) - só se não estiver afastando, coletando ou usando a garra
                if (inimigo.perseguindo && !inimigo.afastando && !inimigo.estaColetando) {
                    // Lógica para INICIAR o chute
                    if (distanciaAtual <= config.distanciaAtaqueInimigo && inimigo.cooldownChute === 0) {
                        inimigo.tempoChute = config.tempoChute;
                        inimigo.cooldownChute = config.cooldownChute;
                        inimigo.jaAtacouNesteChute = false;

                        // Dash do inimigo (Suave e com bônus de bota)
                        const duracaoDash = 10;
                        const multiplicadorChute = inimigo.temBota ? 2 : 1;
                        
                        inimigo.framesImpulsoRestante = duracaoDash;
                        inimigo.velocidadeDash = (config.impulsoChute * multiplicadorChute) / duracaoDash;
                    }

                    // Lógica para INICIAR o disparo
                    if (inimigo.temArma && distanciaAtual <= alcanceTiro && distanciaAtual > config.distanciaAtaqueInimigo && inimigo.cooldownTiro === 0 && inimigo.municao > 0) {
                        inimigo.cooldownTiro = config.cooldownTiro;
                        inimigo.municao--;
                        
                        const dir = inimigo.direcao === 'd' ? 1 : -1;
                        const xPartida = (inimigo.direcao === 'd') ? inimigo.x + 32 : inimigo.x - config.PROJETIL_LARGURA;
                        const yPartida = inimigo.y + 12;

                        const projElemento = document.createElement('img');
                        projElemento.src = config.spriteProjetil;
                        projElemento.style.position = 'absolute';
                        projElemento.style.width = config.PROJETIL_LARGURA + 'px';
                        projElemento.style.height = config.PROJETIL_ALTURA + 'px';
                        projElemento.style.zIndex = '10';
                        projElemento.style.left = xPartida + 'px';
                        projElemento.style.bottom = yPartida + 'px';
                        projElemento.style.imageRendering = 'pixelated';
                        inimigo.elemento.parentElement.appendChild(projElemento);

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
                        
                        // console.log(`Inimigo disparou! Munição restante: ${inimigo.municao}`);
                    }

                    // Lógica de perseguição: move-se na direção do Alvo (AirDrop ou Player)
                    // Aumentamos a margem de parada baseada na velocidade para evitar travamentos
                    if (inimigo.x < xAlvo - velAtiva) {
                        if (inimigo.tempoChute === 0 && inimigo.garraAnimEstado === 'idle') {
                            inimigo.x += velAtiva;
                            inimigo.direcao = 'd';
                            movendoDestaVez = true;
                        }
                    } else if (inimigo.x > xAlvo + velAtiva) {
                        if (inimigo.tempoChute === 0 && inimigo.garraAnimEstado === 'idle') {
                            inimigo.x -= velAtiva;
                            inimigo.direcao = 'e';
                            movendoDestaVez = true;
                        }
                    }

                    // Lógica para INICIAR a Garra (se tiver e estiver no alcance)
                    if (inimigo.temGarra && inimigo.garraAnimEstado === 'idle' && inimigo.cooldownGarra === 0 && distanciaAtual <= (config.garraAlcanceInimigo || 160)) {
                        inimigo.garraAnimEstado = 'prep';
                        inimigo.garraTimer = 18;
                        inimigo.garraDirecaoAnim = (inimigo.x < playerX) ? 'd' : 'e';
                    }
                } else if (!inimigo.perseguindo && !inimigo.stunned && !inimigo.estaColetando) {
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
                        
                        // Verificação de segurança (parede ou buraco à frente)
                        const margemCheck = (inimigo.direcaoPatrulha === 'd' ? 20 : -20);
                        const checkX = inimigo.x + (inimigo.offsetX || 0) + (inimigo.largura / 2) + margemCheck;
                        
                        const temChao = typeof verificarColisaoComTiles === 'function' && 
                                        verificarColisaoComTiles(checkX, inimigo.y - 10, 2, 2, window.plataformas);
                        const temParede = typeof verificarColisaoComTiles === 'function' && 
                                          verificarColisaoComTiles(checkX, inimigo.y + 10, 2, 2, window.plataformas);

                        if (temChao && !temParede) {
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

                // Lógica de Pulo por Diferença de Altura (Apenas se estiver perseguindo)
                if (inimigo.perseguindo && inimigo.noChao && (inimigo.cooldownPulo || 0) === 0 && yAlvo > inimigo.y + 31) {
                    const distXAlvo = Math.abs(xAlvo - inimigo.x);
                    if (distXAlvo < 64 && inimigo.puloTimer === 0 && !inimigo.jumpQueued) {
                        inimigo.puloTimer = Math.floor(Math.random() * (config.inimigoPuloDelayMax - config.inimigoPuloDelayMin + 1)) + config.inimigoPuloDelayMin;
                        inimigo.jumpQueued = true;
                    }
                }

                // Lógica de Salto de Fé (Gap Jumping - Apenas se estiver perseguindo)
                if (inimigo.perseguindo && movendoDestaVez && inimigo.noChao && (inimigo.cooldownPulo || 0) === 0) {
                    const checkX = (inimigo.direcao === 'd') 
                        ? inimigo.x + (inimigo.offsetX || 0) + inimigo.largura + 10 
                        : inimigo.x + (inimigo.offsetX || 0) - 10;
                    
                    const checkY = inimigo.y - 10;
                    
                    if (typeof verificarColisaoComTiles === 'function' &&
                        !verificarColisaoComTiles(checkX, checkY, 2, 2, window.plataformas) && inimigo.puloTimer === 0 && !inimigo.jumpQueued) {
                        const minDelay = config.inimigoPuloDelayMinGap ?? 0;
                        const maxDelay = config.inimigoPuloDelayMaxGap ?? 10;
                        inimigo.puloTimer = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
                        inimigo.jumpQueued = true;
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

                    if (typeof atualizarAnimacao === 'function') {
                        atualizarAnimacao(
                            controleAnimacao, 
                            inimigo.elemento, 
                            config.spriteParadoInimigo || spriteParado, 
                            config.spriteAndandoInimigo || spriteAndando
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
                if (inimigo.perseguindo && inimigo.tempoChute > 0 && !inimigo.jaAtacouNesteChute && window.playerControle) {
                    let ataqueX = (inimigo.direcao === 'd') 
                        ? inimigo.x + config.ATAQUE_OFFSET_X 
                        : inimigo.x + (32 - config.ATAQUE_OFFSET_X - config.ATAQUE_LARGURA);

                    const hitboxAtaqueInimigo = {
                        x: ataqueX,
                        y: inimigo.y + config.ATAQUE_OFFSET_Y,
                        largura: config.ATAQUE_LARGURA,
                        altura: config.ATAQUE_ALTURA
                    };

                    const hurtboxPlayer = { 
                        x: window.playerControle.x + (window.playerControle.offsetX || 0), 
                        y: window.playerControle.y, 
                        largura: window.playerControle.largura, 
                        altura: window.playerControle.altura 
                    };

                    if (typeof detectarColisaoHitbox === 'function' && 
                        detectarColisaoHitbox(hitboxAtaqueInimigo, hurtboxPlayer, 0, 0, 0)) {
                        
                        inimigo.jaAtacouNesteChute = true;
                        
                        const escudoAtivo = temEscudoAtivo();
                        if (!escudoAtivo) {
                            window.playerControle.dano = (window.playerControle.dano || 0) + 1;
                            
                            if (typeof flashComVibacao === 'function') {
                                flashComVibacao(document.getElementById('player'));
                            }
                        } else {
                            if (typeof piscaLeve === 'function' && window.escudoElemento) {
                                piscaLeve(window.escudoElemento);
                            }
                        }
                        
                        const direcaoKnockback = (inimigo.direcao === 'd' ? 1 : -1);
                        const valorKnockback = obterKnockbackRecebido(config, 'inimigoChute');
                        const duracaoRecuo = 15;
                        
                        window.playerControle.framesKnockbackRestante = duracaoRecuo;
                        window.playerControle.velocidadeKnockback = (valorKnockback / duracaoRecuo) * direcaoKnockback;

                        const limiteVida = window.playerControle.maxVida || 3;
                        if (window.playerControle.dano >= limiteVida) {
                            window.playerControle.dano = 0;
                            alert("Game Over! Você foi derrotado pelos inimigos.");
                            if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
                        }
                    }
                }

                // Colisão Horizontal com as laterais das plataformas (após perseguição/dash)
                if (typeof verificarColisaoComTiles === 'function' && 
                    verificarColisaoComTiles(inimigo.x + (inimigo.offsetX || 0), inimigo.y, inimigo.largura, inimigo.altura, window.plataformas)) {
                    
                    // Item 1: Pulo por Obstrução (Wall Detection)
                    if (inimigo.noChao && (inimigo.cooldownPulo || 0) === 0 && inimigo.puloTimer === 0 && !inimigo.jumpQueued) {
                        // Agenda o pulo com um delay aleatório
                        inimigo.puloTimer = Math.floor(Math.random() * (config.inimigoPuloDelayMax - config.inimigoPuloDelayMin + 1)) + config.inimigoPuloDelayMin;
                        inimigo.jumpQueued = true;
                        // console.log('Inimigo iniciou timer de pulo por obstrução:', inimigo.puloTimer, 'frames'); // Comentado conforme solicitado
                    }
                    verificarSnapInimigo(inimigo, xAnterior);
                }

                function verificarSnapInimigo(ent, xAnt) {
                    if (typeof verificarColisaoComTiles === 'function' && 
                        verificarColisaoComTiles(ent.x + (ent.offsetX || 0), ent.y, ent.largura, ent.altura, window.plataformas)) {
                        
                        if (ent.x > xAnt) { // Direita
                            ent.x = Math.floor((ent.x + (ent.offsetX || 0) + ent.largura) / 32) * 32 - ent.largura - (ent.offsetX || 0) - EPSILON;
                        } else if (ent.x < xAnt) { // Esquerda
                            ent.x = (Math.floor((ent.x + (ent.offsetX || 0)) / 32) + 1) * 32 - (ent.offsetX || 0) + EPSILON;
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

                // Sincroniza a arma com o inimigo
                if (inimigo.armaElemento) {
                    inimigo.armaElemento.style.left = inimigo.x + 'px';
                    inimigo.armaElemento.style.bottom = inimigo.y + 'px';

                    // Aplica rotação de 5 graus se estiver no estado de recuo
                    const direcaoFator = inimigo.direcao === 'e' ? 1 : -1;
                    const emRecuo = inimigo.armaElemento.dataset.recoil === 'true';
                    const anguloRecuo = emRecuo ? (5 * direcaoFator) : 0;
                    inimigo.armaElemento.style.transform = (inimigo.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)') + ` rotate(${anguloRecuo}deg)`;

                    // Aplica filtro vermelho se o inimigo estiver sem munição
                    inimigo.armaElemento.style.filter = (inimigo.municao <= 0) ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
                }

                // Sincroniza o escudo com o inimigo
                if (inimigo.escudoElemento && inimigo.temEscudo) {
                    inimigo.escudoElemento.style.left = inimigo.x + 'px';
                    inimigo.escudoElemento.style.bottom = inimigo.y + 'px';
                    inimigo.escudoElemento.style.transform = inimigo.elemento.style.transform;

                    inimigo.escudoElemento.src = config.spriteEscudoPlayer || 'assets/personagem/escudo.png';
                    // Aplica filtro vermelho se o escudo do inimigo quebrar
                    inimigo.escudoElemento.style.filter = inimigo.escudoVermelho ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
                }

                // Sincroniza a bota com o inimigo
                if (inimigo.botaElemento && inimigo.temBota) {
                    inimigo.botaElemento.style.left = inimigo.x + 'px';
                    inimigo.botaElemento.style.bottom = inimigo.y + 'px';
                    inimigo.botaElemento.style.transform = inimigo.elemento.style.transform;
                    
                    if (estaChutando) {
                        inimigo.botaElemento.src = config.spriteBotaChutando || 'assets/personagem/bota_chutando.png';
                    } else if (!inimigo.noChao) {
                        // Se estiver no ar, usa o sprite específico para o ar
                        inimigo.botaElemento.src = config.spriteBotaNoAr || 'assets/personagem/bota_no_ar.png';
                    } else if (movendoDestaVez) {
                        inimigo.botaElemento.src = (inimigo.frameAtual === 1)
                            ? (config.spriteBotaAndando || 'assets/personagem/bota_andando.png')
                            : (config.spriteBotaParado || 'assets/personagem/bota_parado.png');
                    } else {
                        inimigo.botaElemento.src = config.spriteBotaParado || 'assets/personagem/bota_parado.png';
                    }
                }

                // Sincroniza o jetpack com o inimigo
                if (inimigo.jetpackElemento && inimigo.temJetpack) {
                    inimigo.jetpackElemento.style.left = inimigo.x + 'px';
                    inimigo.jetpackElemento.style.bottom = inimigo.y + 'px';
                    inimigo.jetpackElemento.style.transform = inimigo.elemento.style.transform;

                    // Indicação visual de recarga para o inimigo: Aplica um filtro de cor vermelha no sprite durante o tempo de espera (cooldown).
                    if (inimigo.cooldownVooJetpack > 0) {
                        inimigo.jetpackElemento.style.filter = 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)';
                    } else {
                        inimigo.jetpackElemento.style.filter = 'none';
                    }

                    // Lógica do Fogo para o Inimigo
                    const subir = yAlvo > inimigo.y + 10;
                    const efeitoPisca = (inimigo.timerVooRestante % 4 < 2);
                    const tremorFogo = (Math.random() * 3) - 1.5;

                    if (inimigo.jetpackAtivo && subir && efeitoPisca) {
                        inimigo.jetFogoElemento.style.display = 'block';
                        inimigo.jetFogoElemento.style.left = inimigo.x + 'px';
                        inimigo.jetFogoElemento.style.bottom = (inimigo.y - 4 + tremorFogo) + 'px';
                        inimigo.jetFogoElemento.style.transform = inimigo.elemento.style.transform;
                    } else {
                        inimigo.jetFogoElemento.style.display = 'none';
                    }
                }

                // Sincroniza a garra com o inimigo
                if (inimigo.garraElemento && inimigo.temGarra) {
                    if (inimigo.garraAnimEstado === 'idle') { // Only sync to body if not animating
                        inimigo.garraElemento.style.left = inimigo.x + 'px';
                        inimigo.garraElemento.style.bottom = inimigo.y + 'px';
                        inimigo.garraElemento.style.transform = inimigo.elemento.style.transform;
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
