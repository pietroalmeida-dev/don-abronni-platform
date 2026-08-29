import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { ToastProvider } from './contexts/ToastContext';
import { UIProvider } from './contexts/UIContext';
import AppRoutes from './routes/AppRoutes';

// Ordem dos providers: Toast primeiro (outros contexts disparam toasts), depois
// Auth e UI (independentes entre si), e Cart por último (usa o Toast ao adicionar
// itens). Nenhum provider depende de estar "dentro" de outro em termos de dados —
// a ordem aqui é só sobre quem consegue chamar `useToast()`.
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <UIProvider>
            <CartProvider>
              <AppRoutes />
            </CartProvider>
          </UIProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
