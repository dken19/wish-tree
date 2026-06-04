import type { Metadata } from 'next'
import { Suspense } from 'react'
import WishesView from './WishesView'

export const metadata: Metadata = {
  title: 'Tất cả điều ước',
  description:
    'Xem tất cả điều ước đã đăng trên Cây Ước Nguyện — lọc theo chủ đề và lật từng trang.',
  alternates: { canonical: '/dieu-uoc' },
}

export default function DieuUocPage() {
  return (
    <Suspense fallback={null}>
      <WishesView />
    </Suspense>
  )
}
