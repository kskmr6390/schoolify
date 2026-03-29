/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'schoolify-uploads.s3.amazonaws.com',
      'localhost',
    ],
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
