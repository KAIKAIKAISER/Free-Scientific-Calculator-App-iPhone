import React from "react"
import { StyleSheet, Text } from "react-native"
import Svg, { Circle, G, Path } from "react-native-svg"

type Props = { region: string; emoji: string; size?: number }

export default function CurrencyFlag({ region, emoji, size = 24 }: Props) {
    // China-market iPhones may not contain the Taiwan flag glyph. Keep this as
    // SVG, but use the same waving silhouette and proportions as a flag emoji.
    if (region === "TW") {
        return (
            <Svg width={size * 1.25} height={size} viewBox="0 0 32 24" accessibilityLabel="Taiwan flag">
                <Path
                    d="M3.5 3.5C7.1 2.2 10.2 4.1 13.6 4.9C18.2 6 22.4 3.6 28.5 5.4V19C24.9 17.9 22.1 20.3 18.1 19.7C12.8 18.7 8.9 14.4 3.5 16.1Z"
                    fill="#F04438"
                />
                <Path
                    d="M3.5 3.5C6.6 2.4 9.6 3.5 12.3 4.4C13.5 4.8 14.6 4.9 15.5 4.6V11.6C14.1 11.6 12.7 11.2 11.4 10.7C8.6 9.7 6.1 8.5 3.5 9.2Z"
                    fill="#1D4ED8"
                />
                {Array.from({ length: 12 }, (_, index) => (
                    <G key={index} rotation={index * 30} origin="8.5, 5.8">
                        <Path d="M8.5 2.95 9 4.55 8 4.55Z" fill="#FFFFFF" />
                    </G>
                ))}
                <Circle cx="8.5" cy="5.8" r="1.18" fill="#FFFFFF" />
                <Path
                    d="M3.5 3.5C7.1 2.2 10.2 4.1 13.6 4.9C18.2 6 22.4 3.6 28.5 5.4V19C24.9 17.9 22.1 20.3 18.1 19.7C12.8 18.7 8.9 14.4 3.5 16.1Z"
                    fill="none"
                    stroke="rgba(0,0,0,0.12)"
                    strokeWidth="0.6"
                />
            </Svg>
        )
    }

    return <Text style={[styles.emoji, { width: size * 1.25, fontSize: size * 0.83, lineHeight: size }]}>{emoji}</Text>
}

const styles = StyleSheet.create({ emoji: { width: 28, textAlign: "center" } })
