import { expect, test } from "@playwright/test";

test.describe("Health Check API E2E", () => {
  test("GET /api/health mengembalikan status 200 OK dan status database sehat", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.database.status).toBe("healthy");
    expect(typeof body.database.latencyMs).toBe("number");
    expect(typeof body.uptimeSeconds).toBe("number");
    expect(body.version).toBe("1.0.0");
  });
});
