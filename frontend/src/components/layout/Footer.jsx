export default function Footer() {
  return (
    <footer className="new-footer">
      <div className="wrapper">
        <div className="footer-main">
          <div className="footer-brand">
            <a href="#top" className="footer-logo">Don Abronni</a>
            <p>Vamos matar sua fome com comida deliciosa e entrega rápida.</p>
            <div className="footer-social">
              <a href="#" className="footer-social-icon"><i className="fa-brands fa-instagram" /></a>
              <a href="#" className="footer-social-icon"><i className="fa-brands fa-facebook-f" /></a>
              <a href="#" className="footer-social-icon"><i className="fa-brands fa-google-plus-g" /></a>
            </div>
          </div>
          <div className="footer-links">
            <div className="footer-links-col">
              <h4>Cardápio</h4>
              <ul>
                <li><a href="#menu">Especial</a></li>
                <li><a href="#menu">Popular</a></li>
                <li><a href="#menu">Pizzas</a></li>
              </ul>
            </div>
            <div className="footer-links-col">
              <h4>Empresa</h4>
              <ul>
                <li><a href="#">Seja parceiro</a></li>
                <li><a href="#reviews">Sobre nós</a></li>
                <li><a href="#">Carreiras</a></li>
              </ul>
            </div>
            <div className="footer-links-col">
              <h4>Suporte</h4>
              <ul>
                <li><a href="#">Conta</a></li>
                <li><a href="#">Central de ajuda</a></li>
                <li><a href="#">Feedback</a></li>
              </ul>
            </div>
            <div className="footer-links-col">
              <h4>Contato</h4>
              <ul>
                <li><i className="fa-regular fa-envelope" /> donabronnipizzaria@gmail.com</li>
                <li><i className="fa-regular fa-clock" /> Qua–Dom: 18h–23h</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-copyright">
          <p>&copy; 2026 Don Abronni. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
