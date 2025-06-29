"use client";

import { useEffect, useState } from 'react';

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
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      const sections = items.flatMap(item => [
        item.id,
        ...(item.subItems?.map(sub => sub.id) || [])
      ]);

      // Find which section is currently in view
      let currentSection = '';
      
      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Consider a section "active" if its top is above 150px from top
          // (to account for when user scrolls past a section)
          if (rect.top <= 150) {
            currentSection = sectionId;
          }
        }
      }

      setActiveSection(currentSection);
    };

    // Initial check
    handleScroll();

    // Find the scrollable container
    const scrollContainer = document.getElementById('evaluation-content');
    
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    } else {
      // Fallback to window scroll
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [items]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="hidden lg:block w-64 flex-shrink-0 h-full overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Contents</h3>
        <ul className="space-y-2">
          {items.map((item) => {
            const isItemActive = activeSection === item.id || 
                               item.subItems?.some(sub => sub.id === activeSection);
            
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`block py-2 px-3 text-sm rounded-md transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : isItemActive
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
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
                          className={`block py-1 px-3 text-xs rounded transition-colors ${
                            subItem.level === 2 ? 'ml-3' : ''
                          } ${
                            activeSection === subItem.id
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : subItem.level === 1
                              ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                          }`}
                          onClick={(e) => handleClick(e, subItem.id)}
                        >
                          {subItem.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}