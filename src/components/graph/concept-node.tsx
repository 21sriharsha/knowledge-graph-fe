'use client'

import { Handle, type NodeProps, Position } from '@xyflow/react'

import type { TopicColour } from './topic-colour'

export interface ConceptNodeData extends Record<string, unknown> {
  label: string
  colour: TopicColour
  /** Diameter in pixels, derived from how connected the article is. */
  size: number
  focused: boolean
  dimmed: boolean
  dark: boolean
}

/**
 * One article, drawn as a labelled circle.
 *
 * The circle is the whole node box — the label is positioned outside it — so React Flow anchors
 * edges to the visual centre rather than to the middle of a title-sized rectangle. Handles are
 * present but invisible and centred, for the same reason.
 *
 * Size carries degree and colour carries topic, but neither carries meaning on its own: every node
 * is labelled in text and the legend names each topic (FRONTEND-SPEC §12 — never colour alone).
 */
export function ConceptNode({ data }: NodeProps & { data: ConceptNodeData }) {
  const { label, colour, size, focused, dimmed, dark } = data

  return (
    <div
      className="relative flex items-center justify-center rounded-full transition-opacity"
      style={{
        width: size,
        height: size,
        background: colour.dot,
        opacity: dimmed ? 0.22 : 1,
        boxShadow: focused
          ? `0 0 0 4px ${colour.ring}, 0 0 22px 2px ${colour.ring}`
          : `0 0 0 2px ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      <Handle type="target" position={Position.Top} style={HIDDEN_HANDLE} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} style={HIDDEN_HANDLE} isConnectable={false} />
      <span
        className="pointer-events-none absolute top-full left-1/2 mt-1.5 max-w-[11rem] -translate-x-1/2 text-center text-[11px] leading-tight font-medium"
        style={{
          color: dark ? 'rgba(226,232,240,0.92)' : 'var(--foreground)',
          opacity: dimmed ? 0.3 : 1,
          textShadow: dark ? '0 1px 3px rgba(0,0,0,0.6)' : '0 1px 3px var(--background)',
        }}
      >
        {label}
      </span>
    </div>
  )
}

const HIDDEN_HANDLE = {
  opacity: 0,
  width: 1,
  height: 1,
  minWidth: 1,
  minHeight: 1,
  border: 'none',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
} as const
