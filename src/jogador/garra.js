(function () {
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

        function resetarVisualGarra() {
            garraElemento.src = config.spriteGarraPlayer || '../../assets/personagem/garra.png';
            controle.garraBracos.forEach((braco) => {
                if (braco && typeof braco.remove === 'function') braco.remove();
            });
            controle.garraBracos = [];
        }

        function sincronizarEquipamentoNoJogador(equipamento) {
            if (!equipamento) return;
            const offsetY = equipamento.id === 'player-vest' && controle.estaAgachado ? -5 : 0;
            equipamento.style.left = controle.x + 'px';
            equipamento.style.bottom = (controle.y + offsetY) + 'px';
            equipamento.style.transform = controle.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
        }

        function acionarGarra() {
            if (controle.temGarra && !controle.itensGuardadosNoCinto && controle.garraAnimEstado === 'idle') {
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

            if (window.itemDefinitions && window.itemDefinitions[item.tipo]) {
                const itemData = window.itemDefinitions[item.tipo];
                if (window.aplicarEfeitoColeta && typeof window.aplicarEfeitoColeta === 'function') {
                    window.aplicarEfeitoColeta(controle, itemData);
                } else if (itemData.efeitos && itemData.efeitos.jogador) {
                    for (const [chave, valor] of Object.entries(itemData.efeitos.jogador)) {
                        controle[chave] = valor;
                    }
                }

                if (item.tipo === 'restauracao') {
                    controle.municao = config.maxMunicao || 5;
                    controle.escudoProtegido = 0;
                    controle.escudoVermelho = false;
                    controle.dano = Math.max(0, (controle.dano || 0) - 1);
                    if (controle.inventario.includes('escudo')) {
                        controle.temEscudo = true;
                    }
                    atualizarVisualEscudo();
                }

                if (item.tipo === 'revolver') {
                    if (itemData.spriteEquipado) armaElemento.src = itemData.spriteEquipado;
                    armaElemento.style.display = 'block';
                    sincronizarEquipamentoNoJogador(armaElemento);
                } else if (item.tipo === 'escudo') {
                    if (itemData.spriteEquipado) escudoElemento.src = itemData.spriteEquipado;
                    escudoElemento.style.display = 'block';
                    sincronizarEquipamentoNoJogador(escudoElemento);
                    atualizarVisualEscudo();
                } else if (item.tipo === 'bota') {
                    if (itemData.spriteEquipado) botaElemento.src = itemData.spriteEquipado;
                    botaElemento.style.display = 'block';
                    sincronizarEquipamentoNoJogador(botaElemento);
                } else if (item.tipo === 'jetpack') {
                    if (itemData.spriteEquipado) jetpackElemento.src = itemData.spriteEquipado;
                    jetpackElemento.style.display = 'block';
                    sincronizarEquipamentoNoJogador(jetpackElemento);
                } else if (item.tipo === 'garra') {
                    if (itemData.spriteEquipado) garraElemento.src = itemData.spriteEquipado;
                    garraElemento.style.display = 'block';
                    sincronizarEquipamentoNoJogador(garraElemento);
                } else if (item.tipo === 'cinto') {
                    if (itemData.spriteEquipado) cintoElemento.src = itemData.spriteEquipado;
                    cintoElemento.style.display = 'block';
                    sincronizarEquipamentoNoJogador(cintoElemento);
                } else if (item.tipo === 'colete') {
                    if (itemData.spriteEquipado && coleteElemento) coleteElemento.src = itemData.spriteEquipado;
                    if (coleteElemento) {
                        coleteElemento.style.display = 'block';
                        sincronizarEquipamentoNoJogador(coleteElemento);
                    }
                }

                if (!controle.inventario.includes(item.tipo) && item.tipo !== 'airdrop' && item.tipo !== 'restauracao') {
                    controle.inventario.push(item.tipo);
                }
                salvarInventario();
                return true;
            }

            if (item.tipo === 'escudo') {
                controle.temEscudo = true;
                controle.escudoVermelho = item.escudoVermelho || false;
                controle.escudoProtegido = item.escudoProtegido || 0;
                if (!controle.inventario.includes('escudo')) controle.inventario.push('escudo');
                escudoElemento.style.display = 'block';
                sincronizarEquipamentoNoJogador(escudoElemento);
                atualizarVisualEscudo();
            } else if (item.tipo === 'bota') {
                controle.temBota = true;
                if (!controle.inventario.includes('bota')) controle.inventario.push('bota');
                botaElemento.style.display = 'block';
                sincronizarEquipamentoNoJogador(botaElemento);
            } else if (item.tipo === 'jetpack') {
                controle.temJetpack = true;
                if (!controle.inventario.includes('jetpack')) controle.inventario.push('jetpack');
                controle.timerVooRestante = config.jetpackDuracaoVoo || 360;
                controle.cooldownVooJetpack = 0;
                jetpackElemento.style.display = 'block';
                sincronizarEquipamentoNoJogador(jetpackElemento);
            } else if (item.tipo === 'garra') {
                controle.temGarra = true;
                if (!controle.inventario.includes('garra')) controle.inventario.push('garra');
                garraElemento.style.display = 'block';
                sincronizarEquipamentoNoJogador(garraElemento);
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
                const conteudos = config.airdrop1?.conteudos || ['xp'];
                const sorteio = conteudos[Math.floor(Math.random() * conteudos.length)];
                console.log('AirDrop resgatado pela garra! Conteúdo: ' + sorteio);

                if (sorteio === 'skillpoint') {
                    window.skillPoints += 1;
                } else if (sorteio === 'xp') {
                    if (typeof window.ganharXP === 'function') window.ganharXP(6);
                } else if (sorteio === 'restauracao') {
                    controle.municao = config.maxMunicao || 5;
                    controle.escudoProtegido = 0;
                    controle.escudoVermelho = false;
                    controle.dano = Math.max(0, (controle.dano || 0) - 1);
                    if (controle.inventario.includes('escudo')) {
                        controle.temEscudo = true;
                    }
                    atualizarVisualEscudo();
                } else if (sorteio === 'skill') {
                    if (window.skillsData && Object.keys(window.skillsData).length > 0) {
                        const disponiveis = Object.keys(window.skillsData).filter(s => !window.playerSkills.includes(s) && window.skillsData[s].parent === null);
                        if (disponiveis.length > 0) {
                            const skillSorteada = disponiveis[Math.floor(Math.random() * disponiveis.length)];
                            window.playerSkills.push(skillSorteada);
                            if (typeof window.aplicarEfeitosSkills === 'function') window.aplicarEfeitosSkills();
                            console.log('Nova Skill Desbloqueada: ' + window.skillsData[skillSorteada].nome);
                        } else {
                            if (typeof window.ganharXP === 'function') window.ganharXP(5);
                        }
                    }
                } else if (sorteio === 'item') {
                    const itensDisponiveis = ['revolver', 'escudo', 'bota', 'jetpack', 'garra', 'cinto'];
                    const itemSorteado = itensDisponiveis[Math.floor(Math.random() * itensDisponiveis.length)];

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
                        if (!controle.inventario.includes('garra')) controle.inventario.push('garra');
                        garraElemento.style.display = 'block';
                    } else if (itemSorteado === 'revolver') {
                        controle.temArma = true;
                        controle.municao = config.maxMunicao || 5;
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
                if (!controle.inventario.includes('revolver')) controle.inventario.push('revolver');
                armaElemento.style.display = 'block';
            } else if (item.tipo === 'restauracao') {
                controle.municao = config.maxMunicao || 5;
                controle.escudoProtegido = 0;
                controle.escudoVermelho = false;
                controle.dano = Math.max(0, (controle.dano || 0) - 1);
                if (controle.inventario.includes('escudo')) {
                    controle.temEscudo = true;
                }
                atualizarVisualEscudo();
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
                garraElemento.src = '../../assets/personagem/garra_using1.png';
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
                    controle.garraAnimEstado = 'catching';
                    controle.garraTimer = 18;
                    garraElemento.src = '../../assets/personagem/garra_catching.png';
                } else {
                    controle.garraDist = proxDist;
                }

                garraElemento.src = '../../assets/personagem/garra_using1.png';
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
                            garraElemento.src = '../../assets/personagem/garra_catching.png';
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
                            garraElemento.src = '../../assets/personagem/garra_catching.png';
                            break;
                        }
                    }
                }

                if (controle.garraDist > 0 && controle.garraDist % 32 < velGarra && controle.garraDist <= distMax) {
                    const braco = document.createElement('img');
                    braco.src = (controle.garraBracos.length === 0) ? '../../assets/personagem/garra_using2.png' : '../../assets/personagem/garra_braco.png';
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
                    garraElemento.src = '../../assets/personagem/garra_catching.png';
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

                if (controle.garraItemCarregado) {
                    const carried = controle.garraItemCarregado;
                    carried.elemento.style.left = garraElemento.style.left;
                    carried.elemento.style.bottom = garraElemento.style.bottom;
                    carried.x = parseInt(garraElemento.style.left);
                    carried.y = parseInt(garraElemento.style.bottom);

                    if (carried.isEnemy) {
                        if (typeof window.sincronizarAcessoriosPortador === 'function') {
                            window.sincronizarAcessoriosPortador(carried, carried.elemento, {
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
                                sincronizarGarraAnimando: true
                            });
                        } else {
                            if (carried.armaElemento) {
                                carried.armaElemento.style.left = garraElemento.style.left;
                                carried.armaElemento.style.bottom = garraElemento.style.bottom;
                                carried.armaElemento.style.transform = carried.elemento.style.transform;
                            }
                            if (carried.botaElemento) {
                                carried.botaElemento.style.left = garraElemento.style.left;
                                carried.botaElemento.style.bottom = garraElemento.style.bottom;
                                carried.botaElemento.style.transform = carried.elemento.style.transform;
                            }
                            if (carried.escudoElemento) {
                                carried.escudoElemento.style.left = garraElemento.style.left;
                                carried.escudoElemento.style.bottom = garraElemento.style.bottom;
                                carried.escudoElemento.style.transform = carried.elemento.style.transform;
                            }
                            if (carried.jetpackElemento) {
                                carried.jetpackElemento.style.left = garraElemento.style.left;
                                carried.jetpackElemento.style.bottom = garraElemento.style.bottom;
                                carried.jetpackElemento.style.transform = carried.elemento.style.transform;
                            }
                            if (carried.garraElemento) {
                                carried.garraElemento.style.left = garraElemento.style.left;
                                carried.garraElemento.style.bottom = garraElemento.style.bottom;
                                carried.garraElemento.style.transform = carried.elemento.style.transform;
                            }
                            if (carried.cintoElemento) {
                                carried.cintoElemento.style.left = garraElemento.style.left;
                                carried.cintoElemento.style.bottom = garraElemento.style.bottom;
                                carried.cintoElemento.style.transform = carried.elemento.style.transform;
                            }
                            if (carried.coleteElemento) {
                                carried.coleteElemento.style.left = garraElemento.style.left;
                                carried.coleteElemento.style.bottom = garraElemento.style.bottom;
                                carried.coleteElemento.style.transform = carried.elemento.style.transform;
                            }
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

                        controle.tempoChute = config.tempoChute;
                        controle.cooldownChute = Number(config.cooldownChute ?? 0);
                        controle.framesImpulsoRestante = 0;
                        controle.velocidadeDash = 0;

                        inimigoAtingido.foiAtingidoNesteChute = true;
                        inimigoAtingido.vida = (inimigoAtingido.vida || 0) + 1;
                        if (inimigoAtingido.vida < 3) animarDanoAlvo(inimigoAtingido);

                        inimigoAtingido.stunned = false;
                        inimigoAtingido.stunTimer = 0;
                        inimigoAtingido.elemento.style.filter = 'none';

                        const direcaoKnockback = (controle.direcao === 'd' ? 1 : -1);
                        let valorKnockbackInimigo = obterKnockback(config, 'playerChute');

                        if (inimigoAtingido.temEscudo && !inimigoAtingido.escudoVermelho && !inimigoAtingido.itensGuardadosNoCinto) {
                            valorKnockbackInimigo *= Number(config.escudoKnockbackMultiplicador ?? 0.5);
                        }

                        const duracaoRecuoInimigo = 15;
                        inimigoAtingido.framesKnockbackRestante = duracaoRecuoInimigo;
                        inimigoAtingido.velocidadeKnockback = (valorKnockbackInimigo / duracaoRecuoInimigo) * direcaoKnockback;
                        virarFenoParaFonteDano(inimigoAtingido, controle.x + ((controle.largura || 32) / 2));

                        if (inimigoAtingido.vida >= 3) {
                            if (inimigoAtingido.tipo === window.GAME_CONSTANTS.INIMIGO_FENO_ID) {
                                processarMorteFeno(inimigoAtingido);
                            } else {
                                if (typeof flashComVibacao === 'function') {
                                    flashComVibacao(inimigoAtingido.elemento);
                                }
                                removerInimigoDerrotado(inimigoAtingido);
                            }
                        } else {
                            window.inimigos.push(inimigoAtingido);
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
