const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');
const codigoCombate = fs.readFileSync(
    path.join(raiz, 'src/jogador/combate-corpo-a-corpo.js'),
    'utf8'
);

function criarSistemaCombate(opcoes = {}) {
    const chamadasVfx = [];
    const controle = {
        x: 100,
        y: 40,
        largura: 32,
        direcao: 'd',
        cooldownChute: 0,
        tempoChute: 0,
        chutando: false,
        estaAgachado: false,
        ...opcoes.controle
    };
    const window = {
        playerSkills: opcoes.tatsumaki === false ? [] : ['Tatsumaki Senpukyaku'],
        AudioManager: { playSFX() {} },
        TutorialControles: { registrarAcao() {} },
        criarVfxAtaqueForte: (vfx) => chamadasVfx.push({ ...vfx })
    };
    const contexto = vm.createContext({
        window,
        performance: { now: () => 1000 },
        Date,
        Math,
        Number,
        Array,
        console: { log() {}, warn() {}, error() {} }
    });

    vm.runInContext(codigoCombate, contexto, {
        filename: 'src/jogador/combate-corpo-a-corpo.js'
    });

    const acoesAtivas = new Set();
    const sistema = window.criarSistemaCombateCorpoACorpoJogador({
        controle,
        config: {
            tempoChute: 10,
            cooldownChute: 20,
            impulsoChute: 0,
            ATAQUE_OFFSET_X: 5,
            ATAQUE_OFFSET_Y: 4,
            ATAQUE_LARGURA: 20,
            ATAQUE_ALTURA: 12
        },
        acaoAtiva: (acao) => acoesAtivas.has(acao),
        detectarColisaoHitbox: () => false
    });

    return { controle, sistema, acoesAtivas, chamadasVfx };
}

test('Tatsumaki cria um VFX em cada chute usando posição e direção atuais, mesmo sem acertar', () => {
    const { controle, sistema, acoesAtivas, chamadasVfx } = criarSistemaCombate();
    acoesAtivas.add('baixo');
    acoesAtivas.add('chute');

    // Não há inimigos: o VFX deve surgir mesmo assim.
    assert.equal(sistema.processarEntradaChute([]), true);
    assert.equal(chamadasVfx.length, 1);
    assert.equal(chamadasVfx[0].direcao, 'd');
    assert.equal(chamadasVfx[0].x, 139);

    // Move o jogador antes do segundo chute da sequência.
    controle.x = 140;
    for (let quadro = 0; quadro < 3; quadro++) sistema.atualizarTemporizadores();

    assert.equal(chamadasVfx.length, 2);
    assert.equal(chamadasVfx[1].direcao, 'e');
    assert.equal(chamadasVfx[1].x, 133);

    // Move novamente antes do terceiro chute.
    controle.x = 180;
    for (let quadro = 0; quadro < 5; quadro++) sistema.atualizarTemporizadores();

    assert.equal(chamadasVfx.length, 3);
    assert.equal(chamadasVfx[2].direcao, 'd');
    assert.equal(chamadasVfx[2].x, 219);
});

test('a hitbox da Tatsumaki avança 16 px na direção do ataque', () => {
    const { controle, sistema } = criarSistemaCombate({
        controle: { chuteDuploAtivo: true, tempoChute: 5 }
    });

    const hitboxDireita = sistema.obterHitboxAtaque();
    assert.equal(hitboxDireita.x, 105);
    assert.equal(hitboxDireita.largura, 36);

    controle.direcao = 'e';
    const hitboxEsquerda = sistema.obterHitboxAtaque();
    assert.equal(hitboxEsquerda.x, 91);
    assert.equal(hitboxEsquerda.largura, 36);
});

test('chute comum e intervalo sem golpe mantêm a hitbox original', () => {
    const { controle, sistema } = criarSistemaCombate({
        controle: { chuteDuploAtivo: false, tempoChute: 5 }
    });

    assert.equal(sistema.obterHitboxAtaque().largura, 20);

    controle.chuteDuploAtivo = true;
    controle.tempoChute = 0;
    assert.equal(sistema.obterHitboxAtaque().largura, 20);
});
