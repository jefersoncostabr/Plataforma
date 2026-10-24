# Índice da Documentação — Por onde começar

> **Pra quem chegou agora:** cada doc começa com um "Em 30 segundos" em linguagem simples.
> Você não precisa ler tudo — leia o resumo do topo e pule pro que precisa.
> Detalhe técnico continua abaixo, nada foi apagado.

## Quero jogar / testar
- `CONTROLES.md` — todos os botões (jogador, BB, pets, debug). Comece aqui.
- `TUTORIAIS_CONTROLES.md` — como configurar dicas e mensagens em `config/tutorial/controles.json`.
- `SKILLS.md` — o que cada skill faz, o que comprar antes, combinações boas.

## Quero criar conteúdo (fase, item, bloco, skill, NPC)
- `CRIAR_ITEM_NOVO.md` — item novo em 9 passos (sprite + JSON + 2 carregadores + teste).
- `ADICIONAR_BLOCO_RUNTIME.md` — bloco novo no jogo (JSON da fase + colisão + sprite + regra).
- `como_criar_skills.md` — como a árvore de skills nasce do `skills-dados.json`.
- `NPC_SYSTEM.md` — NPC via JSON + fábrica, como por na fase e no editor.
- `MENU_BASE_REFERENCIA.md` — onde fica cada parte do menu da base (HTML/CSS/JS).
- `MODO_RUNNER.md` — resumo do bônus Runner, controles e configuração por fase.
- `retro-grid-effect.md` — efeito visual do botão (copiar e colar CSS/HTML/JS).
- `EDITOR_FASES.md` — como usar o editor de fases (paletas, atalhos, exportação).

## Quero entender o código / refatorar
- `ANALISE_ESTADO_ATUAL.md` — o que funciona, dívida técnica, próximos passos. Leia primeiro.
- `ARCHITECTURE.md` — como o motor funciona (ordem de scripts, loops, globais).
- `PROJECT_TREE.md` — mapa das pastas e arquivos, onde criar cada coisa.
- `AI_RULES.md` — regras pra não quebrar o jogo (nomes, tamanho, log, checklist).
- `BASELINE_METRICS.md` — números exatos (linhas, complexidade, duplicação, performance).
- `PLANEJAMENTO_BB_NPC.md` — plano do BB instanciável (vários bebês por fase).
- `SAVE_SYSTEM.md` — como salvamento funciona (slots, chaves, reset).
- `PET_SYSTEM.md` — sistema de pets (cão, gato, ciclo de vida, habilidades).
- `CRAFTING_SYSTEM.md` — sistema de crafting (receitas, UI, integração).
- `apoio.txt` — comandos git + debug que a gente usa no dia a dia.
- `ideias.md` — banco de ideias soltas (vento, dia/noite, capacete...).

## Glossário rápido (pra não se perder)
- **BB** = bebê que pilota a armadura/mecha (sai com Y).
- **Pet** = cão/gato aliado que você pode controlar (com Q).
- **Garra** = gancho pra puxar/enganchar (tecla J).
- **Singleton** = só existe UM por vez (o BB hoje e assim; queremos vários).
- **Shim** = atalho antigo que continua funcionando por compatibilidade.
- **GridUtils** = funções que convertem posição em célula do mapa (hoje duplicadas em 4 lugares).
- **CC (complexidade)** = quantos "ifs" tem numa função; acima de 15 já é difícil de entender.
- **RAF** = requestAnimationFrame, o loop que roda o jogo a 60fps.