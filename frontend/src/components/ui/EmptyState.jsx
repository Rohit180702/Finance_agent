const EmptyState = ({ title, description, action }) => {
  return (
    <div className="ui-empty-state">
      <div className="ui-empty-graphic" aria-hidden="true">
        <span className="dot dot-a" />
        <span className="dot dot-b" />
        <span className="dot dot-c" />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="ui-empty-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
