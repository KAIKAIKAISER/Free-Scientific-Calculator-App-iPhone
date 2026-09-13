export type NormalizedRates = {
    base: string
    rates: Record<string, number>
    date: string
    updatedAt: number
    provider: string
}

export type ExchangeRateProvider = {
    name: string
    getLatest: (base: string, quotes?: string[]) => Promise<NormalizedRates>
}
