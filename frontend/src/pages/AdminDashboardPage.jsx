import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ordersService } from '../services/ordersService';
import { stockService } from '../services/stockService';
import { employeesService } from '../services/employeesService';
import { CONFIG } from '../config';
import AdminLoginForm from '../components/dashboard/AdminLoginForm';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHome from '../components/dashboard/sections/DashboardHome';
import OrdersSection from '../components/dashboard/sections/OrdersSection';
import ProductsSection from '../components/dashboard/sections/ProductsSection';
import StockSection from '../components/dashboard/sections/StockSection';
import EmployeesSection from '../components/dashboard/sections/EmployeesSection';
import CustomersSection from '../components/dashboard/sections/CustomersSection';
import Toast from '../components/common/Toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const TITULOS = {
  dashboard: 'Dashboard', orders: 'Gestão de Pedidos', products: 'Gestão de Cardápio',
  stock: 'Estoque de Ingredientes', employees: 'Funcionários', customers: 'Clientes',
};

export default function AdminDashboardPage() {
  const { adminSession, adminLogout } = useAuth();
  const showToast = useToast();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);

  const [stockData, setStockData] = useState(null);
  const [employeesData, setEmployeesData] = useState(null);

  // Sem o .catch() aqui, uma falha de rede (ou token expirado — ver AuthContext)
  // deixava stockData/employeesData como `null` pra sempre, travando o painel
  // inteiro em "Carregando painel..." sem nenhuma explicação.
  useEffect(() => {
    if (!adminSession) return;
    stockService.getAll().then(setStockData).catch((erro) => {
      showToast(erro.message, 'erro');
      setStockData([]);
    });
    employeesService.getAll().then(setEmployeesData).catch((erro) => {
      showToast(erro.message, 'erro');
      setEmployeesData([]);
    });
    atualizarBadge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSession]);

  async function atualizarBadge() {
    try {
      const pedidos = await ordersService.getAll();
      setPendingOrders(pedidos.filter((o) => o.status !== CONFIG.STATUS_PEDIDO.ENTREGUE && o.status !== CONFIG.STATUS_PEDIDO.CANCELADO).length);
    } catch (erro) {
      showToast(erro.message, 'erro');
    }
  }

  if (!adminSession) {
    return (
      <>
        <AdminLoginForm onLoginSuccess={() => {}} />
        <Toast />
      </>
    );
  }

  if (!stockData || !employeesData) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}><LoadingSpinner label="Carregando painel..." /></div>;
  }

  return (
    <div id="dashboardApp" style={{ display: 'flex' }}>
      <Sidebar
        activeSection={activeSection}
        onSelect={(s) => { setActiveSection(s); setSidebarOpen(false); }}
        onLogout={adminLogout}
        pendingOrders={pendingOrders}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main-content">
        <header className="top-bar">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><i className="fa-solid fa-bars" /></button>
          <div className="top-bar-title"><h2>{TITULOS[activeSection]}</h2></div>
          <div className="admin-profile"><i className="fa-regular fa-user-circle" /><span>Proprietário</span></div>
        </header>
        <div className="content-area">
          {activeSection === 'dashboard' && (
            <DashboardHome stockData={stockData} employeesData={employeesData} onViewAllOrders={() => setActiveSection('orders')} />
          )}
          {activeSection === 'orders' && <OrdersSection onOrdersChanged={atualizarBadge} />}
          {activeSection === 'products' && <ProductsSection />}
          {activeSection === 'stock' && <StockSection stockData={stockData} setStockData={setStockData} />}
          {activeSection === 'employees' && <EmployeesSection employeesData={employeesData} setEmployeesData={setEmployeesData} />}
          {activeSection === 'customers' && <CustomersSection />}
        </div>
      </main>
      <Toast />
    </div>
  );
}
