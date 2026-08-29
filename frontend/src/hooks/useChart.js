import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

// Encapsula o padrão repetido de "criar Chart.js, destruir o anterior, recriar
// quando os dados mudam" que existia solto em cada função de renderização do
// painel administrativo original.
export function useChart(config) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !config) return undefined;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, config);
    return () => chartRef.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(config)]);

  return canvasRef;
}
