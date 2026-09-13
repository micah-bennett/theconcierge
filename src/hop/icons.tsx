import type { ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import { HOP_ICONS, type HopIconKey } from './hopIconMap'

export type { HopIconKey }

export function HopIcon({ name, ...rest }: { name: HopIconKey } & ComponentProps<LucideIcon>) {
  const Icon = HOP_ICONS[name]
  return <Icon aria-hidden="true" {...rest} />
}
