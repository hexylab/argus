import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React strict mode for development
  reactStrictMode: true,

  // Image optimization settings for MinIO/S3 thumbnails
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/argus-videos/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9000",
        pathname: "/argus-videos/**",
      },
    ],
  },
};

export default nextConfig;
