(() => {
  const launcher = 'https://studio.neacea.com';
  const app = document.currentScript.dataset.studioApp;
  const requested = location.hash === '#accesso-studio';
  const storageKeys = {
    calendario: 'neacea-calendar-audit-session',
    cruscotto: 'neacea-studio-audit-session',
  };

  function accept(session) {
    sessionStorage.setItem(storageKeys[app], session.token);
    sessionStorage.setItem('neacea-private-read-session', session.token);
    const address = new URL(location.href);
    address.searchParams.delete('access');
    if (app === 'calendario') {
      for (const name of ['pt', 'mode', 'op', 'operator', 'operator_id', 'email', 'ptEmail']) address.searchParams.delete(name);
      if (session.role === 'pt') address.searchParams.set('mode', 'pt');
    }
    history.replaceState(history.state, '', address);
  }

  function connect() {
    const address = new URL(location.href);
    address.hash = '';
    history.replaceState(history.state, '', address);
    return new Promise((resolve) => {
      const frame = document.createElement('iframe');
      frame.title = 'Verifica accesso Studio';
      frame.hidden = true;
      frame.referrerPolicy = 'no-referrer';
      frame.src = `${launcher}/.netlify/functions/studio-session?app=${app}`;
      const timeout = setTimeout(() => finish(null), 6500);

      function finish(session) {
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        frame.remove();
        resolve(session);
      }

      function onMessage(event) {
        if (event.origin !== launcher || event.source !== frame.contentWindow || event.data?.type !== 'neacea-studio-session') return;
        const { token, role } = event.data;
        if (typeof token !== 'string' || !token || !['owner', 'pt'].includes(role) || (app === 'cruscotto' && role !== 'owner')) {
          finish(null);
          return;
        }
        try {
          accept({ token, role });
          finish({ token });
        } catch {
          finish(null);
        }
      }

      window.addEventListener('message', onMessage);
      document.body.append(frame);
    });
  }

  window.NeaceaStudioSession = { requested, ready: requested && storageKeys[app] ? connect() : Promise.resolve(null) };
})();
