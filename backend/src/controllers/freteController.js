'use strict';

const shippingService = require('../services/shippingService');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const freteController = {
  calcular: asyncHandler(async (req, res) => {
    // `numero` é opcional — só melhora a precisão da geocodificação quando
    // informado (ver shippingService/geocodingService); nunca foi exigido pelo
    // contrato original desta rota, então continua opcional aqui também.
    const { cep, numero } = req.body;
    const resultado = await shippingService.calcularPorCep(cep, numero);
    if (!resultado) throw new AppError('CEP inválido.', 422);
    res.status(200).json(resultado);
  }),
};

module.exports = freteController;
