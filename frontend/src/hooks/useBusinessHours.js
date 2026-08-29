import { useEffect, useState } from 'react';
import { CONFIG } from '../config';

function calcularAberto() {
  const agora = new Date();
  const dia = agora.getDay();
  const totalMin = agora.getHours() * 60 + agora.getMinutes();
  const { diasAbertoSemana, abreMinutos, fechaMinutos } = CONFIG.HORARIO_FUNCIONAMENTO;
  return diasAbertoSemana.includes(dia) && totalMin >= abreMinutos && totalMin < fechaMinutos;
}

// Recalcula a cada minuto para refletir mudanças de horário sem precisar recarregar a página.
export function useBusinessHours() {
  const [aberto, setAberto] = useState(calcularAberto);

  useEffect(() => {
    const interval = setInterval(() => setAberto(calcularAberto()), 60000);
    return () => clearInterval(interval);
  }, []);

  return aberto;
}
