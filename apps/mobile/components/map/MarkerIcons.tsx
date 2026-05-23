/**
 * components/map/MarkerIcons.tsx
 *
 * Pure SVG icon components used inside WashroomMarker.
 * All icons are black-outlined on a transparent background.
 * Size and colour are controlled by the parent marker.
 *
 * Exported:
 *   HeartIcon       — free washroom (no purchase required)
 *   BowTieIcon      — pay-to-use washroom
 *   ThumbsUpIcon    — last rating: clean
 *   ThumbsDownIcon  — last rating: dirty
 *   QuestionIcon    — no cleanliness rating yet
 */

import Svg, {
  Path, Circle, Ellipse, Line, Rect, G, Polygon,
} from 'react-native-svg'

interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
}

// ─── Heart ────────────────────────────────────────────────────────────────────
// Represents a free washroom — no purchase required.
export function HeartIcon({
  size = 20,
  color = '#1A1A1A',
  strokeWidth = 1.6,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.04 3 11.42 3.68 12 4.5C12.58 3.68 13.96 3 15.5 3C18.58 3 21 5.42 21 8.5C21 14.5 12 21 12 21Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  )
}

// ─── Bow Tie ──────────────────────────────────────────────────────────────────
// Represents a pay-to-use washroom — must buy something first.
// Classic bow-tie / butterfly shape: two triangles meeting at centre.
export function BowTieIcon({
  size = 20,
  color = '#1A1A1A',
  strokeWidth = 1.6,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Left triangle */}
      <Polygon
        points="3,5 11,12 3,19"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="none"
      />
      {/* Right triangle */}
      <Polygon
        points="21,5 13,12 21,19"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="none"
      />
      {/* Centre knot */}
      <Circle
        cx="12"
        cy="12"
        r="1.5"
        fill={color}
      />
    </Svg>
  )
}

// ─── Thumbs Up ────────────────────────────────────────────────────────────────
// Last cleanliness rating was clean.
export function ThumbsUpIcon({
  size = 14,
  color = '#1A1A1A',
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 22H4C3.46957 22 2.96086 21.7893 2.58579 21.4142C2.21071 21.0391 2 20.5304 2 20V13C2 12.4696 2.21071 11.9609 2.58579 11.5858C2.96086 11.2107 3.46957 11 4 11H7M14 9V5C14 4.20435 13.6839 3.44129 13.1213 2.87868C12.5587 2.31607 11.7956 2 11 2L7 11V22H18.28C18.7623 22.0055 19.2304 21.8364 19.5979 21.524C19.9654 21.2116 20.2077 20.7769 20.28 20.3L21.66 11.3C21.7035 11.0134 21.6842 10.7207 21.6033 10.4423C21.5225 10.1638 21.3821 9.90629 21.1919 9.68751C21.0016 9.46873 20.7661 9.29393 20.5016 9.17522C20.2371 9.0565 19.9499 8.99672 19.66 9H14Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Thumbs Down ─────────────────────────────────────────────────────────────
// Last cleanliness rating was dirty.
export function ThumbsDownIcon({
  size = 14,
  color = '#1A1A1A',
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 2H19.67C20.236 1.99399 20.7853 2.19532 21.2154 2.56681C21.6455 2.93831 21.9275 3.45484 22 4.02L22 4V11C21.9896 11.5217 21.7831 12.0209 21.4218 12.3998C21.0605 12.7787 20.5712 12.9999 20.06 13H17M10 15V19C10 19.7956 10.3161 20.5587 10.8787 21.1213C11.4413 21.6839 12.2044 22 13 22L17 13V2H5.72C5.23739 1.99453 4.76926 2.16359 4.40166 2.47599C4.03406 2.78838 3.79233 3.22309 3.72 3.7L2.34 12.7C2.29649 12.9866 2.31583 13.2793 2.39666 13.5577C2.4775 13.8362 2.61788 14.0937 2.80814 14.3125C2.9984 14.5313 3.23393 14.7061 3.49843 14.8248C3.76293 14.9435 4.05008 15.0033 4.34 15H10Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─── Question Mark ────────────────────────────────────────────────────────────
// No cleanliness rating has been submitted yet.
export function QuestionIcon({
  size = 14,
  color = '#1A1A1A',
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="17" r="0.8" fill={color} />
    </Svg>
  )
}
