const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const codigo = fs.readFileSync(path.resolve(__dirname, '../../src/core/audio-manager.js'), 'utf8');

function criarAudioManager() {
    const storage = new Map();
    const criados = [];
    class AudioMock {
        constructor(src) {
            this.src = src; this.volume = 1; this.ended = false;
            this.loop = false; this.paused = false; this.currentTime = 0;
            this.listeners = {}; criados.push(this);
        }
        play() { return Promise.resolve(); }
        pause() { this.paused = true; }
        addEventListener(tipo, fn) { this.listeners[tipo] = fn; }
    }
    const sandbox = {
        Audio: AudioMock, Math,
        localStorage: {
            getItem: key => storage.has(key) ? storage.get(key) : null,
            setItem: (key, value) => storage.set(key, String(value))
        },
        document: { querySelectorAll: () => [] },
        window: {}
    };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(codigo, sandbox);
    return { audio: sandbox.window.AudioManager, storage, criados };
}

test('createSFX cria instância com loop configurável', () => {
    const { audio, criados } = criarAudioManager();

    const som = audio.createSFX('musica_fundo', 0.5, true);

    assert.equal(som.loop, true, 'Loop deve ser true quando passado como argumento');
    assert.ok(audio._activeSounds.includes(som), 'Som em loop deve estar em _activeSounds');
    assert.equal(criados.length, 1, 'Deve ter criado exatamente uma instância de áudio');
    assert.ok(criados[0].src.includes('musica_fundo'), 'Src deve incluir o nome do arquivo');
});

test('som em loop é interrompido por stopAllSounds', () => {
    const { audio, criados } = criarAudioManager();

    // Criar som em loop com createSFX (fica em _activeSounds)
    const som = audio.createSFX('musica_fundo', 0.5, true);
    assert.equal(audio._activeSounds.length, 1, 'Som deve estar na lista ativa');

    audio.stopAllSounds();

    assert.equal(som.paused, true, 'Som em loop deve ser pausado pelo stopAllSounds');
    assert.equal(audio._activeSounds.length, 0, 'Lista de sons ativos deve estar vazia após stopAllSounds');
});

test('playPasso aplica volume mestre e não sobrepõe se anterior não terminou', () => {
    const { audio, criados } = criarAudioManager();

    // Definir volume mestre
    audio.masterVolume = 0.5;

    // Primeira chamada: cria áudio de passo
    audio.playPasso();
    assert.equal(criados.length, 1, 'Primeira chamada deve criar um áudio de passo');

    // O AudioMock tem ended = false por padrão, então segunda chamada deve ser bloqueada
    audio.playPasso();
    assert.equal(criados.length, 1, 'Segunda chamada deve ser bloqueada porque ended === false');

    // Verificar que o volume foi aplicado com masterVolume (0.2 * 0.5 = 0.1)
    const volumeEsperado = Math.max(0, Math.min(1, 0.2 * 0.5));
    assert.equal(criados[0].volume, volumeEsperado, 'Volume deve ser 0.2 * masterVolume');
});
