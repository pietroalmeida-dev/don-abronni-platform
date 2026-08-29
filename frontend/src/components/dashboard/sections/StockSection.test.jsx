import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StockSection from './StockSection';
import Toast from '../../common/Toast';
import { ToastProvider } from '../../../contexts/ToastContext';
import { stockService } from '../../../services/stockService';

vi.mock('../../../services/stockService', () => ({
  stockService: { save: vi.fn() },
}));

// Chart.js precisa de um canvas de verdade (getContext etc.), que o jsdom não
// implementa — não é o que este arquivo testa, então mocka o hook inteiro.
vi.mock('../../../hooks/useChart', () => ({ useChart: () => ({ current: null }) }));

const farinhaBaixa = { id: '507f1f77bcf86cd799439011', name: 'Farinha', category: 'Secos', quantity: 2, unit: 'kg', minStock: 5 };
const mussarelaOk = { id: '507f1f77bcf86cd799439012', name: 'Mussarela', category: 'Laticínios', quantity: 20, unit: 'kg', minStock: 5 };

// stockData/setStockData vêm do componente pai (AdminDashboardPage) — este wrapper
// reproduz esse contrato com um useState de verdade, pra exercitar o fluxo real de
// "salvar → estado do pai atualiza com a resposta do servidor".
function Wrapper({ inicial = [farinhaBaixa, mussarelaOk] }) {
  const [stockData, setStockData] = useState(inicial);
  return (
    <ToastProvider>
      <Toast />
      <StockSection stockData={stockData} setStockData={setStockData} />
    </ToastProvider>
  );
}

function renderSection(props) {
  render(<Wrapper {...props} />);
}

describe('StockSection (painel admin — estoque)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra as estatísticas e os alertas de estoque baixo', () => {
    renderSection();

    expect(screen.getByText('Total de Itens').closest('.stock-stat-card')).toHaveTextContent('2');
    expect(screen.getByText('Estoque Baixo').closest('.stock-stat-card')).toHaveTextContent('1');
    expect(screen.getByText('Farinha', { selector: '.alert-item strong' })).toBeInTheDocument();
    expect(screen.queryByText('Mussarela', { selector: '.alert-item strong' })).not.toBeInTheDocument();
  });

  it('filtra por categoria e busca por nome', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Secos' }));
    expect(screen.getByText('Farinha', { selector: '.stock-item-name' }).closest('.stock-item-card')).toBeInTheDocument();
    expect(screen.queryByText('Mussarela')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Todos' }));
    await user.type(screen.getByPlaceholderText(/buscar ingrediente/i), 'muss');
    // O painel de alertas não é afetado pela busca (é um resumo geral, não a lista
    // filtrada) — "Farinha" continua lá; só o card na grade some.
    expect(screen.queryByText('Farinha', { selector: '.stock-item-name' })).not.toBeInTheDocument();
    expect(screen.getByText('Farinha', { selector: '.alert-item strong' })).toBeInTheDocument();
    expect(screen.getByText('Mussarela', { selector: '.stock-item-name' })).toBeInTheDocument();
  });

  // 🔒 persist() atualizava o estado local ANTES de confirmar que o backend salvou,
  // sem tratar falha — o painel ficava mostrando um estoque que nunca foi salvo de
  // verdade. Sucesso e falha agora são cobertos explicitamente.
  it('editar ingrediente com sucesso: atualiza com a lista confirmada pelo servidor', async () => {
    const listaConfirmadaPeloServidor = [{ ...farinhaBaixa, name: 'Farinha de Trigo' }, mussarelaOk];
    stockService.save.mockResolvedValue(listaConfirmadaPeloServidor);
    const user = userEvent.setup();
    renderSection();

    await user.click(within(screen.getByText('Farinha', { selector: '.stock-item-name' }).closest('.stock-item-card')).getByRole('button', { name: /editar/i }));
    const modal = screen.getByText('Editar Ingrediente').closest('.modal-dash');
    await user.clear(within(modal).getByLabelText('Nome'));
    await user.type(within(modal).getByLabelText('Nome'), 'Farinha de Trigo');
    await user.click(within(modal).getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText('Ingrediente atualizado.')).toBeInTheDocument();
    expect(screen.getByText('Farinha de Trigo', { selector: '.stock-item-name' })).toBeInTheDocument();
    expect(screen.getByText('Editar Ingrediente').closest('.modal-overlay-dash')).not.toHaveClass('active');
  });

  it('editar ingrediente com falha do backend: mostra o erro e mantém o modal aberto, sem alterar a lista', async () => {
    stockService.save.mockRejectedValue(new Error('Sessão de admin expirada.'));
    const user = userEvent.setup();
    renderSection();

    await user.click(within(screen.getByText('Farinha', { selector: '.stock-item-name' }).closest('.stock-item-card')).getByRole('button', { name: /editar/i }));
    const modal = screen.getByText('Editar Ingrediente').closest('.modal-dash');
    await user.clear(within(modal).getByLabelText('Nome'));
    await user.type(within(modal).getByLabelText('Nome'), 'Farinha de Trigo');
    await user.click(within(modal).getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText('Sessão de admin expirada.')).toBeInTheDocument();
    expect(screen.getByText('Editar Ingrediente').closest('.modal-overlay-dash')).toHaveClass('active');
    expect(screen.queryByText('Farinha de Trigo')).not.toBeInTheDocument();
    expect(screen.getByText('Farinha', { selector: '.stock-item-name' })).toBeInTheDocument(); // nome original, não mudou
  });

  it('ajustar estoque: soma o delta informado à quantidade atual', async () => {
    stockService.save.mockResolvedValue([{ ...farinhaBaixa, quantity: 7 }, mussarelaOk]);
    const user = userEvent.setup();
    renderSection();

    await user.click(within(screen.getByText('Farinha', { selector: '.stock-item-name' }).closest('.stock-item-card')).getByRole('button', { name: /ajustar/i }));
    const modal = screen.getByText('Ajustar Estoque').closest('.modal-dash');
    await user.clear(within(modal).getByLabelText('Adicionar / Remover'));
    await user.type(within(modal).getByLabelText('Adicionar / Remover'), '5');
    await user.click(within(modal).getByRole('button', { name: /aplicar/i }));

    expect(stockService.save).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: farinhaBaixa.id, quantity: 7 })]));
    expect(await screen.findByText('Estoque ajustado.')).toBeInTheDocument();
  });

  it('novo ingrediente: valida campos antes de chamar o backend', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: /adicionar item/i }));
    await user.click(within(screen.getByText('Novo Ingrediente').closest('.modal-dash')).getByRole('button', { name: /adicionar/i }));

    expect(await screen.findByText('Preencha todos os campos com valores válidos.')).toBeInTheDocument();
    expect(stockService.save).not.toHaveBeenCalled();
  });

  it('novo ingrediente: sucesso fecha o modal e atualiza com a lista do servidor', async () => {
    const orégano = { id: '507f1f77bcf86cd799439013', name: 'Orégano', category: 'Temperos', quantity: 3, unit: 'kg', minStock: 1 };
    stockService.save.mockResolvedValue([farinhaBaixa, mussarelaOk, orégano]);
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: /adicionar item/i }));
    const modal = screen.getByText('Novo Ingrediente').closest('.modal-dash');
    await user.type(within(modal).getByLabelText('Nome'), 'Orégano');
    await user.type(within(modal).getByLabelText('Categoria'), 'Temperos');
    await user.type(within(modal).getByLabelText('Quantidade'), '3');
    await user.type(within(modal).getByLabelText('Unidade'), 'kg');
    await user.type(within(modal).getByLabelText('Estoque Mínimo'), '1');
    await user.click(within(modal).getByRole('button', { name: /adicionar/i }));

    expect(await screen.findByText('Ingrediente adicionado.')).toBeInTheDocument();
    expect(screen.getByText('Orégano')).toBeInTheDocument();
    expect(screen.getByText('Novo Ingrediente').closest('.modal-overlay-dash')).not.toHaveClass('active');
  });
});
