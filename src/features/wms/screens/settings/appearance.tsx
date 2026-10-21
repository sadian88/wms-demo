import { fonts } from '@/config/fonts'
import { useFont } from '@/context/font-provider'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'
import { Section } from '../../components/kit'

const THEMES = [
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Oscuro' },
  { id: 'system', label: 'Según el sistema' },
] as const

const FONT_LABEL: Record<string, string> = {
  inter: 'Inter',
  manrope: 'Manrope',
  system: 'Del sistema',
}

export function AppearanceSettings() {
  const { font, setFont } = useFont()
  const { theme, setTheme } = useTheme()

  return (
    <>
      <Section title='Tema'>
        <div className='flex flex-wrap gap-2'>
          {THEMES.map((t) => (
            <Button
              key={t.id}
              type='button'
              variant={theme === t.id ? 'default' : 'outline'}
              onClick={() => setTheme(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </Section>
      <Section title='Tipografía'>
        <div className='flex flex-wrap gap-2'>
          {fonts.map((f) => (
            <Button
              key={f}
              type='button'
              variant={font === f ? 'default' : 'outline'}
              onClick={() => setFont(f)}
            >
              {FONT_LABEL[f] ?? f}
            </Button>
          ))}
        </div>
      </Section>
    </>
  )
}
