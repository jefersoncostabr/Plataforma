/**
 * Gerenciador do Menu de Pause
 */
console.log("Menu: Arquivo menu.js carregado e inicializado com sucesso.");

window.isMenuOpen = false;
let menuSelectedIndex = 0;

const menuOptions = [
    { label: "RETORNAR", action: () => window.togglePauseMenu() },
    { label: "SKILLS", action: () => { window.togglePauseMenu(); window.toggleSkillMenu(); } },
    { label: "REINICIAR", action: () => { window.togglePauseMenu(); if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo(); } }
];

window.togglePauseMenu = () => {
    console.log("Menu: togglePauseMenu executado. Estado anterior (aberto?):", window.isMenuOpen);

    // Se o menu de skills estiver aberto, o Esc fecha as skills e RETORNA AO MENU
    if (window.isSkillMenuOpen) {
        console.log("Menu: Retornando das skills para o menu de pause.");
        if (typeof fecharMenuSkillsUI === 'function') fecharMenuSkillsUI();
        window.isSkillMenuOpen = false;
        
        window.isMenuOpen = true;
        menuSelectedIndex = 0;
        renderMenuUI();
        window.addEventListener('keydown', handleMenuInput);
        return;
    }

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
    
    // Navegação (Setas e WASD)
    if (key === 'arrowup' || key === 'w') {
        menuSelectedIndex = (menuSelectedIndex - 1 + menuOptions.length) % menuOptions.length;
        updateMenuVisuals();
    } else if (key === 'arrowdown' || key === 's') {
        menuSelectedIndex = (menuSelectedIndex + 1) % menuOptions.length;
        updateMenuVisuals();
    } 
    // Seleção (Enter ou Espaço)
    else if (key === 'enter' || key === ' ') {
        e.preventDefault();
        menuOptions[menuSelectedIndex].action();
    }
}

function renderMenuUI() {
    const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
    if (!palco) {
        console.error("Menu: Não foi possível encontrar o container do jogo (#game-stage ou #jogo-container) para renderizar a interface.");
        return;
    }

    const rect = palco.getBoundingClientRect();
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
    title.innerText = "PAUSE";
    title.style.marginBottom = "30px";
    title.style.letterSpacing = "10px";
    overlay.appendChild(title);

    const optionsContainer = document.createElement('div');
    optionsContainer.id = 'menu-options-container';
    optionsContainer.style.display = "flex";
    optionsContainer.style.flexDirection = "column";
    optionsContainer.style.gap = "15px";
    optionsContainer.style.width = "200px";

    menuOptions.forEach((opt, index) => {
        const btn = document.createElement('div');
        btn.className = 'menu-option';
        btn.innerText = opt.label;
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