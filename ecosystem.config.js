// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'gotcha-bot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    max_restarts: 10,
    watch: false,
    env: { NODE_ENV: 'production' },
  }],
};
