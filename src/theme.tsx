import AsyncStorage from "@react-native-async-storage/async-storage"
import React, { createContext, useContext, useEffect, useMemo, useState } from "react"

export type ThemeMode = "light" | "dark"

export type ThemeColors = {
    background: string
    surface: string
    elevated: string
    mutedSurface: string
    border: string
    text: string
    secondaryText: string
    tertiaryText: string
    accent: string
    accentSurface: string
    accentText: string
    selection: string
    overlay: string
}

const darkColors: ThemeColors = {
    background: "#000000",
    surface: "#1c1c1e",
    elevated: "#292929",
    mutedSurface: "#171717",
    border: "#333333",
    text: "#ffffff",
    secondaryText: "#999999",
    tertiaryText: "#666666",
    accent: "#F69A06",
    accentSurface: "#3E2702",
    accentText: "#BF7600",
    selection: "rgba(40, 80, 200, 0.5)",
    overlay: "rgba(255,255,255,0.1)",
}

const lightColors: ThemeColors = {
    background: "#f5f6f8",
    surface: "#ffffff",
    elevated: "#eef0f3",
    mutedSurface: "#e5e7eb",
    border: "#d7d9de",
    text: "#1c1c1e",
    secondaryText: "#68707b",
    tertiaryText: "#8c929b",
    accent: "#f57c00",
    accentSurface: "#fff0dc",
    accentText: "#b45f00",
    selection: "rgba(40, 80, 200, 0.16)",
    overlay: "rgba(0,0,0,0.06)",
}

const THEME_KEY = "settings.theme"

type ThemeContextValue = {
    mode: ThemeMode
    isDark: boolean
    colors: ThemeColors
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
    mode: "dark",
    isDark: true,
    colors: darkColors,
    toggleTheme: () => undefined,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>("dark")
    const [ready, setReady] = useState(false)

    useEffect(() => {
        AsyncStorage.getItem(THEME_KEY).then((value) => {
            if (value === "light" || value === "dark") setMode(value)
            setReady(true)
        }).catch(() => setReady(true))
    }, [])

    const toggleTheme = () => {
        setMode((current) => {
            const next = current === "dark" ? "light" : "dark"
            void AsyncStorage.setItem(THEME_KEY, next)
            return next
        })
    }

    const value = useMemo(() => ({
        mode,
        isDark: mode === "dark",
        colors: mode === "dark" ? darkColors : lightColors,
        toggleTheme,
    }), [mode])

    if (!ready) return null
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    return useContext(ThemeContext)
}
