'use strict';

const nodemailer = require('nodemailer');

// Transporte único e reaproveitado entre chamadas — o próprio nodemailer recomenda
// isso: criar um novo transporter a cada e-mail reabriria uma conexão SMTP à toa em
// cada envio. SMTP genérico (host/porta configuráveis via .env) em vez de um
// provedor fixo no código — Gmail SMTP se mostrou inviável em produção (contas
// pessoais recentes têm "Senha de app" bloqueada pelo próprio Google, mesmo com
// verificação em duas etapas ativa) e serviços de e-mail transacional (Brevo,
// SendGrid, etc.) são o padrão de mercado justamente por isso. Trocar de provedor
// no futuro passa a ser só uma mudança de variáveis de ambiente, sem tocar em
// código (ver .env.example).
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST,
  port: Number(process.env.EMAIL_SMTP_PORT) || 587,
  secure: Number(process.env.EMAIL_SMTP_PORT) === 465, // 465 = SSL implícito; 587/outras = STARTTLS, negociado automaticamente pelo nodemailer
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_SMTP_KEY,
  },
});

const emailService = {
  // Único e-mail transacional do sistema até agora — se no futuro surgirem outros
  // (confirmação de pedido por e-mail, etc.), cada um vira um novo método aqui,
  // mantendo o `transporter` como o único ponto que sabe falar com o Gmail.
  async enviarEmailRecuperacaoSenha(destinatario, nome, linkRedefinicao) {
    // Sem EMAIL_USER/EMAIL_APP_PASSWORD, o nodemailer falha com "Missing
    // credentials for 'PLAIN'" — verdadeiro, mas só faz sentido pra quem já
    // conhece a lib. Verificar aqui e lançar uma mensagem explícita é o que faz o
    // log de erro (ver authService.solicitarRecuperacaoSenha) dizer exatamente o
    // que fazer, em vez de exigir procurar o que "Missing credentials" significa.
    if (!process.env.EMAIL_SMTP_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_SMTP_KEY) {
      throw new Error('EMAIL_SMTP_HOST/EMAIL_USER/EMAIL_SMTP_KEY não configurados no .env — ver .env.example.');
    }
    await transporter.sendMail({
      // EMAIL_FROM é o endereço verificado como remetente no provedor (ex.: Brevo
      // exige isso); cai de volta pro EMAIL_USER se não tiver sido definido à parte.
      from: `"Don Abronni Pizzaria" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: 'Recuperação de senha — Don Abronni',
      html: montarHtmlRecuperacao(nome, linkRedefinicao),
    });
  },
};

// Sem isso, um nome de cadastro contendo HTML (o campo `nome` aceita qualquer
// texto — ver authValidations.js, não há restrição de caracteres) iria parar sem
// escape dentro do e-mail enviado pela pizzaria: não chega a ser um XSS clássico
// (a maioria dos clientes de e-mail já ignora <script>), mas permitiria injetar
// HTML/links falsos dentro de um e-mail legítimo. Mesmo cuidado que o React já faz
// sozinho ao renderizar `{variavel}` nas telas — aqui, fora do React, precisa ser
// manual.
function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// HTML simples e inline (sem CSS externo — a maioria dos clientes de e-mail ignora
// <style> em tags separadas ou até barra completamente; estilo inline é o padrão do
// mercado para e-mail transacional). Reaproveita a mesma cor primária (--primary)
// usada no resto do site, hardcoded aqui porque um e-mail não tem acesso às CSS
// custom properties do site.
function montarHtmlRecuperacao(nome, link) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0f2b5e;">🍕 Don Abronni Pizzaria</h2>
      <p>Olá, ${escaparHtml(nome)}!</p>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${link}" style="background: #0f2b5e; color: #ffffff; padding: 14px 28px; border-radius: 32px; text-decoration: none; font-weight: bold; display: inline-block;">
          Redefinir minha senha
        </a>
      </p>
      <p style="font-size: 0.85rem; color: #4a627a;">Este link expira em 1 hora. Se você não solicitou essa recuperação, pode ignorar este e-mail — sua senha continua a mesma.</p>
      <p style="font-size: 0.8rem; color: #8c9ab0;">Se o botão não funcionar, copie e cole este link no navegador:<br>${link}</p>
    </div>
  `;
}

module.exports = emailService;
