// Shift/renomeação descendente de fases para inserção por número
async function handleShiftPhases(req, res) {
    try {
        const body = await readRequestBody(req);
        const payload = JSON.parse(body || '{}');
        const scope = String(payload.scope || '').trim(); // '', 'nivel_1', 'nivel_2'
        const N = parseInt(payload.N);
        if (!N || N <= 0) return sendJson(res, 400, { ok: false, error: 'N inválido.' });

        // Determina pasta base
        let dir = PHASES_DIR;
        if (scope === 'nivel_1') dir = path.join(PHASES_DIR, 'nivel_1');
        else if (scope === 'nivel_2') dir = path.join(PHASES_DIR, 'nivel_2');

        // Lista arquivos fase{k}.json
        const files = await fs.promises.readdir(dir);
        const faseFiles = files
            .map(f => ({
                name: f,
                match: f.match(/^fase(\d+)\.json$/i)
            }))
            .filter(f => f.match)
            .map(f => ({
                name: f.name,
                k: parseInt(f.match[1])
            }))
            .filter(f => f.k >= N)
            .sort((a, b) => b.k - a.k); // ordem decrescente

        // Renomeia de trás pra frente
        for (const f of faseFiles) {
            const oldPath = path.join(dir, `fase${f.k}.json`);
            const newPath = path.join(dir, `fase${f.k + 1}.json`);
            await fs.promises.rename(oldPath, newPath);
        }

        await atualizarManifestoFases();

        return sendJson(res, 200, { ok: true, shifted: faseFiles.length });
    } catch (error) {
        console.error(`[Server] ERRO ao shift phases: ${error.message}`);
        return sendJson(res, 500, { ok: false, error: error.message });
    }
}
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.EDITOR_SAVE_PORT || 3210);
const HOST = process.env.EDITOR_SAVE_HOST || '127.0.0.1';
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const PHASES_DIR = path.join(ROOT_DIR, 'config', 'fases');
const EDITOR_DIR = path.join(ROOT_DIR, 'tools', 'editor');
const FUNDO_ASSETS_DIR = path.join(ROOT_DIR, 'assets', 'fundo');
const PHASE_MANIFEST_PATH = path.join(PHASES_DIR, 'manifesto-fases.json');

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, data) {
    setCorsHeaders(res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
}

function sendText(res, statusCode, text) {
    setCorsHeaders(res);
    res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(text);
}

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml; charset=utf-8',
        '.txt': 'text/plain; charset=utf-8'
    };
    return types[ext] || 'application/octet-stream';
}

async function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 10 * 1024 * 1024) {
                reject(new Error('Payload muito grande.'));
                req.destroy();
            }
        });
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

async function atualizarManifestoFases() {
    const arquivos = await listarArquivosJsonFaseRecursivo(PHASES_DIR);
    const fases = arquivos
        .filter(arquivo => /^nivel_\d+\/fase\d+\.json$/i.test(arquivo))
        .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' }));
    await fs.promises.writeFile(PHASE_MANIFEST_PATH, `${JSON.stringify(fases, null, 2)}\n`, 'utf8');
}

async function handleReorderPhase(req, res) {
    const arquivosTemporarios = [];
    const arquivosFinalizados = [];

    try {
        const body = await readRequestBody(req);
        const payload = JSON.parse(body || '{}');

        const sourceFile = String(payload.sourceFile || '').replace(/\\/g, '/').trim();
        const partesOrigem = sourceFile.match(
            /^(?:(nivel_\d+)\/)?(fase\d+\.json)$/i
        );

        const targetPosition = Number(payload.targetPosition);

        if (!partesOrigem) {
            return sendJson(res, 400, {
                ok: false,
                error: 'O arquivo de origem não tem o formato de uma fase reconhecida.'
            });
        }

        if (!Number.isInteger(targetPosition) || targetPosition < 1) {
            return sendJson(res, 400, {
                ok: false,
                error: 'A nova posição deve ser um número inteiro positivo.'
            });
        }

        const pastaNivel = partesOrigem[1] || '';
        const nomeOrigem = partesOrigem[2];
        const diretorioNivel = path.resolve(PHASES_DIR, pastaNivel);
        const caminhoRelativo = path.relative(PHASES_DIR, diretorioNivel);

        if (caminhoRelativo.startsWith('..') || path.isAbsolute(caminhoRelativo)) {
            return sendJson(res, 400, {
                ok: false,
                error: 'O nível informado está fora da pasta de fases.'
            });
        }

        const entradas = await fs.promises.readdir(diretorioNivel, {
            withFileTypes: true
        });

        const fases = entradas
            .filter((entrada) => entrada.isFile() && /^fase\d+\.json$/i.test(entrada.name))
            .map((entrada) => ({
                nome: entrada.name,
                numero: Number(entrada.name.match(/^fase(\d+)\.json$/i)[1])
            }))
            .sort((a, b) => a.numero - b.numero);

        const indiceOrigem = fases.findIndex(
            (fase) => fase.nome.toLowerCase() === nomeOrigem.toLowerCase()
        );

        if (indiceOrigem < 0) {
            return sendJson(res, 404, {
                ok: false,
                error: `A fase ${sourceFile} não existe.`
            });
        }

        if (targetPosition > fases.length) {
            return sendJson(res, 400, {
                ok: false,
                error: `A posição precisa estar entre 1 e ${fases.length}.`
            });
        }

        const nomeDestino = `fase${targetPosition}.json`;
        const destinoOcupado = fases.some(
            (fase) => fase.nome.toLowerCase() === nomeDestino.toLowerCase()
        );

        if (
            destinoOcupado &&
            nomeDestino.toLowerCase() !== nomeOrigem.toLowerCase() &&
            payload.confirmed !== true
        ) {
            return sendJson(res, 409, {
                ok: false,
                error: `Já existe ${nomeDestino}. É necessária confirmação para continuar.`
            });
        }

        const ordemOriginalContinua = fases.every(
            (fase, indice) => fase.numero === indice + 1
        );

        if (ordemOriginalContinua && indiceOrigem + 1 === targetPosition) {
            const fileName = pastaNivel
                ? `${pastaNivel}/${nomeDestino}`
                : nomeDestino;

            return sendJson(res, 200, {
                ok: true,
                fileName,
                total: fases.length,
                unchanged: true
            });
        }

        const fasesReordenadas = [...fases];
        const [faseSelecionada] = fasesReordenadas.splice(indiceOrigem, 1);
        fasesReordenadas.splice(targetPosition - 1, 0, faseSelecionada);

        const identificadorTemporario = `${Date.now()}-${process.pid}`;

        for (let indice = 0; indice < fases.length; indice += 1) {
            const fase = fases[indice];
            const caminhoOriginal = path.join(diretorioNivel, fase.nome);
            const caminhoTemporario = path.join(
                diretorioNivel,
                `.reorder-${identificadorTemporario}-${indice}.tmp`
            );

            await fs.promises.rename(caminhoOriginal, caminhoTemporario);

            arquivosTemporarios.push({
                caminhoOriginal,
                caminhoTemporario
            });
        }

        for (let indice = 0; indice < fasesReordenadas.length; indice += 1) {
            const fase = fasesReordenadas[indice];
            const arquivoTemporario = arquivosTemporarios.find(
                (item) => item.caminhoOriginal.endsWith(path.sep + fase.nome)
            );
            const caminhoDestino = path.join(
                diretorioNivel,
                `fase${indice + 1}.json`
            );

            await fs.promises.rename(
                arquivoTemporario.caminhoTemporario,
                caminhoDestino
            );

            arquivosFinalizados.push({
                caminhoTemporario: arquivoTemporario.caminhoTemporario,
                caminhoDestino
            });
        }

        await atualizarManifestoFases();

        const fileName = pastaNivel
            ? `${pastaNivel}/fase${targetPosition}.json`
            : `fase${targetPosition}.json`;

        return sendJson(res, 200, {
            ok: true,
            fileName,
            total: fases.length
        });
    } catch (error) {
        try {
            for (const item of arquivosFinalizados.reverse()) {
                await fs.promises.rename(
                    item.caminhoDestino,
                    item.caminhoTemporario
                );
            }

            for (const item of arquivosTemporarios.reverse()) {
                try {
                    await fs.promises.access(item.caminhoTemporario);
                    await fs.promises.rename(
                        item.caminhoTemporario,
                        item.caminhoOriginal
                    );
                } catch (erroRollback) {
                    if (erroRollback.code !== 'ENOENT') throw erroRollback;
                }
            }
        } catch (erroRollback) {
            console.error('[Server] Falha ao reverter renumeração:', erroRollback);
        }

        console.error('[Server] ERRO ao reordenar fase:', error.message);

        return sendJson(res, 500, {
            ok: false,
            error: error.message
        });
    }
}

async function handleSavePhase(req, res) {
    try {
        const body = await readRequestBody(req);
        const payload = JSON.parse(body || '{}');
        const fileName = String(payload.fileName || payload.arquivo || '').trim();
        const content = String(payload.content || payload.conteudo || '');


        if (!fileName) {
            return sendJson(res, 400, { ok: false, error: 'Nome do arquivo é obrigatório.' });
        }

        // Valida fileName para garantir que é um caminho relativo seguro dentro de PHASES_DIR
        // Não deve conter '..' e deve terminar com '.json'
        const normalizedFileName = path.normalize(fileName);
        const isSafePath = !normalizedFileName.startsWith('..') && !path.isAbsolute(normalizedFileName) && normalizedFileName.toLowerCase().endsWith('.json');

        if (!isSafePath) {
            console.error(`[Server] ERRO: Nome de arquivo inválido ou inseguro: "${fileName}"`);
            return sendJson(res, 400, { ok: false, error: 'O arquivo deve ser .json.' });
        }

        JSON.parse(content);

        // Usa o nome do arquivo normalizado diretamente para incluir subpastas
        const destino = path.resolve(PHASES_DIR, normalizedFileName);

        // Verifica se o caminho final ainda está dentro do diretório permitido
        const caminhoRelativo = path.relative(PHASES_DIR, destino);
        if (caminhoRelativo.startsWith('..') || path.isAbsolute(caminhoRelativo)) {
            console.error(`[Server] ERRO: Tentativa de salvar arquivo fora do diretório permitido: "${destino}" (PHASES_DIR: "${PHASES_DIR}")`);
            return sendJson(res, 400, { ok: false, error: 'Tentativa de salvar arquivo fora do diretório permitido.' });
        }
        
        console.log(`[Server] DEBUG: Caminho final de destino no servidor: "${destino}"`);

        await fs.promises.mkdir(path.dirname(destino), { recursive: true });
        await fs.promises.writeFile(destino, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
        await atualizarManifestoFases();

        return sendJson(res, 200, {
            ok: true,
            fileName: normalizedFileName,
            relativePath: `config/fases/${normalizedFileName}`
        });
    } catch (error) {
        console.error(`[Server] ERRO ao salvar fase: ${error.message}`);
        return sendJson(res, 500, { ok: false, error: error.message });
    }
}

async function handleStatic(req, res, pathname) {
    const cleanPath = decodeURIComponent(String(pathname || '/'));

    if (cleanPath === '/') {
        setCorsHeaders(res);
        res.writeHead(302, { Location: '/tools/editor/editor.html' });
        return res.end();
    }

    const relativePath = (cleanPath === '/tools/editor' || cleanPath === '/tools/editor/')
        ? 'tools/editor/editor.html'
        : cleanPath.replace(/^\/+/, '');

    const candidatos = [path.normalize(path.join(ROOT_DIR, relativePath))];

    if (!relativePath.includes('/') && /^editor[\w.-]*\.(css|js|html)$/i.test(relativePath)) {
        candidatos.push(path.normalize(path.join(EDITOR_DIR, relativePath)));
    }

    try {
        let filePath = null;
        let stat = null;

        for (const candidato of candidatos) {
            if (!candidato.startsWith(ROOT_DIR)) continue;

            try {
                const info = await fs.promises.stat(candidato);
                filePath = candidato;
                stat = info;
                break;
            } catch (e) {
                // tenta próximo caminho candidato
            }
        }

        if (!filePath || !stat) {
            return sendText(res, 404, 'Not Found');
        }

        if (stat.isDirectory()) {
            const indexCandidates = [
                path.join(filePath, 'index.html'),
                path.join(filePath, 'editor.html')
            ];

            for (const indexPath of indexCandidates) {
                try {
                    const content = await fs.promises.readFile(indexPath);
                    setCorsHeaders(res);
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    return res.end(content);
                } catch (e) {
                    // tenta o próximo arquivo de entrada
                }
            }

            return sendText(res, 404, 'Not Found');
        }

        const content = await fs.promises.readFile(filePath);
        setCorsHeaders(res);
        res.writeHead(200, { 'Content-Type': getContentType(filePath) });
        return res.end(content);
    } catch (error) {
        return sendText(res, 404, 'Not Found');
    }
}

function ehArquivoImagem(nomeArquivo = '') {
    return /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(String(nomeArquivo || ''));
}

async function listarArquivosRecursivo(dirAbsoluto, raizRelativa = '') {
    const itens = await fs.promises.readdir(dirAbsoluto, { withFileTypes: true });
    const resultados = [];

    for (const item of itens) {
        const absoluto = path.join(dirAbsoluto, item.name);
        const relativo = raizRelativa ? `${raizRelativa}/${item.name}` : item.name;

        if (item.isDirectory()) {
            const filhos = await listarArquivosRecursivo(absoluto, relativo);
            resultados.push(...filhos);
            continue;
        }

        if (item.isFile() && ehArquivoImagem(item.name)) {
            resultados.push(relativo.replace(/\\/g, '/'));
        }
    }

    return resultados;
}

async function handleListarSpritesFundo(req, res) {
    try {
        const info = await fs.promises.stat(FUNDO_ASSETS_DIR);
        if (!info.isDirectory()) {
            return sendJson(res, 404, { ok: false, error: 'Diretorio assets/fundo nao encontrado.' });
        }

        const arquivos = await listarArquivosRecursivo(FUNDO_ASSETS_DIR);
        const canonizarSpriteFundo = (arquivoRelativo = '') => {
            return String(arquivoRelativo || '').replace(/fundo_irregular_verticall\.png$/i, 'fundo_irregular_vertical.png');
        };

        const sprites = [...new Set(arquivos.map(canonizarSpriteFundo))]
            .sort((a, b) => a.localeCompare(b, 'pt-BR'))
            .map((arquivoRelativo) => ({
                id: arquivoRelativo,
                path: `assets/fundo/${arquivoRelativo}`
            }));

        return sendJson(res, 200, {
            ok: true,
            total: sprites.length,
            sprites
        });
    } catch (error) {
        console.error(`[Server] ERRO ao listar sprites de fundo: ${error.message}`);
        return sendJson(res, 500, { ok: false, error: error.message });
    }
}

async function listarArquivosJsonFaseRecursivo(dirAbsoluto, raizRelativa = '') {
    const itens = await fs.promises.readdir(dirAbsoluto, { withFileTypes: true });
    const resultados = [];

    for (const item of itens) {
        const absoluto = path.join(dirAbsoluto, item.name);
        const relativo = raizRelativa ? `${raizRelativa}/${item.name}` : item.name;

        if (item.isDirectory()) {
            const filhos = await listarArquivosJsonFaseRecursivo(absoluto, relativo);
            resultados.push(...filhos);
            continue;
        }

        if (item.isFile() && /\.json$/i.test(item.name)) {
            resultados.push(relativo.replace(/\\/g, '/'));
        }
    }

    return resultados;
}

async function handleListarFases(req, res) {
    try {
        const info = await fs.promises.stat(PHASES_DIR);
        if (!info.isDirectory()) {
            return sendJson(res, 404, { ok: false, error: 'Diretorio de fases nao encontrado.' });
        }

        const fases = (await listarArquivosJsonFaseRecursivo(PHASES_DIR))
            .filter(arquivo => /^nivel_\d+\/fase\d+\.json$/i.test(arquivo))
            .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' }));

        return sendJson(res, 200, {
            ok: true,
            total: fases.length,
            fases
        });
    } catch (error) {
        console.error(`[Server] ERRO ao listar fases: ${error.message}`);
        return sendJson(res, 500, { ok: false, error: error.message });
    }
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.writeHead(204);
        return res.end();
    }

    if (req.method === 'GET' && url.pathname === '/__editor-save-status') {
        return sendJson(res, 200, {
            ok: true,
            service: 'editor-save-server',
            port: PORT,
            root: ROOT_DIR
        });
    }

    if (req.method === 'GET' && url.pathname === '/editor-fundo-sprites') {
        return handleListarSpritesFundo(req, res);
    }

    if (req.method === 'GET' && url.pathname === '/editor-phase-list') {
        return handleListarFases(req, res);
    }


    if (req.method === 'POST' && url.pathname === '/save-phase') {
        return handleSavePhase(req, res);
    }

    if (req.method === 'POST' && url.pathname === '/shift-phases') {
        return handleShiftPhases(req, res);
    }

    if (req.method === 'POST' && url.pathname === '/reorder-phase') {
        return handleReorderPhase(req, res);
    }

    return handleStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
    console.log(`Editor save server running at http://${HOST}:${PORT}`);
    console.log(`Editor URL: http://${HOST}:${PORT}/tools/editor/editor.html`);
    console.log(`Serving workspace root: ${ROOT_DIR}`);
});

process.on('SIGINT', () => {
    console.log('Stopping editor save server...');
    server.close(() => process.exit(0));
});
