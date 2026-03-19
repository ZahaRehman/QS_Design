import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const MotionDiv = motion.div
const MotionSpan = motion.span
const MotionButton = motion.button

const Hero = ({ onExplore }) => {
  return (
    <section className="relative overflow-hidden min-h-[70vh] md:min-h-[85vh] flex items-center">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1400&h=900&fit=crop"
          alt="Featured artwork"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/50 to-transparent" />
      </div>

      <div className="container relative z-10">
        <MotionDiv
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-xl"
        >
          <MotionSpan
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-accent/90 text-accent-foreground mb-6"
          >
            Curated Collection 2026
          </MotionSpan>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-primary-foreground leading-[1.1] mb-6">
            Art That Speaks
            <br />
            <span className="italic text-accent">to Your Soul</span>
          </h1>

          <p className="text-primary-foreground/80 text-lg md:text-xl mb-8 leading-relaxed max-w-md">
            Discover handcrafted paintings and unique artworks from emerging artists around the world.
          </p>

          <MotionButton
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onExplore?.()}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-sm tracking-wide hover:bg-teal-light transition-colors"
          >
            Explore Gallery
            <ArrowRight className="w-4 h-4" />
          </MotionButton>
        </MotionDiv>
      </div>
    </section>
  )
}

export default Hero

