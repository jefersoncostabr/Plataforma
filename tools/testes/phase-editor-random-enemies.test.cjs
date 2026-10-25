const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');

function ler(caminho) {
    return fs.readFileSync(path.join(raiz, caminho), 'utf8');
}

function carregarEditorDados() {
    const window = {
        location: { origin: 'http://127.0.0.1:3210' },
        setTimeout,
        clearTimeout
    };
    const contexto = vm.createContext({
        window,
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

    return window;
}

test('o editor fornece estado inicial e definição de Ninja para fases', () => {
    const window = carregarEditorDados();
    const fase = window.EditorConfig.createEmptyFaseData();
    const definicaoNinja = window.EditorConfig.ENEMY_DEFS.find((def) => def.type === 'ninja');

    assert.deepEqual(Array.from(fase.ninjaAleatorio), [0]);
    assert.ok(definicaoNinja, 'Ninja deve estar disponível como inimigo posicionável no editor');
    assert.equal(definicaoNinja.stateKey, 'ninja');
});

test('exportação preserva configuração independente de inimigos aleatórios', async () => {
    const window = carregarEditorDados();
    const fase = window.EditorConfig.createEmptyFaseData({
        inimigoAleatorio: [3, 8],
        humanoAleatorio: [2],
        cabecaoAleatorio: [1],
        ninjaAleatorio: [3]
    });
    const output = { value: '' };
    const exportador = window.criarExportadorEditor({
        output,
        getFaseData: () => fase,
        getRandomConfig: () => ({
            enabled: true,
            diff: 2,
            type: 6,
            humanoEnabled: true,
            humanoDiff: 1,
            cabecaoEnabled: false,
            cabecaoDiff: 2,
            ninjaEnabled: true,
            ninjaDiff: 3
        })
    });

    const texto = await exportador.exportarJSON({ copiar: false, mostrarMensagem: false });
    const faseExportada = JSON.parse(texto);

    assert.deepEqual(faseExportada.inimigoAleatorio, [2, 6]);
    assert.deepEqual(faseExportada.humanoAleatorio, [1]);
    assert.deepEqual(faseExportada.cabecaoAleatorio, [0]);
    assert.deepEqual(faseExportada.ninjaAleatorio, [3]);
});

test('o controle separado de Ninja é ligado à fase e ao spawn do jogo', () => {
    const ui = ler('tools/editor/editor-ui.js');
    const editor = ler('tools/editor/editor.js');
    const runtime = ler('src/core/inicial.js');

    assert.match(ui, /id="spawn-ninja"> Ninja aleatório/);
    assert.match(ui, /id="ninja-freq"/);
    assert.match(ui, /getFaseData\(\)\.ninjaAleatorio = e\.target\.checked \? \[freq\] : \[0\]/);
    assert.match(editor, /ninjaEnabled: document\.getElementById\('spawn-ninja'\)/);
    assert.match(editor, /ninjaCheckAtual\.checked = Array\.isArray\(estado\.ninjaAleatorio\)/);
    assert.match(runtime, /Array\.isArray\(fase\.ninjaAleatorio\).*Number\(fase\.ninjaAleatorio\[0\]\) > 0/);
    assert.match(runtime, /criarInimigoAleatorio\(todasAsPlataformas, 15\)/);
});

test('o Ninja aleatório não fica listado como equipamento', () => {
    const html = ler('tools/editor/editor.html');
    const seletor = html.match(/<select id="random-type">([\s\S]*?)<\/select>/);

    assert.ok(seletor, 'Seletor de equipamento aleatório não encontrado');
    assert.doesNotMatch(seletor[1], /Ninja|value="15"/);
});
