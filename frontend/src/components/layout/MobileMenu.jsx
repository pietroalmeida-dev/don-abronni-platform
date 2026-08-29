import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useToast } from '../../contexts/ToastContext';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export default function MobileMenu() {
  const { isMobileMenuOpen, closeMobileMenu, openLoginModal, openAccountModal } = useUI();
  const { session, logout } = useAuth();
  const showToast = useToast();

  useLockBodyScroll(isMobileMenuOpen);
  useEscapeKey(closeMobileMenu, isMobileMenuOpen);

  function scrollToSection(e, href) {
    closeMobileMenu();
    if (href && href !== '#top') {
      e.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function handleLogout() {
    logout();
    closeMobileMenu();
    showToast('Você saiu da conta.');
  }

  // Mesmas 3 telas do dropdown de desktop (UserDropdown) — antes só existiam lá, e
  // como o dropdown de desktop fica oculto em qualquer tela < 900px (ver CSS,
  // `.desktop-action .btn { display: none }`), um cliente em celular/tablet não
  // tinha NENHUMA forma de abrir "Meu Perfil"/"Meus Pedidos"/"Meus Endereços".
  function abrirConta(tipo) {
    closeMobileMenu();
    openAccountModal(tipo);
  }

  return (
    <>
      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`} onClick={closeMobileMenu} />
      <div className={`mobile-menu-panel ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-header">
          <h3><i className="fa-solid fa-pizza-slice" /> Menu</h3>
          <button className="mobile-close-btn" onClick={closeMobileMenu} aria-label="Fechar menu">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {session && (
          <div className="mobile-user-info">
            <i className="fa-solid fa-circle-user" />
            <div className="mobile-user-info__text"><strong>{session.name.split(' ')[0]}</strong><span>{session.email}</span></div>
          </div>
        )}

        {session && (
          <ul className="mobile-nav-list">
            <li><a href="#profile" onClick={(e) => { e.preventDefault(); abrirConta('profile'); }}><i className="fa-solid fa-circle-user" /> Meu perfil</a></li>
            <li><a href="#orders" onClick={(e) => { e.preventDefault(); abrirConta('orders'); }}><i className="fa-solid fa-receipt" /> Meus pedidos</a></li>
            <li><a href="#addresses" onClick={(e) => { e.preventDefault(); abrirConta('addresses'); }}><i className="fa-solid fa-location-dot" /> Meus endereços</a></li>
          </ul>
        )}

        <ul className="mobile-nav-list">
          <li><a href="#top" onClick={(e) => scrollToSection(e, '#top')}><i className="fa-solid fa-house" /> Home</a></li>
          <li><a href="#menu" onClick={(e) => scrollToSection(e, '#menu')}><i className="fa-solid fa-utensils" /> Menu</a></li>
          <li><a href="#services" onClick={(e) => scrollToSection(e, '#services')}><i className="fa-solid fa-concierge-bell" /> Serviço</a></li>
          <li><a href="#reviews" onClick={(e) => scrollToSection(e, '#reviews')}><i className="fa-solid fa-users" /> Sobre nós</a></li>
          <li><a href="#location" onClick={(e) => scrollToSection(e, '#location')}><i className="fa-solid fa-map-marker-alt" /> Contatos</a></li>
        </ul>

        <div className="mobile-menu-footer">
          {session ? (
            <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
              <i className="fa-solid fa-right-from-bracket" /> Sair da conta
            </button>
          ) : (
            <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { closeMobileMenu(); openLoginModal('login'); }}>
              <i className="fa-solid fa-arrow-right-from-bracket" /> Entrar
            </button>
          )}
          <p style={{ marginTop: '1rem' }}><i className="fa-regular fa-heart" /> Don Abronni - Sabor que abraça</p>
        </div>
      </div>
    </>
  );
}
