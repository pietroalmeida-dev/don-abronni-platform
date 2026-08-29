import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useEscapeKey } from '../../hooks/useEscapeKey';

export default function DashboardModal({ open, title, icon, onClose, children }) {
  useLockBodyScroll(open);
  useEscapeKey(onClose, open);

  return (
    <div className={`modal-overlay-dash ${open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-dash">
        <div className="modal-header">
          <h3>{icon && <i className={`fa-solid ${icon}`} />} {title}</h3>
          <button className="close-modal-btn" onClick={onClose} aria-label="Fechar">&times;</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
