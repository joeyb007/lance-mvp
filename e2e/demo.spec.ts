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

/** The 207 "Give to" button must sit fully inside the visible screen: below the header, above the tab bar. */
async function expectAboveTheFold(page: Page, testId: string) {
  const btn = await page.getByTestId(testId).boundingBox()
  const main = await page.getByTestId('screen').boundingBox()
  const tabBar = await page.locator('nav').boundingBox()
  expect(btn && main && tabBar).toBeTruthy()
  expect(btn!.y).toBeGreaterThanOrEqual(main!.y)
  expect(btn!.y + btn!.height).toBeLessThanOrEqual(tabBar!.y)
}

/**
 * Colour rule (TDD §9): red only for "can't be done". Every element under the supervisor screen whose text, background,
 * border, outline or SVG paint resolves to danger (#DC2626) or danger-soft (#FEE2E2), at any alpha, must be marked
 * data-danger ("cant" dot or Rosa's "over-shift" bar segment). Returns the offenders plus what was allowed.
 */
async function dangerUse(page: Page) {
  return page.getByTestId('supervisor').evaluate((root) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    const isRed = (c: string) => {
      if (!c || c === 'transparent' || c === 'none') return false
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = '#000'
      ctx.fillStyle = c
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
      const near = (x: number, y: number, z: number) => Math.abs(r - x) <= 8 && Math.abs(g - y) <= 8 && Math.abs(b - z) <= 8
      return a > 0 && (near(220, 38, 38) || near(254, 226, 226))
    }
    const offenders: string[] = []
    const allowed: string[] = []
    for (const el of [root, ...root.querySelectorAll('*')] as Element[]) {
      const cs = getComputedStyle(el)
      const hasText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())
      const paints = [
        hasText || el instanceof SVGElement ? cs.color : '',
        cs.backgroundColor,
        ...(['Top', 'Right', 'Bottom', 'Left'] as const).map((side) =>
          parseFloat(cs.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 ? cs.getPropertyValue(`border-${side.toLowerCase()}-color`) : '',
        ),
        cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 ? cs.outlineColor : '',
        el instanceof SVGElement ? cs.fill : '',
        el instanceof SVGElement ? cs.stroke : '',
      ]
      if (!paints.some(isRed)) continue
      const tag = el.closest('[data-danger]')?.getAttribute('data-danger')
      const desc = `${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').split(' ').slice(0, 4).join('.')} "${(el.textContent ?? '').trim().slice(0, 40)}"`
      if (tag === 'cant' || tag === 'over-shift') allowed.push(tag)
      else offenders.push(desc)
    }
    return { offenders, allowed }
  })
}

test('TDD §3 demo end to end', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Who are you?')).toBeVisible()
  await shot(page, '00a-who-are-you')

  // Step 0: at load, Jordan already sees what's wrong: one summary line, collapsed.
  await page.getByText('Jordan Blake').click()
  await expect(page.getByTestId('needing-attention')).toHaveText('3')
  const summary = page.getByTestId('attention-summary')
  const toggle = page.getByTestId('attention-toggle')
  await expect(summary).toContainText('3 need attention')
  await expect(page.getByTestId('attention-segments')).toHaveText(/^1 can't be done\s*·\s*1 late\s*·\s*1 to assign$/)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByTestId('attention-list')).toHaveCount(0)
  // To assign holds only rooms someone can take: 207 first, its Give-to above the fold. 106 sits under Can't be placed.
  const queueIds = () => page.locator('[data-testid^="queue-"][id]').evaluateAll((els) => els.map((e) => e.id))
  expect(await queueIds()).toEqual(['queue-207'])
  await expect(page.getByTestId('give-207')).toHaveText('Give to Priya')
  await expectAboveTheFold(page, 'give-207')
  await expect(page.getByTestId('cant-106')).toHaveText("106 · can't be ready for the 11:00 arrival · let the front desk know")
  // Team at load (seed, TDD §8): Maya 5 rooms, 12:40; 305 still hers.
  await expect(page.getByTestId('team-maya')).toContainText('5 rooms left')
  await expect(page.getByTestId('team-maya')).toContainText('Done by 12:40')
  await expect(page.getByTestId('team-rosa')).toContainText('Finishes 1:05 · 5 min over')
  let red = await dangerUse(page)
  expect(red.offenders).toEqual([])
  expect(new Set(red.allowed)).toEqual(new Set(['cant', 'over-shift']))
  await shot(page, '00b-jordan-at-load', { tall: true })

  // Tap the line: one list in priority order. Can't be done → running late → to assign.
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const rowIds = () => page.locator('[data-testid="attention-list"] [data-testid^="attention-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))
  expect(await rowIds()).toEqual(['attention-cant-106', 'attention-late-rosa', 'attention-assign-207'])
  await expect(page.getByTestId('attention-cant-106')).toContainText("106 can't be ready for the 11:00 arrival")
  await expect(page.getByTestId('attention-late-rosa')).toContainText('Rosa on track to finish 1:05')
  await expect(page.getByTestId('attention-late-rosa')).toContainText('107 at risk')
  for (const id of await rowIds()) expect((await page.getByTestId(id!).boundingBox())!.height).toBeGreaterThanOrEqual(48)
  expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(48)
  red = await dangerUse(page)
  expect(red.offenders).toEqual([])
  await shot(page, '00c-jordan-summary-expanded')
  // Each row takes you to its item.
  await page.getByTestId('attention-late-rosa').click()
  await expect(page.getByTestId('team-rosa')).toBeInViewport()
  await page.getByTestId('screen').evaluate((el) => el.scrollTo(0, 0))
  await page.getByTestId('attention-cant-106').click()
  await expect(page.getByTestId('cant-106')).toBeInViewport()
  // The shell keeps <main>'s scroll position across a person switch; start Maya at the top.
  await page.getByTestId('screen').evaluate((el) => el.scrollTo(0, 0))

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

  // Step 3: Jordan. Still 3 (106, 207, 107): 1 can't be done, 2 to assign; Rosa's late item is gone.
  await become(page, 'Jordan Blake')
  await expect(page.getByTestId('needing-attention')).toHaveText('3')
  await expect(page.getByTestId('attention-segments')).toHaveText(/^1 can't be done\s*·\s*2 to assign$/)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(await queueIds()).toEqual(['queue-207', 'queue-107'])
  await expect(page.getByTestId('queue-107')).toContainText('Rosa flagged · DND until 11:30')
  await expect(page.getByTestId('queue-107')).toContainText('Priya')
  await expect(page.getByTestId('cant-106')).toBeVisible()
  await expectAboveTheFold(page, 'give-207')
  red = await dangerUse(page)
  expect(red.offenders).toEqual([])
  expect(red.allowed).not.toContain('over-shift') // Rosa is back inside her shift
  await shot(page, '03a-jordan-after-flags', { tall: true })
  await toggle.click()
  expect(await rowIds()).toEqual(['attention-cant-106', 'attention-assign-207', 'attention-assign-107', expect.stringMatching(/^attention-info-/)])
  await expect(page.getByTestId('attention-list')).toContainText('For your info')
  await expect(page.getByTestId('attention-list')).toContainText('Maya moved 305 to 12:00')
  await page.getByTestId('attention-assign-107').click()
  await expect(page.getByTestId('queue-107')).toBeInViewport()
  await page.getByTestId('choose-107').click()
  await expect(page.getByTestId('option-maya')).toBeDisabled()
  await shot(page, '03b-who-takes-107')
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click()
  await toggle.click() // collapse again: the calm default
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')

  // Step 4: Assign all → 207, 107 → Priya; needing attention 3 → 1; only 106 is left, under Can't be placed.
  await page.getByTestId('assign-all').click()
  await expect(toast(page)).toContainText('2 rooms assigned')
  await expect(toast(page)).toContainText('207, 107 → Priya')
  await expect(page.getByTestId('needing-attention')).toHaveText('1')
  await expect(page.getByTestId('attention-segments')).toHaveText(/^1 can't be done$/)
  await expect(page.getByTestId('assign-all')).toHaveCount(0)
  await expect(page.getByTestId('queue-empty')).toBeVisible()
  await expect(page.getByTestId('cant-106')).toBeVisible()
  red = await dangerUse(page)
  expect(red.offenders).toEqual([])
  await page.getByTestId('screen').evaluate((el) => el.scrollTo(0, 0))
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
