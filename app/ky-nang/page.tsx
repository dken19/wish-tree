import type { Metadata } from 'next'
import SkillsView from './SkillsView'

export const metadata: Metadata = {
  title: 'Kỹ năng sống cho học sinh — nấu ăn, trồng trọt',
  description:
    'Học kỹ năng sống cơ bản cho học sinh: nấu cơm, luộc rau, làm giá đỗ, trồng rau ban công, chụp ảnh, chăm sóc da — kèm ảnh minh hoạ và nguồn Wikipedia.',
  alternates: { canonical: '/ky-nang' },
}

export default function KyNangPage() {
  return <SkillsView />
}
