import type { Metadata } from 'next';

const studioIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTQiIGZpbGw9IiMzMTVDRkYiLz48cGF0aCBkPSJNNDQuNSAyMC41Yy0zLjItMi03LjItMy0xMS4yLTMtNy4xIDAtMTEuOCAzLjQtMTEuOCA4LjggMCA1IDMuNiA3LjUgMTAuNCA4LjkgNS4xIDEgNi43IDIgNi43IDQgMCAyLjMtMi4xIDMuNy01LjggMy43LTQuMyAwLTguMy0xLjQtMTEuNS0zLjl2OS4xYzMuNCAyIDcuNiAzIDExLjkgMyA4LjQgMCAxMy43LTQuMSAxMy43LTEwLjQgMC01LjEtMy4yLTcuNy0xMC42LTkuMi00LjYtLjktNi4yLTEuOC02LjItMy43IDAtMS45IDEuOC0zIDUtMyAzLjUgMCA2LjcgMSA5LjQgMi43di04WiIgZmlsbD0iI0ZGRkZGRiIvPjwvc3ZnPg==';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: studioIcon,
    shortcut: studioIcon,
  },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
