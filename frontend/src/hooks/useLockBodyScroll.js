import { useEffect } from 'react';

// Substitui o padrão repetido `document.body.style.overflow = 'hidden' / ''` que
// aparecia em cada modal do projeto original.
export function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}
