import { memo } from 'react'
import { Link } from 'react-router-dom'

export default memo(function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="logo-mark">
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="2" y="2" width="36" height="36" rx="8" stroke="url(#lg)" strokeWidth="2" />
            <path d="M12 28L20 10L28 28" stroke="#c9a227" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40">
                <stop stopColor="#2dd4bf" />
                <stop offset="1" stopColor="#c9a227" />
              </linearGradient>
            </defs>
          </svg>
          Tailor Studio
        </div>
        <nav className="landing-nav">
          <Link className="btn btn-ghost" to="/login">
            Sign in
          </Link>
          <Link className="btn btn-primary" to="/signup">
            Create studio
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <div className="hero-badge">MVP demo · Spring Boot + H2</div>
          <h1>Measurements, orders, and bills — without the paper pile.</h1>
          <p className="lead">
            Each tailor business gets its own workspace. Owners onboard the team with a join code. Staff and owners see the same orders, customers, and
            delivery reminders — scoped to your studio only.
          </p>
          <div className="hero-cta">
            <Link className="btn btn-primary" to="/signup">
              Start your studio
            </Link>
            <Link className="btn btn-ghost" to="/join">
              Join with a code
            </Link>
          </div>
        </div>
        <div className="hero-card">
          <h3>Today at a glance</h3>
          <div className="stat-row">
            <span>Orders in progress</span>
            <strong>—</strong>
          </div>
          <div className="stat-row">
            <span>Deliveries this week</span>
            <strong>—</strong>
          </div>
          <div className="stat-row">
            <span>Advance &amp; balance</span>
            <strong>Tracked</strong>
          </div>
          <p style={{ margin: '1rem 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>Sign in to see live numbers from your database.</p>
        </div>
      </section>

      <section className="features">
        <div className="feature">
          <h3>Customer profiles</h3>
          <p>Search by name or phone, keep address on file, and revisit measurement history anytime.</p>
        </div>
        <div className="feature">
          <h3>Garment measurements</h3>
          <p>Shirt, pant, blouse, suit — save structured fields and auto-fill new orders.</p>
        </div>
        <div className="feature">
          <h3>Orders &amp; bill lines</h3>
          <p>Line items with rate and amount, advance tracking, statuses from pending to delivered.</p>
        </div>
        <div className="feature">
          <h3>Reminders</h3>
          <p>Daily check for tomorrow’s deliveries — notifications inside the app (demo scheduler).</p>
        </div>
        <div className="feature">
          <h3>Owner + staff</h3>
          <p>Signup creates a new business. Share the rotating join code so cutters &amp; tailors can log in.</p>
        </div>
        <div className="feature">
          <h3>Printable bill</h3>
          <p>Order detail includes a print-friendly layout inspired by real shop receipts.</p>
        </div>
      </section>

      <footer className="landing-footer">Tailor Studio — local demo · H2 embedded · session login</footer>
    </div>
  )
})

