(function() {
    /**
     * Utilitários de Navegação para IA (Inimigos e Pets).
     */
    window.IAUtils = {
        /**
         * Verifica se há um teto sólido logo acima da cabeça da entidade.
         */
        estaSobTeto: function(ent) {
            if (typeof window.verificarColisaoComTiles !== 'function') return false;
            const x = ent.x + (ent.offsetX || 0);
            const y = ent.y + (ent.altura || 30) + 2; 
            const hit = window.verificarColisaoComTiles(x, y, ent.largura, 4, window.plataformas);
            // Consideramos teto qualquer bloco sólido ou plataforma superior
            return !!hit && (hit.tipo === 'solido' || hit.tipo === 'meio' || hit.tipo === 'estaca');
        },

        /**
         * Busca uma saída horizontal (esquerda ou direita) onde não haja obstrução superior.
         * @param {Object} ent - Entidade (NPC/Pet).
         * @param {number} direcaoDesejada - 1 para direita, -1 para esquerda.
         * @returns {number|null} Posição X de escape ou null.
         */
        encontrarSaidaTeto: function(ent, direcaoDesejada) {
            const grid = 32;
            const raioBusca = 6; // Verifica até 6 blocos de distância
            const xBase = ent.x + (ent.offsetX || 0);
            const yCheck = ent.y + (ent.altura || 30) + 2;
            const largura = ent.largura;

            // Tenta primeiro a direção que aproxima do alvo, depois a oposta
            const direcoes = [direcaoDesejada, -direcaoDesejada];

            for (let d of direcoes) {
                for (let i = 1; i <= raioBusca; i++) {
                    const xTeste = xBase + (i * grid * d);
                    
                    // Verifica se o teto está limpo nesse ponto
                    const tetoObstruido = window.verificarColisaoComTiles(xTeste, yCheck, largura, 4, window.plataformas);
                    
                    if (!tetoObstruido) {
                        // Verificação de segurança: garante que há chão sólido para onde estamos indo
                        const temChao = window.verificarColisaoComTiles(xTeste, ent.y - 10, largura, 10, window.plataformas);
                        if (temChao) {
                            return xTeste - (ent.offsetX || 0);
                        }
                    }
                }
            }
            return null;
        }
    };
})();