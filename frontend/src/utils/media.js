import { CONFIG } from '../config';

// As imagens do catálogo semeado (ex.: /imagens-pizzas/pizza-Margherita.png) são
// arquivos estáticos do PRÓPRIO front-end (ver public/imagens-pizzas/ no README) —
// funcionam direto como caminho relativo. Já as imagens enviadas pelo painel admin
// (POST /api/produtos/upload-imagem) ficam salvas no disco do BACKEND e são
// servidas por ele em /uploads/... — sem prefixar com a origem da API, o navegador
// tentaria buscar esse arquivo no próprio front-end (porta do Vite) e daria 404.
export function resolverUrlImagem(caminho) {
  if (!caminho) return '';
  if (caminho.startsWith('/uploads/')) {
    const origemApi = CONFIG.API_URL.replace(/\/api\/?$/, '');
    return `${origemApi}${caminho}`;
  }
  return caminho;
}
