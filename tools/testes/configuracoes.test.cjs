const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '../..');

test('configuracoes.json existe e é JSON válido', () => {
    const caminho = path.join(raiz, 'config/configuracoes.json');
    assert.ok(fs.existsSync(caminho), 'Arquivo configuracoes.json deve existir');
    const conteudo = fs.readFileSync(caminho, 'utf8');
    let config;
    assert.doesNotThrow(() => { config = JSON.parse(conteudo); }, 'O arquivo deve ser JSON válido');
    assert.ok(config !== null && typeof config === 'object', 'O JSON deve ser um objeto');
});

test('configuracoes.json tem campos obrigatórios de física', () => {
    const config = JSON.parse(fs.readFileSync(path.join(raiz, 'config/configuracoes.json'), 'utf8'));

    assert.ok('velocidadePlayer' in config, 'Deve ter velocidadePlayer');
    assert.equal(typeof config.velocidadePlayer, 'number', 'velocidadePlayer deve ser número');
    assert.ok(config.velocidadePlayer > 0, 'velocidadePlayer deve ser positivo');

    assert.ok('forcaPuloPlayer' in config, 'Deve ter forcaPuloPlayer');
    assert.equal(typeof config.forcaPuloPlayer, 'number', 'forcaPuloPlayer deve ser número');
    assert.ok(config.forcaPuloPlayer > 0, 'forcaPuloPlayer deve ser positivo');

    assert.ok('gravidadePlayer' in config, 'Deve ter gravidadePlayer');
    assert.equal(typeof config.gravidadePlayer, 'number', 'gravidadePlayer deve ser número');
    assert.ok(config.gravidadePlayer > 0, 'gravidadePlayer deve ser positivo');
});

test('configuracoes.json tem faseInicial definida', () => {
    const config = JSON.parse(fs.readFileSync(path.join(raiz, 'config/configuracoes.json'), 'utf8'));

    assert.ok('faseInicial' in config, 'Deve ter campo faseInicial');
    assert.equal(typeof config.faseInicial, 'string', 'faseInicial deve ser string');
    assert.ok(config.faseInicial.trim().length > 0, 'faseInicial não deve ser string vazia');
});

test('configuracoes.json tem valores de escudo válidos', () => {
    const config = JSON.parse(fs.readFileSync(path.join(raiz, 'config/configuracoes.json'), 'utf8'));

    assert.ok('escudoTirosProtegidos' in config, 'Deve ter campo escudoTirosProtegidos');
    assert.equal(typeof config.escudoTirosProtegidos, 'number', 'escudoTirosProtegidos deve ser número');
    assert.ok(config.escudoTirosProtegidos >= 1, 'escudoTirosProtegidos deve ser >= 1');
});
