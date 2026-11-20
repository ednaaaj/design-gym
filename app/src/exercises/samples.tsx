import './samples.css';

/* Specimens: generic product UI driven purely by params.
   Each renders a fixed-size pane at 1:1 so flaw regions (% of pane) stay put. */

type Params = { params: Record<string, unknown> };

type ProfileParams = {
  padL: number;
  padR: number;
  avatarGap: number;
  actionsGap: number;
};

export function ProfileCard({ params }: Params) {
  const p = params as ProfileParams;
  return (
    <div className="sp-pane" style={{ width: 520, height: 380 }}>
      <div
        className="sp-card sp-profile"
        style={{ paddingLeft: p.padL, paddingRight: p.padR }}
      >
        <div className="sp-profile-head" style={{ gap: p.avatarGap }}>
          <div className="sp-avatar">MR</div>
          <div>
            <div className="sp-profile-name">Mara Reyes</div>
            <div className="sp-profile-role">Product designer, Lisbon</div>
          </div>
        </div>
        <p className="sp-profile-bio">
          Designs onboarding flows and the occasional type specimen. Currently
          rebuilding a design system from the token layer up.
        </p>
        <div className="sp-profile-actions" style={{ gap: p.actionsGap }}>
          <span className="sp-btn sp-btn-solid">Follow</span>
          <span className="sp-btn sp-btn-outline">Message</span>
        </div>
      </div>
    </div>
  );
}

type PricingParams = {
  planSize: number;
  planLine: number;
  priceSize: number;
  priceLine: number;
  priceWeight: number;
  cta: 'solid' | 'outline';
};

export function PricingCard({ params }: Params) {
  const p = params as PricingParams;
  return (
    <div className="sp-pane" style={{ width: 340, height: 440 }}>
      <div className="sp-card sp-pricing">
        <div
          className="sp-pricing-plan"
          style={{ fontSize: p.planSize, lineHeight: `${p.planLine}px` }}
        >
          Studio
        </div>
        <div className="sp-pricing-desc">For small teams shipping one product.</div>
        <div className="sp-pricing-price">
          <span
            style={{
              fontSize: p.priceSize,
              lineHeight: `${p.priceLine}px`,
              fontWeight: p.priceWeight,
            }}
          >
            $24
          </span>
          <span className="sp-pricing-per">/ month</span>
        </div>
        <ul className="sp-pricing-list">
          {['Unlimited projects', 'Shared component library', 'Version history, 90 days'].map(
            (f) => (
              <li key={f}>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3.5 8.5l3 3 6-7" />
                </svg>
                {f}
              </li>
            ),
          )}
        </ul>
        <span className={`sp-btn sp-btn-block sp-btn-${p.cta}`}>Start free trial</span>
      </div>
    </div>
  );
}

type LoginParams = {
  emailLabelIndent: number;
  checkboxIndent: number;
  buttonWidth: number;
};

export function LoginForm({ params }: Params) {
  const p = params as LoginParams;
  return (
    <div className="sp-pane" style={{ width: 340, height: 448 }}>
      <div className="sp-login">
        <div className="sp-login-title">Sign in</div>
        <div className="sp-login-sub">Welcome back to Northwind.</div>
        <div className="sp-field">
          <div className="sp-label" style={{ paddingLeft: p.emailLabelIndent }}>
            Email
          </div>
          <div className="sp-input">mara@northwind.co</div>
        </div>
        <div className="sp-field">
          <div className="sp-label">Password</div>
          <div className="sp-input sp-input-secret">••••••••••</div>
        </div>
        <div className="sp-check" style={{ paddingLeft: p.checkboxIndent }}>
          <span className="sp-checkbox" />
          Remember me
        </div>
        <span className="sp-btn sp-btn-solid sp-login-btn" style={{ width: p.buttonWidth }}>
          Sign in
        </span>
        <div className="sp-login-link">Forgot password?</div>
      </div>
    </div>
  );
}

const Check = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-7" />
  </svg>
);

type ToastParams = {
  iconBg: string;
  titleWeight: number;
  bodyColor: string;
  bodyLine: number;
  actionColor: string;
  actionCase: 'sentence' | 'caps';
};

export function Toast({ params }: Params) {
  const p = params as ToastParams;
  return (
    <div className="sp-pane" style={{ width: 420, height: 200 }}>
      <div className="sp-card sp-toast">
        <span className="sp-toast-icon" style={{ background: p.iconBg }}>
          <Check />
        </span>
        <div className="sp-toast-main">
          <div className="sp-toast-title" style={{ fontWeight: p.titleWeight }}>
            Export finished
          </div>
          <div className="sp-toast-text" style={{ color: p.bodyColor, lineHeight: `${p.bodyLine}px` }}>
            <span>48 frames exported to Brand / Q3.</span>
            <span>Share links update in a minute.</span>
          </div>
          <div
            className={`sp-toast-actions${p.actionCase === 'caps' ? ' is-caps' : ''}`}
            style={{ color: p.actionColor }}
          >
            <span>Open folder</span>
            <span>Undo</span>
          </div>
        </div>
        <svg className="sp-toast-close" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </div>
    </div>
  );
}

type ArticleParams = {
  metaSize: number;
  titleSize: number;
  titleLine: number;
  excerptLine: number;
  excerptColor: string;
  readStyle: 'link' | 'button';
};

export function ArticleCard({ params }: Params) {
  const p = params as ArticleParams;
  return (
    <div className="sp-pane" style={{ width: 400, height: 460 }}>
      <div className="sp-card sp-article">
        <div className="sp-article-cover" />
        <div className="sp-article-meta" style={{ fontSize: p.metaSize }}>
          Design systems · 6 min read
        </div>
        <div
          className="sp-article-title"
          style={{ fontSize: p.titleSize, lineHeight: `${p.titleLine}px`, height: 2 * p.titleLine }}
        >
          <span>Naming tokens so they</span>
          <span>survive a rebrand</span>
        </div>
        <div className="sp-article-excerpt" style={{ lineHeight: `${p.excerptLine}px`, color: p.excerptColor }}>
          <span>Semantic names describe a role, not</span>
          <span>a value. How we renamed 214 tokens</span>
          <span>without breaking a single screen.</span>
        </div>
        <div className="sp-article-foot">
          <span className="sp-article-author">
            <span className="sp-article-avatar" />
            Mara Reyes
          </span>
          <span className={p.readStyle === 'button' ? 'sp-btn sp-btn-solid sp-article-btn' : 'sp-article-read'}>
            Read article
          </span>
        </div>
      </div>
    </div>
  );
}

type StatParams = {
  labelStyle: 'sentence' | 'caps';
  valueWeight: number;
  deltaStyle: 'normal' | 'italic';
  revLabelColor: string;
  ordersDeltaColor: string;
  refundsTone: 'good' | 'bad';
};

const GOOD = 'oklch(0.5 0.12 150)';
const BAD = 'oklch(0.52 0.17 25)';

export function StatTiles({ params }: Params) {
  const p = params as StatParams;
  const tiles = [
    { label: 'Revenue', value: '$48.2k', delta: '▲ 12.4%', labelColor: p.revLabelColor, deltaColor: GOOD },
    { label: 'Orders', value: '1,206', delta: '▲ 3.1%', deltaColor: p.ordersDeltaColor },
    { label: 'Refunds', value: '38', delta: '▲ 9.2%', deltaColor: p.refundsTone === 'bad' ? BAD : GOOD },
  ];
  return (
    <div className="sp-pane" style={{ width: 552, height: 200 }}>
      <div className="sp-stats">
        {tiles.map((t) => (
          <div key={t.label} className="sp-card sp-stat">
            <div
              className={`sp-stat-label${p.labelStyle === 'caps' ? ' is-caps' : ''}`}
              style={{ color: t.labelColor }}
            >
              {t.label}
            </div>
            <div className="sp-stat-value" style={{ fontWeight: p.valueWeight }}>
              {t.value}
            </div>
            <div className="sp-stat-delta">
              <span style={{ color: t.deltaColor, fontStyle: p.deltaStyle }}>{t.delta}</span>
              <span className="sp-stat-vs">vs May</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type SettingsParams = {
  row3ToggleShift: number;
  divider2Inset: number;
  row4TextShift: number;
};

export function SettingsList({ params }: Params) {
  const p = params as SettingsParams;
  const rows = [
    { label: 'Mentions', sub: 'Someone tags you in a comment', on: true },
    { label: 'Replies', sub: 'New replies on threads you follow', on: true },
    { label: 'Weekly digest', sub: 'A summary every Monday', on: false },
    { label: 'Product updates', sub: 'New features, at most monthly', on: true },
  ];
  return (
    <div className="sp-pane" style={{ width: 440, height: 360 }}>
      <div className="sp-card sp-settings">
        <div className="sp-settings-title">Notifications</div>
        {rows.map((r, i) => (
          <div key={r.label} className="sp-row">
            <span className="sp-row-icon" />
            <div className="sp-row-text" style={{ marginLeft: i === 3 ? p.row4TextShift : 0 }}>
              <div className="sp-row-label">{r.label}</div>
              <div className="sp-row-sub">{r.sub}</div>
            </div>
            <span
              className={`sp-toggle${r.on ? ' is-on' : ''}`}
              style={{ marginRight: i === 2 ? p.row3ToggleShift : 0 }}
            />
            {i < rows.length - 1 && (
              <span className="sp-row-divider" style={{ left: i === 1 ? p.divider2Inset : 64 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

type NavParams = { logoGap: number; linkGap: number; actionGap: number };

export function NavBar({ params }: Params) {
  const p = params as NavParams;
  return (
    <div className="sp-pane" style={{ width: 600, height: 136 }}>
      <div className="sp-card sp-nav">
        <span className="sp-nav-logo">
          <span className="sp-nav-mark" />
          Northwind
        </span>
        <span className="sp-nav-links" style={{ marginLeft: p.logoGap, gap: p.linkGap }}>
          <span>Product</span>
          <span>Pricing</span>
          <span>Docs</span>
        </span>
        <span className="sp-nav-actions" style={{ gap: p.actionGap }}>
          <span className="sp-nav-signin">Sign in</span>
          <span className="sp-btn sp-btn-solid sp-nav-btn">Get started</span>
        </span>
      </div>
    </div>
  );
}

type HotelParams = { badgeBg: string; badgeFg: string; priceColor: string; ctaBg: string };

export function HotelCard({ params }: Params) {
  const p = params as HotelParams;
  return (
    <div className="sp-pane" style={{ width: 360, height: 420 }}>
      <div className="sp-card sp-hotel">
        <div className="sp-hotel-cover" />
        <div className="sp-hotel-body">
          <span className="sp-hotel-badge" style={{ background: p.badgeBg, color: p.badgeFg }}>
            Free cancellation
          </span>
          <div className="sp-hotel-name">Casa Alfama</div>
          <div className="sp-hotel-loc">Lisbon · 0.4 km from center</div>
          <div className="sp-hotel-rating">
            <b>★ 4.8</b> · 312 reviews
          </div>
          <div className="sp-hotel-foot">
            <span>
              <span className="sp-hotel-price" style={{ color: p.priceColor }}>
                €142
              </span>
              <span className="sp-hotel-night"> / night</span>
            </span>
            <span className="sp-btn sp-hotel-cta" style={{ background: p.ctaBg }}>
              Reserve
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
