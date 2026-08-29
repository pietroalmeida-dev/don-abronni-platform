import { api } from './apiClient';
import { authService } from './authService';

function tokenAdmin() {
  return authService.getAdminSession()?.token;
}

// Envolve as chamadas reais à API (GET /api/produtos e variações) — mesma interface
// assíncrona de antes, então quem consome (MenuSection, e por prop o TwoFlavorsModal)
// não precisa mudar.
export const catalogService = {
  async getAll() {
    return api.get('/produtos');
  },
  async getById(id) {
    // Não existe GET /api/produtos/:id no backend — busca a lista toda e filtra.
    // Sem uso hoje em nenhum componente; mantido só por compatibilidade de assinatura.
    const produtos = await api.get('/produtos');
    return produtos.find((p) => p.id === id) || null;
  },
  async getByCategory(categoria) {
    return api.get(`/produtos?categoria=${encodeURIComponent(categoria)}`);
  },
  async getFeatured() {
    return api.get('/produtos/destaques');
  },
  async getFlavorNames() {
    return api.get('/produtos/sabores');
  },
  async getPriceByFlavorName(nome) {
    // Idem getById: sem endpoint dedicado, filtra a lista completa. Sem uso hoje.
    const produtos = await api.get('/produtos');
    const produto = produtos.find((p) => p.nome === nome);
    return produto ? produto.precoBase : 0;
  },

  // A partir daqui: usado só pelo painel admin, seção "Cardápio" (ver
  // ProductsSection.jsx) — todas exigem sessão de admin.
  async create(produto) {
    return api.post('/produtos', produto, tokenAdmin());
  },
  async update(id, produto) {
    return api.put(`/produtos/${id}`, produto, tokenAdmin());
  },
  async deactivate(id) {
    return api.del(`/produtos/${id}`, tokenAdmin());
  },
  // Envia a imagem separadamente (multipart/form-data) ANTES de salvar o produto —
  // o backend devolve o caminho do arquivo salvo (`{ imagem: '/uploads/...' }`), que
  // depois entra no payload de create()/update() como o campo `imagem`.
  async uploadImage(arquivo) {
    const formData = new FormData();
    formData.append('imagem', arquivo);
    return api.postForm('/produtos/upload-imagem', formData, tokenAdmin());
  },
};
