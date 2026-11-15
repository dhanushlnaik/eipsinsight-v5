import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler is a later opt-in (needs babel-plugin-react-compiler).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "github.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
