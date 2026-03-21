const UNTRUSTED_START = '<!-- UNTRUSTED_CONTENT_START -->';
const UNTRUSTED_END = '<!-- UNTRUSTED_CONTENT_END -->';

export function wrapUntrusted(content: string): string {
  return `${UNTRUSTED_START}\n${content}\n${UNTRUSTED_END}`;
}

export function isUntrusted(content: string): boolean {
  return content.includes(UNTRUSTED_START);
}

export function stripUntrustedBlocks(content: string): string {
  const regex = new RegExp(
    `${escapeRegExp(UNTRUSTED_START)}[\\s\\S]*?${escapeRegExp(UNTRUSTED_END)}`,
    'g'
  );
  return content.replace(regex, '[UNTRUSTED CONTENT REMOVED]');
}

export function extractTrustedContent(content: string): string {
  // Returns only content outside untrusted blocks
  return stripUntrustedBlocks(content);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
