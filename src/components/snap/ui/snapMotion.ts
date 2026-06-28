import type { Variants } from "framer-motion";

/** Shared, reusable Framer Motion variants for the SNAP battle scene. */

export const SPRING_SNAPPY = { type: "spring", stiffness: 380, damping: 26 } as const;
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 24 } as const;
export const SPRING_POP = { type: "spring", stiffness: 420, damping: 14 } as const;

/** Card flip reveal: face-down → face-up with a half-way reveal. */
export const cardFlip: Variants = {
  hidden: { rotateY: 90, opacity: 0 },
  shown: { rotateY: 0, opacity: 1, transition: SPRING_SNAPPY },
};

/** Generic panel rise-in. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: SPRING_SOFT },
};

/** Score number pop. */
export const numberPop: Variants = {
  hidden: { scale: 1.7, opacity: 0.6 },
  shown: { scale: 1, opacity: 1, transition: SPRING_POP },
};
