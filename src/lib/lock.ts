// Passphrase hashing for the per-item privacy lock. This is a hide-from-
// casual-view gate, NOT encryption — the item content stays plaintext in
// the database. We store only the SHA-256 of the passphrase so the
// passphrase itself is never persisted, and compare hashes on unlock.

export async function hashPassphrase(passphrase: string): Promise<string> {
  const data = new TextEncoder().encode(passphrase);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function checkPassphrase(
  passphrase: string,
  hash: string | null,
): Promise<boolean> {
  if (!hash) return true;
  return (await hashPassphrase(passphrase)) === hash;
}
