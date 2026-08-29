import { CONFIG } from '../config';
import { formatCurrency } from '../utils/format';

const preco = CONFIG.BORDA_RECHEADA_PRECO;

export const BORDA_OPCOES = [
  { id: 'none', label: 'Sem borda', desc: 'Pizza tradicional', icon: 'fa-ban', price: 0 },
  { id: 'Catupiry', label: 'Catupiry', desc: `+ ${formatCurrency(preco)}`, icon: 'fa-cheese', price: preco },
  { id: 'Cheddar', label: 'Cheddar', desc: `+ ${formatCurrency(preco)}`, icon: 'fa-cheese', price: preco },
  { id: 'Chocolate', label: 'Chocolate', desc: `+ ${formatCurrency(preco)}`, icon: 'fa-cookie-bite', price: preco },
];

export function obterOpcaoBorda(id) {
  return BORDA_OPCOES.find((o) => o.id === id) || BORDA_OPCOES[0];
}
