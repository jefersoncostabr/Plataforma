const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');

function ler(caminho) {
    return fs.readFileSync(path.join(raiz, caminho), 'utf8');
}

function extrairTrecho(codigo, inicio, fim, mensagem) {
    const indiceInicio = codigo.indexOf(inicio);
    const indiceFim = codigo.indexOf(fim, indiceInicio);
    assert.notEqual(indiceInicio, -1, `${mensagem}: início não encontrado`);
    assert.notEqual(indiceFim, -1, `${mensagem}: fim não encontrado`);
    return codigo.slice(indiceInicio, indiceFim);
}

function carregarFuncaoIrParaFase({ valor = '2.3', niveis, carregarFase, toggleCheatMenu }) {
    const codigo = ler('src/ui/cheat-menu.js');
    const funcao = extrairTrecho(
        codigo,
        '    function irParaFaseCheat() {',
        '\n    function irParaFaseTeste()',
        'irParaFaseCheat'
    );
    const window = {
        niveis,
        carregarFase,
        toggleCheatMenu,
        nivelAtual: 0,
        __transicaoFaseAtiva: false
    };
    const sandbox = {
        window,
        cheatMenuPhaseInput: { value: valor },
        cheatMenuPhaseFeedback: { textContent: '' },
        console
    };
    vm.runInNewContext(`${funcao}\nthis.irParaFaseCheat = irParaFaseCheat;`, sandbox);
    return { window, feedback: sandbox.cheatMenuPhaseFeedback, irParaFaseCheat: sandbox.irParaFaseCheat };
}

test('menu cheats fecha antes de carregar a fase escolhida e ativa o sinal de transição', async () => {
    const eventos = [];
    const fases = ['config/fases/nivel_1/fase1.json', 'config/fases/nivel_2/fase3.json'];
    const contexto = carregarFuncaoIrParaFase({
        niveis: fases,
        toggleCheatMenu: () => eventos.push('fechar-cheats'),
        carregarFase: caminho => {
            eventos.push(`carregar:${caminho}:${contexto.window.__transicaoFaseAtiva}`);
            return Promise.resolve();
        }
    });

    assert.equal(contexto.irParaFaseCheat(), true);
    assert.equal(contexto.window.nivelAtual, 1);
    assert.deepEqual(eventos, [
        'fechar-cheats',
        'carregar:config/fases/nivel_2/fase3.json:true'
    ]);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(contexto.window.__transicaoFaseAtiva, false);
});

test('menu cheats mostra erro e não inicia transição para entrada inválida', () => {
    let carregou = false;
    const contexto = carregarFuncaoIrParaFase({
        valor: 'fase 2.3',
        niveis: ['config/fases/nivel_2/fase3.json'],
        toggleCheatMenu: () => assert.fail('não deve fechar para valor inválido'),
        carregarFase: () => { carregou = true; }
    });

    assert.equal(contexto.irParaFaseCheat(), false);
    assert.match(contexto.feedback.textContent, /Formato inválido/);
    assert.equal(carregou, false);
    assert.equal(contexto.window.__transicaoFaseAtiva, false);
});

test('destravamento da fase fecha skills e remove donos de pausa obsoletos', () => {
    const codigo = ler('src/core/inicial.js');
    const funcao = extrairTrecho(
        codigo,
        'function forcarDestravamentoGeral(entidade) {',
        '\n}\n\n//',
        'forcarDestravamentoGeral'
    );
    let skillsFechadas = 0;
    const donosPausa = new Set(['skills', 'cheat']);
    const window = {
        isPaused: true,
        isMenuOpen: true,
        isSkillMenuOpen: true,
        isMochilaMenuOpen: true,
        isInteractionMenuOpen: true,
        __pauseOwners: donosPausa,
        fecharMenuSkillsParaTransicao: () => { skillsFechadas++; }
    };
    const sandbox = { window };
    vm.runInNewContext(`${funcao}\n}\nthis.forcarDestravamentoGeral = forcarDestravamentoGeral;`, sandbox);
    sandbox.forcarDestravamentoGeral({});

    assert.equal(skillsFechadas, 1);
    assert.equal(window.isPaused, false);
    assert.equal(window.isSkillMenuOpen, false);
    assert.equal(window.isMenuOpen, false);
    assert.equal(window.isMochilaMenuOpen, false);
    assert.equal(window.isInteractionMenuOpen, false);
    assert.equal(donosPausa.size, 0);
});
