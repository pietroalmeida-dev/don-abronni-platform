'use strict';

const { WhatsappInscrito } = require('../models');

const whatsappRepository = {
  async inscrever(dados) {
    // upsert: se o telefone já existir, atualiza o nome em vez de rejeitar —
    // evita erro de duplicidade para alguém que já se inscreveu antes.
    return WhatsappInscrito.findOneAndUpdate(
      { telefone: dados.telefone },
      { $set: dados },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );
  },
};

module.exports = whatsappRepository;
