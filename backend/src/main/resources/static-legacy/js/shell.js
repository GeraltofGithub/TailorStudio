(function () {
  const NAV = [
    { href: '/app/dashboard.html', id: 'dashboard', label: 'Dashboard', icon: '◇' },
    { href: '/app/customers.html', id: 'customers', label: 'Customers', icon: '◎' },
    { href: '/app/orders.html', id: 'orders', label: 'Orders', icon: '☰' },
    { href: '/app/payments.html', id: 'payments', label: 'Payments', icon: '₹' },
    { href: '/app/team.html', id: 'team', label: 'Team & code', icon: '✦' },
    { href: '/app/settings.html', id: 'settings', label: 'Studio', icon: '⚙' },
  ];

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showBootError(title, detail) {
    document.body.innerHTML =
      '<div class="auth-page" style="padding:2rem">' +
      '<div class="auth-card" style="max-width:480px">' +
      '<h1>' +
      escapeHtml(title) +
      '</h1>' +
      '<p class="sub">' +
      escapeHtml(detail || '') +
      '</p>' +
      '<p><a class="btn btn-primary" href="/login.html">Back to sign in</a></p>' +
      '</div></div>';
  }

  async function requireAuth() {
    let r;
    try {
      r = await TSApi.get('/api/me');
    } catch (e) {
      window.location.replace('/login.html');
      return null;
    }
    if (r.status === 401 || r.status === 403) {
      window.location.replace('/login.html');
      return null;
    }
    if (!r.ok) {
      const msg = await r.text().catch(function () {
        return '';
      });
      showBootError('Could not load your profile', 'Server returned ' + r.status + '. ' + (msg ? msg.slice(0, 200) : ''));
      return null;
    }
    try {
      return await r.json();
    } catch (e) {
      showBootError('Invalid response', 'Could not read profile data.');
      return null;
    }
  }

  function renderShell(me, activeId) {
    const isOwner = me.role === 'OWNER';
    const links = NAV.filter((n) => {
      if (n.id === 'settings' && !isOwner) return false;
      return true;
    })
      .map((n) => {
        const cls = n.id === activeId ? 'active' : '';
        return `<a class="${cls}" href="${n.href}"><span aria-hidden="true">${n.icon}</span> ${escapeHtml(n.label)}</a>`;
      })
      .join('');

    const mobile = NAV.filter((n) => !(n.id === 'settings' && !isOwner))
      .map((n) => {
        const cls = n.id === activeId ? 'active' : '';
        return `<a class="${cls}" href="${n.href}">${escapeHtml(n.label)}</a>`;
      })
      .join('');

    return `
      <div class="app-layout">
        <aside class="sidebar no-print">
          <div class="sidebar-brand">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="2" y="2" width="36" height="36" rx="8" stroke="url(#g)" stroke-width="2"/>
              <path d="M12 28L20 10L28 28" stroke="#c9a227" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              <defs><linearGradient id="g" x1="0" y1="0" x2="40" y2="40"><stop stop-color="#2dd4bf"/><stop offset="1" stop-color="#c9a227"/></linearGradient></defs>
            </svg>
            <div>
              <div class="studio-name">${escapeHtml(me.businessName || 'Studio')}</div>
              <div class="studio-tag">Tailor workspace</div>
            </div>
          </div>
          <nav class="nav-links">${links}</nav>
          <div class="sidebar-footer">
            Signed in as<br/><strong>${escapeHtml(me.fullName)}</strong>
          </div>
        </aside>
        <div class="app-main">
          <nav class="mobile-nav no-print">${mobile}</nav>
          <div id="ts-topbar-anchor"></div>
          <div id="ts-page-body" class="page-content"></div>
        </div>
      </div>`;
  }

  window.TSShell = {
    escapeHtml,
    requireAuth,
    async mount(activeId, title, innerHtmlCallback) {
      const me = await requireAuth();
      if (!me) return;

      document.body.innerHTML = renderShell(me, activeId);
      const top = document.getElementById('ts-topbar-anchor');
      const body = document.getElementById('ts-page-body');
      top.outerHTML = `
        <header class="topbar no-print">
          <h1>${escapeHtml(title)}</h1>
          <div class="user-pill">
            <div>
              <div style="font-weight:600;font-size:0.9rem">${escapeHtml(me.fullName)}</div>
              <div class="role">${escapeHtml(me.role)}</div>
            </div>
            <form action="/logout" method="post" style="margin:0">
              <input type="hidden" name="_csrf" value="${escapeHtml(TSApi.getCookie('XSRF-TOKEN') || '')}" />
              <button type="submit" class="btn btn-ghost btn-sm">Sign out</button>
            </form>
          </div>
        </header>`;

      try {
        if (typeof innerHtmlCallback === 'function') {
          body.innerHTML = await innerHtmlCallback(me);
        } else {
          body.innerHTML = innerHtmlCallback || '';
        }
      } catch (e) {
        body.innerHTML =
          '<div class="panel"><p>Could not render this page. Please refresh or <a href="/app/dashboard.html">go to dashboard</a>.</p></div>';
      }
    },
  };
})();
