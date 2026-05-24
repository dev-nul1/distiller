import { h } from 'preact'

/**
 * Distiller logo mark as an inline SVG component.
 *
 * Bundling note: build-figma-plugin (esbuild) has no SVG file loader, so the
 * mark is inlined here as JSX rather than imported from the .svg source file.
 * The .svg sibling (distiller-logo.svg) is the design-tool source of truth;
 * update this component if the mark ever changes.
 *
 * The SVG carries its own background (#18A0FB blue + gradient overlay).
 * The container in AboutView.tsx provides only the corner radius and
 * overflow:hidden clipping — no background colour is needed there.
 */
export function DistillerLogo() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="128" height="128" fill="#18A0FB" />
      <rect
        width="128"
        height="128"
        fill="url(#paint0_linear_22_288)"
        style={{ mixBlendMode: 'multiply' }}
      />
      <g filter="url(#filter0_d_22_288)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M41 62.6503V107.97L56.7368 117L87 91.9273V45.8059C87 45.8059 61.9825 33.3732 59.1579 24.951C56.3333 16.5289 58.3509 13.7215 59.5614 12.1173C60.7719 10.5131 41.4035 25.7531 41.4035 34.1753C41.4035 40.0756 48.3903 46.2652 55.5113 51.0414L41 62.6503ZM70.4561 59.4418V100.751L57.5439 95.5368V52.3663C64.231 56.606 70.4561 59.4418 70.4561 59.4418Z"
          fill="#F2F2F2"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_22_288"
          x="39"
          y="12"
          width="52"
          height="112"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx={1} dy={4} />
          <feGaussianBlur stdDeviation={1.5} />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_22_288" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_22_288" result="shape" />
        </filter>
        <linearGradient
          id="paint0_linear_22_288"
          x1="64"
          y1="0"
          x2="64"
          y2="128"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="#999999" />
        </linearGradient>
      </defs>
    </svg>
  )
}
