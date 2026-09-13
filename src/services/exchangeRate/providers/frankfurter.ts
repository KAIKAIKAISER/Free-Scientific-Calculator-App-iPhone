import { ExchangeRateProvider, NormalizedRates } from "../types"

const API_URL = "https://api.frankfurter.dev/v2/rates"
const REQUEST_TIMEOUT_MS = 10_000

type FrankfurterRow = {
    date?: string
    base?: string
    quote?: string
    rate?: number
}

export const frankfurterProvider: ExchangeRateProvider = {
    name: "Frankfurter",
    async getLatest(base, quotes) {
        const params = new URLSearchParams({ base: base.toUpperCase() })
        if (quotes?.length) params.set("quotes", quotes.map((quote) => quote.toUpperCase()).join(","))

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
        try {
            const response = await fetch(`${API_URL}?${params.toString()}`, { signal: controller.signal })
            if (!response.ok) throw new Error(`Frankfurter returned HTTP ${response.status}`)
            const rows = await response.json() as FrankfurterRow[]
            if (!Array.isArray(rows)) throw new Error("Unexpected exchange-rate response")

            const rates: Record<string, number> = { [base.toUpperCase()]: 1 }
            let date = ""
            for (const row of rows) {
                if (row.quote && typeof row.rate === "number" && Number.isFinite(row.rate)) rates[row.quote.toUpperCase()] = row.rate
                if (row.date) date = row.date
            }
            if (Object.keys(rates).length < 2 && !quotes?.length) throw new Error("No exchange rates returned")

            return { base: base.toUpperCase(), rates, date, updatedAt: Date.now(), provider: "Frankfurter" }
        } finally {
            clearTimeout(timeout)
        }
    },
}
