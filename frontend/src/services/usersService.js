import { api } from './apiClient';
import { authService } from './authService';

function token() {
  return authService.getAdminSession()?.token;
}

// O painel administrativo de "Clientes" usa estes mesmos usuários — não existe uma
// lista de clientes falsa e separada dos usuários que realmente se cadastram.
export const usersService = {
  // Sem endpoint genérico de "todos os usuários" no backend — o único GET
  // /api/usuarios existente já vem com estatísticas (ver getComEstatisticas). Sem uso
  // hoje em nenhum componente; mantido só por compatibilidade de assinatura.
  async getAll() {
    const clientes = await api.get('/usuarios', token());
    return clientes.map((c) => ({ id: c.id, name: c.nome, email: c.email }));
  },

  async getById(id) {
    const usuarios = await usersService.getAll();
    return usuarios.find((u) => u.id === id) || null;
  },

  // Estatísticas já vêm prontas do backend (agregação no MongoDB, ver
  // usuarioService.listarComEstatisticas) — não precisamos mais cruzar
  // usuários x pedidos manualmente no navegador.
  async getComEstatisticas() {
    const clientes = await api.get('/usuarios', token());
    return clientes.map((c) => ({
      id: c.id,
      name: c.nome,
      email: c.email,
      totalPedidos: c.totalPedidos,
      totalGasto: c.totalGasto,
      ultimaCompra: c.ultimaCompra,
    }));
  },
};
