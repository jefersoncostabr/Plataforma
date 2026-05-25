// Função global para transformar BB NPC em inimigo ao entrar em casco/robo
typeof window !== 'undefined' && (window.criarInimigoApartirDeBB = function(x, y) {
    // Parâmetros: x, y em pixels
    const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
    if (!palco) return;

    // Sprite e tipo do inimigo (ajuste conforme necessário)
    const imagemPath = window.config?.spriteParadoInimigo || '../../assets/personagem/Personagem_parado.png';
    const tamanhoTile = 32;
    const inimigoImg = document.createElement('img');
    inimigoImg.src = imagemPath;
    inimigoImg.style.position = 'absolute';
    inimigoImg.style.left = x + 'px';
    inimigoImg.style.bottom = y + 'px';
    inimigoImg.style.width = tamanhoTile + 'px';
    inimigoImg.style.height = tamanhoTile + 'px';
    inimigoImg.style.imageRendering = 'pixelated';
    inimigoImg.style.zIndex = '100';
    window.adicionarAoLayer?.(inimigoImg, window.LAYERS?.INIMIGOS || palco);

    // Adiciona à lista lógica de inimigos
    window.inimigos = window.inimigos || [];
    window.inimigos.push({
        x: x,
        y: y,
        largura: tamanhoTile,
        altura: tamanhoTile,
        tipo: 1, // tipo padrão
        elemento: inimigoImg,
        ativo: true
    });

    // Opcional: SFX
    window.AudioManager?.playSFX?.('engrenagem', 0.5);
});
