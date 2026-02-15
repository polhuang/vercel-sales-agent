import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["../../packages/db/src/migrations/**/*"],
  },
  transpilePackages: ["@sales-agent/ui", "@sales-agent/db"],
  serverExternalPackages: [
    "@libsql/client",
    "libsql",
    "better-sqlite3",
    "@libsql/hrana-client",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from bundling native libsql modules
      // The dynamic require in libsql/index.js pulls in README.md and LICENSE
      // files via a broad glob context. Mark these packages as externals so
      // Node.js resolves them at runtime instead.
      config.externals = config.externals || [];
      config.externals.push({
        "@libsql/client": "commonjs @libsql/client",
        libsql: "commonjs libsql",
        "better-sqlite3": "commonjs better-sqlite3",
      });
    }
    return config;
  },
};

export default nextConfig;
