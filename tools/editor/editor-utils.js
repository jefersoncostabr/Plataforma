(function () {
    const TILE_SIZE = window.EditorConfig?.TILE_SIZE || 32;
    const createEmptyFaseData = window.EditorConfig?.createEmptyFaseData || (() => ({}));
    const COORD_ARRAY_KEYS = window.EditorConfig?.COORD_ARRAY_KEYS || [];

    function rowToLetters(row) {
        if (row < 26) return String.fromCharCode(97 + row);
        return String.fromCharCode(97 + Math.floor(row / 26) - 1) + String.fromCharCode(97 + (row % 26));
    }

    function lettersToRow(letters) {
        if (!letters) return 0;
        if (letters.length === 1) {
            return letters.charCodeAt(0) - 97;
        }
        return (letters.charCodeAt(0) - 97 + 1) * 26 + (letters.charCodeAt(1) - 97);
    }

    function pointToCoord(x, y, tileSize = TILE_SIZE) {
        const col = Math.floor(x / tileSize) + 1;
        const row = Math.floor(y / tileSize);
        return rowToLetters(row) + col;
    }

    function coordToParts(coord) {
        const match = String(coord || '').match(/^([a-z]+)(\d+)$/i);
        if (!match) return null;

        const letters = match[1].toLowerCase();
        const number = Number(match[2]);
        return {
            letters,
            number,
            row: lettersToRow(letters),
            col: number - 1
        };
    }

    function coordToPixels(coord, tileSize = TILE_SIZE) {
        const parts = coordToParts(coord);
        if (!parts) return null;
        return {
            left: parts.col * tileSize,
            bottom: parts.row * tileSize,
            row: parts.row,
            col: parts.col
        };
    }

    function sortCoords(a, b) {
        const aParts = coordToParts(a) || { row: 0, col: 0 };
        const bParts = coordToParts(b) || { row: 0, col: 0 };
        if (aParts.row !== bParts.row) return aParts.row - bParts.row;
        return aParts.col - bParts.col;
    }

    function uniqueCoords(coords = []) {
        return [...new Set((coords || []).filter(Boolean))];
    }

    function normalizeCoordList(coords = []) {
        return uniqueCoords(coords).sort(sortCoords);
    }

    function normalizeItensData(itens = {}) {
        const normalized = {};

        if (Array.isArray(itens)) {
            itens
                .filter(item => item && item.tipo && item.pos)
                .forEach((item) => {
                    if (!Array.isArray(normalized[item.tipo])) normalized[item.tipo] = [];
                    normalized[item.tipo].push(item.pos);
                });
        } else if (itens && typeof itens === 'object') {
            Object.entries(itens).forEach(([tipo, posicoes]) => {
                const lista = Array.isArray(posicoes) ? posicoes : [posicoes];
                const coords = normalizeCoordList(lista.filter(Boolean));
                if (coords.length > 0) normalized[tipo] = coords;
            });
        }

        Object.keys(normalized).forEach((tipo) => {
            normalized[tipo] = normalizeCoordList(normalized[tipo]);
            if (normalized[tipo].length === 0) delete normalized[tipo];
        });

        return normalized;
    }

    function iterarItensData(itens = {}) {
        return Object.entries(normalizeItensData(itens)).flatMap(([tipo, coords]) => {
            return coords.map((pos) => ({ tipo, pos }));
        });
    }

    function exportarItensData(itens = {}) {
        const exported = {};

        Object.entries(normalizeItensData(itens)).forEach(([tipo, coords]) => {
            if (coords.length === 1) exported[tipo] = coords[0];
            else if (coords.length > 1) exported[tipo] = coords;
        });

        return exported;
    }

    function limparCamposVazios(data) {
        if (Array.isArray(data)) {
            return data
                .map(limparCamposVazios)
                .filter((item) => {
                    if (Array.isArray(item)) return item.length > 0;
                    if (item && typeof item === 'object') return Object.keys(item).length > 0;
                    return item !== undefined && item !== null;
                });
        }

        if (data && typeof data === 'object') {
            const limpo = {};

            Object.entries(data).forEach(([key, value]) => {
                const valorLimpo = limparCamposVazios(value);
                const ehArrayVazio = Array.isArray(valorLimpo) && valorLimpo.length === 0;
                const ehObjetoVazio = valorLimpo && typeof valorLimpo === 'object' && !Array.isArray(valorLimpo) && Object.keys(valorLimpo).length === 0;

                if (!ehArrayVazio && !ehObjetoVazio && valorLimpo !== undefined) {
                    limpo[key] = valorLimpo;
                }
            });

            return limpo;
        }

        return data;
    }

    function normalizeFaseData(data = {}) {
        const defaults = createEmptyFaseData();
        const merged = { ...defaults, ...data };

        COORD_ARRAY_KEYS.forEach((key) => {
            const coords = normalizeCoordList(merged[key] || []);
            if (coords.length > 0) merged[key] = coords;
            else delete merged[key];
        });

        merged.itens = normalizeItensData(merged.itens);
        if (Object.keys(merged.itens).length === 0) delete merged.itens;

        merged.inimigoAleatorio = Array.isArray(merged.inimigoAleatorio) && merged.inimigoAleatorio.length >= 2
            ? [Number(merged.inimigoAleatorio[0] || 0), Number(merged.inimigoAleatorio[1] || 0)]
            : [1, 0];

        return limparCamposVazios(merged);
    }

    window.EditorUtils = {
        rowToLetters,
        lettersToRow,
        pointToCoord,
        coordToParts,
        coordToPixels,
        sortCoords,
        uniqueCoords,
        normalizeCoordList,
        normalizeItensData,
        iterarItensData,
        exportarItensData,
        limparCamposVazios,
        normalizeFaseData
    };
})();