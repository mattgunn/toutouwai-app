import { Link } from 'react-router-dom'

export default function LinkSent() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
        <p className="text-gray-400 text-sm mb-6">
          If this is a registered email, a login link has been sent. Click the link to sign in.
        </p>
        <Link to="/login" className="text-blue-400 hover:text-blue-300 text-sm">
          Back to login
        </Link>
      </div>
    </div>
  )
}
