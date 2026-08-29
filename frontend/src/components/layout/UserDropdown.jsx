import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useToast } from '../../contexts/ToastContext';

export default function UserDropdown({ session, onClose }) {
  const { logout } = useAuth();
  const { openAccountModal } = useUI();
  const showToast = useToast();
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target) && e.target.id !== 'signInBtn') {
        onClose();
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  function handleLogout() {
    logout();
    onClose();
    showToast('Até logo! Você saiu da conta.');
  }

  function abrir(tipo) {
    onClose();
    openAccountModal(tipo);
  }

  return (
    <div className="user-dropdown active" ref={ref}>
      <div className="user-dropdown-header">
        <i className="fa-solid fa-circle-user" />
        <div className="user-dropdown-header__text">
          <strong>{session.name}</strong>
          <span>{session.email}</span>
        </div>
      </div>
      <div className="user-dropdown-divider" />
      <button className="user-dropdown-item" onClick={() => abrir('profile')}>
        <i className="fa-solid fa-circle-user" /> Meu perfil
      </button>
      <button className="user-dropdown-item" onClick={() => abrir('orders')}>
        <i className="fa-solid fa-receipt" /> Meus pedidos
      </button>
      <button className="user-dropdown-item" onClick={() => abrir('addresses')}>
        <i className="fa-solid fa-location-dot" /> Meus endereços
      </button>
      <div className="user-dropdown-divider" />
      <button className="user-dropdown-item user-dropdown-logout" onClick={handleLogout}>
        <i className="fa-solid fa-right-from-bracket" /> Sair
      </button>
    </div>
  );
}
