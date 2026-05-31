/**
 * Gerenciador da Árvore de Habilidades (Skill Tree)
 */

window.playerSkills = []; 
window.isSkillMenuOpen = false;
window.playerXP = 0;
window.skillPoints = 0;
window.skillsData = null;

// Rastreia se a função obterConfigRenascimentoBase já ficou disponível
let baseConfigFunctionAvailable = false;

// Verifica periodicamente se a função ficou disponível
const checkBaseConfigInterval = setInterval(() => {
    if (typeof window.obterConfigRenascimentoBase === 'function' && !baseConfigFunctionAvailable) {
        baseConfigFunctionAvailable = true;

        clearInterval(checkBaseConfigInterval);
        
        // Tenta fazer salvamento se houver dados pendentes
        if (window.playerSkills.length > 0 || window.playerXP > 0 || window.skillPoints > 0) {

            if (typeof window.salvarProgressoSkills === 'function') {
                window.salvarProgressoSkills();
            }
        }
    }
}, 500); // Verifica a cada 500ms

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
    SLIDE: 'Slide', // Registro da Skill: Deve ser idêntico à chave definida no skills-dados.json
    RESGATE: 'Resgate',
    KNOCKOUT: 'Knockout',
    PRECISAO: 'Precisão',
    SUPERDASH: 'SuperDash',
    ADESTRAMENTO: 'Adestramento',
    SALTITAR: 'Saltitar',
    GARRA: 'Garra',
    GARRA2: 'Garra 2'
});
window.temSkill = (nomeSkill) => Array.isArray(window.playerSkills) && window.playerSkills.includes(String(nomeSkill || ''));
const SKILLS_STORAGE_KEY = 'plataformaSkills';
window.salvarProgressoSkills = salvarProgressoSkills;
window.carregarProgressoSkillsSalvo = carregarProgressoSkillsSalvo;

function obterSlotAtivoId() {
    if (window.SaveSlots && typeof window.SaveSlots.getActiveSlotId === 'function') {
        return window.SaveSlots.getActiveSlotId();
    }
    return 'slot1';
}

function obterChaveSkillsStorage() {
    if (window.SaveSlots && typeof window.SaveSlots.getStorageKey === 'function') {
        return window.SaveSlots.getStorageKey(SKILLS_STORAGE_KEY, obterSlotAtivoId());
    }
    return SKILLS_STORAGE_KEY;
}

function carregarProgressoSkillsSalvo() {
    try {
        const raw = localStorage.getItem(obterChaveSkillsStorage());
        if (raw) {
            const parsed = JSON.parse(raw);

            return parsed;
        } else {

            return null;
        }
    } catch (error) {

        return null;
    }
}

function obterEstadoPersistenciaSkills() {
    if (typeof window.obterConfigRenascimentoBase !== 'function') {

        return { disponivel: false, permite: null, craft: null, modo: null };
    }

    const craft = window.obterConfigRenascimentoBase();
    const modo = String(craft?.modoRenascimento || '').trim().toLowerCase();
    const permite = !!(craft && (modo === 'memoria' || modo === 'ambos'));

    if (!craft) {

        return { disponivel: true, permite: false, craft: null, modo };
    }







    return { disponivel: true, permite, craft, modo };
}

function basePermitePersistirSkills() {
    return !!obterEstadoPersistenciaSkills().permite;
}

function salvarProgressoSkills() {
    try {
        // Verifica se a função está disponível
        const funcaoDisponivel = typeof window.obterConfigRenascimentoBase === 'function';


        const estadoPersistencia = obterEstadoPersistenciaSkills();
        if (!estadoPersistencia.disponivel) {

            return false; // This is a valid debug log, keeping it.
        }

        if (!estadoPersistencia.permite) {

            localStorage.removeItem(obterChaveSkillsStorage());
            return false;
        }

        const slotId = obterSlotAtivoId();
        let slotDifficulty = String(window.gameDifficulty || 'normal').toLowerCase();
        if (window.SaveSlots && typeof window.SaveSlots.getSlotDifficulty === 'function') {
            slotDifficulty = window.SaveSlots.getSlotDifficulty(slotId);
        }

        const estado = {
            playerXP: Number(window.playerXP || 0),
            skillPoints: Number(window.skillPoints || 0),
            acquired: [...new Set((Array.isArray(window.playerSkills) ? window.playerSkills : [])
                .map((skill) => String(skill || ''))
                .filter(Boolean))],
            slotDifficulty,
            salvoEm: Date.now()
        };

        if (window.SaveSlots && typeof window.SaveSlots.setSlotDifficulty === 'function') {
            window.SaveSlots.setSlotDifficulty(slotId, slotDifficulty);
        }


        localStorage.setItem(obterChaveSkillsStorage(), JSON.stringify(estado)); // This is a valid debug log, keeping it.
        return true;
    } catch (error) {
        // console.error('[SKILL SAVE] ✗ Falha ao salvar progresso:', error);
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
    const acquiredNormalizado = acquired.map((skill) => String(skill || '')).filter(Boolean);
    const idParaNome = Object.entries(skillsOriginais).reduce((acc, [id, skill]) => {
        if (skill && typeof skill === 'object' && skill.nome) {
            acc[id] = String(skill.nome);
        }
        return acc;
    }, {});

    return [...new Set(acquiredNormalizado
        .map((skill) => {
            const convertido = idParaNome[skill] || skill;
            if (convertido === 'Garra de Resgate BB') return 'Garra 2';
            return convertido;
        })
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

    }

    if (typeof window.salvarProgressoSkills === 'function') {
        window.salvarProgressoSkills();
    }
};

/**
 * Carrega os dados do JSON sem sobrescrever o progresso atual do jogador,
 * a menos que seja forçado (como no reset por morte).
 */
window.carregarDadosSkills = async (forçarReset = false) => {
    try {

        const resposta = await fetch('../../config/skills-dados.json?v=20260522-skill-garra-rename');
        const dados = await resposta.json();
        const skillsOriginais = dados.skills || {};
        const skillsNormalizadas = normalizarEstruturaSkills(skillsOriginais);
        const estadoPersistencia = obterEstadoPersistenciaSkills();
        const progressoSalvo = carregarProgressoSkillsSalvo();
        window.skillsData = skillsNormalizadas;

        if (!forçarReset && progressoSalvo && typeof progressoSalvo === 'object') { // This is a valid debug log, keeping it.

            if (progressoSalvo.slotDifficulty) {
                window.gameDifficulty = String(progressoSalvo.slotDifficulty).toLowerCase();
            }

            window.playerXP = Number(progressoSalvo.playerXP ?? progressoSalvo.xp ?? 0);
            window.skillPoints = Number(progressoSalvo.skillPoints ?? 0);
            window.playerSkills = normalizarSkillsAdquiridas(
                progressoSalvo.acquired || progressoSalvo.playerSkills || [],
                skillsNormalizadas,
                skillsOriginais
            ); // This is a valid debug log, keeping it.
        } else {
            // Se não houver progresso salvo ou se for um reset forçado, carregamos obrigatoriamente
            // os valores iniciais do JSON de dados, garantindo que o progresso não seja compartilhado entre slots.
            window.playerXP = Number(dados.playerStats?.xp || 0);
            window.skillPoints = Number(dados.playerStats?.skillPoints || 0); // This is a valid debug log, keeping it.
            window.playerSkills = normalizarSkillsAdquiridas(dados.playerStats?.acquired || [], skillsNormalizadas, skillsOriginais);
        }


        if (typeof window.aplicarEfeitosSkills === 'function') window.aplicarEfeitosSkills();

        if (estadoPersistencia.disponivel) {
            salvarProgressoSkills();
        } else {

        }
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
    const estadoPersistencia = obterEstadoPersistenciaSkills();
    await window.carregarDadosSkills(!estadoPersistencia.permite);
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
        if (isSelected) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
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

    const rect = viewport.getBoundingClientRect();
    const target = document.body;

    skillsLevelMap = {};
    skillButtonsMap = {};
    const buttonPositions = {};

    const overlay = document.createElement('div');
    overlay.id = 'skill-tree-overlay';
    overlay.className = 'skill-tree-overlay';
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'menu-close-button';
    closeButton.textContent = 'X';
    closeButton.setAttribute('aria-label', 'Fechar menu de skills');
    closeButton.title = 'Fechar';
    closeButton.onclick = (e) => {
        e.stopPropagation();
        window.toggleSkillMenu();
    };
    overlay.appendChild(closeButton);

    const container = document.createElement('div');
    container.className = 'skill-tree-container';

    const header = document.createElement('div');
    header.className = 'skill-tree-header';
    header.innerHTML = `
        <h2>Habilidades</h2>
        <p>XP: <span style="color: #ffd700;">${window.playerXP}</span> | Pontos: <span style="color: #00ff00;">${window.skillPoints}</span></p>
        <small>WASD: Navegar • ENTER/ESPAÇO: Comprar • ESC: Menu</small>
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
        btn.className = 'skill-tree-btn';
        btn.style.position = 'absolute';
        btn.style.left = `${x}px`;
        btn.style.top = `${y}px`;

        if (jaPossui) {
            btn.classList.add('owned');
        } else if (disponivel) {
            btn.classList.add('available');
            btn.onclick = () => {
                window.skillPoints -= 1;
                window.playerSkills.push(skillId);
                if (typeof window.aplicarEfeitosSkills === 'function') window.aplicarEfeitosSkills();
                if (typeof window.salvarProgressoSkills === 'function') window.salvarProgressoSkills();
                fecharMenuSkillsUI();
                abrirMenuSkillsUI();
            };
        } else {
            btn.classList.add('locked');
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
                line.className = 'skill-tree-line';
                line.style.width = `${distance}px`;
                line.style.left = `${parentCenterX}px`;
                line.style.top = `${parentCenterY}px`;
                line.style.transformOrigin = '0 50%';
                line.style.transform = `rotate(${angle}deg)`;
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
