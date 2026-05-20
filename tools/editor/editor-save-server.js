const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.EDITOR_SAVE_PORT || 3210);
const HOST = process.env.EDITOR_SAVE_HOST || '127.0.0.1';
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const PHASES_DIR = path.join(ROOT_DIR, 'config', 'fases');
const EDITOR_DIR = path.join(ROOT_DIR, 'tools', 'editor');

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
        const destino = path.join(PHASES_DIR, normalizedFileName);

        // Verifica se o caminho final ainda está dentro do diretório permitido
        if (!destino.startsWith(PHASES_DIR)) {
            console.error(`[Server] ERRO: Tentativa de salvar arquivo fora do diretório permitido: "${destino}" (PHASES_DIR: "${PHASES_DIR}")`);
            return sendJson(res, 400, { ok: false, error: 'Tentativa de salvar arquivo fora do diretório permitido.' });
        }
        
        console.log(`[Server] DEBUG: Caminho final de destino no servidor: "${destino}"`);

        await fs.promises.writeFile(destino, content.endsWith('\n') ? content : `${content}\n`, 'utf8');

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

    if (req.method === 'POST' && url.pathname === '/save-phase') {
        return handleSavePhase(req, res);
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