const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), 'utf8');

function extrairBloco(codigo, marcador) {
    const inicio = codigo.indexOf(marcador);
    assert.notEqual(inicio, -1, `Marcador ausente: ${marcador}`);
    const abre = codigo.indexOf('{', inicio);
    let profundidade = 0;
    let fim = abre;
    for (; fim < codigo.length; fim++) {
        if (codigo[fim] === '{') profundidade++;
        else if (codigo[fim] === '}' && --profundidade === 0) return codigo.slice(inicio, fim + 1);
    }
    assert.fail(`Bloco sem fechamento: ${marcador}`);
}

function contextoComStorage(seed = {}) {
    const dados = new Map(Object.entries(seed));
    const sandbox = {
        console: { debug() {}, warn() {}, error() {}, log() {} },
        localStorage: {
            getItem: key => dados.has(key) ? dados.get(key) : null,
            setItem: (key, value) => dados.set(key, String(value)),
            removeItem: key => dados.delete(key),
            clear: () => dados.clear()
        },
        window: {}
    };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    return { sandbox, dados };
}

test('resgate do cão persiste no localStorage e pode ser resetado', () => {
    const { sandbox, dados } = contextoComStorage();
    sandbox.document = { addEventListener() {} };
    vm.runInContext(ler('src/core/cao.js'), sandbox);
    let iniciados = 0;
    sandbox.window.iniciarCao = () => { iniciados++; };
    sandbox.window.libertarPet('cao', { x: 10, y: 20, elementoGaiola: { remove() {} }, elementoPet: { remove() {} } });
    assert.equal(sandbox.window.isCaoResgatado, true);
    assert.equal(dados.get('plataformaCaoResgatado'), 'true');
    assert.equal(iniciados, 1);
    sandbox.window.resetarResgateCao();
    assert.equal(sandbox.window.isCaoResgatado, false);
    assert.equal(dados.has('plataformaCaoResgatado'), false);
});

test('gaiola libera pet em colisão e não chama novamente após o resgate', () => {
    const removidos = { cage: 0, pet: 0 };
    const { sandbox } = contextoComStorage();
    sandbox.document = {
        createElement: () => ({ style: {}, remove() { if (this.kind === 'cage') removidos.cage++; else removidos.pet++; } }),
        addEventListener() {}
    };
    sandbox.window.LAYERS = { ITENS: 3 };
    sandbox.window.adicionarAoLayer = element => { element.kind = element.src.includes('gaiola') ? 'cage' : 'pet'; };
    sandbox.window.playerControle = { x: 10, y: 10, largura: 32, altura: 32 };
    sandbox.window.isCaoResgatado = false;
    let libertacoes = 0;
    sandbox.window.libertarPet = () => { libertacoes++; sandbox.window.isCaoResgatado = true; };
    sandbox.detectarColisaoHitbox = () => true;
    vm.runInContext(ler('src/core/gaiola.js'), sandbox);
    assert.ok(sandbox.window.criarGaiola({ x: 10, y: 10 }, {}));
    sandbox.window.atualizarGaiola();
    sandbox.window.atualizarGaiola();
    assert.equal(libertacoes, 1);
});

test('habilidade de mordida do cão prende, atordoa e solta o inimigo', () => {
    const { sandbox } = contextoComStorage();
    sandbox.window.detectarColisaoHitbox = () => true;
    sandbox.window.inimigos = [{ x: 20, y: 0, largura: 32, altura: 32, vida: 3 }];
    sandbox.window.AudioManager = { playSFX() {} };
    vm.runInContext(ler('src/core/pet-habilidades.js'), sandbox);
    const pet = { tipo: 'cao', x: 20, y: 0, largura: 32, altura: 32 };
    sandbox.window.PetAbilities.executarHabilidadeAtiva(pet, {});
    assert.equal(pet.inimigoPreso, sandbox.window.inimigos[0]);
    assert.equal(sandbox.window.inimigos[0].stunned, true);
    sandbox.window.PetAbilities.executarHabilidadeAtiva(pet, {});
    assert.equal(pet.inimigoPreso, null);
    assert.equal(sandbox.window.inimigos[0].presoPorPet, false);
});

test('latido do cão ativa a habilidade uma vez por pressionamento de K, V ou X', () => {
    const codigo = ler('src/core/cao.js');
    const inicio = codigo.indexOf('                const kPressionado = teclas');
    const fim = codigo.indexOf('                // --- LÓGICA DE RETORNO', inicio);
    assert.notEqual(inicio, -1);
    assert.notEqual(fim, -1);
    const trecho = codigo.slice(inicio, fim);
    let ativacoes = 0;
    const sandbox = {
        executar(trechoAtual, teclas, pet) {
            const window = { PetAbilities: { executarHabilidadeAtiva() { ativacoes++; } } };
            const config = {};
            vm.runInNewContext(trechoAtual, { teclas, pet, window, config });
        }
    };
    const pet = { tipo: 'cao', latidoPressionadoAnterior: false };
    const teclas = { KeyK: true };
    sandbox.executar(trecho, teclas, pet);
    sandbox.executar(trecho, teclas, pet);
    assert.equal(ativacoes, 1);
    assert.equal(pet.mordendo, true);

    teclas.KeyK = false;
    sandbox.executar(trecho, teclas, pet);
    teclas.KeyV = true;
    sandbox.executar(trecho, teclas, pet);
    assert.equal(ativacoes, 2);
});

test('SaveSlots salva, carrega e limpa dados isolados por slot', () => {
    const { sandbox, dados } = contextoComStorage();
    vm.runInContext(ler('src/core/save-slots.js'), sandbox);
    const slots = sandbox.window.SaveSlots;
    slots.setActiveSlotId('slot2');
    dados.set(slots.getStorageKey('plataformaSkills', 'slot2'), '["SALTO"]');
    assert.equal(slots.getActiveSlotId(), 'slot2');
    assert.equal(slots.isSlotOccupied('slot2'), true);
    assert.equal(slots.isSlotOccupied('slot1'), false);
    assert.equal(slots.clearSlot('slot2'), true);
    assert.equal(slots.isSlotOccupied('slot2'), false);
});

test('controles remapeados no armazenamento prevalecem sobre os padrões', async () => {
    const { sandbox, dados } = contextoComStorage({ plataformaControles: JSON.stringify({ esquerda: ['j'], pulo: ['x'] }) });
    Object.assign(sandbox, {
        fetch: async () => ({ ok: true, json: async () => ({ direita: ['l'] }) }),
        addEventListener() {}, removeEventListener() {}
    });
    sandbox.window.addEventListener = () => {};
    sandbox.window.removeEventListener = () => {};
    vm.runInContext(ler('src/jogador/controles.js'), sandbox);
    const controle = { teclas: {} };
    const sistema = sandbox.window.criarSistemaControlesJogador({ controle });
    await sistema.inicializar();
    assert.equal(sistema.teclaEhAcao('j', 'esquerda'), true);
    assert.equal(sistema.teclaEhAcao('x', 'pulo'), true);
    assert.equal(sistema.teclaEhAcao('l', 'direita'), true);
    assert.equal(sistema.teclaEhAcao('ArrowLeft', 'esquerda'), false);
    sistema.destruir();
});

test('persistência do editor exporta e importa JSON da fase', () => {
    const { sandbox } = contextoComStorage();
    sandbox.alert = () => {};
    sandbox.document = { execCommand() {} };
    let estado = { proporcao: 0.8, posicaoInicialJogador: 'b2', itens: { bateria: ['c3'] } };
    const output = { value: '', select() {} };
    vm.runInContext(ler('tools/editor/editor-persistence.js'), sandbox);
    const persistencia = sandbox.window.criarPersistenciaEditor({
        output,
        getFaseData: () => estado,
        setFaseData: novoEstado => { estado = novoEstado; }
    });
    const json = persistencia.exportarJSON();
    assert.equal(JSON.parse(json).posicaoInicialJogador, 'b2');
    const resultado = persistencia.carregarJSONTexto('{"proporcao":0.6,"objetivo":"f8","itens":{}}', { mostrarMensagem: false });
    assert.equal(resultado.proporcao, 0.6);
    assert.equal(estado.objetivo, 'f8');
    assert.equal(JSON.parse(output.value).objetivo, 'f8');
});

test('editor salva rascunho local quando o servidor de arquivos está indisponível', async () => {
    const { sandbox, dados } = contextoComStorage();
    sandbox.window.EDITOR_SAVE_SERVER_URL = 'http://editor.test';
    sandbox.window.EditorConfig = { COORD_ARRAY_KEYS: [] };
    sandbox.window.EditorUtils = {
        normalizeFaseData: data => JSON.parse(JSON.stringify(data)),
        exportarItensData: items => items,
        limparCamposVazios: data => data
    };
    sandbox.fetch = async () => ({ ok: false, status: 404 });
    vm.runInContext(ler('tools/editor/editor-export.js'), sandbox);
    const output = { value: '' };
    const exportador = sandbox.window.criarExportadorEditor({
        output,
        getFaseData: () => ({ objetivo: 'f12', itens: {} })
    });
    exportador.definirArquivoFaseAtual('fases/fase12.json');
    const resultado = await exportador.salvarAutomaticamenteAgora();
    assert.equal(resultado.mode, 'local-draft');
    assert.equal(JSON.parse(dados.get('editor-fase-autosave:fases/fase12.json')).objetivo, 'f12');
});

test('editor salva fase no servidor local quando ele responde disponível', async () => {
    const { sandbox } = contextoComStorage();
    sandbox.window.EDITOR_SAVE_SERVER_URL = 'http://editor.test';
    sandbox.window.EditorConfig = { COORD_ARRAY_KEYS: [] };
    sandbox.window.EditorUtils = {
        normalizeFaseData: data => JSON.parse(JSON.stringify(data)),
        exportarItensData: items => items,
        limparCamposVazios: data => data
    };
    const requisicoes = [];
    sandbox.fetch = async (url, opcoes = {}) => {
        requisicoes.push({ url, opcoes });
        return { ok: true };
    };
    vm.runInContext(ler('tools/editor/editor-export.js'), sandbox);
    const output = { value: '' };
    const exportador = sandbox.window.criarExportadorEditor({
        output,
        getFaseData: () => ({ objetivo: 'f20', itens: {} })
    });
    exportador.definirArquivoFaseAtual('fases/fase20.json');
    const resultado = await exportador.salvarAutomaticamenteAgora();
    assert.equal(resultado.mode, 'server');
    assert.equal(requisicoes.length, 2);
    assert.ok(requisicoes[0].url.endsWith('/__editor-save-status'));
    assert.ok(requisicoes[1].url.endsWith('/save-phase'));
    assert.equal(JSON.parse(requisicoes[1].opcoes.body).fileName, 'fases/fase20.json');
    assert.equal(JSON.parse(requisicoes[1].opcoes.body).content.includes('f20'), true);
});

test('editor adiciona bloco uma vez por coordenada e remove o bloco selecionado', () => {
    const codigo = ler('tools/editor/editor.js');
    const adicionar = extrairBloco(codigo, 'function adicionarElemento(coord) {');
    const remover = extrairBloco(codigo, 'function removerElemento(coord) {');
    const faseData = { plataformas: [], itens: {} };
    const sandbox = {
        window: {
            EditorConfig: {
                COORD_ARRAY_KEYS: ['plataformas'],
                PLATFORM_DEFS: [],
                SYSTEM_DEFS: [],
                getDefinitionByType: tipo => tipo === 'plataforma'
                    ? { type: 'plataforma', kind: 'multiple', stateKey: 'plataformas' }
                    : null
            }
        },
        faseData,
        itemSelecionado: 'plataforma',
        chefeRascunhoPosicionamento: null,
        inimigoComplexoRascunhoPosicionamento: null,
        obterChefePorCoord: () => null,
        obterInimigoComplexoPorCoord: () => null,
        removerChefePorCoord() {},
        removerInimigoComplexoPorCoord() {},
        aplicarFaseDataEditor() {},
        sortCoords: (a, b) => a.localeCompare(b),
        console: { log() {} }
    };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(`${adicionar}\n${remover}\nglobalThis.adicionarElemento = adicionarElemento; globalThis.removerElemento = removerElemento;`, sandbox);

    sandbox.adicionarElemento('b2');
    sandbox.adicionarElemento('b2');
    assert.equal(faseData.plataformas.length, 1);
    assert.equal(faseData.plataformas[0].coord, 'b2');

    sandbox.removerElemento('b2');
    assert.deepEqual([...faseData.plataformas], []);
});

test('configurações do jogo são JSON válido com valores padrão', () => {
    const config = JSON.parse(ler('config/configuracoes.json'));
    assert.equal(typeof config.tempoChute, 'number');
    assert.equal(typeof config.cooldownChute, 'number');
    assert.ok(config.forcaPuloPlayer > 0 || config.forcaGravidade?.forcaPulo > 0);
});

test('menu de pausa alterna overlay e pausa usando o ciclo de estado do jogo', () => {
    const codigo = ler('src/ui/menu.js');
    const bloco = extrairBloco(codigo, 'window.togglePauseMenu = () => {');
    const chamadasPausa = [];
    const eventos = [];
    const sandbox = {
        window: {
            isMenuOpen: false,
            isSkillMenuOpen: false,
            isMochilaMenuOpen: false,
            setPausado: (pausado, dono) => chamadasPausa.push([pausado, dono]),
            addEventListener: (...args) => eventos.push(['add', ...args]),
            removeEventListener: (...args) => eventos.push(['remove', ...args]),
            TutorialControles: { sincronizarVisibilidade() {} },
            SaveSlots: { getActiveSlotId: () => 'slot1' }
        },
        menuMode: 'main', menuSelectedIndex: 0, menuSelectedSlotId: 'slot1',
        controlsSelectedIndex: 0, controlsBindingAction: null,
        renderMenuUI() {}, removeMenuUI() {}, handleMenuInput() {}
    };
    sandbox.window.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(`${bloco};`, sandbox);
    sandbox.window.togglePauseMenu();
    assert.equal(sandbox.window.isMenuOpen, true);
    sandbox.window.togglePauseMenu();
    assert.equal(sandbox.window.isMenuOpen, false);
    assert.deepEqual(chamadasPausa.map(item => [...item]), [[true, 'pause'], [false, 'pause']]);
    assert.equal(eventos.length, 2);
});

test('colisão entre hitboxes detecta sobreposição e rejeita objetos separados', () => {
    const codigo = ler('src/core/colisoes.js');
    const bloco = extrairBloco(codigo, 'function detectarColisaoHitbox(');
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(`${bloco}; this.detectarColisaoHitbox = detectarColisaoHitbox;`, sandbox);
    const jogador = { x: 0, y: 0, largura: 32, altura: 32 };
    assert.equal(sandbox.detectarColisaoHitbox(jogador, { x: 20, y: 0, largura: 32, altura: 32 }, 0, 0, 0), true);
    assert.equal(sandbox.detectarColisaoHitbox(jogador, { x: 80, y: 0, largura: 32, altura: 32 }, 0, 0, 0), false);
});
