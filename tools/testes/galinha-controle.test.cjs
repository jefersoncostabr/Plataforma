const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '../..');

function ler(caminho) {
    return fs.readFileSync(path.join(raiz, caminho), 'utf8');
}

test('controle da galinha exige a mesma habilidade e pode ser assumido com Q', () => {
    const movimento = ler('src/jogador/movimento.js');
    const habilidades = ler('src/core/pet-habilidades.js');
    const inicial = ler('src/core/inicial.js');

    assert.match(inicial, /window\.controlandoGalinha\s*=\s*false/);
    assert.match(habilidades, /podeSerControlado:\s*function\s*\(pet\)[\s\S]*?temSkill\?\.\(\(window\.SKILLS\s*\|\|\s*\{\}\)\.ADESTRAMENTO\)/);
    assert.match(movimento, /if\s*\(!window\.controlandoCao\s*&&\s*!window\.controlandoGato\s*&&\s*!window\.controlandoGalinha\s*&&\s*!window\.controlandoBB\s*&&\s*apertouQ\)/);
    assert.match(movimento, /tentarTroca\(window\.galinhaEntidade,\s*'controlandoGalinha'\)/);
});

test('galinha usa os comandos de movimento e retorna ao jogador com dois toques em Q', () => {
    const pets = ler('src/core/cao.js');

    assert.match(pets, /pet\.tipo\s*===\s*'galinha'\s*&&\s*window\.controlandoGalinha/);
    assert.match(pets, /else\s+if\s*\(pet\.tipo\s*===\s*'galinha'\)\s*window\.controlandoGalinha\s*=\s*false/);
    assert.match(pets, /agora\s*-\s*\(pet\.ultimoToqueQ\s*\|\|\s*0\)\s*<\s*300/);
});

test('jogador e câmera acompanham a galinha durante o controle e as transições limpam a flag', () => {
    const movimento = ler('src/jogador/movimento.js');
    const camera = ler('src/visual/camera.js');
    const abertura = ler('src/jogador/abertura-animacao.js');
    const resgateBB = ler('src/core/mecanica-resgate-bb.js');

    assert.match(movimento, /window\.controlandoCao\s*\|\|\s*window\.controlandoGato\s*\|\|\s*window\.controlandoGalinha\s*\|\|\s*window\.controlandoBB/);
    assert.match(movimento, /window\.controlandoGalinha\s*\?\s*window\.galinhaEntidade/);
    assert.match(camera, /window\.controlandoGalinha\s*\?\s*window\.galinhaEntidade/);
    assert.match(abertura, /window\.controlandoGalinha\s*=\s*false/);
    assert.match(resgateBB, /window\.controlandoGalinha\s*=\s*false/);
});
