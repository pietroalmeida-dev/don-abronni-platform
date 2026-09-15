// Configuração central da aplicação — única fonte de verdade para valores que antes
// ficavam espalhados (e às vezes divergentes) por vários arquivos, como o número de
// WhatsApp usado para pedidos.
//
// 🚨 PROVISÓRIO: os valores marcados abaixo existem apenas para o protótipo funcionar
// sem um back-end real. Quando a API existir, eles devem deixar de existir aqui.

export const CONFIG = {
  // Backend real (don-abronni-backend-mongo). Lida de VITE_API_URL (ver .env.example)
  // — sem isso, todo build de produção ficaria com "localhost:3001" embutido no
  // bundle, funcionando só na máquina de quem programou. O fallback abaixo existe só
  // pra manter "npm run dev" funcionando sem precisar criar um .env local.
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',

  WHATSAPP_NUMERO: '5511986414492',
  WHATSAPP_NUMERO_EXIBICAO: '(11) 98641-4492',
  TELEFONE_LOJA_EXIBICAO: '(11) 4112-1201',

  ENDERECO_LOJA: {
    rua: 'Rua Baltazar de Campos, 253',
    bairro: 'Zona Norte',
    cidade: 'São Paulo',
    uf: 'SP',
  },

  HORARIO_FUNCIONAMENTO: {
    diasAbertoSemana: [0, 3, 4, 5, 6], // 0=domingo ... 6=sábado (qua a dom)
    abreMinutos: 18 * 60,
    fechaMinutos: 23 * 60,
  },

  BORDA_RECHEADA_PRECO: 10.0,

  // ADMIN_DEMO foi removido: login de admin agora é autenticação real (JWT) contra
  // o backend, em vez de uma credencial fixa comparada no navegador — ver
  // authService.adminLogin().

  STATUS_PEDIDO: {
    RECEBIDO: 'recebido',
    PREPARANDO: 'preparando',
    SAIU_ENTREGA: 'saiu_entrega',
    ENTREGUE: 'entregue',
    CANCELADO: 'cancelado',
  },

  STATUS_PEDIDO_LABEL: {
    recebido: 'Recebido',
    preparando: 'Preparando',
    saiu_entrega: 'Saiu para entrega',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
  },

  FORMAS_PAGAMENTO: {
    PIX: 'pix',
    CARTAO: 'cartao',
    DINHEIRO: 'dinheiro',
  },
};
