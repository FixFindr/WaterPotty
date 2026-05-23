import React from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native'

export interface ButtonProps extends TouchableOpacityProps {
  label: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        containerStyles.base,
        containerStyles[variant],
        containerStyles[size],
        (disabled || loading) && containerStyles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? '#ffffff' : '#007aff'}
          size="small"
        />
      ) : (
        <Text style={[labelStyles.base, labelStyles[variant]]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const containerStyles = StyleSheet.create({
  base:      { borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  primary:   { backgroundColor: '#007aff' },
  secondary: { backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#d1d1d1' },
  ghost:     { backgroundColor: 'transparent' },
  danger:    { backgroundColor: '#ef4444' },
  disabled:  { opacity: 0.5 },
  sm:        { paddingVertical: 8,  paddingHorizontal: 14, minHeight: 34 },
  md:        { paddingVertical: 12, paddingHorizontal: 20, minHeight: 44 },
  lg:        { paddingVertical: 16, paddingHorizontal: 28, minHeight: 54 },
})

const labelStyles = StyleSheet.create({
  base:      { fontWeight: '600', fontSize: 16 },
  primary:   { color: '#ffffff' },
  secondary: { color: '#1a1a1a' },
  ghost:     { color: '#007aff' },
  danger:    { color: '#ffffff' },
})
