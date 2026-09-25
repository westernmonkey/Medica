import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["ioredis"],
  outputFileTracingExcludes: {
    "/api/1v1/[code]": ["./.generated/question-bank/**/*"],
  },
  outputFileTracingIncludes: {
    "/question-bank": ["./.generated/question-bank/index.json"],
    "/api/1v1": ["./.generated/question-bank/**/*"],
    "/question-bank/session": ["./.generated/question-bank/**/*"],
  },
};

export default nextConfig;
