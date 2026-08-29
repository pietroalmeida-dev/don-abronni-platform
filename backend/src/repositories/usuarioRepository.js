'use strict';

const { Usuario } = require('../models');

// Camada de repositório: só sabe conversar com o MongoDB via Mongoose, sem nenhuma
// regra de negócio (isso fica no service). Separar isso permite trocar a forma de
// acesso a dados no futuro (outro banco, cache, etc.) sem tocar na lógica de negócio.
const usuarioRepository = {
  async criar(dados) {
    return Usuario.create(dados);
  },
  async buscarPorEmail(email, { comSenha = false } = {}) {
    const query = Usuario.findOne({ email: email.toLowerCase() });
    if (comSenha) query.select('+senhaHash');
    return query.exec();
  },
  async buscarPorId(id, { comSenha = false } = {}) {
    const query = Usuario.findById(id);
    if (comSenha) query.select('+senhaHash');
    return query.exec();
  },
  async atualizar(id, dados) {
    // runValidators: mesmo motivo de sempre — sem isso, editar o perfil poderia
    // gravar um nome vazio ou maior que o limite do schema sem ser barrado.
    return Usuario.findByIdAndUpdate(id, dados, { returnDocument: 'after', runValidators: true });
  },
  // Separado de `atualizar()` de propósito: trocar a senha é uma operação
  // sensível o bastante pra ter seu próprio método explícito, em vez de deixar
  // `senhaHash` como só mais um campo que um `atualizar()` genérico poderia
  // sobrescrever por engano a partir de qualquer payload.
  async atualizarSenha(id, senhaHash) {
    return Usuario.findByIdAndUpdate(id, { senhaHash }, { returnDocument: 'after' });
  },
  async listarTodos() {
    return Usuario.find().sort({ nome: 1 }).limit(500);
  },
  // Filtra role na própria query em vez de buscar todos e descartar os admins depois
  // em JS — evita trazer do banco (e transitar pela rede) documentos que a chamada
  // nunca vai usar.
  async listarClientes() {
    return Usuario.find({ role: 'cliente' }).sort({ nome: 1 }).limit(500);
  },
  async adicionarEndereco(usuarioId, endereco) {
    return Usuario.findByIdAndUpdate(
      usuarioId,
      { $push: { enderecos: endereco } },
      // runValidators: sem isso, o Mongoose não valida os campos required/min/max do
      // schema em operações de update — um endereço incompleto passaria batido.
      { returnDocument: 'after', runValidators: true }
    );
  },

  // O filtro `{ _id: usuarioId, 'enderecos._id': enderecoId }` só encontra um
  // documento se o endereço pertencer MESMO a esse usuário — não precisa de uma
  // checagem de posse separada, a própria query garante isso. O operador `$`
  // posicional referencia, na atualização, o elemento do array que bateu no filtro.
  async atualizarEndereco(usuarioId, enderecoId, endereco) {
    return Usuario.findOneAndUpdate(
      { _id: usuarioId, 'enderecos._id': enderecoId },
      {
        $set: {
          'enderecos.$.rua': endereco.rua,
          'enderecos.$.numero': endereco.numero,
          'enderecos.$.bairro': endereco.bairro,
          'enderecos.$.cep': endereco.cep,
          'enderecos.$.complemento': endereco.complemento || '',
        },
      },
      { returnDocument: 'after', runValidators: true }
    );
  },

  // Mesmo filtro `{ _id: usuarioId, 'enderecos._id': enderecoId }` do método acima —
  // de propósito, não trocado por um `findByIdAndUpdate` simples. Um `$pull` sem
  // esse filtro "funciona" (retorna 200) mesmo quando o id não pertence a ninguém
  // ou pertence a outro usuário, porque remover zero itens de um array não é erro
  // pro Mongo — só filtrando pelo dono é que a ausência de match vira `null` aqui,
  // e o service consegue responder 404 de verdade em vez de um 200 enganoso.
  async removerEndereco(usuarioId, enderecoId) {
    return Usuario.findOneAndUpdate(
      { _id: usuarioId, 'enderecos._id': enderecoId },
      { $pull: { enderecos: { _id: enderecoId } } },
      { returnDocument: 'after' }
    );
  },

  // Grava o hash do token de recuperação + validade no usuário. Uma nova solicitação
  // sempre sobrescreve a anterior (se o cliente pedir recuperação duas vezes, só o
  // link mais recente continua válido — o antigo para de funcionar sozinho).
  async salvarTokenRecuperacao(usuarioId, tokenHash, expiraEm) {
    return Usuario.findByIdAndUpdate(usuarioId, { resetSenhaTokenHash: tokenHash, resetSenhaExpira: expiraEm });
  },

  // Atômico de propósito: um único `findOneAndUpdate` que FILTRA pelo hash do token
  // E pela validade (`$gt: agora`) e já grava a nova senha e limpa o token no mesmo
  // comando. Se fosse "buscar, checar em JS, depois salvar" em passos separados,
  // duas requisições simultâneas com o mesmo token (ex.: o usuário clica duas vezes
  // no botão) poderiam ambas passar pela checagem antes de qualquer uma delas limpar
  // o token — o filtro atômico aqui garante que só a primeira das duas realmente
  // encontra o documento (a segunda já não bate mais no filtro, porque o token já
  // não existe mais). Retorna `null` quando o token é inválido, já foi usado, ou
  // expirou — o service trata os três casos com a mesma mensagem genérica.
  async redefinirSenhaPorToken(tokenHash, novaSenhaHash) {
    return Usuario.findOneAndUpdate(
      { resetSenhaTokenHash: tokenHash, resetSenhaExpira: { $gt: new Date() } },
      { senhaHash: novaSenhaHash, resetSenhaTokenHash: null, resetSenhaExpira: null },
      { returnDocument: 'after' }
    );
  },
};

module.exports = usuarioRepository;
