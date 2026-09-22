# Segurança

Projeto acadêmico (TCC — ETEC), mas tratado com as mesmas práticas de um sistema
real: pagamento é mock, mas autenticação, senhas e dados de pedido são reais.

## Reportando uma vulnerabilidade

Encontrou um problema de segurança? Abra uma [issue](../../issues) descrevendo o
problema **sem incluir dados sensíveis** (sem senha, token ou connection string —
nem sua, nem de ninguém), ou entre em contato diretamente com os mantenedores.

Não abra uma issue pública para vazamento de credencial já ocorrido — nesse caso,
avise diretamente por canal privado primeiro, pra dar tempo de rotacionar a
credencial antes que o problema fique visível publicamente.

## O que nunca está neste repositório

- `.env` (nem `backend/.env`, nem `frontend/.env`) — sempre local, nunca commitado
- Connection string real do MongoDB Atlas
- `JWT_SECRET` real
- Senhas de qualquer conta (banco, e-mail, admin)
- Credenciais SMTP

Todo valor sensível vive só no `.env` de cada máquina, nunca no código. Ver
`backend/.env.example` e `frontend/.env.example` para a lista de variáveis
esperadas (sem valores reais).

## Proteções ativas neste repositório

- **Secret scanning + push protection** (GitHub): bloqueia automaticamente um
  `git push` que contenha um padrão de credencial reconhecido.
- **Dependabot**: alerta de dependência vulnerável + PR automático de correção
  quando possível, e checagem semanal de versões novas.
- **Branch protection na `main`**: exige Pull Request revisado (1 aprovação) —
  nenhum commit entra direto na `main`.

## Dependências

Rode `npm audit` (dentro de `backend/` e `frontend/`) periodicamente. Vulnerabilidades
de dependências de desenvolvimento (`devDependencies`) não afetam o site publicado,
mas vale manter atualizadas mesmo assim.
