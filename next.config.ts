import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Turbopack walks up from this file looking for a lockfile to infer the
    // project root, and finds one at /Users/gooli/package-lock.json (outside
    // this git repo) before it finds this project's own — set explicitly to
    // remove the ambiguity instead of relying on that walk.
    root: path.join(__dirname),
  },
  experimental: {
    // Client-side Router Cache. This Next.js version defaults `dynamic` to
    // 0 (no caching at all for authenticated/dynamic routes), which makes
    // in-app navigation (dashboard, settings) hit the server on every click.
    // We turn it on deliberately — every mutation that changes workspace
    // data calls revalidatePath (see lib/workspaces/revalidate.ts), so the
    // cache never outlives the data it holds.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
