'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo } from 'react';

interface TreeInfoButtonProps {
  treeId: string;
  className?: string;
  labelClassName?: string;
  iconClassName?: string;
}

function TreeInfoButton({
  treeId,
  className = '',
  labelClassName = 'text-xs font-semibold',
  iconClassName = 'w-3.5 h-3.5'
}: TreeInfoButtonProps) {
  const router = useRouter();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    if (window.innerWidth < 768) {
      router.push(`/trees/${treeId}`);
    }
  };

  return (
    <Link
      href={`/trees/${treeId}`}
      className={`flex-shrink-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg hover:from-green-700 hover:to-emerald-700 active:scale-95 font-semibold ${className}`}
      onClick={handleClick}
    >
      <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className={labelClassName}>Info</span>
    </Link>
  );
}

export default memo(TreeInfoButton);

