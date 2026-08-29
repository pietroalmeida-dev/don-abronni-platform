'use strict';

const INGREDIENTES = [
  { nome: 'Muçarela', categoria: 'Laticínios', quantidade: 35, unidade: 'kg', estoqueMinimo: 10 },
  { nome: 'Pepperoni', categoria: 'Embutidos', quantidade: 12, unidade: 'kg', estoqueMinimo: 8 },
  { nome: 'Molho Tomate', categoria: 'Molhos', quantidade: 28, unidade: 'L', estoqueMinimo: 15 },
  { nome: 'Farinha', categoria: 'Massas', quantidade: 40, unidade: 'kg', estoqueMinimo: 20 },
  { nome: 'Catupiry', categoria: 'Laticínios', quantidade: 8, unidade: 'kg', estoqueMinimo: 5 },
];

async function seedIngredientes(Ingrediente) {
  const existentes = await Ingrediente.countDocuments();
  if (existentes > 0) {
    console.log('[seed] ingredientes: já existem documentos, pulando.');
    return;
  }
  await Ingrediente.insertMany(INGREDIENTES);
  console.log(`[seed] ingredientes: ${INGREDIENTES.length} inseridos.`);
}

module.exports = seedIngredientes;
