import { api } from './apiClient';
import { authService } from './authService';

function tokenCliente() {
  return authService.getSession()?.token;
}
function tokenAdmin() {
  return authService.getAdminSession()?.token;
}

// O backend chama o identificador do pedido de `numeroNota` (gerado no servidor,
// nunca pelo cliente) e a data de `createdAt`. O protótipo local sempre chamou isso
// de `id`/`criadoEm` — todo componente (OrdersSection, OrderHistoryModal...) já
// espera esses nomes, então a tradução acontece só aqui.
function paraPedidoFrontend(pedido) {
  if (!pedido) return null;
  return {
    id: pedido.numeroNota,
    usuarioId: pedido.usuario,
    clienteNome: pedido.clienteNome,
    clienteEmail: pedido.clienteEmail,
    itens: pedido.itens,
    entrega: pedido.entrega,
    pagamento: pedido.pagamento,
    pix: pedido.pix,
    observacao: pedido.observacao,
    subtotal: pedido.subtotal,
    total: pedido.total,
    status: pedido.status,
    origem: pedido.origem,
    criadoEm: pedido.createdAt,
    atualizadoEm: pedido.updatedAt,
  };
}

// Fonte única de pedidos: usada pelo checkout do cliente (cria pedidos) e pelo painel
// administrativo (lista e atualiza status dos MESMOS pedidos) — agora contra o
// backend real, não mais um único array no localStorage.
export const ordersService = {
  async getAll() {
    const pedidos = await api.get('/pedidos', tokenAdmin());
    return pedidos.map(paraPedidoFrontend);
  },

  // `userId` fica na assinatura só por compatibilidade — o backend já filtra pelos
  // pedidos do usuário dono do token (GET /pedidos/meus), não dá pra pedir os de
  // outro usuário mesmo que quiséssemos.
  async getByUser(_userId) {
    const pedidos = await api.get('/pedidos/meus', tokenCliente());
    return pedidos.map(paraPedidoFrontend);
  },

  // Sem endpoint de "um pedido só" no backend. Sem uso hoje em nenhum componente;
  // mantido por compatibilidade, busca nos pedidos do cliente logado.
  async getById(id) {
    const pedidos = await ordersService.getByUser();
    return pedidos.find((p) => p.id === id) || null;
  },

  // 🔒 O `id`, `usuarioId`, `clienteNome`, `clienteEmail`, `subtotal`, `total` e
  // `status` que vêm no objeto de entrada são TODOS recalculados/ignorados pelo
  // servidor — ele nunca confia em preço nem identidade vindos do cliente (ver aviso
  // no pedidoService do backend). O `numeroNota` real só existe na resposta.
  async create(pedido) {
    try {
      const payload = {
        itens: pedido.itens.map((i) => ({
          produtoId: i.produtoId,
          produtoSabor2Id: i.produtoSabor2Id,
          tipo: i.tipo,
          borda: i.borda,
          quantidade: i.quantidade,
        })),
        entrega: {
          tipo: pedido.entrega.tipo,
          endereco: pedido.entrega.endereco || undefined,
        },
        pagamento: {
          forma: pedido.pagamento.forma,
          trocoPara: pedido.pagamento.trocoPara || '',
        },
        observacao: pedido.observacao || '',
      };
      const criado = await api.post('/pedidos', payload, tokenCliente());
      return { ok: true, pedido: paraPedidoFrontend(criado) };
    } catch (erro) {
      return { ok: false, erro: erro.message };
    }
  },

  // Atualizar status é rota só-admin no backend (PATCH /pedidos/:numeroNota/status).
  // A exceção é o cliente cancelando o PRÓPRIO pedido pela tela de Pix — isso usa uma
  // rota diferente (PATCH /pedidos/:numeroNota/cancelar), sem exigir admin. Decide
  // qual chamar aqui dentro, então PixPayment/OrdersSection continuam chamando
  // updateStatus(id, novoStatus) exatamente como antes, sem saber dessa diferença.
  async updateStatus(numeroNota, novoStatus) {
    try {
      const admin = tokenAdmin();
      if (admin) {
        const pedido = await api.patch(`/pedidos/${numeroNota}/status`, { status: novoStatus }, admin);
        return { ok: true, pedido: paraPedidoFrontend(pedido) };
      }
      if (novoStatus === 'cancelado') {
        const pedido = await api.patch(`/pedidos/${numeroNota}/cancelar`, {}, tokenCliente());
        return { ok: true, pedido: paraPedidoFrontend(pedido) };
      }
      return { ok: false, erro: 'Você não tem permissão para alterar o status deste pedido.' };
    } catch (erro) {
      return { ok: false, erro: erro.message };
    }
  },

  // Usado pelo painel ADM para lançar um pedido feito por telefone/balcão. O backend
  // (POST /pedidos/manual) só aceita um texto único de itens, não uma lista
  // estruturada — junta os nomes aqui pra bater com o que ele espera.
  async createManualAdmin(pedidoManual) {
    const itensTexto = pedidoManual.itens.map((i) => i.nome).join(', ');
    const criado = await api.post(
      '/pedidos/manual',
      { clienteNome: pedidoManual.clienteNome, itensTexto, total: pedidoManual.total },
      tokenAdmin()
    );
    return paraPedidoFrontend(criado);
  },
};
