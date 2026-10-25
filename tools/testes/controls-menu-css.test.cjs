const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '../..');

function ler(caminho) {
    return fs.readFileSync(path.join(raiz, caminho), 'utf8');
}

test('o CSS exclusivo de controles é carregado depois dos estilos gerais', () => {
    const html = ler('index.html');
    const posicaoBase = html.indexOf('base-menu-style.css');
    const posicaoControles = html.indexOf('src/ui/controls-menu.css');

    assert.notEqual(posicaoBase, -1, 'CSS geral do menu não encontrado no index.html');
    assert.notEqual(posicaoControles, -1, 'CSS de controles não foi ligado no index.html');
    assert.ok(
        posicaoControles > posicaoBase,
        'controls-menu.css deve ser carregado depois do CSS geral'
    );
});

test('menu-style.css não mantém regras exclusivas do menu de controles', () => {
    const cssGeral = ler('menu-style.css');

    assert.doesNotMatch(
        cssGeral,
        /\.menu-controls-|#controls-list-container|#special-controls-list-container/,
        'Ainda há seletores exclusivos de controles no CSS geral'
    );
});

test('o CSS de controles mantém as duas colunas e as listas roláveis', () => {
    const css = ler('src/ui/controls-menu.css');

    assert.match(
        css,
        /\.menu-controls-options\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/s,
        'O painel deve manter duas colunas'
    );

    assert.match(
        css,
        /#controls-list-container\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
        'A lista de controles básicos deve manter duas colunas internas'
    );

    assert.match(
        css,
        /\.menu-controls-list-container\s*\{[^}]*overflow-y:\s*auto/s,
        'As listas devem permitir rolagem vertical'
    );
});

test('o campo da tecla cabe dentro da linha do controle', () => {
    const css = ler('src/ui/controls-menu.css');

    const regraLinha = css.match(/\.menu-controls-line\s*\{([^}]*)\}/s);
    const regraRotulo = css.match(/\.menu-controls-label\s*\{([^}]*)\}/s);
    const regraTecla = css.match(/\.menu-controls-key\s*\{([^}]*)\}/s);

    assert.ok(regraLinha, 'Regra da linha de controle não encontrada');
    assert.ok(regraRotulo, 'Regra do rótulo não encontrada');
    assert.ok(regraTecla, 'Regra do campo da tecla não encontrada');

    function obterPixels(regra, propriedade) {
        const encontrado = regra[1].match(
            new RegExp(`${propriedade}:\\s*(\\d+)px`)
        );
        assert.ok(encontrado, `Propriedade ${propriedade} não encontrada`);
        return Number(encontrado[1]);
    }

    const larguraLinha = obterPixels(regraLinha, 'width');
    const larguraRotulo = obterPixels(regraRotulo, 'width');
    const larguraTecla = obterPixels(regraTecla, 'width');
    const gap = obterPixels(regraLinha, 'gap');
    const paddingHorizontal = regraLinha[1].match(/padding:\s*\d+px\s+(\d+)px/);
    assert.ok(paddingHorizontal, 'Padding horizontal da linha não encontrado');

    assert.ok(
        larguraLinha >= larguraRotulo + larguraTecla + Number(paddingHorizontal[1]) * 2 + gap,
        'A linha precisa ser larga o bastante para exibir o rótulo e a tecla'
    );
});
