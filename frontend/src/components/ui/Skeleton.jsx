const Skeleton = ({ className = '', style }) => {
  return <div className={`ui-skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
};

export default Skeleton;
