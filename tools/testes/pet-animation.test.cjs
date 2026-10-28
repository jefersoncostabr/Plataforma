const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');

function criarAmbiente() {
    const elementos = new Map();
    const palco = {
        appendChild(elemento) {
            elemento.parentNode = this;
            elementos.set(elemento.id, elemento);
        }
    };
    const sandbox = {
        console,
        localStorage: { getItem: () => null },
        document: {
            getElementById: (id) => id === 'game-stage' ? palco : elementos.get(id) || null,
            createElement: () => ({ style: {}, remove() { elementos.delete(this.id); } })
        },
        requestAnimationFrame: () => {}
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(
        fs.readFileSync(path.join(raiz, 'src/core/pets.js'), 'utf8'),
        sandbox,
        { filename: 'src/core/pets.js' }
    );
    return sandbox;
}

test('inicialização escolhe sprites de andar próprios para cão e gato', () => {
    const ambiente = criarAmbiente();
    ambiente.config = {
        spriteCao: 'cao-parado.png',
        spriteCaoAndando: 'cao-andando.png',
        spriteGato: 'gato-parado.png',
        spriteGatoAndando: 'gato-andando.png'
    };

    ambiente.inicializarPetNPC('cao', 50, 50, ambiente.config);
    ambiente.inicializarPetNPC('gato', 80, 50, ambiente.config);

    assert.equal(ambiente.caoEntidade.spriteParado, 'cao-parado.png');
    assert.equal(ambiente.caoEntidade.spriteAndando, 'cao-andando.png');
    assert.equal(ambiente.gatoEntidade.spriteParado, 'gato-parado.png');
    assert.equal(ambiente.gatoEntidade.spriteAndando, 'gato-andando.png');
});

test('atualização do pet usa a função de animação quando disponível', () => {
    const codigo = fs.readFileSync(path.join(raiz, 'src/core/pets.js'), 'utf8');
    assert.match(codigo, /window\.atualizarAnimacao\(pet, pet\.elemento, pet\.spriteParado, pet\.spriteAndando/);
});

test('módulo de animação dos pets delega a rotação vertical à função compartilhada', () => {
    const ambiente = { window: { aplicarInclinacaoVertical: (pet) => { ambiente.petInclinado = pet; } } };
    vm.runInNewContext(
        fs.readFileSync(path.join(raiz, 'src/visual/animacoes-pets.js'), 'utf8'),
        ambiente,
        { filename: 'src/visual/animacoes-pets.js' }
    );
    const pet = {};
    ambiente.window.aplicarRotacaoVerticalPet(pet);
    assert.equal(ambiente.petInclinado, pet);
});
