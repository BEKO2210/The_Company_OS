// ═══════════════════════════════════════════════════════════════
// Red Line Configuration - Frontend Mirror of Backend Constants
// These 10 red lines are NON-NEGOTIABLE and require FOUNDER role.
// ═══════════════════════════════════════════════════════════════

export const RED_LINE_TYPES = [
  'payment',                 // Zahlungen
  'contract',                // Verträge
  'invoice',                 // Rechnungsversand
  'deployment',              // Produktiv-Deployment
  'freelancer',              // Freelancer-Beauftragung
  'authority_communication', // Behördenkommunikation
  'termination',             // Kündigungen
  'refund',                  // Erstattungen
  'safety_veto_override',    // Aufhebung Safety-Veto
  'physical_security',       // Physische/sicherheitsrelevante Einsätze
] as const;

export type RedLineType = typeof RED_LINE_TYPES[number];

/**
 * Check if an approval type is a red line.
 */
export function isRedLine(type: string): boolean {
  return RED_LINE_TYPES.includes(type as RedLineType);
}

/**
 * Get human-readable label for a red line type.
 */
export function getRedLineLabel(type: string): string {
  const labels: Record<string, string> = {
    payment: 'Zahlung',
    contract: 'Vertrag',
    invoice: 'Rechnungsversand',
    deployment: 'Produktiv-Deployment',
    freelancer: 'Freelancer-Beauftragung',
    authority_communication: 'Behördenkommunikation',
    termination: 'Kündigung',
    refund: 'Erstattung',
    safety_veto_override: 'Aufhebung Safety-Veto',
    physical_security: 'Physische/sicherheitsrelevante Einsätze',
  };
  return labels[type] || type;
}
