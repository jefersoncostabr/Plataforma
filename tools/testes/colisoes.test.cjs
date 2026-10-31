const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');
const codigo = fs.readFileSync(path.join(raiz, 'src/core/colisoes.js'), 'utf8');

function criarContexto(extras = {}) {
    const sandbox = {
        window: {
            itensColetaveis: [],
            robosAbertosData: [],
            playerControle: null,
            mundoLargura: 640,
            mundoAltura: 480,
            ...extras
        },
        Math, Number, Array, String, Boolean, Object,
        console: { warn() {}, error() {}, log() {} }
    };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(codigo, sandbox);
    return sandbox.window;
}

test('detectarColisaoHitbox retorna true quando hitboxes se sobrepõem', () => {
    const janela = criarContexto();

    const a = { x: 0, y: 0, largura: 32, altura: 32 };
    const b = { x: 16, y: 16, largura: 32, altura: 32 };

    // Com padding padrão de 4px: a.esquerda=4, a.direita=28, a.topo=28, a.base=4
    // b.esquerda=20, b.direita=44, b.topo=44, b.base=20
    // Sobreposição: a.esquerda(4) < b.direita(44) ✓, a.direita(28) > b.esquerda(20) ✓
    // a.topo(28) > b.base(20) ✓, a.base(4) < b.topo(44) ✓
    const resultado = janela.detectarColisaoHitbox(a, b);
    assert.equal(resultado, true, 'Hitboxes sobrepostas devem retornar true');
});

test('detectarColisaoHitbox retorna false quando hitboxes não se tocam', () => {
    const janela = criarContexto();

    const a = { x: 0, y: 0, largura: 32, altura: 32 };
    // Objeto b bem afastado à direita
    const b = { x: 200, y: 200, largura: 32, altura: 32 };

    const resultado = janela.detectarColisaoHitbox(a, b);
    assert.equal(resultado, false, 'Hitboxes afastadas devem retornar false');
});

test('verificarAreaTotalmenteLivre retorna true para área sem tiles e false com obstáculo', () => {
    // verificarAreaTotalmenteLivre usa window.plataformas internamente,
    // mas é exposta em window e podemos testá-la com contexto customizado.

    const janela = criarContexto({
        mundoLargura: 640,
        mundoAltura: 480,
        plataformas: {}, // sem tiles
        inimigos: [],
        itensColetaveis: [],
        craftsAtivos: []
    });

    // Área totalmente livre (sem plataformas, inimigos ou itens)
    const livre = janela.verificarAreaTotalmenteLivre(100, 100, 32, 32);
    assert.equal(livre, true, 'Área sem obstáculos deve estar livre');

    // Adicionar plataforma sólida no tile correspondente à posição (0, 32)
    // linha b (index 1), coluna 1 -> coord 'b1'
    janela.plataformas = { 'b1': true };
    const ocupado = janela.verificarAreaTotalmenteLivre(0, 32, 32, 32);
    assert.equal(ocupado, false, 'Área com plataforma sólida não deve estar livre');
});
