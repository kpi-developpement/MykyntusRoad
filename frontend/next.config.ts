import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // self-contained server in .next/standalone, used by the Docker image
  output: "standalone",
  turbopack: {
    rules: {
      // Tailwind only processes the global stylesheet: CSS Modules (*.module.css) keep their scoped classes
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
