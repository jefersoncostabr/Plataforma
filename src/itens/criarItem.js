// Função unificada para criar itens coletáveis a partir do JSON
// Uso: criarItemColetavel(itemData, x, y)

export function criarItemColetavel(itemData, x, y, extras = {}) {
  const itemImg = document.createElement('img');
  itemImg.src = itemData.spriteColetavel;
  itemImg.style.position = 'absolute';
  itemImg.style.width = '32px';
  itemImg.style.height = '32px';
  itemImg.style.left = x + 'px';
  itemImg.style.bottom = y + 'px';
  itemImg.style.zIndex = String(itemData.zIndex ?? 5);
  itemImg.style.imageRendering = 'pixelated';
  itemImg.style.pointerEvents = 'auto';

  // Adicione ao layer de itens, se existir
  if (window.LAYERS && window.LAYERS.ITENS && typeof adicionarAoLayer === 'function') {
    adicionarAoLayer(itemImg, window.LAYERS.ITENS);
  } else if (document.body) {
    document.body.appendChild(itemImg);
  }

  // Cria o objeto do item para o array global
  const itemObj = {
    id: itemData.id,
    tipo: itemData.id,
    nome: itemData.nome,
    x,
    y,
    elemento: itemImg,
    velocidadeY: 5,
    ...extras
  };
  return itemObj;
}
