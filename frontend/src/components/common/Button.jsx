// Reaproveita as classes globais .btn/.btn-primary/.btn-outline já existentes (ver
// justificativa de arquitetura de CSS no README) — o componente centraliza a
// variação, mas a aparência continua vindo do mesmo lugar de sempre.
export default function Button({
  variant = 'default', // 'default' | 'primary' | 'outline'
  icon,
  loading = false,
  loadingLabel = 'Enviando...',
  className = '',
  children,
  disabled,
  ...rest
}) {
  const variantClass = variant === 'primary' ? 'btn-primary' : variant === 'outline' ? 'btn-outline' : '';

  return (
    <button className={`btn ${variantClass} ${className}`.trim()} disabled={disabled || loading} {...rest}>
      {loading ? (
        <>
          <i className="fa-solid fa-spinner fa-spin" /> {loadingLabel}
        </>
      ) : (
        <>
          {icon && <i className={`fa-solid ${icon}`} />} {children}
        </>
      )}
    </button>
  );
}
