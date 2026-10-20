import {
  FlaskConical,
  Grid3X3,
  LayoutGrid,
  Package,
  Ruler,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface CategoryTheme {
  icon: LucideIcon
  color: string
  bg: string
  border: string
  text: string
}

// eslint-disable-next-line react-refresh/only-export-components
export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  Porcelanatos: {
    icon: Grid3X3,
    color: '#0284c7', // sky-600
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-200 dark:border-sky-800',
    text: 'text-sky-700 dark:text-sky-300',
  },
  Cerámicas: {
    icon: LayoutGrid,
    color: '#d97706', // amber-600
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
  },
  Revestimientos: {
    icon: Sparkles,
    color: '#8b5cf6', // violet-500
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-200 dark:border-violet-800',
    text: 'text-violet-700 dark:text-violet-300',
  },
  'Adhesivos y Morteros': {
    icon: Package,
    color: '#ea580c', // orange-600
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-700 dark:text-orange-300',
  },
  'Fragües y Epóxicos': {
    icon: FlaskConical,
    color: '#059669', // emerald-600
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  'Perfiles y Remates': {
    icon: Ruler,
    color: '#4b5563', // gray-600
    bg: 'bg-zinc-50 dark:bg-zinc-900',
    border: 'border-zinc-200 dark:border-zinc-700',
    text: 'text-zinc-700 dark:text-zinc-300',
  },
  'Sellantes e Impermeabilizantes': {
    icon: ShieldCheck,
    color: '#2563eb', // blue-600
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
  },
}

const DEFAULT_THEME: CategoryTheme = {
  icon: Package,
  color: '#6b7280',
  bg: 'bg-muted',
  border: 'border-border',
  text: 'text-muted-foreground',
}

// eslint-disable-next-line react-refresh/only-export-components
export function getCategoryTheme(category: string): CategoryTheme {
  return CATEGORY_THEMES[category] ?? DEFAULT_THEME
}

export function CategoryBadge({
  category,
  className,
}: {
  category: string
  className?: string
}) {
  const theme = getCategoryTheme(category)
  const Icon = theme.icon
  return (
    <Badge
      variant='outline'
      className={`inline-flex items-center gap-1.5 font-medium ${theme.bg} ${theme.border} ${theme.text} ${className ?? ''}`}
    >
      <Icon className='size-3 shrink-0' style={{ color: theme.color }} />
      <span>{category}</span>
    </Badge>
  )
}

export function CategoryAvatar({
  category,
  size = 'md',
  className,
}: {
  category: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const theme = getCategoryTheme(category)
  const Icon = theme.icon

  const sizeClasses = {
    sm: 'size-7 p-1.5',
    md: 'size-10 p-2.5',
    lg: 'size-14 p-3.5',
  }[size]

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg border ${theme.bg} ${theme.border} ${sizeClasses} ${className ?? ''}`}
    >
      <Icon className='size-full' style={{ color: theme.color }} />
    </div>
  )
}
