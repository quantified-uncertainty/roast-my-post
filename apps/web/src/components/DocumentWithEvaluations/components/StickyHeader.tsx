interface StickyHeaderProps {
  children?: React.ReactNode;
}

export function StickyHeader({ children }: StickyHeaderProps) {
  return (
    <div className="sticky top-0 z-40 border-b border-gray-300 bg-slate-100 px-4 py-2">
      {children}
    </div>
  );
}
