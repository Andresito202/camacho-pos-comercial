import { afterEach, describe, expect, it, vi } from "vitest";
import { ProvisioningService } from "../src/modules/provisioning/provisioning.service.js";

const databaseNow = new Date("2026-11-27T12:00:00.000Z");
const item = {
  id: "request-1", attemptCount: 3, idempotencyKey: "order-key",
  wirePreparedAt: new Date(),
  payload: {
    licenseUnits: 1, tenantId: "be6f9fff-55a8-4935-8f56-c3450c5762d2",
    planId: "8f691da7-47e8-48e8-92e6-eb5ef6362a4d",
  },
};
const receipt = {
  status: "ACCEPTED",
  provisioningId: "provision-id",
  idempotencyKey: item.idempotencyKey,
  licenseUnits: 1,
  cajaRule: "ONE_LICENSE_ONE_CAJA",
  fulfillment: "ISSUED",
  licenseIds: ["bf43eb10-7041-4fd9-9418-dafb60b45e5f"],
};

function worker(body: unknown, updates = 1) {
  const updateMany = vi.fn().mockResolvedValue({ count: updates });
  const orderUpdate = vi.fn();
  const prisma = {
    $queryRaw: vi.fn().mockResolvedValue([{ now: databaseNow }]),
    provisioningRequest: {
      findMany: vi.fn().mockResolvedValue([item]),
      updateMany,
    },
    order: { update: orderUpdate },
  };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
  const config = { centralOrigin: () => "https://central.example", env: { COMMERCIAL_BRIDGE_KEY: "k".repeat(32) } };
  const service = new ProvisioningService(prisma as never, config as never, {} as never);
  return { service, updateMany, orderUpdate };
}

afterEach(() => vi.unstubAllGlobals());

describe("Central provisioning evidence", () => {
  it("stores issuance evidence without treating it as order fulfillment", async () => {
    const { service, updateMany, orderUpdate } = worker(receipt);
    expect(await service.processDue()).toMatchObject([{ status: "SENT" }]);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        attemptCount: 4,
        order: expect.objectContaining({ status: { in: ["PAID", "PROVISIONING"] } }),
      }),
      data: expect.objectContaining({
        status: "SENT",
        payload: { ...item.payload, centralLicenseIds: receipt.licenseIds, centralProvisioningId: receipt.provisioningId },
      }),
    }));
    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({ attemptCount: 3 }),
      data: { attemptCount: { increment: 1 }, nextRetryAt: new Date(databaseNow.getTime() + 60_000) },
    }));
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...receipt, idempotencyKey: "wrong-order-key" }, "CENTRAL_PROVISIONING_ORDER_MISMATCH"],
    [{ ...receipt, licenseIds: [] }, "CENTRAL_PROVISIONING_LICENSE_COUNT_MISMATCH"],
    [{ ...receipt, licenseIds: ["fake-license"] }, "CENTRAL_PROVISIONING_RESPONSE_INVALID"],
  ])("rejects invalid issuance receipts", async (body, lastError) => {
    const { service, updateMany } = worker(body);
    expect(await service.processDue()).toMatchObject([{ status: "FAILED" }]);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "FAILED", lastError }),
    }));
    const retryAt = updateMany.mock.calls[1]![0].data.nextRetryAt as Date;
    expect(retryAt.getTime() - databaseNow.getTime()).toBeGreaterThanOrEqual(384_000);
    expect(retryAt.getTime() - databaseNow.getTime()).toBeLessThanOrEqual(480_000);
  });

  it("leaves a concurrent or terminal order unchanged", async () => {
    const { service } = worker(receipt, 0);
    expect(await service.processDue()).toMatchObject([{ status: "UNCHANGED" }]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
