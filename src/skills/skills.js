/**
 * Gerenciador da Árvore de Habilidades (Skill Tree)
 */

window.playerSkills = []; 
window.isSkillMenuOpen = false;
window.playerXP = 0;
window.skillPoints = 0;
window.skillsData = null;
window.skillDescriptions = {};

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
    TATSUMAKI_SENPUKYAKU: 'Tatsumaki Senpukyaku',
    GARRA: 'Garra',
    GARRA2: 'Garra 2',
    CAOBATENTE: 'Cãobatente'
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
let closeButtonFocused = false;
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
function exibirAnimacaoXP(quantidade) {
    const jogador = document.getElementById('player');
    const camada = document.getElementById('layer-efeitos') || document.getElementById('game-stage');
    if (!jogador || !camada || typeof jogador.animate !== 'function') return;

    const popup = document.createElement('div');
    popup.textContent = `+${quantidade} XP`;
    popup.setAttribute('aria-hidden', 'true');
    popup.style.cssText = [
        'position:absolute',
        `left:${(Number.parseFloat(jogador.style.left) || 0) + jogador.offsetWidth / 2}px`,
        `bottom:${(Number.parseFloat(jogador.style.bottom) || 0) + jogador.offsetHeight + 4}px`,
        'transform:translateX(-50%)',
        'color:#48d1cc',
        'font:900 14px/1 "Segoe UI",sans-serif',
        'letter-spacing:.5px',
        'white-space:nowrap',
        'text-shadow:0 1px 2px #002b2a,0 0 7px rgba(72,209,204,.9)',
        'pointer-events:none',
        'z-index:1'
    ].join(';');
    camada.appendChild(popup);

    const animacao = popup.animate([
        { opacity: 1, transform: 'translate(-50%, 2px) scale(1.08)' },
        { opacity: 1, transform: 'translate(-50%, -3px) scale(1)', offset: 0.15 },
        { opacity: 1, transform: 'translate(-50%, -25px) scale(1)' },
        { opacity: 0, transform: 'translate(-50%, -38px) scale(.96)' }
    ], { duration: 800, easing: 'ease-out', fill: 'forwards' });
    animacao.onfinish = () => popup.remove();
}

window.exibirPerdaVida = () => {
    const jogador = document.getElementById('player');
    const camada = document.getElementById('layer-efeitos') || document.getElementById('game-stage');
    if (!jogador || !camada || typeof jogador.animate !== 'function') return;

    const popup = document.createElement('div');
    popup.textContent = '-♥';
    popup.setAttribute('aria-hidden', 'true');
    popup.style.cssText = [
        'position:absolute',
        `left:${(Number.parseFloat(jogador.style.left) || 0) + jogador.offsetWidth / 2}px`,
        `bottom:${(Number.parseFloat(jogador.style.bottom) || 0) + jogador.offsetHeight + 4}px`,
        'transform:translateX(-50%)',
        'color:#ff3b4d',
        'font:900 21px/1 "Segoe UI",sans-serif',
        'white-space:nowrap',
        'text-shadow:0 1px 2px #300,0 0 7px rgba(255,59,77,.8)',
        'pointer-events:none',
        'z-index:1'
    ].join(';');
    camada.appendChild(popup);

    const animacao = popup.animate([
        { opacity: 0, transform: 'translate(-50%, 5px) scale(.75)' },
        { opacity: 1, transform: 'translate(-50%, -3px) scale(1.15)', offset: 0.2 },
        { opacity: 1, transform: 'translate(-50%, -25px) scale(1)' },
        { opacity: 0, transform: 'translate(-50%, -38px) scale(.95)' }
    ], { duration: 900, easing: 'ease-out', fill: 'forwards' });
    animacao.onfinish = () => popup.remove();
};

window.ganharXP = (quantidade = 1) => {
    quantidade = Number(quantidade) || 0;
    if (quantidade <= 0) return;

    const xpAnterior = window.playerXP;
    window.playerXP += quantidade;
    exibirAnimacaoXP(quantidade);

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

        const resposta = await fetch('../../config/skills-dados.json?v=20261019-airdrop-plus');
        const dados = await resposta.json();
        const skillsOriginais = dados.skills || {};
        const skillsNormalizadas = normalizarEstruturaSkills(skillsOriginais);
        window.skillDescriptions = dados.descricoes && typeof dados.descricoes === 'object'
            ? dados.descricoes
            : {};
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
    
    // [E2] Pausa com dono: ESC duplo ou pause por cima nao dessincroniza.
    if (typeof window.setPausado === 'function') {
        window.setPausado(window.isSkillMenuOpen, 'skills');
    } else if (typeof window.togglePause === 'function') {
        window.togglePause('skills');
    }
    window.TutorialControles?.sincronizarVisibilidade?.();

    if (window.isSkillMenuOpen) {
        // console.log("SkillTree: Abrindo menu de habilidades...");
        window.addEventListener('keydown', handleSkillMenuInput);
        abrirMenuSkillsUI();
    } else {
        // console.log("SkillTree: Fechando menu de habilidades...");
        window.removeEventListener('keydown', handleSkillMenuInput);
        fecharMenuSkillsUI();
        // [FIX B] Snap instantaneo ao fechar skills (mesmo motivo do pause).
        if (typeof window.recolocarCameraNoJogador === 'function') {
            try { window.recolocarCameraNoJogador(); } catch (_) {}
        }
    }
};

function handleSkillMenuInput(e) {
    if (!window.isSkillMenuOpen || !window.skillsData) return;

    const rawKey = String(e.key || '');
    // ESC fecha as skills aqui mesmo (dono do proprio ESC): sem isso o evento
    // cai no listener global e o fechamento depende da ordem de registro —
    // mesma familia do bug da mochila/base que congelava a camera.
    if (rawKey === 'Escape' || rawKey === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.toggleSkillMenu === 'function') window.toggleSkillMenu();
        return;
    }

    const key = rawKey.toLowerCase();
    const isDirectionalKey = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(key);
    if (closeButtonFocused) {
        if (key === ' ' || key === 'enter') {
            e.preventDefault();
            document.querySelector('#skill-tree-overlay .menu-close-button')?.click();
        } else if (isDirectionalKey) {
            e.preventDefault();
            closeButtonFocused = false;
            if (key === 'arrowup' || key === 'w') {
                const ultimoNivel = Math.max(...Object.keys(skillsLevelMap).map(Number));
                const skillsInferiores = skillsLevelMap[ultimoNivel];
                selectedSkillId = skillsInferiores[skillsInferiores.length - 1];
            } else if (key === 'arrowdown' || key === 's') {
                selectedSkillId = skillsLevelMap[0][0];
            }
            atualizarVisualSelecaoSkills();
        }
        return;
    }

    let depth = getSkillDepth(selectedSkillId, window.skillsData);
    let index = skillsLevelMap[depth].indexOf(selectedSkillId);

    if ((key === 'arrowup' || key === 'w') && depth === 0) {
        e.preventDefault();
        closeButtonFocused = true;
        atualizarVisualSelecaoSkills();
        return;
    }
    if ((key === 'arrowdown' || key === 's') && !skillsLevelMap[depth + 1]) {
        e.preventDefault();
        closeButtonFocused = true;
        atualizarVisualSelecaoSkills();
        return;
    }

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
    e.preventDefault();
    atualizarVisualSelecaoSkills();
}

function atualizarVisualSelecaoSkills() {
    Object.keys(skillButtonsMap).forEach(id => {
        const btn = skillButtonsMap[id];
        const isSelected = !closeButtonFocused && (id === selectedSkillId);
        if (isSelected) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    // Remove o brilho azul das linhas anteriores
    const todasLinhas = document.querySelectorAll('.skill-tree-line');
    todasLinhas.forEach(l => l.classList.remove('highlight-next'));

    // Acende em azul as próximas linhas hierárquicas que ainda não foram compradas
    if (!closeButtonFocused && selectedSkillId && window.skillsData) {
        function destacarProximasLinhas(idPai) {
            Object.keys(window.skillsData).forEach(idFilho => {
                const skillFilha = window.skillsData[idFilho];
                if (skillFilha && skillFilha.parent === idPai) {
                    const filhoComprado = Array.isArray(window.playerSkills) && window.playerSkills.includes(idFilho);

                    // Só ilumina se a habilidade filha ainda NÃO foi comprada
                    if (!filhoComprado) {
                        const seletor = `.skill-tree-line[data-parent="${CSS.escape(idPai)}"][data-child="${CSS.escape(idFilho)}"]`;
                        const linha = document.querySelector(seletor);
                        if (linha) {
                            linha.classList.add('highlight-next');
                        }
                        // Desce na hierarquia destacando os próximos nós não comprados
                        destacarProximasLinhas(idFilho);
                    }
                }
            });
        }
        destacarProximasLinhas(selectedSkillId);
    }

    const closeButton = document.querySelector('#skill-tree-overlay .menu-close-button');
    closeButton?.classList.toggle('selected', closeButtonFocused);

    const painel = document.querySelector('.skill-tree-container');
    const selecionado = closeButtonFocused ? null : skillButtonsMap[selectedSkillId];
    if (!painel) return;
    const tituloDescricao = painel.querySelector('.skill-tree-description-title');
    const textoDescricao = painel.querySelector('.skill-tree-description-text');
    const statusDescricao = painel.querySelector('.skill-tree-description-status');
    if (tituloDescricao && textoDescricao && statusDescricao) {
        const skill = window.skillsData?.[selectedSkillId];
        const depth = skill ? getSkillDepth(selectedSkillId, window.skillsData) : 0;
        const custo = 1 + depth;
        const possui = Array.isArray(window.playerSkills) && window.playerSkills.includes(selectedSkillId);
        tituloDescricao.textContent = skill?.nome || 'Selecione uma habilidade';
        textoDescricao.textContent = skill
            ? (window.skillDescriptions?.[selectedSkillId] || 'Descrição ainda não cadastrada.')
            : 'Navegue pela árvore para ver o que cada habilidade faz.';
        statusDescricao.textContent = skill
            ? (possui ? 'Habilidade adquirida' : `Custo: ${custo} SP`)
            : '';
    }
    if (closeButtonFocused) {
        painel.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        return;
    }
    if (!selecionado) return;

    const painelRect = painel.getBoundingClientRect();
    const itemRect = selecionado.getBoundingClientRect();
    const margemVisivel = 32;
    const areaTop = painelRect.top + painel.clientTop + margemVisivel;
    const areaLeft = painelRect.left + painel.clientLeft + margemVisivel;
    const areaBottom = painelRect.top + painel.clientTop + painel.clientHeight - margemVisivel;
    const areaRight = painelRect.left + painel.clientLeft + painel.clientWidth - margemVisivel;
    let scrollTop = painel.scrollTop;
    let scrollLeft = painel.scrollLeft;

    if (itemRect.top < areaTop) scrollTop -= areaTop - itemRect.top;
    else if (itemRect.bottom > areaBottom) scrollTop += itemRect.bottom - areaBottom;

    if (itemRect.left < areaLeft) scrollLeft -= areaLeft - itemRect.left;
    else if (itemRect.right > areaRight) scrollLeft += itemRect.right - areaRight;

    if (scrollTop !== painel.scrollTop || scrollLeft !== painel.scrollLeft) {
        painel.scrollTo({ top: scrollTop, left: scrollLeft, behavior: 'smooth' });
    }
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

    const target = document.body;

    skillsLevelMap = {};
    skillButtonsMap = {};
    closeButtonFocused = false;
    const buttonPositions = {};

    const overlay = document.createElement('div');
    overlay.id = 'skill-tree-overlay';
    overlay.className = 'skill-tree-overlay';
    const container = document.createElement('div');
    container.className = 'skill-tree-container';
    if (typeof window.obterModoTelaAtual === 'function'
        && window.obterModoTelaAtual() === window.SCREEN_MODES?.NORMAL) {
        container.classList.add('is-normal');
    }

    // Botão de fechar (X) - movido para dentro do container e usando a classe padrão de menus
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'menu-close-button menu-nav-item';
    closeButton.setAttribute('aria-label', 'Fechar menu de skills');
    closeButton.title = 'Fechar';
    closeButton.onclick = (e) => {
        e.stopPropagation();
        window.toggleSkillMenu();
    };
    container.appendChild(closeButton);

    const header = document.createElement('div');
    header.className = 'skill-tree-header';
    header.innerHTML = `
        <h2>Habilidades</h2>
        <p>XP: <span style="color: #ffd700;">${window.playerXP}</span> | Pontos: <span style="color: #00ff00;">${window.skillPoints}</span></p>
        <small>WASD: Navegar • ENTER/ESPAÇO: Comprar • ESC: Menu</small>
    `;
    const painelDescricao = document.createElement('section');
    painelDescricao.className = 'skill-tree-description';
    painelDescricao.setAttribute('aria-live', 'polite');
    painelDescricao.setAttribute('aria-label', 'Descrição da habilidade selecionada');
    painelDescricao.innerHTML = '<strong class="skill-tree-description-title"></strong><p class="skill-tree-description-text"></p><small class="skill-tree-description-status"></small>';
    header.appendChild(painelDescricao);
    container.appendChild(header);

    const canvas = document.createElement('div');
    canvas.className = 'skill-tree-canvas';
    container.appendChild(canvas);

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
    const vGap = 125; // Espaço vertical aumentado para acomodar o zigue-zague
    const startY = 70; // Reduz o espaço entre o cabeçalho e a primeira fileira
    const maxDepth = Math.max(...Object.keys(levels).map(Number));
    canvas.style.height = `${startY + (maxDepth * vGap) + 120}px`;

    Object.keys(window.skillsData).forEach(skillId => {
        const skill = window.skillsData[skillId];
        const btn = document.createElement('button');
        const jaPossui = window.playerSkills.includes(skillId);
        const paiPossui = skill.parent === null || window.playerSkills.includes(skill.parent);

        // Cálculo de posição dinâmica
        const depth = getSkillDepth(skillId, window.skillsData);
        const siblings = levels[depth];
        const indexInLevel = siblings.indexOf(skillId);

        const custo = 1 + depth;

        // Efeito Zigue-Zague: em fileiras cheias (4 ou mais skills), alterna a altura
        const offsetZigueZague = (siblings.length >= 4 && (indexInLevel % 2 !== 0)) ? 30 : 0;

        // Distribui os botões proporcionalmente à largura de 800px
        const x = (containerWidth / (siblings.length + 1)) * (indexInLevel + 1);
        const y = startY + (depth * vGap) + offsetZigueZague;
        buttonPositions[skillId] = { x: x, y: y, width: 86, height: 46 };

        // Disponível se o pai estiver liberado e o jogador tiver pontos
        const disponivel = paiPossui && window.skillPoints >= custo;

        // Formatação limpa com Nome destacado e Badge de Custo
        const textoBadge = jaPossui ? '✓' : `${custo} SP`;
        btn.innerHTML = `<span class="skill-name">${skill.nome}</span><span class="skill-cost-badge">${textoBadge}</span>`;
        btn.className = 'skill-tree-btn';
        btn.style.position = 'absolute';
        btn.style.left = `${x}px`;
        btn.style.top = `${y}px`;
        btn.addEventListener('mouseenter', () => {
            selectedSkillId = skillId;
            closeButtonFocused = false;
            atualizarVisualSelecaoSkills();
        });

        if (jaPossui) {
            btn.classList.add('owned');
        } else if (disponivel) {
            btn.classList.add('available');
            btn.onclick = () => {
                window.skillPoints -= custo;
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
        canvas.appendChild(btn);
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
                line.dataset.parent = skill.parent;
                line.dataset.child = skillId;

                // Se AMBAS as habilidades conectadas já foram compradas, ativa o brilho verde
                const paiComprado = Array.isArray(window.playerSkills) && window.playerSkills.includes(skill.parent);
                const filhoComprado = Array.isArray(window.playerSkills) && window.playerSkills.includes(skillId);
                if (paiComprado && filhoComprado) {
                    line.classList.add('active');
                }

                line.style.width = `${distance}px`;
                line.style.left = `${parentCenterX}px`;
                line.style.top = `${parentCenterY}px`;
                line.style.transformOrigin = '0 50%';
                line.style.transform = `rotate(${angle}deg)`;
                canvas.appendChild(line);
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
