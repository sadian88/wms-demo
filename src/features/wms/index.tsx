import { useNavigate } from '@tanstack/react-router'
import { Building2, Lock } from 'lucide-react'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { findScreenBySlug } from './data/catalog'
import { ClaimsScreen, StaleAndExpiryScreen } from './screens/claims'
import { CatalogScreen } from './screens/catalog'
import { InventoryScreen, MovementsScreen } from './screens/inventory'
import {
  AdjustmentsScreen,
  CountsScreen,
  DamagesScreen,
} from './screens/losses'
import { OrdersScreen } from './screens/orders'
import { PanelScreen } from './screens/panel'
import { PickupCounterScreen } from './screens/pickup-counter'
import { ReceivingScreen } from './screens/receiving'
import { SettingsScreen } from './screens/settings'
import { TransfersScreen } from './screens/transfers'

export function WmsWorkspace({ screenSlug = '1-1' }: { screenSlug?: string }) {
  const navigate = useNavigate()
  const {
    role,
    setRole,
    almacenes,
    warehouses,
    warehouse,
    setWarehouse,
    hasAccess,
  } = useWms()

  const { mod, scr } = findScreenBySlug(screenSlug)
  const allowed = hasAccess(scr)

  const goToSlug = (slug: string) => {
    navigate({ to: '/wms/$code', params: { code: slug } })
  }

  return (
    <>
      <Header fixed className='border-b bg-background'>
        <Search />

        <div className='ms-auto flex items-center gap-2'>
          <div className='flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs'>
            <Building2 className='size-3.5 text-muted-foreground' />
            <select
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              className='bg-transparent font-medium text-foreground focus:outline-none'
              aria-label='Seleccionar almacén o bodega'
            >
              <option value='ALL'>Todas las bodegas</option>
              {almacenes.map((alm) => (
                <optgroup key={alm.id} label={`Almacén: ${alm.name}`}>
                  {almacenes.length > 1 && (
                    <option value={`ALM:${alm.id}`}>Todo {alm.name}</option>
                  )}
                  {warehouses
                    .filter((w) => w.almacenId === alm.id)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.isDefaultTied ? 'Por defecto' : 'Adicional'})
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-5'>
        {!allowed && mod.id !== 7 ? (
          <div className='space-y-3 rounded-lg border bg-card p-8 text-center'>
            <div className='mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive'>
              <Lock className='h-5 w-5' />
            </div>
            <h2 className='text-base font-semibold'>
              Acceso restringido a «{scr.name}» para el perfil [{role}]
            </h2>
            <p className='mx-auto max-w-md text-xs text-muted-foreground'>
              Esta pantalla está habilitada para los perfiles:{' '}
              <strong className='text-foreground'>{scr.roles.join(', ')}</strong>.
            </p>
            <div className='flex justify-center gap-2 pt-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => goToSlug('7-2')}
              >
                Ir a Usuarios y Perfiles
              </Button>
              <Button size='sm' onClick={() => setRole(scr.roles[0])}>
                Cambiar a perfil [{scr.roles[0]}]
              </Button>
            </div>
          </div>
        ) : (
          <>
            {scr.slug === '1-1' && <PanelScreen onNavigate={goToSlug} />}
            {scr.slug === '2-1' && (
              <InventoryScreen
                onNavigateToOrder={() => goToSlug('4-1')}
              />
            )}
            {scr.slug === '2-2' && <MovementsScreen />}
            {scr.slug === '2-3' && <TransfersScreen />}
            {scr.slug === '2-4' && <CatalogScreen />}
            {scr.slug === '3-1' && (
              <ReceivingScreen onGoToClaims={() => goToSlug('6-1')} />
            )}
            {scr.slug === '4-1' && (
              <OrdersScreen onGoToPickup={() => goToSlug('4-2')} />
            )}
            {scr.slug === '4-2' && <PickupCounterScreen />}
            {scr.slug === '5-1' && <DamagesScreen />}
            {scr.slug === '5-2' && (
              <CountsScreen onGoToAdjustments={() => goToSlug('5-3')} />
            )}
            {scr.slug === '5-3' && <AdjustmentsScreen />}
            {scr.slug === '6-1' && <ClaimsScreen />}
            {scr.slug === '6-2' && <StaleAndExpiryScreen />}
            {mod.id === 7 && (
              <SettingsScreen activeSlug={scr.slug} onNavigate={goToSlug} />
            )}
          </>
        )}
      </Main>
    </>
  )
}
