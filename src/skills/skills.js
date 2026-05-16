/**
 * Gerenciador da Árvore de Habilidades (Skill Tree)
 */

window.playerSkills = []; 
window.isSkillMenuOpen = false;
window.playerXP = 0;
window.skillPoints = 0;
window.skillsData = null;
window.SKILLS = Object.freeze({
    VIDA: 'Vida',
    ATIRADOR: 'Atirador',
    KICKBOXING: 'kickboxing',
    DASH: 'Dash',
    DROPAR: 'Dropar',
    VISAO: 'Visão',
    AIRDROP: 'Airdrop',
    VENDER: 'Vender',
    SALTO: 'Salto',
    RESGATE: 'Resgate',
    KNOCKOUT: 'Knockout',
    PRECISAO: 'Precisão',
    SUPERDASH: 'SuperDash',
    ADESTRAMENTO: 'Adestramento'
});
window.temSkill = (nomeSkill) => Array.isArray(window.playerSkills) && window.playerSkills.includes(String(nomeSkill || ''));
const SKILLS_STORAGE_KEY = 'plataformaSkills';
window.salvarProgressoSkills = salvarProgressoSkills;
window.carregarProgressoSkillsSalvo = carregarProgressoSkillsSalvo;

function carregarProgressoSkillsSalvo() {
    try {
        const raw = localStorage.getItem(SKILLS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn('SkillTree: falha ao ler progresso salvo.', error);
        return null;
    }
}

function basePermitePersistirSkills() {
    if (typeof window.obterConfigRenascimentoBase !== 'function') return false;
    const craft = window.obterConfigRenascimentoBase();
    const modo = String(craft?.modoRenascimento || '').trim().toLowerCase();
    return !!(craft && (modo === 'memoria' || modo === 'ambos'));
}

function salvarProgressoSkills() {
    try {
        if (!basePermitePersistirSkills()) {
            localStorage.removeItem(SKILLS_STORAGE_KEY);
            return false;
        }

        const estado = {
            playerXP: Number(window.playerXP || 0),
            skillPoints: Number(window.skillPoints || 0),
            acquired: [...new Set((Array.isArray(window.playerSkills) ? window.playerSkills : [])
                .map((skill) => String(skill || ''))
                .filter(Boolean))],
            salvoEm: Date.now()
        };

        localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(estado));
        return true;
    } catch (error) {
        console.warn('SkillTree: falha ao salvar progresso.', error);
        return false;
    }
}

let selectedSkillId = null;
let skillsLevelMap = {}; 
let skillButtonsMap = {};

function normalizarEstruturaSkills(skills = {}) {
    if (!skills || typeof skills !== 'object') return {};

    const entries = Object.entries(skills);
    const usaFormatoAntigo = entries.some(([, valor]) => valor && typeof valor === 'object' && ('nome' in valor || 'parent' in valor));

    if (!usaFormatoAntigo) {
        return entries.reduce((acc, [nome, parent]) => {
            acc[nome] = {
                nome,
                parent: parent == null ? null : String(parent)
            };
            return acc;
        }, {});
    }

    const idParaNome = entries.reduce((acc, [id, skill]) => {
        if (skill && typeof skill === 'object') {
            acc[id] = String(skill.nome || id);
        }
        return acc;
    }, {});

    return entries.reduce((acc, [id, skill]) => {
        if (!skill || typeof skill !== 'object') return acc;

        const nome = idParaNome[id] || String(skill.nome || id);
        const parent = skill.parent == null ? null : (idParaNome[skill.parent] || String(skill.parent));

        acc[nome] = { nome, parent };
        return acc;
    }, {});
}

function normalizarSkillsAdquiridas(acquired = [], skillsNormalizadas = {}, skillsOriginais = {}) {
    if (!Array.isArray(acquired)) return [];

    const nomesValidos = new Set(Object.keys(skillsNormalizadas));
    const idParaNome = Object.entries(skillsOriginais).reduce((acc, [id, skill]) => {
        if (skill && typeof skill === 'object' && skill.nome) {
            acc[id] = String(skill.nome);
        }
        return acc;
    }, {});

    return [...new Set(acquired
        .map((skill) => idParaNome[skill] || skill)
        .filter((skill) => nomesValidos.size === 0 || nomesValidos.has(skill)))];
}

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

    if (typeof window.salvarProgressoSkills === 'function') {
        window.salvarProgressoSkills();
    }

    // console.log(`XP Ganho: +${quantidade}. Total: ${window.playerXP}`);
};

/**
 * Carrega os dados do JSON sem sobrescrever o progresso atual do jogador,
 * a menos que seja forçado (como no reset por morte).
 */
window.carregarDadosSkills = async (forçarReset = false) => {
    try {
        const resposta = await fetch('../../config/skills-dados.json?v=20260417-dash-skill');
        const dados = await resposta.json();
        const skillsOriginais = dados.skills || {};
        const skillsNormalizadas = normalizarEstruturaSkills(skillsOriginais);
        const podeUsarProgressoSalvo = !forçarReset && basePermitePersistirSkills();
        if (!podeUsarProgressoSalvo) {
            localStorage.removeItem(SKILLS_STORAGE_KEY);
        }
        const progressoSalvo = podeUsarProgressoSalvo ? carregarProgressoSkillsSalvo() : null;
        window.skillsData = skillsNormalizadas;

        if (progressoSalvo && typeof progressoSalvo === 'object') {
            window.playerXP = Number(progressoSalvo.playerXP ?? progressoSalvo.xp ?? 0);
            window.skillPoints = Number(progressoSalvo.skillPoints ?? 0);
            window.playerSkills = normalizarSkillsAdquiridas(
                progressoSalvo.acquired || progressoSalvo.playerSkills || [],
                skillsNormalizadas,
                skillsOriginais
            );
        } else if (forçarReset || window.playerSkills.length === 0) {
            window.playerXP = Number(dados.playerStats?.xp || 0);
            window.skillPoints = Number(dados.playerStats?.skillPoints || 0);
            window.playerSkills = normalizarSkillsAdquiridas(dados.playerStats?.acquired || [], skillsNormalizadas, skillsOriginais);
        } else {
            window.playerXP = Number(window.playerXP || 0);
            window.skillPoints = Number(window.skillPoints || 0);
            window.playerSkills = normalizarSkillsAdquiridas(window.playerSkills, skillsNormalizadas, skillsOriginais);
        }

        if (typeof window.aplicarEfeitosSkills === 'function') window.aplicarEfeitosSkills();
        salvarProgressoSkills();
    } catch (e) {
        const progressoSalvo = carregarProgressoSkillsSalvo();
        if (progressoSalvo && typeof progressoSalvo === 'object') {
            window.playerXP = Number(progressoSalvo.playerXP ?? progressoSalvo.xp ?? 0);
            window.skillPoints = Number(progressoSalvo.skillPoints ?? 0);
            window.playerSkills = Array.isArray(progressoSalvo.acquired || progressoSalvo.playerSkills)
                ? [...new Set((progressoSalvo.acquired || progressoSalvo.playerSkills).map((skill) => String(skill || '')).filter(Boolean))]
                : [];
        } else {
            window.playerXP = 0;
            window.skillPoints = 0;
            window.playerSkills = [];
        }

        if (typeof window.aplicarEfeitosSkills === 'function') window.aplicarEfeitosSkills();
    }
};

window.resetarProgressoParaJson = async () => {
    await window.carregarDadosSkills(true);
};

window.toggleSkillMenu = async () => {
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
        window.addEventListener('keydown', handleSkillMenuInput);
        abrirMenuSkillsUI();
    } else {
        // console.log("SkillTree: Fechando menu de habilidades...");
        window.removeEventListener('keydown', handleSkillMenuInput);
        fecharMenuSkillsUI();
    }
};

function handleSkillMenuInput(e) {
    if (!window.isSkillMenuOpen || !window.skillsData) return;

    const key = e.key.toLowerCase();
    let depth = getSkillDepth(selectedSkillId, window.skillsData);
    let index = skillsLevelMap[depth].indexOf(selectedSkillId);

    // Navegação Horizontal (A/D ou Setas)
    if (key === 'arrowleft' || key === 'a') {
        index = (index - 1 + skillsLevelMap[depth].length) % skillsLevelMap[depth].length;
    } else if (key === 'arrowright' || key === 'd') {
        index = (index + 1) % skillsLevelMap[depth].length;
    } 
    // Navegação Vertical (W/S ou Setas)
    else if (key === 'arrowup' || key === 'w') {
        const prevDepth = depth - 1;
        if (skillsLevelMap[prevDepth]) {
            depth = prevDepth;
            index = Math.min(index, skillsLevelMap[depth].length - 1);
        }
    } else if (key === 'arrowdown' || key === 's') {
        const nextDepth = depth + 1;
        if (skillsLevelMap[nextDepth]) {
            depth = nextDepth;
            index = Math.min(index, skillsLevelMap[depth].length - 1);
        }
    }
    // Ação de Compra (Espaço ou Enter)
    else if (key === ' ' || key === 'enter') {
        e.preventDefault();
        const btn = skillButtonsMap[selectedSkillId];
        if (btn && btn.onclick) {
            btn.onclick();
        }
        return;
    } else {
        return; // Ignora outras teclas
    }

    selectedSkillId = skillsLevelMap[depth][index];
    atualizarVisualSelecaoSkills();
}

function atualizarVisualSelecaoSkills() {
    Object.keys(skillButtonsMap).forEach(id => {
        const btn = skillButtonsMap[id];
        const isSelected = (id === selectedSkillId);
        btn.style.boxShadow = isSelected ? "0 0 15px #fff, inset 0 0 10px #fff" : "none";
        btn.style.transform = isSelected ? "translateX(-50%) scale(1.15)" : "translateX(-50%) scale(1.0)";
        btn.style.zIndex = isSelected ? "10" : "1";
    });
}

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
    const viewport = document.getElementById('jogo-container') || document.getElementById('game-stage')?.parentElement;
    if (!viewport) return;

    // Obtém as coordenadas e o tamanho real do viewport (tela visível)
    const rect = viewport.getBoundingClientRect();
    const target = document.body;

    skillsLevelMap = {};
    skillButtonsMap = {};
    const buttonPositions = {};

    const overlay = document.createElement('div');
    overlay.id = 'skill-tree-overlay';
    overlay.style = `
        position: fixed; 
        top: ${rect.top}px; left: ${rect.left}px; 
        width: ${rect.width}px; height: ${rect.height}px;
        background: var(--cor-fundo-overlay); z-index: 9999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        pointer-events: all; box-sizing: border-box; overflow: hidden;
        border-radius: 4px;
    `;

    const container = document.createElement('div');
    // Ajustamos o container para caber dentro do palco caso a escala seja pequena
    container.style = `
        position: relative; 
        width: 95%; max-width: 800px; 
        height: 90%; max-height: 550px; 
        background: #1a1a1a; border: 3px solid #444; border-radius: 12px; 
        box-shadow: 0 0 50px rgba(0,0,0,0.8); margin: auto;
        overflow-y: auto; overflow-x: hidden;
    `;
    
    const header = document.createElement('div');
    header.style = "text-align: center; padding: 20px 0; border-bottom: 1px solid #333; margin-bottom: 20px; background: #222; border-radius: 9px 9px 0 0; width: 100%; box-sizing: border-box;";
    header.innerHTML = `
        <h2 style="margin: 0 0 10px 0; letter-spacing: 2px; text-transform: uppercase;">Habilidades</h2>
        <p style="margin: 5px 0; font-size: 18px;">XP: <span style="color: #ffd700;">${window.playerXP}</span> | Pontos: <span style="color: #00ff00;">${window.skillPoints}</span></p>
        <small style="color: #888; text-transform: uppercase; font-size: 10px;">WASD: Navegar • ENTER/ESPAÇO: Comprar • ESC: Menu</small>
    `;
    container.appendChild(header);

    // Agrupar skills por profundidade para calcular o X dinamicamente
    const levels = {};
    Object.keys(window.skillsData).forEach(id => {
        const depth = getSkillDepth(id, window.skillsData);
        if (!levels[depth]) levels[depth] = [];
        levels[depth].push(id);
    });

    // Ordena por grupo de pai, preservando a ordem do JSON para controlar melhor o layout visual da árvore.
    const ordemOrigemSkills = Object.keys(window.skillsData);
    Object.keys(levels).forEach((d) => {
        const depth = Number(d);
        levels[d].sort((a, b) => {
            if (depth === 0) {
                return a.localeCompare(b, 'pt-BR');
            }

            const parentA = window.skillsData[a]?.parent ?? '';
            const parentB = window.skillsData[b]?.parent ?? '';
            const nivelPais = levels[depth - 1] || [];
            const parentIndexA = nivelPais.indexOf(parentA);
            const parentIndexB = nivelPais.indexOf(parentB);

            if (parentIndexA !== parentIndexB) {
                return parentIndexA - parentIndexB;
            }

            return ordemOrigemSkills.indexOf(a) - ordemOrigemSkills.indexOf(b);
        });
    });
    skillsLevelMap = levels;

    // Seleciona a primeira skill (raiz) se nada estiver selecionado
    if (!selectedSkillId || !window.skillsData[selectedSkillId]) {
        selectedSkillId = levels[0][0];
    }

    const containerWidth = 800;
    const vGap = 110; // Espaço vertical entre níveis aumentado para melhor clareza
    const startY = 160; // Posição inicial Y ajustada para o novo cabeçalho

    Object.keys(window.skillsData).forEach(skillId => {
        // Store button positions during creation
        const skill = window.skillsData[skillId];
        const btn = document.createElement('button');
        const jaPossui = window.playerSkills.includes(skillId);
        const paiPossui = skill.parent === null || window.playerSkills.includes(skill.parent);
        
        // Cálculo de posição dinâmica
        const depth = getSkillDepth(skillId, window.skillsData);
        const siblings = levels[depth];
        const indexInLevel = siblings.indexOf(skillId);
        
        // Distribui os botões proporcionalmente à nova largura de 800px
        const x = (containerWidth / (siblings.length + 1)) * (indexInLevel + 1);
        const y = startY + (depth * vGap);
        buttonPositions[skillId] = { x: x, y: y, width: 90, height: 50 };

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
                if (typeof window.salvarProgressoSkills === 'function') window.salvarProgressoSkills();

                // Atualiza a UI imediatamente
                fecharMenuSkillsUI();
                abrirMenuSkillsUI();
            };
            btn.onmouseover = () => btn.style.background = '#555';
            btn.onmouseout = () => btn.style.background = '#333';
        }

        skillButtonsMap[skillId] = btn;
        container.appendChild(btn);
    });

    // Draw connection lines after all buttons are created and their positions are known
    Object.keys(window.skillsData).forEach(skillId => {
        const skill = window.skillsData[skillId];
        if (skill.parent) {
            const parentPos = buttonPositions[skill.parent];
            const childPos = buttonPositions[skillId];

            if (parentPos && childPos) {
                const parentCenterX = parentPos.x;
                const parentCenterY = parentPos.y + parentPos.height / 2;

                const childCenterX = childPos.x;
                const childCenterY = childPos.y + childPos.height / 2;

                const dx = childCenterX - parentCenterX;
                const dy = childCenterY - parentCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;

                const line = document.createElement('div');
                line.style.position = 'absolute';
                line.style.backgroundColor = '#444'; // Darker grey line for better contrast
                line.style.height = '2px'; // Thin line
                line.style.width = `${distance}px`;
                line.style.left = `${parentCenterX}px`;
                line.style.top = `${parentCenterY}px`;
                line.style.transformOrigin = '0 50%'; // Rotate around the parent's center
                line.style.transform = `rotate(${angle}deg)`;
                line.style.zIndex = '0'; // Behind the buttons
                container.appendChild(line);
            }
        }
    });

    overlay.appendChild(container);
    target.appendChild(overlay);
    atualizarVisualSelecaoSkills();
}

function fecharMenuSkillsUI() {
    const overlay = document.getElementById('skill-tree-overlay');
    if (overlay) overlay.remove();
}
