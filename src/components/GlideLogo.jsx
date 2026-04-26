import logoSrc from '../assets/glide-logo.jpeg';

export default function GlideLogo({ size = 34, className = '' }) {
  return (
    <img
      src={logoSrc}
      alt="Glide"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain', borderRadius: 4 }}
    />
  );
}
