const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '../..');
const configuracoes = JSON.parse(
    fs.readFileSync(path.join(raiz, 'config/configuracoes.json'), 'utf8')
);

test('cão usa a distância de seguimento configurada de 30 pixels', () => {
    assert.equal(configuracoes.distanciaMinimaCaoSeguir, 30);
});

test('gato mantém o padrão de 45 pixels sem configuração própria', () => {
    assert.equal(Object.hasOwn(configuracoes, 'distanciaMinimaGatoSeguir'), false);

    for (const arquivo of ['src/core/cao.js', 'src/core/pets.js']) {
        const codigo = fs.readFileSync(path.join(raiz, arquivo), 'utf8');
        assert.match(codigo, /\(pet\.tipo === 'cao' \? config\.distanciaMinimaCaoSeguir : config\.distanciaMinimaGatoSeguir\) \|\| 45/);
    }
});
