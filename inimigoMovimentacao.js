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

    window.resetarInimigos = (dadosInimigos) => {
        // Limpa referências antigas e remove armas
        if (window.inimigos) {
            window.inimigos.forEach(inim => {
                if (inim.armaElemento) inim.armaElemento.remove();
                if (inim.botaElemento) inim.botaElemento.remove();
                if (inim.escudoElemento) inim.escudoElemento.remove();
            });
        }
        window.inimigos = [];
        
        const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
        if (!palco) return;
        dadosInimigos.forEach(dado => {
            const posStr = typeof dado === 'object' ? dado.pos : dado;
            const pos = gridParaPixels(posStr);
            const img = document.createElement('img');
            img.src = spriteParado;
            img.style.position = 'absolute';
            img.style.width = '32px';
            img.style.height = '32px';
            img.style.left = pos.x + 'px';
            img.style.bottom = pos.y + 'px';
            img.style.zIndex = '4';
            img.style.imageRendering = 'pixelated';
            palco.appendChild(img);

            window.inimigos.push({
                x: pos.x,
                y: pos.y,
                largura: config.HITBOX_LARGURA,
                altura: config.HITBOX_ALTURA,
                elemento: img,
                perseguindo: false,
                tipo: dado.tipo !== undefined ? dado.tipo : 1
            });
        });
    };

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
            // Aumentamos a distância de ativação para que o inimigo "acorde" mesmo em fases longas (como a Fase 3)
            const alcanceTiro = Number(config.distanciaTiroInimigo ?? 300);
            const distanciaAtivacao = Math.max(alcanceTiro, 20 * 32); // 20 blocos de distância (aprox. tela cheia)

            const velAtivaBase = Number(config.velocidadeHorizontal ?? velocidade);

            // Usamos um loop for reverso para permitir a remoção segura de inimigos que caem no buraco
            for (let i = window.inimigos.length - 1; i >= 0; i--) {
                const inimigo = window.inimigos[i];
                
                let xAnterior = inimigo.x;

                // Unificação da velocidade: tratamos como número e aplicamos bônus se for tipo 3
                let velAtiva = velAtivaBase;
                if (inimigo.tipo === 3) {
                    velAtiva += Number(config.bonusVelocidadeBota ?? 2);
                }

                const distanciaAtual = Math.abs(playerX - inimigo.x);
                
                // Inicializa propriedades de combate se não existirem
                if (inimigo.tempoChute === undefined) {
                    inimigo.tempoChute = 0;
                    inimigo.cooldownChute = 0;
                    inimigo.cooldownTiro = 0;
                    inimigo.municao = config.maxMunicao || 5;
                    inimigo.direcao = 'e';
                    inimigo.temArma = (inimigo.tipo === 1);
                    inimigo.temEscudo = (inimigo.tipo === 2);
                    inimigo.temBota = (inimigo.tipo === 3);
                    inimigo.framesImpulsoRestante = 0;
                    inimigo.velocidadeDash = 0;
                    inimigo.cooldownPulo = 0;
                    inimigo.velocidadeY = 0;
                    inimigo.noChao = false;
                    inimigo.puloTimer = 0;
                    inimigo.afastando = false;
                    inimigo.tempoAfastamento = 0;
                    inimigo.cooldownAfastamento = 0;

                    // Cria o elemento da arma (revolver) acoplado ao inimigo
                    const arma = document.createElement('img');
                    arma.src = config.spriteArmaPlayer || 'personagem/revolver.png';
                    arma.style.position = 'absolute';
                    arma.style.width = '32px';
                    arma.style.height = '32px';
                    arma.style.zIndex = '6'; // Mesma camada da arma do player
                    arma.style.imageRendering = 'pixelated';
                    arma.style.pointerEvents = 'none';
                    arma.style.display = inimigo.temArma ? 'block' : 'none';
                    inimigo.elemento.parentElement.appendChild(arma);
                    inimigo.armaElemento = arma;

                    // Cria o elemento visual da bota para o inimigo
                    const bota = document.createElement('img');
                    bota.src = config.spriteBotaParado || 'personagem/bota_parado.png';
                    bota.style.position = 'absolute';
                    bota.style.width = '32px';
                    bota.style.height = '32px';
                    bota.style.zIndex = '8';
                    bota.style.imageRendering = 'pixelated';
                    bota.style.pointerEvents = 'none';
                    bota.style.display = inimigo.temBota ? 'block' : 'none';
                    inimigo.elemento.parentElement.appendChild(bota);
                    inimigo.botaElemento = bota;

                    // Cria o elemento do escudo para o inimigo tipo 2
                    const escudo = document.createElement('img');
                    escudo.src = config.spriteEscudoPlayer || 'personagem/escudo.png';
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

                // Atualiza timers de chute
                if (inimigo.tempoChute > 0) inimigo.tempoChute--;
                if (inimigo.cooldownChute > 0) inimigo.cooldownChute--;
                if (inimigo.cooldownTiro > 0) inimigo.cooldownTiro--;
                if (inimigo.tempoAfastamento > 0) inimigo.tempoAfastamento--;
                if (inimigo.cooldownAfastamento > 0) inimigo.cooldownAfastamento--;
                if (inimigo.cooldownPulo > 0) inimigo.cooldownPulo--;

                // Lógica de detecção de proximidade excessiva com o jogador
                const distanciaX = Math.abs(playerX - inimigo.x);
                const playerY = parseInt(player.style.bottom) || 0;
                const distanciaY = Math.abs(playerY - inimigo.y);
                const distanciaMinima = config.inimigoDistanciaMinimaAtaque || 20;

                if (inimigo.perseguindo && distanciaX <= distanciaMinima && distanciaY <= distanciaMinima && !inimigo.afastando && inimigo.tempoAfastamento === 0 && inimigo.cooldownAfastamento === 0) {
                    // Inimigo está muito próximo do jogador - inicia afastamento
                    inimigo.afastando = true;
                    inimigo.tempoAfastamento = config.inimigoTempoAfastamento || 30;
                    console.log('Inimigo muito próximo do jogador - iniciando afastamento');
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

                    // Impedir que o inimigo entre em plataformas ao se afastar
                    if (typeof verificarColisaoComTiles === 'function' && 
                        verificarColisaoComTiles(inimigo.x + config.HITBOX_OFFSET_X, inimigo.y, config.HITBOX_LARGURA, config.HITBOX_ALTURA, window.plataformas)) {
                        inimigo.x = xAnterior;
                    }
                } else if (inimigo.afastando && inimigo.tempoAfastamento === 0) {
                    // Terminou o afastamento - volta ao comportamento normal
                    inimigo.afastando = false;
                    inimigo.cooldownAfastamento = config.inimigoCooldownAfastamento || 60;
                    console.log('Inimigo terminou afastamento - cooldown iniciado');
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
                        console.log('Inimigo detectou projétil vindo em sua direção!');
                    }
                    return chegaPerto && mesmaAltura && vemNaDirecao;
                }) : null;

                // Unificação da força de pulo: todos os tipos usam a mesma base numérica
                let forcaPuloInimigo = Number(config.inimigoForcaPulo ?? 12);
                if (inimigo.tipo === 3) {
                    forcaPuloInimigo += Number(config.bonusPuloBota ?? 1.5);
                }

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
                        inimigo.velocidadeY = forcaPuloInimigo;
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
                        forcaPuloInimigo, 
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

                // Remove o inimigo se ele cair no buraco (fora da tela)
                if (inimigo.y < -64) {
                    if (inimigo.armaElemento) inimigo.armaElemento.remove();
                    if (inimigo.botaElemento) inimigo.botaElemento.remove();
                    if (inimigo.escudoElemento) inimigo.escudoElemento.remove();
                    inimigo.elemento.remove();
                    window.inimigos.splice(i, 1);
                    continue;
                }

                let movendoDestaVez = false;
                // Ações que dependem da ativação (movimento e ataque) - só se não estiver afastando
                if (inimigo.perseguindo && !inimigo.afastando) {
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
                        
                        console.log(`Inimigo disparou! Munição restante: ${inimigo.municao}`);
                    }

                    // Lógica de perseguição: move-se na direção do Player
                    // Aumentamos a margem de parada baseada na velocidade para evitar travamentos
                    if (inimigo.x < playerX - velAtiva) {
                        if (inimigo.tempoChute === 0) {
                            inimigo.x += velAtiva;
                            inimigo.direcao = 'd';
                            inimigo.elemento.style.transform = 'scaleX(1)';
                            movendoDestaVez = true;
                        }
                    } else if (inimigo.x > playerX + velAtiva) {
                        if (inimigo.tempoChute === 0) {
                            inimigo.x -= velAtiva;
                            inimigo.direcao = 'e';
                            inimigo.elemento.style.transform = 'scaleX(-1)';
                            movendoDestaVez = true;
                        }
                    }

                    // Lógica de Pulo por Diferença de Altura (Vertical Tracking) - Item 2
                    if (inimigo.noChao && (inimigo.cooldownPulo || 0) === 0 && playerY > inimigo.y + 31) {
                        // Se o player estiver acima e o inimigo estiver perto horizontalmente (ex: 64px)
                        const distXAtual = Math.abs(playerX - inimigo.x);
                        if (distXAtual < 64) {
                            inimigo.velocidadeY = forcaPuloInimigo;
                            inimigo.noChao = false;
                            inimigo.cooldownPulo = config.inimigoPuloCooldown;
                            console.log('Inimigo detectou jogador em plataforma superior e pulou para escalar!');
                        }
                    }

                    // Lógica de Salto de Fé (Gap Jumping) - Item 3
                    if (movendoDestaVez && inimigo.noChao && (inimigo.cooldownPulo || 0) === 0) {
                        // Calcula ponto de verificação à frente dos pés (baseado na direção)
                        const checkX = (inimigo.direcao === 'd') 
                            ? inimigo.x + config.HITBOX_OFFSET_X + config.HITBOX_LARGURA + 10 
                            : inimigo.x + config.HITBOX_OFFSET_X - 10;
                        
                        const checkY = inimigo.y - 10; // Verifica o chão logo abaixo do nível atual
                        
                        // Se não houver plataforma detectada à frente e abaixo, o inimigo pula
                        if (typeof verificarColisaoComTiles === 'function' && 
                            !verificarColisaoComTiles(checkX, checkY, 2, 2, window.plataformas)) {
                            inimigo.velocidadeY = forcaPuloInimigo;
                            inimigo.noChao = false;
                            inimigo.cooldownPulo = config.inimigoPuloCooldown;
                            console.log('Inimigo detectou vácuo e executou Salto de Fé!');
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
                    const estaChutando = inimigo.tempoChute > 0;
                    if (estaChutando) {
                        inimigo.elemento.src = config.spriteChuteInimigo || spriteChute;
                        
                        if (inimigo.framesImpulsoRestante > 0) {
                            const direcaoDash = (inimigo.direcao === 'd' ? 1 : -1);
                            inimigo.x += inimigo.velocidadeDash * direcaoDash;
                            inimigo.framesImpulsoRestante--;
                        }
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
                            
                            const escudoAtivo = temEscudoAtivo();
                            if (!escudoAtivo) {
                                window.playerControle.dano = (window.playerControle.dano || 0) + 1;
                                console.log(`Dano: Jogador atingido! Total: ${window.playerControle.dano}/3`);
                                
                                // Efeito visual no jogador ao receber dano
                                if (typeof flashComVibacao === 'function') {
                                    flashComVibacao(document.getElementById('player'));
                                }
                            } else {
                                console.log('Escudo bloqueou o chute! Apenas knockback aplicado.');
                                
                                // Efeito visual no escudo ao bloquear chute
                                if (typeof piscaLeve === 'function' && window.escudoElemento) {
                                    piscaLeve(window.escudoElemento);
                                }
                            }
                            
                            // Knockback no Jogador
                            const direcaoKnockback = (inimigo.direcao === 'd' ? 1 : -1);
                            const valorKnockback = obterKnockbackRecebido(config, 'inimigoChute');
                            const duracaoRecuo = 15; // O recuo por contato físico é um pouco mais longo
                            
                            window.playerControle.framesKnockbackRestante = duracaoRecuo;
                            window.playerControle.velocidadeKnockback = (valorKnockback / duracaoRecuo) * direcaoKnockback;

                            // Condição de Game Over
                            if (window.playerControle.dano >= 3) {
                                window.playerControle.dano = 0; // Reset imediato para evitar repetição do alert
                                alert("Game Over! Você foi derrotado pelos inimigos.");
                                if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
                            }
                        }
                    }
                }

                // Colisão Horizontal com as laterais das plataformas (após perseguição/dash)
                if (typeof verificarColisaoComTiles === 'function' && 
                    verificarColisaoComTiles(inimigo.x + config.HITBOX_OFFSET_X, inimigo.y, config.HITBOX_LARGURA, config.HITBOX_ALTURA, window.plataformas)) {
                    
                    // Item 1: Pulo por Obstrução (Wall Detection)
                    if (inimigo.noChao && (inimigo.cooldownPulo || 0) === 0) {
                        inimigo.velocidadeY = forcaPuloInimigo;
                        inimigo.noChao = false;
                        inimigo.cooldownPulo = config.inimigoPuloCooldown;
                        console.log('Inimigo detectou obstrução lateral e pulou para subir!');
                    }

                    inimigo.x = xAnterior;
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
                    // Removido o ajuste de Y para permitir que o inimigo caia em buracos
                    // inimigo.y = posAjustada.y;
                }

                // Atualiza a posição no DOM (Sempre, para refletir gravidade, movimento e knockback)
                inimigo.elemento.style.left = inimigo.x + 'px';
                inimigo.elemento.style.bottom = inimigo.y + 'px';

                // Sincroniza a arma com o inimigo
                if (inimigo.armaElemento) {
                    inimigo.armaElemento.style.left = inimigo.x + 'px';
                    inimigo.armaElemento.style.bottom = inimigo.y + 'px';
                    inimigo.armaElemento.style.transform = inimigo.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
                }

                // Sincroniza o escudo com o inimigo
                if (inimigo.escudoElemento && inimigo.temEscudo) {
                    inimigo.escudoElemento.style.left = inimigo.x + 'px';
                    inimigo.escudoElemento.style.bottom = inimigo.y + 'px';
                    inimigo.escudoElemento.style.transform = inimigo.elemento.style.transform;
                }

                // Sincroniza a bota com o inimigo
                if (inimigo.botaElemento && inimigo.temBota) {
                    inimigo.botaElemento.style.left = inimigo.x + 'px';
                    inimigo.botaElemento.style.bottom = inimigo.y + 'px';
                    inimigo.botaElemento.style.transform = inimigo.elemento.style.transform;
                    
                    if (estaChutando) {
                        inimigo.botaElemento.src = config.spriteBotaChutando || 'personagem/bota_chutando.png';
                    } else if (!inimigo.noChao) {
                        inimigo.botaElemento.src = config.spriteBotaParado || 'personagem/bota_parado.png';
                    } else if (movendoDestaVez) {
                        inimigo.botaElemento.src = (inimigo.frameAtual === 1)
                            ? (config.spriteBotaAndando || 'personagem/bota_andando.png')
                            : (config.spriteBotaParado || 'personagem/bota_parado.png');
                    } else {
                        inimigo.botaElemento.src = config.spriteBotaParado || 'personagem/bota_parado.png';
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