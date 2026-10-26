const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');
const codigoInicial = fs.readFileSync(path.join(raiz, 'src/core/inicial.js'), 'utf8');
const inicioFuncao = codigoInicial.indexOf('window.proximoNivel = async function() {');
const fimFuncao = codigoInicial.indexOf('\nwindow.reiniciarJogo = async function', inicioFuncao);

assert.notEqual(inicioFuncao, -1, 'Não foi encontrada a função proximoNivel');
assert.notEqual(fimFuncao, -1, 'Não foi encontrado o fim da função proximoNivel');

const codigoProximoNivel = codigoInicial.slice(inicioFuncao, fimFuncao);

function criarFaseBonus(opcoes = {}) {
    const estadoInicial = {
        dano: 1,
        maxVida: 4,
        temEscudo: true,
        escudoVermelho: false,
        escudoProtegido: 1,
        temArma: true,
        municao: 4,
        heldWeaponType: 'revolver',
        inventario: ['escudo', 'revolver']
    };
    const controle = { ...estadoInicial };
    const temporizadores = [];
    let callbackIntervalo;
    const chamadasXP = [];
    const chamadasSalvar = [];
    const chamadasFase = [];
    const chamadasVisualEscudo = [];
    const chamadasHUD = [];
    const armaElemento = { style: {} };
    let resolverAnimacaoXP = null;

    const dataFase = {
        faseBonus: true,
        qualBonus: 0,
        nivelBonus: 'a',
        bonusXPPremiado: false
    };

    const window = {
        faseAtualData: dataFase,
        faseAtualPathRelativo: 'fases/nivel_1.json',
        faseAtualNome: 'nivel_1',
        nivelAtual: 0,
        niveis: ['nivel_1', 'nivel_2'],
        gameDifficulty: opcoes.dificuldade || 'normal',
        playerControle: controle,
        ativarModoRunner(ativar) {
            window.faseAtualData = ativar ? { modoRunner: true } : { modoRunner: false };
        },
        TutorialControles: { mostrarMensagem() {} },
        ganharXP(quantidade) {
            chamadasXP.push(quantidade);
            return new Promise(resolve => {
                resolverAnimacaoXP = resolve;
            });
        },
        atualizarVisualEscudo() {
            chamadasVisualEscudo.push(true);
        },
        atualizarHUD() {
            chamadasHUD.push(true);
        },
        salvarInventarioDoControle(jogador) {
            chamadasSalvar.push({ dano: jogador.dano, escudoProtegido: jogador.escudoProtegido, municao: jogador.municao });
        }
    };

    const contexto = vm.createContext({
        window,
        document: { getElementById: id => id === 'player-weapon' ? armaElemento : null },
        obterIndiceFasePorNome: () => 0,
        carregarFase: async nome => chamadasFase.push(nome),
        alert() {},
        setInterval(callback) {
            callbackIntervalo = callback;
            return 101;
        },
        clearInterval() {},
        setTimeout(callback, ms) {
            temporizadores.push({ callback, ms });
            return temporizadores.length;
        }
    });

    vm.runInContext(codigoProximoNivel, contexto, { filename: 'src/core/inicial.js' });

    return {
        window,
        controle,
        estadoInicial,
        dataFase,
        temporizadores,
        chamadasXP,
        chamadasSalvar,
        chamadasFase,
        chamadasVisualEscudo,
        chamadasHUD,
        armaElemento,
        get callbackIntervalo() { return callbackIntervalo; },
        resolverAnimacaoXP,
        resolverXP() { resolverAnimacaoXP?.(); },
        concluirRunner() {
            for (let quadro = 0; quadro < 200; quadro++) callbackIntervalo();
        }
    };
}

async function liberarMicrotarefas() {
    for (let i = 0; i < 8; i++) await Promise.resolve();
}

for (const [dificuldade, xpEsperado] of [['easy', 4], ['normal', 8], ['hard', 12]]) {
    test(`concluir fase bônus na dificuldade ${dificuldade} concede ${xpEsperado} XP`, async () => {
        const fase = criarFaseBonus({ dificuldade });
        const transicao = fase.window.proximoNivel();

        // Simula consumo de recursos durante os 20 segundos do Runner.
        fase.controle.dano = 3;
        fase.controle.escudoVermelho = true;
        fase.controle.escudoProtegido = 3;
        fase.controle.municao = 0;

        fase.concluirRunner();
        await liberarMicrotarefas();

        assert.deepEqual(fase.chamadasXP, [xpEsperado]);
        assert.equal(fase.dataFase.bonusXPPremiado, true);
        assert.deepEqual(fase.temporizadores.map(timer => timer.ms), [1000]);
        assert.equal(fase.chamadasFase.length, 0, 'não deve avançar antes da animação de XP');

        fase.temporizadores[0].callback();
        await liberarMicrotarefas();
        assert.equal(fase.chamadasFase.length, 0, 'deve aguardar a animação terminar');

        fase.resolverXP();
        await transicao;

        assert.equal(fase.controle.dano, fase.estadoInicial.dano, 'vida deve voltar ao estado anterior ao bônus');
        assert.equal(fase.controle.temEscudo, fase.estadoInicial.temEscudo);
        assert.equal(fase.controle.escudoVermelho, fase.estadoInicial.escudoVermelho);
        assert.equal(fase.controle.escudoProtegido, fase.estadoInicial.escudoProtegido);
        assert.equal(fase.controle.municao, fase.estadoInicial.municao, 'munição usada deve ser devolvida');
        assert.equal(fase.controle.heldWeaponType, fase.estadoInicial.heldWeaponType);
        assert.equal(fase.armaElemento.style.filter, 'none');
        assert.equal(fase.chamadasVisualEscudo.length, 1);
        assert.equal(fase.chamadasHUD.length, 1);
        assert.ok(fase.chamadasSalvar.some(salvo => salvo.dano === 1 && salvo.escudoProtegido === 1 && salvo.municao === 4));
        assert.deepEqual(fase.chamadasFase, ['nivel_2']);
    });
}

test('morrer no bônus restaura os recursos, avança a fase e não concede XP', async () => {
    const fase = criarFaseBonus({ dificuldade: 'hard' });
    const transicao = fase.window.proximoNivel();

    fase.controle.dano = 4;
    fase.controle.estaMorrendo = true;
    fase.controle.framesMorrendo = 35;
    fase.controle.velocidadeY = 10;
    fase.controle.velocidadeKnockback = -5;
    fase.controle.framesKnockbackRestante = 8;
    fase.controle.escudoVermelho = true;
    fase.controle.escudoProtegido = 3;
    fase.controle.municao = 0;

    fase.callbackIntervalo();
    await liberarMicrotarefas();

    assert.deepEqual(fase.chamadasXP, []);
    assert.equal(fase.dataFase.bonusXPPremiado, false);
    assert.deepEqual(fase.temporizadores.map(timer => timer.ms), [1000]);
    assert.deepEqual(fase.chamadasFase, [], 'não deve avançar antes de completar 1 segundo');

    fase.temporizadores[0].callback();
    await transicao;

    assert.equal(fase.controle.dano, fase.estadoInicial.dano);
    assert.equal(fase.controle.estaMorrendo, false);
    assert.equal(fase.controle.framesMorrendo, 0);
    assert.equal(fase.controle.velocidadeY, 0);
    assert.equal(fase.controle.velocidadeKnockback, 0);
    assert.equal(fase.controle.framesKnockbackRestante, 0);
    assert.equal(fase.controle.temEscudo, fase.estadoInicial.temEscudo);
    assert.equal(fase.controle.escudoVermelho, fase.estadoInicial.escudoVermelho);
    assert.equal(fase.controle.escudoProtegido, fase.estadoInicial.escudoProtegido);
    assert.equal(fase.controle.temArma, fase.estadoInicial.temArma);
    assert.equal(fase.controle.municao, fase.estadoInicial.municao);
    assert.equal(fase.controle.heldWeaponType, fase.estadoInicial.heldWeaponType);
    assert.equal(fase.chamadasVisualEscudo.length, 1);
    assert.equal(fase.chamadasHUD.length, 1);
    assert.ok(fase.chamadasSalvar.some(salvo => salvo.dano === 1 && salvo.escudoProtegido === 1 && salvo.municao === 4));
    assert.deepEqual(fase.chamadasFase, ['nivel_2']);
});
