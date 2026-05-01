(function() {
    // Caminho base relativo ao arquivo HTML que executa o jogo.
    const GENERAL_SFX_PATH = '../../assets/audio/sfx/';
    const VOLUME_STORAGE_KEY = 'plataformaMasterVolume'; // Chave para salvar o volume no localStorage
    
    window.AudioManager = {
        _audioPasso: null,
        _activeSounds: [], // Rastreador de sons ativos
        masterVolume: 0.5, // Volume mestre padrão

        init: function() {
            // Carrega o volume mestre do localStorage, ou usa o padrão
            const savedVolume = localStorage.getItem(VOLUME_STORAGE_KEY);
            if (savedVolume !== null) {
                this.masterVolume = parseFloat(savedVolume);
            }
            // Garante que o volume esteja dentro de uma faixa válida (0 a 1)
            this.masterVolume = Math.max(0, Math.min(1, this.masterVolume));
        },

        setMasterVolume: function(volume) {
            this.masterVolume = Math.max(0, Math.min(1, volume));
            localStorage.setItem(VOLUME_STORAGE_KEY, this.masterVolume.toString());
            this.updateVolumeUI();
        },

        /**
         * Injeta ou atualiza os controles de volume em um container específico.
         * @param {HTMLElement|string} container - O elemento ou ID do container do menu.
         */
        renderVolumeControl: function(container) {
            const target = typeof container === 'string' ? document.getElementById(container) : container;
            if (!target) return;

            // Verifica se já existe para não duplicar
            let wrapper = target.querySelector('.volume-control-wrapper');
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.className = 'volume-control-wrapper';
                wrapper.style.cssText = 'margin: 15px 0; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 5px; color: #fff; font-family: monospace;';
                
                wrapper.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>VOLUME</span>
                        <span class="vol-percentage">${Math.round(this.masterVolume * 100)}%</span>
                    </div>
                    <input type="range" class="volume-slider" min="0" max="1" step="0.05" 
                        value="${this.masterVolume}" style="width: 100%; cursor: pointer;">
                `;

                const slider = wrapper.querySelector('.volume-slider');
                slider.addEventListener('input', (e) => {
                    this.setMasterVolume(parseFloat(e.target.value));
                });

                target.appendChild(wrapper);
            }
        },

        /**
         * Sincroniza os elementos visuais da barra de volume se eles estiverem na tela.
         */
        updateVolumeUI: function() {
            const sliders = document.querySelectorAll('.volume-slider');
            const labels = document.querySelectorAll('.vol-percentage');
            const percentText = `${Math.round(this.masterVolume * 100)}%`;
            
            sliders.forEach(s => s.value = this.masterVolume);
            labels.forEach(l => l.textContent = percentText);
        },

        playSFX: function(nome, volume = 0.5) {
            const caminho = `${GENERAL_SFX_PATH}${nome}.wav`;
            const volFinal = Math.max(0, Math.min(1, volume * this.masterVolume));
            // console.log(`[AudioManager] playSFX: ${nome} | Vol: ${volFinal.toFixed(2)} | Caminho: ${caminho}`);
            
            const som = new Audio(caminho);
            
            // Adiciona ao rastreador e remove quando terminar
            this._activeSounds.push(som);
            som.onended = () => {
                this._activeSounds = this._activeSounds.filter(s => s !== som);
            };
            som.onerror = () => {
                this._activeSounds = this._activeSounds.filter(s => s !== som);
            };

            som.volume = volFinal;
            som.play().catch(err => {
                // Ignora o erro de interrupção por pause(), que é esperado em trocas de estado rápidas
                if (err.name !== 'AbortError') {
                    console.warn(`[AudioManager] Não foi possível tocar ${nome}.wav. Verifique se o arquivo existe em: ${caminho}`, err.message);
                }
            });
        },

        /**
         * Cria e retorna uma instância de áudio configurada.
         * Útil para sons que precisam ser pausados ou que tocam em loop.
         */
        createSFX: function(nome, volume = 0.5, loop = false) {
            const caminho = `${GENERAL_SFX_PATH}${nome}.wav`;
            const volFinal = Math.max(0, Math.min(1, volume * this.masterVolume));
            // console.log(`[AudioManager] createSFX (Loop): ${nome} | Vol: ${volFinal.toFixed(2)} | Loop: ${loop}`);
            
            const som = new Audio(caminho);
            this._activeSounds.push(som);
            
            som.volume = volFinal;
            som.loop = loop;

            som.addEventListener('error', (e) => {
                this._activeSounds = this._activeSounds.filter(s => s !== som);
                console.error(`[AudioManager] Erro ao carregar arquivo de áudio: ${caminho}`, e);
            });

            return som;
        },

        /**
         * Interrompe todos os sons rastreados (SFX, Loops e Passos).
         */
        stopAllSounds: function() {
            this._activeSounds.forEach(som => {
                som.pause();
                som.currentTime = 0;
            });
            this._activeSounds = [];
            this.stopPasso();
        },

        playPasso: function() {
            // Só inicia um novo som de passo se o anterior já tiver terminado (evita sobreposição)
            if (this._audioPasso && !this._audioPasso.ended) return;

            const caminho = `${GENERAL_SFX_PATH}passo_1.wav`; // TODO: Considerar variação de passos
            this._audioPasso = new Audio(caminho);
            this._audioPasso.volume = Math.max(0, Math.min(1, 0.2 * this.masterVolume)); // Aplica o volume mestre
            
            if (this._audioPasso.preservesPitch !== undefined) { 
                this._audioPasso.preservesPitch = false;
                // Variação leve no tom para não soar robótico
                this._audioPasso.playbackRate = 0.9 + Math.random() * 0.2; 
            }
            
            this._audioPasso.play().catch(() => {});
        },

        stopPasso: function() {
            // Interrompe o áudio de passo imediatamente e limpa a referência
            if (this._audioPasso) {
                this._audioPasso.pause();
                this._audioPasso = null;
            }
        }
    };

    // Inicializa o AudioManager quando o script é carregado
    window.AudioManager.init();
})();