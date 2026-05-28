
# Guia de Skills (Árvore de Habilidades)

Este guia explica de forma simples como funcionam as skills do jogo e como elas afetam seu personagem. Se quiser detalhes técnicos, veja os arquivos: `src/skills/skills.js` e `src/jogador/skills-efeitos.js`.

---

## Como acessar e aprender skills

1. **Abra o menu de Skills** pelo menu do jogo (botão “SKILLS”).
2. **Navegue** pela árvore usando **W/A/S/D** ou as **setas** do teclado.
3. **Compre/Ative** uma skill pressionando **ENTER** ou **ESPAÇO**.
4. **Feche** o menu com **ESC**.

**Regras importantes:**
- Só é possível aprender uma skill se a anterior ("pai") já estiver desbloqueada.
- Cada skill custa **1 Skill Point**.
- Ao aprender, o efeito é ativado imediatamente no seu personagem.

---

## Lista de Skills e seus efeitos

Veja abaixo o que cada skill faz na prática:

### Vida
- **O que faz:** Aumenta sua vida máxima em **+1** ponto.
- **Dica:** Sobreviva mais tempo em combate!

### Atirador
- **O que faz:** Aumenta o dano dos seus projéteis em **+1**.
- **Dica:** Ideal para quem usa armas de fogo.

### Precisão
- **O que faz:** Também aumenta o dano dos projéteis em **+1**.
- **Observação:** Soma com Atirador! Se tiver os dois, o bônus é maior.

### Kickboxing
- **O que faz:** Seu chute recarrega muito mais rápido (cooldown reduzido pela metade).
- **Dica:** Use para atacar rapidamente em sequência.

### Knockout
- **O que faz:** Seu chute causa **+1** de dano extra.

### Dash
- **O que faz:** Desbloqueia o movimento de Dash (avanço rápido). Parâmetros padrão:
  - Recarga: 45
  - Duração: 8
  - Distância: 128
  - Duplo toque: 250ms
- **Dica:** Use para desviar de ataques ou atravessar áreas rapidamente.

### SuperDash
- **O que faz:** Desbloqueia o SuperDash, uma versão ainda mais poderosa do Dash.

### Garra
- **O que faz:** Permite usar a tração avançada da garra (puxar objetos ou alcançar lugares).

### Garra 2
- **O que faz:** Habilita a segunda garra, ampliando suas possibilidades de movimentação.

### Skills reservadas (futuras)
- **Airdrop, Visão, Dropar, Adestramento, Vender:** Estas skills existem, mas ainda não têm efeito no jogo. Fique de olho em futuras atualizações!

---

## Dicas rápidas

- Experimente combinações! Por exemplo, Atirador + Precisão = muito mais dano.
- Skills de movimento (Dash, SuperDash, Garra) mudam bastante sua forma de jogar.
- Sempre confira se tem Skill Points disponíveis para gastar.

---

**Divirta-se evoluindo seu personagem!**

### Vida
- **Skill:** `Vida`
- **Tipo:** ativa (aplicação de bônus)
- **Requer aprender:** depende do **pai** na árvore (JSON)
- **Efeito:** aumenta a vida máxima do controle em **+1**.
  - Código: `controle.maxVida += 1`

### Atirador
- **Skill:** `Atirador`
- **Tipo:** ativa (bônus passivo permanente após aprender)
- **Efeito:** aumenta o **dano do projétil** em **+1**.
  - Código: `controle.danoProjetil += 1`

### Precisão
- **Skill:** `Precisão`
- **Tipo:** ativa (bônus permanente)
- **Efeito:** aumenta o **dano do projétil** em **+1**.
  - Código: `controle.danoProjetil += 1`

> Observação: Atirador e Precisão se somam porque ambos incrementam `controle.danoProjetil`.

### Kickboxing
- **Skill:** `kickboxing`
- **Tipo:** ativa (bônus permanente)
- **Efeito:** reduz o multiplicador de cooldown do chute para **0.5**.
  - Código: `controle.multiplicadorCooldownChute = 0.5`

### Knockout
- **Skill:** `Knockout`
- **Tipo:** ativa (bônus permanente)
- **Efeito:** aumenta o **dano do chute** em **+1**.
  - Código: `controle.danoChute += 1`

### Dash
- **Skill:** `Dash`
- **Tipo:** ativa (habilita mecânica)
- **Efeito:** habilita “Dash” com parâmetros padrão:
  - `controle.dashHabilitado = true`
  - `controle.cooldownDashMax = 45`
  - `controle.dashDuracao = 8`
  - `controle.distanciaDash = 128`
  - `controle.janelaDuploToqueDash = 250`

### SuperDash
- **Skill:** `SuperDash`
- **Tipo:** ativa (habilita variação)
- **Efeito:** habilita “SuperDash”:
  - `controle.superDashHabilitado = true`

### Airdrop / Visão / Dropar / Adestramento / Vender
Essas skills existem no enum em `src/skills/skills.js`, mas **não aparecem com lógica no switch** atual de `aplicarEfeitosSkills`.
- **Tipo:** atualmente tratadas como “reservadas/espaço futuro” (não há efeito no switch mostrado).

### Garra
- **Skill:** `Garra`
- **Tipo:** ativa (habilita mecânica)
- **Efeito:** libera a tração avançada da garra:
  - `controle.temGarraPuxo = true`

### Garra 2
- **Skill:** `Garra 2` (constante `GARRA2`)
- **Tipo:** ativa (habilita funcionalidade)
- **Efeito:** habilita a “Garra 2”:
  - `controle.temGarra2 = true`



