const Skeleton = ({ className = '' }) => {
  return <div className={`ui-skeleton ${className}`.trim()} aria-hidden="true" />;
};

export default Skeleton;
