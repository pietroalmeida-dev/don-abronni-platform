// Utilitários de formatação compartilhados por toda a aplicação.
//
// Nota de segurança: na versão anterior (HTML/JS puro), havia uma função
// `escapeHtml()` central porque dados do usuário eram inseridos via `innerHTML`.
// No React isso deixa de ser necessário na imensa maioria dos casos: o JSX escapa
// automaticamente qualquer valor renderizado como `{variavel}`, então o mesmo risco
// de XSS simples não existe mais aqui — só voltaria a existir se algum componente
// usasse `dangerouslySetInnerHTML`, o que este projeto evita por completo.

export function formatCurrency(val) {
  return `R$ ${parseFloat(val || 0).toFixed(2).replace('.', ',')}`;
}

export function gerarNumeroNota() {
  const now = new Date();
  const data = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `DA-${data}-${seq}`;
}

export function formatarDataHora(isoString) {
  if (!isoString) return '—';
  const data = new Date(isoString);
  // new Date(string) não lança exceção para uma string que não é uma data — ela
  // só devolve um Date "Invalid Date" (Number.isNaN no getTime()). O try/catch
  // sozinho nunca pegava esse caso; sem essa checagem explícita, um registro com
  // data corrompida mostraria "Invalid Date" na tela em vez do traço padrão.
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleDateString('pt-BR');
}

// Formata o CEP como o usuário digita (00000-000) — usado tanto no checkout
// (StepDelivery) quanto na tela "Meus Endereços" (AddressesModal). Extraído aqui
// pra não duplicar a mesma lógica nos dois lugares.
export function formatarCep(valor) {
  let v = valor.replace(/\D/g, '');
  if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5, 8);
  return v;
}
