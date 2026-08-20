export interface DownloadAnchor {
  href: string;
  download: string;
  click(): void;
  remove(): void;
}

export interface BlobDownloadEnvironment {
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  createAnchor(): DownloadAnchor;
  schedule(callback: () => void): void;
}

export type BlobDownloadResult =
  | Readonly<{ started: true }>
  | Readonly<{ started: false; fallbackUrl: string }>;

function browserDownloadEnvironment(): BlobDownloadEnvironment {
  return {
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    createAnchor: () => document.createElement("a"),
    schedule: (callback) => window.setTimeout(callback, 1_000),
  };
}

export function triggerBlobDownload(
  blob: Blob,
  fileName: string,
  environment: BlobDownloadEnvironment = browserDownloadEnvironment(),
): BlobDownloadResult {
  const url = environment.createObjectUrl(blob);
  const anchor = environment.createAnchor();
  anchor.href = url;
  anchor.download = fileName;

  try {
    anchor.click();
  } catch {
    anchor.remove();
    return { started: false, fallbackUrl: url };
  }

  anchor.remove();
  environment.schedule(() => environment.revokeObjectUrl(url));
  return { started: true };
}
