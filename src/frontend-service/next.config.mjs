// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use default bundler settings (Turbopack enabled by default in Next 16).
  turbopack: {},

  // Enable React Strict Mode for better debugging and performance
  reactStrictMode: true,

  // This setting is useful when deploying Next.js as a standalone server
  output: "standalone",

  // Optional: Custom Headers or other settings
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },

  // Set up custom redirects if needed (for example, handling old URLs)
  async redirects() {
    return [
      {
        source: "/old-path",
        destination: "/new-path",
        permanent: true,
      },
    ];
  },

  // Handling of images if you use Next.js Image component
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "localhost",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
