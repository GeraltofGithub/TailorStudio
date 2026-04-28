(function () {
  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[2]) : null;
  }

  function csrfHeaders() {
    const t = getCookie('XSRF-TOKEN');
    const h = { 'Content-Type': 'application/json' };
    if (t) h['X-XSRF-TOKEN'] = t;
    return h;
  }

  window.TSApi = {
    getCookie,
    async get(url) {
      const r = await fetch(url, { credentials: 'include', cache: 'no-store' });
      return r;
    },
    async postJson(url, body) {
      return fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders(),
        body: JSON.stringify(body),
      });
    },
    async putJson(url, body) {
      return fetch(url, {
        method: 'PUT',
        credentials: 'include',
        headers: csrfHeaders(),
        body: JSON.stringify(body),
      });
    },
    async patchJson(url, body) {
      return fetch(url, {
        method: 'PATCH',
        credentials: 'include',
        headers: csrfHeaders(),
        body: JSON.stringify(body),
      });
    },
    async post(url) {
      return fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders(),
      });
    },
  };
})();
