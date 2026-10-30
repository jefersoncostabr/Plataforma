const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), 'utf8');

function executar(codigo, sandbox = {}) {
    sandbox.window ||= sandbox;
    vm.createContext(sandbox);
    vm.runInContext(codigo, sandbox);
    return sandbox;
}

test('controles reconhecem movimento e soltar a tecla', async () => {
    const janela = executar(ler('src/jogador/controles.js'), {
        localStorage: { getItem: () => null },
        fetch: async () => ({ ok: false }),
        addEventListener() {},
        removeEventListener() {}
    });
    const controle = { teclas: {} };
    const sistema = janela.criarSistemaControlesJogador({ controle });
    await sistema.inicializar();
    janela.__playerControlsHandlers.keydown({ code: 'ArrowRight', key: 'ArrowRight', repeat: false });
    assert.equal(sistema.acaoAtiva('direita'), true);
    janela.__playerControlsHandlers.keyup({ code: 'ArrowRight', key: 'ArrowRight' });
    assert.equal(sistema.acaoAtiva('direita'), false);
    sistema.destruir();
});

test('desaceleração no ar reduz a velocidade horizontal', () => {
    const janela = executar(ler('src/core/desaceleracao-horizontal.js'));
    const jogador = { x: 0, noChao: false, velocidadeHorizontalAtual: 1 };
    janela.aplicarDesaceleracaoHorizontal(jogador, {
        desaceleracaoAr: 0.18,
        limiteVelocidadeMinimaHorizontal: 0.1
    });
    assert.ok(Math.abs(jogador.velocidadeHorizontalAtual - 0.82) < 1e-10);
    assert.ok(Math.abs(jogador.x - 0.82) < 1e-10);
});

function criarCombate(opcoes = {}) {
    const janela = executar(ler('src/jogador/combate-corpo-a-corpo.js'));
    janela.AudioManager = { playSFX() {} };
    janela.obterForcaKnockback = () => 0;
    janela.aplicarKnockback = () => {};
    janela.prepararMorteInimigo = inimigo => { inimigo.estaMorto = true; };
    const controle = {
        x: 100, y: 50, largura: 32, direcao: 'd', danoChute: 1,
        chutando: false, cooldownChute: 0
    };
    const config = {
        cooldownChute: 5, tempoChute: 4, ATAQUE_OFFSET_X: 32,
        ATAQUE_OFFSET_Y: 0, ATAQUE_LARGURA: 20, ATAQUE_ALTURA: 16,
        inimigoVidaMax: 2
    };
    const sistema = janela.criarSistemaCombateCorpoACorpoJogador({
        controle, config, detectarColisaoHitbox: opcoes.colide || (() => true), ...opcoes
    });
    return { janela, controle, sistema };
}

test('ataque aplica cooldown e o temporizador o reduz', () => {
    const { controle, sistema } = criarCombate({ acaoAtiva: acao => acao === 'chute' });
    sistema.processarEntradaChute([]);
    assert.equal(controle.cooldownChute, 5);
    sistema.processarEntradaChute([]);
    assert.equal(controle.cooldownChute, 5);
    sistema.atualizarTemporizadores();
    assert.equal(controle.cooldownChute, 4);
});

test('hitbox do ataque respeita alcance e direção', () => {
    const { controle, sistema } = criarCombate();
    assert.deepEqual({ ...sistema.obterHitboxAtaque() }, { x: 132, y: 50, largura: 20, altura: 16 });
    controle.direcao = 'e';
    assert.equal(sistema.obterHitboxAtaque().x, 80);
});

test('golpe causa dano uma vez por inimigo e pode derrotá-lo', () => {
    const { controle, sistema } = criarCombate();
    controle.chutando = true;
    const inimigo = { x: 140, y: 50, largura: 32, altura: 32, vida: 1 };
    assert.equal(sistema.processarAcertoChuteEmInimigo(inimigo), true);
    assert.equal(inimigo.vida, 2);
    assert.equal(inimigo.estaMorto, true);
    assert.equal(sistema.processarAcertoChuteEmInimigo(inimigo), false);
    assert.equal(inimigo.vida, 2);
});

test('colisão ausente impede dano do golpe', () => {
    const { controle, sistema } = criarCombate({ colide: () => false });
    controle.chutando = true;
    const inimigo = { x: 140, y: 50, largura: 32, altura: 32, vida: 0 };
    assert.equal(sistema.processarAcertoChuteEmInimigo(inimigo), false);
    assert.equal(inimigo.vida, 0);
});

test('pulo simples aplica força e registra o primeiro salto', () => {
    const codigo = ler('src/jogador/movimento.js');
    const inicio = codigo.indexOf('        if (podePuloInicial) {', codigo.indexOf('const teclaPuloAtiva'));
    const fim = codigo.indexOf('        // Processa o rastro de sombras do Super Pulo', inicio);
    assert.notEqual(inicio, -1);
    assert.notEqual(fim, -1);
    const trecho = codigo.slice(inicio, fim);
    const controle = {
        doubleJumpUsedInAir: false, cooldownPulo: 0, noChao: true,
        pulosRealizados: 0, velocidadeY: 0, coyoteFramesRestantes: 0,
        jumpBufferFramesRestantes: 1
    };
    const sandbox = {
        controle, config: { janelaPuloDuplo: 12 }, forcaPuloFinal: 10,
        podePuloInicial: true, deveConsumirPuloInicial: true,
        podeSaltitar: false, saltitarAtivo: false,
        puloAcabouDeSerPressionado: true,
        window: {
            AudioManager: { playSFX() {} },
            TutorialControles: { registrarAcao() {} },
            temSkill: () => false,
            SKILLS: {}
        },
        Math, Number
    };
    vm.runInNewContext(trecho, sandbox);
    assert.equal(controle.pulosRealizados, 1);
    assert.equal(controle.velocidadeY, 10);
    assert.equal(controle.noChao, false);
});

test('pulo duplo requer skill e aplica multiplicador configurado', () => {
    const codigo = ler('src/jogador/movimento.js');
    const inicio = codigo.indexOf('        if (podePuloInicial) {', codigo.indexOf('const teclaPuloAtiva'));
    const fim = codigo.indexOf('        // Processa o rastro de sombras do Super Pulo', inicio);
    const trecho = codigo.slice(inicio, fim);
    const controle = {
        doubleJumpUsedInAir: false, cooldownPulo: 0, noChao: false,
        pulosRealizados: 1, velocidadeY: 0, coyoteFramesRestantes: 0,
        jumpBufferFramesRestantes: 0, timerPuloDuplo: 8, cooldownPuloDuplo: 0
    };
    const sandbox = {
        controle, config: { multiplicadorPuloDuplo: 1.25 }, forcaPuloFinal: 10,
        podePuloInicial: false, deveConsumirPuloInicial: false,
        podeSaltitar: false, saltitarAtivo: false,
        puloAcabouDeSerPressionado: true,
        window: {
            AudioManager: { playSFX() {} },
            TutorialControles: { registrarAcao() {} },
            temSkill: () => true,
            SKILLS: { SALTO: 'salto' }
        },
        Math, Number
    };
    vm.runInNewContext(trecho, sandbox);
    assert.equal(controle.pulosRealizados, 2);
    assert.equal(controle.velocidadeY, 12.5);
    assert.equal(controle.doubleJumpUsedInAir, true);
});

test('estaca reduz vida, bloqueia dano repetido durante cooldown e permite morte', () => {
    const janela = executar(ler('src/jogador/dano-estacas.js'));
    let mortes = 0;
    janela.prepararMorteJogador = () => { mortes++; };
    const controle = { x: 0, y: 0, largura: 32, altura: 32, dano: 0, maxVida: 2 };
    const sistema = janela.criarSistemaDanoEstacasJogador({
        controle, config: { cooldownDanoEspinho: 24, danoEspinho: 1 }, elemento: {}
    });
    const colisao = { tipo: 'estaca', direcao: 'cima' };
    sistema.aplicarDanoEspinho(colisao);
    assert.equal(controle.dano, 1);
    sistema.aplicarDanoEspinho(colisao);
    assert.equal(controle.dano, 1);
    controle.cooldownDanoEspinho = 0;
    sistema.aplicarDanoEspinho(colisao);
    assert.equal(controle.dano, 2);
    assert.equal(mortes, 1);
});

test('item de restauração reduz o dano acumulado sem ficar abaixo de zero', () => {
    const codigo = ler('src/jogador/inventario.js');
    const inicio = codigo.indexOf('function aplicarRestauracaoPadrao(');
    assert.notEqual(inicio, -1);
    const abre = codigo.indexOf(') {', inicio) + 2;
    let profundidade = 0;
    let fim = abre;
    for (; fim < codigo.length; fim++) {
        if (codigo[fim] === '{') profundidade++;
        if (codigo[fim] === '}' && --profundidade === 0) { fim++; break; }
    }
    const funcao = codigo.slice(inicio, fim);
    const sandbox = { document: { getElementById: () => null } };
    vm.createContext(sandbox);
    vm.runInContext(`this.aplicarRestauracaoPadrao = ${funcao}`, sandbox);
    const jogador = { dano: 2 };
    sandbox.aplicarRestauracaoPadrao(jogador);
    assert.equal(jogador.dano, 1);
    const semDano = { dano: 0 };
    sandbox.aplicarRestauracaoPadrao(semDano);
    assert.equal(semDano.dano, 0);
});

test('snap de colisão horizontal posiciona o jogador junto à parede', () => {
    const codigo = ler('src/core/colisoes.js');
    const inicio = codigo.indexOf('function aplicarSnapColisao(');
    const fim = codigo.indexOf('\n}', inicio) + 2;
    assert.notEqual(inicio, -1);
    const sandbox = { EPSILON: 0.01, Math };
    vm.createContext(sandbox);
    vm.runInContext(`${codigo.slice(inicio, fim)}; this.aplicarSnapColisao = aplicarSnapColisao;`, sandbox);
    assert.equal(sandbox.aplicarSnapColisao(42, 0, 32, {}, 'direita'), 31.99);
});
