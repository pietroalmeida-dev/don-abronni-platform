import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useUI } from '../../contexts/UIContext';
import UserDropdown from './UserDropdown';

export default function Navbar() {
  const { session } = useAuth();
  const { totalItems } = useCart();
  const { openCart, openLoginModal, openMobileMenu } = useUI();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header>
      <nav className="navbar flex between wrapper">
        <a href="#top" className="logo">Don Abronni</a>
        <ul className="navlist flex gap-3">
          <li><a href="#top">Home</a></li>
          <li><a href="#menu">Menu</a></li>
          <li><a href="#services">Serviço</a></li>
          <li><a href="#reviews">Sobre nós</a></li>
          <li><a href="#location">Contatos</a></li>
        </ul>
        <div className="desktop-action flex gap-2" style={{ position: 'relative' }}>
          <a
            href="#cart"
            className="cart-icon"
            id="cartIconBtn"
            onClick={(e) => { e.preventDefault(); openCart(); }}
          >
            <i className="fa-solid fa-bag-shopping" />
            <span className="cart-value" id="cartValue">{totalItems}</span>
          </a>

          {session ? (
            <a
              href="#account"
              className="btn"
              id="signInBtn"
              style={{ background: 'var(--primary-light)' }}
              onClick={(e) => { e.preventDefault(); setDropdownOpen((v) => !v); }}
            >
              <i className="fa-solid fa-circle-user" /> {session.name.split(' ')[0]}{' '}
              <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.75rem' }} />
            </a>
          ) : (
            <a href="#login" className="btn" id="signInBtn" onClick={(e) => { e.preventDefault(); openLoginModal('login'); }}>
              Entrar &nbsp; <i className="fa-solid fa-arrow-right-from-bracket" />
            </a>
          )}

          {dropdownOpen && session && (
            <UserDropdown session={session} onClose={() => setDropdownOpen(false)} />
          )}

          <a href="#menu-mobile" className="hamburguer" id="hamburgerBtn" onClick={(e) => { e.preventDefault(); openMobileMenu(); }}>
            <i className="fa-solid fa-bars" />
          </a>
        </div>
      </nav>
    </header>
  );
}
