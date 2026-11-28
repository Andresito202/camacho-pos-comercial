import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { ProvisioningService } from "./provisioning.service.js";

describe("commercial order fulfillment", () => {
  it.each([
    [undefined, "FAILED"], ["QUEUED", "QUEUED"], ["ISSUED", "SENT"],
  ])("does not complete an order for a successful Central response (%s)", async (fulfillment, status) => {
    const server = createServer((request, response) => {
      request.resume();
      request.on("end", () => {
        if (!fulfillment) {
          response.writeHead(204).end();
          return;
        }
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({
          status: "ACCEPTED", fulfillment, idempotencyKey: request.headers["idempotency-key"],
          provisioningId: "test-provisioning", licenseUnits: 1, cajaRule: "ONE_LICENSE_ONE_CAJA",
          licenseIds: fulfillment === "ISSUED" ? [randomUUID()] : [],
        }));
      });
    });
    server.listen(0, "127.0.0.1");
    try {
      await once(server, "listening");
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected TCP listener");
      const orderUpdate = vi.fn();
      const requestUpdate = vi.fn().mockResolvedValue({ count: 1 });
      const item = {
        id: randomUUID(), idempotencyKey: randomUUID(), attemptCount: 0,
        payload: { tenantId: randomUUID(), planId: randomUUID(), licenseUnits: 1 },
      };
      const prisma = {
        $queryRaw: vi.fn().mockResolvedValue([{ now: new Date() }]),
        provisioningRequest: {
          findMany: vi.fn().mockResolvedValue([item]),
          updateMany: requestUpdate,
        },
        order: { update: orderUpdate },
      };
      const config = {
        centralOrigin: () => `http://127.0.0.1:${address.port}`,
        env: { COMMERCIAL_BRIDGE_KEY: randomUUID() },
      };
      const service = new ProvisioningService(prisma as never, config as never, {} as never);
      expect(await service.processDue()).toMatchObject([{ id: item.id, status }]);
      expect(requestUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: item.id }),
        data: expect.objectContaining({ status }),
      }));
      expect(orderUpdate).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
