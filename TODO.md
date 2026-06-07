# TODO - correção sprite terra_horizontal.png

- [x] Identificar onde o caminho do sprite do chão é montado/normalizado (jogo e editor).
- [x] Corrigir caminho relativo/absoluto usado para `terra_horizontal.png` e garantir fallback consistente.
- [ ] Evitar duplicidade de render (garantir limpeza correta e render único para o chão).
- [ ] Adicionar logs de `onerror` apenas para o sprite do chão (ou usar flag para não poluir console).
- [ ] Testar no: jogo, menu do editor de fase, palco do editor de fase.
