import { api } from './apiClient';
import { authService } from './authService';

function token() {
  return authService.getAdminSession()?.token;
}

// IDs do Mongo são strings hex de 24 caracteres. Um item novo (ainda não salvo)
// chega com `id: Date.now()` (número) — é assim que StockSection distingue
// "adicionar" de "editar" antes de chamar save().
const ID_MONGO = /^[0-9a-f]{24}$/i;
function ehIdReal(id) {
  return typeof id === 'string' && ID_MONGO.test(id);
}

function paraIngredienteFrontend(i) {
  return { id: i.id, name: i.nome, category: i.categoria, quantity: i.quantidade, unit: i.unidade, minStock: i.estoqueMinimo };
}
function paraIngredienteBackend(s) {
  return { nome: s.name, categoria: s.category, quantidade: s.quantity, unidade: s.unit, estoqueMinimo: s.minStock };
}

export const stockService = {
  async getAll() {
    const ingredientes = await api.get('/estoque', token());
    return ingredientes.map(paraIngredienteFrontend);
  },

  // Não existe endpoint de remoção de ingrediente no backend — e StockSection também
  // nunca remove itens (só edita/ajusta/adiciona), então só precisamos diferenciar
  // "id novo" (criar) de "id existente" (atualizar), sem lidar com exclusão.
  async save(lista) {
    const t = token();
    await Promise.all(
      lista.map((item) =>
        ehIdReal(item.id)
          ? api.put(`/estoque/${item.id}`, paraIngredienteBackend(item), t)
          : api.post('/estoque', paraIngredienteBackend(item), t)
      )
    );
    const atualizados = await api.get('/estoque', t);
    return atualizados.map(paraIngredienteFrontend);
  },
};
