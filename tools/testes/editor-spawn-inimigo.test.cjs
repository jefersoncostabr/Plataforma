const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');
function ler(caminho) { return fs.readFileSync(path.join(raiz, caminho), 'utf8'); }

function carregarEditorDados() {
    const janela = {
        location: { origin: 'http://127.0.0.1:3210' },
        setTimeout, clearTimeout
    };
    const contexto = vm.createContext({
        window: janela,
        document: { execCommand: () => true },
        navigator: { clipboard: { writeText: async () => {} } },
        console
    });
    for (const arquivo of [
        'tools/editor/editor-config.js',
        'tools/editor/editor-utils.js',
        'tools/editor/editor-export.js'
    ]) {
        vm.runInContext(ler(arquivo), contexto, { filename: arquivo });
    }
    return janela;
}

test('fase vazia tem posicaoInicialJogador como string não vazia (padrão b2)', () => {
    const janela = carregarEditorDados();
    const fase = janela.EditorConfig.createEmptyFaseData();
    // createEmptyFaseData define posicaoInicialJogador como 'b2' por padrão
    assert.ok(typeof fase.posicaoInicialJogador === 'string', 'posicaoInicialJogador deve ser string');
    // O padrão não é string vazia, mas 'b2'. Verificamos que é uma string definida.
    assert.equal(fase.posicaoInicialJogador, 'b2', 'posicaoInicialJogador padrão deve ser "b2"');
});

test('normalizeFaseData preserva posicaoInicialJogador definido', () => {
    const janela = carregarEditorDados();
    const resultado = janela.EditorUtils.normalizeFaseData({ posicaoInicialJogador: 'c5' });
    assert.equal(resultado.posicaoInicialJogador, 'c5', 'normalizeFaseData deve preservar posicaoInicialJogador definido');
});

test('ENEMY_DEFS inclui inimigo melee e atirador', () => {
    const janela = carregarEditorDados();
    const defs = janela.EditorConfig.ENEMY_DEFS;

    assert.ok(Array.isArray(defs), 'ENEMY_DEFS deve ser um array');

    const inimigoMelee = defs.find(d => d.type === 'inimigo_comum');
    assert.ok(inimigoMelee, 'ENEMY_DEFS deve conter inimigo_comum (melee)');

    const inimigoAtirador = defs.find(d => d.type === 'inimigo_revolver');
    assert.ok(inimigoAtirador, 'ENEMY_DEFS deve conter inimigo_revolver (atirador)');
});

test('fase vazia tem arrays de inimigos comuns e atiradores vazios', () => {
    const janela = carregarEditorDados();
    const fase = janela.EditorConfig.createEmptyFaseData();

    // createEmptyFaseData não inicializa arrays de inimigos explicitamente
    // Após normalizeFaseData, chaves com arrays vazios são removidas
    const faseNormalizada = janela.EditorUtils.normalizeFaseData(fase);

    // Os arrays de inimigos não existem ou são arrays vazios/ausentes na fase normalizada
    const inimigoComum = faseNormalizada.inimigo_comum;
    const inimigoRevolver = faseNormalizada.inimigo_revolver;

    assert.ok(
        inimigoComum === undefined || (Array.isArray(inimigoComum) && inimigoComum.length === 0),
        'inimigo_comum deve ser undefined ou array vazio na fase vazia'
    );
    assert.ok(
        inimigoRevolver === undefined || (Array.isArray(inimigoRevolver) && inimigoRevolver.length === 0),
        'inimigo_revolver deve ser undefined ou array vazio na fase vazia'
    );
});
