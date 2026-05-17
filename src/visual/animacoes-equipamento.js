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

function coleteRecolhivelNoCinto(config = window.config || {}) {
    return !!config?.coleteRecolhivelNoCinto;
}

function animarCloneSeguindoPortador(opcoes = {}) {
    const {
        clone,
        obterOrigem,
        obterDestino,
        duracao = 220,
        opacidadeInicial = 1,
        opacidadeFinal = 0.15
    } = opcoes;

    if (!clone || typeof obterOrigem !== 'function' || typeof obterDestino !== 'function') return;

    const lerp = (inicio, fim, t) => inicio + ((fim - inicio) * t);
    const inicioAnim = (window.performance?.now?.() ?? Date.now());

    const atualizar = () => {
        if (!clone.parentElement) return;

        const agora = (window.performance?.now?.() ?? Date.now());
        const bruto = Math.min(1, Math.max(0, (agora - inicioAnim) / duracao));
        const t = 1 - Math.pow(1 - bruto, 2);

        const origem = obterOrigem();
        const destino = obterDestino();

        clone.style.left = lerp(origem.x, destino.x, t) + 'px';
        clone.style.bottom = lerp(origem.y, destino.y, t) + 'px';
        clone.style.opacity = String(lerp(opacidadeInicial, opacidadeFinal, t));
        clone.style.transform = t < 0.5 ? origem.transform : destino.transform;

        if (bruto < 1) {
            clone.__cintoAnimFrame = requestAnimationFrame(atualizar);
        }
    };

    if (clone.__cintoAnimFrame) {
        cancelAnimationFrame(clone.__cintoAnimFrame);
    }

    clone.__cintoAnimFrame = requestAnimationFrame(atualizar);
}

function inicializarEstadoCinto(controle) {
    if (!controle) return controle;

    if (typeof controle.itensGuardadosNoCinto !== 'boolean') controle.itensGuardadosNoCinto = false;
    if (typeof controle.cintoAnimando !== 'boolean') controle.cintoAnimando = false;
    if (typeof controle.cintoAnimTimeout === 'undefined') controle.cintoAnimTimeout = null;
    if (typeof controle.selecaoCinto !== 'string') controle.selecaoCinto = 'todos';
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

function obterEquipamentosCintoPortador(portador, elementos = {}) {
    if (!portador) return [];

    const {
        armaElemento,
        escudoElemento,
        botaElemento,
        jetpackElemento,
        garraElemento,
        coleteElemento
    } = elementos;
    const permiteRecolherColete = coleteRecolhivelNoCinto();
    const armaTipo = (armaElemento && armaElemento.src.includes('doze')) ? 'doze' : 'revolver';

    return [
        { tipo: armaTipo, possui: !!portador.temArma, elemento: armaElemento },
        { tipo: 'escudo', possui: !!portador.temEscudo || !!portador.escudoVermelho, elemento: escudoElemento },
        { tipo: 'bota', possui: !!portador.temBota, elemento: botaElemento },
        { tipo: 'jetpack', possui: !!portador.temJetpack, elemento: jetpackElemento },
        { tipo: 'garra', possui: !!portador.temGarra, elemento: garraElemento },
        { tipo: 'colete', possui: permiteRecolherColete && !!portador.temColete, elemento: coleteElemento }
    ].filter(item => item.possui && item.elemento);
}

function atualizarVisibilidadeEquipamentosCintoPortador(portador, elementos = {}, opcoes = {}) {
    if (!portador) return;

    const {
        armaElemento,
        escudoElemento,
        botaElemento,
        jetpackElemento,
        jetFogoElemento,
        garraElemento,
        coleteElemento,
        cintoElemento
    } = elementos;
    const { atualizarVisualEscudo = null } = opcoes;
    const guardados = !!portador.itensGuardadosNoCinto;
    const permiteRecolherColete = coleteRecolhivelNoCinto();
    const selecao = portador.selecaoCinto || 'todos';

    if (cintoElemento) {
        cintoElemento.style.display = portador.temCinto ? 'block' : 'none';
    }

    if (armaElemento) {
        const visivel = portador.temArma && !guardados && (selecao === 'todos' || selecao === 'arma');
        armaElemento.style.display = visivel ? 'block' : 'none';
    }

    if (escudoElemento) {
        const visivel = (portador.temEscudo || portador.escudoVermelho) && !guardados && (selecao === 'todos' || selecao === 'escudo');
        escudoElemento.style.display = visivel ? 'block' : 'none';
    }

    if (botaElemento) {
        botaElemento.style.display = (portador.temBota && !guardados) ? 'block' : 'none';
    }

    if (jetpackElemento) {
        jetpackElemento.style.display = (portador.temJetpack && !guardados) ? 'block' : 'none';
    }

    if (jetFogoElemento && (!portador.temJetpack || guardados || !portador.jetpackAtivo)) {
        jetFogoElemento.style.display = 'none';
    }

    if (garraElemento) {
        if (guardados) {
            garraElemento.style.display = 'none';
        } else if (portador.temGarra && (!portador.garraAnimEstado || portador.garraAnimEstado === 'idle')) {
            garraElemento.style.display = 'block';
        } else if (!portador.temGarra) {
            garraElemento.style.display = 'none';
        }
    }

    if (coleteElemento) {
        coleteElemento.style.display = (portador.temColete && (!guardados || !permiteRecolherColete)) ? 'block' : 'none';
    }

    if (typeof atualizarVisualEscudo === 'function') {
        atualizarVisualEscudo();
    }
}

function alternarItensNoCintoPortador(opcoes = {}) {
    const {
        portador,
        elementoBase,
        cintoElemento,
        armaElemento,
        escudoElemento,
        botaElemento,
        jetpackElemento,
        jetFogoElemento,
        garraElemento,
        coleteElemento,
        atualizarVisualEscudo = () => {},
        tentarLevantar = () => true,
        flashElement,
        guardar
    } = opcoes;

    if (!portador?.temCinto || !elementoBase?.parentElement || !cintoElemento) return false;

    inicializarEstadoCinto(portador);

    if (portador.cintoAnimando || portador.vendaEmCurso || portador.stunned) return false;
    if (portador.garraAnimEstado && portador.garraAnimEstado !== 'idle') return false;
    if (portador.garraItemCarregado) return false;

    const equipamentos = obterEquipamentosCintoPortador(portador, {
        armaElemento,
        escudoElemento,
        botaElemento,
        jetpackElemento,
        garraElemento,
        coleteElemento
    });

    const guardando = typeof guardar === 'boolean' ? guardar : !portador.itensGuardadosNoCinto;
    if (guardando === !!portador.itensGuardadosNoCinto) return false;
    if (!guardando && portador.estaAgachado && !tentarLevantar()) {
        if (typeof flashElement === 'function') {
            flashElement(cintoElemento, 140, 5);
        }
        return false;
    }
    if (!guardando && equipamentos.length === 0) {
        portador.itensGuardadosNoCinto = false;
        return false;
    }
    if (guardando && equipamentos.length === 0) return false;

    const removerClones = () => {
        if (!Array.isArray(portador.cintoAnimClones)) return;
        portador.cintoAnimClones.forEach((clone) => {
            if (clone?.parentElement) clone.remove();
        });
        portador.cintoAnimClones = [];
    };

    const limparTemporizador = () => {
        if (portador.cintoAnimTimeout) {
            clearTimeout(portador.cintoAnimTimeout);
            portador.cintoAnimTimeout = null;
        }
    };

    const obterOffsetAnimacao = (tipo, indice = 0) => {
        const direcao = portador.direcao === 'e' ? -1 : 1;
        switch (tipo) {
            case 'doze':
            case 'revolver': return { x: 12 * direcao, y: 10 + (indice * 2) };
            case 'escudo': return { x: -12 * direcao, y: 8 + (indice * 2) };
            case 'bota': return { x: 0, y: -6 };
            case 'jetpack': return { x: -8 * direcao, y: 12 };
            case 'garra': return { x: 14 * direcao, y: 2 };
            case 'colete': return { x: 0, y: 6 + (indice * 2) };
            default: return { x: 0, y: 4 };
        }
    };

    const obterPosicaoCinto = (tipo, indice = 0) => {
        const { x: offsetX, y: offsetY } = obterOffsetAnimacao(tipo, indice);
        return {
            x: portador.x + (offsetX * 0.35),
            y: portador.y + offsetY,
            transform: `${elementoBase.style.transform || 'scaleX(1)'} scale(0.2)`
        };
    };

    const obterTransformAtualEquipamento = (item) => {
        const baseTransform = elementoBase.style.transform || 'scaleX(1)';
        if ((item?.tipo === 'revolver' || item?.tipo === 'doze') && armaElemento?.dataset?.recoil === 'true') {
            const direcaoFator = portador.direcao === 'e' ? 1 : -1;
            return `${baseTransform} rotate(${15 * direcaoFator}deg)`;
        }
        return baseTransform;
    };

    const sincronizarEquipamento = (item) => {
        if (!item?.elemento) return;
        const transform = obterTransformAtualEquipamento(item);
        if (typeof window.atualizarVisualItemColetavel === 'function') {
            window.atualizarVisualItemColetavel(item, { x: portador.x, y: portador.y, transform });
        } else {
            item.elemento.style.left = portador.x + 'px';
            item.elemento.style.bottom = portador.y + 'px';
            item.elemento.style.transform = transform;
        }
    };

    const criarCloneAnimacao = (item, indice = 0) => {
        if (!item?.elemento) return null;

        const clone = item.elemento.cloneNode(true);
        const obterOrigem = () => guardando
            ? { x: portador.x, y: portador.y, transform: obterTransformAtualEquipamento(item) }
            : obterPosicaoCinto(item.tipo, indice);
        const obterDestino = () => guardando
            ? obterPosicaoCinto(item.tipo, indice)
            : { x: portador.x, y: portador.y, transform: obterTransformAtualEquipamento(item) };
        const origem = obterOrigem();

        clone.removeAttribute('id');
        clone.style.position = 'absolute';
        clone.style.pointerEvents = 'none';
        clone.style.display = 'block';
        clone.style.opacity = guardando ? '1' : '0.2';
        clone.style.left = origem.x + 'px';
        clone.style.bottom = origem.y + 'px';
        clone.style.transform = origem.transform;
        clone.style.transition = 'none';
        clone.style.zIndex = String(Number(item.elemento.style.zIndex || 10) + 20);
        elementoBase.parentElement.appendChild(clone);

        animarCloneSeguindoPortador({
            clone,
            obterOrigem,
            obterDestino,
            duracao: 220,
            opacidadeInicial: guardando ? 1 : 0.2,
            opacidadeFinal: guardando ? 0.15 : 1
        });

        return clone;
    };

    portador.cintoAnimando = true;
    portador.jetpackAtivo = false;
    portador.jetpackHovering = false;
    if (jetFogoElemento) jetFogoElemento.style.display = 'none';

    limparTemporizador();
    removerClones();

    if (typeof flashElement === 'function') {
        flashElement(cintoElemento, 180, 6);
    }

    equipamentos.forEach((item, indice) => {
        const clone = criarCloneAnimacao(item, indice);
        if (clone) portador.cintoAnimClones.push(clone);
    });

    if (guardando) {
        portador.itensGuardadosNoCinto = true;
        atualizarVisibilidadeEquipamentosCintoPortador(portador, {
            armaElemento,
            escudoElemento,
            botaElemento,
            jetpackElemento,
            jetFogoElemento,
            garraElemento,
            coleteElemento,
            cintoElemento
        }, { atualizarVisualEscudo });
    }

    portador.cintoAnimTimeout = setTimeout(() => {
        removerClones();

        if (!guardando) {
            equipamentos.forEach((item) => sincronizarEquipamento(item));
            portador.itensGuardadosNoCinto = false;
        }

        atualizarVisibilidadeEquipamentosCintoPortador(portador, {
            armaElemento,
            escudoElemento,
            botaElemento,
            jetpackElemento,
            jetFogoElemento,
            garraElemento,
            coleteElemento,
            cintoElemento
        }, { atualizarVisualEscudo });

        portador.cintoAnimando = false;
        portador.cintoAnimTimeout = null;
    }, 320);

    return true;
}

window.obterEquipamentosCintoPortador = obterEquipamentosCintoPortador;
window.atualizarVisibilidadeEquipamentosCintoPortador = atualizarVisibilidadeEquipamentosCintoPortador;
window.alternarItensNoCintoPortador = alternarItensNoCintoPortador;

function criarSistemaVisuaisEquipamentos(opcoes = {}) {
    const {
        controle,
        elemento,
        config,
        armaElemento,
        escudoElemento,
        botaElemento,
        coleteElemento,
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
        const permiteRecolherColete = coleteRecolhivelNoCinto(config);
        const armaTipo = (armaElemento && armaElemento.src.includes('doze')) ? 'doze' : 'revolver';
        return [
            { tipo: armaTipo, possui: !!controle.temArma, elemento: armaElemento },
            { tipo: 'escudo', possui: !!controle.temEscudo || !!controle.escudoVermelho, elemento: escudoElemento },
            { tipo: 'bota', possui: !!controle.temBota, elemento: botaElemento },
            { tipo: 'jetpack', possui: !!controle.temJetpack, elemento: jetpackElemento },
            { tipo: 'garra', possui: !!controle.temGarra, elemento: garraElemento },
            { tipo: 'colete', possui: permiteRecolherColete && !!controle.temColete, elemento: coleteElemento }
        ].filter(item => item.possui && item.elemento);
    }

    function obterOffsetVisualCinto() {
        let offsetY = 0;
        if (controle.estaAgachado && controle.noChao) offsetY -= 5;
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
        const permiteRecolherColete = coleteRecolhivelNoCinto(config);
        const selecao = controle.selecaoCinto || 'todos';

        if (cintoElemento) cintoElemento.style.display = controle.temCinto ? 'block' : 'none';
        
        const armaVisivel = (controle.temArma && !guardados && (selecao === 'todos' || selecao === 'arma'));
        if (armaElemento) armaElemento.style.display = armaVisivel ? 'block' : 'none';
        
        const escudoVisivel = ((controle.temEscudo || controle.escudoVermelho) && !guardados && (selecao === 'todos' || selecao === 'escudo'));
        if (escudoElemento) escudoElemento.style.display = escudoVisivel ? 'block' : 'none';
        
        if (botaElemento) botaElemento.style.display = (controle.temBota && !guardados) ? 'block' : 'none';
        if (botaElemento) botaElemento.style.filter = controle.botaVermelha ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
        if (coleteElemento) coleteElemento.style.display = (controle.temColete && (!guardados || !permiteRecolherColete)) ? 'block' : 'none';
        if (jetpackElemento) jetpackElemento.style.display = (controle.temJetpack && !guardados) ? 'block' : 'none';

        if (jetFogoElemento && (!controle.temJetpack || guardados || !controle.jetpackAtivo)) {
            jetFogoElemento.style.display = 'none';
        }

        if (garraElemento && guardados) {
            garraElemento.style.display = 'none';
        } else if (controle.temGarra && controle.garraAnimEstado === 'idle') {
            garraElemento.style.display = 'block';
        } else if (!controle.temGarra) {
            garraElemento.style.display = 'none';
        }
        if (garraElemento) garraElemento.style.filter = controle.garraVermelha ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';

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
            case 'doze':
            case 'revolver': return { x: 12 * direcao, y: 10 + (indice * 2) };
            case 'escudo': return { x: -12 * direcao, y: 8 + (indice * 2) };
            case 'bota': return { x: 0, y: -6 };
            case 'jetpack': return { x: -8 * direcao, y: 12 };
            case 'garra': return { x: 14 * direcao, y: 2 };
            case 'colete': return { x: 0, y: 6 + (indice * 2) };
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

        if (item?.tipo === 'revolver' || item?.tipo === 'doze') {
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
        if (typeof window.atualizarVisualItemColetavel === 'function') {
            window.atualizarVisualItemColetavel(item, { x: pos.x, y: pos.y, transform: pos.transform });
        } else {
            item.elemento.style.left = pos.x + 'px';
            item.elemento.style.bottom = pos.y + 'px';
            item.elemento.style.transform = pos.transform;
        }
    }

    function criarCloneAnimacaoCinto(item, guardando, indice = 0) {
        if (!item?.elemento || !elemento.parentElement) return null;

        const clone = item.elemento.cloneNode(true);
        const obterOrigem = () => guardando ? obterPosicaoAtualEquipamento(item) : obterPosicaoAtualCinto(item.tipo, indice);
        const obterDestino = () => guardando ? obterPosicaoAtualCinto(item.tipo, indice) : obterPosicaoAtualEquipamento(item);
        const inicio = obterOrigem();

        clone.removeAttribute('id');
        clone.style.position = 'absolute';
        clone.style.pointerEvents = 'none';
        clone.style.display = 'block';
        clone.style.opacity = guardando ? '1' : '0.2';
        clone.style.left = inicio.x + 'px';
        clone.style.bottom = inicio.y + 'px';
        clone.style.transform = inicio.transform;
        clone.style.transition = 'none';
        clone.style.zIndex = String(Number(item.elemento.style.zIndex || 10) + 20);
        elemento.parentElement.appendChild(clone);

        animarCloneSeguindoPortador({
            clone,
            obterOrigem,
            obterDestino,
            duracao: 220,
            opacidadeInicial: guardando ? 1 : 0.2,
            opacidadeFinal: guardando ? 0.15 : 1
        });

        return clone;
    }

    function alternarItensNoCinto() {
        if (controle.estaoAberto || controle.abrindo || controle.fechando) return;
        if (!controle.temCinto || controle.cintoAnimando || controle.vendaEmCurso || controle.stunned) return;
        if ((controle.garraAnimEstado && controle.garraAnimEstado !== 'idle') || controle.garraItemCarregado) return;

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

    /**
     * Alterna a seleção ativa entre Arma e Escudo (Mecânica do Botão E).
     */
    function alternarEquipamentoSelecao() {
        if (controle.estaoAberto || controle.abrindo || controle.fechando) return;
        if (!controle.temCinto || controle.estaAgachado) return;
        
        const temArma = !!controle.temArma;
        const temEscudo = !!(controle.temEscudo || controle.escudoVermelho);
        
        if (!temArma && !temEscudo) return;

        // Se os itens estavam guardados, retira-os primeiro
        if (controle.itensGuardadosNoCinto) {
            controle.itensGuardadosNoCinto = false;
        }

        const armasNoInventario = ['revolver', 'doze'].filter(tipo => Array.isArray(controle.inventario) && controle.inventario.includes(tipo));
        const armaAtual = controle.heldWeaponType || (armaElemento?.src?.includes('doze') ? 'doze' : 'revolver');

        // Lógica de Ciclo: Escudo -> Arma 1 -> Arma 2 -> Escudo
        if (controle.selecaoCinto === 'escudo' || !temEscudo) {
            // Estava no escudo (ou não tem), tenta ir para categoria arma
            if (temArma && armasNoInventario.length > 0) {
                controle.selecaoCinto = 'arma';
                // Garante que heldWeaponType seja algo válido no inventário
                if (!armasNoInventario.includes(controle.heldWeaponType)) {
                    controle.heldWeaponType = armasNoInventario[0];
                }
            } else if (temEscudo) {
                controle.selecaoCinto = 'escudo';
            }
        } else {
            // Estava na categoria arma, tenta ciclar para a próxima arma ou voltar para escudo
            const idxAtual = armasNoInventario.indexOf(armaAtual);
            const proximaArma = armasNoInventario[idxAtual + 1];

            if (proximaArma) {
                controle.heldWeaponType = proximaArma;
                if (armaElemento) {
                    const def = window.itemDefinitions?.[proximaArma];
                    if (def?.spriteEquipado) armaElemento.src = def.spriteEquipado;
                }
                window.AudioManager?.playSFX('recarga', 0.4);
                controle.selecaoCinto = 'arma';
            } else if (temEscudo) {
                controle.selecaoCinto = 'escudo';
            }
        }
        
        if (typeof flashElement === 'function' && cintoElemento) {
            flashElement(cintoElemento, 100, 2);
        }

        if (typeof window.salvarInventario === 'function') {
            window.salvarInventario();
        }
    }

    function sincronizarVisuaisEquipamentos() {
        atualizarVisibilidadeEquipamentosCinto();

        const ocultarCintoColete = !!(controle.abrindo || controle.estaoAberto);

        // Utiliza o novo helper de sincronização centralizado para garantir posições e offsets corretos
        window.sincronizarAcessoriosEntidade(controle, {
            armaElemento,
            escudoElemento,
            botaElemento,
            jetpackElemento,
            jetFogoElemento,
            garraElemento,
            cintoElemento,
            coleteElemento
        }, {
            transformArma: obterTransformAtualEquipamento({ tipo: 'revolver' }),
            jetFogoOffsetY: -4 + ((Math.random() * 3) - 1.5) // Efeito de tremor do fogo
        });

        // Aplica o filtro de "sem munição" (vermelho) no revólver
        if (armaElemento) {
            armaElemento.style.filter = (controle.municao <= 0) ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
        }

        if (cintoElemento && ocultarCintoColete) {
            cintoElemento.style.display = 'none';
        } else if (controle.temCinto && cintoElemento) {
            sincronizarCintoComJogador();
        }

        if (coleteElemento) {
            const permiteRecolherColete = coleteRecolhivelNoCinto(config);
            if (ocultarCintoColete) {
                coleteElemento.style.display = 'none';
            } else if (controle.temColete && (!controle.itensGuardadosNoCinto || !permiteRecolherColete)) {
                const offsetColeteY = (controle.estaAgachado && controle.noChao) ? -6 : 0;
                coleteElemento.style.display = 'block';
                coleteElemento.style.left = controle.x + 'px';
                coleteElemento.style.bottom = (controle.y + offsetColeteY) + 'px';
                coleteElemento.style.transform = elemento.style.transform;

                if (controle.chutando) {
                    coleteElemento.src = config.spriteColeteChutando || '../../assets/personagem/colete_chutando.png';
                } else if (controle.movendoHorizontal) {
                    coleteElemento.src = config.spriteColeteAndando || config.spriteColeteParado || '../../assets/personagem/colete.png';
                } else {
                    coleteElemento.src = config.spriteColeteParado || '../../assets/personagem/colete.png';
                }
            } else {
                coleteElemento.style.display = 'none';
            }
        }

        if (controle.temBota && !controle.itensGuardadosNoCinto) {
            botaElemento.style.left = controle.x + 'px';
            botaElemento.style.bottom = controle.y + 'px';
            botaElemento.style.transform = elemento.style.transform;

            const idleAtivoComBota = !!controle._idle2sAtivo
                && !!controle.noChao
                && !controle.movendoHorizontal
                && !controle.estaAgachado
                && !controle.chutando
                && Number(controle.tempoChute || 0) <= 0;

            if (idleAtivoComBota) {
                botaElemento.src = config.spriteBotaOciosa || '../../assets/personagem/bota_ociosa.png';
            } else if (controle.chutando) {
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
            botaElemento.style.filter = controle.botaVermelha ? 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)' : 'none';
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
        alternarEquipamentoSelecao,
        sincronizarVisuaisEquipamentos
    };
}

window.inicializarEstadoCinto = inicializarEstadoCinto;
window.criarElementosSuporteEquipamentos = criarElementosSuporteEquipamentos;
window.criarSistemaVisuaisEquipamentos = criarSistemaVisuaisEquipamentos;
