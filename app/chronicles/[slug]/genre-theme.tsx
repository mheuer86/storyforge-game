'use client'

import { useEffect } from 'react'

export function GenreTheme({ genre }: { genre: string }) {
  useEffect(() => {
    document.body.setAttribute('data-genre', genre)
    return () => {
      document.body.removeAttribute('data-genre')
    }
  }, [genre])
  return null
}
