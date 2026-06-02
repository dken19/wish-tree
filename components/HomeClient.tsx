'use client'
import dynamic from 'next/dynamic'
import { useScene } from '@/store/useScene'
import DataBridge from './DataBridge'
import SkyBackdrop from './ui/SkyBackdrop'
import WeatherPanel from './ui/WeatherPanel'
import WishCard from './ui/WishCard'
import Composer from './ui/Composer'
import Toast from './ui/Toast'
import Loader from './ui/Loader'

// Canvas chỉ render ở client (Three.js cần window)
const WishTreeCanvas = dynamic(() => import('./WishTreeCanvas'), {
  ssr: false,
  loading: () => null,
})

export default function HomeClient() {
  const setComposerOpen = useScene((s) => s.setComposerOpen)

  return (
    <>
      <SkyBackdrop />
      <div id="grain" />
      <WishTreeCanvas />
      <DataBridge />

      {/* Lớp giao diện */}
      <div className="ui brand">
        <h1>Cây Ước Nguyện</h1>
        <p>Thả một điều ước vào gió</p>
      </div>

      <WeatherPanel />

      <div className="ui hint">
        ✨ Chạm vào tờ giấy <b>lấp lánh</b> để đọc điều ước
      </div>

      <div className="ui write">
        <button onClick={() => setComposerOpen(true)}>
          🪶&nbsp; Viết điều ước
        </button>
      </div>

      <WishCard />
      <Composer />
      <Toast />
      <Loader />
    </>
  )
}
