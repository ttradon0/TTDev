import { test, expect } from "@playwright/test";

const password = process.env.DEMO_ADMIN_PASSWORD;

test("Admin searches bookings and manages a room", async ({ page }) => {
  test.skip(!password, "Set DEMO_ADMIN_PASSWORD in .env.local and seed the demo account.");
  await page.goto("/login");
  await page.getByLabel("University email").fill("admin@ttdev.demo");
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Continue to Common Room" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/bookings");
  await expect(page.getByRole("heading", { name: "Booking ledger" })).toBeVisible();
  await page.getByLabel("Search bookings").fill("studio");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/q=studio/);

  await page.goto("/admin/rooms");
  const testName = "Browser QA " + Date.now().toString().slice(-6);
  await page.locator("#room-name-new").fill(testName);
  await page.locator("#room-capacity-new").fill("5");
  await page.getByRole("button", { name: "Add room" }).click();
  await expect(page.getByRole("status", { name: "Room added." })).toBeVisible();

  const roomForm = page.locator("form").filter({ hasText: testName });
  await roomForm.locator("select").selectOption("maintenance");
  await roomForm.getByRole("button", { name: "Save changes" }).click();
  await expect(roomForm.getByText("Room updated.")).toBeVisible();

  await roomForm.getByRole("button", { name: "Remove room" }).click();
  const confirmation = page.getByRole("dialog");
  await expect(confirmation.getByText(/Existing booking history will stay available/)).toBeVisible();
  await confirmation.getByRole("button", { name: "Remove room" }).click();
  await expect(page.getByText("Room history")).toBeVisible();
  await expect(page.getByText(testName, { exact: true }).last()).toBeVisible();
});
