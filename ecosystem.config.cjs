module.exports = {
  apps: [
    {
      name: 'nova-poc',
      script: 'dist/server.mjs',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
