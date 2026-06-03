import type { Metadata } from 'next'
import { Suspense } from 'react'
import WishesView from './WishesView'

export const metadata: Metadata = {
  title: 'Tất cả điều ước · Cây Ước Nguyện',
  description:
    'Xem tất cả điều ước đã đăng trên Cây Ước Nguyện — lọc theo chủ đề và lật từng trang.',
}

export default function DieuUocPage() {
  return (
    <Suspense fallback={null}>
      <WishesView />
    </Suspense>
  )
}
