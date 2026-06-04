import type { Metadata } from 'next'
import SkillsView from './SkillsView'

export const metadata: Metadata = {
  title: 'Kỹ năng sống',
  description:
    'Học vài kỹ năng nấu nướng và trồng trọt cơ bản cho học sinh: nấu cơm, luộc rau, làm giá đỗ, trồng rau ban công…',
  alternates: { canonical: '/ky-nang' },
}

export default function KyNangPage() {
  return <SkillsView />
}
