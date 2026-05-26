import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mdxeditor/editor"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: process.env.S3_PUBLIC_HOSTNAME ?? "localhost",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    // Zipcodes admin moved under the consolidated delivery settings section.
    // 301 keeps old bookmarks and external references working.
    return [
      {
        source: "/admin/zipcodes",
        destination: "/admin/settings/delivery/zipcodes",
        permanent: true,
      },
      {
        source: "/admin/zipcodes/:path*",
        destination: "/admin/settings/delivery/zipcodes/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
