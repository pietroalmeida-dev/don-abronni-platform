'use strict';

const { Schema, model } = require('mongoose');

// DECISÃO DE MODELAGEM (tamanhos): embutido. Cada produto tem no máximo 3-4 tamanhos
// (hoje só 1), sempre exibidos junto com o produto no cardápio — nunca faz sentido
// buscar "todos os tamanhos de todos os produtos" como uma lista independente.
const TamanhoSchema = new Schema(
  {
    nome: { type: String, required: true, default: 'Tradicional' },
    precoAdicional: { type: Number, required: true, default: 0 },
  },
  { _id: true, timestamps: false }
);

// DECISÃO DE MODELAGEM (ficha técnica / ingredientes): embutido, mas guardando uma
// REFERÊNCIA (ObjectId) para o ingrediente, não o ingrediente inteiro copiado. É um
// meio-termo comum em MongoDB: a lista de "quais ingredientes uma pizza usa e
// quanto" é pequena e sempre lida junto com o produto (embutir o relacionamento),
// mas os dados do ingrediente em si (quantidade em estoque, etc.) vivem só na
// coleção `Ingrediente` e mudam com frequência (referenciar o dado em si, não
// duplicá-lo). Se copiássemos o ingrediente inteiro aqui, teríamos que atualizar
// N produtos toda vez que o estoque de um ingrediente mudasse — o oposto do que
// queremos.
const ProdutoIngredienteSchema = new Schema(
  {
    ingrediente: { type: Schema.Types.ObjectId, ref: 'Ingrediente', required: true },
    quantidadeUsada: { type: Number, required: true },
  },
  { _id: false, timestamps: false }
);

const ProdutoSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true, unique: true },
    descricao: { type: String, trim: true, default: '' },
    imagem: { type: String, trim: true, default: '' },
    precoBase: { type: Number, required: true, min: 0 },
    // DECISÃO DE MODELAGEM (categoria): na versão relacional, categoria era uma
    // tabela própria (com FK). Em MongoDB, para um conjunto pequeno e estável de
    // valores (3 categorias, que não mudam com frequência), um campo com `enum` é
    // mais idiomático do que uma coleção separada — evita uma consulta extra
    // (equivalente a JOIN) só para saber o nome de uma categoria que raramente muda.
    // Se um dia o cardápio precisar de categorias dinâmicas (o dono cadastrando
    // categorias novas pela interface), af then vale migrar para uma coleção — hoje
    // não se justifica.
    categoria: { type: String, required: true, enum: ['pizza_salgada', 'pizza_doce', 'bebida'] },
    destaque: { type: Boolean, default: false },
    permiteDoisSabores: { type: Boolean, default: false },
    permiteBordaRecheada: { type: Boolean, default: false },
    ativo: { type: Boolean, default: true },
    tamanhos: { type: [TamanhoSchema], default: () => [{ nome: 'Tradicional', precoAdicional: 0 }] },
    ingredientes: { type: [ProdutoIngredienteSchema], default: [] },
  },
  { timestamps: true }
);

ProdutoSchema.index({ categoria: 1 });
ProdutoSchema.index({ destaque: 1 });

module.exports = model('Produto', ProdutoSchema);
