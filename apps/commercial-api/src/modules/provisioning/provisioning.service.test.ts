import { once } from "node:events";
import { createServer } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { ProvisioningService } from "./provisioning.service.js";

describe("commercial order fulfillment", () => {
  it.each([undefined, "QUEUED", "ISSUED"])(
    "does not complete an order for a successful Central response (%s)",
    async fulfillment => {
      const server = createServer((request, response) => {
        request.resume();
        request.on("end", () => {
          if (!fulfillment) {
            response.writeHead(204).end();
            return;
          }
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify({ fulfillment }));
        });
      });
      server.listen(0, "127.0.0.1");
      try {
        await once(server, "listening");
        const address = server.address();
        if (!address || typeof address === "string") throw new Error("Expected TCP listener");
        const orderUpdate = vi.fn();
        const requestUpdate = vi.fn();
        const item = { id: "request", orderId: "order", idempotencyKey: "key", payload: {}, attemptCount: 0 };
        const prisma = {
          provisioningRequest: {
            findMany: vi.fn().mockResolvedValue([item]),
            findUniqueOrThrow: vi.fn().mockResolvedValue(item),
            update: requestUpdate,
          },
          order: { update: orderUpdate },
        };
        const config = { env: { CENTRAL_AUTHORITY_ORIGIN: `http://127.0.0.1:${address.port}` } };
        const service = new ProvisioningService(prisma as never, config as never, {} as never);
        expect(await service.processDue()).toEqual([{ id: item.id, status: "SENT" }]);
        expect(requestUpdate).toHaveBeenCalledWith(expect.objectContaining({
          where: { id: item.id },
          data: expect.objectContaining({ status: "SENT" }),
        }));
        expect(orderUpdate).not.toHaveBeenCalled();
      } finally {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      }
    },
  );
});
