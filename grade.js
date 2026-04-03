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

    palco.appendChild(grade);

    // Escuta a tecla "g" para alternar a visibilidade
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'g') {
            grade.style.display = grade.style.display === 'none' ? 'block' : 'none';
            console.log("Grade: " + (grade.style.display === 'block' ? "Visível" : "Oculta"));
        }
    });
}