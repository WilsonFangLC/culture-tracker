# Test info

- Name: Cell State Creation >> should allow a user to create a new cell state (start_new_culture)
- Location: /Users/fanglichi/Desktop/Culture Tracker/ui/tests/e2e/cell_state_creation.spec.ts:4:3

# Error details

```
Error: Timed out 30000ms waiting for expect(locator).toBeVisible()

Locator: getByLabel('Operation Type')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 30000ms
  - waiting for getByLabel('Operation Type')

    at /Users/fanglichi/Desktop/Culture Tracker/ui/tests/e2e/cell_state_creation.spec.ts:15:53
```

# Page snapshot

```yaml
- banner:
  - heading "Cell Culture Tracker" [level=1]
  - navigation:
    - link "Cell States":
      - /url: /states
    - link "Raw List View":
      - /url: /raw-list
- heading "Cell Culture States" [level=1]
- group: How to Use This Tool
- heading "States" [level=2]
- button "Export CSV"
- button "New State"
- heading "Create New State" [level=3]
- text: State Name
- textbox "Enter a descriptive name for this state"
- text: Operation Type
- combobox:
  - option "Start New Culture"
  - option "Passage" [selected]
  - option "Freeze"
  - option "Thaw from Existing Vial"
  - option "Harvest (throw away)"
  - option "Measurement (beta)"
  - option "Split Culture (creates multiple states)"
- text: Parent State
- combobox:
  - option "New Cell Line" [selected]
  - option "State 144 (List Test State 2)"
  - option "State 156 (List Test State 2)"
  - option "State 145 (Detail Test State)"
  - option "State 146 (Update Test Initial)"
  - option "State 147 (Delete Test State)"
  - option "State 148 (Test State 1)"
  - option "State 149 (List Test State 1)"
  - option "State 150 (List Test State 2)"
  - option "State 157 (Detail Test State)"
  - option "State 158 (Update Test Initial)"
  - option "State 151 (Detail Test State)"
- text: Time
- textbox: 2025-05-16T14:21
- heading "New State Details" [level=4]
- heading "Passage Details" [level=4]
- paragraph: Parent state selection is required for passage operations.
- text: Parent End Cell Density (million cells/ml)
- spinbutton [disabled]
- paragraph: Cell density at the time of freezing
- paragraph:
  - img "Important": ⚠️
  - text: "Important: This value is required to calculate doubling time. The doubling time will be automatically calculated when you create this state."
- text: New Passage Initial Cell Density (million cells/ml)
- spinbutton: "0.1"
- button "↓ Show Optional Parameters" [disabled]
- text: Additional Notes
- textbox "Additional Notes"
- button "Cancel"
- button "Create State"
- heading "State Lineage & Details" [level=2]
- text: Culture Tracker built by Lichi Fang
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test.describe('Cell State Creation', () => {
   4 |   test('should allow a user to create a new cell state (start_new_culture)', async ({ page }) => {
   5 |     test.setTimeout(70000); // Explicitly set test timeout to 70 seconds
   6 |     await page.goto('/');
   7 |
   8 |     // Wait for the API call to fetch states to complete
   9 |     await page.waitForResponse(response => response.url().includes('/api/states/') && response.status() === 200);
  10 |
  11 |     // Click the "New State" button to show the form
  12 |     await page.getByRole('button', { name: 'New State' }).click({ timeout: 60000 });
  13 |
  14 |     // Wait for the "Operation Type" label to be visible, indicating the form has loaded
> 15 |     await expect(page.getByLabel('Operation Type')).toBeVisible({ timeout: 30000 });
     |                                                     ^ Error: Timed out 30000ms waiting for expect(locator).toBeVisible()
  16 |
  17 |     // 1. Select Operation Type: "Start New Culture"
  18 |     await page.getByLabel('Operation Type').selectOption('start_new_culture');
  19 |
  20 |     // 2. Fill out the form
  21 |     const stateName = `Test Culture E2E ${Date.now()}`;
  22 |     await page.getByLabel('State Name').fill(stateName);
  23 |
  24 |     const now = new Date();
  25 |     const year = now.getFullYear();
  26 |     const month = (now.getMonth() + 1).toString().padStart(2, '0');
  27 |     const day = now.getDate().toString().padStart(2, '0');
  28 |     const hours = now.getHours().toString().padStart(2, '0');
  29 |     const minutes = now.getMinutes().toString().padStart(2, '0');
  30 |     const testTimestamp = `${year}-${month}-${day}T${hours}:${minutes}`;
  31 |     await page.getByLabel('Date & Time').fill(testTimestamp);
  32 |
  33 |     await page.getByLabel('Cell Type').fill('TestCell-X1-E2E');
  34 |     await page.getByLabel('Initial Cell Density (million cells/ml)').fill('0.5'); // Corresponds to 5e5
  35 |
  36 |     await page.getByLabel('Additional Notes').fill('This is an E2E test for starting a new culture.');
  37 |
  38 |     // 3. Submit the form
  39 |     await page.getByRole('button', { name: 'Create State' }).click();
  40 |
  41 |     // 4. Verification
  42 |     // Check if the new state appears in the list (e.g., on the main States page)
  43 |     // This assumes the state name will be visible. We might need to navigate to a specific list view.
  44 |     await expect(page.getByText(stateName)).toBeVisible({ timeout: 10000 });
  45 |   });
  46 | }); 
```
