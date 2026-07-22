setInterval(() => {
  fetch(process.env.BACKEND_URL + '/api/health')
    .then(r => r.json())
    .then(d => console.log('Ping:', new Date().toISOString(), '- DB:', d.db))
    .catch(e => console.error('Ping failed:', e.message));
}, 10 * 60 * 1000);

console.log('Keep-alive started — pinging every 10 minutes');
