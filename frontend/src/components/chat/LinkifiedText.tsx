import React from 'react';

// Chỉ nhận http(s) để không tạo link javascript:/data:. Dấu câu cuối URL (.,!?) không tính vào link.
const URL_PATTERN = /(https?:\/\/[^\s<>"']+[^\s<>"'.,!?;:)\]])/g;

// Render text với URL thành <a>. Dùng React element (không innerHTML) nên không có XSS.
export const LinkifiedText: React.FC<{ text: string; linkColor?: string }> = ({ text, linkColor }) => {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: linkColor, textDecoration: 'underline', wordBreak: 'break-all' }}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
};
