/**
 * Gerenciador de animações procedurais para equipamentos.
 */

console.log("[Sistema] animacoesEquipamentos.js carregado com sucesso.");

/**
 * Aciona um efeito de recuo (inclinação) no elemento da arma.
 * @param {HTMLElement} elemento - O elemento DOM da arma.
 * @param {number} duracao - Tempo em milissegundos que o efeito dura (padrão 100ms).
 */
function aplicarRecuoRevolver(elemento, duracao = 100) {
    if (!elemento) return;

    console.log(`[Animação] Ativando recuo na arma:`, elemento.id || "Inimigo");
    // Define uma flag via dataset para que os loops de atualização
    // saibam que devem aplicar a rotação no transform momentaneamente.
    elemento.dataset.recoil = "true";

    setTimeout(() => {
        console.log(`[Animação] Finalizando recuo.`);
        elemento.dataset.recoil = "false";
    }, duracao);
}