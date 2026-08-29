import { api } from './apiClient';

// Chama o backend (POST /api/frete/calcular), que calcula o frete de verdade
// (ViaCEP + área de entrega da pizzaria + TABELA_FRETE — ver README do backend,
// seção "Frete") — é o backend, não o cliente, quem decide o valor cobrado. A
// resposta pode vir com `entregaDisponivel: false` (CEP não encontrado, fora de
// São Paulo, bairro ainda não atendido, ou até o ViaCEP fora do ar) acompanhada de
// `mensagem` explicando o motivo — o componente que chama isso decide como exibir.
export const shippingService = {
  // `numero` é opcional — quando informado, o backend tenta geocodificar o número
  // exato da casa antes de cair para o nível de rua (melhora a precisão da
  // distância quando o OpenStreetMap tem esse número mapeado; nunca piora quando
  // não tem, ver README do backend, seção "Frete").
  async calcularPorCep(cep, numero) {
    try {
      return await api.post('/frete/calcular', { cep, numero });
    } catch (erro) {
      // CEP inválido vira 422 no backend — o contrato antigo devolvia `null` nesse
      // caso (StepDelivery já sabe lidar com frete === null), não um erro jogado.
      if (erro.status === 422) return null;
      throw erro;
    }
  },
};
