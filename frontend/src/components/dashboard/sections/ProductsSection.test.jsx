import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductsSection from './ProductsSection';
import Toast from '../../common/Toast';
import { ToastProvider } from '../../../contexts/ToastContext';
import { catalogService } from '../../../services/catalogService';

vi.mock('../../../services/catalogService', () => ({
  catalogService: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), deactivate: vi.fn(), uploadImage: vi.fn() },
}));

// jsdom não implementa URL.createObjectURL/revokeObjectURL (lança "not
// implemented") — só o handler de seleção de arquivo usa isso, então stub simples.
beforeEach(() => {
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:preview-fake'), revokeObjectURL: vi.fn() });
});

const margherita = { id: 'p1', nome: 'Margherita', descricao: 'Molho e mussarela', precoBase: 39.9, categoria: 'pizza_salgada', permiteDoisSabores: true, permiteBordaRecheada: true, destaque: true, imagem: '' };
const refrigerante = { id: 'p2', nome: 'Refrigerante Lata', descricao: '', precoBase: 6.5, categoria: 'bebida', permiteDoisSabores: false, permiteBordaRecheada: false, destaque: false, imagem: '' };

function renderSection() {
  render(
    <ToastProvider>
      <Toast />
      <ProductsSection />
    </ToastProvider>
  );
}

describe('ProductsSection (painel admin — cardápio)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogService.getAll.mockResolvedValue([margherita, refrigerante]);
  });

  it('mostra o spinner e depois os produtos com as estatísticas certas', async () => {
    renderSection();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await screen.findByText('Margherita')).toBeInTheDocument();
    expect(screen.getByText('Refrigerante Lata')).toBeInTheDocument();
    expect(screen.getByText('Produtos no cardápio').closest('.employee-stat-card')).toHaveTextContent('2');
    expect(screen.getByText('Em destaque').closest('.employee-stat-card')).toHaveTextContent('1');
  });

  it('erro ao carregar o catálogo: mostra o erro e não trava em loading pra sempre', async () => {
    catalogService.getAll.mockRejectedValue(new Error('Falha ao carregar produtos.'));
    renderSection();

    expect(await screen.findByText('Falha ao carregar produtos.')).toBeInTheDocument();
    expect(await screen.findByText('Nenhum produto encontrado.')).toBeInTheDocument();
  });

  it('filtra por categoria e busca por nome', async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Margherita');

    await user.click(screen.getByRole('button', { name: 'Bebida' }));
    expect(screen.queryByText('Margherita')).not.toBeInTheDocument();
    expect(screen.getByText('Refrigerante Lata')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Todos' }));
    await user.type(screen.getByPlaceholderText(/buscar por nome/i), 'marg');
    expect(screen.getByText('Margherita')).toBeInTheDocument();
    expect(screen.queryByText('Refrigerante Lata')).not.toBeInTheDocument();
  });

  it('novo produto: valida nome, categoria e preço antes de chamar o backend', async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Margherita');

    await user.click(screen.getByRole('button', { name: /novo produto/i }));
    await user.click(within(screen.getByRole('heading', { name: 'Novo Produto' }).closest('.modal-dash')).getByRole('button', { name: /cadastrar produto/i }));

    expect(await screen.findByText('Preencha nome, categoria e um preço válido.')).toBeInTheDocument();
    expect(catalogService.create).not.toHaveBeenCalled();
  });

  it('novo produto sem imagem: cadastra direto, sem chamar uploadImage', async () => {
    catalogService.create.mockResolvedValue({ ...margherita, id: 'p3' });
    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Margherita');

    await user.click(screen.getByRole('button', { name: /novo produto/i }));
    const modal = screen.getByRole('heading', { name: 'Novo Produto' }).closest('.modal-dash');
    await user.type(within(modal).getByLabelText('Nome *'), 'Calabresa');
    await user.type(within(modal).getByLabelText('Preço base (R$) *'), '42.5');
    await user.click(within(modal).getByRole('button', { name: /cadastrar produto/i }));

    expect(catalogService.uploadImage).not.toHaveBeenCalled();
    expect(catalogService.create).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Calabresa', precoBase: 42.5, categoria: 'pizza_salgada' }));
    expect(await screen.findByText('Produto cadastrado.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Novo Produto' }).closest('.modal-overlay-dash')).not.toHaveClass('active');
  });

  it('novo produto com imagem: envia a imagem primeiro e usa o caminho devolvido no cadastro', async () => {
    catalogService.uploadImage.mockResolvedValue({ imagem: '/uploads/calabresa.jpg' });
    catalogService.create.mockResolvedValue({ ...margherita, id: 'p3' });
    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Margherita');

    await user.click(screen.getByRole('button', { name: /novo produto/i }));
    const modal = screen.getByRole('heading', { name: 'Novo Produto' }).closest('.modal-dash');
    await user.type(within(modal).getByLabelText('Nome *'), 'Calabresa');
    await user.type(within(modal).getByLabelText('Preço base (R$) *'), '42.5');
    const arquivo = new File(['fake'], 'calabresa.jpg', { type: 'image/jpeg' });
    await user.upload(within(modal).getByLabelText('Foto do produto'), arquivo);
    await user.click(within(modal).getByRole('button', { name: /cadastrar produto/i }));

    expect(catalogService.uploadImage).toHaveBeenCalledWith(arquivo);
    expect(await screen.findByText('Produto cadastrado.')).toBeInTheDocument();
    expect(catalogService.create).toHaveBeenCalledWith(expect.objectContaining({ imagem: '/uploads/calabresa.jpg' }));
  });

  it('editar produto: pré-preenche o formulário e salva com update()', async () => {
    catalogService.update.mockResolvedValue({ ...margherita, precoBase: 45 });
    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Margherita');

    await user.click(within(screen.getByText('Margherita').closest('.employee-card')).getByRole('button', { name: /editar/i }));
    const modal = screen.getByText('Editar Produto').closest('.modal-dash');
    expect(within(modal).getByLabelText('Nome *')).toHaveValue('Margherita');
    await user.clear(within(modal).getByLabelText('Preço base (R$) *'));
    await user.type(within(modal).getByLabelText('Preço base (R$) *'), '45');
    await user.click(within(modal).getByRole('button', { name: /salvar alterações/i }));

    expect(catalogService.update).toHaveBeenCalledWith('p1', expect.objectContaining({ precoBase: 45 }));
    expect(await screen.findByText('Produto atualizado.')).toBeInTheDocument();
  });

  it('salvar com falha do backend: mostra o erro e mantém o modal aberto', async () => {
    catalogService.create.mockRejectedValue(new Error('Nome já cadastrado.'));
    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Margherita');

    await user.click(screen.getByRole('button', { name: /novo produto/i }));
    const modal = screen.getByRole('heading', { name: 'Novo Produto' }).closest('.modal-dash');
    await user.type(within(modal).getByLabelText('Nome *'), 'Margherita');
    await user.type(within(modal).getByLabelText('Preço base (R$) *'), '39.9');
    await user.click(within(modal).getByRole('button', { name: /cadastrar produto/i }));

    expect(await screen.findByText('Nome já cadastrado.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Novo Produto' }).closest('.modal-overlay-dash')).toHaveClass('active');
  });

  it('remover produto: pede confirmação e só desativa se confirmado', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    catalogService.deactivate.mockResolvedValue({});
    catalogService.getAll.mockResolvedValueOnce([margherita, refrigerante]).mockResolvedValueOnce([refrigerante]);
    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Margherita');

    await user.click(within(screen.getByText('Margherita').closest('.employee-card')).getByRole('button', { name: /remover/i }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Margherita'));
    expect(catalogService.deactivate).toHaveBeenCalledWith('p1');
    expect(await screen.findByText('Produto removido do cardápio.')).toBeInTheDocument();
  });

  it('remover produto: cancelando a confirmação não chama o backend', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Margherita');

    await user.click(within(screen.getByText('Margherita').closest('.employee-card')).getByRole('button', { name: /remover/i }));

    expect(catalogService.deactivate).not.toHaveBeenCalled();
  });
});
