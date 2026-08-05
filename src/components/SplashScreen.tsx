import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface SplashScreenProps {
  onDone: () => void
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [fading, setFading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 2600)
    const doneTimer = setTimeout(() => {
      onDone()
      navigate('/discover')
    }, 3000)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone, navigate])

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-white z-[9999] transition-opacity duration-400"
      style={{ opacity: fading ? 0 : 1, pointerEvents: fading ? 'none' : 'auto' }}
    >
      <img
        src="/image.jpeg"
        alt="여정"
        className="w-44 h-44 object-contain"
      />
    </div>
  )
}
