const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');

function ler(caminho) {
    return fs.readFileSync(path.join(raiz, caminho), 'utf8');
}

function criarElementoImagem(dataset = {}) {
    const classes = new Set();
    const elemento = {
        dataset: { ...dataset },
        style: { left: '0px', bottom: '0px', width: '32px', height: '32px' },
        classList: {
            add: (classe) => classes.add(classe),
            remove: (classe) => classes.delete(classe),
            contains: (classe) => classes.has(classe)
        },
        get offsetWidth() { return 32; },
        parentNode: null,
        remove() {
            if (this.parentNode) {
                this.parentNode.children = this.parentNode.children.filter((item) => item !== this);
            }
            this.parentNode = null;
            this.removido = true;
        }
    };
    return elemento;
}

function carregarSistemaQuebravel({ bloco, coordenada = 'a1' } = {}) {
    const chamadasSom = [];
    const chamadasVfx = [];
    const temporizadores = [];
    const mensagensConsole = [];
    const tile = criarElementoImagem({ gridCoord: coordenada, quebravel: 'true' });
    const layer = {
        children: [tile],
        querySelectorAll() { return this.children; },
        appendChild(elemento) {
            elemento.parentNode = this;
            this.children.push(elemento);
        }
    };
    tile.parentNode = layer;

    const window = {
        plataformas: { [coordenada]: bloco || {
            tipo: 'tronco',
            xOffset: 6,
            width: 20,
            height: 32,
            quebravel: true,
            tipoQuebravel: 'troncoVertical',
            vidaMax: 6,
            vidaAtual: 6
        } },
        LAYERS: { PLATAFORMAS: 5 },
        obterLayer: () => layer,
        parseCoordGrid: () => ({ row: 0, col: 0 }),
        AudioManager: { playSFX: (nome, volume) => chamadasSom.push({ nome, volume }) },
        criarAnimacaoImpacto2Frames: (opcoes) => chamadasVfx.push(opcoes)
    };
    const document = {
        readyState: 'complete',
        getElementById: () => layer,
        createElement: () => criarElementoImagem()
    };
    const contexto = vm.createContext({
        window,
        document,
        performance: { now: () => 1000 },
        requestAnimationFrame: () => 1,
        setTimeout: (callback, ms) => {
            temporizadores.push({ callback, ms });
            return temporizadores.length;
        },
        clearTimeout: () => {},
        console: {
            info: (...args) => mensagensConsole.push({ nivel: 'info', args }),
            warn: (...args) => mensagensConsole.push({ nivel: 'warn', args }),
            error: (...args) => mensagensConsole.push({ nivel: 'error', args })
        }
    });

    vm.runInContext(ler('src/core/blocos-quebraveis.js'), contexto, {
        filename: 'src/core/blocos-quebraveis.js'
    });

    return { window, context: contexto, layer, tile, chamadasSom, chamadasVfx, temporizadores, mensagensConsole };
}

test('tronco vertical perde vida por acerto, mostra impacto e quebra no sexto golpe', () => {
    const sistema = carregarSistemaQuebravel();

    for (let golpe = 1; golpe <= 6; golpe++) {
        assert.equal(sistema.window.BlocosQuebraveis.receberDano('a1', 1, 'teste'), true);
        assert.equal(sistema.window.plataformas.a1.vidaAtual, Math.max(0, 6 - golpe));
    }

    assert.equal(sistema.chamadasSom.filter((som) => som.nome === 'impacto').length, 6);
    assert.equal(sistema.chamadasSom.filter((som) => som.nome === 'madeira_quebrando.mp3').length, 1);
    assert.equal(sistema.chamadasVfx.length, 6);
    assert.equal(sistema.tile.classList.contains('bloco-quebravel-flash'), true);
    const timerAnimacao = sistema.temporizadores.find((timer) => timer.ms === 120);
    assert.ok(timerAnimacao, 'a quebra deve agendar a divisão visual do tronco');
    timerAnimacao.callback();

    assert.equal(sistema.tile.removido, true);
    assert.equal(sistema.window.plataformas.a1, undefined);
    assert.ok(sistema.layer.children.some((item) => item.className === 'fragmento-tronco fragmento-tronco-cima'));
    assert.ok(sistema.layer.children.some((item) => item.className === 'fragmento-tronco fragmento-tronco-baixo'));
});

test('um mesmo chute só causa dano uma vez ao mesmo tronco', () => {
    const sistema = carregarSistemaQuebravel();
    const troncosAtingidos = vm.runInContext('new Set()', sistema.context);
    const hitboxChute = { x: 10, y: 8, largura: 12, altura: 12 };

    assert.equal(
        sistema.window.BlocosQuebraveis.receberDanoPorHitbox(hitboxChute, 1, troncosAtingidos),
        true
    );
    assert.equal(
        sistema.window.BlocosQuebraveis.receberDanoPorHitbox(hitboxChute, 1, troncosAtingidos),
        false
    );
    assert.equal(sistema.window.plataformas.a1.vidaAtual, 5);
    assert.deepEqual(Array.from(troncosAtingidos), ['a1']);
});

test('meios troncos mantêm colisão ao cair, mas são unidirecionais para atravessar por baixo', () => {
    const inicial = ler('src/core/inicial.js');
    const movimento = ler('src/jogador/movimento.js');
    const codigoColisoes = ler('src/core/colisoes.js');

    const blocoBaixo = inicial.match(/if \(fase\.plataformasTroncoBaixo\)[\s\S]*?window\.plataformas\[chave\] = \{([\s\S]*?)\};/);
    const blocoCima = inicial.match(/if \(fase\.plataformasTroncoCima\)[\s\S]*?window\.plataformas\[chave\] = \{([\s\S]*?)\};/);
    assert.ok(blocoBaixo && blocoCima, 'os dois registros de colisão dos troncos devem existir');
    assert.match(blocoBaixo[1], /plataformaUnidirecional:\s*true/);
    assert.match(blocoCima[1], /plataformaUnidirecional:\s*true/);

    assert.equal((codigoColisoes.match(/temColisaoLateral: bloco\.plataformaUnidirecional === true \? false : colisaoLateral/g) || []).length, 2);
    assert.match(movimento, /hit\.plataformaUnidirecional === true[\s\S]*?incY > 0|incY > 0[\s\S]*?hit\.plataformaUnidirecional === true/);

    const window = {
        itensColetaveis: [],
        robosAbertosData: [],
        playerControle: null
    };
    const contextoColisoes = vm.createContext({ window, console });
    vm.runInContext(codigoColisoes, contextoColisoes, { filename: 'src/core/colisoes.js' });

    for (const bloco of [
        { tipo: 'meio', direcao: 'inferior', yOffset: 20, height: 12, plataformaUnidirecional: true },
        { tipo: 'meio', direcao: 'superior', yOffset: 0, height: 16, plataformaUnidirecional: true }
    ]) {
        const y = bloco.direcao === 'inferior' ? 5 : 20;
        const hit = contextoColisoes.verificarColisaoComTiles(8, y, 10, 10, { a1: bloco });
        assert.equal(hit.tipo, 'meio');
        assert.equal(hit.plataformaUnidirecional, true);
        assert.equal(hit.temColisaoVertical, true, 'a colisão vertical continua disponível para pouso ao cair');
        assert.equal(hit.temColisaoLateral, false, 'não deve bloquear movimento lateral ao passar pelo meio tronco');
    }
});

test('a animação de quebra divide o sprite em metades horizontais', () => {
    const css = ler('src/core/blocos-quebraveis.css');
    const modulo = ler('src/core/blocos-quebraveis.js');

    assert.match(css, /fragmento-tronco-cima\s*\{[\s\S]*?polygon\(0 0, 100% 0, 100% 50%, 0 50%\)/);
    assert.match(css, /fragmento-tronco-baixo\s*\{[\s\S]*?polygon\(0 50%, 100% 50%, 100% 100%, 0 100%\)/);
    assert.match(css, /@keyframes fragmento-tronco-cima[\s\S]*?translateY\(-6px\)/);
    assert.match(css, /@keyframes fragmento-tronco-baixo[\s\S]*?translateY\(6px\)/);
    assert.match(modulo, /fragmento-tronco-cima/);
    assert.match(modulo, /fragmento-tronco-baixo/);
});
