const ITEMS = [
  { key: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
  { key: 'orders', icon: 'fa-truck', label: 'Pedidos', badge: true },
  { key: 'products', icon: 'fa-pizza-slice', label: 'Cardápio' },
  { key: 'stock', icon: 'fa-boxes', label: 'Estoque' },
  { key: 'employees', icon: 'fa-users', label: 'Funcionários' },
  { key: 'customers', icon: 'fa-user-group', label: 'Clientes' },
];

export default function Sidebar({ activeSection, onSelect, onLogout, pendingOrders, isOpen, onClose }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-side"><i className="fa-solid fa-pizza-slice" /><span>Don Abronni</span></div>
        <button className="close-sidebar" onClick={onClose} aria-label="Fechar menu"><i className="fa-solid fa-times" /></button>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {ITEMS.map((item) => (
            <li
              key={item.key}
              className={`nav-item ${activeSection === item.key ? 'active' : ''}`}
              onClick={() => onSelect(item.key)}
            >
              <i className={`fa-solid ${item.icon}`} /> <span>{item.label}</span>
              {item.badge && <span className="badge">{pendingOrders}</span>}
            </li>
          ))}
          <li className="nav-item logout-btn" onClick={onLogout}>
            <i className="fa-solid fa-sign-out-alt" /> <span>Sair</span>
          </li>
        </ul>
      </nav>
      <div className="sidebar-footer"><small>© 2026 Don Abronni</small></div>
    </aside>
  );
}
