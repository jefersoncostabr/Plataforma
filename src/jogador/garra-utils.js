// src/jogador/garra-utils.js
// Utilitários para a mecânica da garra

/** Cria hitbox padrão para entidades */
export function criarHitbox(x, y, largura = 32, altura = 32) {
    return { x, y, largura, altura };
}

/** Verifica colisão entre dois hitboxes */
export function colidem(hitboxA, hitboxB) {
    return (
        hitboxA.x < hitboxB.x + hitboxB.largura &&
        hitboxA.x + hitboxA.largura > hitboxB.x &&
        hitboxA.y < hitboxB.y + hitboxB.altura &&
        hitboxA.y + hitboxA.altura > hitboxB.y
    );
}

/** Centraliza chamada de efeitos visuais */
export function efeitoImpacto(x, y) {
    if (typeof window.criarImpactoVerticalGarra === 'function') {
        window.criarImpactoVerticalGarra(x, y);
    }
}

/** Centraliza chamada de efeitos sonoros */
export function tocarSFX(nome, volume = 1) {
    window.AudioManager?.playSFX?.(nome, volume);
}
