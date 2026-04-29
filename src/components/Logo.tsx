import logo from '@/assets/as-apt-logo.png';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
  rounded?: boolean;
}

/**
 * AS Apartment brand logo. Uses mix-blend-multiply on the white-ish
 * background of the source image so it blends naturally onto light surfaces.
 */
const Logo = ({ className, size = 32, rounded = true }: LogoProps) => {
  return (
    <img
      src={logo}
      alt="AS Apartment"
      width={size}
      height={size}
      className={cn(
        'object-contain select-none pointer-events-none',
        rounded && 'rounded-xl',
        className,
      )}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
};

export default Logo;