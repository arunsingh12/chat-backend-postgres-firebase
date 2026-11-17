import { Check, CheckCheck, Clock3 } from 'lucide-react';
import type { Message } from '@/api/types';
import { cn } from '@/lib/cn';

interface ReadReceiptProps {
  message: Message;
  /** Members other than the sender who are expected to read it. */
  recipientIds: string[];
  nameOf: (userId: string) => string;
}

/**
 *  🕓 sending · ✓ delivered · ✓✓ read by some (group) · ✓✓ blue read by everyone
 */
export const ReadReceipt = ({ message, recipientIds, nameOf }: ReadReceiptProps) => {
  if (message.pending) return <Clock3 className="size-3.5 opacity-70" aria-label="Sending" />;

  const readers = recipientIds.filter((id) => message.readBy[id]);
  const readByAll = recipientIds.length > 0 && readers.length === recipientIds.length;
  const label = readers.length ? `Read by ${readers.map(nameOf).join(', ')}` : 'Sent';

  const Icon = readers.length ? CheckCheck : Check;
  return (
    <span title={label} aria-label={label} className="inline-flex">
      <Icon
        className={cn('size-3.5', readByAll ? 'text-sky-300' : 'opacity-70')}
        strokeWidth={2.5}
      />
    </span>
  );
};
