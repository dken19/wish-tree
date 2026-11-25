import type { Metadata } from 'next'
import { Suspense } from 'react'
import FunnyView from './FunnyView'

export const metadata: Metadata = {
  title: 'Góc xàm xí — những điều ước không lên cây',
  description:
    'Những điều ước vui vui, xàm xàm mà Cây Ước Nguyện không treo lên cây, kèm lí do không duyệt của người giữ cây.',
  alternates: { canonical: '/xam-xi' },
}

export default function XamXiPage() {
  return (
    <Suspense fallback={null}>
      <FunnyView />
    </Suspense>
  )
}
