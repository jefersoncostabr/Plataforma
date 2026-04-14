// Função unificada para aplicar efeitos de coleta de item a uma entidade (jogador ou inimigo)
// Uso: aplicarEfeitoColeta(entidade, itemData)

export function aplicarEfeitoColeta(entidade, itemData) {
  if (!entidade || !itemData || !itemData.efeitos) return;
  // Determina se é jogador ou inimigo
  const tipoEntidade = entidade.id === 'player' || entidade.isPlayer ? 'jogador' : 'inimigo';
  const efeitos = itemData.efeitos[tipoEntidade];
  if (!efeitos) return;

  // Aplica cada propriedade do efeito
  for (const [chave, valor] of Object.entries(efeitos)) {
    if (chave === 'inventarioAdd' && Array.isArray(entidade.inventario)) {
      if (!entidade.inventario.includes(valor)) entidade.inventario.push(valor);
    } else {
      entidade[chave] = valor;
    }
  }

  // Atualização visual (exemplo para jogador)
  if (tipoEntidade === 'jogador') {
    if (itemData.spriteEquipado && entidade.cintoElemento && itemData.id === 'cinto') {
      entidade.cintoElemento.style.display = 'block';
    }
    // Adicione outros visuais conforme necessário
    if (typeof window.salvarInventario === 'function') window.salvarInventario();
  }
}
