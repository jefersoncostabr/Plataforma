/**
 * Gerenciador de animações procedurais para equipamentos.
 */

/**
 * Aciona um efeito de recuo (inclinação) no elemento da arma.
 * @param {HTMLElement} elemento - O elemento DOM da arma.
 * @param {number} duracao - Tempo em milissegundos que o efeito dura (padrão 100ms).
 */
function aplicarRecuoRevolver(elemento, duracao = 100) {
    if (!elemento) return;

    elemento.dataset.recoil = "true";

    setTimeout(() => {
        elemento.dataset.recoil = "false";
    }, duracao);
}

function inicializarEstadoCinto(controle) {
    if (!controle) return controle;

    if (typeof controle.itensGuardadosNoCinto !== 'boolean') controle.itensGuardadosNoCinto = false;
    if (typeof controle.cintoAnimando !== 'boolean') controle.cintoAnimando = false;
    if (typeof controle.cintoAnimTimeout === 'undefined') controle.cintoAnimTimeout = null;
    if (!Array.isArray(controle.cintoAnimClones)) controle.cintoAnimClones = [];

    return controle;
}

function criarElementosSuporteEquipamentos(opcoes = {}) {
    const { elemento, config = {}, controle = {} } = opcoes;
    if (!elemento?.parentElement) {
        throw new Error('Elemento do jogador com parentElement é obrigatório para criar suportes visuais.');
    }

    const criarImagem = ({ id, src, zIndex = '6', display = 'none' }) => {
        const img = document.createElement('img');
        img.id = id;
        img.src = src;
        img.style.position = 'absolute';
        img.style.width = '32px';
        img.style.height = '32px';
        img.style.zIndex = zIndex;
        img.style.display = display;
        img.style.imageRendering = 'pixelated';
        img.style.pointerEvents = 'none';
        elemento.parentElement.appendChild(img);
        return img;
    };

    const cintoElemento = criarImagem({
        id: 'player-belt',
        src: config.spriteCintoPlayer || '../../assets/personagem/cinto.png',
        zIndex: '6',
        display: controle.temCinto ? 'block' : 'none'
    });

    const paraquedasElemento = criarImagem({
        id: 'player-parachute',
        src: '../../assets/personagem/paraquedas.png',
        zIndex: '9',
        display: 'none'
    });

    paraquedasElemento.onerror = () => {
        console.error("ERRO: Não foi possível carregar a imagem do paraquedas em '../../assets/personagem/paraquedas.png'. Verifique o caminho e o arquivo.");
    };

    return { cintoElemento, paraquedasElemento };
}

function criarSistemaVisuaisEquipamentos(opcoes = {}) {
    const {
        controle,
        elemento,
        config,
        armaElemento,
        escudoElemento,
        botaElemento,
        jetpackElemento,
        jetFogoElemento,
        garraElemento,
        cintoElemento,
        paraquedasElemento,
        atualizarVisualEscudo = () => {},
        tentarLevantarJogador = () => true,
        flashElement
    } = opcoes;

    function obterEquipamentosDoCinto() {
        return [
            { tipo: 'revolver', possui: !!controle.temArma, elemento: armaElemento },
            { tipo: 'escudo', possui: !!controle.temEscudo || !!controle.escudoVermelho, elemento: escudoElemento },
            { tipo: 'bota', possui: !!controle.temBota, elemento: botaElemento },
            { tipo: 'jetpack', possui: !!controle.temJetpack, elemento: jetpackElemento },
            { tipo: 'garra', possui: !!controle.temGarra, elemento: garraElemento }
        ].filter(item => item.possui && item.elemento);
    }

    function obterOffsetVisualCinto() {
        let offsetY = 0;
        if (controle.estaAgachado) offsetY -= 4;
        if (controle.chutando) offsetY -= 2;
        return { x: 0, y: offsetY };
    }

    function sincronizarCintoComJogador() {
        if (!controle.temCinto) return;
        const offset = obterOffsetVisualCinto();
        cintoElemento.style.left = (controle.x + offset.x) + 'px';
        cintoElemento.style.bottom = (controle.y + offset.y) + 'px';
        cintoElemento.style.transform = elemento.style.transform;
    }

    function atualizarVisibilidadeEquipamentosCinto() {
        const guardados = !!controle.itensGuardadosNoCinto;

        armaElemento.style.display = (controle.temArma && !guardados) ? 'block' : 'none';
        botaElemento.style.display = (controle.temBota && !guardados) ? 'block' : 'none';
        jetpackElemento.style.display = (controle.temJetpack && !guardados) ? 'block' : 'none';

        if (!controle.temJetpack || guardados || !controle.jetpackAtivo) {
            jetFogoElemento.style.display = 'none';
        }

        if (guardados) {
            garraElemento.style.display = 'none';
        } else if (controle.temGarra && controle.garraAnimEstado === 'idle') {
            garraElemento.style.display = 'block';
        } else if (!controle.temGarra) {
            garraElemento.style.display = 'none';
        }

        atualizarVisualEscudo();
    }

    function limparTemporizadorAnimacaoCinto() {
        if (controle.cintoAnimTimeout) {
            clearTimeout(controle.cintoAnimTimeout);
            controle.cintoAnimTimeout = null;
        }
    }

    function removerClonesAnimacaoCinto() {
        if (!Array.isArray(controle.cintoAnimClones)) return;
        controle.cintoAnimClones.forEach((clone) => {
            if (clone && clone.parentElement) clone.remove();
        });
        controle.cintoAnimClones = [];
    }

    function obterOffsetAnimacaoCinto(tipo, indice = 0) {
        const direcao = controle.direcao === 'e' ? -1 : 1;
        switch (tipo) {
            case 'revolver': return { x: 12 * direcao, y: 10 + (indice * 2) };
            case 'escudo': return { x: -12 * direcao, y: 8 + (indice * 2) };
            case 'bota': return { x: 0, y: -6 };
            case 'jetpack': return { x: -8 * direcao, y: 12 };
            case 'garra': return { x: 14 * direcao, y: 2 };
            default: return { x: 0, y: 4 };
        }
    }

    function obterPosicaoAtualCinto(tipo, indice = 0) {
        const { x: offsetX, y: offsetY } = obterOffsetAnimacaoCinto(tipo, indice);
        return {
            x: controle.x + (offsetX * 0.35),
            y: controle.y + offsetY,
            transform: `${elemento.style.transform} scale(0.2)`
        };
    }

    function obterTransformAtualEquipamento(item) {
        const baseTransform = elemento.style.transform || 'scaleX(1)';

        if (item?.tipo === 'revolver') {
            const emRecuo = armaElemento?.dataset?.recoil === 'true';
            const direcaoFator = controle.direcao === 'e' ? 1 : -1;
            const anguloRecuo = emRecuo ? (15 * direcaoFator) : 0;
            return `${baseTransform} rotate(${anguloRecuo}deg)`;
        }

        return baseTransform;
    }

    function obterPosicaoAtualEquipamento(item) {
        return {
            x: controle.x,
            y: controle.y,
            transform: obterTransformAtualEquipamento(item)
        };
    }

    function sincronizarEquipamentoComJogador(item) {
        if (!item?.elemento) return;
        const pos = obterPosicaoAtualEquipamento(item);
        item.elemento.style.left = pos.x + 'px';
        item.elemento.style.bottom = pos.y + 'px';
        item.elemento.style.transform = pos.transform;
    }

    function criarCloneAnimacaoCinto(item, guardando, indice = 0) {
        if (!item?.elemento || !elemento.parentElement) return null;

        const clone = item.elemento.cloneNode(true);
        const posEquipamento = obterPosicaoAtualEquipamento(item);
        const posCinto = obterPosicaoAtualCinto(item.tipo, indice);
        const inicio = guardando ? posEquipamento : posCinto;
        const fim = guardando ? posCinto : posEquipamento;

        clone.removeAttribute('id');
        clone.style.position = 'absolute';
        clone.style.pointerEvents = 'none';
        clone.style.display = 'block';
        clone.style.opacity = guardando ? '1' : '0.2';
        clone.style.left = inicio.x + 'px';
        clone.style.bottom = inicio.y + 'px';
        clone.style.transform = guardando ? posEquipamento.transform : posCinto.transform;
        clone.style.transition = 'left 220ms ease, bottom 220ms ease, transform 220ms ease, opacity 220ms ease';
        clone.style.zIndex = String(Number(item.elemento.style.zIndex || 10) + 20);
        elemento.parentElement.appendChild(clone);

        requestAnimationFrame(() => {
            clone.style.left = fim.x + 'px';
            clone.style.bottom = fim.y + 'px';
            clone.style.opacity = guardando ? '0.15' : '1';
            clone.style.transform = guardando ? posCinto.transform : posEquipamento.transform;
        });

        return clone;
    }

    function alternarItensNoCinto() {
        if (!controle.temCinto || controle.cintoAnimando || controle.vendaEmCurso || controle.stunned) return;
        if (controle.garraAnimEstado !== 'idle' || controle.garraItemCarregado) return;

        const equipamentos = obterEquipamentosDoCinto();
        if (!controle.itensGuardadosNoCinto && equipamentos.length === 0) return;

        const guardando = !controle.itensGuardadosNoCinto;

        if (!guardando && controle.estaAgachado) {
            const conseguiuLevantar = tentarLevantarJogador();
            if (!conseguiuLevantar) {
                if (typeof flashElement === 'function') {
                    flashElement(cintoElemento, 140, 5);
                }
                return;
            }
        }

        controle.cintoAnimando = true;
        controle.jetpackAtivo = false;
        controle.jetpackHovering = false;
        jetFogoElemento.style.display = 'none';

        limparTemporizadorAnimacaoCinto();
        removerClonesAnimacaoCinto();

        if (typeof flashElement === 'function') {
            flashElement(cintoElemento, 180, 6);
        }

        equipamentos.forEach((item, indice) => {
            const clone = criarCloneAnimacaoCinto(item, guardando, indice);
            if (clone) controle.cintoAnimClones.push(clone);
        });

        if (guardando) {
            controle.itensGuardadosNoCinto = true;
            atualizarVisibilidadeEquipamentosCinto();
        }

        controle.cintoAnimTimeout = setTimeout(() => {
            removerClonesAnimacaoCinto();

            if (!guardando) {
                equipamentos.forEach((item) => sincronizarEquipamentoComJogador(item));
                controle.itensGuardadosNoCinto = false;
            }

            atualizarVisibilidadeEquipamentosCinto();
            controle.cintoAnimando = false;
            controle.cintoAnimTimeout = null;
        }, 320);
    }

    function sincronizarVisuaisEquipamentos() {
        atualizarVisibilidadeEquipamentosCinto();

        armaElemento.style.left = controle.x + 'px';
        armaElemento.style.bottom = controle.y + 'px';
        armaElemento.style.transform = obterTransformAtualEquipamento({ tipo: 'revolver' });
        armaElemento.src = config.spriteArmaPlayer || '../../assets/personagem/revolver.png';
        armaElemento.style.filter = (controle.municao <= 0) ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';

        escudoElemento.style.left = controle.x + 'px';
        escudoElemento.style.bottom = controle.y + 'px';
        escudoElemento.style.transform = elemento.style.transform;

        if (controle.temCinto) {
            sincronizarCintoComJogador();
        }

        if (controle.temBota && !controle.itensGuardadosNoCinto) {
            botaElemento.style.left = controle.x + 'px';
            botaElemento.style.bottom = controle.y + 'px';
            botaElemento.style.transform = elemento.style.transform;

            if (controle.chutando) {
                botaElemento.src = config.spriteBotaChutando || '../../assets/personagem/bota_chutando.png';
            } else if (!controle.noChao) {
                botaElemento.src = config.spriteBotaNoAr || '../../assets/personagem/bota_no_ar.png';
            } else if (controle.movendoHorizontal) {
                botaElemento.src = (controle.frameAtual === 1)
                    ? (config.spriteBotaAndando || '../../assets/personagem/bota_andando.png')
                    : (config.spriteBotaParado || '../../assets/personagem/bota_parado.png');
            } else {
                botaElemento.src = config.spriteBotaParado || '../../assets/personagem/bota_parado.png';
            }
        }

        if (controle.temJetpack && !controle.itensGuardadosNoCinto) {
            jetpackElemento.style.display = 'block';
            jetpackElemento.style.left = controle.x + 'px';
            jetpackElemento.style.bottom = controle.y + 'px';
            jetpackElemento.style.transform = elemento.style.transform;

            if (controle.cooldownVooJetpack > 0) {
                jetpackElemento.style.filter = 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)';
            } else {
                jetpackElemento.style.filter = 'none';
            }

            const subindo = !!(controle.teclas['ArrowUp'] || controle.teclas['w'] || controle.teclas['W']);
            let efeitoPisca;
            if (subindo) {
                efeitoPisca = (controle.timerVooRestante % 3 < 2);
            } else if (controle.jetpackHovering) {
                efeitoPisca = (controle.timerVooRestante % 5 < 1);
            } else {
                efeitoPisca = (controle.timerVooRestante % 8 < 1);
            }
            const tremorFogo = (Math.random() * 3) - 1.5;

            if (controle.jetpackAtivo && efeitoPisca) {
                jetFogoElemento.style.display = 'block';
                jetFogoElemento.style.left = controle.x + 'px';
                jetFogoElemento.style.bottom = (controle.y - 4 + tremorFogo) + 'px';
                jetFogoElemento.style.transform = elemento.style.transform;
            } else {
                jetFogoElemento.style.display = 'none';
            }
        } else {
            jetpackElemento.style.display = 'none';
            jetFogoElemento.style.display = 'none';
        }

        if (controle.temGarra && !controle.itensGuardadosNoCinto) {
            if (!document.getElementById('player-claw') && elemento.parentElement) {
                elemento.parentElement.appendChild(garraElemento);
            }

            garraElemento.style.display = 'block';
            if (controle.garraAnimEstado === 'idle') {
                garraElemento.style.left = controle.x + 'px';
                garraElemento.style.bottom = controle.y + 'px';
                garraElemento.style.transform = elemento.style.transform;
            }
        } else {
            garraElemento.style.display = 'none';
        }

        if (controle.usandoParaquedas) {
            if (!document.getElementById('player-parachute') && elemento.parentElement) {
                elemento.parentElement.appendChild(paraquedasElemento);
            }

            paraquedasElemento.style.display = 'block';
            paraquedasElemento.style.left = controle.x + 'px';
            paraquedasElemento.style.bottom = (controle.y + 32) + 'px';
            paraquedasElemento.style.transform = elemento.style.transform;

            if (controle.noChao) {
                controle.usandoParaquedas = false;
                paraquedasElemento.style.display = 'none';
            }
        } else if (paraquedasElemento.style.display !== 'none') {
            paraquedasElemento.style.display = 'none';
        }
    }

    return {
        obterEquipamentosDoCinto,
        atualizarVisibilidadeEquipamentosCinto,
        sincronizarCintoComJogador,
        alternarItensNoCinto,
        sincronizarVisuaisEquipamentos
    };
}

window.inicializarEstadoCinto = inicializarEstadoCinto;
window.criarElementosSuporteEquipamentos = criarElementosSuporteEquipamentos;
window.criarSistemaVisuaisEquipamentos = criarSistemaVisuaisEquipamentos;

