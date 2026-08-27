import { useState, useRef, useEffect } from "react"

interface Options {
  width?: number
  edge?: number
  breakpoint?: number
}

export function useSwipeDrawer({ width: SIDEBAR_W = 256, edge = 32, breakpoint = 1024 }: Options = {}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const draggingRef = useRef(false)
  const startXRef = useRef<number | null>(null)

  // lock body scroll when drawer open
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= breakpoint) return
    const x = e.touches[0].clientX
    startXRef.current = x
    if (!mobileOpen && x > edge) return
    draggingRef.current = true
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current || startXRef.current === null) return
    const cur = e.touches[0].clientX
    const delta = cur - startXRef.current
    if (!mobileOpen) {
      const off = Math.max(0, Math.min(delta, SIDEBAR_W))
      setDragOffset(off)
    } else {
      const off = Math.min(0, Math.max(delta, -SIDEBAR_W))
      setDragOffset(SIDEBAR_W + off)
    }
  }

  const onTouchEnd = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    if (!mobileOpen) {
      if (dragOffset > SIDEBAR_W * 0.35) setMobileOpen(true)
    } else {
      if (dragOffset < SIDEBAR_W * 0.65) setMobileOpen(false)
    }
    setDragOffset(0)
    startXRef.current = null
  }

  const isDragging = draggingRef.current || dragOffset !== 0
  const sidebarStyle = isDragging
    ? { transform: `translateX(${dragOffset - SIDEBAR_W}px)` }
    : undefined
  const backdropOpacity = isDragging ? (dragOffset / SIDEBAR_W) * 0.5 : undefined

  return {
    mobileOpen,
    setMobileOpen,
    dragOffset,
    isDragging,
    sidebarStyle,
    backdropOpacity,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  }
}
