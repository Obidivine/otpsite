// frontend/components/InstallButton.tsx
'use client';

import { useInstallPrompt } from '@/lib/use-install-prompt';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function InstallButton() {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();

  // Don't show anything if it's already installed or the browser doesn't support it
  if (isInstalled || !canInstall) return null;

  return (
    <Button 
      onClick={promptInstall}
      variant="outline"
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Install App
    </Button>
  );
}