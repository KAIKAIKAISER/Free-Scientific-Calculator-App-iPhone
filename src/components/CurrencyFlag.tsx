import React from "react"
import { StyleSheet, Text } from "react-native"

type Props = { region: string; emoji: string; size?: number }

export default function CurrencyFlag({ region, emoji, size = 24 }: Props) {
    return <Text style={[styles.emoji, { width: size * 1.25, fontSize: size * 0.83, lineHeight: size }]}>{emoji}</Text>
}

const styles = StyleSheet.create({ emoji: { width: 28, textAlign: "center" } })
