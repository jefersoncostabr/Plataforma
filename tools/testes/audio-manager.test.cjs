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
            this.src = src;
            this.volume = 1;
            this.ended = false;
            this.listeners = {};
            criados.push(this);
        }
        play() { return Promise.resolve(); }
        pause() { this.paused = true; }
        addEventListener(tipo, fn) { this.listeners[tipo] = fn; }
    }
    const sandbox = {
        Audio: AudioMock,
        Math,
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

test('volume mestre carrega do armazenamento, limita a faixa e persiste ajustes', () => {
    const { audio, storage } = criarAudioManager();
    assert.equal(audio.masterVolume, 0.5);
    audio.setMasterVolume(1.5);
    assert.equal(audio.masterVolume, 1);
    assert.equal(storage.get('plataformaMasterVolume'), '1');
    audio.setMasterVolume(-2);
    assert.equal(audio.masterVolume, 0);
    assert.equal(storage.get('plataformaMasterVolume'), '0');
});

test('SFX simultâneos mantêm instâncias independentes e aplicam volume mestre', () => {
    const { audio, criados } = criarAudioManager();
    audio.masterVolume = 0.5;
    audio.playSFX('passo', 0.8);
    audio.playSFX('impacto.mp3', 0.4);
    assert.equal(criados.length, 2);
    assert.equal(criados[0].src, '../../assets/audio/sfx/passo.wav');
    assert.equal(criados[0].volume, 0.4);
    assert.equal(criados[1].src, '../../assets/audio/sfx/impacto.mp3');
    assert.equal(criados[1].volume, 0.2);
    assert.equal(audio._activeSounds.length, 2);
});

test('falha de carregamento remove o SFX da lista ativa', () => {
    const { audio, criados } = criarAudioManager();
    const som = audio.createSFX('arquivo-inexistente');
    assert.equal(audio._activeSounds.length, 1);
    criados[0].listeners.error(new Error('falha simulada'));
    assert.equal(audio._activeSounds.length, 0);
    assert.equal(som.src, '../../assets/audio/sfx/arquivo-inexistente.wav');
});

test('parar todos os sons pausa, reinicia e limpa as instâncias rastreadas', () => {
    const { audio, criados } = criarAudioManager();
    audio.playSFX('um');
    audio.playSFX('dois');
    criados.forEach(som => { som.currentTime = 3; });
    audio.stopAllSounds();
    assert.equal(criados.every(som => som.paused && som.currentTime === 0), true);
    assert.equal(audio._activeSounds.length, 0);
});
