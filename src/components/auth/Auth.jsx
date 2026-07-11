import { useState } from 'react'
import { BarChart3, LockKeyhole, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

function mapAuthError(error) {
  const msg = error?.message?.toLowerCase() || ''
  if (msg.includes('invalid login credentials')) return 'Email atau kata sandi salah.'
  if (msg.includes('user already registered')) return 'Email ini sudah terdaftar. Coba masuk saja.'
  if (msg.includes('password') && msg.includes('at least')) return 'Kata sandi minimal 6 karakter.'
  if (msg.includes('email') && msg.includes('valid')) return 'Format email tidak valid.'
  if (msg.includes('network')) return 'Tidak bisa terhubung ke server. Periksa koneksi internet kamu.'
  return error?.message || 'Terjadi kesalahan. Coba lagi.'
}

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('masuk')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    setError('')
    setSuccessMessage('')
    setResetSent(false)
    setLoading(true)
    const action = mode === 'masuk'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { data, error } = await action
    setLoading(false)
    if (error) return setError(mapAuthError(error))
    if (mode === 'daftar' && !data?.session) {
      setSuccessMessage('Pendaftaran berhasil! Cek email kamu untuk konfirmasi akun, lalu masuk di sini.')
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) return setError('Isi email kamu dulu, baru klik "Lupa kata sandi?".')
    setError('')
    setSuccessMessage('')
    setResetSent(false)
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    setResetLoading(false)
    if (error) return setError(mapAuthError(error))
    setResetSent(true)
  }

  function toggleMode() {
    setMode(mode === 'masuk' ? 'daftar' : 'masuk')
    setError('')
    setSuccessMessage('')
    setResetSent(false)
  }

  return (
    <main className="auth-page">
      <style>{`
        .auth-page { min-height:100vh; display:grid; place-items:center; padding:24px; background:#f6f5f2; font-family:Inter, sans-serif; }
        .auth-card { width:min(100%, 980px); min-height:650px; display:grid; grid-template-columns:45% 55%; overflow:hidden; border:1px solid #deded9; border-radius:25px; background:#fff; box-shadow:0 22px 60px rgb(24 45 36 / 0.10); }
        .auth-brand { position:relative; display:flex; flex-direction:column; padding:48px; overflow:hidden; color:#fff; background:linear-gradient(155deg,#154535,#10362a); }
        .auth-brand::before { content:""; position:absolute; width:260px; height:260px; right:-128px; bottom:-115px; border:1px solid rgb(224 193 77 / .55); border-radius:50%; box-shadow:0 0 0 38px rgb(224 193 77 / .08),0 0 0 78px rgb(224 193 77 / .06); }
        .auth-wordmark { display:flex; align-items:center; gap:14px; font-size:16px; font-weight:700; letter-spacing:.045em; }
        .auth-monogram { display:grid; width:47px; height:47px; place-items:center; border:1px solid #e0c14d; border-radius:50%; color:#e0c14d; font-family:Georgia,serif; font-size:22px; font-weight:700; }
        .auth-copy { margin-top:120px; max-width:310px; }
        .auth-copy h1 { margin:0; font-family:Georgia,serif; font-size:48px; font-weight:500; line-height:1.09; letter-spacing:-.045em; }
        .auth-copy p { margin:20px 0 0; color:#dce8e1; font-size:16px; line-height:1.8; }
        .auth-benefits { position:relative; display:grid; gap:20px; margin-top:auto; padding-top:42px; }
        .auth-benefit { display:flex; align-items:flex-start; gap:13px; color:#f1f6f3; font-size:14px; line-height:1.45; }
        .auth-benefit svg { flex:none; margin-top:1px; color:#e8d277; }
        .auth-form-area { display:flex; align-items:center; justify-content:center; padding:48px 42px; background:#fff; }
        .auth-form { width:100%; max-width:420px; }
        .auth-eyebrow { margin:0; color:#bc890c; font-size:12px; font-weight:700; letter-spacing:.14em; }
        .auth-form h2 { margin:15px 0 0; color:#1d1c1a; font-family:Georgia,serif; font-size:37px; font-weight:500; letter-spacing:-.035em; }
        .auth-subtitle { margin:12px 0 37px; color:#929292; font-size:16px; }
        .auth-label-row { display:flex; justify-content:space-between; gap:10px; margin-bottom:10px; }
        .auth-label { color:#242424; font-size:14px; font-weight:600; }
        .auth-field { box-sizing:border-box; width:100%; margin-bottom:25px; padding:16px; border:1px solid #d5d5d5; border-radius:12px; background:#f6f6f6; color:#252525; font:inherit; font-size:16px; outline:none; }
        .auth-field:focus { border-color:#a77c0b; box-shadow:0 0 0 3px rgb(188 137 12 / .16); }
        .auth-link { padding:0; border:0; background:transparent; color:#ad7c0d; font:inherit; font-size:14px; cursor:pointer; }
        .auth-submit { width:100%; margin-top:-4px; padding:16px; border:0; border-radius:12px; background:#194a37; color:#fff; font:inherit; font-size:16px; font-weight:700; cursor:pointer; transition:background .2s; }
        .auth-submit:hover { background:#123b2c; }
        .auth-submit:disabled,.auth-link:disabled { cursor:not-allowed; opacity:.55; }
        .auth-divider { display:flex; align-items:center; gap:15px; margin:31px 0; color:#969696; font-size:13px; }
        .auth-divider::before,.auth-divider::after { content:""; flex:1; height:1px; background:#e4e4e4; }
        .auth-switch { margin:0; color:#959595; text-align:center; font-size:14px; }
        .auth-note { display:flex; align-items:flex-start; gap:10px; margin:36px 0 0; color:#929292; font-size:12px; line-height:1.55; }
        .auth-note svg { flex:none; margin-top:1px; color:#838383; }
        .auth-message { margin:-8px 0 18px; padding:10px 12px; border-radius:10px; font-size:12px; line-height:1.5; }
        .auth-message.success { background:#eaf4ed; color:#2a6948; }.auth-message.error { background:#faeae7; color:#9c3b2b; }
        @media (max-width:640px) {
          .auth-page { display:grid; min-height:100vh; padding:16px; background:#f7f7f5; }
          .auth-card { width:min(100%,448px); min-height:0; grid-template-columns:1fr; border-radius:29px; box-shadow:none; }
          .auth-brand { min-height:287px; padding:40px 31px; }
          .auth-brand::before { width:190px; height:190px; right:-72px; top:-78px; bottom:auto; box-shadow:0 0 0 28px rgb(224 193 77 / .08); }
          .auth-monogram { display:none; }
          .auth-wordmark { gap:0; color:#e8cf65; font-size:12px; letter-spacing:.14em; }
          .auth-copy { margin-top:48px; max-width:315px; }
          .auth-copy h1 { font-size:37px; line-height:1.08; }
          .auth-copy p { display:block; margin-top:15px; font-size:15px; line-height:1.65; }
          .auth-benefits { display:none; }
          .auth-form-area { align-items:flex-start; padding:39px 31px 49px; }
          .auth-form { max-width:none; }
          .auth-eyebrow { font-size:11px; letter-spacing:.13em; }
          .auth-form h2 { margin-top:14px; font-size:31px; }
          .auth-subtitle { margin:13px 0 35px; font-size:14px; }
          .auth-label-row { margin-bottom:9px; }
          .auth-label { font-size:14px; }
          .auth-field { margin-bottom:23px; padding:15px; font-size:16px; }
          .auth-submit { margin-top:-3px; padding:15px; }
          .auth-divider { display:none; }
          .auth-switch { margin-top:31px; font-size:14px; }
          .auth-note { margin-top:33px; font-size:12px; }
        }
      `}</style>

      <div className="auth-card">
        <section className="auth-brand">
          <div className="auth-wordmark"><span className="auth-monogram">PF</span><span>PERSONAL FINANCES</span></div>
          <div className="auth-copy">
            <h1>Uangmu, lebih terarah.</h1>
            <p>Catat, pahami, dan rencanakan keuangan pribadi dalam satu tempat yang tenang dan aman.</p>
          </div>
          <div className="auth-benefits">
            <div className="auth-benefit"><ShieldCheck size={18} /><span>Data pribadi terlindungi untuk akunmu</span></div>
            <div className="auth-benefit"><BarChart3 size={18} /><span>Ringkasan keuangan yang mudah dipahami</span></div>
          </div>
        </section>

        <section className="auth-form-area">
          <div className="auth-form">
            <p className="auth-eyebrow">{mode === 'masuk' ? 'SELAMAT DATANG KEMBALI' : 'MULAI PERJALANAN ANDA'}</p>
            <h2>{mode === 'masuk' ? 'Masuk ke akun Anda' : 'Buat akun baru'}</h2>
            <p className="auth-subtitle">{mode === 'masuk' ? 'Lanjutkan mengelola keuangan Anda hari ini.' : 'Mulai catat keuangan Anda dengan lebih terarah.'}</p>

            <form onSubmit={handleSubmit}>
              <div className="auth-label-row"><label className="auth-label" htmlFor="auth-email">Email</label></div>
              <input id="auth-email" className="auth-field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
              <div className="auth-label-row">
                <label className="auth-label" htmlFor="auth-password">Kata sandi</label>
                {mode === 'masuk' && <button type="button" className="auth-link" onClick={handleForgotPassword} disabled={resetLoading}>{resetLoading ? 'Mengirim…' : 'Lupa kata sandi?'}</button>}
              </div>
              <input id="auth-password" className="auth-field" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan kata sandi" />
              {resetSent && <p className="auth-message success">Kalau email itu terdaftar, kami sudah kirim tautan reset kata sandi. Cek email, termasuk folder spam.</p>}
              {successMessage && <p className="auth-message success">{successMessage}</p>}
              {error && <p className="auth-message error">{error}</p>}
              <button className="auth-submit" type="submit" disabled={loading}>{loading ? 'Memproses…' : mode === 'masuk' ? 'Masuk' : 'Buat akun'}</button>
            </form>

            <div className="auth-divider">atau</div>
            <p className="auth-switch">{mode === 'masuk' ? 'Belum punya akun?' : 'Sudah punya akun?'} <button type="button" className="auth-link" onClick={toggleMode}>{mode === 'masuk' ? 'Daftar sekarang' : 'Masuk di sini'}</button></p>
            <p className="auth-note"><LockKeyhole size={15} /><span>Data keuangan Anda diproses secara aman dan hanya dapat diakses oleh Anda.</span></p>
          </div>
        </section>
      </div>
    </main>
  )
}
