// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enabling Webpack 5 for HMR
    webpack(config, { isServer, dev }) {
      // Only apply these settings for development mode
      if (dev) {
        // Enable Hot Module Replacement in development
        config.devServer = {
          ...config.devServer,
          hot: true,
          liveReload: true,
        };
      }
  
      // Optional: Custom webpack configuration here, if needed
      return config;
    },
    
    // Custom Webpack configurations can be added here for optimization
    future: {
      webpack5: true,
    },
  
    // Enable React Strict Mode for better debugging and performance
    reactStrictMode: true,
  
    // Enable Webpack 5 to support Module Federation, better caching, etc.
    webpack5: true,
  
    // This setting is useful when deploying Next.js as a standalone server
    output: 'standalone',
  
    // Optional: Ignore ESLint errors during build (usually in production)
    eslint: {
      ignoreDuringBuilds: true,
    },
  
    // Optional: Custom Headers or other settings
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
          ],
        },
      ];
    },
  
    // Set up custom redirects if needed (for example, handling old URLs)
    async redirects() {
      return [
        {
          source: '/old-path',
          destination: '/new-path',
          permanent: true,
        },
      ];
    },
  
    // If you are using internationalization
    i18n: {
      locales: ['en', 'es', 'fr'], // Example locales
      defaultLocale: 'en',
    },
  
    // Handling of images if you use Next.js Image component
    images: {
      domains: ['localhost'],
    },
  
    // You can also enable CSS or Sass support here
    cssModules: true, // Enable CSS Modules
  
    // Enabling SWC (faster JS/TS compiler)
    swcMinify: true, // Use SWC for faster minification
  };
  
  export default nextConfig;
  