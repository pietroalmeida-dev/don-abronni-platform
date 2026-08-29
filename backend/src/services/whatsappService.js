'use strict';

const whatsappRepository = require('../repositories/whatsappRepository');
const AppError = require('../utils/AppError');

const whatsappService = {
  async inscrever({ nome, telefone }) {
    const digitos = (telefone || '').replace(/\D/g, '');
    if (digitos.length < 10 || digitos.length > 11) {
      throw new AppError('Digite um número válido com DDD.', 422);
    }
    return whatsappRepository.inscrever({ nome: nome || '', telefone: digitos });
  },
};

module.exports = whatsappService;
