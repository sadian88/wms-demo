import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Building2, Lock } from 'lucide-react'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { findScreenBySlug, landingSlugForRole } from './data/catalog'
import { CatalogScreen } from './screens/catalog'
import { ClaimsScreen, StaleAndExpiryScreen } from './screens/claims'
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
import { ReconciliationScreen } from './screens/reconciliation'
import { SettingsScreen } from './screens/settings'
import { TransfersScreen } from './screens/transfers'

export function WmsWorkspace({ screenSlug = '1-1' }: { screenSlug?: string }) {
  const navigate = useNavigate()
  const { role, almacenes, warehouses, warehouse, setWarehouse, hasAccess } =
    useWms()

  const { mod, scr } = findScreenBySlug(screenSlug)
  const allowed = hasAccess(scr)
  const home = landingSlugForRole(role)

  const goToSlug = (slug: string) => {
    navigate({ to: '/wms/$code', params: { code: slug } })
  }

  // Quien no puede ver el resumen aterriza directo en su pantalla de trabajo.
  useEffect(() => {
    if (!allowed && scr.slug === '1-1' && home !== '1-1') {
      navigate({ to: '/wms/$code', params: { code: home }, replace: true })
    }
  }, [allowed, scr.slug, home, navigate])

  return (
    <>
      <Header fixed className='border-b bg-background'>
        {warehouses.length > 1 && (
          <Select value={warehouse} onValueChange={setWarehouse}>
            <SelectTrigger
              className='h-9 w-full max-w-64 min-w-0 gap-2 bg-card md:w-64'
              aria-label='Bodega activa'
            >
              <Building2 className='size-4 shrink-0 text-muted-foreground' />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>Todas las bodegas</SelectItem>
              {almacenes.map((alm) => (
                <SelectGroup key={alm.id}>
                  <SelectLabel>{alm.name}</SelectLabel>
                  {almacenes.length > 1 && (
                    <SelectItem value={`ALM:${alm.id}`}>
                      Todo {alm.name}
                    </SelectItem>
                  )}
                  {warehouses
                    .filter((w) => w.almacenId === alm.id)
                    .map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className='ms-auto flex items-center gap-1.5'>
          <div className='hidden md:block'>
            <Search />
          </div>
          <ThemeSwitch />
          <div className='hidden md:block'>
            <ConfigDrawer />
          </div>
          <ProfileDropdown />
        </div>
      </Header>

      <Main fluid className='py-4'>
        {!allowed && mod.id !== 7 ? (
          <div className='mx-auto max-w-md space-y-3 rounded-xl border bg-card p-8 text-center'>
            <div className='mx-auto flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger-ink'>
              <Lock className='size-5' />
            </div>
            <h2 className='text-base font-semibold'>
              Esta pantalla no está habilitada para tu perfil
            </h2>
            <p className='text-sm text-muted-foreground'>
              «{scr.name}» la usan: {scr.roles.join(', ')}. Si la necesitas,
              pídele a un administrador que ajuste tu perfil.
            </p>
            <Button className='mt-2' onClick={() => goToSlug(home)}>
              Ir a mi pantalla de inicio
            </Button>
          </div>
        ) : (
          <>
            {scr.slug === '1-1' && <PanelScreen onNavigate={goToSlug} />}
            {scr.slug === '2-1' && (
              <InventoryScreen onNavigateToOrder={() => goToSlug('4-1')} />
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
            {scr.slug === '4-3' && <ReconciliationScreen />}
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
