import { useState } from 'react';
import { employeesService } from '../../../services/employeesService';
import { formatCurrency } from '../../../utils/format';
import { useToast } from '../../../contexts/ToastContext';
import { useChart } from '../../../hooks/useChart';
import DashboardModal from '../DashboardModal';

const FORM_VAZIO = { name: '', role: '', phone: '', salary: '', hiredDate: new Date().toISOString().slice(0, 10) };

export default function EmployeesSection({ employeesData, setEmployeesData }) {
  const [roleFiltro, setRoleFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const showToast = useToast();

  const totalPayroll = employeesData.reduce((acc, e) => acc + e.salary, 0);
  const rolesCount = employeesData.reduce((acc, e) => { acc[e.role] = (acc[e.role] || 0) + 1; return acc; }, {});
  const roles = Object.keys(rolesCount);
  const avgSalary = employeesData.length > 0 ? totalPayroll / employeesData.length : 0;

  const rolesChartRef = useChart({
    type: 'doughnut',
    data: { labels: roles, datasets: [{ data: Object.values(rolesCount), backgroundColor: ['#0f2b5e', '#1f4090', '#2c4c8c', '#4e73b0'] }] },
    options: { responsive: true },
  });

  const salaryChartRef = useChart({
    type: 'bar',
    data: { labels: roles, datasets: [{ label: 'Salário médio (R$)', data: roles.map((r) => employeesData.filter((e) => e.role === r).reduce((s, e) => s + e.salary, 0) / rolesCount[r]), backgroundColor: '#1f4090', borderRadius: 8 }] },
  });

  // Mesmo problema do StockSection: employeesData vive no componente pai e só é
  // buscado uma vez — atualizar o estado local antes de confirmar que o backend
  // salvou (sem tratar falha) deixava o painel mostrando contratações/demissões
  // que nunca foram salvas de verdade, sem nenhum aviso. Agora só atualiza com a
  // lista que o servidor confirmou, e devolve `false` em caso de erro.
  async function persist(lista) {
    try {
      setEmployeesData(await employeesService.save(lista));
      return true;
    } catch (erro) {
      showToast(erro.message || 'Não foi possível salvar. Tente novamente.', 'erro');
      return false;
    }
  }

  let filtrados = [...employeesData];
  if (roleFiltro !== 'todos') filtrados = filtrados.filter((e) => e.role === roleFiltro);
  if (busca.trim()) filtrados = filtrados.filter((e) => e.name.toLowerCase().includes(busca.toLowerCase()));

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(emp) {
    setEditandoId(emp.id);
    setForm({ name: emp.name, role: emp.role, phone: emp.phone, salary: emp.salary, hiredDate: emp.hiredDate || '2024-01-01' });
    setModalAberto(true);
  }

  async function salvar() {
    const salaryNum = parseFloat(form.salary);
    if (!form.name || !form.role || !form.phone || Number.isNaN(salaryNum)) { showToast('Preencha todos os campos.', 'erro'); return; }

    let lista;
    if (editandoId) {
      lista = employeesData.map((e) => (e.id === editandoId ? { ...e, ...form, salary: salaryNum } : e));
    } else {
      lista = [...employeesData, { id: Date.now(), ...form, salary: salaryNum }];
    }
    if (!(await persist(lista))) return;
    setModalAberto(false);
    showToast(editandoId ? 'Funcionário atualizado.' : 'Funcionário contratado.');
  }

  async function demitir(id) {
    if (!window.confirm('Deseja realmente demitir este funcionário?')) return;
    if (!(await persist(employeesData.filter((e) => e.id !== id)))) return;
    showToast('Funcionário removido.');
  }

  return (
    <>
      <div className="employees-header-stats">
        <div className="employee-stat-card"><div className="employee-stat-icon"><i className="fa-solid fa-users" /></div><div><h4>Total de Funcionários</h4><div className="employee-stat-number">{employeesData.length}</div></div></div>
        <div className="employee-stat-card"><div className="employee-stat-icon"><i className="fa-solid fa-coins" /></div><div><h4>Folha Mensal</h4><div className="employee-stat-number">{formatCurrency(totalPayroll)}</div></div></div>
        <div className="employee-stat-card"><div className="employee-stat-icon"><i className="fa-solid fa-chart-simple" /></div><div><h4>Média Salarial</h4><div className="employee-stat-number">{formatCurrency(avgSalary)}</div></div></div>
      </div>

      <div className="charts-employees">
        <div className="chart-card"><canvas ref={rolesChartRef} /></div>
        <div className="chart-card"><canvas ref={salaryChartRef} /></div>
      </div>

      <div className="employees-controls">
        <div className="employees-search"><input type="text" placeholder="🔍 Buscar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <div className="role-filter">
          {['todos', ...roles].map((r) => (
            <button key={r} className={`role-btn ${roleFiltro === r ? 'active' : ''}`} onClick={() => setRoleFiltro(r)}>{r === 'todos' ? 'Todos' : r}</button>
          ))}
        </div>
        <button className="btn-primary-dash" onClick={abrirNovo}><i className="fa-solid fa-user-plus" /> Contratar</button>
      </div>

      <div className="employees-grid">
        {filtrados.length === 0 ? (
          <div className="empty-employees"><i className="fa-regular fa-folder-open" /> Nenhum funcionário encontrado.</div>
        ) : (
          filtrados.map((emp) => (
            <div className="employee-card" key={emp.id}>
              <div className="employee-header">
                <div className="employee-avatar"><i className="fa-regular fa-user" /></div>
                <div className="employee-info"><h3>{emp.name}</h3><span className="employee-role">{emp.role}</span></div>
              </div>
              <div className="employee-details">
                <div><i className="fa-solid fa-phone" /> {emp.phone}</div>
                <div><i className="fa-regular fa-calendar" /> Desde {emp.hiredDate || '2024'}</div>
                <div className="employee-salary"><i className="fa-solid fa-dollar-sign" /> {formatCurrency(emp.salary)}</div>
              </div>
              <div className="employee-actions">
                <button onClick={() => abrirEdicao(emp)}><i className="fa-solid fa-pen" /> Editar</button>
                <button onClick={() => demitir(emp.id)}><i className="fa-solid fa-trash" /> Demitir</button>
              </div>
            </div>
          ))
        )}
      </div>

      <DashboardModal open={modalAberto} title={editandoId ? 'Editar Funcionário' : 'Contratar Funcionário'} icon={editandoId ? 'fa-user-edit' : 'fa-user-plus'} onClose={() => setModalAberto(false)}>
        <div className="form-group"><label htmlFor="empNome">Nome completo</label><input id="empNome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="empCargo">Cargo</label><input id="empCargo" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="empTelefone">Telefone</label><input id="empTelefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="empSalario">Salário (R$)</label><input id="empSalario" type="number" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="empDataContratacao">Data de contratação</label><input id="empDataContratacao" type="date" value={form.hiredDate} onChange={(e) => setForm({ ...form, hiredDate: e.target.value })} /></div>
        <button className="btn-primary-dash" style={{ width: '100%' }} onClick={salvar}>{editandoId ? 'Salvar' : 'Adicionar'}</button>
      </DashboardModal>
    </>
  );
}
