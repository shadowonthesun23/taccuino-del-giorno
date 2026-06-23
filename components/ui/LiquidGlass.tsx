import { useRef } from 'react'

interface LiquidGlassProps {
  children: React.ReactNode
  className?: string
  scale?: number
  baseFrequency?: number
  blur?: boolean
  borderRadius?: string
}

export default function LiquidGlass({
  children,
  className = '',
  scale = 200,
  baseFrequency = 0.01,
  blur = true,
  borderRadius = '28px',
}: LiquidGlassProps) {
  const filterId = useRef(`lg-${Math.random().toString(36).slice(2, 7)}`)

  return (
    <>
      <svg style={{ display: 'none' }} aria-hidden="true">
        <filter id={filterId.current}>
          <feTurbulence
            type="turbulence"
            baseFrequency={baseFrequency}
            numOctaves={2}
            result="turbulence"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <div
        className={className}
        style={{
          borderRadius,
          overflow: 'hidden',
          backdropFilter: `brightness(1.1)${
            blur ? ' blur(2px)' : ''
          } url(#${filterId.current})`,
          WebkitBackdropFilter: `brightness(1.1)${
            blur ? ' blur(2px)' : ''
          } url(#${filterId.current})`,
          boxShadow: `
            inset 6px 6px 0px -6px rgba(255,255,255,0.7),
            inset 0 0 8px 1px rgba(255,255,255,0.7),
            -8px -10px 46px rgba(0,0,0,0.37)
          `,
          position: 'relative',
        }}
      >
        {children}
      </div>
    </>
  )
}
