import { useLocation } from 'react-router-dom'
import { useRef, useEffect, useState } from 'react'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [visible, setVisible] = useState(true)
  const prevPath = useRef(location.pathname)

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname
      setVisible(false)
      // Trigger re-fade after a tick
      requestAnimationFrame(() => setVisible(true))
    }
  }, [location.pathname])

  return (
    <div className={visible ? 'animate-fadeIn' : 'opacity-0'}>
      {children}
    </div>
  )
}
