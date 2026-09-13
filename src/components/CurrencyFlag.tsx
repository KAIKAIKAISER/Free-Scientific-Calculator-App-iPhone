import React from "react"
import { StyleSheet, Text } from "react-native"
import Svg, { Circle, G, Path, Rect } from "react-native-svg"

type Props = { region: string; emoji: string; size?: number }

/** Use a bundled flag for TW because the system emoji glyph is unavailable on some China-market iPhones. */
export default function CurrencyFlag({ region, emoji, size = 24 }: Props) {
    if (region === "TW") {
        return (
            <Svg width={size} height={size * 0.75} viewBox="0 0 24 18" accessibilityLabel="Taiwan flag">
                <Rect width="24" height="18" rx="2" fill="#fe0000" />
                <Rect width="12" height="9" rx="1" fill="#000095" />
                {Array.from({ length: 12 }, (_, index) => (
                    <G key={index} rotation={index * 30} origin="6, 4.5">
                        <Path d="M6 0.72 6.58 2.85 5.42 2.85Z" fill="#fff" />
                    </G>
                ))}
                <Circle cx="6" cy="4.5" r="1.65" fill="#fff" />
            </Svg>
        )
    }

    return <Text style={[styles.emoji, { fontSize: size * 0.83, lineHeight: size }]}>{emoji}</Text>
}

const styles = StyleSheet.create({ emoji: { width: 28, textAlign: "center" } })
