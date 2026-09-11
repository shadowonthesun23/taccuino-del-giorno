import type { Metadata } from 'next';

const editorIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiNDOTJBMkEiLz48cGF0aCBkPSJNMjAgMTRoMjd2OEgyOXY3aDE1djhIMjl2N2gxOHY4SDIwVjE0WiIgZmlsbD0iI0ZGRkRGNiIvPjwvc3ZnPg==';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: editorIcon,
    shortcut: editorIcon,
  },
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
