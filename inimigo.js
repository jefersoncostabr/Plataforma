/**
 * Lista global para armazenar os dados de todos os inimigos ativos.
 */
window.inimigos = [];

/**
 * Cria um inimigo no palco baseado em coordenadas do grid.
 * 
 * @param {string} idPalco - ID do container do jogo.
 * @param {string} imagemPath - Caminho para a imagem do inimigo.
 * @param {string} coord - Coordenada no grid (ex: "b10").
 * @param {string} direcao - 'd' para direita ou 'e' para esquerda (padrão 'e').
 */
function criarInimigo(idPalco, imagemPath, coord, direcao = 'e') {
    const palco = document.getElementById(idPalco);
    if (!palco) return;

    // Converte coordenada (ex: "b10") para pixels
    const coordLimpa = coord.trim().toLowerCase();
    const letra = coordLimpa[0];
    const numero = parseInt(coordLimpa.substring(1));
    const row = letra.charCodeAt(0) - 'a'.charCodeAt(0);
    const col = numero - 1;
    const tamanhoTile = 32;

    const x = col * tamanhoTile;
    const y = row * tamanhoTile;

    const inimigoImg = document.createElement('img');
    inimigoImg.src = imagemPath;
    inimigoImg.style.position = 'absolute';
    inimigoImg.style.left = x + 'px';
    inimigoImg.style.bottom = y + 'px';
    inimigoImg.style.width = tamanhoTile + 'px';
    inimigoImg.style.height = tamanhoTile + 'px';
    inimigoImg.style.imageRendering = 'pixelated';
    inimigoImg.style.zIndex = '4';
    inimigoImg.style.transform = direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
    palco.appendChild(inimigoImg);

    // Registra o inimigo para detecção de colisão (inclui física vertical)
    window.inimigos.push({
        x,
        y,
        largura: tamanhoTile,
        altura: tamanhoTile,
        elemento: inimigoImg,
        velocidadeY: 0,
        noChao: true
    });
    console.log(`Inimigo inserido em ${coord} (x: ${x}, y: ${y})`);
}