# Como Abrir o Servidor do Editor de Fases

Este guia explica os dois métodos disponíveis para iniciar o servidor local, permitindo que você crie, edite e salve fases diretamente pelo navegador.

## Pré-requisitos

*   **Node.js:** É necessário ter o Node.js instalado para que o servidor de salvamento funcione.

---

## Método 1: Usando o arquivo .bat (Recomendado para Windows)

Este método é automatizado e abre o editor no seu navegador padrão instantaneamente.

1.  Abra a pasta `tools/editor/`.
2.  Execute (clique duplo) o arquivo `iniciar-editor-local.bat`.
3.  Uma janela do prompt de comando será aberta e o navegador carregará o editor no endereço: `http://127.0.0.1:3210/tools/editor/editor.html`.
4.  **Atenção:** Mantenha a janela do terminal aberta enquanto estiver usando o editor. Se fechá-la, o salvamento de arquivos deixará de funcionar.

---

## Método 2: Abrindo manualmente via Terminal (Node.js)

Caso você esteja no Linux/Mac ou prefira usar o terminal manualmente no Windows:

1.  Abra o seu terminal (CMD, PowerShell ou Bash).
2.  Navegue até a **raiz do projeto** (a pasta principal `Plataforma/`).
3.  Execute o seguinte comando para iniciar o servidor:
    ```bash
    node ./tools/editor/editor-save-server.js
    ```
4.  Com o servidor rodando, abra o seu navegador e acesse manualmente o link:
    http://127.0.0.1:3210/tools/editor/editor.html

---

## Dicas de Configuração

*   **Alterar Porta:** Se a porta `3210` estiver sendo usada por outro programa, você pode editar o arquivo `.bat` e alterar o valor da variável `EDITOR_SAVE_PORT`.
*   **Salvamento:** O editor salva os arquivos `.json` diretamente na pasta `config/fases/`. Certifique-se de que o servidor Node tem permissão de escrita nessa pasta.
*   **Log de Erros:** Verifique a janela do terminal se encontrar problemas ao salvar; o servidor imprimirá mensagens de erro detalhadas lá.