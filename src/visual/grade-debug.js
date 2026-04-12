/**
 * Cria uma grade de auxílio visual de 32x32 pixels que pode ser alternada.
 * 
 * @param {string} idPalco - O ID do elemento do palco do jogo.
 */
function configurarGrade(idPalco) {
    const palco = document.getElementById(idPalco);
    if (!palco) return;

    const grade = document.createElement('div');
    grade.id = 'grade-auxiliar';
    grade.style.position = 'absolute';
    grade.style.top = '0';
    grade.style.left = '0';
    grade.style.width = '100%';
    grade.style.height = '100%';
    grade.style.pointerEvents = 'none'; // Garante que a grade não capture cliques
    grade.style.zIndex = '1000'; // Mantém a grade à frente de tudo
    grade.style.display = 'none'; // Inicia oculta

    // Desenha a grade usando gradientes (cor verde neon semi-transparente)
    grade.style.backgroundImage = `
        linear-gradient(to right, rgba(0, 255, 0, 0.4) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0, 255, 0, 0.4) 1px, transparent 1px)
    `;
    grade.style.backgroundSize = '32px 32px';

    // Gera os nomes das coordenadas (ex: a1, b2...) dinamicamente
    const colunas = 20; // 640 / 32
    const linhas = 15;  // 480 / 32

    for (let r = 0; r < linhas; r++) {
        for (let c = 1; c <= colunas; c++) {
            const label = document.createElement('span');
            const letra = String.fromCharCode(97 + r); // a, b, c...
            label.textContent = letra + c;
            
            // Estilização do texto da coordenada
            label.style.position = 'absolute';
            label.style.left = ((c - 1) * 32) + 'px';
            label.style.bottom = (r * 32) + 'px';
            label.style.width = '32px';
            label.style.height = '32px';
            label.style.fontSize = '9px';
            label.style.color = 'rgba(0, 255, 0, 0.6)';
            label.style.textAlign = 'center';
            label.style.lineHeight = '32px'; // Centraliza verticalmente no tile
            grade.appendChild(label);
        }
    }

    palco.appendChild(grade);

    // Escuta a tecla "g" para alternar a visibilidade
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'g') {
            grade.style.display = grade.style.display === 'none' ? 'block' : 'none';
            console.log("Grade: " + (grade.style.display === 'block' ? "Visível" : "Oculta"));
        }
    });
}
