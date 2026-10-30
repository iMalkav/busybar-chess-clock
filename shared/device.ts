import type {
  AudioPlayParams,
  BusySnapshot,
  BusySnapshotSetParams,
  DisplayClearParams,
  DisplayDrawParams,
  SuccessResponse,
} from "@busy-app/busy-lib";

// ChessClock uses five local endpoints. A dedicated client keeps the on-device
// bundle small and avoids busy-lib's /version handshake on the first request.
const address = __BUSY_ADDR__;
const origin = /^https?:\/\//i.test(address) ? address : `http://${address}`;
const api = `${origin.replace(/\/$/, "")}/api`;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    new Request(`${api}${path}`, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    }),
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const device = {
  DisplayDraw(params: DisplayDrawParams): Promise<SuccessResponse> {
    return request("POST", "/display/draw", {
      ...params,
      priority: params.priority ?? 50,
    });
  },

  DisplayClear(params?: DisplayClearParams): Promise<SuccessResponse> {
    return request("DELETE", "/display/draw", params ?? {});
  },

  AudioPlay(params: AudioPlayParams): Promise<SuccessResponse> {
    return request("POST", "/audio/play", params);
  },

  BusySnapshotGet(): Promise<BusySnapshot> {
    return request("GET", "/busy/snapshot");
  },

  BusySnapshotSet(params: BusySnapshotSetParams): Promise<SuccessResponse> {
    return request("PUT", "/busy/snapshot", params);
  },
};
