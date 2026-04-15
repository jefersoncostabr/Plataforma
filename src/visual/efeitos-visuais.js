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


