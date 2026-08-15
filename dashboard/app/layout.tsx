import './globals.css';

export const metadata = {
  title: 'ScholarPath — Pipeline Log',
  description: 'Candidate intake, profile extraction, and research matching pipeline.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
