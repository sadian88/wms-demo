import { createFileRoute } from '@tanstack/react-router'
import { WmsWorkspace } from '@/features/wms'

export const Route = createFileRoute('/_authenticated/wms/$code')({
  component: WmsScreenRoute,
})

function WmsScreenRoute() {
  const { code } = Route.useParams()
  return <WmsWorkspace screenSlug={code} />
}
