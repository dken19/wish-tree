'use client'
import dynamic from 'next/dynamic'
import { useScene } from '@/store/useScene'
import DataBridge from './DataBridge'
import PresenceBridge from './PresenceBridge'
import FakePresence from './FakePresence'
import AuthBridge from './AuthBridge'
import SkyBackdrop from './ui/SkyBackdrop'
import WeatherPanel from './ui/WeatherPanel'
import WishCard from './ui/WishCard'
import Composer from './ui/Composer'
import FocusHUD from './ui/FocusHUD'
import NavDock from './ui/NavDock'
import Toast from './ui/Toast'
import Loader from './ui/Loader'

// Canvas chỉ render ở client (Three.js cần window)
const WishTreeCanvas = dynamic(() => import('./WishTreeCanvas'), {
  ssr: false,
  loading: () => null,
})

export default function HomeClient() {
  const roomOpen = useScene((s) => s.roomOpen)
  return (
    <>
      <SkyBackdrop />
      <div id="grain" />
      <WishTreeCanvas />
      <DataBridge />
      <PresenceBridge />
      <FakePresence />
      <AuthBridge />

      {/* Lớp giao diện — ẩn tiêu đề + hint khi vào phòng ôn bài */}
      {!roomOpen && (
        <div className="ui brand">
          <h1>Cây Ước Nguyện</h1>
          <p>Thả một điều ước vào gió</p>
        </div>
      )}

      <WeatherPanel />

      {!roomOpen && (
        <div className="ui hint">
          ✨ Chạm <b>tờ giấy</b> để đọc · mở <b>cuộn bí kíp</b> góc dưới để viết điều ước, vào
          phòng ôn bài hay học kỹ năng sống
        </div>
      )}

      <WishCard />
      <Composer />
      <FocusHUD />
      <NavDock />
      <Toast />
      <Loader />
    </>
  )
}
