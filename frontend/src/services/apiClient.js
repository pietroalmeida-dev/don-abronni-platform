import { CONFIG } from '../config';

// Cliente HTTP fino e compartilhado por todos os services — centraliza 3 coisas que,
// sem isso, cada service reimplementaria do seu jeito: montar a URL/headers, anexar
// o token JWT (Authorization: Bearer) quando há um logado, e transformar uma
// resposta de erro do backend ({ erro, detalhes }) num Error com mensagem pronta
// para mostrar ao usuário (showToast(erro.message)).
async function request(path, { method = 'GET', body, token, isFormData = false } = {}) {
  const temCorpo = body !== undefined;
  const headers = {};
  if (temCorpo && !isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${CONFIG.API_URL}${path}`, {
    method,
    headers,
    body: temCorpo ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  let dados = null;
  try {
    dados = await response.json();
  } catch {
    // resposta sem corpo JSON (ex.: 204) — segue com dados = null
  }

  if (!response.ok) {
    // src/middlewares/validar.js manda `detalhes` como [{ campo, mensagem }] nos 422
    // de validação — junta as mensagens específicas em vez do genérico "Dados
    // inválidos.", preservando a UX de mensagem de campo que o protótipo já tinha.
    const mensagem = dados?.detalhes?.length
      ? dados.detalhes.map((d) => d.mensagem).join(' ')
      : dados?.erro || `Erro ${response.status} ao comunicar com o servidor.`;
    const erro = new Error(mensagem);
    erro.status = response.status;
    erro.detalhes = dados?.detalhes;

    // Só dispara pra chamadas que JÁ mandavam um token (uma sessão existente sendo
    // rejeitada — token expirado/inválido). Login e registro nunca passam `token`
    // aqui, então uma senha errada não aciona isso à toa. Quem escuta (AuthContext)
    // decide se é a sessão de cliente ou de admin e faz o logout automático.
    if (response.status === 401 && token) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { token } }));
    }

    throw erro;
  }

  return dados;
}

export const api = {
  get: (path, token) => request(path, { method: 'GET', token }),
  post: (path, body, token) => request(path, { method: 'POST', body, token }),
  postForm: (path, formData, token) => request(path, { method: 'POST', body: formData, token, isFormData: true }),
  put: (path, body, token) => request(path, { method: 'PUT', body, token }),
  patch: (path, body, token) => request(path, { method: 'PATCH', body: body ?? {}, token }),
  del: (path, token) => request(path, { method: 'DELETE', token }),
};
