// Função fábrica para criar NPCs a partir de JSON/config
const NPCBase = require("./npc-base");
const comportamentos = require("./npc-comportamentos");
const ias = require("./npc-ias");

function criarNPC(config) {
    // Resolve comportamentos e IA por nome
    const compFns = (config.comportamentos||[]).map(nome => comportamentos[nome]).filter(Boolean);
    const iaFn = config.ia ? ias[config.ia] : null;
    return new NPCBase({
        ...config,
        comportamentos: compFns,
        ia: iaFn
    });
}

module.exports = criarNPC;
