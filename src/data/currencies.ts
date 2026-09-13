export type Currency = {
    code: string
    symbol: string
    region: string
    flag: string
    decimals: number
    name: {
        en: string
        "zh-CN": string
        "zh-TW": string
    }
    regionName: {
        en: string
        "zh-CN": string
        "zh-TW": string
    }
}

// Keep this metadata local so currency selection and cached/offline conversion do not depend on a network call.
export const currencies: Record<string, Currency> = {
    CNY: { code: "CNY", symbol: "¥", region: "CN", flag: "🇨🇳", decimals: 2, name: { en: "Chinese Yuan", "zh-CN": "人民币", "zh-TW": "人民幣" }, regionName: { en: "China", "zh-CN": "中国", "zh-TW": "中國" } },
    USD: { code: "USD", symbol: "$", region: "US", flag: "🇺🇸", decimals: 2, name: { en: "US Dollar", "zh-CN": "美元", "zh-TW": "美元" }, regionName: { en: "United States", "zh-CN": "美国", "zh-TW": "美國" } },
    EUR: { code: "EUR", symbol: "€", region: "EU", flag: "🇪🇺", decimals: 2, name: { en: "Euro", "zh-CN": "欧元", "zh-TW": "歐元" }, regionName: { en: "European Union", "zh-CN": "欧盟", "zh-TW": "歐盟" } },
    JPY: { code: "JPY", symbol: "¥", region: "JP", flag: "🇯🇵", decimals: 0, name: { en: "Japanese Yen", "zh-CN": "日元", "zh-TW": "日圓" }, regionName: { en: "Japan", "zh-CN": "日本", "zh-TW": "日本" } },
    GBP: { code: "GBP", symbol: "£", region: "GB", flag: "🇬🇧", decimals: 2, name: { en: "Pound Sterling", "zh-CN": "英镑", "zh-TW": "英鎊" }, regionName: { en: "United Kingdom", "zh-CN": "英国", "zh-TW": "英國" } },
    HKD: { code: "HKD", symbol: "HK$", region: "HK", flag: "🇭🇰", decimals: 2, name: { en: "Hong Kong Dollar", "zh-CN": "港币", "zh-TW": "港幣" }, regionName: { en: "Hong Kong", "zh-CN": "香港", "zh-TW": "香港" } },
    MOP: { code: "MOP", symbol: "MOP$", region: "MO", flag: "🇲🇴", decimals: 2, name: { en: "Macanese Pataca", "zh-CN": "澳门元", "zh-TW": "澳門元" }, regionName: { en: "Macau", "zh-CN": "澳门", "zh-TW": "澳門" } },
    TWD: { code: "TWD", symbol: "NT$", region: "TW", flag: "🇹🇼", decimals: 0, name: { en: "New Taiwan Dollar", "zh-CN": "新台币", "zh-TW": "新臺幣" }, regionName: { en: "Taiwan", "zh-CN": "台湾", "zh-TW": "臺灣" } },
    KRW: { code: "KRW", symbol: "₩", region: "KR", flag: "🇰🇷", decimals: 0, name: { en: "South Korean Won", "zh-CN": "韩元", "zh-TW": "韓圓" }, regionName: { en: "South Korea", "zh-CN": "韩国", "zh-TW": "南韓" } },
    SGD: { code: "SGD", symbol: "S$", region: "SG", flag: "🇸🇬", decimals: 2, name: { en: "Singapore Dollar", "zh-CN": "新加坡元", "zh-TW": "新加坡元" }, regionName: { en: "Singapore", "zh-CN": "新加坡", "zh-TW": "新加坡" } },
    AUD: { code: "AUD", symbol: "A$", region: "AU", flag: "🇦🇺", decimals: 2, name: { en: "Australian Dollar", "zh-CN": "澳大利亚元", "zh-TW": "澳洲元" }, regionName: { en: "Australia", "zh-CN": "澳大利亚", "zh-TW": "澳洲" } },
    CAD: { code: "CAD", symbol: "CA$", region: "CA", flag: "🇨🇦", decimals: 2, name: { en: "Canadian Dollar", "zh-CN": "加拿大元", "zh-TW": "加拿大元" }, regionName: { en: "Canada", "zh-CN": "加拿大", "zh-TW": "加拿大" } },
    CHF: { code: "CHF", symbol: "CHF", region: "CH", flag: "🇨🇭", decimals: 2, name: { en: "Swiss Franc", "zh-CN": "瑞士法郎", "zh-TW": "瑞士法郎" }, regionName: { en: "Switzerland", "zh-CN": "瑞士", "zh-TW": "瑞士" } },
    NZD: { code: "NZD", symbol: "NZ$", region: "NZ", flag: "🇳🇿", decimals: 2, name: { en: "New Zealand Dollar", "zh-CN": "新西兰元", "zh-TW": "紐西蘭元" }, regionName: { en: "New Zealand", "zh-CN": "新西兰", "zh-TW": "紐西蘭" } },
    THB: { code: "THB", symbol: "฿", region: "TH", flag: "🇹🇭", decimals: 2, name: { en: "Thai Baht", "zh-CN": "泰铢", "zh-TW": "泰銖" }, regionName: { en: "Thailand", "zh-CN": "泰国", "zh-TW": "泰國" } },
    MYR: { code: "MYR", symbol: "RM", region: "MY", flag: "🇲🇾", decimals: 2, name: { en: "Malaysian Ringgit", "zh-CN": "马来西亚林吉特", "zh-TW": "馬來西亞令吉" }, regionName: { en: "Malaysia", "zh-CN": "马来西亚", "zh-TW": "馬來西亞" } },
    PHP: { code: "PHP", symbol: "₱", region: "PH", flag: "🇵🇭", decimals: 2, name: { en: "Philippine Peso", "zh-CN": "菲律宾比索", "zh-TW": "菲律賓披索" }, regionName: { en: "Philippines", "zh-CN": "菲律宾", "zh-TW": "菲律賓" } },
    IDR: { code: "IDR", symbol: "Rp", region: "ID", flag: "🇮🇩", decimals: 0, name: { en: "Indonesian Rupiah", "zh-CN": "印度尼西亚盾", "zh-TW": "印尼盾" }, regionName: { en: "Indonesia", "zh-CN": "印度尼西亚", "zh-TW": "印尼" } },
    INR: { code: "INR", symbol: "₹", region: "IN", flag: "🇮🇳", decimals: 2, name: { en: "Indian Rupee", "zh-CN": "印度卢比", "zh-TW": "印度盧比" }, regionName: { en: "India", "zh-CN": "印度", "zh-TW": "印度" } },
    VND: { code: "VND", symbol: "₫", region: "VN", flag: "🇻🇳", decimals: 0, name: { en: "Vietnamese Dong", "zh-CN": "越南盾", "zh-TW": "越南盾" }, regionName: { en: "Vietnam", "zh-CN": "越南", "zh-TW": "越南" } },
}

export const popularCurrencyCodes = ["CNY", "USD", "EUR", "JPY", "GBP", "HKD", "MOP", "TWD", "KRW", "SGD", "AUD", "CAD", "CHF", "NZD", "THB", "MYR", "PHP", "IDR", "INR", "VND"] as const

export function getCurrency(code: string) {
    const normalizedCode = code.toUpperCase()
    return currencies[normalizedCode] ?? {
        code: normalizedCode,
        symbol: normalizedCode,
        region: "WORLD",
        flag: "🌐",
        decimals: 2,
        name: { en: normalizedCode, "zh-CN": normalizedCode, "zh-TW": normalizedCode },
        regionName: { en: "Custom currency", "zh-CN": "自定义货币", "zh-TW": "自訂貨幣" },
    }
}
