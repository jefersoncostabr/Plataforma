(function () {
    function criarSistemaHUDJogador(opcoes = {}) {
        const {
            controle,
            elemento,
            config = {},
            temEscudoAtivo = () => false
        } = opcoes;

        if (!controle || !elemento) {
            throw new Error('Controle e elemento do jogador são obrigatórios para inicializar o HUD.');
        }

        const hudElemento = document.createElement('div');
        hudElemento.id = 'player-hud';
        hudElemento.style.position = 'absolute';
        hudElemento.style.top = '10px';
        hudElemento.style.left = '10px';
        hudElemento.style.display = 'none';
        hudElemento.style.gap = '5px';
        hudElemento.style.alignItems = 'center';
        hudElemento.style.zIndex = '100';

        const containerFixo = document.getElementById('jogo-container') || elemento.parentElement;
        if (containerFixo) {
            containerFixo.appendChild(hudElemento);
        }

        function atualizarHUD() {
            if (!window.playerSkills || !window.playerSkills.includes('skillb')) {
                hudElemento.style.display = 'none';
                return;
            }

            hudElemento.style.display = 'flex';
            hudElemento.innerHTML = '';

            const vidaAtual = (controle.maxVida || 3) - (controle.dano || 0);
            for (let i = 0; i < (controle.maxVida || 3); i++) {
                const circulo = document.createElement('div');
                circulo.className = 'hud-circle';
                circulo.style.backgroundColor = i < vidaAtual ? 'red' : 'white';
                hudElemento.appendChild(circulo);
            }

            if (temEscudoAtivo()) {
                const slotsRestantes = (config.escudoTirosProtegidos || 3) - (controle.escudoProtegido || 0);
                for (let i = 0; i < slotsRestantes; i++) {
                    const quadrado = document.createElement('div');
                    quadrado.className = 'hud-square';
                    hudElemento.appendChild(quadrado);
                }
            }
        }

        function destruir() {
            if (hudElemento.parentElement) {
                hudElemento.remove();
            }
        }

        return {
            elemento: hudElemento,
            atualizarHUD,
            destruir
        };
    }

    window.criarSistemaHUDJogador = criarSistemaHUDJogador;
})();
