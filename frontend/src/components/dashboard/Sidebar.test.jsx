import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from './Sidebar';

function setup(props = {}) {
  const onSelect = vi.fn();
  const onLogout = vi.fn();
  const onClose = vi.fn();
  render(
    <Sidebar
      activeSection="dashboard"
      onSelect={onSelect}
      onLogout={onLogout}
      pendingOrders={0}
      isOpen={false}
      onClose={onClose}
      {...props}
    />
  );
  return { onSelect, onLogout, onClose };
}

describe('Sidebar (painel admin)', () => {
  it('mostra as 6 seções do painel', () => {
    setup();
    ['Dashboard', 'Pedidos', 'Cardápio', 'Estoque', 'Funcionários', 'Clientes'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('marca a seção ativa recebida via prop, não uma fixa', () => {
    setup({ activeSection: 'stock' });
    expect(screen.getByText('Estoque').closest('li')).toHaveClass('active');
    expect(screen.getByText('Dashboard').closest('li')).not.toHaveClass('active');
  });

  it('clicar em uma seção chama onSelect com a chave certa (não o texto exibido)', async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();

    await user.click(screen.getByText('Funcionários'));

    expect(onSelect).toHaveBeenCalledWith('employees');
  });

  it('mostra o badge de pedidos pendentes só em "Pedidos", com o número certo', () => {
    setup({ pendingOrders: 3 });
    const itemPedidos = screen.getByText('Pedidos').closest('li');
    expect(itemPedidos).toHaveTextContent('3');
    // Nenhuma outra seção tem badge — o "3" só deve existir dentro do item de Pedidos.
    expect(screen.getByText('Cardápio').closest('li')).not.toHaveTextContent('3');
  });

  it('"Sair" chama onLogout, não onSelect', async () => {
    const user = userEvent.setup();
    const { onLogout, onSelect } = setup();

    await user.click(screen.getByText('Sair'));

    expect(onLogout).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('isOpen controla a classe "open" (sidebar mobile) e o X fecha via onClose', async () => {
    const user = userEvent.setup();
    const { onClose } = setup({ isOpen: true });

    expect(document.querySelector('.sidebar')).toHaveClass('open');

    await user.click(screen.getByRole('button', { name: /fechar menu/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
