
# Skills (Árvore de Habilidades)

Guia prático para usar as Skills do personagem: **o que fazer**, **quais botões/ações usam no jogo** e **o que precisa comprar antes** (dependência na árvore).

---

## Como abrir e aprender

1. Abra o menu **SKILLS** no jogo.
2. Use a navegação da árvore (teclado) para destacar os botões das skills.
3. **ENTER / ESPAÇO** para comprar/ativar a skill selecionada.
4. **ESC** fecha o menu.

**Regras:**
- Para comprar uma skill, o **pai** dela precisa estar desbloqueado.
- Cada compra custa **1 Skill Point**.
- Ao comprar, o efeito já passa a valer na hora.

---

## Visão geral (o que cada skill destrava / fortalece)

> A dependência abaixo segue a hierarquia definida em `config/skills-dados.json`.

### Vida
- **Como usa (na prática):** você fica com mais **vida** para aguentar mais golpes.
- **Efeito:** +1 de vida máxima.
- **Dependência (o que comprar antes):** **nenhuma** (skill raiz).

### Atirador
- **Como usa (na prática):** melhore seus tiros/projéteis durante combate.
- **Efeito:** +1 de dano dos projéteis.
- **Dependência:** **nenhuma** (skill raiz).

### Precisão
- **Como usa (na prática):** melhore seus tiros/projéteis junto com Atirador.
- **Efeito:** +1 de dano dos projéteis.
- **Dependência:** **Vida**.

### kickboxing
- **Como usa (na prática):** use seu **chute** com mais frequência (menor intervalo).
- **Efeito:** reduz o cooldown do chute pela metade.
- **Dependência:** **Atirador**.

### Knockout
- **Como usa (na prática):** chute com mais impacto.
- **Efeito:** +1 de dano do chute.
- **Dependência:** **kickboxing**.

### Dash
- **Como usa (na prática):** faça um **Dash** (avanço rápido) em combate.
- **Efeito:** habilita o movimento de Dash.
- **Dependência:** **Atirador**.

### SuperDash
- **Como usa (na prática):** use o **Dash aprimorado** quando a skill estiver ativa.
- **Efeito:** habilita o SuperDash.
- **Dependência:** **Dash**.

### Slide
- **Como usa (na prática):** durante um Dash, pressione **Baixo** para deslizar (ou use ao cair).
- **Requisito:** esteja com mãos vazias (equipamentos guardados).
- **Efeito:** permite o deslize por frestas sem perder o velocidade.
- **Dependência:** **Adestramento**.

### Garra
- **Como usa (na prática):** use sua **Garra** para puxar/enganchar e atravessar locais.
- **Efeito:** habilita a tração avançada da garra, puxa o jogador.
- **Dependência:** **Dash**.

### Garra 2
- **Como usa (na prática):** habilita a **segunda garra** para ampliar suas possibilidades de movimentação.
- **Efeito:** eletroculta inimigos deixando stunados.
- **Dependência:** **Garra**.

---

## Outras Habilidades Operacionais

### Airdrop
- **Como usa:** Pressione **U** ou **Cima + Tiro** (I).
- **Efeito:** Solicita um suprimento aéreo com itens ou buffs aleatórios.
- **Dependência:** **Dropar**.

### Visão
- **Como usa:** Passiva (sempre ativa).
- **Efeito:** Habilita o HUD no canto superior esquerdo mostrando Vida e durabilidade do Escudo.
- **Dependência:** **Vida**.

### Dropar
- **Como usa:** Pressione **Baixo + Pulo** (Espaço).
- **Efeito:** Larga o último item coletado de volta no cenário.
- **Dependência:** **Vida**.

### Adestramento
- **Como usa:** Pressione **Q** próximo a um Pet agachado.
- **Efeito:** Permite assumir o controle manual do Cão ou Gato aliado.
- **Dependência:** **Vida**.

### Vender
- **Como usa:** Pressione **Baixo + Tiro** (I) enquanto segura um item.
- **Efeito:** Converte um item do inventário em Experiência (XP).
- **Dependência:** **Dropar**.

---

## Combinações recomendadas

- **Dano à distância:** Atirador → Precisão.
- **Ataque corpo-a-corpo mais forte:** Atirador → kickboxing → Knockout.
- **Mobilidade:** Atirador → Dash → SuperDash.
- **Movimento com Garra:** Atirador → Dash → Garra → Garra 2.

---

**Objetivo:** use a árvore para construir um estilo (tiro, chute ou mobilidade) comprando em sequência pelas dependências.
