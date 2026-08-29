import { useToastState } from '../../contexts/ToastContext';

export default function Toast() {
  const toast = useToastState();
  if (!toast) return <div className="toast-msg" />;

  return (
    <div key={toast.key} className={`toast-msg toast-visible toast-${toast.type}`}>
      {toast.message}
    </div>
  );
}
