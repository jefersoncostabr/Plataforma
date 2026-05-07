// d:\Programação\Minha home\Jogos\Plataforma\src\visual\button-animations.js

(function () {
    // Seleciona apenas botões e itens interativos que pertencem aos overlays de menu
    const SELETORES_ALVO = '.interaction-overlay button, .interaction-overlay [role="button"], .interaction-overlay .pet-badge, .interaction-overlay .crafting-inv-item, .interaction-overlay .craft-result, #skill-tree-overlay button, .mochila-overlay button, #pause-menu-overlay .menu-option, #pause-menu-overlay button';

    /**
     * Aplica o efeito de realce (hover) seco a um elemento de botão do menu.
     * @param {HTMLElement} buttonElement - O elemento HTML do botão.
     */
    const applyAnimations = function (buttonElement) {
        if (!buttonElement || buttonElement.nodeType !== 1) {
            return;
        }
        
        // Verifica se o elemento corresponde aos critérios de botão de menu
        if (!buttonElement.matches(SELETORES_ALVO)) {
            return;
        }

        if (buttonElement.dataset.animInitialized === "true") {
            return;
        }
        buttonElement.dataset.animInitialized = "true";

        buttonElement.classList.add('animated-button');

        buttonElement.addEventListener('mouseenter', () => buttonElement.classList.add('hovered'));
        buttonElement.addEventListener('mouseleave', () => buttonElement.classList.remove('hovered'));
    };

    // --- MOTOR DE OBSERVAÇÃO ---
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // É um elemento HTML
                    // Verifica se o próprio nó adicionado é um alvo
                    if (node.matches(SELETORES_ALVO)) {
                        applyAnimations(node);
                    }
                    
                    // Verifica se há elementos alvo dentro do nó adicionado (ex: um modal inteiro)
                    node.querySelectorAll(SELETORES_ALVO).forEach(el => {
                        applyAnimations(el);
                    });
                }
            });
        });
    });
    
    // Inicia a observação no container principal do jogo para maior controle
    const iniciarObservador = () => {
        const container = document.getElementById('jogo-container') || document.body;
        observer.observe(container, { childList: true, subtree: true });

        // Scan inicial para botões que já existem (ex: botão de fechar do menu principal)
        document.querySelectorAll(SELETORES_ALVO).forEach(el => applyAnimations(el));
    };

    if (document.readyState === 'loading') { // Ainda carregando
        document.addEventListener('DOMContentLoaded', iniciarObservador);
    } else { // Já carregado
        iniciarObservador();
    }

    window.applyButtonAnimations = applyAnimations;
})();