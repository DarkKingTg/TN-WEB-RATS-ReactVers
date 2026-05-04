import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

// Scroll-triggered reveal wrapper
export const ScrollReveal = ({ 
  children, 
  direction = 'up', 
  delay = 0, 
  duration = 0.9,
  className = '' 
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  
  const directions = {
    up: { y: 60, x: 0 },
    down: { y: -60, x: 0 },
    left: { y: 0, x: 60 },
    right: { y: 0, x: -60 },
    scale: { scale: 0.8 },
    fade: { y: 0, x: 0 }
  };
  
  const initial = {
    opacity: 0,
    ...directions[direction]
  };
  
  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={isInView ? { opacity: 1, x: 0, y: 0, scale: 1 } : initial}
      transition={{ 
        duration, 
        delay, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Stagger children reveal
export const StaggerContainer = ({ 
  children, 
  staggerDelay = 0.1, 
  className = '' 
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Stagger item (use inside StaggerContainer)
export const StaggerItem = ({ children, direction = 'up', className = '' }) => {
  const directions = {
    up: { y: 40, x: 0 },
    left: { y: 0, x: 40 },
    right: { y: 0, x: -40 },
    scale: { scale: 0.9 }
  };
  
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, ...directions[direction] },
        visible: { 
          opacity: 1, 
          x: 0, 
          y: 0, 
          scale: 1,
          transition: {
            duration: 0.7,
            ease: [0.16, 1, 0.3, 1]
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Animated gradient text - using website theme colors
export const GradientText = ({ children, className = '', animate = true }) => {
  return (
    <motion.span
      className={`bg-gradient-to-r from-[#9BFF57] via-[#2F5E22] to-[#9BFF57] bg-clip-text text-transparent bg-[length:200%_auto] ${className}`}
      animate={animate ? { backgroundPosition: ['0% center', '200% center'] } : {}}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      style={{ backgroundSize: '200% auto' }}
    >
      {children}
    </motion.span>
  );
};

// Glow text effect - using website theme colors
export const GlowText = ({ children, className = '', color = 'primary' }) => {
  const colors = {
    primary: 'text-[#9BFF57] drop-shadow-[0_0_10px_rgba(155,255,87,0.8)]',
    secondary: 'text-[#2F5E22] drop-shadow-[0_0_10px_rgba(47,94,34,0.8)]',
    accent: 'text-[#9BFF57] drop-shadow-[0_0_10px_rgba(155,255,87,0.8)]',
    font: 'text-[#F4FFF1] drop-shadow-[0_0_10px_rgba(244,255,241,0.5)]',
  };
  
  // Fallback for legacy color names
  const safeColor = colors[color] ? color : 'primary';
  
  return (
    <span className={`${colors[safeColor]} ${className}`}>
      {children}
    </span>
  );
};

// Reveal text character by character
export const RevealText = ({ text, className = '', delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <motion.span ref={ref} className={className}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            duration: 0.4,
            delay: delay + i * 0.03,
            ease: [0.16, 1, 0.3, 1]
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
};

// Floating animation for decorative elements
export const FloatingElement = ({ children, delay = 0, className = '' }) => {
  return (
    <motion.div
      animate={{ 
        y: [0, -15, 0],
        rotate: [0, 2, -2, 0]
      }}
      transition={{ 
        duration: 4, 
        repeat: Infinity, 
        delay,
        ease: 'easeInOut'
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Scale on hover card
export const HoverLift = ({ children, className = '' }) => {
  return (
    <motion.div
      whileHover={{ 
        y: -8, 
        scale: 1.02,
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Magnetic button effect
export const MagneticButton = ({ children, className = '', strength = 0.3 }) => {
  const ref = useRef(null);
  
  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    ref.current.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };
  
  const handleMouseLeave = () => {
    if (ref.current) {
      ref.current.style.transform = 'translate(0, 0)';
    }
  };
  
  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
      className={className}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </motion.div>
  );
};

// Parallax scroll effect
export const ParallaxElement = ({ children, speed = 0.5, className = '' }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [100 * speed, -100 * speed]);
  
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
};

// Animated counter
export const AnimatedCounter = ({ target, suffix = '', prefix = '', duration = 2 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (isInView) {
      let start = 0;
      const increment = target / (duration * 60);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 1000 / 60);
      return () => clearInterval(timer);
    }
  }, [isInView, target, duration]);
  
  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
};
