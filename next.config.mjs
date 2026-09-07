/** @type {import('next').NextConfig} */
const nextConfig = {  serverExternalPackages: ["@resvg/resvg-js", "sharp"], outputFileTracingIncludes: {
    "/api/generate": ["./public/fonts/**"]
  }};

export default nextConfig;
