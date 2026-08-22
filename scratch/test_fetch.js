(async () => {
  try {
    const start1 = Date.now();
    const res1 = await fetch('http://localhost:8080/api/v1/landing-content');
    const data1 = await res1.json();
    console.log('localhost fetch succeeded in', Date.now() - start1, 'ms');
  } catch (err) {
    console.error('localhost fetch failed:', err.message);
  }

  try {
    const start2 = Date.now();
    const res2 = await fetch('http://127.0.0.1:8080/api/v1/landing-content');
    const data2 = await res2.json();
    console.log('127.0.0.1 fetch succeeded in', Date.now() - start2, 'ms');
  } catch (err) {
    console.error('127.0.0.1 fetch failed:', err.message);
  }
})();
