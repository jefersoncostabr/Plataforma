const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');

function extrairFuncao(codigo, inicioTexto, fimTexto, nome) {
    const inicio = codigo.indexOf(inicioTexto);
    assert.notEqual(inicio, -1, `Não foi encontrada a função ${nome}`);

    const fim = codigo.indexOf(fimTexto, inicio);
    assert.notEqual(fim, -1, `Não foi encontrado o fim da função ${nome}`);
    return codigo.slice(inicio, fim).trim();
}

function carregarCriarEntradaColete() {
    const codigo = fs.readFileSync(path.join(raiz, 'src/jogador/inventario.js'), 'utf8');
    const funcao = extrairFuncao(
        codigo,
        '    function criarEntradaColete(item = {}, itemData = null) {',
        '\n    function criarSistemaInventarioJogador',
        'criarEntradaColete'
    );
    const contexto = vm.createContext({
        obterRegraColete: () => ({}),
        obterNomeCanonicoItem: (tipo, itemData, nome) => nome || itemData?.nome || tipo
    });

    vm.runInContext(`${funcao}\nglobalThis.criarEntradaColete = criarEntradaColete;`, contexto);
    return contexto.criarEntradaColete;
}

function carregarPrepararDadosArmaColetada() {
    const codigo = fs.readFileSync(path.join(raiz, 'src/jogador/inventario.js'), 'utf8');
    const funcao = extrairFuncao(
        codigo,
        '        function prepararDadosArmaColetada(item, itemData = null) {',
        '\n        function registrarItemNoInventario',
        'prepararDadosArmaColetada'
    );
    const contexto = vm.createContext({
        ehTipoArma: tipo => tipo === 'revolver' || tipo === 'doze',
        obterMaxMunicaoPorArma: tipo => tipo === 'doze' ? 2 : 5,
        Number
    });
    vm.runInContext(`${funcao}\nglobalThis.prepararDadosArmaColetada = prepararDadosArmaColetada;`, contexto);
    return contexto.prepararDadosArmaColetada;
}

function carregarConversorArmaParaMunicao(controle) {
    const codigo = fs.readFileSync(path.join(raiz, 'src/jogador/inventario.js'), 'utf8');
    const funcao = extrairFuncao(
        codigo,
        '        function tentarConverterArmaColetadaEmMunicao(item) {',
        '\n        function prepararDadosArmaColetada',
        'tentarConverterArmaColetadaEmMunicao'
    );
    const contexto = vm.createContext({
        controle,
        ehTipoArma: tipo => tipo === 'revolver' || tipo === 'doze',
        obterArmaEquipadaParaColeta: () => controle.heldWeaponType,
        obterMaxMunicaoPorArma: tipo => tipo === 'doze' ? 2 : 5,
        window: { AudioManager: { playSFX() {} } },
        salvarInventario() {},
        atualizarMochilaUI() {},
        Number
    });
    vm.runInContext(`${funcao}\nglobalThis.tentarConverterArmaColetadaEmMunicao = tentarConverterArmaColetadaEmMunicao;`, contexto);
    return contexto.tentarConverterArmaColetadaEmMunicao;
}

function criarColetorDeArmas(controle) {
    const codigo = fs.readFileSync(path.join(raiz, 'src/jogador/inventario.js'), 'utf8');
    const preparar = extrairFuncao(
        codigo,
        '        function prepararDadosArmaColetada(item, itemData = null) {',
        '\n        function registrarItemNoInventario',
        'prepararDadosArmaColetada'
    );
    const converter = extrairFuncao(
        codigo,
        '        function tentarConverterArmaColetadaEmMunicao(item) {',
        '\n        function prepararDadosArmaColetada',
        'tentarConverterArmaColetadaEmMunicao'
    );
    const coletor = extrairFuncao(
        codigo,
        '        function tentarColetarItemJogadorInterno(item) {',
        '\n        function tentarColetarItemJogador(item)',
        'tentarColetarItemJogadorInterno'
    );
    const contexto = vm.createContext({
        controle,
        console: { info() {}, warn() {}, error() {} },
        window: {
            itemDefinitions: {
                revolver: { id: 'revolver', efeitos: { jogador: { municao: 5 } } },
                doze: { id: 'doze', efeitos: { jogador: { municao: 2 } } }
            },
            AudioManager: { playSFX() {} }
        },
        ehTipoArma: tipo => tipo === 'revolver' || tipo === 'doze',
        obterArmaEquipadaParaColeta: () => controle.heldWeaponType,
        obterMaxMunicaoPorArma: tipo => tipo === 'doze' ? 2 : 5,
        prepararDadosArmaColetada: null,
        tentarConverterArmaColetadaEmMunicao: null,
        aplicarItemNoCorpo() { throw new Error('Não era esperado reaplicar a arma equipada no teste.'); },
        guardarItemNoCinto() { return false; },
        guardarItemNoColete() { return false; },
        removerTipoDoInventario() {},
        registrarItemNoInventario() {},
        salvarInventario() {},
        atualizarMochilaUI() {},
        precisaRestauracaoAgora() { return false; },
        aplicarRestauracao() { return false; },
        itemJaAtivoNoCorpo() { return true; },
        precisaDeItemAgora() { return false; },
        droparItemDoCinto() { return false; },
        droparItemDoColete() { return false; }
    });

    vm.runInContext(
        `${preparar}\n${converter}\n${coletor}\nglobalThis.coletarArma = tentarColetarItemJogadorInterno;`,
        contexto
    );
    return contexto.coletarArma;
}

function criarSeletorDeArmas(controle) {
    const codigo = fs.readFileSync(path.join(raiz, 'src/visual/animacoes-equipamento.js'), 'utf8');
    const funcao = extrairFuncao(
        codigo,
        '    function alternarEquipamentoSelecao() {',
        '\n    function sincronizarVisuaisEquipamentos()',
        'alternarEquipamentoSelecao'
    );
    const armaElemento = { src: '' };
    const contexto = vm.createContext({
        controle,
        armaElemento,
        cintoElemento: {},
        flashElement() {},
        console: { info() {}, warn() {}, error() {} },
        window: {
            itemDefinitions: {
                revolver: { spriteEquipado: 'revolver.png', efeitos: { jogador: { municao: 5 } } },
                doze: { spriteEquipado: 'doze.png', efeitos: { jogador: { municao: 2 } } }
            },
            AudioManager: { playSFX() {} },
            salvarInventario() {}
        }
    });

    vm.runInContext(`${funcao}\nglobalThis.alternarEquipamentoSelecao = alternarEquipamentoSelecao;`, contexto);
    return { alternar: contexto.alternarEquipamentoSelecao, armaElemento };
}

function carregarConsumoMunicaoArmaAtiva() {
    const codigo = fs.readFileSync(path.join(raiz, 'src/jogador/movimento.js'), 'utf8');
    const funcao = extrairFuncao(
        codigo,
        'function consumirMunicaoArmaAtiva(controle) {',
        '\nwindow.iniciarMovimentacao',
        'consumirMunicaoArmaAtiva'
    );
    const contexto = vm.createContext({ Math });
    vm.runInContext(`${funcao}\nglobalThis.consumirMunicaoArmaAtiva = consumirMunicaoArmaAtiva;`, contexto);
    return contexto.consumirMunicaoArmaAtiva;
}

test('arma nova guardada no cinto recebe a munição padrão definida para ela', () => {
    const criarEntradaColete = carregarCriarEntradaColete();
    const entradaDoze = criarEntradaColete(
        { tipo: 'doze' },
        { id: 'doze', nome: 'Doze', efeitos: { jogador: { municao: 2 } } }
    );

    assert.equal(entradaDoze.tipo, 'doze');
    assert.equal(entradaDoze.dados.municao, 2);
});

test('arma armazenada com zero explícito conserva esse valor', () => {
    const criarEntradaColete = carregarCriarEntradaColete();
    const entradaVazia = criarEntradaColete(
        { tipo: 'doze', municao: 0 },
        { id: 'doze', efeitos: { jogador: { municao: 2 } } }
    );

    assert.equal(entradaVazia.dados.municao, 0);
});

test('arma nova sem campo de munição começa com a munição máxima', () => {
    const criarEntradaColete = carregarCriarEntradaColete();
    const entradaRevolver = criarEntradaColete(
        { tipo: 'revolver' },
        { id: 'revolver', nome: 'Revolver', efeitos: { jogador: { municao: 5 } } }
    );
    const entradaDoze = criarEntradaColete(
        { tipo: 'doze' },
        { id: 'doze', nome: 'Doze', efeitos: { jogador: { municao: 2 } } }
    );

    assert.equal(entradaRevolver.dados.municao, 5);
    assert.equal(entradaDoze.dados.municao, 2);
});

test('arma usada com munição restante conserva esse valor ao ser recolhida', () => {
    const criarEntradaColete = carregarCriarEntradaColete();
    const entradaRevolverUsada = criarEntradaColete(
        { tipo: 'revolver', municao: 3 },
        { id: 'revolver', nome: 'Revolver', efeitos: { jogador: { municao: 5 } } }
    );
    const entradaDozeUsada = criarEntradaColete(
        { tipo: 'doze', municao: 1 },
        { id: 'doze', nome: 'Doze', efeitos: { jogador: { municao: 2 } } }
    );

    assert.equal(entradaRevolverUsada.dados.municao, 3);
    assert.equal(entradaDozeUsada.dados.municao, 1);
});

test('arma usada com munição 0 continua vazia', () => {
    const criarEntradaColete = carregarCriarEntradaColete();
    const entradaRevolverVazia = criarEntradaColete(
        { tipo: 'revolver', municao: 0 },
        { id: 'revolver', nome: 'Revolver', efeitos: { jogador: { municao: 5 } } }
    );
    const entradaDozeVazia = criarEntradaColete(
        { tipo: 'doze', municao: 0 },
        { id: 'doze', nome: 'Doze', efeitos: { jogador: { municao: 2 } } }
    );

    assert.equal(entradaRevolverVazia.dados.municao, 0);
    assert.equal(entradaDozeVazia.dados.municao, 0);
});

test('disparar decrementa somente a munição da arma ativa', () => {
    const consumirMunicao = carregarConsumoMunicaoArmaAtiva();
    const controle = {
        heldWeaponType: 'revolver',
        municao: 5,
        municaoPorArma: { revolver: 5, doze: 2 }
    };

    consumirMunicao(controle);

    assert.equal(controle.municao, 4);
    assert.equal(controle.municaoPorArma.revolver, 4);
    assert.equal(controle.municaoPorArma.doze, 2);
});

test('trocar do revólver vazio para a doze carrega a munição independente e preserva a do revólver', () => {
    const controle = {
        temCinto: true,
        temArma: true,
        estaAgachado: false,
        estaoAberto: false,
        abrindo: false,
        fechando: false,
        itensGuardadosNoCinto: false,
        selecaoCinto: 'arma',
        heldWeaponType: 'revolver',
        municao: 0,
        municaoPorArma: { revolver: 0, doze: 2 },
        inventario: ['cinto', 'revolver', 'doze'],
        cintoSlot: { tipo: 'doze', dados: { municao: 2 } },
        coleteSlots: []
    };
    const { alternar, armaElemento } = criarSeletorDeArmas(controle);

    alternar();

    assert.equal(controle.heldWeaponType, 'doze');
    assert.equal(controle.municao, 2);
    assert.equal(controle.municaoPorArma.revolver, 0);
    assert.equal(controle.municaoPorArma.doze, 2);
    assert.equal(armaElemento.src, 'doze.png');

    alternar();

    assert.equal(controle.heldWeaponType, 'revolver');
    assert.equal(controle.municao, 0);
    assert.equal(controle.municaoPorArma.revolver, 0);
    assert.equal(controle.municaoPorArma.doze, 2);
    assert.equal(armaElemento.src, 'revolver.png');
});

test('arma nova do mesmo tipo reabastece o pente completo ao ser recolhida', () => {
    const preparar = carregarPrepararDadosArmaColetada();
    const controle = {
        temArma: true,
        heldWeaponType: 'revolver',
        municao: 0,
        municaoPorArma: { revolver: 0 }
    };
    const converter = carregarConversorArmaParaMunicao(controle);
    const itemNovo = preparar(
        { tipo: 'revolver' },
        { id: 'revolver', efeitos: { jogador: { municao: 5 } } }
    );

    assert.equal(itemNovo.municao, 5);
    assert.equal(converter(itemNovo), true);
    assert.equal(controle.municao, 5);
    assert.equal(controle.municaoPorArma.revolver, 5);
});

test('arma usada do mesmo tipo concede apenas a municao restante', () => {
    const preparar = carregarPrepararDadosArmaColetada();
    const controle = {
        temArma: true,
        heldWeaponType: 'revolver',
        municao: 1,
        municaoPorArma: { revolver: 1 }
    };
    const converter = carregarConversorArmaParaMunicao(controle);
    const itemUsado = preparar(
        { tipo: 'revolver', municao: 2 },
        { id: 'revolver', efeitos: { jogador: { municao: 5 } } }
    );

    assert.equal(converter(itemUsado), true);
    assert.equal(controle.municao, 3);
    assert.equal(controle.municaoPorArma.revolver, 3);
});

test('arma usada vazia nao adiciona bala nem altera a arma equipada', () => {
    const preparar = carregarPrepararDadosArmaColetada();
    const controle = {
        temArma: true,
        heldWeaponType: 'revolver',
        municao: 2,
        municaoPorArma: { revolver: 2 }
    };
    const converter = carregarConversorArmaParaMunicao(controle);
    const itemVazio = preparar(
        { tipo: 'revolver', municao: 0 },
        { id: 'revolver', efeitos: { jogador: { municao: 5 } } }
    );

    assert.equal(converter(itemVazio), false);
    assert.equal(controle.municao, 2);
    assert.equal(controle.municaoPorArma.revolver, 2);
});

test('coleta real de arma do mesmo tipo usa pente completo ou munição restante, sem conceder bala a arma vazia', () => {
    const cenarios = [
        { descricao: 'arma nova', item: { tipo: 'revolver' }, antes: 0, depois: 5, coletada: true },
        { descricao: 'arma usada', item: { tipo: 'revolver', municao: 2 }, antes: 1, depois: 3, coletada: true },
        { descricao: 'arma usada vazia', item: { tipo: 'revolver', municao: 0 }, antes: 2, depois: 2, coletada: false }
    ];

    for (const cenario of cenarios) {
        const controle = {
            temArma: true,
            heldWeaponType: 'revolver',
            municao: cenario.antes,
            municaoPorArma: { revolver: cenario.antes },
            inventario: ['revolver'],
            temCinto: false,
            temColete: false,
            cintoSlot: null,
            coleteSlots: []
        };
        const coletarArma = criarColetorDeArmas(controle);

        assert.equal(coletarArma(cenario.item), cenario.coletada, cenario.descricao);
        assert.equal(controle.municao, cenario.depois, cenario.descricao);
        assert.equal(controle.municaoPorArma.revolver, cenario.depois, cenario.descricao);
    }
});
