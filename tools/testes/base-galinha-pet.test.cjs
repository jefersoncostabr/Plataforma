const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '../..');
const htmlBase = fs.readFileSync(
    path.join(raiz, 'src/ui/interacoes/telas/base-craft.html'),
    'utf8'
);
const codigoInteracao = fs.readFileSync(
    path.join(raiz, 'src/core/interacao-sistema.js'),
    'utf8'
);

test('menu da base possui botão e sprite da galinha', () => {
    assert.match(htmlBase, /data-pet-toggle="galinha"/);
    assert.match(
        htmlBase,
        /data-pet-toggle="galinha"[\s\S]*?<img[^>]+src="\.\.\/\.\.\/assets\/personagem\/galinha\/galinha_parado\.png"[^>]+alt="Galinha"/i
    );
    assert.equal(
        fs.existsSync(path.join(raiz, 'assets/personagem/galinha/galinha_parado.png')),
        true,
        'o arquivo de sprite exibido no botão deve existir'
    );
});

test('gerenciamento da base associa a galinha ao estado, salvamento e spawn corretos', () => {
    const inicio = codigoInteracao.indexOf('const petsDisponiveis = [');
    assert.notEqual(inicio, -1, 'a lista de pets gerenciados deve existir');

    const fim = codigoInteracao.indexOf('\n        ];', inicio);
    assert.notEqual(fim, -1, 'a lista de pets gerenciados deve terminar');

    const listaPets = codigoInteracao.slice(inicio, fim);
    const entradaGalinha = listaPets.match(/\{[\s\S]*?id: 'galinha'[\s\S]*?\n            \}/);
    assert.ok(entradaGalinha, 'a lista de gerenciamento deve conter a galinha');
    assert.match(entradaGalinha[0], /resgatado: window\.isGalinhaResgatada/);
    assert.match(entradaGalinha[0], /naBase: 'galinhaNaBase'/);
    assert.match(entradaGalinha[0], /key: 'plataformaGalinhaNaBase'/);
    assert.match(entradaGalinha[0], /sprite: 'galinha\/galinha_parado\.png'/);
    assert.match(entradaGalinha[0], /spawn: window\.iniciarGalinha/);
    assert.match(entradaGalinha[0], /entidade: 'galinhaEntidade'/);
});
