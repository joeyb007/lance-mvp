// TDD §3 demo, clicked through at phone size (390×844). One screenshot per step → e2e/screenshots/.
import { expect, test, type Page } from '@playwright/test'

const DIR = 'e2e/screenshots'

/** Viewport shot, plus a tall shot of the whole scrolling screen. */
async function shot(page: Page, name: string, { tall = false } = {}) {
  await page.waitForTimeout(250) // let sheet/toast animations settle
  await page.screenshot({ path: `${DIR}/${name}.png` })
  if (tall) {
    const h = await page.getByTestId('screen').evaluate((el) => el.scrollHeight)
    await page.setViewportSize({ width: 390, height: Math.max(844, h + 260) })
    await page.waitForTimeout(150)
    await page.screenshot({ path: `${DIR}/${name}-full.png` })
    await page.setViewportSize({ width: 390, height: 844 })
  }
}

async function become(page: Page, name: string) {
  await page.getByRole('button', { name: 'Switch person' }).click()
  await page.getByRole('dialog').getByText(name).click()
}

const toast = (page: Page) => page.getByRole('status')

test('TDD §3 demo end to end', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Who are you?')).toBeVisible()
  await shot(page, '00a-who-are-you')

  // Step 0: at load, Jordan already sees what's wrong.
  await page.getByText('Jordan Blake').click()
  await expect(page.getByTestId('needing-attention')).toHaveText('3')
  const urgent = page.getByTestId('inbox-urgent')
  await expect(urgent).toContainText("106 can't be ready for the 11:00 arrival")
  await expect(urgent).toContainText('Rosa on track to finish 1:05')
  await expect(page.getByTestId('queue-106')).toContainText('No one can finish this before 11:00')
  await expect(page.getByTestId('queue-207')).toContainText('Priya')
  await shot(page, '00b-jordan-at-load', { tall: true })

  // Step 1: Maya, 305 DND 12:00 → fits, stays with her at the end of her list.
  await become(page, 'Maya Chen')
  await shot(page, '01a-maya-list')
  await page.getByTestId('room-305').getByRole('button', { name: 'Problem' }).click()
  await expect(page.getByRole('dialog')).toContainText("305 · What's the problem?")
  await shot(page, '01b-maya-problem-sheet')
  await page.getByRole('dialog').getByRole('button', { name: '12:00', exact: true }).click()
  await expect(toast(page)).toContainText('305 moved to 12:00')
  await expect(toast(page)).toContainText('Still yours')
  const mayaIds = await page.locator('[data-testid^="room-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))
  expect(mayaIds).toEqual(['room-302', 'room-303', 'room-304', 'room-306', 'room-305'])
  await expect(page.getByTestId('room-305')).toContainText('Available at 12:00')
  await expect(page.getByText('done by 12:40')).toBeVisible()
  await shot(page, '01c-maya-305-moved', { tall: true })

  // Step 2: Rosa (red, 1:05), 107 DND 11:30 → doesn't fit → sent to Jordan; Rosa now 12:30.
  await become(page, 'Rosa Alvarez')
  await expect(page.getByText(/1:05/).first()).toBeVisible()
  await shot(page, '02a-rosa-red')
  await page.getByTestId('room-107').getByRole('button', { name: 'Problem' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '11:30', exact: true }).click()
  await expect(toast(page)).toContainText('107 sent to Jordan')
  await expect(page.getByTestId('room-107')).toHaveCount(0)
  await expect(page.getByText('done by 12:30')).toBeVisible()
  await shot(page, '02b-rosa-107-sent')

  // Step 3: Jordan. Still 3 (106, 207, 107); Urgent 1; Needs a decision 2; For your info 1.
  await become(page, 'Jordan Blake')
  await expect(page.getByTestId('needing-attention')).toHaveText('3')
  await expect(urgent).toContainText("106 can't be ready")
  await expect(urgent).not.toContainText('Rosa on track')
  await expect(page.getByTestId('inbox-decision')).toContainText('2 rooms to assign')
  await expect(page.getByTestId('inbox-info')).toContainText('Maya moved 305 to 12:00')
  const queueIds = await page.locator('[data-testid^="queue-"][id]').evaluateAll((els) => els.map((e) => e.id))
  expect(queueIds).toEqual(['queue-106', 'queue-207', 'queue-107'])
  await expect(page.getByTestId('queue-107')).toContainText('Rosa flagged · DND until 11:30')
  await expect(page.getByTestId('queue-107')).toContainText('Priya')
  await shot(page, '03a-jordan-after-flags', { tall: true })
  await page.getByTestId('choose-107').click()
  await expect(page.getByTestId('option-maya')).toBeDisabled()
  await shot(page, '03b-who-takes-107')
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click()

  // Step 4: Assign all → 207, 107 → Priya; needing attention 3 → 1.
  await page.getByTestId('assign-all').click()
  await expect(toast(page)).toContainText('2 rooms assigned')
  await expect(toast(page)).toContainText('207, 107 → Priya')
  await expect(page.getByTestId('needing-attention')).toHaveText('1')
  await shot(page, '04-assign-all')

  // Step 5: Team: Maya 12:40, Priya 12:48, Rosa 12:30.
  await expect(page.getByTestId('team-maya')).toContainText('12:40')
  await expect(page.getByTestId('team-priya')).toContainText('12:48')
  await expect(page.getByTestId('team-rosa')).toContainText('12:30')
  await page.getByTestId('team').scrollIntoViewIfNeeded()
  await shot(page, '05-team', { tall: true })

  // Step 6: Priya's list ends 207, 107 "From Jordan · available 11:30"; skip ×2 → Ready now, 201–203 simulated.
  await become(page, 'Priya Patel')
  const priyaIds = await page.locator('[data-testid^="room-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))
  expect(priyaIds.slice(-2)).toEqual(['room-207', 'room-107'])
  await expect(page.getByTestId('room-107')).toContainText('From Jordan · available 11:30')
  await page.getByTestId('room-107').scrollIntoViewIfNeeded()
  await shot(page, '06a-priya-from-jordan', { tall: true })
  await page.getByRole('button', { name: 'Skip 30 min' }).click()
  await page.getByRole('button', { name: 'Skip 30 min' }).click()
  await expect(page.getByTestId('clock')).toHaveText('11:30')
  await expect(page.getByTestId('room-107')).toContainText(/ready now/i)
  await expect(page.getByTestId('room-206')).toContainText('In progress')
  await expect(page.getByText('done · simulated')).toHaveCount(3)
  await shot(page, '06b-priya-after-skip', { tall: true })
})
