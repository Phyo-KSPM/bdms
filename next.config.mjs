import path from "path"
import { fileURLToPath } from "url"

const appRoot = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV === "development"

const csp = [
  "default-src 'self'",
  // Next.js app router emits inline runtime scripts; allow inline scripts in all envs.
  // Keep eval restricted to development where HMR/Turbopack needs it.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: ws: wss:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
]
  .join("; ")
  .replace(/\s{2,}/g, " ")
  .trim()

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ]
  },
}

export default nextConfig
