import Link from 'next/link'

// Khung chung cho trang pháp lý tĩnh (chính sách bảo mật, điều khoản) — không mount Canvas.
// Google OAuth consent screen trỏ tới 2 trang này (privacy policy + terms of service).
export const CONTACT_EMAIL = 'khuctruonghuy2000@gmail.com'
export const UPDATED_AT = '25/11/2026'

export default function LegalPage({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="wishes-page">
      <div className="wishes-inner">
        <Link href="/" className="wishes-back">
          ← Về cây ước nguyện
        </Link>
        <header className="wishes-hero">
          <h1>{title}</h1>
          <p>Cập nhật lần cuối: {UPDATED_AT}</p>
        </header>
        <article className="legal-body">{children}</article>
      </div>
    </div>
  )
}
