import { describe, expect, it, vi } from "vitest";

import {
  triggerBlobDownload,
  type BlobDownloadEnvironment,
  type DownloadAnchor,
} from "./download.ts";

function downloadHarness(throws = false): {
  readonly anchor: DownloadAnchor;
  readonly environment: BlobDownloadEnvironment;
  readonly revoke: ReturnType<typeof vi.fn>;
  readonly scheduled: Array<() => void>;
} {
  const scheduled: Array<() => void> = [];
  const revoke = vi.fn();
  const anchor = {
    href: "",
    download: "",
    click: vi.fn(() => {
      if (throws) {
        throw new Error("download bloqueado");
      }
    }),
    remove: vi.fn(),
  };
  return {
    anchor,
    revoke,
    scheduled,
    environment: {
      createObjectUrl: vi.fn(() => "blob:colinha"),
      revokeObjectUrl: revoke,
      createAnchor: () => anchor,
      schedule: (callback) => scheduled.push(callback),
    },
  };
}

describe("download local do PNG", () => {
  it("inicia o download e revoga a URL temporária logo depois", () => {
    const harness = downloadHarness();

    const result = triggerBlobDownload(
      new Blob(["png"]),
      "minha-colinha-2026-MA.png",
      harness.environment,
    );

    expect(result).toEqual({ started: true });
    expect(harness.anchor).toMatchObject({
      href: "blob:colinha",
      download: "minha-colinha-2026-MA.png",
    });
    expect(harness.anchor.click).toHaveBeenCalledOnce();
    expect(harness.anchor.remove).toHaveBeenCalledOnce();
    expect(harness.revoke).not.toHaveBeenCalled();
    harness.scheduled[0]?.();
    expect(harness.revoke).toHaveBeenCalledWith("blob:colinha");
  });

  it("preserva a URL somente quando o navegador exige link manual", () => {
    const harness = downloadHarness(true);

    const result = triggerBlobDownload(
      new Blob(["png"]),
      "minha-colinha.png",
      harness.environment,
    );

    expect(result).toEqual({
      started: false,
      fallbackUrl: "blob:colinha",
    });
    expect(harness.anchor.remove).toHaveBeenCalledOnce();
    expect(harness.scheduled).toHaveLength(0);
    expect(harness.revoke).not.toHaveBeenCalled();
  });
});
