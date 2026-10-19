import { createFileRoute } from '@tanstack/react-router'
import { WmsWorkspace } from '@/features/wms'

export const Route = createFileRoute('/_authenticated/')({
  component: () => <WmsWorkspace screenSlug='1-1' />,
})
