import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Localization from "expo-localization"
import React, { createContext, useContext, useEffect, useMemo, useState } from "react"

import en from "./en.json"
import zhCN from "./zh-CN.json"
import zhTW from "./zh-TW.json"

export type AppLocale = "en" | "zh-CN" | "zh-TW"
export type LocalePreference = AppLocale | "system"
type Dictionary = typeof en

const LANGUAGE_KEY = "settings.language"
const dictionaries: Record<AppLocale, Dictionary> = { en, "zh-CN": zhCN, "zh-TW": zhTW }

function systemLocale(): AppLocale {
    const tag = Localization.getLocales()[0]?.languageTag?.toLowerCase() ?? "en"
    if (tag.startsWith("zh-tw") || tag.startsWith("zh-hk") || tag.startsWith("zh-mo")) return "zh-TW"
    if (tag.startsWith("zh")) return "zh-CN"
    return "en"
}

function getValue(dictionary: Dictionary, path: string): string | undefined {
    const value = path.split(".").reduce<unknown>((current, key) => {
        if (current && typeof current === "object") return (current as Record<string, unknown>)[key]
        return undefined
    }, dictionary)
    return typeof value === "string" ? value : undefined
}

export function resolveLocale(preference: LocalePreference): AppLocale {
    return preference === "system" ? systemLocale() : preference
}

export function translate(locale: AppLocale, key: string, variables?: Record<string, string | number>): string {
    const value = getValue(dictionaries[locale], key) ?? getValue(dictionaries.en, key) ?? key
    return variables
        ? Object.entries(variables).reduce((result, [name, replacement]) => result.replaceAll(`{{${name}}}`, String(replacement)), value)
        : value
}

type I18nContextValue = {
    locale: AppLocale
    preference: LocalePreference
    setPreference: (preference: LocalePreference) => void
    t: (key: string, variables?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>({
    locale: "en",
    preference: "system",
    setPreference: () => undefined,
    t: (key) => key,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [preference, setPreferenceState] = useState<LocalePreference>("system")
    const [ready, setReady] = useState(false)

    useEffect(() => {
        AsyncStorage.getItem(LANGUAGE_KEY).then((value) => {
            if (value === "en" || value === "zh-CN" || value === "zh-TW" || value === "system") setPreferenceState(value)
            setReady(true)
        }).catch(() => setReady(true))
    }, [])

    const setPreference = (next: LocalePreference) => {
        setPreferenceState(next)
        void AsyncStorage.setItem(LANGUAGE_KEY, next)
    }

    const locale = resolveLocale(preference)
    const value = useMemo(() => ({ locale, preference, setPreference, t: (key: string, variables?: Record<string, string | number>) => translate(locale, key, variables) }), [locale, preference])

    if (!ready) return null
    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
    return useContext(I18nContext)
}

const toolKeyByName: Record<string, string> = {
    Currency: "tools.currency", Length: "tools.length", Area: "tools.area", Mass: "tools.mass", Volume: "tools.volume", Speed: "tools.speed", Pressure: "tools.pressure", Power: "tools.power", Temp: "tools.temperature", Temperature: "tools.temperature", Angle: "tools.angle", Energy: "tools.energy", Force: "tools.force", Fuel: "tools.fuel", Time: "tools.time", Data: "tools.data", Age: "tools.age", BMI: "tools.bmi", Date: "tools.date", Discount: "tools.discount", Loan: "tools.loan"
}

export function toolLabelKey(key: string, fallbackLabel?: string) {
    return `tools.${key}` in dictionaries.en.tools ? `tools.${key}` : toolKeyByName[fallbackLabel ?? ""] ?? fallbackLabel ?? key
}

const unitKeyByName: Record<string, string> = {
    Millimeter: "units.millimeter", Centimeter: "units.centimeter", Meter: "units.meter", Kilometer: "units.kilometer", Inch: "units.inch", Foot: "units.foot", Yard: "units.yard", Mile: "units.mile", "Square Meter": "units.squareMeter", "Square Foot": "units.squareFoot", "Square Kilometer": "units.squareKilometer", "Square Mile": "units.squareMile", Acre: "units.acre", Hectare: "units.hectare", Milligram: "units.milligram", Gram: "units.gram", Kilogram: "units.kilogram", Ounce: "units.ounce", Pound: "units.pound", Liter: "units.liter", Milliliter: "units.milliliter", Gallon: "units.gallon", Quart: "units.quart", Pint: "units.pint", Cup: "units.cup", "Fluid Ounce": "units.fluidOunce", "Meter per Second": "units.meterPerSecond", "Kilometer per Hour": "units.kilometerPerHour", "Mile per Hour": "units.milePerHour", Knot: "units.knot", Pascal: "units.pascal", Kilopascal: "units.kilopascal", Bar: "units.bar", Atmosphere: "units.atmosphere", "Pound per Sq Inch": "units.poundPerSquareInch", "Inch of Mercury": "units.inchOfMercury", Torr: "units.torr", Watt: "units.watt", Kilowatt: "units.kilowatt", Horsepower: "units.horsepower", Radian: "units.radian", Degree: "units.degree", Joule: "units.joule", Kilojoule: "units.kilojoule", Calorie: "units.calorie", Kilocalorie: "units.kilocalorie", Byte: "units.byte", Kilobyte: "units.kilobyte", Megabyte: "units.megabyte", Gigabyte: "units.gigabyte", Terabyte: "units.terabyte", Petabyte: "units.petabyte", Celsius: "units.celsius", Fahrenheit: "units.fahrenheit", Kelvin: "units.kelvin"
}

export function unitNameKey(name: string) {
    return unitKeyByName[name] ?? name
}
