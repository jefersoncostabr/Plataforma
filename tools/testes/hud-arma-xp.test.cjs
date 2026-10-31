const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const codigo = fs.readFileSync(path.resolve(__dirname, '../../src/ui/hud.js'), 'utf8');

function elemento() {
    return {
        style: {}, children: [], parentElement: null,
        appendChild(child) { child.parentElement = this; this.children.push(child); },
        remove() { this.parentElement = null; },
        set innerHTML(_value) { this.children = []; }
    };
}

function criarHUD(controle, extras = {}, temEscudoAtivo = () => false) {
    const container = elemento();
    const sandbox = {
        document: {
            createElement: () => elemento(),
            getElementById: id => id === 'jogo-container' ? container : null
        },
        window: {
            SKILLS: { VISAO: 'visao' },
            temSkill: () => true,
            skillPoints: 0,
            ...extras
        }
    };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(codigo, sandbox);
    const hud = sandbox.window.criarSistemaHUDJogador({ controle, elemento: elemento(), config: { escudoTirosProtegidos: 3 }, temEscudoAtivo });
    return { hud, janela: sandbox.window, container };
}

test('HUD exibe zero quando skillPoints é negativo', () => {
    // O HUD usa Math.max(0, skillPoints) antes de exibir
    const controle = { maxVida: 3, dano: 0 };
    const { hud, janela, container } = criarHUD(controle, { skillPoints: -5 });

    // Capturar o elemento xp-numero chamando atualizarHUD
    // Precisamos interceptar createElement para obter o span de xp
    const storage = new Map();
    const spans = [];
    const sandbox2 = {
        document: {
            createElement: () => {
                const el = {
                    style: {}, children: [], parentElement: null, className: '', textContent: '',
                    src: '', alt: '',
                    appendChild(child) { child.parentElement = this; this.children.push(child); },
                    remove() { this.parentElement = null; },
                    set innerHTML(_v) { this.children = []; }
                };
                spans.push(el);
                return el;
            },
            getElementById: id => id === 'jogo-container' ? {
                style: {}, children: [], parentElement: null,
                appendChild(child) { child.parentElement = this; this.children.push(child); },
                remove() { this.parentElement = null; },
                set innerHTML(_v) { this.children = []; }
            } : null
        },
        window: {
            SKILLS: { VISAO: 'visao' },
            temSkill: () => true,
            skillPoints: -5
        }
    };
    sandbox2.window.window = sandbox2.window;
    vm.createContext(sandbox2);
    vm.runInContext(codigo, sandbox2);

    const hud2 = sandbox2.window.criarSistemaHUDJogador({
        controle: { maxVida: 3, dano: 0 },
        elemento: spans[0] || { style: {}, children: [], appendChild() {}, remove() {} },
        config: { escudoTirosProtegidos: 3 },
        temEscudoAtivo: () => false
    });

    spans.length = 0; // reset para capturar apenas os do atualizarHUD
    hud2.atualizarHUD();

    const xpSpan = spans.find(el => el.className === 'hud-xp-numero');
    assert.ok(xpSpan, 'Deve existir elemento com classe hud-xp-numero');
    assert.equal(xpSpan.textContent, '0', 'skillPoints negativos devem ser exibidos como 0');
});

test('HUD não exibe ícones de escudo quando proteção está esgotada', () => {
    // escudoProtegido === escudoTirosProtegidos => slotsRestantes = 0 => nenhum ícone
    const spans = [];
    const sandbox = {
        document: {
            createElement: () => {
                const el = {
                    style: {}, children: [], parentElement: null, className: '', textContent: '',
                    src: '', alt: '',
                    appendChild(child) { child.parentElement = this; this.children.push(child); },
                    remove() { this.parentElement = null; },
                    set innerHTML(_v) { this.children = []; }
                };
                spans.push(el);
                return el;
            },
            getElementById: () => null
        },
        window: {
            SKILLS: { VISAO: 'visao' },
            temSkill: () => true,
            skillPoints: 0
        }
    };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(codigo, sandbox);

    const controle = { maxVida: 3, dano: 0, escudoProtegido: 3 };
    const hud = sandbox.window.criarSistemaHUDJogador({
        controle,
        elemento: { style: {}, children: [], appendChild() {}, remove() {} },
        config: { escudoTirosProtegidos: 3 },
        temEscudoAtivo: () => true // escudo ativo, mas esgotado
    });

    spans.length = 0;
    hud.atualizarHUD();

    const iconeEscudo = spans.find(el => el.className === 'hud-shield');
    assert.equal(iconeEscudo, undefined, 'Não deve haver ícones de escudo quando proteção está esgotada');
});

test('HUD exibe corações completos quando não há dano', () => {
    const spans = [];
    const sandbox = {
        document: {
            createElement: () => {
                const el = {
                    style: {}, children: [], parentElement: null, className: '', textContent: '',
                    src: '', alt: '',
                    appendChild(child) { child.parentElement = this; this.children.push(child); },
                    remove() { this.parentElement = null; },
                    set innerHTML(_v) { this.children = []; }
                };
                spans.push(el);
                return el;
            },
            getElementById: () => null
        },
        window: {
            SKILLS: { VISAO: 'visao' },
            temSkill: () => true,
            skillPoints: 0
        }
    };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(codigo, sandbox);

    const controle = { maxVida: 3, dano: 0 };
    const hud = sandbox.window.criarSistemaHUDJogador({
        controle,
        elemento: { style: {}, children: [], appendChild() {}, remove() {} },
        config: { escudoTirosProtegidos: 3 },
        temEscudoAtivo: () => false
    });

    spans.length = 0;
    hud.atualizarHUD();

    // 3 corações + 1 xp span = 4 elementos criados
    const coracoes = spans.filter(el => el.className === 'hud-heart');
    const coracoesPerdidos = spans.filter(el => el.className === 'hud-heart hud-heart-lost');

    assert.equal(coracoes.length, 3, 'Deve ter 3 corações cheios');
    assert.equal(coracoesPerdidos.length, 0, 'Não deve ter corações perdidos');
});
