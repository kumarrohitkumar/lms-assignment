'use client';

import { useState } from 'react';
import { useSession } from '../SessionProvider';
import { Drawer } from '../ui';
import { ROLE_LABEL } from '../loan/labels';
import { initials, ProfileDetails } from './ProfileDetails';

/** The signed-in person's avatar; clicking it opens their profile in a side panel. */
export function ProfileButton() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`My profile: ${user.name}, ${ROLE_LABEL[user.role]}`}
        className="flex items-center gap-2.5 rounded-full py-1 pr-1 pl-1 text-left transition-colors hover:bg-ink/5 sm:pl-3"
      >
        <span className="hidden text-right text-sm leading-tight sm:block">
          <span className="block font-semibold">{user.name}</span>
          <span className="block text-ink-soft">{ROLE_LABEL[user.role]}</span>
        </span>
        <span className="grid size-9 place-items-center rounded-full bg-ledger text-sm font-bold text-white">{initials(user.name)}</span>
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="My profile">
        {open && <ProfileDetails user={user} />}
      </Drawer>
    </>
  );
}
