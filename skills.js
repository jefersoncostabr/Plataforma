/**
 * Gerenciador da Árvore de Habilidades (Skill Tree)
 */

window.playerSkills = []; 
window.isSkillMenuOpen = false;
window.playerXP = 0;
window.skillPoints = 0;
window.skillsData = null;

window.toggleSkillMenu = async () => {
    // Se o jogo já estiver pausado por outro motivo, não abre as skills
    if (window.isPaused && !window.isSkillMenuOpen) {
        console.warn("SkillTree: Não é possível abrir o menu enquanto o jogo está pausado pelo sistema.");
        return;
    }

    // Carrega os dados do JSON se ainda não foram carregados
    if (!window.skillsData) {
        try {
            const resposta = await fetch('skillsData.json');
            const dados = await resposta.json();
            window.skillsData = dados.skills;
            window.playerXP = dados.playerStats.xp;
            window.skillPoints = dados.playerStats.skillPoints;
            window.playerSkills = dados.playerStats.acquired || [];
        } catch (e) {
            console.error("Erro ao carregar skillsData.json", e);
            return;
        }
    }

    window.isSkillMenuOpen = !window.isSkillMenuOpen;
    window.isPaused = window.isSkillMenuOpen;

    if (window.isSkillMenuOpen) {
        console.log("SkillTree: Abrindo menu de habilidades...");
        abrirMenuSkillsUI();
    } else {
        console.log("SkillTree: Fechando menu de habilidades...");
        fecharMenuSkillsUI();
    }
};

function getSkillDepth(skillId, data) {
    let depth = 0;
    let current = data[skillId];
    while (current && current.parent) {
        depth++;
        current = data[current.parent];
    }
    return depth;
}

function abrirMenuSkillsUI() {
    const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
    if (!palco) return;

    const overlay = document.createElement('div');
    overlay.id = 'skill-tree-overlay';
    overlay.style = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.9); z-index: 2000;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white; font-family: 'Arial', sans-serif;
    `;

    const container = document.createElement('div');
    container.style = "position: relative; width: 500px; height: 350px; background: #1a1a1a; border: 3px solid #444; border-radius: 10px;";
    
    const header = document.createElement('div');
    header.style = "text-align: center; margin-bottom: 10px;";
    header.innerHTML = `
        <p style="margin: 5px 0;">XP: <b>${window.playerXP}</b> | Pontos de Skill: <b style="color: #00ff00;">${window.skillPoints}</b></p>
        <small>(Clique para adquirir | Tecla 6 para Sair)</small>
    `;
    overlay.appendChild(header);

    // Agrupar skills por profundidade para calcular o X dinamicamente
    const levels = {};
    Object.keys(window.skillsData).forEach(id => {
        const depth = getSkillDepth(id, window.skillsData);
        if (!levels[depth]) levels[depth] = [];
        levels[depth].push(id);
    });

    // Ordenar IDs em cada nível para manter a ordem consistente (a antes de b, 1 antes de 2)
    Object.keys(levels).forEach(d => levels[d].sort());

    const vGap = 90; // Espaço vertical entre níveis
    const startY = 40;

    Object.keys(window.skillsData).forEach(skillId => {
        const skill = window.skillsData[skillId];
        const btn = document.createElement('button');
        const jaPossui = window.playerSkills.includes(skillId);
        const paiPossui = skill.parent === null || window.playerSkills.includes(skill.parent);
        
        // Cálculo de posição dinâmica
        const depth = getSkillDepth(skillId, window.skillsData);
        const siblings = levels[depth];
        const indexInLevel = siblings.indexOf(skillId);
        
        // Distribui os botões do mesmo nível proporcionalmente à largura (500px)
        const x = (500 / (siblings.length + 1)) * (indexInLevel + 1);
        const y = startY + (depth * vGap);

        // Disponível se o pai estiver liberado e o jogador tiver pontos
        const disponivel = paiPossui && window.skillPoints > 0;

        btn.innerText = skill.nome;
        btn.style = `
            position: absolute; left: ${x}px; top: ${y}px;
            width: 90px; height: 50px; transform: translateX(-50%);
            cursor: ${disponivel && !jaPossui ? 'pointer' : 'default'};
            border: 2px solid ${jaPossui ? '#00ff00' : (disponivel ? '#fff' : '#444')};
            background: ${jaPossui ? '#004400' : (disponivel ? '#333' : '#111')};
            color: ${jaPossui ? '#00ff00' : (disponivel ? '#fff' : '#666')};
            font-weight: bold; border-radius: 5px; transition: 0.2s;
        `;

        if (disponivel && !jaPossui) {
            btn.onclick = () => {
                window.skillPoints -= 1;
                window.playerSkills.push(skillId);
                console.log(`Skill Adquirida: ${skill.nome}. Pontos restantes: ${window.skillPoints}`);
                
                // Atualiza a UI imediatamente
                fecharMenuSkillsUI();
                abrirMenuSkillsUI();
            };
            btn.onmouseover = () => btn.style.background = '#555';
            btn.onmouseout = () => btn.style.background = '#333';
        }

        container.appendChild(btn);
    });

    overlay.appendChild(container);
    palco.appendChild(overlay);
}

function fecharMenuSkillsUI() {
    const overlay = document.getElementById('skill-tree-overlay');
    if (overlay) overlay.remove();
}