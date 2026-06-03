import type { Metadata } from 'next'
import SkillsView from './SkillsView'

export const metadata: Metadata = {
  title: 'Kỹ năng sống · Cây Ước Nguyện',
  description:
    'Học vài kỹ năng nấu nướng và trồng trọt cơ bản cho học sinh: nấu cơm, luộc rau, làm giá đỗ, trồng rau ban công…',
}

export default function KyNangPage() {
  return <SkillsView />
}
