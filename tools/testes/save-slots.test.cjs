const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');
const codigo = fs.readFileSync(path.join(raiz, 'src/core/save-slots.js'), 'utf8');

function criarSaveSlots(seed = {}) {
    const dados = new Map(Object.entries(seed));
    const sandbox = {
        console: { warn() {}, error() {}, log() {}, debug() {} },
        localStorage: {
            getItem: key => dados.has(key) ? dados.get(key) : null,
            setItem: (key, value) => dados.set(key, String(value)),
            removeItem: key => dados.delete(key)
        },
        window: {}
    };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(codigo, sandbox);
    return { slots: sandbox.window.SaveSlots, dados };
}

test('slot ativo padrão é slot1 e pode ser trocado', () => {
    const { slots } = criarSaveSlots();

    // O slot padrão quando localStorage está vazio é 'slot1' (normalizeSlotId de null)
    assert.equal(slots.getActiveSlotId(), 'slot1', 'Slot padrão deve ser slot1');

    const resultado = slots.setActiveSlotId('slot2');
    assert.equal(resultado, 'slot2', 'setActiveSlotId deve retornar o novo slot normalizado');
    assert.equal(slots.getActiveSlotId(), 'slot2', 'getActiveSlotId deve retornar slot2 após trocar');
});

test('dificuldade é salva e pode ser travada', () => {
    const { slots } = criarSaveSlots();

    slots.setSlotDifficulty('slot1', 'hard');
    assert.equal(slots.getSlotDifficulty('slot1'), 'hard', 'Dificuldade salva deve ser retornada');

    slots.lockDifficultyForSlot('slot1');
    assert.equal(slots.isDifficultyLocked('slot1'), true, 'Slot deve estar travado após lockDifficultyForSlot');

    // Tentar mudar sem force deve retornar false
    const resultado = slots.setSlotDifficulty('slot1', 'easy');
    assert.equal(resultado, false, 'setSlotDifficulty deve retornar false quando travado e sem force');

    // Dificuldade não deve ter mudado
    assert.equal(slots.getSlotDifficulty('slot1'), 'hard', 'Dificuldade não deve mudar quando travada');
});

test('slot ocupado é detectado após salvar dado', () => {
    const { slots, dados } = criarSaveSlots();

    // Antes de salvar qualquer dado
    assert.equal(slots.isSlotOccupied('slot1'), false, 'Slot deve estar vazio inicialmente');

    // Simular dado salvo diretamente no localStorage via dados
    // isSlotOccupied verifica getSlotDifficultyKey ou BASE_SAVE_KEYS com buildSlotKey
    // Chave de dificuldade: 'plataformaDificuldade_slot1'
    dados.set('plataformaDificuldade_slot1', 'normal');

    assert.equal(slots.isSlotOccupied('slot1'), true, 'Slot deve estar ocupado após salvar dado');
});

test('clearSlot remove todos os dados do slot', () => {
    const { slots, dados } = criarSaveSlots();

    // Popular slot1 com dados de dificuldade e uma save key
    dados.set('plataformaDificuldade_slot1', 'normal');
    dados.set('plataformaInventario_slot1', '{"itens":[]}');

    assert.equal(slots.isSlotOccupied('slot1'), true, 'Slot deve estar ocupado antes do clear');

    slots.clearSlot('slot1');

    assert.equal(slots.isSlotOccupied('slot1'), false, 'Slot deve estar vazio após clearSlot');
    assert.equal(dados.has('plataformaDificuldade_slot1'), false, 'Chave de dificuldade deve ser removida');
    assert.equal(dados.has('plataformaInventario_slot1'), false, 'Chave de inventário deve ser removida');
});
