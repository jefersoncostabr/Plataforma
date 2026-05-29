# Efeito Retro Grid & Scanline (Botão 4)

Este guia contém todo o código necessário para implementar o efeito de grade cibernética com linha de scanner animada, integrando as cores Neon Cyan e Magenta do padrão do seu projeto.

## 1. Estrutura HTML

Para que o efeito funcione, o botão deve possuir a classe base `.img-button` e a classe de efeito `.retro-grid`.

```html
<!-- O efeito já inicia ativo devido à classe 'retro-grid' -->
<button class="img-button retro-grid" aria-label="Salvar">
    <img src="salvar.png" alt="Ícone Salvar">
</button>
```

## 2. Estilização CSS

O CSS utiliza pseudo-elementos (`::before` e `::after`) para criar as camadas de grade e a linha de scanner sem interferir na imagem principal.

```css
/* Estilos Base Necessários */
.img-button {
    background: #333;
    border: 1px solid #ddd;
    border-radius: 12px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative; /* Necessário para o posicionamento dos efeitos */
}

/* Efeito Retro Grid & Scanline */
.retro-grid {
    background: #0a0a0a !important; /* Fundo escuro profundo */
    border-color: rgba(0, 255, 255, 0.9) !important;
    overflow: hidden; /* Mantém o grid e a linha dentro do botão */
    position: relative;
    box-shadow:
        0 0 6px rgba(0, 255, 255, 0.55),
        0 0 18px rgba(0, 255, 255, 0.35),
        0 0 40px rgba(255, 0, 255, 0.22);
}

.retro-grid:hover {
    border-color: rgba(0, 255, 255, 1) !important;
    box-shadow:
        0 0 10px rgba(0, 255, 255, 0.7),
        0 0 25px rgba(0, 255, 255, 0.45),
        0 0 50px rgba(255, 0, 255, 0.3) !important;
}

/* Imagem acima dos efeitos */
.retro-grid img {
    position: relative;
    z-index: 3;
    filter: drop-shadow(0 0 5px rgba(0, 255, 255, 0.5));
}

/* Camada da Grade (Grid) */
.retro-grid::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
        linear-gradient(rgba(0, 255, 255, 0.15) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 255, 255, 0.15) 1px, transparent 1px);
    background-size: 8px 8px;
    z-index: 1;
}

/* Camada da Linha de Scanner (Scanline) */
.retro-grid::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 3px;
    background: rgba(0, 255, 255, 0.6);
    box-shadow: 0 0 10px #00ffff;
    top: -10%;
    left: 0;
    animation: scanline 1s linear infinite;
    z-index: 2;
    opacity: 0.8;
}

/* Aceleração da animação no Hover (0.5s) */
.retro-grid:hover::after {
    animation-duration: 0.5s;
}

@keyframes scanline {
    0% { top: -10%; }
    100% { top: 110%; }
}
```

## 3. JavaScript

Como o efeito foi definido para ser permanente através do HTML, o JavaScript serve apenas para log de interação ou para permitir que você ligue/desligue o efeito via clique, caso mude de ideia.

```javascript
const btnRetro = document.querySelector('.retro-grid');

btnRetro.addEventListener('click', () => {
    console.log("Botão Retro clicado!");
    // Se quiser alternar o efeito em vez de ser permanente:
    // btnRetro.classList.toggle('retro-grid');
});
```