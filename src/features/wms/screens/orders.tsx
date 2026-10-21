import { useState } from 'react'
import {
  CircleCheck,
  FileSpreadsheet,
  Inbox,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FilterTabs,
  ListRow,
  ProgressBar,
  Section,
  StatStrip,
  StatusPill,
} from '@/features/wms/components/kit'
import { PICKUP_OVERDUE_DAYS } from '@/features/wms/domain/inventory'
import {
  CAN_CREATE_ORDER,
  CAN_INVOICE,
  STATE_RANK,
  buildView,
  isToDeliver,
  matchesQuery,
  pillFor,
  type OrderView,
} from './orders/model'
import { NewOrderDialog } from './orders/new-order-dialog'
import { OrderDetailSheet } from './orders/order-detail-sheet'
import {
  CancelOrderDialog,
  InvoiceDialog,
  VoidInvoiceDialog,
} from './orders/order-dialogs'
import { SiigoImportDialog } from './orders/siigo-import-dialog'
import { EmptyState, PageHeader, cop } from './ui-helpers'

type Tab =
  | 'todos'
  | 'sin_facturar'
  | 'por_entregar'
  | 'atrasados'
  | 'entregados'
  | 'anulados'

const PAGE_SIZE = 30
const ACTION_BTN = 'h-11 sm:h-10'

export function OrdersScreen({ onGoToPickup }: { onGoToPickup: () => void }) {
  const { role, isReadOnly, skus, orders, warehouses, matchesScope } = useWms()
  const canCreate = !isReadOnly && CAN_CREATE_ORDER.includes(role)
  const canInvoice = !isReadOnly && CAN_INVOICE.includes(role)

  const [tab, setTab] = useState<Tab>('todos')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [siigoOpen, setSiigoOpen] = useState(false)
  const [invoiceFor, setInvoiceFor] = useState<string | null>(null)
  const [voidFor, setVoidFor] = useState<string | null>(null)
  const [cancelFor, setCancelFor] = useState<string | null>(null)

  const skuMap = new Map(skus.map((s) => [s.sku, s]))
  const views = orders
    .filter((o) => matchesScope(o.warehouse))
    .map((o) => buildView(o, skuMap))

  const unbilled = views.filter((v) => v.state === 'sin_facturar')
  const toDeliver = views.filter(isToDeliver)
  const overdue = views.filter((v) => v.state === 'atrasado')
  const delivered = views.filter((v) => v.state === 'entregado')
  const voided = views.filter(
    (v) => v.state === 'anulado' || v.state === 'cancelado'
  )
  const open = views.filter((v) => !voided.includes(v))

  const byTab: Record<Tab, OrderView[]> = {
    todos: open,
    sin_facturar: unbilled,
    por_entregar: toDeliver,
    atrasados: overdue,
    entregados: delivered,
    anulados: voided,
  }

  const dateOf = (v: OrderView) =>
    v.order.invoice?.issuedAt ?? v.order.createdAt
  const list = byTab[tab]
    .filter((v) => matchesQuery(v.order, query))
    .sort((a, b) => {
      const byRank = STATE_RANK[a.state] - STATE_RANK[b.state]
      if (byRank !== 0) return byRank
      // Lo atrasado, lo más viejo primero; el resto, lo más reciente primero.
      const byDate =
        a.state === 'atrasado'
          ? dateOf(a).localeCompare(dateOf(b))
          : dateOf(b).localeCompare(dateOf(a))
      return byDate || b.order.id.localeCompare(a.order.id)
    })
  const visible = list.slice(0, limit)

  const pendingCOP = toDeliver.reduce((s, v) => s + v.pendingCOP, 0)

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'todos', label: 'Todos', count: open.length },
    { id: 'sin_facturar', label: 'Sin facturar', count: unbilled.length },
    { id: 'por_entregar', label: 'Por entregar', count: toDeliver.length },
    { id: 'atrasados', label: 'Atrasados', count: overdue.length },
    { id: 'entregados', label: 'Entregados', count: delivered.length },
    ...(voided.length > 0
      ? [{ id: 'anulados' as Tab, label: 'Anulados', count: voided.length }]
      : []),
  ]

  const changeTab = (t: Tab) => {
    setTab(t)
    setLimit(PAGE_SIZE)
  }
  const changeQuery = (q: string) => {
    setQuery(q)
    setLimit(PAGE_SIZE)
  }

  const warehouseName = (id: string) =>
    warehouses.find((w) => w.id === id)?.name ?? id

  const actionButtons = (
    <>
      {canCreate && (
        <Button className={ACTION_BTN} onClick={() => setNewOpen(true)}>
          <Plus />
          Nuevo pedido
        </Button>
      )}
      {canInvoice && (
        <Button
          variant={canCreate ? 'outline' : 'default'}
          className={ACTION_BTN}
          onClick={() => setSiigoOpen(true)}
        >
          <FileSpreadsheet />
          Cargar facturas de Siigo
        </Button>
      )}
    </>
  )

  const empty = (() => {
    if (query.trim()) {
      return {
        icon: Search,
        title: `Sin resultados para «${query.trim()}»`,
        text: 'Prueba con el nombre del cliente, el NIT o el número de factura o de pedido.',
        action: (
          <Button
            variant='outline'
            className={ACTION_BTN}
            onClick={() => changeQuery('')}
          >
            Limpiar búsqueda
          </Button>
        ),
      }
    }
    const start = canCreate || canInvoice
    switch (tab) {
      case 'sin_facturar':
        return {
          icon: CircleCheck,
          title: 'Todo está facturado',
          text: 'Los pedidos nuevos aparecen aquí hasta que caja registre su factura.',
          action: undefined,
        }
      case 'por_entregar':
        return {
          icon: Inbox,
          title: 'No hay facturas por entregar',
          text: start
            ? 'Crea un pedido y factúralo, o carga las facturas del día desde Siigo.'
            : 'Cuando caja facture un pedido, aparecerá aquí listo para entregar.',
          action: start ? (
            <div className='mt-2 flex flex-wrap justify-center gap-2'>
              {actionButtons}
            </div>
          ) : undefined,
        }
      case 'atrasados':
        return {
          icon: CircleCheck,
          title: 'Nada atrasado',
          text: `Ninguna factura lleva más de ${PICKUP_OVERDUE_DAYS} días sin entregarse.`,
          action: undefined,
        }
      case 'entregados':
        return {
          icon: Inbox,
          title: 'Aún no hay entregas completas',
          text: 'Cuando se entregue toda la mercancía de una factura, aparecerá aquí.',
          action: undefined,
        }
      case 'anulados':
        return {
          icon: Inbox,
          title: 'No hay facturas anuladas',
          text: 'Aquí quedan las facturas anuladas y los pedidos cancelados.',
          action: undefined,
        }
      default:
        return {
          icon: Inbox,
          title: 'Todavía no hay pedidos',
          text: start
            ? 'Crea el primero o carga las facturas del día desde Siigo.'
            : 'Cuando los asesores creen pedidos o se carguen las facturas, los verás aquí.',
          action: start ? (
            <div className='mt-2 flex flex-wrap justify-center gap-2'>
              {actionButtons}
            </div>
          ) : undefined,
        }
    }
  })()

  return (
    <div className='space-y-5'>
      <PageHeader
        title='Pedidos y facturas'
        actions={canCreate || canInvoice ? actionButtons : undefined}
      />

      <StatStrip
        items={[
          {
            label: 'Sin facturar',
            value: String(unbilled.length),
            tone: unbilled.length > 0 ? 'warning' : undefined,
            hint: unbilled.length > 0 ? 'Entrega bloqueada' : undefined,
          },
          {
            label: 'Por entregar',
            value: String(toDeliver.length),
            hint: cop(pendingCOP),
          },
          {
            label: `Atrasados (> ${PICKUP_OVERDUE_DAYS} días)`,
            value: String(overdue.length),
            tone: overdue.length > 0 ? 'danger' : undefined,
          },
          { label: 'Entregados', value: String(delivered.length) },
        ]}
      />

      <div className='space-y-3'>
        <FilterTabs value={tab} onChange={changeTab} options={tabs} />

        <Section flush>
          <div className='border-b p-3 sm:px-5'>
            <label className='relative block'>
              <span className='sr-only'>
                Buscar por cliente, NIT, factura o pedido
              </span>
              <Search className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                className='h-11 ps-9 pe-10 sm:h-10'
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
                placeholder='Cliente, NIT, factura o pedido'
                autoComplete='off'
              />
              {query && (
                <button
                  type='button'
                  aria-label='Borrar búsqueda'
                  onClick={() => changeQuery('')}
                  className='absolute end-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground'
                >
                  <X className='size-4' />
                </button>
              )}
            </label>
          </div>
          {visible.length === 0 ? (
            <EmptyState
              icon={empty.icon}
              title={empty.title}
              text={empty.text}
              action={empty.action}
            />
          ) : (
            <ul className='divide-y'>
              {visible.map((v) => (
                <li key={v.order.id}>
                  <OrderRow
                    view={v}
                    warehouseName={warehouseName(v.order.warehouse)}
                    onOpen={() => setSelectedId(v.order.id)}
                  />
                </li>
              ))}
            </ul>
          )}
          {list.length > visible.length && (
            <div className='border-t p-3 text-center'>
              <Button
                variant='ghost'
                className={ACTION_BTN}
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
              >
                Mostrar {Math.min(PAGE_SIZE, list.length - visible.length)} más
                de {list.length - visible.length} restantes
              </Button>
            </div>
          )}
        </Section>
      </div>

      <OrderDetailSheet
        orderId={selectedId}
        onClose={() => setSelectedId(null)}
        onInvoice={setInvoiceFor}
        onVoid={setVoidFor}
        onCancel={setCancelFor}
        onGoToPickup={onGoToPickup}
      />

      {canCreate && (
        <NewOrderDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          onCreated={(id, andInvoice) => {
            changeTab('todos')
            changeQuery('')
            if (andInvoice) setInvoiceFor(id)
            else setSelectedId(id)
          }}
        />
      )}
      {canInvoice && (
        <>
          <SiigoImportDialog
            open={siigoOpen}
            onOpenChange={setSiigoOpen}
            onImported={(r) => {
              changeQuery('')
              changeTab(r.imported > 0 ? 'por_entregar' : 'anulados')
            }}
          />
          <InvoiceDialog
            orderId={invoiceFor}
            onClose={() => setInvoiceFor(null)}
            onDone={(id) => setSelectedId(id)}
          />
          <VoidInvoiceDialog
            orderId={voidFor}
            onClose={() => setVoidFor(null)}
          />
        </>
      )}
      <CancelOrderDialog
        orderId={cancelFor}
        onClose={() => setCancelFor(null)}
      />
    </div>
  )
}

function OrderRow({
  view,
  warehouseName,
  onOpen,
}: {
  view: OrderView
  warehouseName: string
  onOpen: () => void
}) {
  const { order } = view
  const pill = pillFor(view)
  const showBar =
    view.deliveredPct > 0 &&
    (view.state === 'parcial' ||
      view.state === 'atrasado' ||
      view.state === 'anulado')
  const staleUnbilled = view.state === 'sin_facturar' && view.ageDays > 7

  return (
    <ListRow onClick={onOpen}>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'>
        <div className='min-w-0 flex-1'>
          <div className='truncate font-semibold'>{order.customer}</div>
          <div className='truncate text-sm text-muted-foreground'>
            {order.invoice ? (
              order.invoice.number
            ) : (
              <>
                <span className='font-medium text-warning-ink'>
                  Sin factura
                </span>
                {` · ${order.id}`}
              </>
            )}
            {` · ${order.channel} · ${warehouseName}`}
            {staleUnbilled && ` · hace ${view.ageDays} días`}
          </div>
        </div>
        <div className='flex items-center justify-between gap-3 sm:gap-4'>
          <span className='font-medium tabular-nums sm:w-32 sm:text-end'>
            {cop(view.totalCOP)}
          </span>
          <div className='sm:flex sm:w-48 sm:justify-end'>
            <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
          </div>
        </div>
      </div>
      {showBar && (
        <ProgressBar
          value={view.deliveredPct}
          size='sm'
          tone={pill.tone}
          className='mt-2.5'
        />
      )}
    </ListRow>
  )
}
