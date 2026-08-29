'use strict';

const FUNCIONARIOS = [
  { nome: 'Carlos Souza', cargo: 'Gerente', telefone: '(11) 98888-1111', salario: 4200, dataContratacao: new Date('2023-01-15') },
  { nome: 'Ana Paula', cargo: 'Pizzaiola', telefone: '(11) 97777-2222', salario: 2800, dataContratacao: new Date('2023-03-10') },
  { nome: 'Roberto Dias', cargo: 'Entregador', telefone: '(11) 96666-3333', salario: 2100, dataContratacao: new Date('2024-02-20') },
];

async function seedFuncionarios(Funcionario) {
  const existentes = await Funcionario.countDocuments();
  if (existentes > 0) {
    console.log('[seed] funcionarios: já existem documentos, pulando.');
    return;
  }
  await Funcionario.insertMany(FUNCIONARIOS);
  console.log(`[seed] funcionarios: ${FUNCIONARIOS.length} inseridos.`);
}

module.exports = seedFuncionarios;
