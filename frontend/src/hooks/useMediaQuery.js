import { useEffect, useState } from 'react';

// Substitui as verificações soltas de `window.innerWidth` espalhadas pelo código
// original por um hook reutilizável e reativo a redimensionamento.
export function useMediaQuery(maxWidthPx) {
  const query = `(max-width: ${maxWidthPx}px)`;
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const listener = (e) => setMatches(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
