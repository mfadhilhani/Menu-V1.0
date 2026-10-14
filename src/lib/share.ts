export function saveBlob(b: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
export async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}
export function openWa(text: string) {
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
}
// Kirim gambar + teks lewat menu bagikan HP; kalau tidak didukung, gambar disimpan dan teks disalin.
export async function shareFiles(files: File[], text: string, toast: (m: string) => void) {
  const copied = await copyText(text);
  try {
    if (navigator.canShare && navigator.canShare({ files })) {
      await navigator.share({ files, text });
      toast("Dibuka. Kalau teks tidak muncul sebagai keterangan, tempel saja" + (copied ? " (teks sudah disalin)." : "."));
      return;
    }
  } catch (e) { if ((e as Error).name === "AbortError") return; }
  files.forEach((f) => saveBlob(f, f.name));
  toast("Gambar disimpan" + (copied ? " dan teks disalin" : "") + ". Di WhatsApp: lampirkan gambar, lalu tempel teks di keterangan.");
}
