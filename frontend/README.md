# Don Abronni Pizzaria — Front-end React

Migração completa do front-end (antes em HTML/CSS/JavaScript puro) para React + Vite,
preservando 100% das funcionalidades e da identidade visual do projeto original.

## Como rodar

```bash
npm install
npm run dev       # ambiente de desenvolvimento
npm run build     # build de produção (gera a pasta dist/)
npm run preview   # serve o build de produção localmente
npm run lint      # ESLint
```

As imagens do cardápio (`public/imagens-pizzas/`, 88 arquivos `.webp`) e as da home
(`public/images/`) já estão commitadas no repositório — nada a copiar manualmente,
basta `git clone` + `npm install` + `npm run dev`.

## Estrutura do projeto

```
src/
├── assets/           # imagens/ícones que fazem parte do bundle (poucas; a maioria das
│                       imagens do cardápio fica em public/, ver acima)
├── components/
│   ├── common/       # Button, Toast, LoadingSpinner — genéricos, usados em qualquer tela
│   ├── layout/       # Navbar, Footer, MobileMenu, UserDropdown
│   ├── sections/     # Hero, Services, Reviews, Location, WhatsAppSubscribe (seções da Home)
│   ├── menu/         # ProductCard, MenuSection, TwoFlavorsModal, SingleFlavorModal, BorderOptions
│   ├── cart/         # CartDrawer, CartItem
│   ├── checkout/     # CheckoutModal + StepDelivery/StepPayment/StepConfirm/PixPayment
│   ├── auth/         # LoginModal, OrderHistoryModal
│   └── dashboard/    # Sidebar, AdminLoginForm, DashboardModal, sections/ (Dashboard, Orders, Stock, Employees, Customers)
├── pages/            # HomePage, AdminDashboardPage — montam as telas a partir dos componentes acima
├── routes/           # AppRoutes.jsx (React Router)
├── contexts/         # CartContext, AuthContext, ToastContext, UIContext — estado global
├── hooks/            # useBusinessHours, useMediaQuery, useLockBodyScroll, useEscapeKey, useChart
├── services/         # camada de acesso a dados (ver seção "Preparação para o backend")
├── data/             # borderOptions.js (opções de borda recheada — o catálogo de
│                       produtos em si vem da API, ver services/catalogService.js)
├── utils/            # format.js (formatCurrency, gerarNumeroNota, formatarDataHora)
└── styles/           # global.css, dashboard.css (ver "Decisão sobre CSS" abaixo)
```

## Decisões de arquitetura (e por quê)

### CSS: global (portado) em vez de CSS Modules em tudo

O requisito explícito da migração era **preservar a identidade visual exatamente como
está**. O projeto original já tinha ~2600 linhas de CSS validado, com variáveis,
responsividade e animações funcionando. Convertê-lo inteiro para CSS Modules
significaria reescrever todos os seletores (a mesma classe `.pizza-card` é usada em
dezenas de componentes diferentes) só para ganhar escopo local — sem nenhum ganho
visual, com risco real de regressão e sem benefício prático neste projeto (não há
colisão de nomes de classe a resolver, já que o CSS nunca teve esse problema).

Por isso, o CSS existente foi portado como estilos globais (`src/styles/global.css` e
`src/styles/dashboard.css`, importados uma vez em `index.css`). **CSS Modules foi usado
nos componentes genuinamente novos**, que não têm equivalente na versão anterior — por
exemplo, `LoadingSpinner` (ver `LoadingSpinner.module.css`). Essa é a abordagem "moderna
o suficiente, sem reescrever o que já funciona".

### Estados globais: 4 contexts, cada um com uma responsabilidade

- **CartContext** — carrinho (a única coisa que precisa realmente ser global e
  compartilhada por Navbar, MenuSection, CartDrawer e Checkout ao mesmo tempo).
- **AuthContext** — sessão do cliente e do administrador.
- **ToastContext** — notificações (substituiu a manipulação direta do DOM que existia
  antes).
- **UIContext** — estado de interface "cross-cutting": carrinho aberto/fechado, menu
  mobile, modal de login (incluindo o aviso de "faça login para continuar" e a
  retomada do checkout após o login).

Tudo o que é local a uma única tela (formulários, filtros, qual step do checkout está
ativo) ficou como `useState` dentro do próprio componente — não foi jogado para um
context "global" por padrão, evitando a armadilha de centralizar estado demais.

### Camada de serviços (`src/services/`) — agora ligada ao backend real

Cada arquivo em `services/` expõe funções **assíncronas** (retornam `Promise`) que
chamam a API do backend (`don-abronni-backend-mongo`, ver `CONFIG.API_URL` em
`src/config.js`) via `apiClient.js` — um wrapper fino sobre `fetch` que anexa o token
JWT (`Authorization: Bearer`) quando há sessão logada e traduz erros da API em
`Error` com mensagem pronta pra exibir (`showToast(erro.message)`).

Esses services nasceram como uma camada só de `localStorage`, escrita antes do
backend existir — a assinatura (parâmetros e formato do retorno) foi mantida
propositalmente igual à de uma API real, então quando o backend passou a existir a
troca não exigiu mudar nenhum componente que os consome (com raríssimas exceções,
documentadas onde ocorrem — ver `CheckoutModal.jsx`, que usa o `numeroNota` real
devolvido pelo servidor em vez de gerar um localmente).

Serviços existentes: `authService`, `ordersService`, `usersService`, `catalogService`,
`stockService`, `employeesService`, `addressesService`, `shippingService`,
`paymentService`, `cartService` (este último continua 100% local — carrinho é por
navegador, não por usuário, não existe endpoint de carrinho no backend).

**Ponto crítico preservado da última rodada de melhorias**: `ordersService` é a única
fonte de pedidos, usada tanto pelo checkout do cliente quanto pelo painel
administrativo — um pedido criado no site aparece imediatamente no painel, e uma
mudança de status feita pelo admin é refletida no histórico do cliente.

**Catálogo (`catalogService`) e meia a meia**: `MenuSection` busca o catálogo real da
API uma única vez e é a fonte de dados tanto da grade de produtos quanto do modal de
"dois sabores" (`TwoFlavorsModal`, que recebe os produtos elegíveis via prop) — não
existe mais nenhuma lista de sabores separada/hardcoded (o antigo `src/data/catalog.js`
foi removido).

### O que ainda é provisório (marcado com 🚨 no código)

- `paymentService`: continua simulado — **agora no backend**, não mais no navegador
  (Pix é um QR code fictício). Ver o mesmo aviso no README do backend.
- `shippingService`: **não é mais simulado.** O front só chama `POST /api/frete/calcular`
  e exibe o que o backend devolver (`{ distanciaKm, valor, entregaDisponivel, mensagem }`)
  — toda a lógica real (ViaCEP + geocoding + distância até a loja + `TABELA_FRETE`)
  mora no backend. Qualquer endereço real de São Paulo dentro de 10km da loja é
  aceito, não só uma lista fixa. Ver a seção "Frete" no README do backend.
- `stockService`: não decrementa estoque por pedido automaticamente — falta uma
  ficha técnica (pizza → ingredientes), que ainda não foi modelada.

O hash de senha local e o login de admin com credencial fixa (`CONFIG.ADMIN_DEMO`) que
existiam nesta lista foram removidos: senha agora é bcrypt no servidor, e login de
admin é autenticação JWT real, sem nenhuma credencial hardcoded no front-end.

## Rotas

- `/` — site público (Home)
- `/admin` — painel administrativo (carregado sob demanda via `React.lazy`, para não
  incluir o Chart.js no bundle de quem só visita o site da pizzaria)

## Performance

- Bundle inicial do site público: ~324 KB (94 KB gzip) — o painel admin (que usa
  Chart.js) fica em um chunk separado de ~237 KB, baixado só ao acessar `/admin`.
- Imagens do cardápio usam `loading="lazy"`.
