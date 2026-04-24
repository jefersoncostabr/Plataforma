(function () {
    function criarImpactoVerticalGarraGlobal(x, y) {
        const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
        const impacto = document.createElement('img');
        impacto.src = '../../assets/personagem/impacto.png';
        impacto.style.position = 'absolute';
        impacto.style.width = '32px';
        impacto.style.height = '64px';
        impacto.style.left = (x - 8) + 'px';
        impacto.style.bottom = (y - 16) + 'px';
        impacto.style.transform = 'rotate(90deg) scale(1)';
        impacto.style.transformOrigin = 'center center';
        impacto.style.imageRendering = 'pixelated';
        impacto.style.pointerEvents = 'none';

        if (typeof adicionarAoLayer === 'function' && window.LAYERS?.EFEITOS) {
            adicionarAoLayer(impacto, window.LAYERS.EFEITOS);
        } else {
            palco.appendChild(impacto);
        }

        requestAnimationFrame(() => {
            impacto.style.transform = 'rotate(90deg) scale(0.2)';
            impacto.style.opacity = '0';
        });
        setTimeout(() => impacto.remove(), 400);
    }

    window.criarImpactoVerticalGarra = criarImpactoVerticalGarraGlobal;

    function criarSistemaGarraJogador(opcoes = {}) {
        const {
            controle,
            config,
            elemento,
            garraElemento,
            armaElemento,
            escudoElemento,
            botaElemento,
            jetpackElemento,
            cintoElemento,
            coleteElemento,
            atualizarVisualEscudo = () => {},
            salvarInventario = () => {},
            animarDanoAlvo = () => {},
            obterKnockback = () => 0,
            virarFenoParaFonteDano = () => {},
            processarMorteFeno = () => false,
            removerInimigoDerrotado = () => {},
            flashComVibacao = () => {}
        } = opcoes;

        if (!controle || !config || !elemento || !garraElemento) {
            throw new Error('Controle, config, elemento do jogador e garraElemento são obrigatórios para inicializar a garra.');
        }

        controle.garraAnimEstado = controle.garraAnimEstado || 'idle';
        controle.garraTimer = controle.garraTimer || 0;
        controle.garraDist = controle.garraDist || 0;
        controle.garraBracos = Array.isArray(controle.garraBracos) ? controle.garraBracos : [];
        controle.garraDirecaoAnim = controle.garraDirecaoAnim || 'd';
        controle.garraItemCarregado = controle.garraItemCarregado || null;
        controle.garraVermelha = !!controle.garraVermelha;
        controle.garraImpactosSolidos = Number(controle.garraImpactosSolidos || 0);

        function atualizarVisualEstadoGarra() {
            if (typeof window.atualizarVisualGarra === 'function') {
                window.atualizarVisualGarra();
            } else if (garraElemento) {
                garraElemento.style.filter = controle.garraVermelha ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
            }
        }

        function resetarVisualGarra() {
            // Garante limpeza de braços esticados
            if (Array.isArray(controle.garraBracos)) {
                controle.garraBracos.forEach(b => b?.remove());
                controle.garraBracos = [];
            }
            garraElemento.src = window.obterSpriteItem('garra', config, 'equipado');
            atualizarVisualEstadoGarra();
        }

        function sincronizarEquipamentoNoJogador(equipamento) {
            if (!equipamento || typeof window.sincronizarAcessoriosEntidade !== 'function') return;
            
            // Mapeia o elemento isolado para o formato esperado pelo sincronizador global
            const elementoChave = equipamento.id === 'player-weapon' ? 'armaElemento' :
                                 equipamento.id === 'player-shield' ? 'escudoElemento' :
                                 equipamento.id === 'player-boots' ? 'botaElemento' :
                                 equipamento.id === 'player-vest' ? 'coleteElemento' : 
                                 equipamento.id === 'player-jetpack' ? 'jetpackElemento' : null;
            
            if (elementoChave) {
                window.sincronizarAcessoriosEntidade(controle, { [elementoChave]: equipamento });
            }
        }

        function criarImpactoVerticalGarra(x, y) {
            if (typeof window.criarImpactoVerticalGarra === 'function') {
                window.criarImpactoVerticalGarra(x, y);
            }
        }

        function registrarImpactoSolidoGarra() {
            if (!controle.temGarra || controle.itensGuardadosNoCinto || controle.garraVermelha) return;

            const maxImpactos = Math.max(1, Number(config?.garraImpactosAteDanificar ?? window.config?.garraImpactosAteDanificar ?? 3));
            controle.garraImpactosSolidos = Number(controle.garraImpactosSolidos || 0) + 1;

            if (controle.garraImpactosSolidos >= maxImpactos) {
                controle.garraImpactosSolidos = maxImpactos;
                controle.garraVermelha = true;
            }

            atualizarVisualEstadoGarra();
            salvarInventario();
        }

        function acionarGarra() {
            if (controle.temGarra && !controle.garraVermelha && !controle.itensGuardadosNoCinto && controle.garraAnimEstado === 'idle') {
                controle.garraAnimEstado = 'prep';
                controle.garraTimer = 18;
                controle.garraDirecaoAnim = controle.direcao;
            }
        }

        function coletarItemGarra(item) {
            if (!item) return false;

            if (typeof window.tentarColetarItemJogador === 'function' && item.tipo !== 'airdrop') {
                const coletadoPeloInventario = window.tentarColetarItemJogador(item);
                if (typeof coletadoPeloInventario === 'boolean') {
                    return coletadoPeloInventario;
                }
            }

            // Se o item definitions não for encontrado ou falhar, tentamos a lógica básica de tipos
            if (item.tipo === 'jetpack') {
                controle.temJetpack = true;
                if (!controle.inventario.includes('jetpack')) controle.inventario.push('jetpack');
                controle.timerVooRestante = config.jetpackDuracaoVoo || 360;
                controle.cooldownVooJetpack = 0;
                jetpackElemento.style.display = 'block';
                sincronizarEquipamentoNoJogador(jetpackElemento);
            } else if (item.tipo === 'garra') {
                controle.temGarra = true;
                controle.garraImpactosSolidos = Number(item.garraImpactosSolidos || 0);
                controle.garraVermelha = !!item.garraVermelha;
                if (!controle.inventario.includes('garra')) controle.inventario.push('garra');
                garraElemento.style.display = 'block';
                sincronizarEquipamentoNoJogador(garraElemento);
                atualizarVisualEstadoGarra();
            } else if (item.tipo === 'cinto') {
                controle.temCinto = true;
                if (!controle.inventario.includes('cinto')) controle.inventario.push('cinto');
                cintoElemento.style.display = 'block';
                sincronizarEquipamentoNoJogador(cintoElemento);
            } else if (item.tipo === 'colete') {
                controle.temColete = true;
                if (!controle.inventario.includes('colete')) controle.inventario.push('colete');
                if (coleteElemento) {
                    coleteElemento.style.display = 'block';
                    sincronizarEquipamentoNoJogador(coleteElemento);
                }
            } else if (item.tipo === 'airdrop') {
                // Garante que sempre haverá pelo menos um conteúdo válido
                let conteudos = config.airdrop1?.conteudos;
                if (!Array.isArray(conteudos) || conteudos.length === 0) conteudos = ['item'];
                let sorteio = conteudos[Math.floor(Math.random() * conteudos.length)];

                // Se o sorteio não for reconhecido, força cair um item
                const validos = ['skillpoint', 'xp', 'restauracao', 'skill', 'item'];
                if (!validos.includes(sorteio)) sorteio = 'item';

                if (sorteio === 'skillpoint') {
                    console.log('AirDrop resgatado pela garra! Conteúdo: 1 Ponto de Skill');
                    window.skillPoints += 1;
                    if (typeof window.salvarProgressoSkills === 'function') window.salvarProgressoSkills();
                } else if (sorteio === 'xp') {
                    console.log('AirDrop resgatado pela garra! Conteúdo: 6 XP');
                    if (typeof window.ganharXP === 'function') window.ganharXP(6);
                } else if (sorteio === 'restauracao') {
                    console.log('AirDrop resgatado pela garra! Conteúdo: Restauração Completa');
                    window.aplicarRestauracaoPadrao?.(controle, config, {
                        atualizarVisualEscudo,
                        atualizarVisualBota: window.atualizarVisualBota,
                        atualizarVisualGarra: window.atualizarVisualGarra
                    });
                } else if (sorteio === 'skill') {
                    if (window.skillsData && Object.keys(window.skillsData).length > 0) {
                        const disponiveis = Object.keys(window.skillsData).filter(s => !window.playerSkills.includes(s) && window.skillsData[s].parent === null);
                        if (disponiveis.length > 0) {
                            const skillSorteada = disponiveis[Math.floor(Math.random() * disponiveis.length)];
                            window.playerSkills.push(skillSorteada);
                            if (typeof window.aplicarEfeitosSkills === 'function') window.aplicarEfeitosSkills();
                            if (typeof window.salvarProgressoSkills === 'function') window.salvarProgressoSkills();
                            console.log('AirDrop resgatado pela garra! Conteúdo: Skill (' + window.skillsData[skillSorteada].nome + ')');
                        } else {
                            console.log('AirDrop resgatado pela garra! Conteúdo: 5 XP (Nenhuma skill disponível)');
                            if (typeof window.ganharXP === 'function') window.ganharXP(5);
                        }
                    }
                } 
                // Sempre garante um item se nada acima for sorteado
                if (sorteio === 'item' || !validos.includes(sorteio)) {
                    const itensDisponiveis = ['revolver', 'escudo', 'bota', 'jetpack', 'garra', 'cinto', 'colete'];
                    const itemSorteado = itensDisponiveis[Math.floor(Math.random() * itensDisponiveis.length)];

                    console.log('AirDrop resgatado pela garra! Conteúdo: Item (' + itemSorteado + ')');

                    if (itemSorteado === 'escudo') {
                        controle.temEscudo = true;
                        controle.escudoVermelho = false;
                        controle.escudoProtegido = 0;
                        if (!controle.inventario.includes('escudo')) controle.inventario.push('escudo');
                        atualizarVisualEscudo();
                    } else if (itemSorteado === 'bota') {
                        controle.temBota = true;
                        if (!controle.inventario.includes('bota')) controle.inventario.push('bota');
                        botaElemento.style.display = 'block';
                    } else if (itemSorteado === 'jetpack') {
                        controle.temJetpack = true;
                        if (!controle.inventario.includes('jetpack')) controle.inventario.push('jetpack');
                        jetpackElemento.style.display = 'block';
                    } else if (itemSorteado === 'garra') {
                        controle.temGarra = true;
                        controle.garraImpactosSolidos = 0;
                        controle.garraVermelha = false;
                        if (!controle.inventario.includes('garra')) controle.inventario.push('garra');
                        garraElemento.style.display = 'block';
                        atualizarVisualEstadoGarra();
                    } else if (itemSorteado === 'revolver') {
                        controle.temArma = true;
                        controle.municao = config.maxMunicao || 5;
                        window.AudioManager?.playSFX('recarga', 0.6);
                        if (!controle.inventario.includes('revolver')) controle.inventario.push('revolver');
                        armaElemento.style.display = 'block';
                    } else if (itemSorteado === 'cinto') {
                        controle.temCinto = true;
                        if (!controle.inventario.includes('cinto')) controle.inventario.push('cinto');
                        cintoElemento.style.display = 'block';
                    }
                }
            } else if (item.tipo === 'revolver') {
                const novaMunicao = item.municao !== undefined ? item.municao : (config.maxMunicao || 5);
                controle.municao = Math.min((controle.municao || 0) + novaMunicao, (config.maxMunicao || 5) * 2);
                controle.temArma = true;
                window.AudioManager?.playSFX('recarga', 0.6);
                if (!controle.inventario.includes('revolver')) controle.inventario.push('revolver');
                armaElemento.style.display = 'block';
            } else if (item.tipo === 'restauracao') {
                window.aplicarRestauracaoPadrao?.(controle, config, {
                    atualizarVisualEscudo,
                    atualizarVisualBota: window.atualizarVisualBota,
                    atualizarVisualGarra: window.atualizarVisualGarra
                });
            }
            salvarInventario();
            return true;
        }

        function atualizarAnimacaoGarra() {
            if (controle.garraAnimEstado === 'idle') return;

            const velGarra = 8;
            const distMax = 32 * 5;
            const dirX = controle.garraDirecaoAnim === 'd' ? 1 : -1;

            controle.garraBracos.forEach((braco, index) => {
                const offset = index * 32;
                braco.style.left = (controle.x + (offset * dirX)) + 'px';
                braco.style.bottom = controle.y + 'px';
            });

            garraElemento.style.left = (controle.x + (controle.garraDist * dirX)) + 'px';
            garraElemento.style.bottom = controle.y + 'px';
            garraElemento.style.transform = (controle.garraDirecaoAnim === 'e' ? 'scaleX(-1)' : 'scaleX(1)');

            if (controle.garraAnimEstado === 'prep') {
                garraElemento.src = window.obterSpriteItem('garra_using1', config);
                controle.garraTimer--;
                if (controle.garraTimer <= 0) {
                    controle.garraAnimEstado = 'esticando';
                }
            }
            else if (controle.garraAnimEstado === 'esticando') {
                const proxDist = controle.garraDist + velGarra;
                const tipX = controle.x + (proxDist * dirX);

                if (typeof verificarColisaoComTiles === 'function' &&
                    verificarColisaoComTiles(tipX, controle.y, 32, 32, window.plataformas)) {
                    criarImpactoVerticalGarra(tipX, controle.y);
                    registrarImpactoSolidoGarra();
                    controle.garraAnimEstado = 'catching';
                    controle.garraTimer = 18;
                    garraElemento.src = window.obterSpriteItem('garra_catching', config);
                } else {
                    controle.garraDist = proxDist;
                }
                garraElemento.src = window.obterSpriteItem('garra_using1', config);
                if (controle.garraDist > distMax) {
                    controle.garraDist = distMax;
                }

                let grabbedSomething = false;
                if (window.inimigos && window.inimigos.length > 0) {
                    for (let j = window.inimigos.length - 1; j >= 0; j--) {
                        const inimigo = window.inimigos[j];
                        const hitboxGarra = {
                            x: parseInt(garraElemento.style.left),
                            y: parseInt(garraElemento.style.bottom),
                            largura: 32,
                            altura: 32
                        };
                        const hitboxInimigo = {
                            x: inimigo.x + (inimigo.offsetX || 0),
                            y: inimigo.y,
                            largura: inimigo.largura,
                            altura: inimigo.altura
                        };

                        if (detectarColisaoHitbox(hitboxGarra, hitboxInimigo, 0, 0, 0)) {
                            controle.garraItemCarregado = inimigo;
                            inimigo.stunned = true;
                            inimigo.stunTimer = Number(config.garraStunDuration ?? 180);
                            inimigo.garraAnimEstado = 'idle';
                            inimigo.foiAtingidoNesteChute = false;
                            window.inimigos.splice(j, 1);
                            controle.garraAnimEstado = 'voltando';
                            garraElemento.src = window.obterSpriteItem('garra_catching', config);
                            grabbedSomething = true;
                            break;
                        }
                    }
                }

                if (!grabbedSomething) {
                    for (let i = window.itensColetaveis.length - 1; i >= 0; i--) {
                        const item = window.itensColetaveis[i];
                        const hitboxGarra = {
                            x: parseInt(garraElemento.style.left),
                            y: parseInt(garraElemento.style.bottom),
                            largura: 32,
                            altura: 32
                        };
                        const hitboxItem = {
                            x: item.x,
                            y: item.y,
                            largura: 32,
                            altura: 32
                        };

                        if (detectarColisaoHitbox(hitboxGarra, hitboxItem, 0, 0, 0)) {
                            controle.garraItemCarregado = item;
                            window.itensColetaveis.splice(i, 1);
                            controle.garraAnimEstado = 'voltando';
                            garraElemento.src = window.obterSpriteItem('garra_catching', config);
                            break;
                        }
                    }
                }

                if (controle.garraDist > 0 && controle.garraDist % 32 < velGarra && controle.garraDist <= distMax) {
                    const braco = document.createElement('img');
                    braco.src = (controle.garraBracos.length === 0) ? window.obterSpriteItem('garra_using2', config) : window.obterSpriteItem('garra_braco', config);
                    braco.className = 'player-claw-arm';
                    braco.style.position = 'absolute';
                    braco.style.width = '32px';
                    braco.style.height = '32px';
                    braco.style.zIndex = '8';
                    braco.style.imageRendering = 'pixelated';
                    braco.style.pointerEvents = 'none';

                    const offsetBraco = (controle.garraBracos.length * 32);
                    braco.style.left = (controle.x + (offsetBraco * dirX)) + 'px';
                    braco.style.bottom = controle.y + 'px';
                    braco.style.transform = controle.garraDirecaoAnim === 'e' ? 'scaleX(-1)' : 'scaleX(1)';

                    elemento.parentElement.appendChild(braco);
                    controle.garraBracos.push(braco);
                }
                if (controle.garraDist >= distMax && controle.garraItemCarregado === null) {
                    controle.garraAnimEstado = 'catching';
                    controle.garraTimer = 18;
                    garraElemento.src = window.obterSpriteItem('garra_catching', config);
                }
            }
            else if (controle.garraAnimEstado === 'catching') {
                controle.garraTimer--;
                if (controle.garraTimer <= 0) {
                    controle.garraAnimEstado = 'voltando';
                }
            }
            else if (controle.garraAnimEstado === 'voltando') {
                controle.garraDist -= velGarra;

                if (controle.garraItemCarregado && controle.garraItemCarregado.elemento) {
                    garraElemento.src = window.obterSpriteItem('garra_catching', config); // Mantém o sprite de "pegando" durante a retração
                    const carried = controle.garraItemCarregado;
                    carried.elemento.style.left = garraElemento.style.left;
                    carried.elemento.style.bottom = garraElemento.style.bottom;
                    carried.x = parseInt(garraElemento.style.left);
                    carried.y = parseInt(garraElemento.style.bottom);

                    if (carried.isEnemy) {
                        if (typeof window.sincronizarAcessoriosPortador === 'function') {
                            window.sincronizarAcessoriosPortador(carried, {
                                armaElemento: carried.armaElemento,
                                escudoElemento: carried.escudoElemento,
                                botaElemento: carried.botaElemento,
                                jetpackElemento: carried.jetpackElemento,
                                garraElemento: carried.garraElemento,
                                cintoElemento: carried.cintoElemento,
                                coleteElemento: carried.coleteElemento
                            }, {
                                x: carried.x,
                                y: carried.y,
                                transform: carried.elemento.style.transform,
                                forçarSincroniaGarra: true
                            });
                        }
                    }
                }

                if (controle.garraDist % 32 < velGarra && controle.garraBracos.length > 0) {
                    const ultimoBraco = controle.garraBracos.pop();
                    ultimoBraco.remove();
                }

                if (controle.garraItemCarregado && controle.garraDist <= velGarra) {
                    if (controle.garraItemCarregado.isEnemy) {
                        const inimigoAtingido = controle.garraItemCarregado;

                        // Ativa os sons de chute e impacto (consistente com combate-corpo-a-corpo.js)
                        
                        window.AudioManager?.playSFX('impacto', 0.6);

                        controle.tempoChute = config.tempoChute;
                        controle.cooldownChute = Number(config.cooldownChute ?? 0);
                        controle.framesImpulsoRestante = 0;
                        controle.velocidadeDash = 0;

                        // Adiciona o inimigo de volta à lista global para que a IA e a Morte possam processá-lo
                        if (!window.inimigos.includes(inimigoAtingido)) {
                            window.inimigos.push(inimigoAtingido);
                        }

                        inimigoAtingido.foiAtingidoNesteChute = true;
                        inimigoAtingido.vida = (inimigoAtingido.vida || 0) + 1;
                        console.log(`[COMBATE] Inimigo recebeu 1 de dano (Garra). Dano acumulado: ${inimigoAtingido.vida}/3`);

                        if (inimigoAtingido.vida < 3) animarDanoAlvo(inimigoAtingido);

                        inimigoAtingido.stunned = false;
                        inimigoAtingido.stunTimer = 0;
                        inimigoAtingido.elemento.style.filter = 'none';

                        const direcaoKnockback = (controle.direcao === 'd' ? 1 : -1);
                        const valorKnockbackInimigo = typeof window.obterKnockbackRecebidoPadrao === 'function'
                            ? window.obterKnockbackRecebidoPadrao(inimigoAtingido, config, 'playerChute')
                            : obterKnockback(config, 'playerChute');

                        const duracaoRecuoInimigo = 15;
                        inimigoAtingido.framesKnockbackRestante = duracaoRecuoInimigo;
                        inimigoAtingido.velocidadeKnockback = (valorKnockbackInimigo / duracaoRecuoInimigo) * direcaoKnockback;
                        virarFenoParaFonteDano(inimigoAtingido, controle.x + ((controle.largura || 32) / 2));

                        if (inimigoAtingido.vida >= 3) {
                            window.prepararMorteInimigo?.(inimigoAtingido, direcaoKnockback);
                        }
                    } else {
                        const foiColetado = coletarItemGarra(controle.garraItemCarregado);
                        if (foiColetado) {
                            controle.garraItemCarregado.elemento.remove();
                        } else {
                            controle.garraItemCarregado.velocidadeY = 0;
                            window.itensColetaveis.push(controle.garraItemCarregado);
                        }
                    }
                    controle.garraItemCarregado = null;
                    controle.garraAnimEstado = 'idle';
                    resetarVisualGarra();
                }

                if (controle.garraDist <= 0 && controle.garraItemCarregado === null) {
                    controle.garraAnimEstado = 'idle';
                    resetarVisualGarra();
                }
            }
        }

        return {
            acionarGarra,
            coletarItemGarra,
            atualizarAnimacaoGarra,
            resetarVisualGarra
        };
    }

    window.criarSistemaGarraJogador = criarSistemaGarraJogador;

})();
