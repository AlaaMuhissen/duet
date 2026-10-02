import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Database drivers run only on the server; don't bundle them.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;
