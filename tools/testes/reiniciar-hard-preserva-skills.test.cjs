const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');

function carregarProximoNivelHard() {
    const codigo = fs.readFileSync(path.join(raiz, 'src/core/inicial.js'), 'utf8');
    const inicio = codigo.indexOf('window.proximoNivel = async function() {');
    const fim = codigo.indexOf('\nwindow.reiniciarJogo = async function', inicio);
    assert.notEqual(inicio, -1, 'A função proximoNivel deve existir');
    assert.notEqual(fim, -1, 'O fim da função proximoNivel deve existir');

    const avisos = [];
    const salvamentos = [];
    const efeitosAplicados = [];
    const atualizacoesHUD = [];
    const skillsOriginais = ['Dash', 'Visão'];
    const controle = { cintoSlot: null, coleteSlots: [null], inventario: [] };
    const window = {
        faseAtualPathRelativo: 'nivel_2/fase7.json',
        faseAtualNome: 'fase7.json',
        nivelAtual: 0,
        niveis: ['nivel_2/fase7.json'],
        gameDifficulty: 'hard',
        config: { faseInicial: 'nivel_1/fase1.json' },
        coleteConfig: { capacidade: 6 },
        playerSkills: [...skillsOriginais],
        playerXP: 125,
        skillPoints: 3,
        playerControle: controle,
        aplicarEfeitosSkills: () => efeitosAplicados.push([...window.playerSkills]),
        atualizarHUD: () => atualizacoesHUD.push(true),
        salvarCheckpointEquipamentoDoControle() {},
        salvarInventarioDoControle() {},
        salvarProgressoSkills() {
            salvamentos.push({
                skills: [...window.playerSkills],
                xp: window.playerXP,
                pontos: window.skillPoints
            });
        },
        async reiniciarJogo() {
            // Imita um reset durante o carregamento; o fluxo deve restaurar as skills depois.
            window.playerSkills = [];
        }
    };

    const contexto = vm.createContext({
        window,
        alert: mensagem => avisos.push(mensagem),
        obterIndiceFasePorNome: () => 0,
        obterIndiceFaseInicial: () => 0,
        salvarFaseAtual() {}
    });
    vm.runInContext(codigo.slice(inicio, fim), contexto, { filename: 'src/core/inicial.js' });

    return { window, controle, avisos, salvamentos, efeitosAplicados, atualizacoesHUD };
}

test('Novo Jogo+ no difícil zera XP e pontos, mas preserva skills durante o reinício', async () => {
    const jogo = carregarProximoNivelHard();

    await jogo.window.proximoNivel();

    assert.deepEqual(jogo.avisos, ['FIM DE JOGO! Você completou todos os níveis.']);
    assert.deepEqual(Array.from(jogo.window.playerSkills), ['Dash', 'Visão']);
    assert.equal(jogo.window.playerXP, 0);
    assert.equal(jogo.window.skillPoints, 0);
    assert.ok(jogo.salvamentos.some(salvo =>
        salvo.xp === 0
        && salvo.pontos === 0
        && JSON.stringify(salvo.skills) === JSON.stringify(['Dash', 'Visão'])
    ));
    assert.ok(jogo.efeitosAplicados.length >= 2, 'efeitos devem ser aplicados antes e depois do reinício');
    assert.equal(jogo.atualizacoesHUD.length, 1);
    assert.equal(jogo.controle.temEscudo, true, 'Novo Jogo+ deve iniciar com equipamentos');
});
