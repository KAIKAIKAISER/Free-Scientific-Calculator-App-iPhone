import React, { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import AsyncStorage from "@react-native-async-storage/async-storage"
import CurrencyFlag from "../components/CurrencyFlag"
import LucideIcon from "../components/LucideIcon"
import { currencies, getCurrency, popularCurrencyCodes } from "../data/currencies"
import { useI18n } from "../i18n"
import { getExchangeRates, refreshExchangeRates, RatesResult } from "../services/exchangeRate"
import { useTheme } from "../theme"
const CURRENCY_KEY = "currency.displayed"
const FAVORITES_KEY = "currency.favorites"
const DEFAULT_CURRENCIES = ["CNY", "USD", "JPY", "EUR", "HKD", "TWD"]

type Props = { onBack?: () => void }

function localeTag(locale: "en" | "zh-CN" | "zh-TW") {
    return locale === "en" ? "en-US" : locale
}

function formatAmount(code: string, amount: number, locale: "en" | "zh-CN" | "zh-TW") {
    const decimals = getCurrency(code).decimals
    return amount.toLocaleString(localeTag(locale), { maximumFractionDigits: decimals })
}

function safeDisplayedCodes(value: string | null) {
    if (!value) return DEFAULT_CURRENCIES
    try {
        const parsed: unknown = JSON.parse(value)
        if (!Array.isArray(parsed)) return DEFAULT_CURRENCIES
        const codes = parsed.filter((code): code is string => typeof code === "string" && !!currencies[code])
        return codes.length ? Array.from(new Set(codes)) : DEFAULT_CURRENCIES
    } catch {
        return DEFAULT_CURRENCIES
    }
}

export default function Currency({ onBack }: Props = {}) {
    const { locale, t } = useI18n()
    const { colors } = useTheme()
    const [displayedCurrencies, setDisplayedCurrencies] = useState(DEFAULT_CURRENCIES)
    const [activeCurrencyIndex, setActiveCurrencyIndex] = useState(0)
    const [activeAmount, setActiveAmount] = useState("1")
    const [rates, setRates] = useState<RatesResult | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [rateFetchFailed, setRateFetchFailed] = useState(false)
    const [pickerVisible, setPickerVisible] = useState(false)
    const [pickerMode, setPickerMode] = useState<"replace" | "add">("replace")
    const [searchText, setSearchText] = useState("")
    const [favorites, setFavorites] = useState<string[]>([])

    const loadRates = useCallback(async (forceRefresh = false) => {
        setIsRefreshing(true)
        setRateFetchFailed(false)
        try {
            const quotes = popularCurrencyCodes.filter((code) => code !== "EUR")
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
    }, [])

    useEffect(() => {
        void AsyncStorage.multiGet([CURRENCY_KEY, FAVORITES_KEY]).then(([displayed, savedFavorites]) => {
            setDisplayedCurrencies(safeDisplayedCodes(displayed[1]))
            if (savedFavorites[1]) {
                try {
                    const parsed: unknown = JSON.parse(savedFavorites[1])
                    if (Array.isArray(parsed)) setFavorites(parsed.filter((code): code is string => typeof code === "string" && !!currencies[code]))
                } catch { /* ignore malformed local preferences */ }
            }
        })
        void loadRates()
    }, [loadRates])

    useEffect(() => {
        void AsyncStorage.setItem(CURRENCY_KEY, JSON.stringify(displayedCurrencies))
    }, [displayedCurrencies])

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
        const activeCode = displayedCurrencies[activeCurrencyIndex]
        const decimals = getCurrency(activeCode).decimals
        let next = value.replaceAll(",", ".").replace(/[^0-9.-]/g, "")
        if (next.includes("-")) next = `${next.startsWith("-") ? "-" : ""}${next.replaceAll("-", "")}`
        if (decimals === 0 && next.includes(".")) next = next.split(".")[0]
        setActiveAmount(next)
    }

    const changeActiveCurrency = (index: number) => {
        setActiveCurrencyIndex(index)
        setActiveAmount(String(amounts[index] ?? 0))
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

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["bottom", "left", "right"]}>
            <View style={styles.header}>
                {onBack ? (
                    <TouchableOpacity onPress={onBack} style={styles.iconButton} accessibilityLabel={t("common.back")}>
                        <LucideIcon name="chevron-left" size={20} color={colors.text} />
                    </TouchableOpacity>
                ) : <View style={styles.headerSpacer} />}
                <Text style={[styles.title, { color: colors.text }]}>{t("currency.title")}</Text>
                <TouchableOpacity onPress={() => openPicker("add")} style={styles.iconButton} accessibilityLabel={t("currency.add")}>
                    <LucideIcon name="plus" size={20} color={colors.accent} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.currencyList} contentContainerStyle={styles.currencyListContent}>
                {displayedCurrencies.map((code, index) => {
                    const currency = getCurrency(code)
                    const active = index === activeCurrencyIndex
                    const displayValue = formatAmount(code, amounts[index] ?? 0, locale)
                    return (
                        <View style={[styles.currencyRow, active && [styles.currencyRowActive, { backgroundColor: colors.elevated }]]} key={`${code}-${index}`}>
                            <TouchableOpacity style={styles.currencySelector} onPress={() => { setActiveCurrencyIndex(index); openPicker("replace") }} onLongPress={() => toggleFavorite(code)}>
                                <CurrencyFlag region={currency.region} emoji={currency.flag} />
                                <View style={styles.currencyIdentity}>
                                    <Text style={[styles.currencyCode, { color: colors.text }]}>{code}</Text>
                                    <Text style={[styles.currencyName, { color: colors.secondaryText }]}>{currency.name[locale]}</Text>
                                </View>
                            </TouchableOpacity>
                            <View style={styles.amountButton}>
                                {active ? (
                                    <TextInput
                                        style={[styles.amount, styles.amountInput, { color: colors.accent }]}
                                        value={activeAmount}
                                        onChangeText={handleAmountChange}
                                        keyboardType={currency.decimals === 0 ? "number-pad" : "decimal-pad"}
                                        selectTextOnFocus
                                        returnKeyType="done"
                                        accessibilityLabel={`${currency.name[locale]} ${t("common.amount")}`}
                                    />
                                ) : (
                                    <TouchableOpacity onPress={() => changeActiveCurrency(index)}>
                                        <Text style={[styles.amount, { color: colors.text }]} numberOfLines={1}>{displayValue}</Text>
                                    </TouchableOpacity>
                                )}
                                <Text style={[styles.symbol, { color: colors.tertiaryText }]}>{currency.symbol}</Text>
                            </View>
                            <View style={styles.rowActions}>
                                <TouchableOpacity onPress={() => moveCurrency(index, -1)} disabled={index === 0} style={styles.rowAction}><Text style={[styles.rowActionText, { color: colors.secondaryText }, index === 0 && styles.disabled]}>↑</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => moveCurrency(index, 1)} disabled={index === displayedCurrencies.length - 1} style={styles.rowAction}><Text style={[styles.rowActionText, { color: colors.secondaryText }, index === displayedCurrencies.length - 1 && styles.disabled]}>↓</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => removeCurrency(index)} disabled={displayedCurrencies.length <= 1} style={styles.rowAction}><Text style={[styles.rowActionText, { color: "#d66" }, displayedCurrencies.length <= 1 && styles.disabled]}>×</Text></TouchableOpacity>
                            </View>
                        </View>
                    )
                })}
                <TouchableOpacity style={styles.addCurrencyButton} onPress={() => openPicker("add")}>
                    <LucideIcon name="plus" size={18} color={colors.accent} />
                    <Text style={[styles.addCurrencyText, { color: colors.accent }]}>{t("currency.add")}</Text>
                </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.statusButton} onPress={() => void loadRates(true)} disabled={isRefreshing}>
                {isRefreshing && <ActivityIndicator size="small" color={colors.secondaryText} />}
                <Text style={[styles.statusText, { color: colors.secondaryText }]}>{rateStatus}</Text>
                {!isRefreshing && <Text style={[styles.sourceText, { color: colors.tertiaryText }]}>{t("currency.rateSource")}</Text>}
            </TouchableOpacity>
            <Text style={[styles.inputHint, { color: colors.tertiaryText }]}>{t("currency.inputHint")}</Text>

            <CurrencyPicker visible={pickerVisible} searchText={searchText} favorites={favorites} locale={locale} t={t} onSearch={setSearchText} onClose={() => setPickerVisible(false)} onSelect={selectCurrency} onToggleFavorite={toggleFavorite} />
        </SafeAreaView>
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
    const filteredCodes = useMemo(() => {
        const query = searchText.trim().toLocaleLowerCase(localeTag(locale))
        return popularCurrencyCodes
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
                        }) : <Text style={[styles.noResults, { color: colors.secondaryText }]}>{t("currency.noResults")}</Text>}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, width: "100%", backgroundColor: "black" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    headerSpacer: { width: 36, height: 36 },
    iconButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
    title: { color: "white", fontSize: 20, fontWeight: "600" },
    currencyList: { flex: 1 },
    currencyListContent: { padding: 16, paddingBottom: 8 },
    currencyRow: { minHeight: 62, flexDirection: "row", alignItems: "center", borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10 },
    currencyRowActive: { backgroundColor: "#1a1a1a" },
    currencySelector: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    currencyIdentity: { flex: 1 },
    currencyCode: { color: "white", fontSize: 18, fontWeight: "600" },
    currencyName: { color: "#888", fontSize: 13, marginTop: 2 },
    amountButton: { alignItems: "flex-end", maxWidth: "43%" },
    amount: { color: "white", fontSize: 24, fontWeight: "500", textAlign: "right" },
    amountInput: { minWidth: 110, paddingVertical: 0, paddingHorizontal: 0 },
    amountActive: { color: "#F69A06" },
    symbol: { color: "#777", fontSize: 13, marginTop: 1 },
    rowActions: { flexDirection: "row", marginLeft: 6 },
    rowAction: { width: 24, alignItems: "center", justifyContent: "center" },
    rowActionText: { color: "#888", fontSize: 16 },
    removeText: { color: "#d66" },
    disabled: { color: "#333" },
    addCurrencyButton: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, justifyContent: "center" },
    addCurrencyText: { color: "#F69A06", fontSize: 16 },
    statusButton: { minHeight: 42, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, gap: 2 },
    statusText: { color: "#777", fontSize: 12, textAlign: "center" },
    sourceText: { color: "#444", fontSize: 10 },
    inputHint: { textAlign: "center", fontSize: 12, paddingHorizontal: 16, paddingBottom: 12 },
    modalView: { flex: 1 },
    dismissArea: { flex: 1 },
    currencyPicker: { height: "80%", marginTop: "auto", backgroundColor: "#222", borderTopRightRadius: 20, borderTopLeftRadius: 20, padding: 20, alignItems: "center" },
    pickerHeader: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    pickerTitle: { color: "white", fontSize: 20, fontWeight: "600" },
    doneText: { color: "#F69A06", fontSize: 16 },
    searchBar: { width: "100%", height: 48, backgroundColor: "#333", borderRadius: 10, paddingHorizontal: 16, color: "white", fontSize: 16, marginBottom: 12 },
    pickerList: { flex: 1, width: "100%" },
    pickerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomColor: "#333", borderBottomWidth: StyleSheet.hairlineWidth },
    pickerSelect: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    pickerCode: { color: "white", fontSize: 17, fontWeight: "600" },
    pickerName: { color: "#999", fontSize: 13, marginTop: 2 },
    favorite: { color: "#777", fontSize: 24, padding: 6 },
    favoriteActive: { color: "#F69A06" },
    noResults: { color: "#999", textAlign: "center", padding: 24 },
})
