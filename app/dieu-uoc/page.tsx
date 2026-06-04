import type { Metadata } from 'next'
import { Suspense } from 'react'
import WishesView from './WishesView'

export const metadata: Metadata = {
  title: 'Tất cả điều ước — đọc điều ước của mọi người',
  description:
    'Đọc tất cả điều ước mọi người đã viết và thả lên Cây Ước Nguyện — lọc theo chủ đề (tình yêu, học hành, gia đình, sức khoẻ…) và lật từng trang.',
  alternates: { canonical: '/dieu-uoc' },
}

export default function DieuUocPage() {
  return (
    <Suspense fallback={null}>
      <WishesView />
    </Suspense>
  )
}
