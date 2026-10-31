import { useCallback, useState } from 'react'
import { PEOPLE } from '../../domain/seed'
import type { HousekeeperId, PersonId } from '../../domain/types'
import { useStore } from '../../state/store'
import { BottomSheet, Header, TabBar, Toast, type Tab } from '../../ui'
import { HousekeeperHome } from '../housekeeper/HousekeeperHome'
import { SupervisorHome } from '../supervisor/SupervisorHome'
import { DemoBar } from './DemoBar'
import { MoreScreen } from './MoreScreen'
import { NamePicker } from './NamePicker'
import { PhoneFrame } from './PhoneFrame'

type TabId = 'messages' | 'work' | 'more'

export function Shell() {
  const { state, dispatch } = useStore()
  const [signedIn, setSignedIn] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tab, setTab] = useState<TabId>('work')
  const closePicker = useCallback(() => setPickerOpen(false), [])

  const person = PEOPLE[state.role]
  const isSupervisor = person.role === 'supervisor'

  const pick = (id: PersonId) => {
    dispatch({ type: 'setRole', personId: id })
    setSignedIn(true)
    setPickerOpen(false)
    setTab('work')
  }

  const tabs: Tab[] = [
    { id: 'messages', label: 'Messages', icon: 'chat', inert: true },
    { id: 'work', label: isSupervisor ? 'Housekeeping' : 'My work', icon: 'list' },
    { id: 'more', label: 'More', icon: 'more' },
  ]

  return (
    <PhoneFrame>
      <DemoBar />
      {!signedIn ? (
        <main className="flex-1 overflow-y-auto px-5 pt-10">
          <h1 className="mb-1 text-[26px] font-bold tracking-tight">Who are you?</h1>
          <p className="mb-6 text-[15px] text-muted">Pick your name to start your shift.</p>
          <NamePicker onPick={pick} />
        </main>
      ) : (
        <>
          <Header initials={person.initials} title={tab === 'more' ? 'More' : isSupervisor ? 'Housekeeping' : 'My work'} onAvatar={() => setPickerOpen(true)} />
          <main className="relative flex-1 overflow-y-auto" data-testid="screen">
            {tab === 'more' ? <MoreScreen /> : isSupervisor ? <SupervisorHome /> : <HousekeeperHome housekeeperId={state.role as HousekeeperId} />}
          </main>
          <TabBar tabs={tabs} active={tab} onChange={(id) => setTab(id as TabId)} />
        </>
      )}
      <Toast />
      <BottomSheet open={pickerOpen} onClose={closePicker} title="Who are you?">
        <NamePicker current={state.role} onPick={pick} />
      </BottomSheet>
    </PhoneFrame>
  )
}
