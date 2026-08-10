import React from 'react';
import WafoView from './WafoView';

interface InformasiTabProps {
  announcements?: any[];
  infoLoading?: boolean;
  onOpenTutorial?: () => void;
}

export default function InformasiTab({ onOpenTutorial }: InformasiTabProps) {
  return <WafoView showBackButtons={false} showSystemUpdate={false} onOpenTutorial={onOpenTutorial} />;
}

