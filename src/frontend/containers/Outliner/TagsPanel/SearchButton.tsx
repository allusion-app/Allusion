import React, { useCallback, useState } from 'react';

import { IconSet } from 'widgets/icons';

interface SearchButtonProps {
  onClick: (event: React.MouseEvent) => void;
  isSearched: boolean;
}

const SearchButton: React.FC<SearchButtonProps> = ({ onClick, isSearched }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <button
      className="btn btn-icon"
      aria-hidden={!isSearched}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isHovered
        ? isSearched
          ? IconSet.SEARCH_REMOVE
          : IconSet.SEARCH_ADD
        : isSearched
        ? IconSet.SEARCH
        : IconSet.SEARCH_ADD}
    </button>
  );
};

export default SearchButton;
