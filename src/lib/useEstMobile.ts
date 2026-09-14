import { useEffect, useState } from 'react'

const SEUIL = 640

/** true si la fenêtre est plus étroite que le seuil mobile (réactif au redimensionnement). */
export function useEstMobile(): boolean {
  const [estMobile, setEstMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < SEUIL
  )
  useEffect(() => {
    function onResize() {
      setEstMobile(window.innerWidth < SEUIL)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return estMobile
}
