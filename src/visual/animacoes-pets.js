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
            const inclinacaoMax = 20;
            const velReferencia = 6;
            const fator = Math.max(-1, Math.min(1, pet.velocidadeY / velReferencia));

            // Inverte o sentido da rotação se olhando para a esquerda
            // Para direita: nariz sobe ao subir, desce ao cair (ângulo negativo)
            // Para esquerda: nariz desce ao subir, sobe ao cair (ângulo positivo)
            angulo = (pet.direcao === 'e' ? 1 : -1) * fator * inclinacaoMax;
        }

        pet.elemento.style.transform = `rotate(${angulo.toFixed(1)}deg) scaleX(${direcaoFator})`;
    };
})();