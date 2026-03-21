import { motion } from 'framer-motion'

const MotionButton = motion.button
const MotionDiv = motion.div

const CategoryPills = ({ categories, activeCategoryId, onChange, disabled = false }) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
      {categories.map((cat) => (
        <MotionButton
          key={cat.id}
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange?.(cat.id)}
          className={`relative px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeCategoryId === cat.id
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground bg-muted'
          }`}
          disabled={disabled}
        >
          {activeCategoryId === cat.id && (
            <MotionDiv
              layoutId="activePill"
              className="absolute inset-0 rounded-full bg-primary"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            />
          )}
          <span className="relative z-10">{cat.name}</span>
        </MotionButton>
      ))}
    </div>
  )
}

export default CategoryPills

