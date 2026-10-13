> **Pra quem chegou agora:** cada doc agora comeca com um "Em 30 segundos" em linguagem simples.
> Voce nao precisa ler tudo — leia o resumo do topo e pule pro que precisa.
> Detalhe tecnico continua abaixo, nada foi apagado.

# Indice da documentacao — Por onde comecar

## Quero jogar / testar
- `CONTROLES.md` — todos os botoes (jogador, BB, pets, debug). Comece aqui.
- `SKILLS.md` — o que cada skill faz, o que comprar antes, combinacoes boas.

## Quero criar conteudo (fase, item, bloco, skill, NPC)
- `CRIAR_ITEM_NOVO.md` — item novo em 9 passos (sprite + JSON + 2 carregadores + teste).
- `ADICIONAR_BLOCO_RUNTIME.md` — bloco novo no jogo (JSON da fase + colisao + sprite + regra).
- `como_criar_skills.md` — como a arvore de skills nasce do `skills-dados.json`.
- `NPC_SYSTEM.md` — NPC via JSON + fabrica, como por na fase e no editor.
- `MENU_BASE_REFERENCIA.md` — onde fica cada parte do menu da base (HTML/CSS/JS).
- `retro-grid-effect.md` — efeito visual do botao (copiar e colar CSS/HTML/JS).

## Quero entender o codigo / refatorar
- `ANALISE_ESTADO_ATUAL.md` — o que funciona, divida tecnica, proximos passos. Leia primeiro.
- `ARCHITECTURE.md` — como o motor funciona (ordem de scripts, loops, globais).
- `PROJECT_TREE.md` — mapa das pastas e arquivos, onde criar cada coisa.
- `AI_RULES.md` — regras pra nao quebrar o jogo (nomes, tamanho, log, checklist).
- `BASELINE_METRICS.md` — numeros exatos (linhas, complexidade, duplicacao, performance).
- `PLANEJAMENTO_BB_NPC.md` — plano do BB instanciavel (varios bebes por fase).
- `apoio.txt` — comandos git + debug que a gente usa no dia a dia.
- `ideias.md` — banco de ideias soltas (vento, dia/noite, capacete...).

## Glossario rapido (pra nao se perder)
- **BB** = bebe que pilota a armadura/mecha (sai com Y).
- **Pet** = cao/gato aliado que voce pode controlar (com Q).
- **Garra** = gancho pra puxar/enganchar (tecla J).
- **Singleton** = so existe UM por vez (o BB hoje e assim; queremos varios).
- **Shim** = atalho antigo que continua funcionando por compatibilidade.
- **GridUtils** = funcoes que convertem posicao em celula do mapa (hoje duplicadas em 4 lugares).
- **CC (complexidade)** = quantos "ifs" tem numa funcao; acima de 15 ja e dificil de entender.
- **RAF** = requestAnimationFrame, o loop que roda o jogo a 60fps.
