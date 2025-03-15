import React from 'react';

interface HighlightTextProps {
  text: string; // Text that may contain <mark> tags
}

const HighlightText: React.FC<HighlightTextProps> = ({ text }) => {
  const highlightedText = text.split(/(<mark[^>]*>.*?<\/mark>)/g).map((part, index) => {
    // If it's a marked part, return it as is, else just return normal text
    if (part.startsWith('<mark>')) {
      return <mark key={index} className="bg-yellow-400">{part.replace(/<mark[^>]*>|<\/mark>/g, '')}</mark>;
    }
    return part;
  });

  return <span>{highlightedText}</span>;
};

export default HighlightText;
