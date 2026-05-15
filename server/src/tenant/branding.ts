/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║   The Company OS - Branding Engine                            ║
 * ║   RUN-008: Multi-Tenant + Whitelabel Foundation              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Dynamic branding engine that generates CSS variables, stylesheets,
 * and HTML meta tags for each tenant. Enables full white-label
 * customization including colors, logos, fonts, and custom domains.
 */

import type { Tenant, CSSVariables, BrandingAssets, TenantBranding } from "./types";
import { TenantManager } from "./tenantManager";

// ───────────────────────────────────────────────
// Branding Engine Class
// ───────────────────────────────────────────────

export class BrandingEngine {
  private cache: Map<string, { css: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private tenantManager: TenantManager) {}

  // ─── CSS Variables ───────────────────────

  /** Generate CSS custom properties from tenant branding */
  getStyles(tenantId: string): CSSVariables {
    const tenant = this.tenantManager.getTenant(tenantId);
    if (!tenant) {
      return this.getDefaultStyles();
    }

    const { branding } = tenant;

    return {
      "--tenant-primary": branding.primaryColor,
      "--tenant-secondary": branding.secondaryColor,
      "--tenant-primary-rgb": this.hexToRgb(branding.primaryColor),
      "--tenant-secondary-rgb": this.hexToRgb(branding.secondaryColor),
      "--tenant-company-name": `"${branding.companyName}"`,
      "--tenant-background": this.generateBackground(branding.primaryColor),
      "--tenant-surface": "#ffffff",
      "--tenant-text": this.generateTextColor(branding.primaryColor),
      "--tenant-text-muted": this.mixColors(
        this.generateTextColor(branding.primaryColor),
        "#94a3b8",
        0.5
      ),
      "--tenant-border": this.mixColors(branding.primaryColor, "#e2e8f0", 0.1),
      "--tenant-accent": branding.secondaryColor,
      "--tenant-error": "#ef4444",
      "--tenant-success": "#22c55e",
      "--tenant-warning": "#f59e0b",
      "--tenant-info": "#3b82f6",
      "--tenant-sidebar-bg": this.mixColors(branding.primaryColor, "#f8fafc", 0.05),
      "--tenant-sidebar-text": this.generateTextColor(branding.primaryColor),
      "--tenant-card-bg": "#ffffff",
      "--tenant-card-shadow": "0 1px 3px 0 rgb(0 0 0 / 0.1)",
      "--tenant-button-bg": branding.primaryColor,
      "--tenant-button-text": this.getContrastColor(branding.primaryColor),
      "--tenant-button-hover": this.adjustBrightness(branding.primaryColor, -10),
      "--tenant-input-border": this.mixColors(branding.primaryColor, "#cbd5e1", 0.3),
      "--tenant-input-focus": branding.primaryColor,
      "--tenant-link": branding.primaryColor,
      "--tenant-link-hover": this.adjustBrightness(branding.primaryColor, -15),
      "--tenant-gradient-start": branding.primaryColor,
      "--tenant-gradient-end": this.adjustBrightness(branding.secondaryColor, 10),
    };
  }

  /** Generate a complete CSS stylesheet for a tenant */
  getStylesheet(tenantId: string): string {
    // Check cache
    const cached = this.cache.get(tenantId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.css;
    }

    const tenant = this.tenantManager.getTenant(tenantId);
    if (!tenant) {
      return this.getDefaultStylesheet();
    }

    const styles = this.getStyles(tenantId);
    const css = this.generateStylesheet(styles, tenant.branding);

    // Cache result
    this.cache.set(tenantId, { css, timestamp: Date.now() });

    return css;
  }

  /** Get branding assets (logo, favicon, stylesheet URL) */
  getBrandingAssets(tenantId: string, baseUrl?: string): BrandingAssets {
    const tenant = this.tenantManager.getTenant(tenantId);
    const slug = tenant?.slug || "default";
    const b = tenant?.branding;

    return {
      logoUrl: b?.logoUrl || `${baseUrl || ""}/assets/default-logo.svg`,
      faviconUrl: b?.faviconUrl || `${baseUrl || ""}/assets/default-favicon.ico`,
      stylesheetUrl: `${baseUrl || ""}/api/tenant/${slug}/styles.css`,
      cssVariables: this.getStyles(tenantId),
    };
  }

  /** Apply branding to HTML document (server-side rendering helper) */
  generateHtmlMetaTags(tenantId: string): string {
    const tenant = this.tenantManager.getTenant(tenantId);
    if (!tenant) return "";

    const { branding } = tenant;

    const tags: string[] = [
      `<meta name="theme-color" content="${branding.primaryColor}">`,
      `<meta property="og:site_name" content="${escapeHtml(branding.companyName)}">`,
      branding.logoUrl
        ? `<link rel="icon" href="${branding.logoUrl}" type="image/png">`
        : `<link rel="icon" href="/assets/default-favicon.ico">`,
      branding.logoUrl
        ? `<link rel="apple-touch-icon" href="${branding.logoUrl}">`
        : "",
      `<title>${escapeHtml(branding.companyName)}</title>`,
    ];

    return tags.filter(Boolean).join("\n");
  }

  /** Get JSON configuration for frontend branding */
  getBrandingConfig(tenantId: string): Record<string, unknown> {
    const tenant = this.tenantManager.getTenant(tenantId);
    if (!tenant) {
      return this.getDefaultBrandingConfig();
    }

    return {
      companyName: tenant.branding.companyName,
      tagline: tenant.branding.tagline || null,
      footerText: tenant.branding.footerText || null,
      colors: {
        primary: tenant.branding.primaryColor,
        secondary: tenant.branding.secondaryColor,
      },
      logo: {
        url: tenant.branding.logoUrl || null,
        alt: `${tenant.branding.companyName} Logo`,
      },
      favicon: {
        url: tenant.branding.faviconUrl || null,
      },
      links: {
        login: `/login/${tenant.slug}`,
        dashboard: `/dashboard/${tenant.slug}`,
        settings: `/settings/${tenant.slug}`,
      },
      features: {
        whiteLabel: tenant.config.allowSubBranding,
        customDomain: !!tenant.branding.customDomain,
        sso: tenant.config.allowSso,
        api: tenant.config.allowApiAccess,
      },
    };
  }

  /** Invalidate cached stylesheet for a tenant */
  invalidateCache(tenantId: string): void {
    this.cache.delete(tenantId);
  }

  /** Invalidate all cached stylesheets */
  invalidateAllCache(): void {
    this.cache.clear();
  }

  // ─── Private Helpers ─────────────────────

  private generateStylesheet(styles: CSSVariables, branding: TenantBranding): string {
    const cssVars = Object.entries(styles)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join("\n");

    return `/**
 * The Company OS - Tenant Stylesheet
 * Auto-generated for: ${branding.companyName}
 * DO NOT EDIT - Generated by BrandingEngine
 */

:root {
${cssVars}
}

/* ─── Base Styles ─────────────────────── */

.tenant-themed {
  background-color: var(--tenant-background);
  color: var(--tenant-text);
}

.tenant-sidebar {
  background-color: var(--tenant-sidebar-bg);
  color: var(--tenant-sidebar-text);
  border-right: 1px solid var(--tenant-border);
}

.tenant-card {
  background-color: var(--tenant-card-bg);
  box-shadow: var(--tenant-card-shadow);
  border-radius: 0.5rem;
  border: 1px solid var(--tenant-border);
}

.tenant-button {
  background-color: var(--tenant-button-bg);
  color: var(--tenant-button-text);
  border: none;
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 150ms ease;
}

.tenant-button:hover {
  background-color: var(--tenant-button-hover);
}

.tenant-input {
  border: 1px solid var(--tenant-input-border);
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: var(--tenant-surface);
  color: var(--tenant-text);
  transition: border-color 150ms ease;
}

.tenant-input:focus {
  outline: none;
  border-color: var(--tenant-input-focus);
  box-shadow: 0 0 0 2px var(--tenant-primary-rgb);
}

.tenant-link {
  color: var(--tenant-link);
  text-decoration: none;
  transition: color 150ms ease;
}

.tenant-link:hover {
  color: var(--tenant-link-hover);
  text-decoration: underline;
}

/* ─── Logo & Branding ─────────────────── */

.tenant-logo {
  max-height: 2rem;
  width: auto;
}

.tenant-company-name::before {
  content: var(--tenant-company-name);
}

/* ─── Status Colors ───────────────────── */

.tenant-status-success { color: var(--tenant-success); }
.tenant-status-error   { color: var(--tenant-error); }
.tenant-status-warning { color: var(--tenant-warning); }
.tenant-status-info    { color: var(--tenant-info); }

/* ─── Gradient Accent ─────────────────── */

.tenant-gradient {
  background: linear-gradient(
    135deg,
    var(--tenant-gradient-start) 0%,
    var(--tenant-gradient-end) 100%
  );
}
`;
  }

  private getDefaultStyles(): CSSVariables {
    return {
      "--tenant-primary": "#2563eb",
      "--tenant-secondary": "#475569",
      "--tenant-primary-rgb": "37, 99, 235",
      "--tenant-secondary-rgb": "71, 85, 105",
      "--tenant-company-name": '"The Company OS"',
      "--tenant-background": "#f8fafc",
      "--tenant-surface": "#ffffff",
      "--tenant-text": "#0f172a",
      "--tenant-text-muted": "#64748b",
      "--tenant-border": "#e2e8f0",
      "--tenant-accent": "#475569",
      "--tenant-error": "#ef4444",
      "--tenant-success": "#22c55e",
      "--tenant-warning": "#f59e0b",
      "--tenant-info": "#3b82f6",
      "--tenant-sidebar-bg": "#f8fafc",
      "--tenant-sidebar-text": "#0f172a",
      "--tenant-card-bg": "#ffffff",
      "--tenant-card-shadow": "0 1px 3px 0 rgb(0 0 0 / 0.1)",
      "--tenant-button-bg": "#2563eb",
      "--tenant-button-text": "#ffffff",
      "--tenant-button-hover": "#1d4ed8",
      "--tenant-input-border": "#cbd5e1",
      "--tenant-input-focus": "#2563eb",
      "--tenant-link": "#2563eb",
      "--tenant-link-hover": "#1d4ed8",
      "--tenant-gradient-start": "#2563eb",
      "--tenant-gradient-end": "#475569",
    };
  }

  private getDefaultStylesheet(): string {
    return this.generateStylesheet(this.getDefaultStyles(), {
      primaryColor: "#2563eb",
      secondaryColor: "#475569",
      companyName: "The Company OS",
      emailFrom: "noreply@company-os.com",
    });
  }

  private getDefaultBrandingConfig(): Record<string, unknown> {
    return {
      companyName: "The Company OS",
      tagline: null,
      footerText: null,
      colors: { primary: "#2563eb", secondary: "#475569" },
      logo: { url: null, alt: "The Company OS Logo" },
      favicon: { url: null },
      links: { login: "/login", dashboard: "/dashboard", settings: "/settings" },
      features: { whiteLabel: false, customDomain: false, sso: false, api: true },
    };
  }

  // ─── Color Utilities ─────────────────────

  /** Convert hex to RGB string */
  private hexToRgb(hex: string): string {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  /** Generate a light background tint from primary color */
  private generateBackground(primaryColor: string): string {
    return this.mixColors(primaryColor, "#f8fafc", 0.03);
  }

  /** Generate text color based on primary color brightness */
  private generateTextColor(primaryColor: string): string {
    const brightness = this.getBrightness(primaryColor);
    return brightness > 0.5 ? "#1e293b" : "#f8fafc";
  }

  /** Get contrast color (black or white) for given background */
  private getContrastColor(hex: string): string {
    const brightness = this.getBrightness(hex);
    return brightness > 0.5 ? "#0f172a" : "#ffffff";
  }

  /** Calculate relative brightness (0-1) */
  private getBrightness(hex: string): number {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  /** Mix two colors with given ratio (0-1) */
  private mixColors(color1: string, color2: string, ratio: number): string {
    const c1 = color1.replace("#", "");
    const c2 = color2.replace("#", "");
    const r1 = parseInt(c1.substring(0, 2), 16);
    const g1 = parseInt(c1.substring(2, 4), 16);
    const b1 = parseInt(c1.substring(4, 6), 16);
    const r2 = parseInt(c2.substring(0, 2), 16);
    const g2 = parseInt(c2.substring(2, 4), 16);
    const b2 = parseInt(c2.substring(4, 6), 16);

    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);

    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  /** Adjust brightness by percent (-100 to 100) */
  private adjustBrightness(hex: string, percent: number): string {
    const clean = hex.replace("#", "");
    let r = parseInt(clean.substring(0, 2), 16);
    let g = parseInt(clean.substring(2, 4), 16);
    let b = parseInt(clean.substring(4, 6), 16);

    r = Math.max(0, Math.min(255, r + (r * percent) / 100));
    g = Math.max(0, Math.min(255, g + (g * percent) / 100));
    b = Math.max(0, Math.min(255, b + (b * percent) / 100));

    return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g)
      .toString(16)
      .padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
  }
}

// ───────────────────────────────────────────────
// Utility Functions
// ───────────────────────────────────────────────

/** Escape HTML special characters */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/** Validate branding color format */
export function isValidColor(color: unknown): color is string {
  return typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color);
}

/** Validate logo URL */
export function isValidLogoUrl(url: unknown): boolean {
  return (
    typeof url === "string" &&
    (url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("/"))
  );
}

/** Generate CSS block for embedding in HTML */
export function generateInlineStyles(branding: TenantBranding): string {
  const engine = new BrandingEngine({
    getTenant: () =>
      ({
        id: "temp",
        slug: "temp",
        name: branding.companyName,
        status: "active",
        plan: "starter",
        branding,
      } as Tenant),
    getTenantBySlug: () => null,
    getTenantByCustomDomain: () => null,
  } as unknown as TenantManager);

  const styles = engine.getStyles("temp");
  const vars = Object.entries(styles)
    .map(([k, v]) => `${k}: ${v};`)
    .join("\n  ");

  return `:root {\n  ${vars}\n}`;
}
