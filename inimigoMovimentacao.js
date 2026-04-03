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
    const resposta = await fetch('configuracoesGerais.json');
    const config = await resposta.json();

    function atualizarIA() {
        // Se a configuração de debug estiver ativa, pula a lógica de movimento
        if (config.debugInimigosParados) {
            requestAnimationFrame(atualizarIA);
            return;
        }

        const player = document.getElementById('player');
        
        // Só executa se houver um jogador e inimigos no mapa
        if (player && window.inimigos && window.inimigos.length > 0) {
            const playerX = parseInt(player.style.left) || 0;
            const alcanceTiro = config.distanciaTiroInimigo || 300;
            const distanciaAtivacao = Math.max(alcanceTiro, 6 * 32); 

            const velAtiva = config.velocidadeHorizontal || velocidade;

            window.inimigos.forEach(inimigo => {
                const distanciaAtual = Math.abs(playerX - inimigo.x);
                
                // Inicializa propriedades de combate se não existirem
                if (inimigo.tempoChute === undefined) {
                    inimigo.tempoChute = 0;
                    inimigo.cooldownChute = 0;
                    inimigo.cooldownTiro = 0;
                    inimigo.municao = config.maxMunicao || 5;
                    inimigo.direcao = 'e';
                    inimigo.cooldownPulo = 0;
                    inimigo.velocidadeY = 0;
                    inimigo.noChao = false;
                    inimigo.puloTimer = 0;
                }

                // Atualiza timers de chute
                if (inimigo.tempoChute > 0) inimigo.tempoChute--;
                if (inimigo.cooldownChute > 0) inimigo.cooldownChute--;
                if (inimigo.cooldownTiro > 0) inimigo.cooldownTiro--;

                // Lógica de detecção de projétil vindo (radar de ameaça)
                const projVindo = window.projeteis ? window.projeteis.find(proj => {
                    // Distância ao inimigo na direção do projétil
                    const dx = proj.direcao === 1 ? inimigo.x - proj.x : proj.x - inimigo.x;
                    const dy = Math.abs((proj.y + config.PROJETIL_ALTURA / 2) - (inimigo.y + config.HITBOX_ALTURA / 2));
                    const chegaPerto = dx >= 0 && dx <= config.inimigoPuloDistanciaAlerta;
                    const mesmaAltura = dy <= config.HITBOX_ALTURA;
                    const vemNaDirecao = (proj.direcao === 1 && proj.x < inimigo.x) || (proj.direcao === -1 && proj.x > inimigo.x);
                    
                    if (chegaPerto && mesmaAltura && vemNaDirecao) {
                        console.log('Inimigo detectou projétil vindo em sua direção!');
                    }
                    return chegaPerto && mesmaAltura && vemNaDirecao;
                }) : null;

                // Ativa a perseguição se o jogador estiver perto OU se detectar um tiro vindo no radar
                if (!inimigo.perseguindo && (distanciaAtual <= distanciaAtivacao || projVindo)) {
                    inimigo.perseguindo = true;
                    console.log("Inimigo ativado! Motivo: " + (projVindo ? "Tiro detectado" : "Proximidade"));
                }

                // Lógica de pulo de desvio (usa o projVindo detectado acima)
                if (projVindo && inimigo.noChao && inimigo.puloTimer === 0) {
                    // Define um delay randômico antes de pular
                    inimigo.puloTimer = Math.floor(Math.random() * (config.inimigoPuloDelayMax - config.inimigoPuloDelayMin + 1)) + config.inimigoPuloDelayMin;
                    console.log('Inimigo iniciou timer de pulo:', inimigo.puloTimer, 'frames');
                }

                // Decrementa o timer de pulo
                if (inimigo.puloTimer > 0) {
                    inimigo.puloTimer--;
                    if (inimigo.puloTimer === 0 && inimigo.noChao) {
                        inimigo.velocidadeY = config.inimigoForcaPulo;
                        inimigo.noChao = false;
                        console.log('Inimigo pulou para desviar de projétil!');
                    }
                }

                // A física (gravidade e pulo) deve rodar sempre para o inimigo reagir ao ambiente
                if (typeof aplicarFisica === 'function') {
                    const inimigoTeclasParaFisica = {
                        ' ': window.debugInimigoTeclas && window.debugInimigoTeclas[' ']
                    };
                    aplicarFisica(
                        inimigo, 
                        inimigoTeclasParaFisica, 
                        config.inimigoForcaPulo, 
                        config.inimigoGravidade, 
                        config.inimigoPuloCooldown
                    );
                }

                // Colisão Vertical constante para garantir que o inimigo pule e caia corretamente
                inimigo.noChao = false;
                if (typeof verificarColisaoComTiles === 'function') {
                    if (verificarColisaoComTiles(inimigo.x + config.HITBOX_OFFSET_X, inimigo.y, config.HITBOX_LARGURA, config.HITBOX_ALTURA, window.plataformas)) {
                        if (inimigo.velocidadeY < 0) { // Caindo
                            inimigo.noChao = true;
                            inimigo.velocidadeY = 0;
                            inimigo.y = Math.floor((inimigo.y + 0.1) / 32 + 1) * 32;
                        } else if (inimigo.velocidadeY > 0) { // Subindo: bate a cabeça
                            inimigo.velocidadeY = 0;
                            inimigo.y = Math.floor((inimigo.y + config.HITBOX_ALTURA) / 32) * 32 - config.HITBOX_ALTURA;
                        }
                    }
                }

                if (inimigo.y <= 32) {
                    inimigo.y = 32;
                    inimigo.noChao = true;
                    inimigo.velocidadeY = 0;
                }

                // Ações que dependem da ativação (movimento e ataque)
                if (inimigo.perseguindo) {
                    let movendoDestaVez = false;

                    // Lógica para INICIAR o chute
                    if (distanciaAtual <= config.distanciaAtaqueInimigo && inimigo.cooldownChute === 0) {
                        inimigo.tempoChute = config.tempoChute;
                        inimigo.cooldownChute = config.cooldownChute;
                        inimigo.jaAtacouNesteChute = false;

                        // Dash do inimigo
                        const mult = (inimigo.direcao === 'd' ? 1 : -1);
                        inimigo.x += config.impulsoChute * mult;
                    }

                    // Lógica para INICIAR o disparo
                    if (distanciaAtual <= alcanceTiro && distanciaAtual > config.distanciaAtaqueInimigo && inimigo.cooldownTiro === 0 && inimigo.municao > 0) {
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
                        console.log(`Inimigo disparou! Munição restante: ${inimigo.municao}`);
                    }

                    // Lógica de perseguição: move-se na direção do Player
                    if (inimigo.x < playerX - 2) {
                        if (inimigo.tempoChute === 0) {
                            inimigo.x += velAtiva;
                            inimigo.direcao = 'd';
                            inimigo.elemento.style.transform = 'scaleX(1)';
                            movendoDestaVez = true;
                        }
                    } else if (inimigo.x > playerX + 2) {
                        if (inimigo.tempoChute === 0) {
                            inimigo.x -= velAtiva;
                            inimigo.direcao = 'e';
                            inimigo.elemento.style.transform = 'scaleX(-1)';
                            movendoDestaVez = true;
                        }
                    }

                    // Lógica de Animação (Igual ao Personagem)
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

                    // Sobrescreve o sprite se o inimigo estiver chutando
                    if (inimigo.tempoChute > 0) {
                        inimigo.elemento.src = config.spriteChuteInimigo || spriteChute;
                    }

                    // Lógica da Attackbox do Inimigo
                    if (inimigo.tempoChute > 0 && !inimigo.jaAtacouNesteChute && window.playerControle) {
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
                            x: window.playerControle.x + config.HITBOX_OFFSET_X, 
                            y: window.playerControle.y, 
                            largura: config.HITBOX_LARGURA, 
                            altura: config.HITBOX_ALTURA 
                        };

                        // Verifica colisão precisa (0 padding pois as caixas já estão ajustadas)
                        if (typeof detectarColisaoHitbox === 'function' && 
                            detectarColisaoHitbox(hitboxAtaqueInimigo, hurtboxPlayer, 0, 0, 0)) {
                            
                            inimigo.jaAtacouNesteChute = true;
                            
                            // Incrementa o dano do jogador
                            window.playerControle.dano = (window.playerControle.dano || 0) + 1;
                            console.log(`Dano: Jogador atingido! Total: ${window.playerControle.dano}/3`);
                            
                            // Knockback no Jogador
                            const direcaoKnockback = (inimigo.direcao === 'd' ? 1 : -1);
                            window.playerControle.x += config.knockbackInimigo * direcaoKnockback;

                            // Condição de Game Over
                            if (window.playerControle.dano >= 3) {
                                alert("Game Over! Você foi derrotado pelos inimigos.");
                                location.reload();
                            }
                        }
                    }
                }


                // Garante que o inimigo permaneça dentro dos limites do palco (Clamping)
                if (typeof limitarPosicaoAoPalco === 'function') {
                    const posAjustada = limitarPosicaoAoPalco(
                        inimigo.x + config.HITBOX_OFFSET_X, 
                        inimigo.y, 
                        config.HITBOX_LARGURA, 
                        config.HITBOX_ALTURA
                    );
                    inimigo.x = posAjustada.x - config.HITBOX_OFFSET_X;
                    inimigo.y = posAjustada.y;
                }

                // Atualiza a posição no DOM (Sempre, para refletir gravidade, movimento e knockback)
                inimigo.elemento.style.left = inimigo.x + 'px';
                inimigo.elemento.style.bottom = inimigo.y + 'px';
            });
        }

        // Mantém o loop de movimentação da IA
        requestAnimationFrame(atualizarIA);
    }

    // Inicia o ciclo de atualização
    requestAnimationFrame(atualizarIA);
}