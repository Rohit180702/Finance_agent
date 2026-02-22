const Input = ({ label, hint, error, id, className = '', ...props }) => {
  return (
    <label className={`ui-field ${className}`.trim()} htmlFor={id}>
      {label && <span className="ui-field-label">{label}</span>}
      <input id={id} className={`ui-input ${error ? 'is-error' : ''}`.trim()} {...props} />
      {hint && !error && <span className="ui-field-hint">{hint}</span>}
      {error && <span className="ui-field-error">{error}</span>}
    </label>
  );
};

export default Input;
