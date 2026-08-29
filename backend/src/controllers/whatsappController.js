'use strict';

const whatsappService = require('../services/whatsappService');
const asyncHandler = require('../utils/asyncHandler');

const whatsappController = {
  inscrever: asyncHandler(async (req, res) => {
    const inscrito = await whatsappService.inscrever(req.body);
    res.status(201).json(inscrito);
  }),
};

module.exports = whatsappController;
