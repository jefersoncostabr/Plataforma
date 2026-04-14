// Exemplo de uso seguro do carregamento centralizado de itens
// Chame este arquivo no início do jogo, antes de qualquer lógica de itens

import { loadAllItems } from './loadAllItems.js';

export async function inicializarItensGlobais() {
  await loadAllItems();
  // Agora window.itemDefinitions está disponível globalmente
  // Exemplo de acesso: window.itemDefinitions['cinto']
}
