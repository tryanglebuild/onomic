import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
