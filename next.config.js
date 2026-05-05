/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Exponer variables de entorno de servidor en runtime (necesario para Amplify WEB_COMPUTE)
  env: {
    AGENT_LAMBDA_URL: process.env.AGENT_LAMBDA_URL,
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

module.exports = nextConfig
