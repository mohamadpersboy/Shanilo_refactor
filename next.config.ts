import type { NextConfig } from "next";

/**
 * Baseline security headers (S26, S15 hardening). No CSP yet: a correct CSP needs the final
 * asset/script inventory (Cloudinary, gateway redirects) and is deferred to Phase 6/7.
 *
 * Strict-Transport-Security (HSTS) is intentionally NOT sent from the application.
 * It stays disabled until the production domain, its TLS certificate and the full list of
 * subdomains are confirmed. It will then be enabled in the production Reverse Proxy, not here.
 * See docs/scope/security-audit.md ("HSTS decision").
 */
export function securityHeaders(): { key: string; value: string }[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    agentUpgrade: "security",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default nextConfig;
