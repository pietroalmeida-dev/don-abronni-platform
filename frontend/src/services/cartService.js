import { STORAGE_KEYS, lerJSON, salvarJSON } from './storage';

// O carrinho continua sendo por navegador (não por usuário) — é assim que praticamente
// todo e-commerce real funciona (carrinho de visitante, persiste sem precisar de login).
export const cartService = {
  load() {
    return lerJSON(STORAGE_KEYS.CART, []);
  },
  save(cart) {
    salvarJSON(STORAGE_KEYS.CART, cart);
  },
};
