import type { Metadata } from 'next'
import AccountView from './AccountView'

export const metadata: Metadata = {
  title: 'Điều ước của tôi',
  description: 'Quản lí những điều ước bạn đã treo lên Cây Ước Nguyện và đánh dấu điều nào đã đạt được.',
  alternates: { canonical: '/tai-khoan' },
  robots: { index: false, follow: false },
}

export default function TaiKhoanPage() {
  return <AccountView />
}
