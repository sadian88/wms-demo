import { cn } from '@/lib/utils'
import { SCREEN_ICONS } from '@/features/wms/data/navigation'
import { PageHeader } from '../ui-helpers'
import { AppearanceSettings } from './appearance'
import { BillingSettings } from './billing'
import { StructureSettings } from './structure'
import { UsersSettings } from './users'

const TABS = [
  { slug: '7-1', title: 'Bodegas' },
  { slug: '7-2', title: 'Usuarios' },
  { slug: '7-4', title: 'Facturación' },
  { slug: '7-3', title: 'Apariencia' },
]

export function SettingsScreen({
  activeSlug,
  onNavigate,
}: {
  activeSlug: string
  onNavigate: (slug: string) => void
}) {
  const activeTab = TABS.some((t) => t.slug === activeSlug) ? activeSlug : '7-1'

  return (
    <div className='space-y-6'>
      <PageHeader title='Configuración' />

      <nav
        aria-label='Secciones de configuración'
        className='-mx-4 no-scrollbar flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0'
      >
        {TABS.map((t) => {
          const Icon = SCREEN_ICONS[t.slug]
          const active = t.slug === activeTab
          return (
            <button
              key={t.slug}
              type='button'
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(t.slug)}
              className={cn(
                '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {Icon && <Icon className='size-4' />}
              {t.title}
            </button>
          )
        })}
      </nav>

      <div className='space-y-6'>
        {activeTab === '7-1' && <StructureSettings />}
        {activeTab === '7-2' && <UsersSettings />}
        {activeTab === '7-4' && <BillingSettings />}
        {activeTab === '7-3' && <AppearanceSettings />}
      </div>
    </div>
  )
}
