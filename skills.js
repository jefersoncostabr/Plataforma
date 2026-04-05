/**
 * Gerenciador da Árvore de Habilidades (Skill Tree)
 */

window.playerSkills = []; 
window.isSkillMenuOpen = false;
window.playerXP = 0;
window.skillPoints = 0;
window.skillsData = null;

// Funções globais de gerenciamento
window.ganharXP = (quantidade = 1) => {
    const xpAnterior = window.playerXP;
    window.playerXP += quantidade;

    // Calcula se o jogador atingiu um novo patamar de 5 XP
    const novosPontos = Math.floor(window.playerXP / 5) - Math.floor(xpAnterior / 5);
    
    if (novosPontos > 0) {
        window.skillPoints += novosPontos;
        // console.log(`Sistema: +${novosPontos} Ponto(s) de Skill obtido(s)! Total: ${window.skillPoints}`);
    }

    // console.log(`XP Ganho: +${quantidade}. Total: ${window.playerXP}`);
};

/**
 * Carrega os dados do JSON sem sobrescrever o progresso atual do jogador,
 * a menos que seja forçado (como no reset por morte).
 */
window.carregarDadosSkills = async (forçarReset = false) => {
    try {
        const resposta = await fetch('skillsData.json');
        const dados = await resposta.json();
        window.skillsData = dados.skills;

        if (forçarReset || window.playerSkills.length === 0) {
            window.playerXP = dados.playerStats.xp;
            window.skillPoints = dados.playerStats.skillPoints;
            window.playerSkills = dados.playerStats.acquired || [];
        }

        if (typeof window.aplicarEfeitosSkills === 'function') window.aplicarEfeitosSkills();
    } catch (e) {
        window.playerXP = 0;
        window.skillPoints = 0;
        window.playerSkills = [];
    }
};

window.resetarProgressoParaJson = async () => {
    await window.carregarDadosSkills(true);
};

window.toggleSkillMenu = async () => {
    // Se o jogo já estiver pausado por outro motivo, não abre as skills
    if (window.isPaused && !window.isSkillMenuOpen) {
        console.warn("SkillTree: Não é possível abrir o menu enquanto o jogo está pausado pelo sistema.");
        return;
    }

    // Carrega os dados do JSON se ainda não foram carregados
    if (!window.skillsData) {
        await window.carregarDadosSkills(false);
    }

    window.isSkillMenuOpen = !window.isSkillMenuOpen;
    
    // Utiliza a lógica de pausa já existente no jogo
    if (typeof window.togglePause === 'function') {
        window.togglePause();
    }

    if (window.isSkillMenuOpen) {
        // console.log("SkillTree: Abrindo menu de habilidades...");
        abrirMenuSkillsUI();
    } else {
        // console.log("SkillTree: Fechando menu de habilidades...");
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

    // Obtém as coordenadas e o tamanho real do palco na tela
    const rect = palco.getBoundingClientRect();
    const target = document.body;

    const overlay = document.createElement('div');
    overlay.id = 'skill-tree-overlay';
    overlay.style = `
        position: fixed; 
        top: ${rect.top}px; left: ${rect.left}px; 
        width: ${rect.width}px; height: ${rect.height}px;
        background: rgba(0, 0, 0, 0.9); z-index: 9999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        pointer-events: all; box-sizing: border-box; overflow: hidden;
        border-radius: 4px;
    `;

    const container = document.createElement('div');
    // Ajustamos o container para caber dentro do palco caso a escala seja pequena
    container.style = `
        position: relative; 
        width: 90%; max-width: 550px; 
        height: 90%; max-height: 450px; 
        background: #1a1a1a; border: 3px solid #444; border-radius: 12px; 
        box-shadow: 0 0 50px rgba(0,0,0,0.8); margin: auto;
        overflow: hidden;
    `;
    
    const header = document.createElement('div');
    header.style = "text-align: center; padding: 20px 0; border-bottom: 1px solid #333; margin-bottom: 20px; background: #222; border-radius: 9px 9px 0 0; width: 100%; box-sizing: border-box;";
    header.innerHTML = `
        <h2 style="margin: 0 0 10px 0; letter-spacing: 2px; text-transform: uppercase;">Habilidades</h2>
        <p style="margin: 5px 0; font-size: 18px;">XP: <span style="color: #ffd700;">${window.playerXP}</span> | Pontos: <span style="color: #00ff00;">${window.skillPoints}</span></p>
        <small style="color: #888; text-transform: uppercase; font-size: 10px;">Pressione [ ENTER ] para voltar ao jogo</small>
    `;
    container.appendChild(header);

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
    const startY = 140; // Espaço reservado para o cabeçalho interno

    Object.keys(window.skillsData).forEach(skillId => {
        const skill = window.skillsData[skillId];
        const btn = document.createElement('button');
        const jaPossui = window.playerSkills.includes(skillId);
        const paiPossui = skill.parent === null || window.playerSkills.includes(skill.parent);
        
        // Cálculo de posição dinâmica
        const depth = getSkillDepth(skillId, window.skillsData);
        const siblings = levels[depth];
        const indexInLevel = siblings.indexOf(skillId);
        
        // Distribui os botões do mesmo nível proporcionalmente à largura (550px)
        const x = (550 / (siblings.length + 1)) * (indexInLevel + 1);
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
                // console.log(`Skill Adquirida: ${skill.nome}. Pontos restantes: ${window.skillPoints}`);
                
                // Executa a lógica da skill recém-adquirida
                if (typeof window.aplicarEfeitosSkills === 'function') window.aplicarEfeitosSkills();

                // Atualiza a UI imediatamente
                fecharMenuSkillsUI();
                abrirMenuSkillsUI();
            };
            btn.onmouseover = () => btn.style.background = '#555';
            btn.onmouseout = () => btn.style.background = '#333';
        }

        container.appendChild(btn);
    });

    container.appendChild(header);
    overlay.appendChild(container);
    target.appendChild(overlay);
}

function fecharMenuSkillsUI() {
    const overlay = document.getElementById('skill-tree-overlay');
    if (overlay) overlay.remove();
}