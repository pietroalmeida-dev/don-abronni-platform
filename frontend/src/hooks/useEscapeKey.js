import { useEffect } from 'react';

// Pequena melhoria de acessibilidade que não existia na versão anterior: fecha
// modais com a tecla Esc.
export function useEscapeKey(onEscape, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    function handler(e) {
      if (e.key === 'Escape') onEscape();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape, active]);
}
