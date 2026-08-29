'use strict';

const usuarioService = require('../services/usuarioService');
const asyncHandler = require('../utils/asyncHandler');

const usuarioController = {
  listarComEstatisticas: asyncHandler(async (req, res) => {
    res.status(200).json(await usuarioService.listarComEstatisticas());
  }),
};

module.exports = usuarioController;
