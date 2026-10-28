const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');

function carregarRegraReciclagem() {
    const codigo = fs.readFileSync(path.join(raiz, 'src/core/interacao-sistema.js'), 'utf8');
    const inicio = codigo.indexOf('    const EQUIPAMENTOS_RECICLAVEIS = new Set([');
    const fim = codigo.indexOf('\n\n    window.isInteractionMenuOpen', inicio);
    assert.notEqual(inicio, -1, 'A lista de equipamentos recicláveis deve existir');
    assert.notEqual(fim, -1, 'A regra de reciclagem deve existir');

    const contexto = vm.createContext({ Set });
    vm.runInContext(`${codigo.slice(inicio, fim)}\nglobalThis.podeReciclarEmScrap = podeReciclarEmScrap;`, contexto);
    return contexto.podeReciclarEmScrap;
}

const slot = (itemTipo, extras = {}) => ({ ocupado: 'true', itemTipo, ...extras });

test('dois equipamentos ou um equipamento com SP podem ser reciclados em scrap', () => {
    const podeReciclar = carregarRegraReciclagem();

    assert.equal(podeReciclar(slot('revolver'), slot('escudo')), true);
    assert.equal(podeReciclar(slot('bateria'), slot('jetpack')), true);
    assert.equal(podeReciclar(slot('revolver'), slot('skillpoint_display', { isSkillPoint: 'true' })), true);
    assert.equal(podeReciclar(slot('skillpoint_display', { isSkillPoint: 'true' }), slot('bateria')), true);
});

test('munição, reparação, itens plus e itens que não são equipamentos não podem ser reciclados', () => {
    const podeReciclar = carregarRegraReciclagem();

    for (const tipo of ['municao_plus', 'restauracao', 'airdrop_plus', 'novelo', 'scrap']) {
        assert.equal(podeReciclar(slot('revolver'), slot(tipo)), false, `${tipo} deve ser rejeitado`);
    }
});

test('reciclagem exige ingredientes ocupados, aceita SP e rejeita XP', () => {
    const podeReciclar = carregarRegraReciclagem();

    assert.equal(podeReciclar(slot('revolver'), { itemTipo: 'escudo' }), false);
    assert.equal(podeReciclar(slot('revolver', { isXP: 'true' }), slot('escudo')), false);
    assert.equal(podeReciclar(slot('revolver'), { ...slot('skillpoint_display', { isSkillPoint: 'true' }), ocupado: 'false' }), false);
    assert.equal(podeReciclar(slot('revolver'), slot('skillpoint_display', { isSkillPoint: 'true' })), true);
    assert.equal(podeReciclar(slot('revolver'), slot('skillpoint_display', { isSkillPoint: 'true', isXP: 'true' })), false);
});
