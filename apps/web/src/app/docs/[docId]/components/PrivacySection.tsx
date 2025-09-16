"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { toggleDocumentPrivacy } from "../reader/actions";

interface PrivacySectionProps {
  docId: string;
  isPrivate: boolean;
  isOwner: boolean;
}

export function PrivacySection({ docId, isPrivate: initialPrivacy, isOwner }: PrivacySectionProps) {
  const [isPrivate, setIsPrivate] = useState(initialPrivacy);
  const [isChanging, setIsChanging] = useState(false);
  const router = useRouter();

  const handleTogglePrivacy = async () => {
    console.log('Toggle privacy clicked for doc:', docId);
    setIsChanging(true);
    try {
      const result = await toggleDocumentPrivacy(docId);
      console.log('Toggle result:', result);
      if (result.success && result.isPrivate !== undefined) {
        setIsPrivate(result.isPrivate);
        router.refresh();
      } else {
        alert(result.error || 'Failed to change privacy');
      }
    } catch (error) {
      console.error('Error changing privacy:', error);
      alert('Failed to change privacy');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">
        Privacy
      </dt>
      <dd className="mt-1 flex items-center justify-between">
        <PrivacyBadge
          isPrivate={isPrivate}
          variant="badge"
          size="sm"
        />
        {isOwner && (
          <button
            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
            onClick={handleTogglePrivacy}
            disabled={isChanging}
          >
            {isChanging ? 'Changing...' : isPrivate ? 'Make Public' : 'Make Private'}
          </button>
        )}
      </dd>
    </div>
  );
}