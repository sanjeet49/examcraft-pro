import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // src/instrumentation.ts runs automatically on server start (Next.js 15+)
    // It polyfills DOMMatrix / ImageData / Path2D so pdf-parse loads without errors.
};

export default nextConfig;

