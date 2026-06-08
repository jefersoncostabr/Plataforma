(function(){
  async function carregarMenuBlocosJson({
    url = '../../tools/editor/menu_blocos.json',
    cache = 'no-store'
  } = {}) {
    const resp = await fetch(url, { cache });
    if (!resp.ok) throw new Error(`Falha ao carregar menu_blocos.json: HTTP ${resp.status}`);
    return await resp.json();
  }

  window.EditorMenuBlocosLoader = {
    carregarMenuBlocosJson
  };
})();

