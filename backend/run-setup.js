import setup from './setup.js';

setup()
  .then(() => {
    console.log('Setup completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Setup failed:', err);
    process.exit(1);
  });
