import AsyncStorage from "@react-native-async-storage/async-storage"
import { frankfurterProvider } from "./providers/frankfurter"
import { ExchangeRateProvider, NormalizedRates } from "./types"

export type RatesResult = NormalizedRates & { fromCache: boolean; stale: boolean }

const CACHE_KEY = "exchangeRates.v1"
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000
const defaultProviders: ExchangeRateProvider[] = [frankfurterProvider]

function isValidCache(value: unknown): value is NormalizedRates {
    if (!value || typeof value !== "object") return false
    const candidate = value as NormalizedRates
    return typeof candidate.base === "string"
        && typeof candidate.updatedAt === "number"
        && Number.isFinite(candidate.updatedAt)
        && !!candidate.rates
        && typeof candidate.rates === "object"
        && Object.values(candidate.rates).every((rate) => typeof rate === "number" && Number.isFinite(rate))
}

export async function loadCachedRates(): Promise<NormalizedRates | null> {
    try {
        const raw = await AsyncStorage.getItem(CACHE_KEY)
        if (!raw) return null
        const parsed: unknown = JSON.parse(raw)
        return isValidCache(parsed) ? parsed : null
    } catch {
        return null
    }
}

async function saveCachedRates(rates: NormalizedRates) {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(rates))
}

export async function getExchangeRates(options: {
    base?: string
    quotes?: string[]
    forceRefresh?: boolean
    maxAgeMs?: number
    providers?: ExchangeRateProvider[]
} = {}): Promise<RatesResult> {
    const base = (options.base ?? "EUR").toUpperCase()
    const cached = await loadCachedRates()
    const requestedQuotes = options.quotes?.map((quote) => quote.toUpperCase())
    const hasRequestedQuotes = !requestedQuotes?.length || requestedQuotes.every((quote) => quote === base || typeof cached?.rates[quote] === "number")
    const isFresh = cached && cached.base === base && hasRequestedQuotes && Date.now() - cached.updatedAt < (options.maxAgeMs ?? DEFAULT_MAX_AGE_MS)
    if (cached && isFresh && !options.forceRefresh) return { ...cached, fromCache: true, stale: false }

    let lastError: unknown
    for (const provider of options.providers ?? defaultProviders) {
        try {
            const fresh = await provider.getLatest(base, options.quotes)
            await saveCachedRates(fresh)
            return { ...fresh, fromCache: false, stale: false }
        } catch (error) {
            lastError = error
        }
    }

    if (cached && cached.base === base) return { ...cached, fromCache: true, stale: true }
    throw lastError instanceof Error ? lastError : new Error("Exchange rates unavailable")
}

export async function refreshExchangeRates(base = "EUR", quotes?: string[]) {
    return getExchangeRates({ base, quotes, forceRefresh: true })
}

export const exchangeRateStorageKey = CACHE_KEY
