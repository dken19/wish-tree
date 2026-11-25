import PageShell from './PageShell'

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
    <PageShell title={title} lead={`Cập nhật lần cuối ngày ${UPDATED_AT}.`}>
      <article className="pg-prose">{children}</article>
    </PageShell>
  )
}
