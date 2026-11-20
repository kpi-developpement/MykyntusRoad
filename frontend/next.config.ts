import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // self-contained server in .next/standalone, used by the Docker image
  output: "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
