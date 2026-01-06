'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { switchActiveChild, type ChildProfile } from '@/app/actions/profiles';
import { useAuth } from '@/components/auth/auth-provider';
import { getCookie } from 'cookies-next';
import { ChevronDown, Plus, User } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { CachedImage } from '@/components/ui/cached-image';

export function ProfileSwitcher() {
  const router = useRouter();
  const { profiles: children, isLoading } = useAuth();
  const [activeChild, setActiveChild] = useState<ChildProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    
    // Try to find active child from cookie
    const activeId = getCookie('activeChildId');
    if (activeId) {
      const found = children.find(c => c.id === activeId);
      if (found) setActiveChild(found);
    } else if (children.length > 0) {
      setActiveChild(children[0]);
    }
  }, [children, isLoading]);

  const handleSwitch = async (childId: string) => {
    const result = await switchActiveChild(childId);
    if (result.success) {
      const selected = children.find(c => c.id === childId);
      if (selected) setActiveChild(selected);
      setIsOpen(false);
      router.refresh();
    }
  };

  if (children.length === 0) return null;

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/50 hover:bg-white/80 border-2 border-transparent hover:border-accent/20 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Switch profile"
        >
          {activeChild?.avatar_asset_path ? (
            <CachedImage
              src={activeChild.avatar_asset_path}
              storagePath={activeChild.avatar_asset_path.startsWith('http') ? undefined : activeChild.avatar_asset_path}
              alt={activeChild.first_name}
              className="w-8 h-8 rounded-full object-cover"
              width={32}
              height={32}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold shadow-sm">
              {activeChild ? activeChild.first_name[0] : <User size={16} />}
            </div>
          )}
          <span className="hidden md:block font-bold text-ink text-sm max-w-[100px] truncate">
            {activeChild ? activeChild.first_name : 'Select Child'}
          </span>
          <ChevronDown size={14} className={`text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-60 p-2 mt-2 bg-card rounded-2xl shadow-xl border border-shell-2 animate-slide-down origin-top"
          sideOffset={5}
        >
          <div className="flex flex-col gap-1">
            <div className="px-3 py-2 text-xs font-bold text-ink-muted uppercase tracking-wider">
              Switch Profile
            </div>

            {children.map(child => (
              <button
                key={child.id}
                onClick={() => handleSwitch(child.id)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left ${activeChild?.id === child.id
                    ? 'bg-accent/10 text-accent font-bold'
                    : 'hover:bg-shell-2 text-ink font-medium'
                  }`}
              >
                {child.avatar_asset_path ? (
                  <CachedImage
                    src={child.avatar_asset_path}
                    storagePath={child.avatar_asset_path.startsWith('http') ? undefined : child.avatar_asset_path}
                    alt={child.first_name}
                    className="w-8 h-8 rounded-full object-cover border border-shell-2"
                    width={32}
                    height={32}
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${activeChild?.id === child.id ? 'bg-accent text-white' : 'bg-shell-2 text-ink-muted'
                    }`}>
                    {child.first_name[0]}
                  </div>
                )}
                <span className="truncate">{child.first_name}</span>
                {activeChild?.id === child.id && <span className="ml-auto text-accent">✓</span>}
              </button>
            ))}

            <div className="h-px bg-shell-2 my-1" />

            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/profiles');
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-shell-2 text-ink-muted hover:text-ink transition-colors font-medium text-sm"
            >
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-ink-muted/30 flex items-center justify-center">
                <Plus size={16} />
              </div>
              <span>Manage Profiles</span>
            </button>
          </div>
          <Popover.Arrow className="fill-card" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
