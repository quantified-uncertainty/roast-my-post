"use client";

interface SubNavItem {
  id: string;
  label: string;
  level: number;
}

interface NavItem {
  id: string;
  label: string;
  subItems?: SubNavItem[];
}

interface EvaluationNavigationProps {
  items: NavItem[];
}

export function EvaluationNavigation({ items }: EvaluationNavigationProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="hidden lg:block w-64 flex-shrink-0">
      <div className="sticky top-8">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Contents</h3>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="block py-2 px-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                onClick={(e) => handleClick(e, item.id)}
              >
                {item.label}
              </a>
              {item.subItems && item.subItems.length > 0 && (
                <ul className="mt-1 ml-4 space-y-1">
                  {item.subItems.map((subItem) => (
                    <li key={subItem.id}>
                      <a
                        href={`#${subItem.id}`}
                        className={`block py-1 px-3 text-xs transition-colors ${
                          subItem.level === 1
                            ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 ml-3'
                        } rounded`}
                        onClick={(e) => handleClick(e, subItem.id)}
                      >
                        {subItem.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}