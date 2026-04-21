(function() {
    // Caminho base relativo ao arquivo HTML que executa o jogo.
    const GENERAL_SFX_PATH = '../../assets/audio/sfx/';
    
    window.AudioManager = {
        _audioPasso: null,

        playSFX: function(nome, volume = 0.5) {
            const caminho = `${GENERAL_SFX_PATH}${nome}.wav`;
            const som = new Audio(caminho);
            som.volume = Math.max(0, Math.min(1, volume));
            
            som.play().catch(err => {
                console.warn(`[AudioManager] Não foi possível tocar ${nome}.wav. Verifique se o arquivo existe em: ${caminho}`, err.message);
            });
        },

        playPasso: function() {
            // Só inicia um novo som de passo se o anterior já tiver terminado (evita sobreposição)
            if (this._audioPasso && !this._audioPasso.ended) return;

            const caminho = `${GENERAL_SFX_PATH}passo_1.wav`;
            this._audioPasso = new Audio(caminho);
            this._audioPasso.volume = 0.2;
            
            if (this._audioPasso.preservesPitch !== undefined) { 
                this._audioPasso.preservesPitch = false;
                // Variação leve no tom para não soar robótico
                this._audioPasso.playbackRate = 0.9 + Math.random() * 0.2; 
            }
            
            this._audioPasso.play().catch(() => {});
        }
    };
})();