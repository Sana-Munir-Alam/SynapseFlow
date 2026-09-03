/*
  Low-bandwidth mode toggle for students on weak connections.
  - Persists the choice in localStorage under "lowBandwidthMode".
  - This context only stores the flag — it doesn't touch feature code
    directly. Each component that cares reads `lowBandwidth` and decides
    for itself what to skip or gate behind a confirmation.
 */

import { createContext, useContext, useState, type ReactNode, } from 'react'

interface BandwidthContextValue {
    lowBandwidth: boolean
    setLowBandwidth: (v: boolean) => void
}

const BandwidthContext = createContext<BandwidthContextValue | null>(null)

export function BandwidthProvider({ children }: { children: ReactNode }) {
    const [lowBandwidth, setLowBandwidthState] = useState<boolean>(() => {
        return localStorage.getItem('lowBandwidthMode') === 'true'
    })

    const setLowBandwidth = (v: boolean) => {
        setLowBandwidthState(v)
        localStorage.setItem('lowBandwidthMode', String(v))
    }

    return (
        <BandwidthContext.Provider value={{ lowBandwidth, setLowBandwidth }}>
            {children}
        </BandwidthContext.Provider>
    )
}

export function useBandwidth(): BandwidthContextValue {
    const ctx = useContext(BandwidthContext)
    if (!ctx) throw new Error('useBandwidth must be used inside <BandwidthProvider>')
    return ctx
}