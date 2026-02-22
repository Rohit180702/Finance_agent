const Select = ({ label, hint, error, id, className = '', children, ...props }) => {
  return (
    <label className={`ui-field ${className}`.trim()} htmlFor={id}>
      {label && <span className="ui-field-label">{label}</span>}
      <span className="ui-select-wrap">
        <select id={id} className={`ui-select ${error ? 'is-error' : ''}`.trim()} {...props}>
          {children}
        </select>
      </span>
      {hint && !error && <span className="ui-field-hint">{hint}</span>}
      {error && <span className="ui-field-error">{error}</span>}
    </label>
  );
};

export default Select;
