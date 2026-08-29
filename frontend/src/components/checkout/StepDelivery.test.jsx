import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepDelivery from './StepDelivery';
import { shippingService } from '../../services/shippingService';
import { addressesService } from '../../services/addressesService';

// Mocka as duas dependências de rede do componente. calcularPorCep e add()
// nunca tocam a API de verdade — o teste controla exatamente o que cada um
// devolve em cada cenário (frete disponível, indisponível, CEP inválido...).
vi.mock('../../services/shippingService', () => ({
  shippingService: { calcularPorCep: vi.fn() },
}));
vi.mock('../../services/addressesService', () => ({
  addressesService: { add: vi.fn() },
}));

// useToast() normalmente vem de um Provider — aqui é trocado por um espião
// direto, então "o toast certo apareceu" vira só "showToast foi chamado com o
// texto X", sem precisar montar o componente <Toast/> de verdade na tela.
const showToastMock = vi.fn();
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => showToastMock,
}));

const freteDisponivel = { valor: 8, distanciaKm: 3.2, entregaDisponivel: true };
const freteIndisponivel = { valor: 0, distanciaKm: 42, entregaDisponivel: false };

const enderecoSalvo = { rua: 'Av Fernando Mendes De Almeida', numero: '1061', complemento: 'casa 2', bairro: 'Parque Taipas', cep: '02987-100' };

function setup({ enderecosSalvos = [], session = { id: 'u1' } } = {}) {
  const onNext = vi.fn();
  const setEntrega = vi.fn();
  const setEnderecosSalvos = vi.fn();
  render(
    <StepDelivery
      session={session}
      enderecosSalvos={enderecosSalvos}
      setEnderecosSalvos={setEnderecosSalvos}
      entrega={{ tipo: 'delivery', endereco: null, taxaEntrega: 0 }}
      setEntrega={setEntrega}
      onNext={onNext}
    />
  );
  return { onNext, setEntrega, setEnderecosSalvos };
}

describe('StepDelivery — validação antes de avançar para o pagamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloqueia o avanço se os campos obrigatórios do endereço novo estiverem vazios', async () => {
    const user = userEvent.setup();
    const { onNext } = setup();

    await user.click(screen.getByRole('button', { name: /próximo/i }));

    expect(showToastMock).toHaveBeenCalledWith('Preencha todos os campos obrigatórios.', 'erro');
    expect(onNext).not.toHaveBeenCalled();
  });

  it('bloqueia o avanço com um CEP incompleto', async () => {
    const user = userEvent.setup();
    const { onNext } = setup();

    await user.type(screen.getByPlaceholderText('00000-000'), '029'); // CEP incompleto
    await user.type(screen.getByPlaceholderText('123'), '1061');
    await user.type(screen.getByPlaceholderText('Nome da rua'), 'Av Fernando Mendes');
    await user.type(screen.getByPlaceholderText('Bairro'), 'Parque Taipas');
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    expect(showToastMock).toHaveBeenCalledWith('CEP inválido. Use o formato 00000-000.', 'erro');
    expect(onNext).not.toHaveBeenCalled();
  });

  it('bloqueia o avanço quando o CEP está fora da área de entrega', async () => {
    shippingService.calcularPorCep.mockResolvedValue(freteIndisponivel);
    const user = userEvent.setup();
    const { onNext } = setup();

    await user.type(screen.getByPlaceholderText('00000-000'), '99999-999');
    await user.type(screen.getByPlaceholderText('123'), '100');
    await user.type(screen.getByPlaceholderText('Nome da rua'), 'Rua Distante');
    await user.type(screen.getByPlaceholderText('Bairro'), 'Bairro Longe');
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    expect(await screen.findByText(/não entregamos/i)).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('com um endereço novo válido e dentro da área de entrega, avança e salva os dados corretos', async () => {
    shippingService.calcularPorCep.mockResolvedValue(freteDisponivel);
    addressesService.add.mockResolvedValue([enderecoSalvo]);
    const user = userEvent.setup();
    const { onNext, setEntrega } = setup();

    await user.type(screen.getByPlaceholderText('00000-000'), '02987-100');
    await user.type(screen.getByPlaceholderText('123'), '1061');
    await user.type(screen.getByPlaceholderText('Nome da rua'), 'Av Fernando Mendes De Almeida');
    await user.type(screen.getByPlaceholderText('Bairro'), 'Parque Taipas');
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    // Confirma que o box de frete calculado apareceu na tela com o valor certo
    // (evidência visual de que o cálculo aconteceu antes de avançar).
    expect(await screen.findByText('R$ 8,00')).toBeInTheDocument();

    expect(setEntrega).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'delivery',
      taxaEntrega: 8,
      endereco: expect.objectContaining({ cep: '02987-100', numero: '1061' }),
    }));
    expect(onNext).toHaveBeenCalledOnce();

    // O número da casa é opcional pro cálculo (o backend cai pro nível de rua se
    // não vier), mas quando o cliente termina de digitá-lo, o front já reenvia —
    // melhora a precisão da distância sem esperar o clique em "Próximo".
    expect(shippingService.calcularPorCep).toHaveBeenCalledWith('02987-100', '1061');
  });

  it('escolher "Retirar" pula toda a validação de endereço e avança direto', async () => {
    const user = userEvent.setup();
    const { onNext, setEntrega } = setup();

    await user.click(screen.getByLabelText(/retirar/i));
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    expect(setEntrega).toHaveBeenCalledWith({ tipo: 'retirada', endereco: null, taxaEntrega: 0, distanciaKm: null });
    expect(onNext).toHaveBeenCalledOnce();
    expect(shippingService.calcularPorCep).not.toHaveBeenCalled();
  });

  it('escolher um endereço já salvo não exige preencher o formulário de novo', async () => {
    shippingService.calcularPorCep.mockResolvedValue(freteDisponivel);
    const user = userEvent.setup();
    const { onNext, setEntrega } = setup({ enderecosSalvos: [enderecoSalvo] });

    // Com endereço salvo existente, ele já vem pré-selecionado — não precisa clicar.
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    expect(setEntrega).toHaveBeenCalledWith(expect.objectContaining({ endereco: enderecoSalvo }));
    expect(onNext).toHaveBeenCalledOnce();
  });
});
