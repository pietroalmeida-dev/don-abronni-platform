'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const rotaNaoEncontrada = require('./middlewares/rotaNaoEncontrada');

const app = express();

// Necessário pra funcionar corretamente atrás de um proxy reverso/load balancer em
// produção (Render, Railway, Heroku, Nginx...). Sem isso, o express-rate-limit
// (usado em /auth) rejeita a requisição ao tentar ler X-Forwarded-For, ou pior: todo
// mundo atrás do mesmo proxy passa a compartilhar o mesmo "IP" pro rate limit,
// deixando uma pessoa abusando esgotar as tentativas de login de todo mundo. `1`
// confia só no primeiro proxy à frente do processo Node — não habilitamos fora de
// produção porque, sem proxy de verdade na frente (dev local, testes), esse
// cabeçalho é spoofável pelo próprio cliente.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// helmet: define uma série de cabeçalhos HTTP de segurança recomendados (evita
// vazamento de informação do servidor, ataques de clickjacking, etc.) — um mínimo
// de segurança que toda API deveria ter, mesmo em projetos pequenos.
// crossOriginResourcePolicy: 'cross-origin' — sem isso, o padrão do helmet
// ('same-origin') faz o navegador BLOQUEAR o carregamento de /uploads/*.jpg quando
// quem pede é uma origem diferente (ex.: front-end em localhost:5173 consumindo a
// API em localhost:3001) — as fotos de produto simplesmente não apareceriam.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS: por padrão, um navegador bloqueia chamadas de um domínio para outro
// (localhost:5173 → localhost:3001, por exemplo). Aqui liberamos explicitamente só
// o endereço do front-end (variável de ambiente), em vez de liberar geral ("*"),
// que seria um risco de segurança desnecessário.
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// morgan: loga cada requisição (método, rota, status, tempo de resposta) no
// console — essencial para depurar problemas em desenvolvimento e para auditoria
// básica em produção.
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve os arquivos enviados via upload (ex.: imagens de produto) como arquivos
// estáticos, acessíveis em /uploads/nome-do-arquivo.ext
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

app.use('/api', routes);

app.use(rotaNaoEncontrada);
app.use(errorHandler); // sempre por último — middlewares de erro precisam vir depois de todas as rotas

module.exports = app;
