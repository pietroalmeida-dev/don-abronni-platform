# Don Abronni Pizzaria — Backend (Node.js + Express + MongoDB)

API REST que substitui o `localStorage` usado pelo protótipo front-end por persistência
real em banco de dados, com autenticação JWT e senhas protegidas por bcrypt.

## Como rodar

```bash
npm install
cp .env.example .env        # ajuste MONGO_URI e os demais valores
npm run seed                 # popula o catálogo (86 produtos), o admin, estoque e funcionários
npm run dev                  # inicia com nodemon (reinicia sozinho a cada mudança)
```

A API sobe em `http://localhost:3001`. Teste com:
```bash
curl http://localhost:3001/api/health
```

## Testes

```bash
npm test
```

Usa `mongodb-memory-server` — um MongoDB real, porém temporário e em memória, criado
e destruído automaticamente a cada execução dos testes. Não usa o banco de
desenvolvimento nem o de produção.

## Por que MongoDB (e não MySQL)?

Este projeto já foi desenhado uma vez para MySQL/Sequelize e depois migrado
integralmente para MongoDB/Mongoose, a pedido explícito do time. As duas abordagens são
válidas; a decisão de qual usar depende do formato dos dados do domínio:

- **MySQL/relacional** se encaixa melhor quando os dados têm relacionamentos
  complexos e muitos-para-muitos genuínos, e quando integridade referencial rígida
  (o banco impede ativamente uma referência quebrada) é essencial.
- **MongoDB/documentos** se encaixa melhor quando a maioria das consultas busca um
  "objeto completo" de uma vez (um pedido com todos os itens, um usuário com todos
  os endereços) — que é exatamente o padrão de acesso mais comum neste sistema.

Ver a seção 11 da documentação do projeto para a justificativa completa de cada
decisão de modelagem (o que foi embutido, o que foi referenciado, e por quê).

## Estrutura

```
src/
├── config/        # conexão com MongoDB, configuração do Multer
├── controllers/   # recebe a requisição HTTP, delega para o service, formata a resposta
├── services/      # regra de negócio (ex.: recalcular preço do pedido no servidor)
├── repositories/   # acesso puro a dados (Mongoose), sem regra de negócio
├── models/        # schemas Mongoose (as coleções do MongoDB)
├── routes/        # define os endpoints e qual middleware/controller cada um usa
├── middlewares/   # autenticação (JWT), autorização (role), validação, tratamento de erros
├── validations/   # regras de validação (express-validator) por rota
├── utils/         # AppError, helpers de JWT, asyncHandler
├── database/seeders/ # dados iniciais (catálogo, admin, estoque, funcionários)
└── uploads/       # arquivos enviados via Multer (imagens de produto)
```

## Decisão de arquitetura: por que separar `services` de `repositories`?

- **repository**: só sabe "conversar" com o Mongoose/MongoDB. Não decide nada, só
  busca/salva.
- **service**: contém a regra de negócio (ex.: "um pedido meia a meia cobra pelo
  sabor mais caro", "senha precisa de 6+ caracteres", "só é possível avaliar um
  pedido entregue").

Essa separação permite trocar a forma de acesso a dados no futuro (outro banco,
cache, uma segunda fonte de dados) sem tocar em nenhuma regra de negócio — e permite
testar a lógica de negócio com um repository "falso" (mock), sem precisar de um
banco de verdade rodando.

## Segurança já resolvida nesta camada (comparado ao protótipo front-end)

- Senhas com bcrypt (nunca texto puro), tanto para clientes quanto para o admin.
- Login de administrador não é mais uma credencial fixa no código — é um usuário
  como outro qualquer, com `role: 'admin'`.
- **O preço final do pedido é recalculado inteiramente no servidor**, a partir do
  catálogo salvo no banco — o cliente não consegue mais adulterar o valor total via
  DevTools antes de enviar (isso era possível no protótipo, que calculava tudo no
  navegador).
- Toda rota administrativa exige tanto autenticação (token JWT válido) quanto
  autorização (`role === 'admin'`).
- Recuperação de senha por e-mail (`POST /api/auth/esqueci-senha` e
  `/redefinir-senha`): token de 256 bits de uso único, só o hash SHA-256 dele é
  gravado no banco, expira em 1 hora, e a resposta é sempre a mesma independente de
  o e-mail existir ou não (evita que a rota vire uma forma de descobrir quais
  e-mails têm conta cadastrada). Envio via SMTP/Nodemailer, provedor configurado
  só por variável de ambiente (hoje Brevo — Gmail SMTP se mostrou inviável para
  contas pessoais, ver `.env.example` para o motivo e como configurar).
- Rate limiting (`src/middlewares/rateLimiters.js`) cobre não só `/auth/*`, mas
  também as duas rotas públicas que gravam dados sem exigir login
  (`/frete/calcular`, `/whatsapp-inscritos`) — sem isso, um script poderia inundar
  o banco de inscrições falsas ou sobrecarregar o cálculo de frete sem nenhuma
  fricção.
- Upload de imagem (`src/config/upload.js`): lista fechada de mimetypes aceitos
  (nunca confia na extensão que o cliente mandou), limite de 5MB, e nome de arquivo
  sempre gerado pelo servidor (nunca o nome original enviado pelo cliente).
- JWT restringe explicitamente o algoritmo aceito na verificação (`HS256`) —
  defesa em profundidade contra ataques de "confusão de algoritmo".
- Dependências auditadas (`npm audit`): 0 vulnerabilidades nas dependências de
  produção do backend. As pendências restantes (frontend) são de bibliotecas de
  desenvolvimento (não vão para o site publicado) ou, no caso do `react-router-dom`,
  uma vulnerabilidade que exige um vetor (URL de redirecionamento controlada pelo
  usuário) que este projeto não usa em nenhuma rota.

## Frete (`shippingService`) — como funciona hoje

Não é simulado nem limitado a uma lista fixa de bairros — qualquer endereço real de
São Paulo é aceito, calculado por distância geográfica de verdade. O fluxo é:

```
CEP → ViaCEP confirma que existe e devolve o endereço (rua/bairro/cidade/UF) —
      nunca calcula distância, só identifica o endereço
    → geocodingService (Nominatim/OpenStreetMap) converte esse endereço em
      latitude/longitude
    → routingService (OSRM/OpenStreetMap) calcula a distância REAL de rota
      (perfil `driving`) entre a loja (LOJA_COORDENADAS) e esse ponto
    → essa distância é jogada na TABELA_FRETE (config/pedidoConfig.js, inalterada)
      pra achar o valor — se passar do maior degrau da tabela (RAIO_MAXIMO_KM =
      10km), está fora do raio de entrega — 10km de ROTA, não de linha reta
```

Decisões de escopo avaliadas e descartadas de propósito:
- **API dos Correios**: calcula frete de **postagem** (PAC/SEDEX), não de entrega
  local por motoboy — problema errado, não se aplica aqui.
- **Distância em linha reta (Haversine)** foi a primeira versão desta feature, mas
  se mostrou imprecisa demais na prática: pontos que a via preferencial contorna
  (rio, avenida sem retorno, etc.) davam uma distância bem menor "no ar" do que a
  rota real percorrida — o suficiente pra mudar a faixa de preço, ou pra aceitar/
  recusar errado um endereço perto do limite de 10km. Por isso **deixou de ser a
  fonte principal** — ver `routingService` abaixo. Continua existindo só como
  fallback (ver "Confiabilidade").
- **API de rotas paga** (Google Distance Matrix/Routes): daria o mesmo tipo de
  resultado (distância real de rota) que o OSRM já dá de graça, mas exige cadastro
  de cartão de crédito — sem necessidade, já que existe uma alternativa gratuita
  igualmente capaz para o volume de uma pizzaria pequena.
- Por isso: **Nominatim/OpenStreetMap** para geocoding + **OSRM/OpenStreetMap**
  (demo público, gratuito, sem chave — `router.project-osrm.org`) para a distância
  real de rota, perfil `driving`. Não existe perfil dedicado de moto em nenhum
  serviço gratuito conhecido — `driving` foi escolhido por trafegar pela mesma
  malha viária que uma moto usa (ao contrário de `bike`/`foot`, que ignoram vias
  diferentes das que uma moto realmente usaria).

Confiabilidade: nenhum dos três serviços externos (`cepService`/ViaCEP,
`geocodingService`/Nominatim, `routingService`/OSRM) lança exceção se estiver fora
do ar, lento ou der timeout (4s, 3.5s e 4.5s respectivamente) — toda falha de
ViaCEP/Nominatim vira `entregaDisponivel: false` com mensagem clara, nunca um erro
500 que derrubaria o checkout. Já uma falha só do **OSRM** (roteamento) tem um
tratamento mais tolerante: `shippingService` cai de volta para Haversine (linha
reta) em vez de bloquear o cálculo inteiro — o cliente ainda consegue calcular o
frete e fechar o pedido nesse cenário raro, só que com a mesma aproximação da
versão anterior, em vez de nenhum frete calculável. O demo público do OSRM é
explicitamente "best-effort" (sem SLA — [ver aqui](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server)),
adequado para um TCC mas não para produção real (nesse caso, seria necessário
hospedar a própria instância do OSRM).

`geocodingService` tenta até 4 buscas antes de desistir: (0) **número da casa** +
rua + bairro, só quando o cliente informa o número (opcional em `POST
/api/frete/calcular`, ver abaixo) — (1) rua+bairro, (2) só rua+cidade sem o
bairro, (3) só bairro+cidade. As tentativas 1-3 vêm de testar 10 endereços reais
de São Paulo durante a implementação original: 2 só foram encontrados tirando o
bairro da busca (nome com parênteses, ou não reconhecido pelo OSM); uma busca
estruturada por CEP (`postalcode=`) foi testada e descartada por não ter
cobertura confiável pro Brasil.

### Por que a distância calculada difere ~100-600m da rota real no Google Maps

Investigado depois que uma comparação manual com o Google Maps (rota de moto)
mostrou essa diferença. Causa confirmada, testando a geocodificação da própria
rua da loja: sem o número da casa, o Nominatim resolve o endereço para um ponto
**no meio do segmento de rua inteiro** (classe `highway`), não o prédio exato —
uma rua residencial pode ter 200-300m de extensão, então o ponto pode estar a até
~150m do endereço real **em cada ponta** (loja e cliente), o que sozinho já
explica a faixa de erro observada. Confirmado também que arredondamento **não**
é a causa (a decisão de faixa sempre usou a distância sem arredondar) e que o
perfil `driving` vs. `bike` do OSRM não muda o resultado no demo público testado.

Mitigação aplicada 1 (reduzir o erro): `numero` (opcional) agora é usado na
geocodificação — quando o OpenStreetMap tem esse número mapeado, o resultado
passa de "rua inteira" para o prédio de verdade (`place`/`house`), testado e
confirmado em endereços reais. Quando o OSM não tem esse dado (comum em ruas
menos centrais — é uma lacuna do *dado*, não do código), a busca cai de volta pro
mesmo comportamento de antes, nunca piora. Isso **não elimina** a imprecisão — é
uma limitação de dado inerente a usar geocoding gratuito (Google tem geocoding
com dado de fachada licenciado; o OpenStreetMap depende de mapeamento
voluntário, mais esparso em áreas periféricas).

Mitigação aplicada 2 (decidir com o erro que sobra): não dá pra zerar a
imprecisão residual de graça, então `buscarFaixaPorDistancia`
(`shippingService.js`) trata explicitamente a incerteza nas FRONTEIRAS entre
faixas — quando a distância calculada cai a até `TOLERANCIA_FRONTEIRA_KM` (0.4km,
o mesmo valor medido na comparação com o Google Maps) de uma fronteira, cobra a
faixa de **cima** (mais cara) em vez da de baixo, inclusive na última fronteira
(10km): um endereço a 9,7km, com essa margem de incerteza, pode estar acima de
10km de verdade, e o erro mais caro pra empresa ali não é cobrar a mais — é
aceitar uma entrega que não consegue cumprir. **Isso não é o mesmo que inflar o
raio ou os valores da `TABELA_FRETE` pra "compensar" o erro** (uma proposta
nesse sentido foi avaliada e descartada durante o desenvolvimento — mudar os
*valores* da tabela de forma desconectada da distância real não tem nenhuma
relação matemática com metros de erro de geocodificação, só disfarça o
problema). A tolerância aqui mexe na *decisão de qual faixa usar*, só na margem
exata onde a incerteza de medição existe de verdade — e existe porque foi
medida, não porque foi escolhida pra dar um número bonito.

🚨 **`LOJA_COORDENADAS`** (`config/pedidoConfig.js`) foi obtida geocodificando o
endereço da loja uma única vez — se a loja mudar de endereço, precisa atualizar
essa constante manualmente (mesma natureza de `TABELA_FRETE`: constante de negócio
no código, exige deploy pra mudar). Testado incluir o número da casa (253) nessa
busca: o OSM não tem esse número mapeado para essa rua, então o ponto obtido já é
o melhor disponível de graça.

## O que ainda é provisório (marcado com 🚨 no código)

- `paymentService`: gera um "Pix" fictício — precisa de um gateway de pagamento real.
- **Envio de e-mail de recuperação de senha**: código e infraestrutura prontos
  (`emailService.js` já usa SMTP genérico, funciona com qualquer provedor via
  `.env`), mas as credenciais reais (`EMAIL_USER`/`EMAIL_SMTP_KEY`/`EMAIL_FROM`, ver
  `.env.example`) ainda não foram configuradas — adiado de propósito para mais perto
  da apresentação do TCC. Sem essas variáveis, a rota `/api/auth/esqueci-senha`
  continua funcionando normalmente (mesma resposta genérica de sempre), só não
  manda o e-mail de fato; a falha fica registrada no log do servidor, nunca vira
  erro pro cliente. Retomar quando a integração de e-mail for necessária: criar
  conta grátis na Brevo, verificar remetente, gerar chave SMTP, preencher o `.env`.

Todas foram movidas para o servidor (antes ficavam no navegador do cliente, ou nem
existiam), o que já é uma melhoria de segurança/arquitetura, mas a limitação de
fundo (dados simulados ou credenciais pendentes) continua até a integração real
ser feita.
