'use strict';

const pedidoRepository = require('../repositories/pedidoRepository');
const produtoRepository = require('../repositories/produtoRepository');
const shippingService = require('./shippingService');
const paymentService = require('./paymentService');
const AppError = require('../utils/AppError');

const {
  PRECO_BORDA_RECHEADA: PRECO_BORDA,
  BORDAS_VALIDAS: BORDA_VALIDAS,
} = require('../config/pedidoConfig');

const MAX_TENTATIVAS_NUMERO_NOTA = 5;

function gerarNumeroNota() {
  const agora = new Date();
  const data = `${agora.getFullYear()}${String(agora.getMonth() + 1).padStart(2, '0')}${String(agora.getDate()).padStart(2, '0')}`;
  // 4 dígitos (0001-9999): reduz bastante a chance de colisão em relação aos 3
  // dígitos originais, mas o índice `unique` de numeroNota (Pedido.js) continua
  // sendo a garantia real — por isso o retry em criarPedidoComRetry() abaixo.
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `DA-${data}-${seq}`;
}

// numeroNota é sorteado, não sequencial — duas criações de pedido quase
// simultâneas podem (raramente) gerar o mesmo número. Em vez de deixar o pedido
// falhar pro cliente com "já existe um registro com esse numeroNota", tenta de novo
// com um número novo antes de desistir.
async function criarPedidoComRetry(dadosSemNumeroNota, tentativas = MAX_TENTATIVAS_NUMERO_NOTA) {
  for (let i = 0; i < tentativas; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await pedidoRepository.criar({ ...dadosSemNumeroNota, numeroNota: gerarNumeroNota() });
    } catch (erro) {
      const colisaoDeNumeroNota = erro.code === 11000 && erro.keyPattern?.numeroNota;
      if (!colisaoDeNumeroNota || i === tentativas - 1) throw erro;
    }
  }
  return undefined;
}

// 🔒 PONTO DE SEGURANÇA IMPORTANTE: no protótipo original (front-end puro), o preço
// total do pedido era calculado inteiramente no navegador e enviado pronto para o
// WhatsApp — um cliente mal-intencionado podia abrir o DevTools e mudar o valor
// antes de enviar. Aqui, o backend NUNCA confia em preço vindo do cliente: recebe
// apenas o QUE foi pedido (ids de produto, quantidade, borda) e recalcula tudo a
// a partir dos dados reais do catálogo no banco.
async function montarItem(itemRequisicao) {
  const produto = await produtoRepository.buscarPorId(itemRequisicao.produtoId);
  if (!produto || !produto.ativo) throw new AppError(`Produto não encontrado: ${itemRequisicao.produtoId}`, 404);

  const borda = BORDA_VALIDAS.includes(itemRequisicao.borda) ? itemRequisicao.borda : 'nenhuma';
  if (borda !== 'nenhuma' && !produto.permiteBordaRecheada) {
    throw new AppError(`O produto "${produto.nome}" não aceita borda recheada.`, 422);
  }
  const valorBorda = borda === 'nenhuma' ? 0 : PRECO_BORDA;

  let precoUnitario = produto.precoBase;
  let nome = produto.nome;
  let produtoSabor2 = null;

  if (itemRequisicao.tipo === 'meia_meia') {
    if (!produto.permiteDoisSabores) throw new AppError(`O produto "${produto.nome}" não aceita dois sabores.`, 422);
    if (!itemRequisicao.produtoSabor2Id || String(itemRequisicao.produtoSabor2Id) === String(itemRequisicao.produtoId)) {
      throw new AppError('Escolha dois sabores diferentes para o meia a meia.', 422);
    }

    const sabor2 = await produtoRepository.buscarPorId(itemRequisicao.produtoSabor2Id);
    if (!sabor2 || !sabor2.ativo) throw new AppError('Segundo sabor não encontrado.', 404);
    // Antes só o 1º produto era checado quanto a permitir dois sabores — dava pra
    // montar "meia a meia" com uma bebida como segundo sabor. Os dois lados da
    // combinação precisam aceitar meia a meia e ser da mesma categoria.
    if (!sabor2.permiteDoisSabores) {
      throw new AppError(`O produto "${sabor2.nome}" não aceita dois sabores.`, 422);
    }
    if (sabor2.categoria !== produto.categoria) {
      throw new AppError('Os dois sabores precisam ser da mesma categoria (ex.: duas pizzas salgadas).', 422);
    }

    // Mesma regra de negócio já corrigida no front-end: cobra pelo sabor mais caro.
    precoUnitario = Math.max(produto.precoBase, sabor2.precoBase);
    nome = `Meia & Meia: ${produto.nome} + ${sabor2.nome}`;
    produtoSabor2 = sabor2._id;
  }

  const quantidade = Math.max(1, parseInt(itemRequisicao.quantidade, 10) || 1);
  const subtotal = (precoUnitario + valorBorda) * quantidade;

  return {
    produto: produto._id,
    produtoSabor2,
    nome,
    tipo: itemRequisicao.tipo === 'meia_meia' ? 'meia_meia' : 'unica',
    borda,
    valorBorda,
    precoUnitario,
    quantidade,
    subtotal,
  };
}

const pedidoService = {
  async criar({ usuario, itensRequisicao, entrega, pagamento, observacao }) {
    if (!Array.isArray(itensRequisicao) || itensRequisicao.length === 0) {
      throw new AppError('O pedido precisa ter ao menos um item.', 422);
    }

    const itens = await Promise.all(itensRequisicao.map(montarItem));
    const subtotal = itens.reduce((soma, i) => soma + i.subtotal, 0);

    let taxaEntrega = 0;
    let distanciaKm = null;
    if (entrega.tipo === 'delivery') {
      if (!entrega.endereco || !entrega.endereco.cep) throw new AppError('Endereço de entrega é obrigatório.', 422);
      // calcularPorCep agora é assíncrona (consulta o ViaCEP) — sem o `await` aqui,
      // `frete` seria sempre uma Promise (sempre "truthy", sem `.entregaDisponivel`),
      // e todo pedido de delivery passaria a falhar com "Não entregamos nesse CEP".
      const frete = await shippingService.calcularPorCep(entrega.endereco.cep, entrega.endereco.numero);
      if (!frete || !frete.entregaDisponivel) {
        throw new AppError(frete?.mensagem || 'Não entregamos nesse CEP.', 422);
      }
      taxaEntrega = frete.valor;
      distanciaKm = frete.distanciaKm;
    }

    const total = subtotal + taxaEntrega;

    const pedido = await criarPedidoComRetry({
      usuario: usuario._id,
      clienteNome: usuario.nome,
      clienteEmail: usuario.email,
      entrega: {
        tipo: entrega.tipo,
        endereco: entrega.tipo === 'delivery' ? entrega.endereco : {},
        distanciaKm,
        taxaEntrega,
      },
      pagamento: {
        forma: pagamento.forma,
        trocoPara: pagamento.trocoPara || '',
        statusPagamento: 'pendente',
      },
      observacao: observacao || '',
      itens,
      subtotal,
      total,
      status: 'recebido',
      origem: 'site',
    });

    if (pagamento.forma === 'pix') {
      const dadosPix = await paymentService.criarPagamentoPix(total);
      pedido.pix = dadosPix;
      await pedido.save();
    }

    return pedido;
  },

  async listarTodos() {
    return pedidoRepository.listarTodos();
  },

  async listarPorUsuario(usuarioId) {
    return pedidoRepository.listarPorUsuario(usuarioId);
  },

  async atualizarStatus(numeroNota, novoStatus) {
    const pedido = await pedidoRepository.atualizarStatus(numeroNota, novoStatus);
    if (!pedido) throw new AppError('Pedido não encontrado.', 404);
    return pedido;
  },

  // O cliente pode cancelar o PRÓPRIO pedido, mas só enquanto ainda estiver
  // 'recebido' (antes de entrar em preparo) — depois disso, só o admin decide (via
  // atualizarStatus). Mesmo padrão de checagem de posse usado em avaliacaoService.
  //
  // 🔒 Duas coisas de propósito aqui: (1) a checagem de posse e a atualização de
  // status acontecem num ÚNICO findOneAndUpdate condicional — não um
  // "ler → decidir → salvar" separado, que teria uma janela de corrida onde um admin
  // poderia mudar o status entre a leitura e a escrita e o cancelamento do cliente
  // sobrescreveria isso. (2) a mensagem de erro é a MESMA para "pedido não existe" e
  // "pedido existe mas não é seu" — devolver mensagens diferentes permitiria a
  // qualquer conta autenticada varrer números de nota e descobrir quais existem.
  async cancelarPeloCliente({ usuario, numeroNota }) {
    const pedidoCancelado = await pedidoRepository.cancelarSeForDoUsuarioERecebido(numeroNota, usuario._id);
    if (pedidoCancelado) return pedidoCancelado;

    // Não deu certo — descobre por quê só pra decidir a mensagem certa, sem vazar
    // qual dos dois motivos foi (existe mas não é seu vs. não existe vs. já mudou de
    // status): tudo cai na mesma resposta genérica abaixo.
    const pedido = await pedidoRepository.buscarPorNumeroNota(numeroNota);
    if (pedido && String(pedido.usuario) === String(usuario._id) && pedido.status !== 'recebido') {
      throw new AppError(
        'Este pedido já entrou em preparo e não pode mais ser cancelado por aqui. Fale com a pizzaria.',
        422
      );
    }
    throw new AppError('Pedido não encontrado.', 404);
  },

  async criarManual({ clienteNome, itensTexto, total }) {
    const nomes = itensTexto
      .split(',')
      .map((nome) => nome.trim())
      .filter(Boolean);
    if (nomes.length === 0) throw new AppError('Informe ao menos um item.', 422);

    // Pedido manual não tem preço por item individualizado (o admin só digita um
    // total) — divide igualmente entre os itens em vez de repetir o total inteiro em
    // cada um, que inflava a soma exibida por item para N vezes o valor real.
    const precoPorItem = Math.round((total / nomes.length) * 100) / 100;
    const itens = nomes.map((nome) => ({
      nome,
      tipo: 'unica',
      borda: 'nenhuma',
      valorBorda: 0,
      precoUnitario: precoPorItem,
      quantidade: 1,
      subtotal: precoPorItem,
    }));

    return criarPedidoComRetry({
      usuario: null,
      clienteNome,
      clienteEmail: null,
      entrega: { tipo: 'retirada', endereco: {}, taxaEntrega: 0 },
      pagamento: { forma: 'dinheiro', trocoPara: '', statusPagamento: 'pendente' },
      observacao: 'Pedido lançado manualmente pelo painel administrativo.',
      itens,
      subtotal: total,
      total,
      status: 'recebido',
      origem: 'admin_manual',
    });
  },
};

module.exports = pedidoService;
