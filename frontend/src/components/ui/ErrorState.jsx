const ErrorState = ({ title = 'Request failed', message, action }) => {
  return (
    <div className="ui-error-state" role="alert">
      <div className="ui-error-title">{title}</div>
      {message && <div className="ui-error-message">{message}</div>}
      {action && <div className="ui-error-action">{action}</div>}
    </div>
  );
};

export default ErrorState;
