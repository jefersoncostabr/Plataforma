/**
 * Adiciona controles de movimento ao personagem.
 * 
 * @param {string} id - O ID do elemento HTML do personagem.
 * @param {number} velocidade - Velocidade de movimento em pixels por quadro.
 * @param {string} spriteParado - Caminho da imagem parado.
 * @param {string} spriteAndando - Caminho da imagem andando.
 * @param {string} spriteChute - Caminho da imagem chutando.
 */
async function iniciarMovimentacao(id, velocidade = 4, spriteParado, spriteAndando, spriteChute) {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    // Busca as configurações do arquivo JSON
    const resposta = await fetch('configuracoesGerais.json');
    const config = await resposta.json();

    function obterKnockback(config, fonte = 'default') {
        const base = Number(config.knockbackBase ?? config.knockbackInimigo ?? 150);
        const ajuste = Number(config.knockbackAjustes?.[fonte] ?? 0);
        return base + ajuste;
    }

    function temEscudoAtivo() {
        return controle.temEscudo && !controle.escudoVermelho;
    }

    const INVENTARIO_STORAGE_KEY = 'plataformaInventario';

    function obterKnockbackRecebido(fonte = 'default') {
        const valor = obterKnockback(config, fonte);
        if (temEscudoAtivo()) {
            return valor * Number(config.escudoKnockbackMultiplicador ?? 0.5);
        }
        return valor;
    }

    function carregarInventarioSalvo() {
        try {
            const raw = localStorage.getItem(INVENTARIO_STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (error) {
            console.error('Erro ao ler inventário salvo:', error);
            return null;
        }
    }

    function salvarInventario() {
        try {
            const estado = {
                temEscudo: controle.temEscudo,
                escudoVermelho: controle.escudoVermelho,
                escudoProtegido: controle.escudoProtegido,
                temArma: controle.temArma,
                municao: controle.municao,
                temBota: controle.temBota
            };
            localStorage.setItem(INVENTARIO_STORAGE_KEY, JSON.stringify(estado));
        } catch (error) {
            console.error('Erro ao salvar inventário:', error);
        }
    }

    function limparInventarioSalvo() {
        localStorage.removeItem(INVENTARIO_STORAGE_KEY);
    }

    window.salvarInventario = salvarInventario;
    window.limparInventarioSalvo = limparInventarioSalvo;
    window.carregarInventarioSalvo = carregarInventarioSalvo;

    function atualizarVisualEscudo() {
        if (controle.temEscudo || controle.escudoVermelho) {
            escudoElemento.style.display = 'block';
        } else {
            escudoElemento.style.display = 'none';
        }

        escudoElemento.src = controle.escudoVermelho
            ? (config.spriteEscudoVermelho || 'personagem/escudo_vermelho.png')
            : (config.spriteEscudoPlayer || 'personagem/escudo.png');
    }

    // Expose for restart
    window.atualizarVisualEscudo = atualizarVisualEscudo;

    // Estado interno para rastrear posição e teclas pressionadas
    const controle = {
        x: parseInt(elemento.style.left) || 0,
        y: parseInt(elemento.style.bottom) || 0,
        velocidadeY: 0,
        noChao: false,
        movendoHorizontal: false,
        direcao: 'd',
        chutando: false,
        tempoChute: 0,
        framesImpulsoRestante: 0,
        velocidadeDash: 0,
        framesKnockbackRestante: 0,
        velocidadeKnockback: 0,
        cooldownChute: 0,
        cooldownPulo: 0,
        cooldownTiro: 0,
        municao: 0, // Inicia sem munição
        temArma: false, // Inicia sem a capacidade de atirar
        temEscudo: false, // Inicia sem escudo
        temBota: false, // Inicia sem bota
        escudoVermelho: false,
        escudoProtegido: 0,
        dano: 0,
        teclas: {}
    };

    window.playerControle = controle;
    window.projeteis = [];
    window.itensColetaveis = [];

    const inventarioSalvo = carregarInventarioSalvo();
    if (inventarioSalvo) {
        controle.temEscudo = Boolean(inventarioSalvo.temEscudo);
        controle.escudoVermelho = Boolean(inventarioSalvo.escudoVermelho);
        controle.escudoProtegido = Number(inventarioSalvo.escudoProtegido ?? 0);
        controle.temArma = Boolean(inventarioSalvo.temArma);
        controle.municao = Number(inventarioSalvo.municao ?? 0);
        controle.temBota = Boolean(inventarioSalvo.temBota);
    }

    // Função para resetar/spawnar itens baseados no JSON da fase
    window.resetarItens = (dadosItens) => {
        // O array é limpo aqui; limparCenario já remove as imagens do DOM
        window.itensColetaveis = [];
        if (!dadosItens) return;

        dadosItens.forEach(dado => {
            if ((dado.tipo === 'escudo' && controle.temEscudo) || 
                (dado.tipo === 'revolver' && controle.temArma) ||
                (dado.tipo === 'bota' && controle.temBota)) {
                return;
            }

            const pos = typeof gridParaPixels === 'function' ? gridParaPixels(dado.pos) : {x: 0, y: 0};
            const itemImg = document.createElement('img');
            
            // Define o sprite baseado no tipo (escudo, bota ou revolver)
            if (dado.tipo === 'escudo') {
                itemImg.src = config.spriteItemEscudo || 'personagem/escudo_pegavel.png';
            } else if (dado.tipo === 'bota') {
                itemImg.src = config.spriteItemBota || 'personagem/bota_pegavel.png';
            } else {
                itemImg.src = config.spriteItemRevolver || 'personagem/revolver_pegavel.png';
            }

            itemImg.style.position = 'absolute';
            itemImg.style.width = '32px';
            itemImg.style.height = '32px';
            itemImg.style.left = pos.x + 'px';
            itemImg.style.bottom = pos.y + 'px';
            itemImg.style.zIndex = '3';
            itemImg.style.imageRendering = 'pixelated';
            elemento.parentElement.appendChild(itemImg);

            window.itensColetaveis.push({
                x: pos.x, y: pos.y,
                elemento: itemImg, velocidadeY: 0,
                tipo: dado.tipo
            });
        });
    };
    
    // Elemento da arma
    const armaElemento = document.createElement('img');
    armaElemento.id = 'player-weapon';
    armaElemento.src = config.spriteArmaPlayer || 'personagem/revolver.png';
    armaElemento.style.position = 'absolute';
    armaElemento.style.width = '32px';
    armaElemento.style.height = '32px';
    armaElemento.style.zIndex = '6';
    armaElemento.style.display = 'none';
    armaElemento.style.imageRendering = 'pixelated';
    armaElemento.style.pointerEvents = 'none';
    elemento.parentElement.appendChild(armaElemento);
    armaElemento.style.display = controle.temArma ? 'block' : 'none';

    // Elemento do escudo
    const escudoElemento = document.createElement('img');
    escudoElemento.id = 'player-shield';
    escudoElemento.src = config.spriteEscudoPlayer || 'personagem/escudo.png';
    escudoElemento.style.position = 'absolute';
    escudoElemento.style.width = '32px';
    escudoElemento.style.height = '32px';
    escudoElemento.style.zIndex = '7'; // À frente da arma
    escudoElemento.style.display = 'none';
    escudoElemento.style.imageRendering = 'pixelated';
    escudoElemento.style.pointerEvents = 'none';
    elemento.parentElement.appendChild(escudoElemento);
    atualizarVisualEscudo();

    // Elemento da bota
    const botaElemento = document.createElement('img');
    botaElemento.id = 'player-boots';
    botaElemento.src = config.spriteBotaParado || 'personagem/bota_parado.png';
    botaElemento.style.position = 'absolute';
    botaElemento.style.width = '32px';
    botaElemento.style.height = '32px';
    botaElemento.style.zIndex = '8'; // Garantir que fique acima do personagem e outros itens
    botaElemento.style.display = controle.temBota ? 'block' : 'none';
    botaElemento.style.imageRendering = 'pixelated';
    botaElemento.style.pointerEvents = 'none';
    elemento.parentElement.appendChild(botaElemento);

    window.debugInimigoTeclas = {}; // Inicializa o objeto para teclas de debug do inimigo

    // Detecta teclas pressionadas
    window.addEventListener('keydown', (e) => {
        // Log para confirmar o valor de e.key para a barra de espaço
        if (e.key === ' ') console.log("Movimentação: KeyDown capturado -> Barra de Espaço");
        controle.teclas[e.key] = true;

        if (e.key === '8') {
            window.debugInimigoTeclas[' '] = true;
        }

        if (e.key === '0') {
            limparInventarioSalvo();
            console.log('Inventário salvo zerado.');
            controle.temEscudo = false;
            controle.escudoVermelho = false;
            controle.escudoProtegido = 0;
            controle.temArma = false;
            controle.municao = 0;
            controle.temBota = false;
            controle.framesKnockbackRestante = 0;
            controle.velocidadeKnockback = 0;
            botaElemento.style.display = 'none';
            atualizarVisualEscudo();
            if (typeof armaElemento !== 'undefined') {
                armaElemento.style.display = 'none';
            }
        }

        if (e.key === '9' && window.inimigos) {
            for (let i = window.inimigos.length - 1; i >= 0; i--) {
                const inimigo = window.inimigos[i];
                if (inimigo.tipo === 1) {
                    const itemImg = document.createElement('img');
                    itemImg.src = config.spriteItemRevolver || 'personagem/revolver_pegavel.png';
                    itemImg.style.position = 'absolute';
                    itemImg.style.width = '32px';
                    itemImg.style.height = '32px';
                    itemImg.style.zIndex = '3';
                    elemento.parentElement.appendChild(itemImg);
                    window.itensColetaveis.push({
                        x: inimigo.x, y: inimigo.y,
                        elemento: itemImg, velocidadeY: 0,
                        tipo: 'revolver'
                    });
                }
                    if (inimigo.temEscudo) {
                        const itemImg = document.createElement('img');
                        itemImg.src = config.spriteItemEscudo || 'personagem/escudo_pegavel.png';
                        itemImg.style.position = 'absolute';
                        itemImg.style.width = '32px';
                        itemImg.style.height = '32px';
                        itemImg.style.zIndex = '3';
                        elemento.parentElement.appendChild(itemImg);
                        window.itensColetaveis.push({ x: inimigo.x, y: inimigo.y, elemento: itemImg, velocidadeY: 0, tipo: 'escudo' });
                    }
                    if (inimigo.temBota) {
                        const itemImg = document.createElement('img');
                        itemImg.src = config.spriteItemBota || 'personagem/bota_pegavel.png';
                        itemImg.style.position = 'absolute';
                        itemImg.style.width = '32px';
                        itemImg.style.height = '32px';
                        itemImg.style.zIndex = '3';
                        elemento.parentElement.appendChild(itemImg);
                        window.itensColetaveis.push({ x: inimigo.x, y: inimigo.y, elemento: itemImg, velocidadeY: 0, tipo: 'bota' });
                    }
                if (inimigo.armaElemento) inimigo.armaElemento.remove();
                    if (inimigo.escudoElemento) inimigo.escudoElemento.remove();
                    if (inimigo.botaElemento) inimigo.botaElemento.remove();
                inimigo.elemento.remove();
                window.inimigos.splice(i, 1);
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        controle.teclas[e.key] = false;
        if (e.key === '8') {
            window.debugInimigoTeclas[' '] = false;
        }
    });

    function atualizar() {
        // Resetamos o estado horizontal, mas o noChao será validado pelas colisões abaixo
        const noChaoAnterior = controle.noChao;
        
        // Sincroniza o estado de chute com o timer
        controle.chutando = controle.tempoChute > 0;

        controle.movendoHorizontal = false;
        const xAnterior = controle.x;
        const yAnterior = controle.y;

        const velBase = config.velocidadePlayer || velocidade;
        let velAtiva = temEscudoAtivo()
            ? Math.max(0, velBase - (config.escudoVelocidadeReduzida ?? 2))
            : velBase;

        // Aplica o bônus de velocidade se estiver usando a bota
        if (controle.temBota) {
            velAtiva += Number(config.bonusVelocidadeBota || 2);
        }

        // Movimentação Horizontal
        if (controle.teclas['ArrowLeft'] || controle.teclas['a'] || controle.teclas['A']) {
            controle.x -= velAtiva;
            if (!controle.chutando) controle.direcao = 'e';
            controle.movendoHorizontal = true;
        }
        if (controle.teclas['ArrowRight'] || controle.teclas['d'] || controle.teclas['D']) {
            controle.x += velAtiva;
            if (!controle.chutando) controle.direcao = 'd';
            controle.movendoHorizontal = true;
        }

        // Lógica de Chute (tecla K)
        if ((controle.teclas['k'] || controle.teclas['K']) && controle.cooldownChute === 0) {
            controle.tempoChute = config.tempoChute;
            controle.cooldownChute = config.cooldownChute;

            // Configura o deslocamento suave em vez de teleporte
            const duracaoDash = 10; // O avanço levará 10 frames para completar
            const multiplicadorChute = controle.temBota ? 2 : 1;
            
            controle.framesImpulsoRestante = duracaoDash;
            // Calcula quanto o personagem deve andar por frame durante o dash
            controle.velocidadeDash = (config.impulsoChute * multiplicadorChute) / duracaoDash;

            // Reseta o estado de "atingido" de todos os inimigos para este novo chute
            if (window.inimigos) window.inimigos.forEach(inimigo => inimigo.foiAtingidoNesteChute = false);
        }

        // Aplica o impulso físico do dash durante o chute
        if (controle.framesImpulsoRestante > 0) {
            const direcaoDash = (controle.direcao === 'd' ? 1 : -1);
            controle.x += controle.velocidadeDash * direcaoDash;
            controle.framesImpulsoRestante--;
        }

        // Lógica de Disparo (tecla I)
        if ((controle.teclas['i'] || controle.teclas['I']) && controle.cooldownTiro === 0 && controle.temArma && controle.municao > 0) {
            controle.cooldownTiro = config.cooldownTiro; 
            controle.municao--;
            const dir = controle.direcao === 'd' ? 1 : -1;
            
            // Inicia na frente do personagem (considerando 32px de largura do sprite)
            const xPartida = (controle.direcao === 'd') ? controle.x + 36 : controle.x - 8;
            const yPartida = controle.y + 16; // Alinhado verticalmente com o centro

            const projElemento = document.createElement('img');
            projElemento.src = config.spriteProjetil;
            projElemento.style.position = 'absolute';
            projElemento.style.width = config.PROJETIL_LARGURA + 'px';
            projElemento.style.height = config.PROJETIL_ALTURA + 'px';
            projElemento.style.zIndex = '10'; // Garante que fique à frente do cenário
            projElemento.style.left = xPartida + 'px';
            projElemento.style.bottom = yPartida + 'px';
            projElemento.style.imageRendering = 'pixelated';
            projElemento.style.pointerEvents = 'none'; // Não interfere com cliques
            elemento.parentElement.appendChild(projElemento);

            window.projeteis.push({
                x: xPartida,
                y: yPartida,
                direcao: dir,
                elemento: projElemento,
                origem: 'player'
            });
            
            // Efeito visual de disparo na arma do jogador
            if (typeof flashRapido === 'function' && armaElemento) {
                flashRapido(armaElemento);
            }
            
            console.log(`Jogador disparou! Munição restante: ${controle.municao}`);
        }

        // Diminui o cooldown global do chute
        if (controle.cooldownChute > 0) {
            controle.cooldownChute--;
        }

        // Diminui o tempo ativo do chute
        if (controle.tempoChute > 0) {
            controle.tempoChute--;
        }

        // Diminui o cooldown do tiro
        if (controle.cooldownTiro > 0) {
            controle.cooldownTiro--;
        }

        // Diminui o cooldown do pulo
        if (controle.cooldownPulo > 0) {
            controle.cooldownPulo--;
        }

        const hitboxX = controle.x + config.HITBOX_OFFSET_X;
        const hitboxY = controle.y;
        const hitboxWidth = config.HITBOX_LARGURA;
        const hitboxHeight = config.HITBOX_ALTURA;

        // 1. Colisão Horizontal com as laterais das plataformas
        if (typeof verificarColisaoComTiles === 'function' && 
            verificarColisaoComTiles(hitboxX, hitboxY, hitboxWidth, hitboxHeight, window.plataformas)) {
            controle.x = xAnterior;
        }

        // Calcula a força do pulo final: se tiver a bota, soma o bônus definido nas configurações
        const forcaPuloFinal = controle.temBota 
            ? (config.inimigoForcaPulo + (config.bonusPuloBota || 1.5)) 
            : config.inimigoForcaPulo;

        // Aplica gravidade e pulo (definido em fisica.js)
        aplicarFisica(
            controle, 
            controle.teclas, 
            forcaPuloFinal, 
            config.inimigoGravidade, 
            config.inimigoPuloCooldown
        );

        // Resetamos o estado para ser revalidado pelas colisões verticais abaixo
        controle.noChao = false;

        // 2. Colisão Vertical para cima/baixo contra as plataformas
        if (typeof verificarColisaoComTiles === 'function' && 
            verificarColisaoComTiles(controle.x + config.HITBOX_OFFSET_X, controle.y, hitboxWidth, hitboxHeight, window.plataformas)) {
            
            if (controle.velocidadeY < 0) { // Caindo: toca o topo da plataforma
                controle.noChao = true;
                controle.velocidadeY = 0;
                controle.y = Math.floor((controle.y + 0.1) / 32 + 1) * 32;
            } else if (controle.velocidadeY > 0) { // Subindo: bate a cabeça
                controle.velocidadeY = 0;
                controle.y = Math.floor((controle.y + hitboxHeight) / 32) * 32 - hitboxHeight;
            }
        }

        // Aplica a lógica de colisão com os limites do palco
        const yHitboxAntes = controle.y;
        const posicaoAjustada = limitarPosicaoAoPalco(controle.x + config.HITBOX_OFFSET_X, controle.y, config.HITBOX_LARGURA, config.HITBOX_ALTURA);
        
        controle.x = posicaoAjustada.x - config.HITBOX_OFFSET_X;
        // Não aplicamos o ajuste automático de Y do limitarPosicaoAoPalco para permitir que o player caia
        // controle.y = posicaoAjustada.y; 

        // Detecta toque no chão: APENAS se houver colisão real com tiles de plataforma
        if (controle.noChao && controle.velocidadeY <= 0) {
            if (!noChaoAnterior && controle.noChao) console.log("Movimentação: Personagem tocou o chão.");
            controle.velocidadeY = 0;
        }

        // Condição de Game Over por queda (buraco)
        if (controle.y < -64) {
            controle.y = 0; // Reset imediato para evitar repetição do alert enquanto a fase carrega
            alert("Você caiu em um buraco!");
            if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
            requestAnimationFrame(atualizar); // Garante que o loop continue após o reset
            return; 
        }

        if (yHitboxAntes > posicaoAjustada.y) {
            // Bateu no teto
            controle.velocidadeY = 0;
        }

        // Gerencia a animação baseada no estado atual
        if (typeof atualizarAnimacao === 'function') {
            atualizarAnimacao(
                controle, 
                elemento, 
                config.spriteParadoPlayer || spriteParado, 
                config.spriteAndandoPlayer || spriteAndando
            );
        }

        // Sobrescreve o sprite se estiver chutando
        if (controle.chutando) {
            elemento.src = config.spriteChutePlayer || spriteChute;
        }

        // Verifica colisão com o objetivo final
        const hitboxPlayer = { 
            x: controle.x + config.HITBOX_OFFSET_X, 
            y: controle.y, 
            largura: config.HITBOX_LARGURA, 
            altura: config.HITBOX_ALTURA 
        };
        if (window.objetivoData && typeof detectarColisaoHitbox === 'function') {
            if (detectarColisaoHitbox(hitboxPlayer, window.objetivoData, 0, 0, 0)) {
                window.objetivoData = null; // Evita disparar a transição múltiplas vezes
                if (typeof window.proximoNivel === 'function') {
                    window.proximoNivel();
                }
            }
        }

        // Verifica colisão de Dano com Inimigos
        if (window.inimigos && Array.isArray(window.inimigos) && typeof detectarColisaoHitbox === 'function') {
            // Percorremos o array de trás para frente para remover inimigos mortos com segurança
            for (let i = window.inimigos.length - 1; i >= 0; i--) {
                const inimigo = window.inimigos[i];

                // 2. Attackbox (Ativa apenas durante o chute)
                if (controle.chutando) {
                    // Calcula o X da attackbox baseado na direção (espelhamento)
                    let ataqueX = (controle.direcao === 'd') 
                        ? controle.x + config.ATAQUE_OFFSET_X 
                        : controle.x + (32 - config.ATAQUE_OFFSET_X - config.ATAQUE_LARGURA);

                    const hitboxAtaque = {
                        x: ataqueX,
                        y: controle.y + config.ATAQUE_OFFSET_Y,
                        largura: config.ATAQUE_LARGURA,
                        altura: config.ATAQUE_ALTURA
                    };

                    const hitboxInimigo = {
                        x: inimigo.x + config.HITBOX_OFFSET_X,
                        y: inimigo.y,
                        largura: config.HITBOX_LARGURA,
                        altura: config.HITBOX_ALTURA
                    };

                    // Só aplica o dano se o inimigo ainda não foi atingido por este chute específico
                    if (!inimigo.foiAtingidoNesteChute && detectarColisaoHitbox(hitboxAtaque, hitboxInimigo, 0, 0, 0)) {
                        inimigo.foiAtingidoNesteChute = true;
                        inimigo.vida = (inimigo.vida || 0) + 1;

                        // Efeito visual no inimigo ao receber dano por chute
                        if (typeof piscaLeve === 'function') {
                            piscaLeve(inimigo.elemento);
                        }

                        // Knockback: Lança o inimigo para trás com base na direção do jogador
                        const direcaoKnockback = (controle.direcao === 'd' ? 1 : -1);
                        inimigo.x += obterKnockback(config, 'playerChute') * direcaoKnockback;

                        // Limita a posição para o inimigo não sair do palco no momento do impacto
                        if (typeof limitarPosicaoAoPalco === 'function') {
                            const posAjustada = limitarPosicaoAoPalco(inimigo.x + config.HITBOX_OFFSET_X, inimigo.y, config.HITBOX_LARGURA, config.HITBOX_ALTURA);
                            inimigo.x = posAjustada.x - config.HITBOX_OFFSET_X;
                        }

                        inimigo.elemento.style.left = inimigo.x + 'px';

                        console.log(`Ataque: Inimigo atingido! Vida restante: ${3 - inimigo.vida}`);

                        // Se atingir 3 golpes, o inimigo morre e desaparece
                        if (inimigo.vida >= 3) {
                            console.log("Ataque: Inimigo derrotado!");
                            if (inimigo.temArma) {
                                const itemImg = document.createElement('img');
                                itemImg.src = config.spriteItemRevolver || 'personagem/revolver_pegavel.png';
                                itemImg.style.position = 'absolute';
                                itemImg.style.width = '32px';
                                itemImg.style.height = '32px';
                                itemImg.style.zIndex = '3';
                                elemento.parentElement.appendChild(itemImg);
                                window.itensColetaveis.push({
                                    x: inimigo.x, y: inimigo.y,
                                    elemento: itemImg, velocidadeY: 0,
                                    tipo: 'revolver'
                                });
                            }
                            if (inimigo.temEscudo) {
                                const itemImg = document.createElement('img');
                                itemImg.src = config.spriteItemEscudo || 'personagem/escudo_pegavel.png';
                                itemImg.style.position = 'absolute';
                                itemImg.style.width = '32px';
                                itemImg.style.height = '32px';
                                itemImg.style.zIndex = '3';
                                elemento.parentElement.appendChild(itemImg);
                                window.itensColetaveis.push({
                                    x: inimigo.x, y: inimigo.y,
                                    elemento: itemImg, velocidadeY: 0,
                                    tipo: 'escudo'
                                });
                            }
                            if (inimigo.temBota) {
                                const itemImg = document.createElement('img');
                                itemImg.src = config.spriteItemBota || 'personagem/bota_pegavel.png';
                                itemImg.style.position = 'absolute';
                                itemImg.style.width = '32px';
                                itemImg.style.height = '32px';
                                itemImg.style.zIndex = '3';
                                elemento.parentElement.appendChild(itemImg);
                                window.itensColetaveis.push({
                                    x: inimigo.x, y: inimigo.y,
                                    elemento: itemImg, velocidadeY: 0,
                                    tipo: 'bota'
                                });
                            }
                            if (inimigo.armaElemento) inimigo.armaElemento.remove();
                            if (inimigo.botaElemento) inimigo.botaElemento.remove();
                            if (inimigo.escudoElemento) inimigo.escudoElemento.remove();
                            inimigo.elemento.remove();
                            window.inimigos.splice(i, 1);
                        }
                    }
                }
            }
        }

        // 4. Atualização de Projéteis
        if (window.projeteis) {
            for (let i = window.projeteis.length - 1; i >= 0; i--) {
                const proj = window.projeteis[i];
                proj.x += config.velocidadeProjetil * proj.direcao;
                proj.elemento.style.left = proj.x + 'px';

                let hitAlvo = false;

                if (proj.origem === 'player' && window.inimigos) {
                    for (let j = window.inimigos.length - 1; j >= 0; j--) {
                        const inimigo = window.inimigos[j];
                        const hitboxInimigo = {
                            x: inimigo.x + config.HITBOX_OFFSET_X,
                            y: inimigo.y,
                            largura: config.HITBOX_LARGURA,
                            altura: config.HITBOX_ALTURA
                        };

                        const hitboxProjetil = {
                            x: proj.x,
                            y: proj.y,
                            largura: config.PROJETIL_LARGURA,
                            altura: config.PROJETIL_ALTURA
                        };

                        if (detectarColisaoHitbox(hitboxProjetil, hitboxInimigo, 0, 0, 0)) {
                            inimigo.vida = (inimigo.vida || 0) + 1;

                            // Efeito visual no inimigo ao receber dano
                            if (typeof flashComVibacao === 'function') {
                                flashComVibacao(inimigo.elemento);
                            }

                            // Knockback: Lança o inimigo para trás com base na direção do projétil
                            inimigo.x += obterKnockback(config, 'playerProjetil') * proj.direcao;

                            // Limita a posição para o inimigo não sair do palco no momento do impacto
                            if (typeof limitarPosicaoAoPalco === 'function') {
                                const posAjustada = limitarPosicaoAoPalco(inimigo.x + config.HITBOX_OFFSET_X, inimigo.y, config.HITBOX_LARGURA, config.HITBOX_ALTURA);
                                inimigo.x = posAjustada.x - config.HITBOX_OFFSET_X;
                            }

                            inimigo.elemento.style.left = inimigo.x + 'px';

                            if (inimigo.vida >= 3) {
                                if (inimigo.temArma) {
                                    const itemImg = document.createElement('img');
                                    itemImg.src = config.spriteItemRevolver || 'personagem/revolver_pegavel.png';
                                    itemImg.style.position = 'absolute';
                                    itemImg.style.width = '32px';
                                    itemImg.style.height = '32px';
                                    itemImg.style.zIndex = '3';
                                    elemento.parentElement.appendChild(itemImg);
                                    window.itensColetaveis.push({
                                        x: inimigo.x, y: inimigo.y,
                                        elemento: itemImg, velocidadeY: 0,
                                        tipo: 'revolver'
                                    });
                                }
                                if (inimigo.temEscudo) {
                                    const itemImg = document.createElement('img');
                                    itemImg.src = config.spriteItemEscudo || 'personagem/escudo_pegavel.png';
                                    itemImg.style.position = 'absolute';
                                    itemImg.style.width = '32px';
                                    itemImg.style.height = '32px';
                                    itemImg.style.zIndex = '3';
                                    elemento.parentElement.appendChild(itemImg);
                                    window.itensColetaveis.push({
                                        x: inimigo.x, y: inimigo.y,
                                        elemento: itemImg, velocidadeY: 0,
                                        tipo: 'escudo'
                                    });
                                }
                            if (inimigo.temBota) {
                                const itemImg = document.createElement('img');
                                itemImg.src = config.spriteItemBota || 'personagem/bota_pegavel.png';
                                itemImg.style.position = 'absolute';
                                itemImg.style.width = '32px';
                                itemImg.style.height = '32px';
                                itemImg.style.zIndex = '3';
                                elemento.parentElement.appendChild(itemImg);
                                window.itensColetaveis.push({
                                    x: inimigo.x, y: inimigo.y,
                                    elemento: itemImg, velocidadeY: 0,
                                    tipo: 'bota'
                                });
                            }
                                if (inimigo.armaElemento) inimigo.armaElemento.remove();
                                if (inimigo.botaElemento) inimigo.botaElemento.remove();
                                if (inimigo.escudoElemento) inimigo.escudoElemento.remove();
                                inimigo.elemento.remove();
                                window.inimigos.splice(j, 1);
                            }
                            hitAlvo = true;
                            break;
                        }
                    }
                } else if (proj.origem === 'inimigo' && window.playerControle) {
                    const hitboxPlayer = { 
                        x: window.playerControle.x + config.HITBOX_OFFSET_X, 
                        y: window.playerControle.y, 
                        largura: config.HITBOX_LARGURA, 
                        altura: config.HITBOX_ALTURA 
                    };
                    const hitboxProjetil = { x: proj.x, y: proj.y, largura: config.PROJETIL_LARGURA, altura: config.PROJETIL_ALTURA };

                    if (detectarColisaoHitbox(hitboxProjetil, hitboxPlayer, 0, 0, 0)) {
                        if (temEscudoAtivo()) {
                            controle.escudoProtegido = (controle.escudoProtegido || 0) + 1;
                            const tirosProtegidos = Number(config.escudoTirosProtegidos ?? 3);
                            
                            // Efeito visual no escudo ao receber dano
                            if (typeof flashElement === 'function' && escudoElemento) {
                                flashElement(escudoElemento, 150, 6);
                            }
                            
                            if (controle.escudoProtegido >= tirosProtegidos) {
                                controle.temEscudo = false;
                                controle.escudoVermelho = true;
                                console.log('Escudo danificado: agora vermelho e sem proteção.');
                            } else {
                                console.log(`Escudo bloqueou o tiro! ${controle.escudoProtegido}/${tirosProtegidos}`);
                            }
                            atualizarVisualEscudo();
                            salvarInventario();
                        } else {
                            controle.dano = (controle.dano || 0) + 1;
                            console.log(`Dano: Jogador atingido por projétil! Total: ${controle.dano}/3`);
                            
                            // Efeito visual no jogador ao receber dano
                            if (typeof flashComVibacao === 'function') {
                                flashComVibacao(elemento);
                            }
                            
                            if (controle.dano >= 3) {
                                controle.dano = 0; // Reset imediato para evitar repetição do alert
                                alert("Game Over! Você foi derrotado pelos projéteis inimigos.");
                                if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
                            }
                        }

                        // Knockback no Jogador baseado na direção do tiro
                        const valorKnockback = obterKnockbackRecebido('inimigoProjetil');
                        const duracaoRecuo = 12; // O recuo durará 12 frames
                        controle.framesKnockbackRestante = duracaoRecuo;
                        // A velocidade por frame é o valor total dividido pela duração
                        controle.velocidadeKnockback = (valorKnockback / duracaoRecuo) * proj.direcao;
                        
                        hitAlvo = true;
                    }

                }

                const hitCenario = verificarColisaoComTiles(proj.x, proj.y, config.PROJETIL_LARGURA, config.PROJETIL_ALTURA, window.plataformas);

                // Remove o projétil se bater em algo ou sair da tela (limite de 700px)
                if (hitCenario || hitAlvo || proj.x < -50 || proj.x > 700) {
                    proj.elemento.remove();
                    window.projeteis.splice(i, 1);
                }
            }
        }

        // 5. Atualização de Itens Coletáveis (Gravidade e Colisão)
        if (window.itensColetaveis && Array.isArray(window.itensColetaveis)) {
            for (let i = window.itensColetaveis.length - 1; i >= 0; i--) {
                const item = window.itensColetaveis[i];

                // Lógica de Coleta pelo Jogador
                const hitboxItem = { x: item.x, y: item.y, largura: 32, altura: 32 };
                if (typeof detectarColisaoHitbox === 'function' && detectarColisaoHitbox(hitboxPlayer, hitboxItem, 0, 0, 0)) {
                    if (item.tipo === 'escudo') {
                        console.log("Jogador coletou o escudo!");
                        controle.temEscudo = true;
                        controle.escudoVermelho = false;
                        controle.escudoProtegido = 0;
                        escudoElemento.style.display = 'block';
                        atualizarVisualEscudo();
                        salvarInventario();
                    } else if (item.tipo === 'bota') {
                        console.log("Jogador coletou as botas!");
                        controle.temBota = true;
                        botaElemento.style.display = 'block';
                        salvarInventario();
                    } else {
                        console.log("Jogador coletou o revólver!");
                        controle.temArma = true;
                        controle.municao = config.maxMunicao || 5;
                        armaElemento.style.display = 'block';
                        salvarInventario();
                    }
                    item.elemento.remove();
                    window.itensColetaveis.splice(i, 1);
                    continue; // Pula o processamento de física para este item removido
                }

                // Aplica Gravidade
                item.velocidadeY -= config.inimigoGravidade || 0.6;
                item.y += item.velocidadeY;

                // Colisão Vertical (Chão e Plataformas)
                if (typeof verificarColisaoComTiles === 'function' && 
                    verificarColisaoComTiles(item.x, item.y, 32, 32, window.plataformas)) {
                    
                    if (item.velocidadeY < 0) { // Caindo
                        item.velocidadeY = 0;
                        item.y = Math.floor((item.y + 0.1) / 32 + 1) * 32;
                    }
                }

                // Limite do Palco
                if (typeof limitarPosicaoAoPalco === 'function') {
                    const pos = limitarPosicaoAoPalco(item.x, item.y, 32, 32);
                    item.x = pos.x;
                    item.y = pos.y;
                    if (item.y <= 32) item.velocidadeY = 0;
                }

                // Atualiza visual do item
                item.elemento.style.left = item.x + 'px';
                item.elemento.style.bottom = item.y + 'px';
            }
        }

        // Aplica os valores ao elemento (reutilizando a lógica de direção)
        elemento.style.left = controle.x + 'px';
        elemento.style.bottom = controle.y + 'px';
        elemento.style.transform = controle.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';

        // Sincroniza a posição da arma com o jogador (mesma lógica do inimigo)
        armaElemento.style.left = controle.x + 'px';
        armaElemento.style.bottom = controle.y + 'px';
        armaElemento.style.transform = controle.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';

        // Atualiza o sprite da arma baseado na munição
        armaElemento.src = (controle.municao <= 0)
            ? (config.spriteArmaVermelha || 'personagem/revolver_vermelho.png')
            : (config.spriteArmaPlayer || 'personagem/revolver.png');

        // Sincroniza a posição do escudo com o jogador
        escudoElemento.style.left = controle.x + 'px';
        escudoElemento.style.bottom = controle.y + 'px';
        escudoElemento.style.transform = controle.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';

        // Sincroniza a posição e sprite da bota
        if (controle.temBota) {
            botaElemento.style.left = controle.x + 'px';
            botaElemento.style.bottom = controle.y + 'px';
            // Garante que o espelhamento (lado para o qual olha) seja idêntico ao do personagem
            botaElemento.style.transform = elemento.style.transform;
            
            // Melhoria da lógica de animação: a bota deve seguir o frame exato do personagem
            if (controle.chutando) {
                botaElemento.src = config.spriteBotaChutando || 'personagem/bota_chutando.png';
            } else if (!controle.noChao) {
                // Se estiver no ar, usa o sprite parado
                botaElemento.src = config.spriteBotaParado || 'personagem/bota_parado.png';
            } else if (controle.movendoHorizontal) {
                // Se estiver andando no chão, sincroniza com o frameAtual (1 é o frame de caminhada)
                botaElemento.src = (controle.frameAtual === 1)
                    ? (config.spriteBotaAndando || 'personagem/bota_andando.png')
                    : (config.spriteBotaParado || 'personagem/bota_parado.png');
            } else {
                // Totalmente parado
                botaElemento.src = config.spriteBotaParado || 'personagem/bota_parado.png';
            }
        }

        requestAnimationFrame(atualizar);
    }

    // Inicia o loop de atualização
    requestAnimationFrame(atualizar);
}