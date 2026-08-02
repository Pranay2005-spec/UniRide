export function buildUpiUrl({ upiId, name, amount, txnNote }) {
  if (!upiId) return null;
  const parts = [`pa=${upiId}`];
  if (name) parts.push(`pn=${encodeURIComponent(name.slice(0, 25))}`);
  if (amount) parts.push(`am=${String(amount)}`);
  if (txnNote) parts.push(`tn=${encodeURIComponent(txnNote)}`);
  parts.push('cu=INR');
  return `upi://pay?${parts.join('&')}`;
}
