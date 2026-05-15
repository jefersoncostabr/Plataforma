/**
 * Módulo de Efeitos Visuais do Jogo
 * Contém funções para criar efeitos visuais como flash, pisca, etc.
 */

function obterFiltroFlashBrancoInterno() {
    return 'brightness(0) saturate(0) invert(1) brightness(1.25) contrast(1.1)';
}

function ehFiltroTemporarioDeFlash(filter) {
    if (!filter) return false;

    const valor = String(filter).trim();
    return valor === obterFiltroFlashBrancoInterno()
        || valor.includes('drop-shadow(0 0 10px rgba(255, 255, 255, 0.9))')
        || valor.includes('brightness(2)');
}

function obterEstadoEfeitoTemporario(elemento) {
    if (!elemento) return null;

    if (!elemento.__efeitoTemporarioEstado) {
        elemento.__efeitoTemporarioEstado = {
            timeouts: [],
            intervals: [],
            baseFilter: elemento.style.filter || 'none',
            baseTransform: elemento.style.transform || ''
        };
    }

    return elemento.__efeitoTemporarioEstado;
}

function removerTimerRegistrado(lista, timerId) {
    if (!Array.isArray(lista)) return;

    const indice = lista.indexOf(timerId);
    if (indice !== -1) {
        lista.splice(indice, 1);
    }
}

function limparColecaoTimers(lista, limpador) {
    if (!Array.isArray(lista)) return;

    lista.forEach(timerId => limpador(timerId));
    lista.length = 0;
}

function prepararEfeitoTemporario(elemento) {
    const estado = obterEstadoEfeitoTemporario(elemento);
    if (!estado) return null;

    const filtroAtual = elemento.style.filter || 'none';
    const transformAtual = elemento.style.transform || '';

    if (!ehFiltroTemporarioDeFlash(filtroAtual)) {
        estado.baseFilter = filtroAtual;
    }

    if (!transformAtual.includes('translate(')) {
        estado.baseTransform = transformAtual;
    }

    limparColecaoTimers(estado.timeouts, clearTimeout);
    limparColecaoTimers(estado.intervals, clearInterval);

    elemento.style.filter = estado.baseFilter || 'none';
    elemento.style.transform = estado.baseTransform || '';

    return estado;
}

function agendarTimeoutEfeito(elemento, callback, delay) {
    const estado = obterEstadoEfeitoTemporario(elemento);
    if (!estado) return null;

    let timeoutId = null;
    timeoutId = setTimeout(() => {
        removerTimerRegistrado(estado.timeouts, timeoutId);
        callback();
    }, delay);

    estado.timeouts.push(timeoutId);
    return timeoutId;
}

function registrarIntervaloEfeito(elemento, intervalId) {
    const estado = obterEstadoEfeitoTemporario(elemento);
    if (!estado) return intervalId;

    estado.intervals.push(intervalId);
    return intervalId;
}

function limparEfeitosTemporarios(elemento, opcoes = {}) {
    if (!elemento) return;

    const { restaurarFiltro = true, restaurarTransform = true } = opcoes;
    const estado = obterEstadoEfeitoTemporario(elemento);
    if (!estado) return;

    limparColecaoTimers(estado.timeouts, clearTimeout);
    limparColecaoTimers(estado.intervals, clearInterval);

    if (restaurarFiltro) {
        elemento.style.filter = estado.baseFilter || 'none';
    }

    if (restaurarTransform) {
        elemento.style.transform = estado.baseTransform || '';
    }

    elemento.style.transition = '';
}

window.limparEfeitosTemporarios = limparEfeitosTemporarios;

/**
 * Faz um elemento piscar com um flash branco.
 * Cria um efeito visual de impacto/dano.
 *
 * @param {HTMLElement} elemento - O elemento a ser afetado.
 * @param {number} duracao - Duração total do efeito em milissegundos (padrão: 200ms).
 * @param {number} velocidade - Número de piscadas por segundo (padrão: 5).
 */
function flashElement(elemento, duracao = 200, velocidade = 5) {
    if (!elemento) return;

    const estado = prepararEfeitoTemporario(elemento);
    const filterOriginal = estado?.baseFilter || 'none';
    const tempoIntervalo = 1000 / velocidade;
    const totalPiscadas = Math.ceil((duracao / tempoIntervalo) / 2);
    let contador = 0;

    const intervalo = setInterval(() => {
        if (!elemento.isConnected) {
            clearInterval(intervalo);
            removerTimerRegistrado(estado?.intervals, intervalo);
            return;
        }

        contador++;

        if (contador % 2 === 1) {
            elemento.style.filter = obterFiltroFlashBrancoInterno();
        } else {
            elemento.style.filter = filterOriginal || 'none';
        }

        if (contador >= totalPiscadas * 2) {
            clearInterval(intervalo);
            removerTimerRegistrado(estado?.intervals, intervalo);
            elemento.style.filter = filterOriginal || 'none';
        }
    }, tempoIntervalo);

    registrarIntervaloEfeito(elemento, intervalo);
}

/**
 * Versão simplificada do flash - apenas um breve pisca branco.
 * Útil para feedback visual rápido.
 *
 * @param {HTMLElement} elemento - O elemento a ser afetado.
 */
function flashRapido(elemento) {
    if (!elemento) return;

    const estado = prepararEfeitoTemporario(elemento);
    const filterOriginal = estado?.baseFilter || 'none';

    elemento.style.filter = 'brightness(2) drop-shadow(0 0 10px rgba(255, 255, 255, 0.9))';

    agendarTimeoutEfeito(elemento, () => {
        elemento.style.filter = filterOriginal || 'none';
    }, 100);
}

/**
 * Faz um elemento piscar levemente (para dano sutil).
 * Menos intrusivo que o flashElement padrão.
 *
 * @param {HTMLElement} elemento - O elemento a ser afetado.
 */
function piscaLeve(elemento) {
    if (!elemento) return;

    const estado = prepararEfeitoTemporario(elemento);
    const filterOriginal = estado?.baseFilter || 'none';

    for (let i = 0; i < 3; i++) {
        agendarTimeoutEfeito(elemento, () => {
            elemento.style.filter = obterFiltroFlashBrancoInterno();
        }, i * 60);

        agendarTimeoutEfeito(elemento, () => {
            elemento.style.filter = filterOriginal || 'none';
        }, (i * 60) + 30);
    }
}

/**
 * Cria um efeito de explosão/impacto em um elemento.
 * Combina flash com uma pequena vibração.
 *
 * @param {HTMLElement} elemento - O elemento a ser afetado.
 */
function flashComVibacao(elemento) {
    if (!elemento) return;

    const estado = prepararEfeitoTemporario(elemento);
    const posOriginal = estado?.baseTransform || '';
    const filterOriginal = estado?.baseFilter || 'none';

    for (let i = 0; i < 4; i++) {
        agendarTimeoutEfeito(elemento, () => {
            elemento.style.filter = obterFiltroFlashBrancoInterno();

            const offsetX = (Math.random() - 0.5) * 4;
            const offsetY = (Math.random() - 0.5) * 4;
            elemento.style.transform = `translate(${offsetX}px, ${offsetY}px) ${posOriginal}`;
        }, i * 50);

        agendarTimeoutEfeito(elemento, () => {
            elemento.style.filter = filterOriginal || 'none';
            elemento.style.transform = posOriginal;
        }, (i * 50) + 25);
    }
}

/**
 * Cria uma sombra temporária (rastro) para um elemento.
 * Usado principalmente para efeitos de dash/velocidade.
 * 
 * @param {HTMLElement} elementoOriginal - O elemento base para clonar visualmente.
 */
window.criarSombraDash = function(elementoOriginal) {
    if (!elementoOriginal || !elementoOriginal.parentElement) return;

    const sombra = document.createElement('img');
    
    // Copia atributos visuais essenciais do frame atual
    sombra.src = elementoOriginal.src;
    sombra.style.position = 'absolute';
    sombra.style.width = elementoOriginal.style.width || '32px';
    sombra.style.height = elementoOriginal.style.height || '32px';
    sombra.style.left = elementoOriginal.style.left;
    sombra.style.bottom = elementoOriginal.style.bottom;
    sombra.style.transform = elementoOriginal.style.transform;
    sombra.style.imageRendering = 'pixelated';
    sombra.style.pointerEvents = 'none';
    
    // Estética da sombra: semi-transparente e com um filtro de brilho
    sombra.style.zIndex = (parseInt(elementoOriginal.style.zIndex) || 5) - 1;
    sombra.style.opacity = '0.5';
    sombra.style.filter = 'brightness(1.5) saturate(0.5)';

    elementoOriginal.parentElement.appendChild(sombra);

    // Animação de fade-out e remoção automática
    let opacidade = 0.5;
    const animacao = setInterval(() => {
        opacidade -= 0.05;
        if (opacidade <= 0) {
            clearInterval(animacao);
            sombra.remove();
        } else {
            sombra.style.opacity = opacidade;
        }
    }, 30);
};

function calcularCentroColisaoHitboxes(hitboxA, hitboxB) {
    if (!hitboxA || !hitboxB) return null;

    const ax1 = Number(hitboxA.x);
    const ay1 = Number(hitboxA.y);
    const ax2 = ax1 + Number(hitboxA.largura || 0);
    const ay2 = ay1 + Number(hitboxA.altura || 0);

    const bx1 = Number(hitboxB.x);
    const by1 = Number(hitboxB.y);
    const bx2 = bx1 + Number(hitboxB.largura || 0);
    const by2 = by1 + Number(hitboxB.altura || 0);

    if ([ax1, ay1, ax2, ay2, bx1, by1, bx2, by2].some(Number.isNaN)) return null;

    const ix1 = Math.max(ax1, bx1);
    const iy1 = Math.max(ay1, by1);
    const ix2 = Math.min(ax2, bx2);
    const iy2 = Math.min(ay2, by2);

    if (ix2 > ix1 && iy2 > iy1) {
        return {
            x: (ix1 + ix2) / 2,
            y: (iy1 + iy2) / 2
        };
    }

    return {
        x: ((ax1 + ax2) / 2 + (bx1 + bx2) / 2) / 2,
        y: ((ay1 + ay2) / 2 + (by1 + by2) / 2) / 2
    };
}

window.calcularCentroColisaoHitboxes = calcularCentroColisaoHitboxes;

// Exportar funções de efeito visual para a window
window.flashElement = flashElement;
window.flashRapido = flashRapido;
window.piscaLeve = piscaLeve;
window.flashComVibacao = flashComVibacao;

window.criarAnimacaoImpacto2Frames = function(opcoes = {}) {
    const config = window.config || {};

    const {
        x,
        y,
        largura = 24,
        altura = 24,
        offsetX = 0,
        offsetY = 0,
        frameDurationMs = 70,
        layerId = window.LAYERS?.EFEITOS,
        opacidade = 1,
        zIndex,
        frames = [
            config.spriteImpacto1 || 'assets/vfx/impacto1.png',
            config.spriteImpacto2 || 'assets/vfx/impacto2.png'
        ]
    } = opcoes;

    if (typeof x !== 'number' || typeof y !== 'number') return null;

    const listaFrames = Array.isArray(frames)
        ? frames.filter(frame => typeof frame === 'string' && frame.trim() !== '')
        : [];

    if (listaFrames.length === 0) return null;

    const impacto = document.createElement('img');
    impacto.src = listaFrames[0];
    impacto.style.position = 'absolute';
    impacto.style.width = `${largura}px`;
    impacto.style.height = `${altura}px`;
    impacto.style.left = `${Math.round((x - (largura / 2)) + offsetX)}px`;
    impacto.style.bottom = `${Math.round((y - (altura / 2)) + offsetY)}px`;
    impacto.style.imageRendering = 'pixelated';
    impacto.style.pointerEvents = 'none';
    impacto.style.opacity = `${Math.max(0, Math.min(1, Number(opacidade) || 1))}`;

    if (typeof zIndex === 'number') {
        impacto.style.zIndex = String(zIndex);
    }

    if (typeof window.adicionarAoLayer === 'function' && layerId) {
        window.adicionarAoLayer(impacto, layerId);
    } else {
        (document.getElementById('game-stage') || document.getElementById('jogo-container') || document.body)?.appendChild(impacto);
    }

    if (listaFrames.length === 1) {
        setTimeout(() => {
            if (impacto.isConnected) impacto.remove();
        }, Math.max(16, frameDurationMs));
        return impacto;
    }

    setTimeout(() => {
        if (!impacto.isConnected) return;
        impacto.src = listaFrames[1];

        setTimeout(() => {
            if (impacto.isConnected) impacto.remove();
        }, Math.max(16, frameDurationMs));
    }, Math.max(16, frameDurationMs));

    return impacto;
};
