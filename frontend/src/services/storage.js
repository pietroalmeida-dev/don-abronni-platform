// Chaves de armazenamento usadas pelos serviços que ainda são locais (localStorage).
// Mantidas em um único lugar para evitar strings mágicas espalhadas pelo código.
export const STORAGE_KEYS = {
  SESSION: 'donAbronniSession',
  ADMIN_SESSION: 'donAbronniAdminSession',
  CART: 'donAbronniCart',
};

// Chaves da era 100% localStorage (antes da integração com a API real) que nenhum
// service usa mais — ficavam órfãs no navegador de quem já tinha usado o protótipo
// antigo. Remove uma vez, silenciosamente, na primeira carga do app depois desta
// mudança (ver import em src/main.jsx).
const CHAVES_OBSOLETAS = [
  'donAbronniUsers_v2',
  'donAbronniPedidos',
  'donAbronniEstoque',
  'donAbronniFuncionarios',
];
const PREFIXO_ENDERECOS_OBSOLETO = 'donAbronniEnderecos_';

export function limparDadosObsoletos() {
  CHAVES_OBSOLETAS.forEach((chave) => localStorage.removeItem(chave));
  Object.keys(localStorage)
    .filter((chave) => chave.startsWith(PREFIXO_ENDERECOS_OBSOLETO))
    .forEach((chave) => localStorage.removeItem(chave));
}

export function lerJSON(key, valorPadrao) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : valorPadrao;
  } catch {
    return valorPadrao;
  }
}

export function salvarJSON(key, valor) {
  localStorage.setItem(key, JSON.stringify(valor));
}
