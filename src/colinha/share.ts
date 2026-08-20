export interface ColinhaShareEnvironment {
  readonly canShare?: (data: ShareData) => boolean;
  readonly share?: (data: ShareData) => Promise<void>;
  readonly createFile: (blob: Blob, fileName: string) => File;
}

export type ColinhaShareResult =
  | Readonly<{ status: "shared" }>
  | Readonly<{ status: "cancelled" }>
  | Readonly<{ status: "unsupported" }>;

function browserShareEnvironment(): ColinhaShareEnvironment {
  return {
    canShare: navigator.canShare?.bind(navigator),
    share: navigator.share?.bind(navigator),
    createFile: (blob, fileName) =>
      new File([blob], fileName, { type: "image/png" }),
  };
}

function isCancellation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export function browserMayShareFiles(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    typeof File === "function"
  );
}

export async function shareColinhaPng(
  blob: Blob,
  fileName: string,
  environment: ColinhaShareEnvironment = browserShareEnvironment(),
): Promise<ColinhaShareResult> {
  if (!environment.share || !environment.canShare) {
    return { status: "unsupported" };
  }
  const file = environment.createFile(blob, fileName);
  const data: ShareData = {
    title: "Minha Colinha",
    text: "Minha colinha eleitoral",
    files: [file],
  };
  if (!environment.canShare(data)) {
    return { status: "unsupported" };
  }
  try {
    await environment.share(data);
    return { status: "shared" };
  } catch (error) {
    if (isCancellation(error)) {
      return { status: "cancelled" };
    }
    throw error;
  }
}
