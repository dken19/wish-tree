'use client'
import dynamic from 'next/dynamic'
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
        ✨ Chạm <b>tờ giấy</b> để đọc · chạm <b>bàn thư pháp</b> để viết điều ước
      </div>

      <WishCard />
      <Composer />
      <Toast />
      <Loader />
    </>
  )
}
