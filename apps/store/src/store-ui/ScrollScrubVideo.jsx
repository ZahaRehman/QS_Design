import { useEffect, useMemo, useRef, useState } from 'react'

const clamp01 = (n) => Math.min(1, Math.max(0, n))

/**
 * Scroll-scrubbed video:
 * - Video stays paused.
 * - While the user scrolls through this block, we map scroll progress to `video.currentTime`.
 * - Scrolling down increases time, scrolling up decreases time (backward by seeking).
 */
const ScrollScrubVideo = ({
  videoSrc,
  className = '',
  // Optional poster to avoid blank area before metadata loads.
  poster,
}) => {
  const wrapperRef = useRef(null)
  const videoRef = useRef(null)

  const inViewRef = useRef(false)
  const rafRef = useRef(null)

  const [duration, setDuration] = useState(0)
  const [isReady, setIsReady] = useState(false)

  const src = useMemo(() => videoSrc, [videoSrc])

  useEffect(() => {
    const wrapper = wrapperRef.current
    const video = videoRef.current
    if (!wrapper || !video) return

    const onLoadedMetadata = () => {
      const d = Number(video.duration)
      if (!Number.isFinite(d) || d <= 0) return
      setDuration(d)
      setIsReady(true)
      video.pause()
    }

    video.addEventListener('loadedmetadata', onLoadedMetadata)

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        inViewRef.current = !!entry?.isIntersecting
      },
      { threshold: 0.1 },
    )

    obs.observe(wrapper)

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      obs.disconnect()
    }
  }, [])

  useEffect(() => {
    const wrapper = wrapperRef.current
    const video = videoRef.current
    if (!wrapper || !video) return
    if (!isReady || !duration) return

    let lastProgress = -1

    const seekToProgress = (progress01) => {
      const progress = clamp01(progress01)
      // Avoid excessive seeks for tiny scroll changes.
      if (Math.abs(progress - lastProgress) < 0.0005) return
      lastProgress = progress

      const targetTime = progress * duration
      // Seek then pause so the frame updates, without "playing".
      try {
        video.currentTime = targetTime
      } catch {
        // Some browsers can throw if seek happens before enough buffering.
      }
      video.pause()
    }

    const update = () => {
      if (!inViewRef.current) return

      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0
      const rectTop = wrapper.getBoundingClientRect().top
      const start = rectTop + scrollTop
      const end = start + wrapper.offsetHeight - window.innerHeight
      const denom = end - start
      if (denom <= 0) return

      const progress = (scrollTop - start) / denom
      seekToProgress(progress)
    }

    const onScroll = () => {
      if (rafRef.current) return
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null
        update()
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    // Initial seek if the block starts in view.
    update()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
    }
  }, [duration, isReady])

  return (
    <section ref={wrapperRef} className={`relative w-full h-[200vh] md:h-[160vh] ${className}`}>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src={src}
          poster={poster}
          muted
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          // No controls: user should scrub with scrolling.
        />
      </div>
    </section>
  )
}

export default ScrollScrubVideo

