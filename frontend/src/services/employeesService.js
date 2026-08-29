import { api } from './apiClient';
import { authService } from './authService';

function token() {
  return authService.getAdminSession()?.token;
}

// IDs do Mongo são strings hex de 24 caracteres. Um item novo (ainda não salvo)
// chega com `id: Date.now()` (número) — é assim que EmployeesSection distingue
// "contratar" de "editar" antes de chamar save().
const ID_MONGO = /^[0-9a-f]{24}$/i;
function ehIdReal(id) {
  return typeof id === 'string' && ID_MONGO.test(id);
}

function paraFuncionarioFrontend(f) {
  return {
    id: f.id,
    name: f.nome,
    role: f.cargo,
    phone: f.telefone,
    salary: f.salario,
    hiredDate: f.dataContratacao ? String(f.dataContratacao).slice(0, 10) : null,
  };
}
function paraFuncionarioBackend(e) {
  return { nome: e.name, cargo: e.role, telefone: e.phone, salario: e.salary, dataContratacao: e.hiredDate };
}

export const employeesService = {
  async getAll() {
    const funcionarios = await api.get('/funcionarios', token());
    return funcionarios.map(paraFuncionarioFrontend);
  },

  // Não existe um "salvar lista inteira" no backend (cada funcionário é seu próprio
  // recurso REST) — EmployeesSection continua passando a lista completa desejada
  // (depois de contratar/editar/demitir localmente), e aqui comparamos com o que
  // já está no servidor pra disparar só os create/update/delete necessários.
  async save(lista) {
    const t = token();
    const atuais = await api.get('/funcionarios', t);
    const idsAtuais = new Set(atuais.map((f) => f.id));
    const idsDesejados = new Set(lista.filter((e) => ehIdReal(e.id)).map((e) => e.id));

    await Promise.all([
      // Demitidos: existiam no servidor, não estão mais na lista nova.
      ...atuais.filter((f) => !idsDesejados.has(f.id)).map((f) => api.del(`/funcionarios/${f.id}`, t)),
      // Editados: já existiam, continuam na lista.
      ...lista.filter((e) => ehIdReal(e.id) && idsAtuais.has(e.id)).map((e) => api.put(`/funcionarios/${e.id}`, paraFuncionarioBackend(e), t)),
      // Novos: id temporário (número), nunca existiu no servidor.
      ...lista.filter((e) => !ehIdReal(e.id)).map((e) => api.post('/funcionarios', paraFuncionarioBackend(e), t)),
    ]);

    const atualizados = await api.get('/funcionarios', t);
    return atualizados.map(paraFuncionarioFrontend);
  },
};
