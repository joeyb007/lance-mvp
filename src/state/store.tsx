// Store: context + useReducer. The reducer and selectors live in domain/ (pure, tested).
// FROZEN after Phase 0. Feature code reads state via useStore() and calls selectors from domain/selectors.
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'
import { reducer } from '../domain/reducer'
import { seedState } from '../domain/seed'
import type { Action, State } from '../domain/types'

interface Store {
  state: State
  dispatch: Dispatch<Action>
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children, initial }: { children: ReactNode; initial?: State }) {
  const [state, dispatch] = useReducer(reducer, initial ?? seedState())
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside <StoreProvider>')
  return store
}
