// Dates are stored and compared as ISO strings ("YYYY-MM-DD") throughout
// the app; this only formats them for display, never for storage/comparison.
export function formatDateDMY(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
