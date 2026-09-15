import { CONFIG } from '../../config';
import { useBusinessHours } from '../../hooks/useBusinessHours';

export default function Location() {
  const aberto = useBusinessHours();

  function handleRoute() {
    window.open(
      'https://www.google.com/maps/dir/?api=1&destination=Rua+Baltazar+de+Campos,+253,+São+Paulo+SP',
      '_blank'
    );
  }

  return (
    <section id="location">
      <div className="wrapper p-top">
        <div className="text-center">
          <h5>Nossa Localização</h5>
          <h2>Pizzaria Don Abronni</h2>
          <p className="para">{CONFIG.ENDERECO_LOJA.rua} - {CONFIG.ENDERECO_LOJA.bairro}, {CONFIG.ENDERECO_LOJA.cidade} - {CONFIG.ENDERECO_LOJA.uf}</p>
        </div>

        <div className="location-grid">
          <div className="map-container">
            <iframe
              title="Mapa da Don Abronni"
              src="https://maps.google.com/maps?q=Rua+Baltazar+de+Campos,+253,+S%C3%A3o+Paulo+SP&output=embed"
              loading="lazy"
            />
          </div>

          <div className="info-cards">
            <div className="info-card">
              <div className="info-icon"><i className="fa-solid fa-location-dot" /></div>
              <div className="info-content">
                <h4>Endereço</h4>
                <p>{CONFIG.ENDERECO_LOJA.rua}<br />{CONFIG.ENDERECO_LOJA.bairro}, {CONFIG.ENDERECO_LOJA.cidade} - {CONFIG.ENDERECO_LOJA.uf}</p>
                <a href="#route" className="info-link" onClick={(e) => { e.preventDefault(); handleRoute(); }}>
                  <i className="fa-solid fa-map-pin" /> Como chegar
                </a>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon"><i className="fa-regular fa-clock" /></div>
              <div className="info-content">
                <h4>Horário de funcionamento</h4>
                <p>Quarta a Domingo<br /><strong>18h às 23h</strong></p>
                <span className="info-badge" style={aberto ? {} : { background: '#fee2e2', color: '#b91c1c' }}>
                  {aberto ? '✅ Aberto agora' : '🔴 Fechado no momento'}
                </span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon"><i className="fa-solid fa-phone" /></div>
              <div className="info-content">
                <h4>Contato & Delivery</h4>
                <p><strong>{CONFIG.TELEFONE_LOJA_EXIBICAO}</strong><br /><span className="small-text">WhatsApp: {CONFIG.WHATSAPP_NUMERO_EXIBICAO}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
