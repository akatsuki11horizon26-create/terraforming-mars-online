import { test, expect } from "@playwright/test";

test("Corporate Era is mandatory in solo and optional in standard multiplayer setup", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByTestId("mode-solo").click();
  const corporateEra = page.getByTestId("setup-corporate-era");
  await expect(corporateEra).toBeChecked();
  await expect(corporateEra).toBeDisabled();
  await expect(page.getByText("公式ソロでは企業の時代を使用し、初期生産の加算はありません。", { exact: true })).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("mode-hotseat").click();
  await expect(corporateEra).toBeEnabled();
  await corporateEra.uncheck();
  await expect(corporateEra).not.toBeChecked();
  await expect(page.getByText(/オフは専用カードを除き、生産量1に企業効果を加算します/)).toBeVisible();
});
