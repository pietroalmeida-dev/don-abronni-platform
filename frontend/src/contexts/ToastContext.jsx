import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // { message, type }
  const timeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'sucesso', duration = 2800) => {
    clearTimeout(timeoutRef.current);
    setToast({ message, type, key: Date.now() });
    timeoutRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa ser usado dentro de um ToastProvider');
  return ctx.showToast;
}

// Usado apenas pelo componente <Toast /> para renderizar o estado atual.
export function useToastState() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastState precisa ser usado dentro de um ToastProvider');
  return ctx.toast;
}
