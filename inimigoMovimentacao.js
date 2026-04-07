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

    window.resetarInimigos = (dadosInimigos) => {
        // Limpa referências antigas e remove armas
        if (window.inimigos) {
            window.inimigos.forEach(inim => {
                if (inim.armaElemento) inim.armaElemento.remove();
                if (inim.botaElemento) inim.botaElemento.remove();
                if (inim.escudoElemento) inim.escudoElemento.remove();
                if (inim.jetpackElemento) inim.jetpackElemento.remove();
                if (inim.jetFogoElemento) inim.jetFogoElemento.remove();
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
                offsetX: config.HITBOX_OFFSET_X,
                elemento: img,
                perseguindo: false,
                tipo: dado.tipo !== undefined ? dado.tipo : 1
                ,
                framesKnockbackRestante: 0, // Inicializa frames de knockback
                velocidadeKnockback: 0, // Inicializa velocidade de knockback
                puloTimer: 0, // Inicializa o timer de pulo
                jumpQueued: false // Inicializa a flag de pulo agendado
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
                if (inimigo.tempoChute === undefined) {
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
                    inimigo.jetpackAtivo = false;
                    inimigo.timerVooRestante = 0;
                    inimigo.framesVoando = 0;
                    inimigo.cooldownVooJetpack = 0;
                    inimigo.framesImpulsoRestante = 0;
                    inimigo.velocidadeDash = 0;

                    inimigo.stunned = false; // Inicializa estado de stun
                    inimigo.stunTimer = 0;  // Inicializa timer de stun
                    // Preenche inventário inicial baseado no tipo
                    if (inimigo.temArma) inimigo.inventario.push('revolver');
                    if (inimigo.temEscudo) inimigo.inventario.push('escudo');
                    if (inimigo.temBota) inimigo.inventario.push('bota');
                    if (inimigo.temJetpack) inimigo.inventario.push('jetpack');
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
                    }

                    // Cria o elemento visual da bota para o inimigo
                    if (!inimigo.botaElemento) {
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
                    }

                    // Cria o elemento do escudo para o inimigo tipo 2
                    if (!inimigo.escudoElemento) {
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

                    // Cria o elemento do jetpack para o inimigo
                    if (!inimigo.jetpackElemento) {
                        const jetpack = document.createElement('img');
                        jetpack.src = config.spriteJetpackPlayer || 'personagem/jetpack.png';
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
                        jetFogo.src = config.spriteJetFogo || 'personagem/jet.png';
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
                }

                // Atualiza timers de chute
                if (inimigo.tempoChute > 0) inimigo.tempoChute--;
                if (inimigo.cooldownChute > 0) inimigo.cooldownChute--;
                if (inimigo.cooldownTiro > 0) inimigo.cooldownTiro--;
                if (inimigo.puloTimer > 0) inimigo.puloTimer--; // Decrementa o timer de pulo
                if (inimigo.tempoAfastamento > 0) inimigo.tempoAfastamento--;
                if (inimigo.cooldownAfastamento > 0) inimigo.cooldownAfastamento--;
                if (inimigo.cooldownPulo > 0) inimigo.cooldownPulo--;
                if (inimigo.cooldownVooJetpack > 0) inimigo.cooldownVooJetpack--;

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
                if (!inimigo.perseguindo && (distanciaAtual <= distanciaAtivacao || projVindo || itemInteresse)) {
                    inimigo.perseguindo = true;
                    // console.log("Inimigo ativado! Motivo: " + (projVindo ? "Tiro detectado" : "Proximidade"));
                }

                // Lógica de pulo de desvio (usa o projVindo detectado acima)
                if (projVindo && inimigo.noChao && inimigo.puloTimer === 0 && !inimigo.jumpQueued) {
                    // Define um delay randômico antes de pular
                    inimigo.puloTimer = Math.floor(Math.random() * (config.inimigoPuloDelayMax - config.inimigoPuloDelayMin + 1)) + config.inimigoPuloDelayMin;
                    inimigo.jumpQueued = true; // Marca que um pulo foi agendado
                    console.log('Inimigo iniciou timer de pulo por projétil:', inimigo.puloTimer, 'frames');
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
                if (typeof verificarColisaoComTiles === 'function' && 
                    verificarColisaoComTiles(inimigo.x + (inimigo.offsetX || 0), inimigo.y, inimigo.largura, inimigo.altura, window.plataformas)) {
                    
                    if (inimigo.velocidadeY < 0) {
                        inimigo.noChao = true;
                        inimigo.velocidadeY = 0;
                        inimigo.y = Math.floor((inimigo.y + EPSILON) / 32 + 1) * 32;
                        inimigo.puloTimer = 0;
                        inimigo.jumpQueued = false;
                    } else if (inimigo.velocidadeY > 0) {
                        inimigo.velocidadeY = 0;
                        inimigo.y = Math.floor((inimigo.y + inimigo.altura) / 32) * 32 - inimigo.altura;
                    }
                }

                // Remove o inimigo se ele cair no buraco (fora da tela)
                if (inimigo.y < -64) {
                    if (inimigo.armaElemento) inimigo.armaElemento.remove();
                    if (inimigo.botaElemento) inimigo.botaElemento.remove();
                    if (inimigo.escudoElemento) inimigo.escudoElemento.remove();
                    if (inimigo.jetpackElemento) inimigo.jetpackElemento.remove();
                    if (inimigo.jetFogoElemento) inimigo.jetFogoElemento.remove();
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
                                ((item.tipo === 'revolver' && inimigo.temArma) ||
                                 (item.tipo === 'escudo' && inimigo.temEscudo) ||
                                 (item.tipo === 'bota' && inimigo.temBota) ||
                                 (item.tipo === 'jetpack' && inimigo.temJetpack))) continue;

                            inimigo.estaColetando = true;
                            inimigo.timerColeta = 180; // 3 segundos a 60fps
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
                            if (item.tipo === 'revolver') { inimigo.temArma = true; inimigo.municao = config.maxMunicao; if (inimigo.armaElemento) inimigo.armaElemento.style.display = 'block'; }
                            else if (item.tipo === 'escudo') { inimigo.temEscudo = true; inimigo.escudoVermelho = false; inimigo.escudoProtegido = 0; if (inimigo.escudoElemento) inimigo.escudoElemento.style.display = 'block'; }
                            else if (item.tipo === 'bota') { inimigo.temBota = true; if (inimigo.botaElemento) inimigo.botaElemento.style.display = 'block'; }
                            else if (item.tipo === 'jetpack') { inimigo.temJetpack = true; if (inimigo.jetpackElemento) inimigo.jetpackElemento.style.display = 'block'; }
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
                                    console.log("IA: Inimigo restaurou equipamentos via AirDrop!");
                                } else {
                                    // Sorteia um equipamento que o inimigo ainda não possua
                                    const pendentes = [];
                                    if (!inimigo.temArma) pendentes.push('revolver');
                                    if (!inimigo.temEscudo) pendentes.push('escudo');
                                    if (!inimigo.temBota) pendentes.push('bota');
                                    if (!inimigo.temJetpack) pendentes.push('jetpack');

                                    if (pendentes.length > 0) {
                                        const novo = pendentes[Math.floor(Math.random() * pendentes.length)];
                                        if (novo === 'revolver') { inimigo.temArma = true; inimigo.municao = config.maxMunicao; if (inimigo.armaElemento) inimigo.armaElemento.style.display = 'block'; }
                                        else if (novo === 'escudo') { inimigo.temEscudo = true; inimigo.escudoVermelho = false; inimigo.escudoProtegido = 0; if (inimigo.escudoElemento) inimigo.escudoElemento.style.display = 'block'; }
                                        else if (novo === 'bota') { inimigo.temBota = true; if (inimigo.botaElemento) inimigo.botaElemento.style.display = 'block'; }
                                        else if (novo === 'jetpack') { inimigo.temJetpack = true; if (inimigo.jetpackElemento) inimigo.jetpackElemento.style.display = 'block'; }
                                        inimigo.inventario.push(novo);
                                    }
                                }
                            }
                            
                            if (item.tipo !== 'airdrop') inimigo.inventario.push(item.tipo);
                            item.elemento.remove();
                            window.itensColetaveis.splice(itemIndex, 1);
                        }
                        inimigo.estaColetando = false;
                    }
                }

                let movendoDestaVez = false;
                // Ações que dependem da ativação (movimento e ataque) - só se não estiver afastando
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
                        
                        // console.log(`Inimigo disparou! Munição restante: ${inimigo.municao}`);
                    }

                    // Lógica de perseguição: move-se na direção do Alvo (AirDrop ou Player)
                    // Aumentamos a margem de parada baseada na velocidade para evitar travamentos
                    if (inimigo.x < xAlvo - velAtiva) {
                        if (inimigo.tempoChute === 0) {
                            inimigo.x += velAtiva;
                            inimigo.direcao = 'd';
                            inimigo.elemento.style.transform = 'scaleX(1)';
                            movendoDestaVez = true;
                        }
                    } else if (inimigo.x > xAlvo + velAtiva) {
                        if (inimigo.tempoChute === 0) {
                            inimigo.x -= velAtiva;
                            inimigo.direcao = 'e';
                            inimigo.elemento.style.transform = 'scaleX(-1)';
                            movendoDestaVez = true;
                        }
                    }

                    // Lógica de Pulo por Diferença de Altura (Vertical Tracking) - Item 2
                    if (inimigo.noChao && (inimigo.cooldownPulo || 0) === 0 && yAlvo > inimigo.y + 31) {
                        // Se o player estiver acima e o inimigo estiver perto horizontalmente (ex: 64px)
                        const distXAlvo = Math.abs(xAlvo - inimigo.x);
                        if (distXAlvo < 64 && inimigo.puloTimer === 0 && !inimigo.jumpQueued) {
                            // Agenda o pulo com um delay aleatório
                            inimigo.puloTimer = Math.floor(Math.random() * (config.inimigoPuloDelayMax - config.inimigoPuloDelayMin + 1)) + config.inimigoPuloDelayMin;
                            inimigo.jumpQueued = true;
                        }
                    }

                    // Lógica de Salto de Fé (Gap Jumping) - Item 3
                    if (movendoDestaVez && inimigo.noChao && (inimigo.cooldownPulo || 0) === 0) {
                        // Calcula ponto de verificação à frente dos pés (baseado na direção)
                        const checkX = (inimigo.direcao === 'd') 
                            ? inimigo.x + (inimigo.offsetX || 0) + inimigo.largura + 10 
                            : inimigo.x + (inimigo.offsetX || 0) - 10;
                        
                        const checkY = inimigo.y - 10; // Verifica o chão logo abaixo do nível atual
                        
                        // Se não houver plataforma detectada à frente e abaixo, o inimigo pula
                        if (typeof verificarColisaoComTiles === 'function' &&
                            !verificarColisaoComTiles(checkX, checkY, 2, 2, window.plataformas) && inimigo.puloTimer === 0 && !inimigo.jumpQueued) {
                            // Agenda o pulo com um delay aleatório, usando os valores específicos para buracos
                            const minDelay = config.inimigoPuloDelayMinGap ?? 0;
                            const maxDelay = config.inimigoPuloDelayMaxGap ?? 10;
                            inimigo.puloTimer = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
                            inimigo.jumpQueued = true; // Comentado conforme solicitado
                            // console.log('Inimigo iniciou timer de pulo por vácuo:', inimigo.puloTimer, 'frames'); // Comentado conforme solicitado
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
                            x: window.playerControle.x + (window.playerControle.offsetX || 0), 
                            y: window.playerControle.y, 
                            largura: window.playerControle.largura, 
                            altura: window.playerControle.altura 
                        };

                        // Verifica colisão precisa (0 padding pois as caixas já estão ajustadas)
                        if (typeof detectarColisaoHitbox === 'function' && 
                            detectarColisaoHitbox(hitboxAtaqueInimigo, hurtboxPlayer, 0, 0, 0)) {
                            
                            inimigo.jaAtacouNesteChute = true;
                            
                            const escudoAtivo = temEscudoAtivo();
                            if (!escudoAtivo) {
                                window.playerControle.dano = (window.playerControle.dano || 0) + 1;
                                // console.log(`Dano: Jogador atingido! Total: ${window.playerControle.dano}/3`);
                                
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
                            const limiteVida = window.playerControle.maxVida || 3;
                            if (window.playerControle.dano >= limiteVida) {
                                window.playerControle.dano = 0; // Reset imediato para evitar repetição do alert
                                alert("Game Over! Você foi derrotado pelos inimigos.");
                                if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
                            }
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

                // Sincroniza a arma com o inimigo
                if (inimigo.armaElemento) {
                    inimigo.armaElemento.style.left = inimigo.x + 'px';
                    inimigo.armaElemento.style.bottom = inimigo.y + 'px';
                    inimigo.armaElemento.style.transform = inimigo.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
                    // Aplica filtro vermelho se o inimigo estiver sem munição
                    inimigo.armaElemento.style.filter = (inimigo.municao <= 0) ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
                }

                // Sincroniza o escudo com o inimigo
                if (inimigo.escudoElemento && inimigo.temEscudo) {
                    inimigo.escudoElemento.style.left = inimigo.x + 'px';
                    inimigo.escudoElemento.style.bottom = inimigo.y + 'px';
                    inimigo.escudoElemento.style.transform = inimigo.elemento.style.transform;

                    inimigo.escudoElemento.src = config.spriteEscudoPlayer || 'personagem/escudo.png';
                    // Aplica filtro vermelho se o escudo do inimigo quebrar
                    inimigo.escudoElemento.style.filter = inimigo.escudoVermelho ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
                }

                // Sincroniza a bota com o inimigo
                if (inimigo.botaElemento && inimigo.temBota) {
                    inimigo.botaElemento.style.left = inimigo.x + 'px';
                    inimigo.botaElemento.style.bottom = inimigo.y + 'px';
                    inimigo.botaElemento.style.transform = inimigo.elemento.style.transform;
                    
                    if (estaChutando) {
                        inimigo.botaElemento.src = config.spriteBotaChutando || 'personagem/bota_chutando.png';
                    } else if (!inimigo.noChao) {
                        // Se estiver no ar, usa o sprite específico para o ar
                        inimigo.botaElemento.src = config.spriteBotaNoAr || 'personagem/bota_no_ar.png';
                    } else if (movendoDestaVez) {
                        inimigo.botaElemento.src = (inimigo.frameAtual === 1)
                            ? (config.spriteBotaAndando || 'personagem/bota_andando.png')
                            : (config.spriteBotaParado || 'personagem/bota_parado.png');
                    } else {
                        inimigo.botaElemento.src = config.spriteBotaParado || 'personagem/bota_parado.png';
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
            }
        }

        // Mantém o loop de movimentação da IA
        requestAnimationFrame(atualizarIA);
    }

    // Inicia o ciclo de atualização
    requestAnimationFrame(atualizarIA);
}