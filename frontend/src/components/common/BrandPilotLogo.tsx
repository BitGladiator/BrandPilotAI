import React from 'react';

interface BrandPilotLogoProps {
  size?: number | string;
  className?: string;
  ringColor?: string;
  leftWingColor?: string;
  rightWingColor?: string;
  strokeWidth?: number;
}

export const BrandPilotLogo: React.FC<BrandPilotLogoProps> = ({
  size = 32,
  className = '',
  ringColor = '#702F3D',       // Brand Deep Burgundy
  leftWingColor = '#A84B60',   // Facet 1: Lighter Rose Burgundy
  rightWingColor = '#702F3D',  // Facet 2: Deep Burgundy
  strokeWidth = 6.5,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      aria-label="BrandPilot Logo"
    >
      {/* Outer Broken Circle Ring */}
      {/* Main Clockwise Arc (from bottom-left over the top to top-right) */}
      <path
        d="M 41.5 87.4 A 36 36 0 1 1 55 16.5"
        stroke={ringColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Secondary Clockwise Arc (from right below arrow to bottom-right) */}
      <path
        d="M 81.5 38.8 A 36 36 0 0 1 54.5 87.4"
        stroke={ringColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Navigation Arrow / Compass Delta */}
      {/* Left Wing Facet (Lighter Burgundy Tone) */}
      <path
        d="M 76.5 21.5 L 25.5 56.5 L 45.5 53.5 Z"
        fill={leftWingColor}
      />

      {/* Right Wing Facet (Deeper Burgundy Tone) */}
      <path
        d="M 76.5 21.5 L 45.5 53.5 L 48.5 78.5 Z"
        fill={rightWingColor}
      />
    </svg>
  );
};

export default BrandPilotLogo;
