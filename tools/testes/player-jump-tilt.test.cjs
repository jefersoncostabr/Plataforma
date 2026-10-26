const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');
const codigoEntidades = fs.readFileSync(
    path.join(raiz, 'src/visual/animacoes-entidades.js'),
    'utf8'
);

function criarContexto() {
    const sandbox = {
        Math,
        Number,
        console
    };
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    const contexto = vm.createContext(sandbox);
    vm.runInContext(codigoEntidades, contexto, {
        filename: 'src/visual/animacoes-entidades.js'
    });
    return contexto;
}

function aplicarTransformacao(entidade, opcoes) {
    const ctx = criarContexto();
    const aplicarInclinacaoVertical = ctx.aplicarInclinacaoVertical;
    assert.equal(typeof aplicarInclinacaoVertical, 'function');
    const elemento = { style: {} };
    const ent = { elemento, ...entidade };
    aplicarInclinacaoVertical(ent, opcoes);
    return elemento.style.transform;
}

test('jogador subindo e caindo com sentido: -1', () => {
    const subindo = aplicarTransformacao({ noChao: false, velocidadeY: -3, direcao: 'd' }, { sentido: -1 });
    const caindo = aplicarTransformacao({ noChao: false, velocidadeY: 3, direcao: 'd' }, { sentido: -1 });

    assert.equal(subindo, 'rotate(-10.0deg) scaleX(1)');
    assert.equal(caindo, 'rotate(10.0deg) scaleX(1)');
});

test('pet usa o sentido padrão e inimigo usa o sentido corrigido', () => {
    const petSubindo = aplicarTransformacao({ noChao: false, velocidadeY: -3, direcao: 'd' }, {});
    const petCaindo = aplicarTransformacao({ noChao: false, velocidadeY: 3, direcao: 'd' }, {});
    const inimigoSubindo = aplicarTransformacao({ noChao: false, velocidadeY: -3, direcao: 'd' }, { sentido: -1 });
    const inimigoCaindo = aplicarTransformacao({ noChao: false, velocidadeY: 3, direcao: 'd' }, { sentido: -1 });
    const inimigoEsquerda = aplicarTransformacao({ noChao: false, velocidadeY: -3, direcao: 'e' }, { sentido: -1 });

    assert.equal(petSubindo, 'rotate(10.0deg) scaleX(1)');
    assert.equal(petCaindo, 'rotate(-10.0deg) scaleX(1)');
    assert.equal(inimigoSubindo, 'rotate(-10.0deg) scaleX(1)');
    assert.equal(inimigoCaindo, 'rotate(10.0deg) scaleX(1)');
    assert.equal(inimigoEsquerda, 'rotate(10.0deg) scaleX(-1)');
});

test('sprite virado para a esquerda', () => {
    const transform = aplicarTransformacao({ noChao: false, velocidadeY: -3, direcao: 'e' }, { sentido: -1 });
    assert.equal(transform, 'rotate(10.0deg) scaleX(-1)');
});

test('rotação zerada no chão', () => {
    const transform = aplicarTransformacao({ noChao: true, velocidadeY: 6, direcao: 'd' }, { sentido: -1 });
    assert.equal(transform, 'rotate(0.0deg) scaleX(1)');
});

test('velocidade acima do limite resulta em no máximo 20 graus', () => {
    const subindo = aplicarTransformacao({ noChao: false, velocidadeY: -12, direcao: 'd' }, { sentido: -1 });
    const caindo = aplicarTransformacao({ noChao: false, velocidadeY: 12, direcao: 'd' }, { sentido: -1 });

    assert.equal(subindo, 'rotate(-20.0deg) scaleX(1)');
    assert.equal(caindo, 'rotate(20.0deg) scaleX(1)');
});

test('inclinação desativada durante jetpack', () => {
    const transform = aplicarTransformacao({ noChao: false, velocidadeY: 6, direcao: 'd' }, { habilitado: false });
    assert.equal(transform, 'rotate(0.0deg) scaleX(1)');
});

test('entidade ou elemento ausente não causa erro', () => {
    const ctx = criarContexto();
    const aplicarInclinacaoVertical = ctx.aplicarInclinacaoVertical;
    assert.doesNotThrow(() => aplicarInclinacaoVertical(null));
    assert.doesNotThrow(() => aplicarInclinacaoVertical({}));
    assert.doesNotThrow(() => aplicarInclinacaoVertical({ elemento: null }));
});
