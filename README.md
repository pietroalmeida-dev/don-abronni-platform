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

Ver `frontend/README.md` e `backend/README.md` para detalhes de cada camada.
