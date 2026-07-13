import { Link } from 'react-router-dom';

export default function BottomActions({ actions }) {
  if (!actions || !actions.length) return null;
  return (
    <div className="flex gap-3 mt-4">
      {actions.map((a, i) => (
        <Link key={i} to={a.to} className={a.variant === 'primary' ? 'btn-primary flex-1 text-center' : 'btn-secondary flex-1 text-center'}>
          {a.label}
        </Link>
      ))}
    </div>
  );
}
