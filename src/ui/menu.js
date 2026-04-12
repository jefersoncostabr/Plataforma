/**
 * Gerenciador do Menu de Pause
 */

window.isMenuOpen = false;
let menuSelectedIndex = 0;

/**
 * Retorna a lista de opções do menu, ajustando o comportamento para o início do jogo.
 */
const getActiveMenuOptions = () => {
    // Define as ações padrão para cada botão
    const baseOptions = [
        { label: "RETORNAR", action: () => {
            window.isFirstStart = false; // Garante que o próximo pause mostre 'RETORNAR'
            window.togglePauseMenu();
        } },
        { label: "SKILLS", action: () => {
            window.togglePauseMenu(); window.toggleSkillMenu();
        } },
        { label: "TREINO", action: () => {
            window.isTraining = true;
            window.togglePauseMenu();
            if (typeof carregarFase === 'function') carregarFase("../../config/fases/treino.json");
        } },
        { label: "REINICIAR", action: () => {
            window.isFirstStart = false; // Garante que o próximo pause mostre 'REINICIAR'
            window.togglePauseMenu();
            if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
        } },
        { label: "SAIR", action: () => {
        if (confirm("Deseja realmente sair do jogo?")) {
            window.close();
            
            // Fallback: Se window.close() for bloqueado pelo navegador
            setTimeout(() => {
                alert("O navegador impediu o fechamento automático. Por favor, feche a aba manualmente.");
            }, 300);
        }
    } }
    ];

    if (window.isFirstStart) {
        // Se for o primeiro início, o botão "RETORNAR" vira "INICIAR" e executa reiniciarJogo(false)
        return [
            { label: "INICIAR", action: async () => {
                window.isFirstStart = false; // Desativa a flag de primeiro início
                window.togglePauseMenu(); // Fecha o menu e despausa o jogo
                if (typeof window.reiniciarJogo === 'function') {
                    await window.reiniciarJogo(false); // Inicia um novo jogo (sem resetar XP/Skills)
                }
            } },
            // baseOptions[1], // SKILLS
            baseOptions[3]  // SAIR (REINICIAR é omitido no início)
        ];
    } else {
        // Se não for o primeiro início, retorna as opções padrão
        return baseOptions;
    }
};

window.togglePauseMenu = () => {
    // Se o menu de skills estiver aberto, o Esc fecha as skills e RETORNA AO MENU
    if (window.isSkillMenuOpen) {
        if (typeof fecharMenuSkillsUI === 'function') fecharMenuSkillsUI();
        window.isSkillMenuOpen = false;
        
        window.isMenuOpen = true;
        menuSelectedIndex = 0;
        renderMenuUI();
        window.addEventListener('keydown', handleMenuInput);
        return;
    }

    // Alterna o estado do menu principal
    window.isMenuOpen = !window.isMenuOpen;
    
    // Utiliza a função de pausa global
    if (typeof window.togglePause === 'function') {
        window.togglePause();
    }
    
    if (window.isMenuOpen) {
        menuSelectedIndex = 0;
        renderMenuUI();
        window.addEventListener('keydown', handleMenuInput);
    } else {
        removeMenuUI();
        window.removeEventListener('keydown', handleMenuInput);
    }
};

function handleMenuInput(e) {
    if (!window.isMenuOpen) return;

    const key = e.key.toLowerCase();
    // Obtém as opções ativas (INICIAR/RETORNAR, SKILLS, REINICIAR/omitido, SAIR)
    const currentOptions = getActiveMenuOptions();
    if (!currentOptions || currentOptions.length === 0) {
        console.error("Menu Input: currentOptions está vazio ou indefinido.");
        return;
    }
    
    // Navegação (Setas e WASD)
    if (key === 'arrowup' || key === 'w') {
        menuSelectedIndex = (menuSelectedIndex - 1 + currentOptions.length) % currentOptions.length;
        updateMenuVisuals();
    } else if (key === 'arrowdown' || key === 's') {
        menuSelectedIndex = (menuSelectedIndex + 1) % currentOptions.length;
        updateMenuVisuals();
    } 
    // Seleção (Enter ou Espaço)
    else if (key === 'enter' || key === ' ') {
        e.preventDefault();
        try {
            currentOptions[menuSelectedIndex].action();
        } catch (error) {
            console.error("Menu: Erro ao executar ação do menu:", error);
        }
    }
}

function renderMenuUI() {
    // Tenta encontrar o container principal, ou usa o pai do palco como fallback
    const container = document.getElementById('jogo-container') || document.getElementById('game-stage')?.parentElement;
    
    if (!container) {
        console.error("Menu: Não foi possível encontrar o container do jogo (#jogo-container) para renderizar a interface.");
        return;
    }

    const rect = container.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.id = 'pause-menu-overlay';
    overlay.style = `
        position: fixed; 
        top: ${rect.top}px; left: ${rect.left}px; 
        width: ${rect.width}px; height: ${rect.height}px;
        background: rgba(0, 0, 0, 0.7); z-index: 10000;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white; font-family: 'Segoe UI', Tahoma, sans-serif;
        border-radius: 4px;
    `;

    const title = document.createElement('h1');
    title.innerText = window.isFirstStart ? "MENU PRINCIPAL" : "PAUSE";
    title.style.marginBottom = "30px";
    title.style.letterSpacing = "10px";
    overlay.appendChild(title);

    const optionsContainer = document.createElement('div');
    optionsContainer.id = 'menu-options-container';
    optionsContainer.style.display = "flex";
    optionsContainer.style.flexDirection = "column";
    optionsContainer.style.gap = "15px";
    optionsContainer.style.width = "200px";
    
    // Obtém as opções ativas para renderização
    const currentOptions = getActiveMenuOptions();

    currentOptions.forEach((opt, index) => {
        const btn = document.createElement('div');
        btn.className = 'menu-option';
        btn.innerText = opt.label; // Usa o label já definido em getActiveMenuOptions
        btn.style = `
            padding: 12px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            text-align: center;
            transition: transform 0.1s;
            border: 2px solid transparent;
            border-radius: 5px;
        `;

        // Suporte para Mouse: Atualiza a seleção ao passar o mouse
        btn.onmouseenter = () => {
            menuSelectedIndex = index;
            updateMenuVisuals();
        };

        // Suporte para Mouse: Executa a ação ao clicar
        btn.onclick = (e) => {
            e.stopPropagation();
            try {
                opt.action();
            } catch (error) {
                console.error("Menu: Erro ao executar ação do menu via clique:", error);
            }
        };

        optionsContainer.appendChild(btn);
    });

    overlay.appendChild(optionsContainer);
    document.body.appendChild(overlay);
    updateMenuVisuals();
}

function updateMenuVisuals() {
    const elements = document.querySelectorAll('.menu-option');
    elements.forEach((el, index) => {
        if (index === menuSelectedIndex) {
            el.style.backgroundColor = "white";
            el.style.color = "black";
            el.style.border = "2px solid #fff";
            el.style.transform = "scale(1.1)";
        } else {
            el.style.backgroundColor = "rgba(255,255,255,0.1)";
            el.style.color = "white";
            el.style.border = "2px solid transparent";
            el.style.transform = "scale(1.0)";
        }
    });
}

function removeMenuUI() {
    const overlay = document.getElementById('pause-menu-overlay');
    if (overlay) overlay.remove();
}

