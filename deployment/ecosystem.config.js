module.exports = {
  apps: [{
    name: 'ai-agent-platform',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      AWS_REGION: 'us-east-1'
    },
    error_file: '/var/log/ai-agent/error.log',
    out_file: '/var/log/ai-agent/out.log',
    log_file: '/var/log/ai-agent/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    source_map_support: true,
    instance_var: 'INSTANCE_ID',
    kill_timeout: 5000,
    autorestart: true,
    
    // Health monitoring
    health_check_grace_period: 3000,
    
    // Log settings
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Environment variables that will be loaded from .env
    env_file: '.env',
    
    // Graceful shutdown
    listen_timeout: 3000,
    kill_timeout: 5000
  }],

  deploy: {
    production: {
      user: 'aiagent',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/ai-agent-platform.git',
      path: '/opt/ai-agent',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};