export function SkeletonLines({ count = 4 }: { count?: number }) {
  return (
    <div className="stack" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton skeleton-block" />
      ))}
    </div>
  );
}
