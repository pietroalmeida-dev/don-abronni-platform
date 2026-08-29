import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmployeesSection from './EmployeesSection';
import Toast from '../../common/Toast';
import { ToastProvider } from '../../../contexts/ToastContext';
import { employeesService } from '../../../services/employeesService';

vi.mock('../../../services/employeesService', () => ({
  employeesService: { save: vi.fn() },
}));
vi.mock('../../../hooks/useChart', () => ({ useChart: () => ({ current: null }) }));

const entregador = { id: '507f1f77bcf86cd799439021', name: 'João Pereira', role: 'Entregador', phone: '11999990000', salary: 1800, hiredDate: '2025-01-10' };
const atendente = { id: '507f1f77bcf86cd799439022', name: 'Marina Alves', role: 'Atendente', phone: '11988880000', salary: 2100, hiredDate: '2024-06-01' };

// Reproduz o contrato real com o pai (AdminDashboardPage): employeesData/setEmployeesData.
function Wrapper({ inicial = [entregador, atendente] }) {
  const [employeesData, setEmployeesData] = useState(inicial);
  return (
    <ToastProvider>
      <Toast />
      <EmployeesSection employeesData={employeesData} setEmployeesData={setEmployeesData} />
    </ToastProvider>
  );
}

function renderSection(props) {
  render(<Wrapper {...props} />);
}

describe('EmployeesSection (painel admin — funcionários)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // window.confirm é usado por demitir() — sem mockar, o jsdom lança "not implemented".
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('mostra as estatísticas (total, folha mensal, média salarial) e a lista', () => {
    renderSection();

    expect(screen.getByText('Total de Funcionários').closest('.employee-stat-card')).toHaveTextContent('2');
    expect(screen.getByText('João Pereira')).toBeInTheDocument();
    expect(screen.getByText('Marina Alves')).toBeInTheDocument();
  });

  it('filtra por cargo e busca por nome', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Entregador' }));
    expect(screen.getByText('João Pereira')).toBeInTheDocument();
    expect(screen.queryByText('Marina Alves')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Todos' }));
    await user.type(screen.getByPlaceholderText(/buscar por nome/i), 'marina');
    expect(screen.queryByText('João Pereira')).not.toBeInTheDocument();
    expect(screen.getByText('Marina Alves')).toBeInTheDocument();
  });

  // 🔒 Mesmo bug do StockSection: persist() atualizava o estado antes de confirmar
  // o backend, sem tratar falha. Sucesso e falha cobertos explicitamente.
  it('editar funcionário com sucesso: atualiza com a lista confirmada pelo servidor', async () => {
    const confirmado = [{ ...entregador, name: 'João P. Silva' }, atendente];
    employeesService.save.mockResolvedValue(confirmado);
    const user = userEvent.setup();
    renderSection();

    await user.click(within(screen.getByText('João Pereira').closest('.employee-card')).getByRole('button', { name: /editar/i }));
    const modal = screen.getByText('Editar Funcionário').closest('.modal-dash');
    await user.clear(within(modal).getByLabelText('Nome completo'));
    await user.type(within(modal).getByLabelText('Nome completo'), 'João P. Silva');
    await user.click(within(modal).getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText('Funcionário atualizado.')).toBeInTheDocument();
    expect(screen.getByText('João P. Silva')).toBeInTheDocument();
    expect(screen.getByText('Editar Funcionário').closest('.modal-overlay-dash')).not.toHaveClass('active');
  });

  it('editar funcionário com falha do backend: mostra o erro, mantém o modal aberto e não altera a lista', async () => {
    employeesService.save.mockRejectedValue(new Error('Sessão de admin expirada.'));
    const user = userEvent.setup();
    renderSection();

    await user.click(within(screen.getByText('João Pereira').closest('.employee-card')).getByRole('button', { name: /editar/i }));
    const modal = screen.getByText('Editar Funcionário').closest('.modal-dash');
    await user.clear(within(modal).getByLabelText('Nome completo'));
    await user.type(within(modal).getByLabelText('Nome completo'), 'João P. Silva');
    await user.click(within(modal).getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText('Sessão de admin expirada.')).toBeInTheDocument();
    expect(screen.getByText('Editar Funcionário').closest('.modal-overlay-dash')).toHaveClass('active');
    expect(screen.queryByText('João P. Silva')).not.toBeInTheDocument();
    expect(screen.getByText('João Pereira')).toBeInTheDocument();
  });

  it('contratar funcionário: valida campos obrigatórios antes de chamar o backend', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: /contratar/i }));
    await user.click(within(screen.getByText('Contratar Funcionário').closest('.modal-dash')).getByRole('button', { name: /adicionar/i }));

    expect(await screen.findByText('Preencha todos os campos.')).toBeInTheDocument();
    expect(employeesService.save).not.toHaveBeenCalled();
  });

  it('contratar funcionário: sucesso fecha o modal e atualiza com a lista do servidor', async () => {
    const novoFuncionario = { id: '507f1f77bcf86cd799439023', name: 'Carla Nunes', role: 'Cozinheira', phone: '11977770000', salary: 2500, hiredDate: '2026-08-10' };
    employeesService.save.mockResolvedValue([entregador, atendente, novoFuncionario]);
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: /contratar/i }));
    const modal = screen.getByText('Contratar Funcionário').closest('.modal-dash');
    await user.type(within(modal).getByLabelText('Nome completo'), 'Carla Nunes');
    await user.type(within(modal).getByLabelText('Cargo'), 'Cozinheira');
    await user.type(within(modal).getByLabelText('Telefone'), '11977770000');
    await user.type(within(modal).getByLabelText('Salário (R$)'), '2500');
    await user.click(within(modal).getByRole('button', { name: /adicionar/i }));

    expect(await screen.findByText('Funcionário contratado.')).toBeInTheDocument();
    expect(screen.getByText('Carla Nunes')).toBeInTheDocument();
    expect(screen.getByText('Contratar Funcionário').closest('.modal-overlay-dash')).not.toHaveClass('active');
  });

  it('demitir: pede confirmação e, se confirmado, remove e persiste', async () => {
    employeesService.save.mockResolvedValue([atendente]);
    const user = userEvent.setup();
    renderSection();

    await user.click(within(screen.getByText('João Pereira').closest('.employee-card')).getByRole('button', { name: /demitir/i }));

    expect(window.confirm).toHaveBeenCalledOnce();
    expect(employeesService.save).toHaveBeenCalledWith(expect.not.arrayContaining([expect.objectContaining({ id: entregador.id })]));
    expect(await screen.findByText('Funcionário removido.')).toBeInTheDocument();
    expect(screen.queryByText('João Pereira')).not.toBeInTheDocument();
  });

  it('demitir: cancelando a confirmação não chama o backend nem altera a lista', async () => {
    window.confirm.mockReturnValue(false);
    const user = userEvent.setup();
    renderSection();

    await user.click(within(screen.getByText('João Pereira').closest('.employee-card')).getByRole('button', { name: /demitir/i }));

    expect(employeesService.save).not.toHaveBeenCalled();
    expect(screen.getByText('João Pereira')).toBeInTheDocument();
  });
});
