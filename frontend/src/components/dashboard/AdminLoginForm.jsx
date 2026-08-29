import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function AdminLoginForm({ onLoginSuccess }) {
  const { adminLogin } = useAuth();
  const showToast = useToast();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const resultado = await adminLogin({ email, senha });
    setLoading(false);
    if (resultado.ok) onLoginSuccess();
    else showToast(resultado.erro || 'Credenciais incorretas.', 'erro');
  }

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-brand">
          <i className="fa-solid fa-pizza-slice" />
          <h2>Don Abronni</h2>
          <span>Área do proprietário</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-icon"><i className="fa-solid fa-envelope" /><input type="email" placeholder="E-mail" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="input-icon"><i className="fa-solid fa-lock" /><input type="password" placeholder="Senha" required value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? <><i className="fa-solid fa-spinner fa-spin" /> Entrando...</> : <><i className="fa-solid fa-arrow-right-to-bracket" /> Acessar dashboard</>}
          </button>
          <p className="demo-hint">Acesso restrito ao proprietário/administrador do sistema.</p>
        </form>
      </div>
    </div>
  );
}
