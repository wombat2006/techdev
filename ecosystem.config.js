module.exports = {
  apps: [
    {
      name: 'techsapo-huggingface',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 30000,
      wait_ready: true,
      listen_timeout: 10000,
      shutdown_with_message: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};