import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

export interface BadgeProps {
  label: string
  color?: string
  textColor?: string
  size?: 'sm' | 'md'
}

export function Badge({
  label,
  color = '#e5e7eb',
  textColor = '#374151',
  size = 'md',
}: BadgeProps) {
  return (
    <View style={[styles.base, styles[size], { backgroundColor: color }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  sm: { paddingVertical: 2,  paddingHorizontal: 8  },
  md: { paddingVertical: 4,  paddingHorizontal: 12 },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
})
