import { Link } from 'react-router-dom';

export function Login() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="sf-kicker">WELCOME BACK</div>
        <h1 className="auth-title">Sign in</h1>

        <p className="auth-switch" style={{ margin: '0 0 24px' }}>
          Customer accounts aren't open yet — check back soon. In the meantime, feel free to browse the collection.
        </p>

        <Link to="/shop" className="sf-btn sf-btn-primary auth-submit" style={{ display: 'block', textAlign: 'center' }}>
          Browse the shop
        </Link>
      </div>
    </div>
  );
}
