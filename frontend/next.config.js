/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Expose to browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
