function Brand({ size = 'normal' }) {
  const logoHeight = size === 'large' ? 60 : 44;

  return (
    <span className={`brand brand-${size}`}>
      <img src="/logo.png" alt="Kenya Sugar Board" className="brand-icon" height={logoHeight} />
      <span className="brand-text">
        Kenya Sugar Board
        <span className="brand-sub">Signing Sheet System</span>
      </span>
    </span>
  );
}

export default Brand;
