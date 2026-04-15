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

    function normalizeFaseData(data = {}) {
        const defaults = createEmptyFaseData();
        const merged = { ...defaults, ...data };

        COORD_ARRAY_KEYS.forEach((key) => {
            merged[key] = normalizeCoordList(merged[key] || []);
        });

        merged.itens = Array.isArray(merged.itens)
            ? merged.itens
                .filter(item => item && item.tipo && item.pos)
                .map(item => ({ tipo: item.tipo, pos: item.pos }))
            : [];

        merged.inimigoAleatorio = Array.isArray(merged.inimigoAleatorio) && merged.inimigoAleatorio.length >= 2
            ? [Number(merged.inimigoAleatorio[0] || 0), Number(merged.inimigoAleatorio[1] || 0)]
            : [1, 0];

        return merged;
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
        normalizeFaseData
    };
})();