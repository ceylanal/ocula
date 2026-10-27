/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // supabase/schema.sql tek şema kaynağıdır; arayüzde ham metin olarak gösterilir.
    config.module.rules.push({ test: /\.sql$/, type: "asset/source" });
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
