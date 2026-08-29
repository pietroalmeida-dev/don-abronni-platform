import { api } from './apiClient';
import { authService } from './authService';

// O backend infere o dono do endereço a partir do token JWT (rota GET/POST
// /api/enderecos), então `userId` não é mais enviado — mantido no parâmetro só
// para não quebrar a assinatura que StepDelivery/CheckoutModal já chamam.
export const addressesService = {
  async getByUser(_userId) {
    const { token } = authService.getSession() || {};
    return api.get('/enderecos', token);
  },
  async add(_userId, endereco) {
    const { token } = authService.getSession() || {};
    return api.post('/enderecos', endereco, token);
  },
  async update(id, endereco) {
    const { token } = authService.getSession() || {};
    return api.put(`/enderecos/${id}`, endereco, token);
  },
  async remove(id) {
    const { token } = authService.getSession() || {};
    return api.del(`/enderecos/${id}`, token);
  },
};
