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
            createElement: elemento,
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

test('HUD desenha a quantidade correta de corações restantes', () => {
    const { hud } = criarHUD({ maxVida: 4, dano: 2 });
    hud.atualizarHUD();
    const coracoes = hud.elemento.children.filter(child => child.className.includes('hud-heart'));
    assert.equal(coracoes.length, 4);
    assert.equal(coracoes.filter(child => child.className === 'hud-heart').length, 2);
    assert.equal(coracoes.filter(child => child.className.includes('hud-heart-lost')).length, 2);
});

test('HUD exibe pontos de skill e quantidade restante do escudo', () => {
    const { hud, janela } = criarHUD({ maxVida: 3, dano: 0, escudoProtegido: 1 }, { skillPoints: 7 }, () => true);
    hud.atualizarHUD();
    assert.equal(hud.elemento.children.find(child => child.className === 'hud-xp-numero').textContent, '7');
    assert.equal(hud.elemento.children.filter(child => child.className === 'hud-shield').length, 2);
    assert.equal(janela.skillPoints, 7);
});

test('HUD fica oculto quando a skill Visão não está ativa', () => {
    const { hud } = criarHUD({ maxVida: 3, dano: 0 }, { temSkill: () => false });
    hud.atualizarHUD();
    assert.equal(hud.elemento.style.display, 'none');
});
