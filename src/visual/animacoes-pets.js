/**
 * Módulo de animações procedurais para os Pets.
 */
(function () {
    /**
     * Aplica uma inclinação (tilt) ao sprite baseada na velocidade vertical.
     * @param {Object} pet - Objeto da entidade pet (cao ou gato).
     */
    window.aplicarRotacaoVerticalPet = function (pet) {
        if (!pet || !pet.elemento) return;

        const direcaoFator = pet.direcao === 'e' ? -1 : 1;
        let angulo = 0;

        // Só aplica a rotação se não estiver no chão (estado de pulo ou queda)
        if (!pet.noChao) {
            // Aumentamos a inclinação para 20 graus para ser mais visível
            const inclinacaoMax = 20;
            // Diminuímos a velocidade de referência para 6 (inclina o máximo mais rápido)
            const velReferencia = 6;
            
            // Fator entre -1 e 1 baseado na velocidade vertical atual
            const fator = Math.max(-1, Math.min(1, pet.velocidadeY / velReferencia));

            // O ângulo negativo levanta a "frente" do sprite original.
            angulo = -fator * inclinacaoMax;
        }

        // ORDEM CORRETA: Primeiro rotaciona, depois inverte o X.
        // Isso garante que o nariz aponte para cima/baixo independente da direção.
        pet.elemento.style.transform = `rotate(${angulo.toFixed(1)}deg) scaleX(${direcaoFator})`;
    };
})();