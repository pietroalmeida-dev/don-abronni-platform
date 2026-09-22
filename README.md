# Don Abronni Platform

Sistema completo de delivery para uma pizzaria real: cardápio, carrinho, checkout,
cálculo de frete por distância real de rota, painel administrativo e autenticação —
migrado de um protótipo front-end puro para uma arquitetura cliente-servidor com
persistência real em banco de dados.

## Tecnologias

| Camada | Stack |
|---|---|
| Front-end | React 18 + Vite, React Router, Context API, Chart.js |
| Back-end | Node.js + Express 5, MongoDB + Mongoose |
| Autenticação | JWT (HS256) + bcrypt |
| Frete/geolocalização | ViaCEP + Nominatim (OpenStreetMap) + OSRM (rota real) |
| Testes | Vitest (front, 132 testes) / Jest (back, 103 testes) |

## Repositório público, segredos privados

Este repositório é **público** (código aberto pra apresentação do TCC/portfólio),
mas isso é só uma camada — as três ficam sempre separadas:

```
GitHub (público)     → código-fonte, testes, documentação
MongoDB Atlas         → banco de dados, protegido por usuário/senha (nunca aqui)
.env (local, por máquina) → credenciais — nunca commitado, um arquivo por dev
```

Nenhum `.env`, senha, `JWT_SECRET`, connection string ou credencial real está — ou
jamais deve estar — neste repositório (ver `SECURITY.md`). O que existe aqui são só
os `.env.example`, com nomes de variável e valores de exemplo, nunca reais. GitHub
Secret Scanning + Push Protection estão ativos no repositório: um `git push` que
contenha um padrão de credencial reconhecida é bloqueado automaticamente antes de
sair da sua máquina.

## Como rodar

```bash
npm run install:all        # instala as dependências dos dois projetos
cp backend/.env.example backend/.env       # ajuste MONGO_URI e demais valores
cp frontend/.env.example frontend/.env     # ajuste VITE_API_URL se necessário
npm run dev                # sobe backend (3001) e frontend (5173) juntos
```

Rodar separadamente, se preferir: `npm run dev --prefix backend` /
`npm run dev --prefix frontend`.

### Rodando em outro computador (ex.: notebook de um integrante)

O `backend/.env` real (com a connection string do MongoDB Atlas e o `JWT_SECRET`)
**nunca é commitado** — cada máquina precisa do próprio arquivo. Para outro
integrante rodar o projeto:

1. Peça o conteúdo do `backend/.env` a quem já tem (ex.: você) por um canal
   **privado** (WhatsApp direto, não grupo; nunca por e-mail público ou print
   compartilhado) — é a senha real do banco de dados do projeto.
2. Cole em `backend/.env` (não em `.env.example`).
3. No MongoDB Atlas → **Network Access**, confirme que o IP da nova máquina está
   liberado — ou que a lista está como `0.0.0.0/0` ("Allow Access from Anywhere"),
   recomendado pra evitar ficar liberando IP toda apresentação. Como as credenciais
   continuam exigidas pra autenticar, isso não expõe o banco a qualquer um — só
   evita a etapa de allowlist por IP.
4. `npm run install:all && npm run dev`.

O `frontend/.env` não guarda segredo nenhum (só a URL da API) — pode ser criado a
partir do `.env.example` sem pedir nada a ninguém.

## Testes

```bash
npm run test:backend     # Jest — 103 testes (usa mongodb-memory-server, não toca no Atlas)
npm run test:frontend    # Vitest — 132 testes
```

No `frontend/`, `npm run lint` roda o ESLint (`--max-warnings 0` — qualquer warning novo quebra o comando de propósito).

## Banco de dados (MongoDB Atlas)

Um único cluster no Atlas, compartilhado pelo time (não um banco por dev) — é assim
que todo mundo vê os mesmos produtos/pedidos/estoque em qualquer máquina. Cada
dev usa seu próprio usuário do Atlas (nunca a mesma senha), ver
["Como um novo integrante entra no projeto"](#como-um-novo-integrante-entra-no-projeto) mais abaixo.
MongoDB (não relacional) foi escolhido porque o domínio tem documentos
naturalmente aninhados e sempre lidos juntos (um pedido e seus itens, um usuário e
seus endereços) — ver os comentários de "DECISÃO DE MODELAGEM" em
`backend/src/models/*.js` para o raciocínio caso a caso.

## Arquitetura

```
Cliente (React) → API REST (Express) → Controller → Service → Repository → Model (Mongoose) → MongoDB
```
- **Controller**: recebe a requisição, delega, formata a resposta.
- **Service**: regra de negócio (ex.: recalcular preço do pedido no servidor).
- **Repository**: só conversa com o banco, sem regra de negócio.

Separação deliberada (não é MVC clássico — é uma API REST, não há "View" no
back-end; a "view" é o front-end React, em outro processo/deploy).

## Decisões técnicas importantes

- **Frete por distância real de rota** (não linha reta): CEP → ViaCEP confirma o
  endereço → Nominatim geocodifica → OSRM calcula a distância real percorrida
  (perfil `driving`, substituto padrão pra moto em serviços gratuitos) → tabela de
  faixas por km. Se o OSRM ficar indisponível, cai para cálculo em linha reta
  (Haversine) como aproximação, em vez de travar o checkout.
- **Tolerância de fronteira**: erro residual medido de geocodificação gratuita
  (~400m contra o Google Maps) é tratado explicitamente — perto de qualquer
  fronteira de faixa de preço, cobra a faixa mais cara, nunca a mais barata,
  incluindo no limite do raio de entrega (10km).
- **Autenticação JWT**: token expira (7 dias), algoritmo travado em HS256, senha
  sempre com bcrypt (nunca texto puro), rotas administrativas exigem token válido
  **e** papel de admin.
- **Segurança**: CORS restrito à origem do front-end, validação de entrada no
  servidor (nunca só no cliente), variáveis sensíveis fora do código-fonte.
- **Pagamento é simulado (mock)** — gera um QR code Pix fictício, isolado num
  service próprio para que a troca por um gateway real (Mercado Pago, PagSeguro)
  não exija mudar nenhum controller/rota.

## O que ainda é provisório

- Gateway de pagamento real.
- Decremento automático de estoque por pedido (falta modelar ficha técnica).
- E-mail de recuperação de senha depende de credenciais SMTP a configurar.

## Como um novo integrante entra no projeto

1. Recebe convite como **colaborador** no repositório GitHub (Settings → Collaborators
   → Add people, feito por quem é dono do repo). Não precisa de acesso "Admin" —
   permissão de escrita (Write) já é suficiente pra clonar, criar branch e abrir PR.
2. `git clone https://github.com/pietroalmeida-dev/don-abronni-platform.git`
3. `npm run install:all`
4. Cria `backend/.env` e `frontend/.env` a partir dos `.env.example` (seção
   ["Rodando em outro computador"](#rodando-em-outro-computador-ex-notebook-de-um-integrante)
   acima) — a connection string do Mongo usa um **usuário próprio dele** no Atlas
   (nunca a senha de outro integrante), pedida a quem administra o cluster.
5. `npm run dev` e confere em `http://localhost:5173`.

## Fluxo de contribuição

`main` sempre fica funcional (testado, buildável). Trabalho novo entra por branch +
Pull Request, nunca commit direto em `main` quando o time é mais de uma pessoa:

```bash
git checkout main && git pull
git checkout -b feature/nome-curto-da-mudanca
# ...altera, testa...
git add -A && git commit -m "mensagem clara"
git push -u origin feature/nome-curto-da-mudanca
# abre Pull Request no GitHub, pede revisão, dá merge depois de aprovado
```

Isso não é só combinado — a branch `main` tem **branch protection** configurada no
GitHub: exige Pull Request com pelo menos 1 aprovação, e bloqueia force-push e
exclusão da branch. Não tem como burlar isso com `git push` direto.

Ver `SECURITY.md` para como reportar uma vulnerabilidade, e `frontend/README.md` /
`backend/README.md` para detalhes de cada camada.
