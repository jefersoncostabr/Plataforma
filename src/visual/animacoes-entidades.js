(function () {
    window.aplicarInclinacaoVertical = function (entidade, opcoes = {}) {
        if (!entidade || !entidade.elemento) return;

        const limiteGraus = Number.isFinite(opcoes.limiteGraus)
            ? opcoes.limiteGraus
            : 20;

        const velocidadeReferencia = Number.isFinite(opcoes.velocidadeReferencia)
            ? opcoes.velocidadeReferencia
            : 6;

        const sentido = opcoes.sentido === -1 ? -1 : 1;
        const direcaoFator = entidade.direcao === 'e' ? -1 : 1;

        let angulo = 0;

        if (opcoes.habilitado !== false && !entidade.noChao) {
            const velocidadeY = Number(entidade.velocidadeY) || 0;
            const fator = Math.max(
                -1,
                Math.min(1, velocidadeY / velocidadeReferencia)
            );
            const sentidoDaDirecao = entidade.direcao === 'e' ? 1 : -1;

            angulo = sentido * sentidoDaDirecao * fator * limiteGraus;
        }

        entidade.elemento.style.transform =
            `rotate(${angulo.toFixed(1)}deg) scaleX(${direcaoFator})`;
    };
})();
