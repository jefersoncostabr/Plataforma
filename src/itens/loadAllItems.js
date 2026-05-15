// Carregador centralizado de itens JSON
// Uso: chame loadAllItems().then(() => { ... })

export async function loadAllItems() {
  if (window.itemDefinitions) return window.itemDefinitions; // já carregado
  window.itemDefinitions = {};
  const basePath = 'config/items/';
  const itemIds = [
    'cinto',
    'revolver',
    'escudo',
    'bota',
    'jetpack',
    'garra',
    'colete',
    'restauracao',
    'scrap',
    'capsula',
    'doze'
    // Adicione novos ids aqui conforme criar novos arquivos JSON
  ];
  for (const id of itemIds) {
    try {
      const resp = await fetch(`${basePath}${id}.json`);
      if (!resp.ok) throw new Error(`Erro ao carregar ${id}`);
      const data = await resp.json();
      window.itemDefinitions[id] = data;
    } catch (e) {
      console.error(`Falha ao carregar item '${id}':`, e);
    }
  }
  return window.itemDefinitions;
}
