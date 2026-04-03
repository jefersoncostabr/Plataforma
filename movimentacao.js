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
        cooldownChute: 0,
        cooldownPulo: 0,
        cooldownTiro: 0,
        municao: config.maxMunicao || 5,
        dano: 0,
        teclas: {}
    };

    window.playerControle = controle;
    window.projeteis = [];
    window.debugInimigoTeclas = {}; // Inicializa o objeto para teclas de debug do inimigo

    // Detecta teclas pressionadas
    window.addEventListener('keydown', (e) => {
        // Log para confirmar o valor de e.key para a barra de espaço
        if (e.key === ' ') console.log("Movimentação: KeyDown capturado -> Barra de Espaço");
        controle.teclas[e.key] = true;
        // Adiciona a tecla '8' para debug de pulo do inimigo
        if (e.key === '8') {
            window.debugInimigoTeclas[' '] = true; // Mapeia '8' para 'espaço' para o pulo do inimigo
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
        controle.movendoHorizontal = false;
        const xAnterior = controle.x;
        const yAnterior = controle.y;

        // Movimentação Horizontal
        if (controle.teclas['ArrowLeft'] || controle.teclas['a'] || controle.teclas['A']) {
            controle.x -= velocidade;
            if (!controle.chutando) controle.direcao = 'e';
            controle.movendoHorizontal = true;
        }
        if (controle.teclas['ArrowRight'] || controle.teclas['d'] || controle.teclas['D']) {
            controle.x += velocidade;
            if (!controle.chutando) controle.direcao = 'd';
            controle.movendoHorizontal = true;
        }

        // Lógica de Chute (tecla K)
        if ((controle.teclas['k'] || controle.teclas['K']) && controle.cooldownChute === 0) {
            controle.tempoChute = config.tempoChute;
            controle.cooldownChute = config.cooldownChute;

            // Reseta o estado de "atingido" de todos os inimigos para este novo chute
            if (window.inimigos) window.inimigos.forEach(inimigo => inimigo.foiAtingidoNesteChute = false);

            // Aplica o impulso (dash) para a frente baseado na direção atual
            const direcaoMultiplicador = (controle.direcao === 'd' ? 1 : -1);
            controle.x += config.impulsoChute * direcaoMultiplicador;
        }

        // Lógica de Disparo (tecla I)
        if ((controle.teclas['i'] || controle.teclas['I']) && controle.cooldownTiro === 0 && controle.municao > 0) {
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
            console.log(`Jogador disparou! Munição restante: ${controle.municao}`);
        }

        if (controle.tempoChute > 0) {
            controle.chutando = true;
            controle.tempoChute--;
        } else {
            controle.chutando = false;
        }

        // Diminui o cooldown global do chute
        if (controle.cooldownChute > 0) {
            controle.cooldownChute--;
        }

        // Diminui o cooldown do tiro
        if (controle.cooldownTiro > 0) {
            controle.cooldownTiro--;
        }

        // Diminui o cooldown do pulo
        if (controle.cooldownPulo > 0) {
            controle.cooldownPulo--;
        }

        // 1. Colisão Horizontal (HITBOX com altura 32)
        if (typeof verificarColisaoComTiles === 'function' && 
            verificarColisaoComTiles(controle.x + config.HITBOX_OFFSET_X, controle.y, config.HITBOX_LARGURA, config.HITBOX_ALTURA, window.plataformas)) {
            controle.x = xAnterior;
        }

        // Aplica gravidade e pulo (definido em fisica.js)
        aplicarFisica(
            controle, 
            controle.teclas, 
            config.inimigoForcaPulo, 
            config.inimigoGravidade, 
            config.inimigoPuloCooldown
        );

        // Resetamos o estado para ser revalidado pelas colisões verticais abaixo
        controle.noChao = false;

        // 2. Colisão Vertical com HITBOX 7x32
        if (typeof verificarColisaoComTiles === 'function' && 
            verificarColisaoComTiles(controle.x + config.HITBOX_OFFSET_X, controle.y, config.HITBOX_LARGURA, config.HITBOX_ALTURA, window.plataformas)) {
            
            if (controle.velocidadeY < 0) { // Caindo: toca o topo da plataforma
                controle.noChao = true;
                controle.velocidadeY = 0;
                controle.y = Math.floor((controle.y + 0.1) / 32 + 1) * 32;
            } else if (controle.velocidadeY > 0) { // Subindo: bate a cabeça
                controle.velocidadeY = 0;
                // Snap vertical inteiro para topo de tile de teto (sem fração de pixel gap)
                controle.y = Math.floor((controle.y + config.HITBOX_ALTURA) / 32) * 32 - config.HITBOX_ALTURA;
            }
        }

        // Aplica a lógica de colisão com os limites do palco
        const yHitboxAntes = controle.y;
        const posicaoAjustada = limitarPosicaoAoPalco(controle.x + config.HITBOX_OFFSET_X, controle.y, config.HITBOX_LARGURA, config.HITBOX_ALTURA);
        
        controle.x = posicaoAjustada.x - config.HITBOX_OFFSET_X;
        controle.y = posicaoAjustada.y;

        // Detecta toque no chão: a colisão empurrou para cima E o personagem não está subindo
        if ((yHitboxAntes < posicaoAjustada.y || controle.noChao) && controle.velocidadeY <= 0) {
            if (!noChaoAnterior && controle.noChao) console.log("Movimentação: Personagem tocou o chão.");
            controle.noChao = true;
            controle.velocidadeY = 0;
        } else if (yHitboxAntes > posicaoAjustada.y) {
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
                alert("Parabéns! Você alcançou o objetivo e completou a fase!");
                location.reload();
                return; // Para o loop
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

                    // Só aplica o dano se o inimigo ainda não foi atingido por este chute específico
                    if (!inimigo.foiAtingidoNesteChute && detectarColisaoHitbox(hitboxAtaque, inimigo, 0, 0, 0)) {
                        inimigo.foiAtingidoNesteChute = true;
                        inimigo.vida = (inimigo.vida || 0) + 1;

                        // Knockback: Lança o inimigo 28px para trás com base na direção do jogador
                        const direcaoKnockback = (controle.direcao === 'd' ? 1 : -1);
                        inimigo.x += config.knockbackInimigo * direcaoKnockback;

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
                            inimigo.elemento.remove(); // Remove do HTML
                            window.inimigos.splice(i, 1); // Remove da lista lógica
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

                            // Knockback: Lança o inimigo para trás com base na direção do projétil
                            inimigo.x += config.knockbackInimigo * proj.direcao;

                            // Limita a posição para o inimigo não sair do palco no momento do impacto
                            if (typeof limitarPosicaoAoPalco === 'function') {
                                const posAjustada = limitarPosicaoAoPalco(inimigo.x + config.HITBOX_OFFSET_X, inimigo.y, config.HITBOX_LARGURA, config.HITBOX_ALTURA);
                                inimigo.x = posAjustada.x - config.HITBOX_OFFSET_X;
                            }

                            inimigo.elemento.style.left = inimigo.x + 'px';

                            if (inimigo.vida >= 3) {
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
                        window.playerControle.dano = (window.playerControle.dano || 0) + 1;
                        
                        // Knockback no Jogador baseado na direção do tiro
                        window.playerControle.x += config.knockbackInimigo * proj.direcao;
                        
                        console.log(`Dano: Jogador atingido por projétil! Total: ${window.playerControle.dano}/3`);

                        if (window.playerControle.dano >= 3) {
                            alert("Game Over! Você foi derrotado pelos projéteis inimigos.");
                            location.reload();
                        }
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

        // Aplica os valores ao elemento (reutilizando a lógica de direção)
        elemento.style.left = controle.x + 'px';
        elemento.style.bottom = controle.y + 'px';
        elemento.style.transform = controle.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';

        requestAnimationFrame(atualizar);
    }

    // Inicia o loop de atualização
    requestAnimationFrame(atualizar);
}