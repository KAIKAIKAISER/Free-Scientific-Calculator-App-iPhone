import React from "react"
import { StyleSheet, Text } from "react-native"
import Svg, { Circle, Path, Rect } from "react-native-svg"

type Props = { region: string; emoji: string; size?: number }

/** Use a bundled flag for TW because the system emoji glyph is unavailable on some China-market iPhones. */
export default function CurrencyFlag({ region, emoji, size = 24 }: Props) {
    if (region === "TW") {
        return (
            <Svg width={size} height={size * 0.75} viewBox="0 0 24 18" accessibilityLabel="Taiwan flag">
                <Rect width="24" height="18" rx="2" fill="#fe0000" />
                <Rect width="12" height="9" rx="1" fill="#000095" />
                <Circle cx="6" cy="4.5" r="2.4" fill="#fff" />
                <Path d="M6 1.65 6.53 3.1l1.55.03-1.23.92.47 1.48L6 4.65l-1.32.88.47-1.48-1.23-.92 1.55-.03L6 1.65Z" fill="#000095" />
            </Svg>
        )
    }

    return <Text style={[styles.emoji, { fontSize: size * 0.83, lineHeight: size }]}>{emoji}</Text>
}

const styles = StyleSheet.create({ emoji: { width: 28, textAlign: "center" } })
