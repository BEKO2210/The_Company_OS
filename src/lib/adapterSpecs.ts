// Declarative spec for each backend adapter:
// - providers the user can pick from
// - credential fields per provider
// - which .env keys to write
//
// Adding a new adapter / provider only needs an entry here; the wizard
// UI and the .env serializer both consume this same source.

import type { AdapterKey } from './storage';

export interface CredentialField {
  key: string;        // localStorage key inside adapter.credentials
  label: string;
  envKey: string;     // server/.env variable name
  placeholder?: string;
  type?: 'text' | 'password' | 'number';
  required?: boolean;
}

export interface ProviderSpec {
  id: string;
  label: string;
  description: string;
  fields: CredentialField[];
}

export interface AdapterSpec {
  key: AdapterKey;
  title: string;
  description: string;
  envPrefix: string;            // e.g. 'EMAIL' -> EMAIL_PROVIDER, EMAIL_API_KEY, ...
  providers: ProviderSpec[];
}

export const ADAPTER_SPECS: AdapterSpec[] = [
  {
    key: 'ai',
    title: 'AI / LLM',
    description: 'Sprachmodell-Backend fuer KI-Suche, Empfehlungen, Reports.',
    envPrefix: 'AI',
    providers: [
      {
        id: 'ollama', label: 'Ollama (lokal)',
        description: 'Lokales LLM via Ollama-Daemon (z.B. mistral-nemo:12b)',
        fields: [
          { key: 'url',   label: 'Ollama URL',  envKey: 'OLLAMA_URL',   placeholder: 'http://localhost:11434' },
          { key: 'model', label: 'Modell-Name', envKey: 'OLLAMA_MODEL', placeholder: 'mistral-nemo:12b', required: true },
        ],
      },
      {
        id: 'openai', label: 'OpenAI',
        description: 'OpenAI API (gpt-4o, gpt-4o-mini, ...)',
        fields: [
          { key: 'apiKey', label: 'API Key', envKey: 'OPENAI_API_KEY', type: 'password', required: true },
          { key: 'model',  label: 'Modell',  envKey: 'OPENAI_MODEL',   placeholder: 'gpt-4o-mini' },
        ],
      },
      {
        id: 'anthropic', label: 'Anthropic Claude',
        description: 'Claude via Anthropic API',
        fields: [
          { key: 'apiKey', label: 'API Key', envKey: 'ANTHROPIC_API_KEY', type: 'password', required: true },
          { key: 'model',  label: 'Modell',  envKey: 'ANTHROPIC_MODEL',   placeholder: 'claude-sonnet-4-5' },
        ],
      },
    ],
  },
  {
    key: 'email',
    title: 'Email',
    description: 'Outbound + Inbound Mail (Kundenkommunikation, Reports).',
    envPrefix: 'EMAIL',
    providers: [
      {
        id: 'smtp', label: 'SMTP', description: 'Klassischer SMTP-Server',
        fields: [
          { key: 'host', label: 'SMTP Host', envKey: 'EMAIL_SMTP_HOST', placeholder: 'smtp.mailgun.org', required: true },
          { key: 'port', label: 'Port',       envKey: 'EMAIL_SMTP_PORT', placeholder: '587', type: 'number' },
          { key: 'user', label: 'User',       envKey: 'EMAIL_SMTP_USER', required: true },
          { key: 'pass', label: 'Password',   envKey: 'EMAIL_SMTP_PASS', type: 'password', required: true },
          { key: 'from', label: 'From Address', envKey: 'EMAIL_FROM',     placeholder: 'no-reply@yourdomain.com' },
        ],
      },
      {
        id: 'sendgrid', label: 'SendGrid', description: 'SendGrid Web API v3',
        fields: [
          { key: 'apiKey', label: 'API Key', envKey: 'SENDGRID_API_KEY', type: 'password', required: true },
          { key: 'from',   label: 'From Address', envKey: 'EMAIL_FROM',  placeholder: 'no-reply@yourdomain.com' },
        ],
      },
      {
        id: 'mailgun', label: 'Mailgun', description: 'Mailgun HTTP API',
        fields: [
          { key: 'apiKey', label: 'API Key', envKey: 'MAILGUN_API_KEY', type: 'password', required: true },
          { key: 'domain', label: 'Domain',  envKey: 'MAILGUN_DOMAIN',  placeholder: 'mg.yourdomain.com', required: true },
        ],
      },
    ],
  },

  {
    key: 'linkedin',
    title: 'LinkedIn',
    description: 'Profile lookup, Outreach (B2B).',
    envPrefix: 'LINKEDIN',
    providers: [
      {
        id: 'linkedin-api', label: 'LinkedIn API', description: 'OAuth Access Token',
        fields: [
          { key: 'accessToken', label: 'Access Token', envKey: 'LINKEDIN_ACCESS_TOKEN', type: 'password', required: true },
          { key: 'organizationId', label: 'Organization ID', envKey: 'LINKEDIN_ORG_ID' },
        ],
      },
      {
        id: 'proxycurl', label: 'Proxycurl', description: 'LinkedIn-Scraper via Proxycurl',
        fields: [
          { key: 'apiKey', label: 'API Key', envKey: 'PROXYCURL_API_KEY', type: 'password', required: true },
        ],
      },
    ],
  },

  {
    key: 'banking',
    title: 'Banking',
    description: 'Konto-Salden, Transaktionen (read-only).',
    envPrefix: 'BANKING',
    providers: [
      {
        id: 'plaid', label: 'Plaid', description: 'US/EU Banking aggregation',
        fields: [
          { key: 'clientId', label: 'Client ID', envKey: 'PLAID_CLIENT_ID', required: true },
          { key: 'secret',   label: 'Secret',    envKey: 'PLAID_SECRET',    type: 'password', required: true },
          { key: 'env',      label: 'Env (sandbox/dev/prod)', envKey: 'PLAID_ENV', placeholder: 'sandbox' },
        ],
      },
      {
        id: 'gocardless', label: 'GoCardless', description: 'PSD2 Bank Account Data',
        fields: [
          { key: 'secretId',  label: 'Secret ID',  envKey: 'GC_SECRET_ID',  required: true },
          { key: 'secretKey', label: 'Secret Key', envKey: 'GC_SECRET_KEY', type: 'password', required: true },
        ],
      },
      {
        id: 'finapi', label: 'finAPI (DE)', description: 'Deutscher Bank-Aggregator',
        fields: [
          { key: 'clientId',     label: 'Client ID',     envKey: 'FINAPI_CLIENT_ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', envKey: 'FINAPI_CLIENT_SECRET', type: 'password', required: true },
        ],
      },
    ],
  },

  {
    key: 'accounting',
    title: 'Accounting',
    description: 'Buchhaltung / Rechnungen.',
    envPrefix: 'ACCOUNTING',
    providers: [
      {
        id: 'lexware', label: 'Lexware Office', description: 'DE Cloud Buchhaltung',
        fields: [
          { key: 'apiKey', label: 'API Key', envKey: 'LEXWARE_API_KEY', type: 'password', required: true },
        ],
      },
      {
        id: 'datev', label: 'DATEV', description: 'DATEVconnect',
        fields: [
          { key: 'clientId',     label: 'Client ID',     envKey: 'DATEV_CLIENT_ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', envKey: 'DATEV_CLIENT_SECRET', type: 'password', required: true },
        ],
      },
      {
        id: 'xero', label: 'Xero', description: 'Xero OAuth 2.0',
        fields: [
          { key: 'clientId',     label: 'Client ID',     envKey: 'XERO_CLIENT_ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', envKey: 'XERO_CLIENT_SECRET', type: 'password', required: true },
          { key: 'tenantId',     label: 'Tenant ID',     envKey: 'XERO_TENANT_ID' },
        ],
      },
    ],
  },

  {
    key: 'github',
    title: 'GitHub',
    description: 'Repos, PRs, Actions.',
    envPrefix: 'GITHUB',
    providers: [
      {
        id: 'github-pat', label: 'Personal Access Token', description: 'Klassisch oder fine-grained',
        fields: [
          { key: 'token', label: 'PAT',       envKey: 'GITHUB_TOKEN', type: 'password', required: true },
          { key: 'org',   label: 'Org/User',  envKey: 'GITHUB_ORG',   placeholder: 'your-org' },
        ],
      },
      {
        id: 'github-app', label: 'GitHub App', description: 'Privater Schluessel',
        fields: [
          { key: 'appId',         label: 'App ID',          envKey: 'GITHUB_APP_ID',         required: true },
          { key: 'installationId', label: 'Installation ID', envKey: 'GITHUB_INSTALLATION_ID', required: true },
          { key: 'privateKey',    label: 'Private Key',     envKey: 'GITHUB_PRIVATE_KEY',    type: 'password', required: true },
        ],
      },
    ],
  },

  {
    key: 'hosting',
    title: 'Hosting',
    description: 'Deployments + DNS.',
    envPrefix: 'HOSTING',
    providers: [
      {
        id: 'vercel', label: 'Vercel',
        description: 'Vercel REST API',
        fields: [
          { key: 'token',   label: 'API Token', envKey: 'VERCEL_TOKEN', type: 'password', required: true },
          { key: 'teamId',  label: 'Team ID',   envKey: 'VERCEL_TEAM_ID' },
        ],
      },
      {
        id: 'netlify', label: 'Netlify',
        description: 'Netlify Personal Access Token',
        fields: [
          { key: 'token', label: 'API Token', envKey: 'NETLIFY_TOKEN', type: 'password', required: true },
        ],
      },
      {
        id: 'cloudflare', label: 'Cloudflare Pages',
        description: 'Cloudflare API Token',
        fields: [
          { key: 'token',     label: 'API Token',  envKey: 'CF_API_TOKEN',  type: 'password', required: true },
          { key: 'accountId', label: 'Account ID', envKey: 'CF_ACCOUNT_ID', required: true },
        ],
      },
    ],
  },

  {
    key: 'calendar',
    title: 'Calendar',
    description: 'Meetings + Reminders.',
    envPrefix: 'CALENDAR',
    providers: [
      {
        id: 'google', label: 'Google Calendar', description: 'OAuth 2.0',
        fields: [
          { key: 'clientId',     label: 'Client ID',     envKey: 'GOOGLE_CLIENT_ID',     required: true },
          { key: 'clientSecret', label: 'Client Secret', envKey: 'GOOGLE_CLIENT_SECRET', type: 'password', required: true },
          { key: 'refreshToken', label: 'Refresh Token', envKey: 'GOOGLE_REFRESH_TOKEN', type: 'password' },
        ],
      },
      {
        id: 'caldav', label: 'CalDAV (selfhosted)', description: 'Nextcloud, Radicale, etc.',
        fields: [
          { key: 'url',  label: 'Server URL', envKey: 'CALDAV_URL',  placeholder: 'https://cloud.example/remote.php/dav', required: true },
          { key: 'user', label: 'User',       envKey: 'CALDAV_USER', required: true },
          { key: 'pass', label: 'Password',   envKey: 'CALDAV_PASS', type: 'password', required: true },
        ],
      },
    ],
  },

  {
    key: 'freelancer',
    title: 'Freelancer-Platform',
    description: 'Aussourcing & Job-Postings.',
    envPrefix: 'FREELANCER',
    providers: [
      {
        id: 'upwork', label: 'Upwork', description: 'Upwork API',
        fields: [
          { key: 'consumerKey',    label: 'Consumer Key',    envKey: 'UPWORK_CONSUMER_KEY',    required: true },
          { key: 'consumerSecret', label: 'Consumer Secret', envKey: 'UPWORK_CONSUMER_SECRET', type: 'password', required: true },
        ],
      },
      {
        id: 'fiverr', label: 'Fiverr (Affiliate)', description: 'Fiverr CPA API Token',
        fields: [
          { key: 'apiKey', label: 'API Key', envKey: 'FIVERR_API_KEY', type: 'password', required: true },
        ],
      },
      {
        id: 'malt', label: 'Malt', description: 'Malt Enterprise API',
        fields: [
          { key: 'apiKey', label: 'API Key', envKey: 'MALT_API_KEY', type: 'password', required: true },
        ],
      },
    ],
  },
];

export function getAdapterSpec(key: AdapterKey): AdapterSpec | undefined {
  return ADAPTER_SPECS.find((s) => s.key === key);
}

export function getProviderSpec(adapter: AdapterKey, providerId: string): ProviderSpec | undefined {
  return getAdapterSpec(adapter)?.providers.find((p) => p.id === providerId);
}
