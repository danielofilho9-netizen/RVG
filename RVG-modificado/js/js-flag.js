/* Marca o documento como "com JavaScript" antes da primeira pintura (usado por css/styles.css).
   Fica em arquivo próprio para que a política CSP não precise de 'unsafe-inline' em scripts. */
document.documentElement.classList.add('js');
