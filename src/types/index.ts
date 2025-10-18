// Common types for the Adoptrees application

export interface TechStack {
  name: string;
  color: string;
  icon: string;
  description?: string;
}

export interface AnimationVariants {
  hidden: {
    opacity: number;
    y?: number;
    x?: number;
    scale?: number;
  };
  visible: {
    opacity: number;
    y?: number;
    x?: number;
    scale?: number;
    transition?: {
      duration?: number;
      delay?: number;
      delayChildren?: number;
      staggerChildren?: number;
    };
  };
}

export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends ComponentProps {
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export interface CardProps extends ComponentProps {
  delay?: number;
  hoverable?: boolean;
}
