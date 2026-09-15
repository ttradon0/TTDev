import { test, expect, type Route } from "@playwright/test";
import { fromZonedTime } from "date-fns-tz";

const password = process.env.DEMO_STUDENT_PASSWORD;

test("Student books a room and cancels it inside the allowed window", async ({ page }) => {
  test.skip(!password, "Set DEMO_STUDENT_PASSWORD in .env.local and seed the demo account.");
  await page.goto("/login");
  await page.getByLabel("University email").fill("student@ttdev.demo");
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Continue to Common Room" }).click();
  await expect(page).toHaveURL(/\/rooms$/);

  if (await page.getByRole("heading", { name: "Your current booking" }).count()) {
    test.skip(true, "Cancel or finish the Student’s existing booking before running the browser flow.");
  }

  await page.getByRole("link", { name: "View room schedule" }).first().click();
  await expect(page.getByRole("heading", { name: "Booking details" })).toBeVisible();

  const dateField = page.locator('input[name="date"]');
  let selectedDate = await dateField.inputValue();
  let available = page.locator('button[aria-label$=", available"]:not(:disabled)');
  const pickSafeStart = async () => {
    const buttons = await available.all();
    const now = Date.now();
    for (const button of buttons) {
      const label = await button.getAttribute("aria-label");
      const time = label?.split(",")[0];
      if (!time) continue;
      const start = fromZonedTime(selectedDate + "T" + time + ":00", "Asia/Bangkok").getTime();
      if (start - now >= 60 * 60_000 && start <= now + 24 * 60 * 60_000) return button;
    }
    return null;
  };
  let slot = await pickSafeStart();
  if (!slot) {
    const base = new Date(selectedDate + "T12:00:00.000Z");
    base.setUTCDate(base.getUTCDate() + 1);
    selectedDate = base.toISOString().slice(0, 10);
    await dateField.fill(selectedDate);
    await page.getByRole("button", { name: "Go" }).click();
    available = page.locator('button[aria-label$=", available"]:not(:disabled)');
    slot = await pickSafeStart();
  }
  expect(slot, "there should be a future slot at least an hour away").not.toBeNull();
  await slot!.click();
  await page.getByLabel("Meeting name").fill("Student browser verification");
  await page.getByLabel("Number of people").fill("2");
  await page.getByRole("button", { name: "Review booking" }).click();
  await expect(page.getByRole("heading", { name: "Confirm your booking" })).toBeVisible();

  const failServerAction = async (route: Route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await route.abort("failed");
      return;
    }
    await route.continue();
  };
  await page.route("**/*", failServerAction);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  const confirmation = page.getByRole("dialog");
  await expect(confirmation.getByRole("alert")).toContainText(/connection/i);
  await expect(confirmation.getByRole("button", { name: "Confirm booking" })).toBeEnabled();
  await page.unroute("**/*", failServerAction);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: "You’re all set." })).toBeVisible();

  await page.getByRole("link", { name: "View your booking" }).click();
  await expect(page.getByRole("heading", { name: "Your current booking" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await page.getByRole("button", { name: "Yes, cancel booking" }).click();
  await expect(page.getByRole("heading", { name: "Your current booking" })).toHaveCount(0);
});
