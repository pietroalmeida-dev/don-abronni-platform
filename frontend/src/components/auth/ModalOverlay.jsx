import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useEscapeKey } from '../../hooks/useEscapeKey';

// Overlay compartilhado por todos os modais "de conta do cliente" (Login, Meus
// Pedidos, Meus Endereços, Meu Perfil) — antes cada um reimplementava a mesma
// combinação de travar o scroll da página, fechar com Esc/clique fora, e o botão
// de fechar. Essa duplicação já causou um bug real: dois modais novos (Endereços,
// Perfil) foram copiados de um modal mais antigo (Meus Pedidos) que nunca teve a
// trava de scroll — e herdaram a mesma falha sem ninguém perceber. Centralizando
// aqui, um modal novo não tem como "esquecer" esse comportamento.
export default function ModalOverlay({ open = true, onClose, children }) {
  useLockBodyScroll(open);
  useEscapeKey(onClose, open);

  if (!open) return null;

  return (
    <div className="modal-overlay modal-active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="login-modal professional-modal">
        <button className="close-modal-btn" onClick={onClose} aria-label="Fechar"><i className="fa-solid fa-xmark" /></button>
        {children}
      </div>
    </div>
  );
}
