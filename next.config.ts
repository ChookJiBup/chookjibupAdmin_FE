import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/admin/:path*", destination: `${backendOrigin}/api/admin/:path*` },
      { source: "/api/field-staff/:path*", destination: `${backendOrigin}/api/field-staff/:path*` },
    ];
  },
};

export default nextConfig;
