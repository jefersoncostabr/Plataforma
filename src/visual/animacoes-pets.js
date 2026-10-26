/**
 * Módulo de animações procedurais para os Pets.
 */
(function () {
    /**
     * Aplica uma inclinação (tilt) ao sprite baseada na velocidade vertical.
     * @param {Object} pet - Objeto da entidade pet (cao ou gato).
     */
    window.aplicarRotacaoVerticalPet = function (pet) {
        window.aplicarInclinacaoVertical(pet);
    };
})();