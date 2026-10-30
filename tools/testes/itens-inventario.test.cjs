const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');
const codigo = fs.readFileSync(path.join(raiz, 'src/jogador/inventario.js'), 'utf8');

function criarFixture({ capacidade = 2, controleExtra = {}, regras = {} } = {}) {
    const armazenamento = new Map();
    const janela = {
        coleteConfig: {
            capacidade,
            itens: {
                restauracao: { permitidoNoColete: true, consumivel: true, usarSoSePrecisar: true },
                scrap: { permitidoNoColete: true },
                novelo: { permitidoNoColete: true },
                bateria: { permitidoNoColete: true },
                revolver: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
                ...regras
            }
        },
        itemDefinitions: {},
        LAYERS: { ITENS: {} },
        atualizarMochilaUI() {},
        itensColetaveis: []
    };
    const sandbox = {
        console: { warn() {}, error() {}, log() {} },
        window: janela,
        document: { getElementById: () => null, createElement: () => ({ style: {} }) },
        adicionarAoLayer() {},
        localStorage: {
            getItem: chave => armazenamento.get(chave) ?? null,
            setItem: (chave, valor) => armazenamento.set(chave, String(valor)),
            removeItem: chave => armazenamento.delete(chave)
        },
        fetch: async () => ({ ok: false }),
        Date,
        Math,
        Number,
        Set,
        Map
    };
    janela.window = janela;
    vm.createContext(sandbox);
    vm.runInContext(codigo, sandbox, { filename: 'src/jogador/inventario.js' });

    const controle = {
        x: 0, y: 0, largura: 32, altura: 32, direcao: 'd',
        temColete: true, inventario: [], ...controleExtra
    };
    janela.playerControle = controle;
    const sistema = janela.criarSistemaInventarioJogador({ controle, config: {} });
    return { janela, controle, sistema, armazenamento };
}

test('coleta item permitido, registra inventário e preserva slot vazio', () => {
    const { controle, sistema } = criarFixture();
    assert.equal(sistema.tentarColetarItemJogador({ tipo: 'novelo' }), true);
    assert.equal(controle.coleteSlots.length, 2);
    assert.equal(controle.coleteSlots[0].tipo, 'novelo');
    assert.equal(controle.coleteSlots[1], null);
    assert.deepEqual([...controle.inventario], ['novelo']);
});

test('colete respeita capacidade e não coleta item quando todos os slots estão ocupados', () => {
    const { controle, sistema } = criarFixture({ capacidade: 1 });
    assert.equal(sistema.tentarColetarItemJogador({ tipo: 'novelo' }), true);
    assert.equal(sistema.tentarColetarItemJogador({ tipo: 'bateria' }), false);
    assert.equal(controle.coleteSlots.length, 1);
    assert.equal(controle.coleteSlots[0].tipo, 'novelo');
});

test('normalização conserva a ordem dos slots e a posição vazia', () => {
    const { sistema } = criarFixture({
        capacidade: 3,
        controleExtra: { coleteSlots: [{ tipo: 'bateria' }, null, { tipo: 'novelo' }] }
    });
    const slots = sistema.obterSlotsColete();
    assert.equal(slots[0].tipo, 'bateria');
    assert.equal(slots[1], null);
    assert.equal(slots[2].tipo, 'novelo');
});

test('itens do mesmo tipo se empilham até cinco e excedente ocupa slot seguinte', () => {
    const { controle, sistema } = criarFixture({ capacidade: 2 });
    for (let i = 0; i < 10; i++) {
        assert.equal(sistema.tentarColetarItemJogador({ tipo: 'scrap' }), true);
    }
    assert.equal(controle.coleteSlots[0].quantidade, 5);
    assert.equal(controle.coleteSlots[1].quantidade, 5);
    assert.equal(sistema.tentarColetarItemJogador({ tipo: 'scrap' }), false);
});

test('restauração coletada é usada quando o jogador tem dano', () => {
    const { janela, controle, sistema } = criarFixture({ controleExtra: { dano: 2 } });
    assert.equal(typeof janela.aplicarRestauracaoPadrao, 'function');
    assert.equal(sistema.tentarColetarItemJogador({ tipo: 'restauracao' }), true);
    assert.equal(controle.dano, 1);
    assert.equal(controle.coleteSlots[0], null);
});

test('arma coletada é equipada e pode ser desequipada pela mochila', () => {
    const { janela, controle, sistema } = criarFixture({
        regras: { revolver: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true } }
    });
    assert.equal(sistema.tentarColetarItemJogador({ tipo: 'revolver' }), true);
    assert.equal(controle.temArma, true);
    assert.equal(controle.heldWeaponType, 'revolver');
    assert.equal(controle.municao, 5);
    assert.equal(janela.droparItemArrastadoMochila({ area: 'corpo', tipo: 'revolver' }), true);
    assert.equal(controle.temArma, false);
    assert.equal(janela.itensColetaveis.some(item => item.tipo === 'revolver'), true);
});

test('dropar item remove seu slot sem deslocar os itens seguintes', () => {
    const { controle, sistema } = criarFixture({
        controleExtra: { coleteSlots: [{ tipo: 'scrap', quantidade: 2 }, { tipo: 'novelo' }] }
    });
    assert.equal(sistema.droparItemDoColete(0), true);
    assert.equal(controle.coleteSlots[0], null);
    assert.equal(controle.coleteSlots[1].tipo, 'novelo');
});

test('Airdrop Plus é consumido uma unidade por uso e limpa o inventário ao acabar', () => {
    const codigoAcoes = fs.readFileSync(path.join(raiz, 'src/jogador/acoes-especiais.js'), 'utf8');
    const inicio = codigoAcoes.indexOf('        function consumirAirdropPlusArmazenado() {');
    const fim = codigoAcoes.indexOf('\n        function tipoEstaEquipado', inicio);
    assert.notEqual(inicio, -1);
    assert.notEqual(fim, -1);
    const controle = {
        cintoSlot: { tipo: 'airdrop_plus', quantidade: 2 },
        coleteSlots: [{ tipo: 'airdrop_plus', quantidade: 1 }],
        inventario: ['airdrop_plus']
    };
    const janela = { atualizarMochilaUI() {} };
    const contexto = vm.createContext({ controle, window: janela, salvarInventario() {} });
    vm.runInContext(`${codigoAcoes.slice(inicio, fim)}\nglobalThis.consumir = consumirAirdropPlusArmazenado;`, contexto);

    assert.equal(contexto.consumir(), true);
    assert.equal(controle.cintoSlot.quantidade, 1);
    assert.equal(controle.coleteSlots[0].quantidade, 1);
    assert.equal(contexto.consumir(), true);
    assert.equal(controle.cintoSlot, null);
    assert.equal(controle.coleteSlots[0].tipo, 'airdrop_plus');
    assert.equal(contexto.consumir(), true);
    assert.equal(controle.coleteSlots[0], null);
    assert.deepEqual([...controle.inventario], []);
    assert.equal(contexto.consumir(), false);
});
