import { afterEach, describe, expect, it, vi } from "vitest";
import { ProvisioningService } from "../src/modules/provisioning/provisioning.service.js";

const item = { id: "request-1", attemptCount: 3, idempotencyKey: "order-key", payload: { licenseUnits: 1 } };
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
    provisioningRequest: {
      findMany: vi.fn().mockResolvedValue([item]),
      findUniqueOrThrow: vi.fn().mockResolvedValue(item),
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
        attemptCount: 3,
        order: { status: { in: ["PAID", "PROVISIONING"] } },
      }),
      data: expect.objectContaining({
        status: "SENT",
        payload: { licenseUnits: 1, centralLicenseIds: receipt.licenseIds, centralProvisioningId: receipt.provisioningId },
      }),
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
  });

  it("leaves a concurrent or terminal order unchanged", async () => {
    const { service } = worker(receipt, 0);
    expect(await service.processDue()).toMatchObject([{ status: "UNCHANGED" }]);
  });
});
