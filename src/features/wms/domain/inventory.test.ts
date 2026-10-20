import { describe, expect, it } from 'vitest'
import {
  APPROVAL_THRESHOLD_COP,
  allocateFefo,
  canApproveByRole,
  computeBuckets,
  convertBaseToSecondary,
  convertSecondaryToBase,
  formatQtyWithEquivalent,
  move,
  needsHigherApproval,
  totalPhysicalPartida,
  type Movement,
  type Partida,
  type SkuItem,
} from './inventory'

const sampleSkus: SkuItem[] = [
  {
    sku: 'POR-60120-CAL',
    name: 'Porcelanato Calacatta 60x120 cm',
    category: 'Porcelanato',
    unitMeasure: 'Caja',
    unitCost: 25,
    requiresExpiry: false,
  },
  {
    sku: 'ADH-FLEX-25K',
    name: 'Adhesivo Polimérico Saco 25 kg',
    category: 'Adhesivos',
    unitMeasure: 'Saco',
    unitCost: 10,
    requiresExpiry: true,
  },
]

function makePartidas(): Partida[] {
  return [
    {
      id: 'PAR-01',
      sku: 'ADH-FLEX-25K',
      warehouse: 'BOD-MOR-04',
      expiry: '2026-11-10',
      lastOutAt: '2026-08-01',
      receivedAt: '2026-05-10',
      supplier: 'Morteros Andes',
      qty: { disponible: 40, reservado: 0, danado: 0, reclamo: 0, transito: 0 },
    },
    {
      id: 'PAR-02',
      sku: 'ADH-FLEX-25K',
      warehouse: 'BOD-MOR-04',
      expiry: '2027-03-15',
      lastOutAt: '2026-10-15',
      receivedAt: '2026-09-20',
      supplier: 'Morteros Andes',
      qty: { disponible: 100, reservado: 0, danado: 0, reclamo: 0, transito: 0 },
    },
    {
      id: 'PAR-03',
      sku: 'POR-60120-CAL',
      warehouse: 'BOD-CEN-01',
      expiry: null,
      lastOutAt: '2026-07-10',
      receivedAt: '2026-06-01',
      supplier: 'Foshan Ceramics',
      qty: { disponible: 200, reservado: 50, danado: 4, reclamo: 6, transito: 0 },
    },
  ]
}

describe('domain/inventory', () => {
  it('conserva las unidades entre estados y salidas definitivas', () => {
    let partidas: Partida[] = [
      {
        id: 'P-100',
        sku: 'POR-60120-CAL',
        warehouse: 'BOD-CEN-01',
        expiry: null,
        lastOutAt: '2026-10-01',
        receivedAt: '2026-10-01',
        supplier: 'Proveedor X',
        qty: { disponible: 0, reservado: 0, danado: 0, reclamo: 0, transito: 0 },
      },
    ]
    const movements: Movement[] = []

    const apply = (params: Parameters<typeof move>[1]) => {
      const res = move(partidas, params)
      partidas = res.partidas
      movements.push(res.movement)
    }

    // Ingreso de 100 uds (96 disponibles + 4 en reclamo)
    apply({
      partidaId: 'P-100',
      from: null,
      to: 'disponible',
      qty: 96,
      type: 'Ingreso',
      ref: 'OC-1',
      user: 'OPE',
    })
    apply({
      partidaId: 'P-100',
      from: null,
      to: 'reclamo',
      qty: 4,
      type: 'Reclamo',
      ref: 'OC-1',
      user: 'OPE',
    })
    // Reserva 30 y entrega 20
    apply({
      partidaId: 'P-100',
      from: 'disponible',
      to: 'reservado',
      qty: 30,
      type: 'Reserva',
      ref: 'PED-1',
      user: 'JB',
    })
    apply({
      partidaId: 'P-100',
      from: 'reservado',
      to: null,
      qty: 20,
      type: 'Entrega',
      ref: 'PED-1',
      user: 'OPE',
      outDateStr: '2026-10-20',
    })
    // Daño de 5 y baja de 3
    apply({
      partidaId: 'P-100',
      from: 'disponible',
      to: 'danado',
      qty: 5,
      type: 'Daño',
      ref: 'DMG-1',
      user: 'OPE',
    })
    apply({
      partidaId: 'P-100',
      from: 'danado',
      to: null,
      qty: 3,
      type: 'Baja',
      ref: 'DMG-1',
      user: 'JB',
    })

    const entries = movements
      .filter((m) => m.fromState === null && m.toState !== null)
      .reduce((s, m) => s + m.qty, 0)
    const exits = movements
      .filter((m) => m.fromState !== null && m.toState === null)
      .reduce((s, m) => s + m.qty, 0)
    const physicalNow = totalPhysicalPartida(partidas[0])

    expect(entries).toBe(100)
    expect(exits).toBe(23)
    expect(physicalNow + exits).toBe(entries)
    expect(partidas[0].lastOutAt).toBe('2026-10-20')
  })

  it('rechaza movimientos que dejarían un estado en negativo', () => {
    const partidas = makePartidas()
    expect(() =>
      move(partidas, {
        partidaId: 'PAR-01',
        from: 'disponible',
        to: 'reservado',
        qty: 41,
        type: 'Reserva',
        ref: 'PED-99',
        user: 'JB',
      })
    ).toThrow(/Stock insuficiente/)
  })

  it('asigna primero la partida que vence antes (FEFO) y reparte entre varias partidas', () => {
    const partidas = makePartidas()
    const allocs = allocateFefo(partidas, 'ADH-FLEX-25K', 'BOD-MOR-04', 65)
    expect(allocs).toEqual([
      { partidaId: 'PAR-01', qty: 40, expiry: '2026-11-10' },
      { partidaId: 'PAR-02', qty: 25, expiry: '2027-03-15' },
    ])
  })

  it('calcula los 6 bloques de mercancía sin duplicar partidas que son rezagadas y por vencer a la vez', () => {
    const partidas = makePartidas()
    const buckets = computeBuckets(
      {
        skus: sampleSkus,
        partidas,
        orders: [
          {
            id: 'PED-01',
            createdAt: '2026-10-05',
            readyAt: '2026-10-10',
            customer: 'Constructora Sur',
            customerRut: '76.111.222-3',
            channel: 'Obra',
            warehouse: 'BOD-CEN-01',
            status: 'Preparado',
            lines: [{ sku: 'POR-60120-CAL', qtyOrdered: 50, qtyPickedUp: 0, allocations: [] }],
            pickups: [],
          },
        ],
        damages: [],
        claims: [],
        adjustments: [],
        movements: [
          {
            id: 'M-1',
            ts: '2026-10-18 10:00',
            type: 'Ajuste conteo',
            partidaId: 'PAR-03',
            sku: 'POR-60120-CAL',
            warehouse: 'BOD-CEN-01',
            fromState: 'disponible',
            toState: null,
            qty: 3,
            ref: 'AJ-1',
            user: 'JB',
          },
        ],
      },
      ['BOD-MOR-04', 'BOD-CEN-01'],
      '2026-10-20'
    )

    // PAR-01 (40 uds * $10) es rezagada (80 días sin salida) Y vence en 21 días (<=30d)
    // PAR-03 (200 uds * $25) es crítica rezagada (102 días sin salida)
    expect(buckets.rezagadaPorVencer.stalePartidasCount).toBe(2)
    expect(buckets.rezagadaPorVencer.criticalStaleCount).toBe(1)
    expect(buckets.rezagadaPorVencer.expiringSoonCount).toBe(1)
    // Suma una sola vez PAR-01 (40) + PAR-03 (200) = 240 unidades
    expect(buckets.rezagadaPorVencer.units).toBe(240)
    expect(buckets.rezagadaPorVencer.valueUSD).toBe(40 * 10 + 200 * 25)

    // Pedido listo el 2026-10-10 lleva 10 días (> 7 días)
    expect(buckets.porEntregar.overdueOrdersCount).toBe(1)
    expect(buckets.perdidaMes.units).toBe(3)
    expect(buckets.perdidaMes.valueUSD).toBe(75)
  })

  it('respeta el umbral de aprobación por rol en COP', () => {
    expect(needsHigherApproval(APPROVAL_THRESHOLD_COP)).toBe(false)
    expect(needsHigherApproval(APPROVAL_THRESHOLD_COP + 1)).toBe(true)

    expect(canApproveByRole('JB', 1_200_000)).toBe(true)
    expect(canApproveByRole('JB', 1_200_001)).toBe(false)
    expect(canApproveByRole('GER', 1_200_000)).toBe(false)
    expect(canApproveByRole('GER', 1_200_001)).toBe(true)
    expect(canApproveByRole('ADM', 50_000_000)).toBe(true)
    expect(canApproveByRole('OPE', 100_000)).toBe(false)
  })

  it('calcula conversiones de unidades y formatea equivalencias correctamente', () => {
    // 50 Cajas de Porcelanato 1.44 m²/caja
    expect(convertBaseToSecondary(50, 1.44)).toBe(72.0)
    // 72 m² / 1.44 = 50 Cajas
    expect(convertSecondaryToBase(72, 1.44)).toBe(50.0)

    const skuWithConv: SkuItem = {
      sku: 'POR-TEST',
      name: 'Porcelanato Test',
      category: 'Porcelanatos',
      unitMeasure: 'Caja',
      unitCost: 100000,
      requiresExpiry: false,
      conversions: [{ targetUnit: 'm²', factor: 1.44 }],
    }

    const formatted = formatQtyWithEquivalent(50, skuWithConv)
    expect(formatted).toContain('50')
    expect(formatted).toContain('cajas')
    expect(formatted).toContain('72')
    expect(formatted).toContain('m²')

    const skuWithoutConv: SkuItem = {
      sku: 'MISC-TEST',
      name: 'Item Simple',
      category: 'Otros',
      unitMeasure: 'Unidad',
      unitCost: 5000,
      requiresExpiry: false,
    }
    expect(formatQtyWithEquivalent(10, skuWithoutConv)).toBe('10 unidads')
  })
})

