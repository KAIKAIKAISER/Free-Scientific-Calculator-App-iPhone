import React, { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import AsyncStorage from "@react-native-async-storage/async-storage"
import CurrencyFlag from "../components/CurrencyFlag"
import LucideIcon from "../components/LucideIcon"
import { currencies, getCurrency } from "../data/currencies"
import { useI18n } from "../i18n"
import { getExchangeRates, refreshExchangeRates, RatesResult } from "../services/exchangeRate"
import { useTheme } from "../theme"
const CURRENCY_KEY = "currency.displayed"
const FAVORITES_KEY = "currency.favorites"
const DEFAULT_CURRENCIES = ["CNY", "EUR", "JPY", "USD", "GBP"]
const { height: screenHeight } = Dimensions.get("window")
const CURRENCY_HEADER_HEIGHT = Math.max(52, Math.min(100, screenHeight * 0.09))
const CURRENCY_ROW_HEIGHT = Math.max(48, Math.min(108, screenHeight * 0.075))
const CURRENCY_STATUS_HEIGHT = Math.max(28, Math.min(50, screenHeight * 0.045))
const CURRENCY_KEYPAD_HEIGHT = Math.max(220, Math.min(520, screenHeight * 0.42))
const CURRENCY_FLAG_SIZE = Math.max(32, Math.min(48, CURRENCY_ROW_HEIGHT * 0.82))
const CURRENCY_CODE_FONT_SIZE = Math.max(18, Math.min(27, screenHeight * 0.03))
const CURRENCY_AMOUNT_FONT_SIZE = Math.max(14, Math.min(17, screenHeight * 0.02))
const CURRENCY_NAME_FONT_SIZE = Math.max(12, Math.min(16, screenHeight * 0.018))
const CURRENCY_KEYPAD_FONT_SIZE = Math.max(20, Math.min(26, screenHeight * 0.031))
const currencyCodes = Object.keys(currencies)

type Props = { onBack?: () => void; onOpenTools?: () => void }

function localeTag(locale: "en" | "zh-CN" | "zh-TW") {
    return locale === "en" ? "en-US" : locale
}

function formatExchangeAmount(amount: number, locale: "en" | "zh-CN" | "zh-TW") {
    if (!Number.isFinite(amount)) return "0.0000"
    return amount.toLocaleString(localeTag(locale), {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
        useGrouping: true,
    })
}

function safeDisplayedCodes(value: string | null) {
    if (!value) return DEFAULT_CURRENCIES
    try {
        const parsed: unknown = JSON.parse(value)
        if (!Array.isArray(parsed)) return DEFAULT_CURRENCIES
        const codes = parsed
            .filter((code): code is string => typeof code === "string")
            .map((code) => code.trim().toUpperCase())
            .filter((code) => /^[A-Z]{3}$/.test(code))
        const uniqueCodes = Array.from(new Set(codes))
        return uniqueCodes.length
            ? [...uniqueCodes, ...DEFAULT_CURRENCIES.filter((code) => !uniqueCodes.includes(code))]
            : DEFAULT_CURRENCIES
    } catch {
        return DEFAULT_CURRENCIES
    }
}

export default function Currency({ onBack, onOpenTools }: Props = {}) {
    const { locale, t } = useI18n()
    const { colors } = useTheme()
    const [displayedCurrencies, setDisplayedCurrencies] = useState(DEFAULT_CURRENCIES)
    const [activeCurrencyIndex, setActiveCurrencyIndex] = useState(0)
    const [activeAmount, setActiveAmount] = useState("1")
    const [rates, setRates] = useState<RatesResult | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [rateFetchFailed, setRateFetchFailed] = useState(false)
    const [preferencesReady, setPreferencesReady] = useState(false)
    const [pickerVisible, setPickerVisible] = useState(false)
    const [pickerMode, setPickerMode] = useState<"replace" | "add">("replace")
    const [searchText, setSearchText] = useState("")
    const [favorites, setFavorites] = useState<string[]>([])

    const loadRates = useCallback(async (forceRefresh = false) => {
        setIsRefreshing(true)
        setRateFetchFailed(false)
        try {
            const quotes = displayedCurrencies.filter((code) => code !== "EUR")
            const result = forceRefresh
                ? await refreshExchangeRates("EUR", quotes)
                : await getExchangeRates({ base: "EUR", quotes })
            setRates(result)
            setRateFetchFailed(result.stale)
        } catch {
            setRateFetchFailed(true)
        } finally {
            setIsRefreshing(false)
        }
    }, [displayedCurrencies])

    useEffect(() => {
        void AsyncStorage.multiGet([CURRENCY_KEY, FAVORITES_KEY])
            .then(([displayed, savedFavorites]) => {
                setDisplayedCurrencies(safeDisplayedCodes(displayed[1]))
                if (savedFavorites[1]) {
                    try {
                        const parsed: unknown = JSON.parse(savedFavorites[1])
                        if (Array.isArray(parsed)) setFavorites(parsed.filter((code): code is string => typeof code === "string" && /^[A-Z]{3}$/.test(code.toUpperCase())).map((code) => code.toUpperCase()))
                    } catch { /* ignore malformed local preferences */ }
                }
            })
            .catch(() => undefined)
            .finally(() => setPreferencesReady(true))
    }, [])

    useEffect(() => {
        if (preferencesReady) void loadRates()
    }, [loadRates, preferencesReady])

    useEffect(() => {
        if (preferencesReady) void AsyncStorage.setItem(CURRENCY_KEY, JSON.stringify(displayedCurrencies))
    }, [displayedCurrencies, preferencesReady])

    const amounts = useMemo(() => {
        const activeCode = displayedCurrencies[activeCurrencyIndex]
        const parsedAmount = Number(activeAmount)
        if (!Number.isFinite(parsedAmount)) return displayedCurrencies.map(() => 0)
        if (!rates) return displayedCurrencies.map((_, index) => index === activeCurrencyIndex ? parsedAmount : 0)
        const activeRate = rates.rates[activeCode] ?? 1
        return displayedCurrencies.map((code, index) => {
            if (index === activeCurrencyIndex) return parsedAmount
            const quoteRate = rates.rates[code]
            return quoteRate ? (parsedAmount / activeRate) * quoteRate : 0
        })
    }, [activeAmount, activeCurrencyIndex, displayedCurrencies, rates])

    const openPicker = (mode: "replace" | "add") => {
        setPickerMode(mode)
        setSearchText("")
        setPickerVisible(true)
    }

    const selectCurrency = (code: string) => {
        if (pickerMode === "add") {
            if (!displayedCurrencies.includes(code)) setDisplayedCurrencies((current) => [...current, code])
        } else {
            setDisplayedCurrencies((current) => {
                const existingIndex = current.indexOf(code)
                if (existingIndex >= 0 && existingIndex !== activeCurrencyIndex) {
                    const next = [...current]
                    ;[next[activeCurrencyIndex], next[existingIndex]] = [next[existingIndex], next[activeCurrencyIndex]]
                    return next
                }
                return current.map((item, index) => index === activeCurrencyIndex ? code : item)
            })
        }
        setPickerVisible(false)
    }

    const removeCurrency = (index: number) => {
        if (displayedCurrencies.length <= 1) return
        setDisplayedCurrencies((current) => current.filter((_, itemIndex) => itemIndex !== index))
        setActiveCurrencyIndex((current) => {
            if (index < current) return current - 1
            if (index === current) return Math.min(current, displayedCurrencies.length - 2)
            return current
        })
    }

    const moveCurrency = (index: number, direction: -1 | 1) => {
        const nextIndex = index + direction
        if (nextIndex < 0 || nextIndex >= displayedCurrencies.length) return
        setDisplayedCurrencies((current) => {
            const next = [...current]
            ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
            return next
        })
        if (activeCurrencyIndex === index) setActiveCurrencyIndex(nextIndex)
        else if (activeCurrencyIndex === nextIndex) setActiveCurrencyIndex(index)
    }

    const toggleFavorite = (code: string) => {
        setFavorites((current) => {
            const next = current.includes(code) ? current.filter((item) => item !== code) : [...current, code]
            void AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
            return next
        })
    }

    const handleAmountChange = (value: string) => {
        let next = value.replaceAll(",", ".").replace(/[^0-9.-]/g, "")
        if (next.includes("-")) next = `${next.startsWith("-") ? "-" : ""}${next.replaceAll("-", "")}`
        if (next.split(".").length > 2) {
            const [integer, ...fraction] = next.split(".")
            next = `${integer}.${fraction.join("")}`
        }
        setActiveAmount(next.slice(0, 18))
    }

    const handleKeypadPress = (value: string) => {
        if (value === ".") {
            if (activeAmount.includes(".")) return
            return setActiveAmount((current) => `${current || "0"}.`)
        }
        setActiveAmount((current) => {
            if (current === "0") return value
            return `${current}${value}`.slice(0, 18)
        })
    }

    const clearActiveAmount = () => setActiveAmount("0")

    const backspaceActiveAmount = () => {
        setActiveAmount((current) => current.length > 1 ? current.slice(0, -1) : "0")
    }

    const changeActiveCurrency = (index: number) => {
        setActiveCurrencyIndex(index)
        const amount = amounts[index] ?? 0
        setActiveAmount(Number.isFinite(amount) ? String(Number(amount.toFixed(8))) : "0")
    }

    const updatedLabel = rates?.updatedAt
        ? t("currency.updatedAt", { time: new Date(rates.updatedAt).toLocaleString(localeTag(locale), { dateStyle: "medium", timeStyle: "short" }) })
        : ""
    const rateStatus = isRefreshing
        ? t("currency.updating")
            : rates?.updatedAt
                ? rates.stale || rateFetchFailed
                    ? t("currency.updateFailed")
                : rates.fromCache
                    ? `${t("currency.cached")} · ${updatedLabel}`
                    : updatedLabel
            : rateFetchFailed ? t("currency.noRates") : t("currency.tapToLoad")
    const footerStatus = rates?.updatedAt
        ? `${t("currency.rateSource")} · ${updatedLabel}`
        : rateStatus
    const menuAction = onOpenTools ?? onBack

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]} edges={["top", "bottom", "left", "right"]}>
            <View style={[styles.currencySurface, { backgroundColor: colors.surface }]}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={menuAction}
                        style={[styles.menuButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                        disabled={!menuAction}
                        accessibilityLabel={t("calculator.openTools")}
                    >
                        <LucideIcon name="grid-3x3" size={16} color={colors.secondaryText} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>{t("currency.title")}</Text>
                    <TouchableOpacity onPress={() => openPicker("add")} style={[styles.addButton, { backgroundColor: colors.accentSurface, borderColor: colors.accent }]} accessibilityLabel={t("currency.add")}>
                        <LucideIcon name="plus" size={17} color={colors.accent} />
                        <Text style={[styles.addButtonText, { color: colors.accent }]}>{t("currency.add")}</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.currencyList}
                    contentContainerStyle={styles.currencyListContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {displayedCurrencies.map((code, index) => {
                        const currency = getCurrency(code)
                        const active = index === activeCurrencyIndex
                        const displayValue = active
                            ? activeAmount || "0"
                            : formatExchangeAmount(amounts[index] ?? 0, locale)
                        return (
                            <View style={[styles.currencyRow, { borderBottomColor: colors.border }]} key={`${code}-${index}`}>
                                <TouchableOpacity style={styles.currencySelector} onPress={() => { setActiveCurrencyIndex(index); openPicker("replace") }} onLongPress={() => toggleFavorite(code)}>
                                    <CurrencyFlag region={currency.region} emoji={currency.flag} size={CURRENCY_FLAG_SIZE} />
                                    <View style={styles.currencyIdentity}>
                                        <View style={styles.codeLine}>
                                            <Text style={[styles.currencyCode, { color: colors.text }]}>{code}</Text>
                                            <Text style={[styles.currencyCaret, { color: colors.tertiaryText }]}>▾</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                                <View style={styles.amountColumn}>
                                    {active ? (
                                        <TextInput
                                            style={[styles.amount, styles.amountInput, { color: colors.accent }]}
                                            value={displayValue}
                                            onChangeText={handleAmountChange}
                                            keyboardType="decimal-pad"
                                            showSoftInputOnFocus={false}
                                            caretHidden
                                            selectTextOnFocus
                                            returnKeyType="done"
                                            accessibilityLabel={`${currency.name[locale]} ${t("common.amount")}`}
                                        />
                                    ) : (
                                        <TouchableOpacity onPress={() => changeActiveCurrency(index)}>
                                            <Text style={[styles.amount, { color: colors.text }]} numberOfLines={1}>{displayValue}</Text>
                                        </TouchableOpacity>
                                    )}
                                    <Text style={[styles.currencyName, styles.amountName, { color: colors.secondaryText }]} numberOfLines={1}>{currency.name[locale]}</Text>
                                </View>
                            </View>
                        )
                    })}
                </ScrollView>

                <TouchableOpacity style={styles.statusButton} onPress={() => void loadRates(true)} disabled={isRefreshing}>
                    {isRefreshing && <ActivityIndicator size="small" color={colors.secondaryText} />}
                    <Text style={[styles.statusText, { color: colors.tertiaryText }]} numberOfLines={1}>{footerStatus}</Text>
                </TouchableOpacity>

                <CurrencyKeypad onPress={handleKeypadPress} onClear={clearActiveAmount} onBackspace={backspaceActiveAmount} />
            </View>

            <CurrencyPicker visible={pickerVisible} searchText={searchText} favorites={favorites} locale={locale} t={t} onSearch={setSearchText} onClose={() => setPickerVisible(false)} onSelect={selectCurrency} onToggleFavorite={toggleFavorite} />
        </SafeAreaView>
    )
}

type CurrencyKeypadProps = {
    onPress: (value: string) => void
    onClear: () => void
    onBackspace: () => void
}

function CurrencyKeypad({ onPress, onClear, onBackspace }: CurrencyKeypadProps) {
    const { colors } = useTheme()
    const rows = [["7", "8", "9"], ["4", "5", "6"], ["1", "2", "3"], ["0", ".", ""]]

    return (
        <View style={[styles.keypad, { backgroundColor: colors.elevated, borderTopColor: colors.border }]}>
            <View style={styles.keypadNumbers}>
                {rows.map((row, rowIndex) => (
                    <View style={styles.keypadRow} key={`currency-keypad-row-${rowIndex}`}>
                        {row.map((value, columnIndex) => value ? (
                            <TouchableOpacity
                                key={value}
                                style={[styles.keypadKey, { borderRightColor: colors.border, borderBottomColor: colors.border }]}
                                onPress={() => onPress(value)}
                            >
                                <Text style={[styles.keypadText, { color: colors.text }]}>{value === "." ? "." : value}</Text>
                            </TouchableOpacity>
                        ) : <View style={styles.keypadKey} key={`empty-${rowIndex}-${columnIndex}`} />)}
                    </View>
                ))}
            </View>
            <View style={styles.keypadActions}>
                <TouchableOpacity style={[styles.keypadAction, { borderBottomColor: colors.border }]} onPress={onClear}>
                    <Text style={[styles.keypadActionText, { color: colors.accent }]}>AC</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.keypadAction} onPress={onBackspace}>
                    <LucideIcon name="delete" size={20} color={colors.secondaryText} />
                </TouchableOpacity>
            </View>
        </View>
    )
}

type PickerProps = {
    visible: boolean
    searchText: string
    favorites: string[]
    locale: "en" | "zh-CN" | "zh-TW"
    t: (key: string, variables?: Record<string, string | number>) => string
    onSearch: (value: string) => void
    onClose: () => void
    onSelect: (code: string) => void
    onToggleFavorite: (code: string) => void
}

function CurrencyPicker({ visible, searchText, favorites, locale, t, onSearch, onClose, onSelect, onToggleFavorite }: PickerProps) {
    const { colors } = useTheme()
    const normalizedQuery = searchText.trim().toUpperCase()
    const customCode = /^[A-Z]{3}$/.test(normalizedQuery) && !currencies[normalizedQuery] ? normalizedQuery : ""
    const filteredCodes = useMemo(() => {
        const query = searchText.trim().toLocaleLowerCase(localeTag(locale))
        return currencyCodes
            .filter((code) => {
                const item = getCurrency(code)
                return !query || [code, item.symbol, item.name[locale], item.regionName[locale], item.name.en, item.regionName.en].some((value) => value.toLocaleLowerCase(localeTag(locale)).includes(query))
            })
            .sort((a, b) => Number(favorites.includes(b)) - Number(favorites.includes(a)))
    }, [favorites, locale, searchText])

    return (
        <Modal animationType="slide" visible={visible} transparent presentationStyle="formSheet" onRequestClose={onClose}>
            <View style={styles.modalView}>
                <Pressable style={styles.dismissArea} onPress={onClose} />
                <View style={[styles.currencyPicker, { backgroundColor: colors.surface }]}>
                    <View style={styles.pickerHeader}>
                        <Text style={[styles.pickerTitle, { color: colors.text }]}>{t("currency.add")}</Text>
                        <TouchableOpacity onPress={onClose}><Text style={[styles.doneText, { color: colors.accent }]}>{t("common.done")}</Text></TouchableOpacity>
                    </View>
                    <TextInput style={[styles.searchBar, { backgroundColor: colors.elevated, color: colors.text }]} placeholder={t("currency.searchPlaceholder")} placeholderTextColor={colors.tertiaryText} clearButtonMode="while-editing" value={searchText} onChangeText={onSearch} autoCorrect={false} autoCapitalize="characters" />
                    <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
                        {customCode && (
                            <TouchableOpacity style={[styles.customCodeRow, { backgroundColor: colors.accentSurface, borderBottomColor: colors.border }]} onPress={() => onSelect(customCode)}>
                                <LucideIcon name="plus" size={24} color={colors.accent} />
                                <View style={styles.currencyIdentity}>
                                    <Text style={[styles.pickerCode, { color: colors.text }]}>{t("currency.addCode", { code: customCode })}</Text>
                                    <Text style={[styles.pickerName, { color: colors.secondaryText }]}>{customCode}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        {filteredCodes.length ? filteredCodes.map((code) => {
                            const item = getCurrency(code)
                            const favorite = favorites.includes(code)
                            return (
                                <View style={[styles.pickerRow, { borderBottomColor: colors.border }]} key={code}>
                                    <TouchableOpacity style={styles.pickerSelect} onPress={() => onSelect(code)}>
                                        <CurrencyFlag region={item.region} emoji={item.flag} size={24} />
                                        <View style={styles.currencyIdentity}><Text style={[styles.pickerCode, { color: colors.text }]}>{code} · {item.symbol}</Text><Text style={[styles.pickerName, { color: colors.secondaryText }]}>{item.name[locale]} · {item.regionName[locale]}</Text></View>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => onToggleFavorite(code)} accessibilityLabel={t("currency.favorite")}><Text style={[styles.favorite, { color: colors.secondaryText }, favorite && { color: colors.accent }]}>{favorite ? "★" : "☆"}</Text></TouchableOpacity>
                                </View>
                            )
                        }) : !customCode && <Text style={[styles.noResults, { color: colors.secondaryText }]}>{t("currency.noResults")}</Text>}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, width: "100%" },
    currencySurface: { flex: 1, width: "100%", borderTopLeftRadius: 8, borderTopRightRadius: 8, overflow: "hidden" },
    header: { height: CURRENCY_HEADER_HEIGHT, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(120,120,120,0.4)" },
    menuButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, justifyContent: "center", alignItems: "center" },
    title: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "500" },
    addButton: { minWidth: 42, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
    addButtonText: { fontSize: 13, fontWeight: "500" },
    currencyList: { flex: 1 },
    currencyListContent: { paddingBottom: 0 },
    currencyRow: { height: CURRENCY_ROW_HEIGHT, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 30 },
    currencySelector: { flex: 1, flexDirection: "row", alignItems: "center", gap: 20, minWidth: 0 },
    currencyIdentity: { flex: 1, minWidth: 0 },
    codeLine: { flexDirection: "row", alignItems: "center" },
    currencyCode: { fontSize: CURRENCY_CODE_FONT_SIZE, fontWeight: "400", letterSpacing: 0.2 },
    currencyCaret: { fontSize: 17, marginLeft: 8, marginTop: 3 },
    currencyName: { fontSize: CURRENCY_NAME_FONT_SIZE, marginTop: 2 },
    amountColumn: { width: "42%", alignItems: "flex-end", paddingLeft: 8 },
    amount: { fontSize: CURRENCY_AMOUNT_FONT_SIZE, fontWeight: "400", textAlign: "right", fontVariant: ["tabular-nums"] },
    amountInput: { minWidth: 86, paddingVertical: 0, paddingHorizontal: 0 },
    amountName: { maxWidth: "100%", textAlign: "right" },
    statusButton: { height: CURRENCY_STATUS_HEIGHT, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, gap: 2 },
    statusText: { fontSize: 13, textAlign: "center" },
    keypad: { height: CURRENCY_KEYPAD_HEIGHT, width: "100%", flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth },
    keypadNumbers: { flex: 3 },
    keypadRow: { flex: 1, flexDirection: "row" },
    keypadKey: { flex: 1, alignItems: "center", justifyContent: "center", borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
    keypadText: { fontSize: CURRENCY_KEYPAD_FONT_SIZE, fontWeight: "300" },
    keypadActions: { flex: 1 },
    keypadAction: { flex: 1, alignItems: "center", justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth },
    keypadActionText: { fontSize: 18, fontWeight: "400" },
    modalView: { flex: 1 },
    dismissArea: { flex: 1 },
    currencyPicker: { height: "80%", marginTop: "auto", backgroundColor: "#222", borderTopRightRadius: 20, borderTopLeftRadius: 20, padding: 20, alignItems: "center" },
    pickerHeader: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    pickerTitle: { color: "white", fontSize: 20, fontWeight: "600" },
    doneText: { color: "#F69A06", fontSize: 16 },
    searchBar: { width: "100%", height: 48, backgroundColor: "#333", borderRadius: 10, paddingHorizontal: 16, color: "white", fontSize: 16, marginBottom: 12 },
    pickerList: { flex: 1, width: "100%" },
    pickerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomColor: "#333", borderBottomWidth: StyleSheet.hairlineWidth },
    customCodeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
    pickerSelect: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    pickerCode: { color: "white", fontSize: 17, fontWeight: "600" },
    pickerName: { color: "#999", fontSize: 13, marginTop: 2 },
    favorite: { color: "#777", fontSize: 24, padding: 6 },
    favoriteActive: { color: "#F69A06" },
    noResults: { color: "#999", textAlign: "center", padding: 24 },
})
