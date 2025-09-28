import { useEffect, useMemo, useRef, useState } from 'react'

const slidesData = [
  {
    image: new URL('../../static/slide-1.jpg', import.meta.url).href,
    title: 'FORMU',
    desc: '为记忆，造实体',
  },
  {
    image: new URL('../../static/slide-2.jpg', import.meta.url).href,
    title: '珍视每个瞬间',
    desc: '将您的记忆化为可触摸的实体',
  },
  {
    image: new URL('../../static/slide-3.jpg', import.meta.url).href,
    title: '独一无二的礼物',
    desc: '为特别的人，献上最用心的定制',
  },
  {
    image: new URL('../../static/slide-4.jpg', import.meta.url).href,
    title: 'AI驱动创作',
    desc: '先进技术，为您精准还原每个细节',
  },
]

export default function HeroCarousel() {
  const [index, setIndex] = useState(0)
  const timerRef = useRef(null)
  const count = slidesData.length

  const go = (i) => setIndex((prev) => (i + count) % count)
  const next = () => go(index + 1)
  const prev = () => go(index - 1)

  // autoplay
  useEffect(() => {
    stop()
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % count), 5000)
    return stop
  }, [count])

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const onMouseEnter = () => stop()
  const onMouseLeave = () => {
    if (!timerRef.current) timerRef.current = setInterval(() => setIndex((i) => (i + 1) % count), 5000)
  }

  // 3D 堆叠布局不再需要横向平移 wrapper

  const classFor = (i) => {
    const prev = (index - 1 + count) % count
    const next = (index + 1) % count
    const prev2 = (index - 2 + count) % count
    const next2 = (index + 2) % count
    if (i === index) return 'swiper-slide active'
    if (i === prev) return 'swiper-slide prev'
    if (i === next) return 'swiper-slide next'
    if (i === prev2) return 'swiper-slide prev2'
    if (i === next2) return 'swiper-slide next2'
    return 'swiper-slide'
  }

  return (
    <header className="hero-carousel" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="swiper-container">
        <div className="swiper-wrapper">
          {slidesData.map((s, i) => (
            <div key={i} className={classFor(i)} style={{ backgroundImage: `url('${s.image}')` }}>
              <div className="slide-backdrop" />
              <div className="slide-content">
                <h1>{s.title}</h1>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="swiper-pagination">
          {slidesData.map((_, i) => (
            <button key={i} aria-label={`Go to slide ${i + 1}`} className={i === index ? 'bullet active' : 'bullet'} onClick={() => go(i)} />
          ))}
        </div>
        <button className="swiper-button-prev" aria-label="Previous" onClick={prev} />
        <button className="swiper-button-next" aria-label="Next" onClick={next} />
      </div>
    </header>
  )
}


