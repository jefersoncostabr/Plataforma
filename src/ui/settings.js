(function () {
    /**
     * Executa a transição de saída do menu de configurações.
     * Atualiza o estado para 'main' e chama `renderMenuUI()` 
     * para exibir o menu principal.
     * Inclui uma lógica de persistência para `window.gameDifficulty`.
     */
    function fecharConfiguracoes() {
        // Mantém a lógica de persistência/gatilho presente no código original
        try {
            if (window.gameDifficulty !== undefined) {
                window.gameDifficulty = window.gameDifficulty;
            }
        } catch (e) {
            console.warn("Erro ao processar dificuldade ao fechar:", e);
        }

        // Define o estado global para retornar ao menu principal
        if (typeof menuMode !== 'undefined') {
            menuMode = 'main';
        } else {
            window.menuMode = 'main';
        }

        // Notifica o sistema de menu para renderizar a tela principal
        const callback = window.renderMenuUI || (typeof renderMenuUI === 'function' ? renderMenuUI : null);
        if (typeof callback === 'function') {
            callback();
        }
    }

    /**
     * Vincula os event listeners de clique e teclado (Enter/Espaço) ao botão
     * de fechar configurações (`btn-fechar-config`). Garante que os eventos
     * sejam vinculados apenas uma vez usando `dataset.logicBound`.
     */
    function vincularEventos() {
        const btn = document.getElementById('btn-fechar-config');
        if (!btn || btn.dataset.logicBound === "true") return;

        btn.dataset.logicBound = "true";

        // Gerencia o clique (Mouse/Touch)
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            fecharConfiguracoes();
        });

        // Gerencia o teclado (Enter e Espaço) para acessibilidade
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fecharConfiguracoes();
            }
        });
    }

    /**
     * Observa o corpo do documento para detectar a adição dinâmica do menu de configurações.
     * Quando o botão `btn-fechar-config` é injetado no DOM, a função `vincularEventos()`
     * é chamada para anexar os listeners.
     */
    // Observa o corpo do documento para detectar quando o menu de configurações for injetado
    const observer = new MutationObserver(() => vincularEventos());
    observer.observe(document.body, { childList: true, subtree: true });

    // Tenta vincular os eventos imediatamente caso o botão já esteja presente no DOM.
    // Tentativa inicial de vinculação
    vincularEventos();
})();