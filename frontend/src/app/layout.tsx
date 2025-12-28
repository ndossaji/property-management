/**
 * Root Layout Component
 * Simple layout without authentication provider
 */

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Property Management',
  description: 'Business management platform for automated billing, time tracking, and expense handling',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

