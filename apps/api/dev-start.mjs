import('./src/index.ts')
  .then(() => console.log('App loaded successfully'))
  .catch((err) => {
    console.error('Failed to load app:', err);
    console.error('Stack:', err?.stack);
    console.error('Message:', err?.message);
    process.exit(1);
  });
