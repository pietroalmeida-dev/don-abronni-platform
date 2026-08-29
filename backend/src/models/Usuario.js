'use strict';

const { Schema, model } = require('mongoose');

// DECISÃO DE MODELAGEM: endereço é um EMBUTIDO (subdocumento) dentro de usuário, não
// uma coleção separada. Motivo: um endereço só faz sentido no contexto do usuário
// dono dele, a lista é pequena (ninguém tem centenas de endereços salvos), e sempre
// que buscamos o usuário para o checkout, queremos os endereços dele junto — não faz
// sentido gastar uma segunda consulta (nem um "$lookup", o equivalente a JOIN no
// Mongo) para isso. Esse é o caso clássico de "embutir" em MongoDB: dados possuídos,
// limitados em quantidade, e sempre acessados junto com o "dono".
const EnderecoSchema = new Schema(
  {
    rua: { type: String, required: true, trim: true },
    numero: { type: String, required: true, trim: true },
    bairro: { type: String, required: true, trim: true },
    cep: { type: String, required: true, trim: true },
    complemento: { type: String, trim: true, default: '' },
  },
  { _id: true, timestamps: false } // cada endereço embutido ainda ganha seu próprio _id, para poder ser referenciado/editado individualmente
);

const UsuarioSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true, // cria um índice único automaticamente
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'E-mail inválido'],
    },
    // Nunca se chama "senha" — o nome deixa explícito que aqui só mora o hash bcrypt,
    // nunca o texto puro. `select: false` significa que nenhuma consulta normal
    // (find, findOne) traz esse campo por padrão — é preciso pedir explicitamente
    // com `.select('+senhaHash')`, o mesmo cuidado que fizemos na versão MySQL.
    senhaHash: { type: String, required: true, select: false },
    telefone: { type: String, trim: true, default: '' },
    role: { type: String, enum: ['cliente', 'admin'], default: 'cliente' },
    enderecos: { type: [EnderecoSchema], default: [] },
    // Recuperação de senha por e-mail: nunca guardamos o token em si, só o hash dele
    // (mesmo princípio de `senhaHash` — se o banco vazar, os links de recuperação já
    // enviados não servem pra nada). `select: false` porque, assim como a senha, isso
    // não deve vir junto em nenhuma consulta comum; só quem pede explicitamente
    // (`.select('+resetSenhaTokenHash')`) recebe. Os dois campos ficam `null` na
    // maior parte do tempo — só existem entre "solicitou recuperação" e "usou o link
    // (ou ele expirou)".
    resetSenhaTokenHash: { type: String, select: false, default: null },
    resetSenhaExpira: { type: Date, select: false, default: null },
  },
  { timestamps: true } // adiciona createdAt/updatedAt automaticamente
);

module.exports = model('Usuario', UsuarioSchema);
