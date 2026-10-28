const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');

function ler(caminho) {
    return fs.readFileSync(path.join(raiz, caminho), 'utf8');
}

test('AudioManager resolve os MP3 novos e mantém compatibilidade com WAV', () => {
    const caminhosTocados = [];
    class AudioFalso {
        constructor(caminho) {
            this.caminho = caminho;
            this.play = () => {
                caminhosTocados.push(this.caminho);
                return Promise.resolve();
            };
        }
    }

    const contexto = vm.createContext({
        window: {},
        localStorage: { getItem: () => null, setItem: () => {} },
        Audio: AudioFalso,
        document: { querySelectorAll: () => [] }
    });
    vm.runInContext(ler('src/core/audio-manager.js'), contexto, {
        filename: 'src/core/audio-manager.js'
    });

    for (const arquivo of ['crafting.mp3', 'espada.mp3', 'madeira_quebrando.mp3']) {
        contexto.window.AudioManager.playSFX(arquivo, 0.8);
    }
    contexto.window.AudioManager.playSFX('impacto', 0.5);

    assert.deepEqual(caminhosTocados, [
        '../../assets/audio/sfx/crafting.mp3',
        '../../assets/audio/sfx/espada.mp3',
        '../../assets/audio/sfx/madeira_quebrando.mp3',
        '../../assets/audio/sfx/impacto.wav'
    ]);
});

test('os três arquivos MP3 e seus gatilhos estão configurados', () => {
    for (const arquivo of ['crafting.mp3', 'espada.mp3', 'madeira_quebrando.mp3']) {
        assert.ok(fs.existsSync(path.join(raiz, 'assets/audio/sfx', arquivo)), `${arquivo} deve existir`);
    }

    const crafting = ler('src/core/interacao-sistema.js');
    const pet = ler('src/core/pet-habilidades.js');
    const troncos = ler('src/core/blocos-quebraveis.js');

    assert.match(crafting, /atualizarResultadoCrafting\(\);\s*renderizarListaInventario\(\);\s*window\.AudioManager\?\.playSFX\('crafting\.mp3'/);
    assert.match(pet, /inimigo\.stunTimer = 100;\s*window\.AudioManager\?\.playSFX\('espada\.mp3'/);
    assert.match(troncos, /if \(bloco\.vidaAtual <= 0\) \{\s*window\.AudioManager\?\.playSFX\('madeira_quebrando\.mp3'/);
});
