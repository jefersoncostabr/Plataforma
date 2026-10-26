const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');
const codigoAnimacao = fs.readFileSync(
    path.join(raiz, 'src/visual/animacoes-entidades.js'),
    'utf8'
);
const codigoIA = fs.readFileSync(
    path.join(raiz, 'src/inimigos/ia-inimigo.js'),
    'utf8'
);

const marcadorInicio = '                // Atualiza a posição no DOM (Sempre, para refletir gravidade, movimento e knockback)';
const marcadorFim = '                // Prepara transforms e offsets específicos antes da sincronização global';
const inicio = codigoIA.indexOf(marcadorInicio);
const fim = codigoIA.indexOf(marcadorFim, inicio);

assert.notEqual(inicio, -1, 'Não foi encontrado o ponto de atualização visual dos inimigos');
assert.notEqual(fim, -1, 'Não foi encontrado o fim do trecho de atualização visual dos inimigos');

const codigoAtualizacaoVisual = codigoIA.slice(inicio, fim);

function atualizarVisualInimigo(estado) {
    const inimigo = {
        elemento: { style: {} },
        x: 100,
        y: 80,
        direcao: 'd',
        noChao: false,
        velocidadeY: -3,
        jetpackAtivo: false,
        ...estado
    };

    const sandbox = { Math, Number, inimigo };
    sandbox.window = sandbox;
    const contexto = vm.createContext(sandbox);

    vm.runInContext(codigoAnimacao, contexto, {
        filename: 'src/visual/animacoes-entidades.js'
    });
    vm.runInContext(codigoAtualizacaoVisual, contexto, {
        filename: 'src/inimigos/ia-inimigo.js (atualização visual)'
    });

    return inimigo;
}

test('inimigo inclina no sentido configurado ao subir e ao cair', () => {
    const subindo = atualizarVisualInimigo({ velocidadeY: -3 });
    const caindo = atualizarVisualInimigo({ velocidadeY: 3 });

    assert.equal(subindo.elemento.style.transform, 'rotate(-10.0deg) scaleX(1)');
    assert.equal(caindo.elemento.style.transform, 'rotate(10.0deg) scaleX(1)');
});

test('inimigo preserva o espelhamento e a inclinação ao olhar para a esquerda', () => {
    const inimigo = atualizarVisualInimigo({ direcao: 'e', velocidadeY: -3 });

    assert.equal(inimigo.elemento.style.transform, 'rotate(10.0deg) scaleX(-1)');
});

test('inimigo no chão mantém rotação zero', () => {
    const inimigo = atualizarVisualInimigo({ noChao: true, velocidadeY: 0 });

    assert.equal(inimigo.elemento.style.transform, 'rotate(0.0deg) scaleX(1)');
});

test('jetpack desativa a inclinação durante o voo', () => {
    const inimigo = atualizarVisualInimigo({ jetpackAtivo: true, velocidadeY: 6 });

    assert.equal(inimigo.elemento.style.transform, 'rotate(0.0deg) scaleX(1)');
});
