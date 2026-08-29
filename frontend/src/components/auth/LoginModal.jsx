import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useToast } from '../../contexts/ToastContext';
import { authService } from '../../services/authService';
import ModalOverlay from './ModalOverlay';

export default function LoginModal() {
  const {
    isLoginModalOpen, loginModalTab, setLoginModalTab, closeLoginModal, loginRequiredBannerVisible,
  } = useUI();
  const { login, register } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regConfirmar, setRegConfirmar] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotEnviado, setForgotEnviado] = useState(false);

  // LoginModal é montado UMA vez só quando o site carrega — o ModalOverlay só
  // esconde/mostra o conteúdo por dentro (`if (!open) return null` no ModalOverlay
  // não desmonta ESTE componente, só o que ele renderiza), então o estado local
  // nunca reseta sozinho fechando e reabrindo. Sem este efeito, depois da primeira
  // vez que "Esqueceu a senha?" era enviado com sucesso, a tela de confirmação
  // ficava travada pra sempre — reabrir o modal (mesmo em uma sessão nova de
  // navegação) sempre caía direto nela, sem nenhuma forma de tentar de novo com
  // outro e-mail. Redefine só o que pertence à sub-tela de recuperação sempre que
  // o modal fecha, pra sempre reabrir do zero.
  useEffect(() => {
    if (!isLoginModalOpen) {
      setForgotEnviado(false);
      setForgotEmail('');
    }
  }, [isLoginModalOpen]);

  async function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail || !loginSenha) { showToast('Preencha e-mail e senha.', 'erro'); return; }

    setLoginLoading(true);
    // Uma ÚNICA chamada de login — o backend não distingue cliente de admin no
    // endpoint, o `role` vem na resposta. Antes disparava adminLogin() e, se
    // falhasse, login() de novo: duas requisições HTTP idênticas pra cada tentativa,
    // dobrando à toa a carga no endpoint que tem proteção de força bruta.
    const resultado = await login({ email: loginEmail, senha: loginSenha });
    setLoginLoading(false);

    if (!resultado.ok) {
      showToast(resultado.erro, 'erro');
      return;
    }

    if (resultado.usuario.role === 'admin') {
      showToast('Redirecionando para o painel administrativo...');
      closeLoginModal();
      navigate('/admin');
      return;
    }

    showToast(`Bem-vindo(a), ${resultado.usuario.name.split(' ')[0]}! 🍕`);
    closeLoginModal();
    // O "retomar checkout após login" acontece no HomePage: ele observa a sessão
    // (via useAuth) e o flag pendingCheckout (via useUI) para reabrir o checkout.
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (regSenha !== regConfirmar) { showToast('As senhas não coincidem.', 'erro'); return; }

    setRegLoading(true);
    const resultado = await register({ nome: regName, email: regEmail, senha: regSenha });
    setRegLoading(false);

    if (!resultado.ok) { showToast(resultado.erro, 'erro'); return; }

    showToast('Conta criada! Faça login.');
    setLoginModalTab('login');
    setLoginEmail(regEmail);
    setLoginSenha('');
    setRegName(''); setRegEmail(''); setRegSenha(''); setRegConfirmar('');
  }

  function handleForgotPassword(e) {
    e.preventDefault();
    setLoginModalTab('esqueci-senha');
  }

  async function handleEsqueciSenha(e) {
    e.preventDefault();
    setForgotLoading(true);
    const resultado = await authService.esqueciSenha(forgotEmail);
    setForgotLoading(false);

    if (!resultado.ok) { showToast(resultado.erro, 'erro'); return; }
    // A resposta é sempre a mesma genérica (o backend nunca revela se o e-mail
    // existe ou não — ver authService.js do backend) — por isso a tela de sucesso
    // aqui também não distingue os dois casos, só confirma que a solicitação foi
    // enviada.
    setForgotEnviado(true);
  }

  return (
    <ModalOverlay open={isLoginModalOpen} onClose={closeLoginModal}>
      {loginRequiredBannerVisible && (
        <div className="pagamento-aviso login-required-banner">
          <i className="fa-solid fa-circle-info" />
          <span>Faça login ou crie sua conta para finalizar o pedido. Os itens do seu carrinho serão mantidos.</span>
        </div>
      )}

      {loginModalTab === 'esqueci-senha' ? (
        <div className="forgot-password-subheader">
          <button type="button" onClick={() => setLoginModalTab('login')} aria-label="Voltar para o login">
            <i className="fa-solid fa-arrow-left" /> Voltar
          </button>
          <h3>Recuperar senha</h3>
        </div>
      ) : (
        <div className="modal-tabs">
          <button className={`modal-tab ${loginModalTab === 'login' ? 'active' : ''}`} onClick={() => setLoginModalTab('login')}>Login</button>
          <button className={`modal-tab ${loginModalTab === 'register' ? 'active' : ''}`} onClick={() => setLoginModalTab('register')}>Cadastrar</button>
        </div>
      )}

      <form className={`modal-form ${loginModalTab === 'login' ? 'active' : ''}`} onSubmit={handleLogin}>
        <div className="input-group">
          <i className="fa-solid fa-envelope" />
          <input type="email" placeholder="Seu e-mail" required autoComplete="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
        </div>
        <div className="input-group">
          <i className="fa-solid fa-lock" />
          <input type="password" placeholder="Senha" required autoComplete="current-password" value={loginSenha} onChange={(e) => setLoginSenha(e.target.value)} />
        </div>
        <div className="forgot-password"><a href="#forgot" onClick={handleForgotPassword}>Esqueceu a senha?</a></div>
        <button type="submit" className="btn modal-btn" disabled={loginLoading}>
          {loginLoading ? <><i className="fa-solid fa-spinner fa-spin" /> Entrando...</> : 'Entrar'}
        </button>
      </form>

      <form className={`modal-form ${loginModalTab === 'register' ? 'active' : ''}`} onSubmit={handleRegister}>
        <div className="input-group">
          <i className="fa-solid fa-user" />
          <input type="text" placeholder="Nome completo" autoComplete="name" value={regName} onChange={(e) => setRegName(e.target.value)} />
        </div>
        <div className="input-group">
          <i className="fa-solid fa-envelope" />
          <input type="email" placeholder="E-mail" required autoComplete="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
        </div>
        <div className="input-group">
          <i className="fa-solid fa-lock" />
          <input type="password" placeholder="Senha (mínimo 6 caracteres)" required value={regSenha} onChange={(e) => setRegSenha(e.target.value)} />
        </div>
        <div className="input-group">
          <i className="fa-solid fa-lock" />
          <input type="password" placeholder="Confirmar senha" required value={regConfirmar} onChange={(e) => setRegConfirmar(e.target.value)} />
        </div>
        <button type="submit" className="btn modal-btn" disabled={regLoading}>
          {regLoading ? <><i className="fa-solid fa-spinner fa-spin" /> Criando conta...</> : 'Criar conta'}
        </button>
      </form>

      <form className={`modal-form ${loginModalTab === 'esqueci-senha' ? 'active' : ''}`} onSubmit={handleEsqueciSenha}>
        {forgotEnviado ? (
          <div className="pagamento-aviso">
            <i className="fa-solid fa-envelope-circle-check" />
            <span>Se esse e-mail estiver cadastrado, enviamos um link de recuperação. Verifique sua caixa de entrada (e a pasta de spam).</span>
          </div>
        ) : (
          <>
            <p className="forgot-password-instrucao">Digite o e-mail da sua conta e enviaremos um link para você criar uma nova senha.</p>
            <div className="input-group">
              <i className="fa-solid fa-envelope" />
              <input type="email" placeholder="Seu e-mail" required autoComplete="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn modal-btn" disabled={forgotLoading}>
              {forgotLoading ? <><i className="fa-solid fa-spinner fa-spin" /> Enviando...</> : 'Enviar link de recuperação'}
            </button>
          </>
        )}
      </form>
    </ModalOverlay>
  );
}
