import { api } from './apiClient';
import { authService } from './authService';

function token() {
  return authService.getSession()?.token;
}

export const avaliacaoService = {
  // Rota pública — usada pela seção "Depoimentos" da home, sem exigir login.
  async getPublicas() {
    return api.get('/avaliacoes/publicas');
  },

  // Autenticado — usado pelo histórico do cliente pra saber quais pedidos já
  // foram avaliados (e esconder o botão "Avaliar" neles).
  async getMinhas() {
    return api.get('/avaliacoes/minhas', token());
  },

  async criar({ numeroNota, nota, comentario }) {
    return api.post('/avaliacoes', { numeroNota, nota, comentario }, token());
  },
};
