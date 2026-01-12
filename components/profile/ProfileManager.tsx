'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { switchActiveChild } from '@/app/actions/profiles';
import { User, Plus, Edit2, Trash2, Check, Sparkles, X, Loader2 } from 'lucide-react';
import { cn } from "@/lib/core";
import { deleteChildProfile, type ChildProfile } from '@/app/actions/profiles';
import ChildProfileWizard from './ChildProfileWizard';
import ChildProfileForm from './ChildProfileForm';
import { useRouter } from 'next/navigation';
import { CachedImage } from '@/components/ui/cached-image';
import { useAuth } from '@/components/auth/auth-provider';

interface Props {
  initialChildren: ChildProfile[];
}

export default function ProfileManager({ initialChildren }: Props) {
  const { profiles: authChildren, refreshProfiles, activeChild, setActiveChild } = useAuth();

  // Use initialChildren as the primary source of truth until auth hydrates,
  // preferring authChildren if they are populated later.
  const children = authChildren.length > 0 ? authChildren : initialChildren;

  const [isAdding, setIsAdding] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildProfile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const router = useRouter();

  const handleSwitch = async (child: ChildProfile) => {
    if (switchingId || activeChild?.id === child.id) return;

    setSwitchingId(child.id);
    try {
      const result = await switchActiveChild(child.id);
      if (result.success) {
        setActiveChild(child);
        router.refresh();
      } else {
        throw new Error(result.error || "Failed to switch profiles");
      }
    } catch (err) {
      console.error("Switch failed:", err);
      // Ideally show a toast here
    } finally {
      setSwitchingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteChildProfile(id);
      if (!result) throw new Error('No response from server. Please try again.');
      if (result.error) throw new Error(result.error);

      setDeletingId(null);

      // Auto-redirect if no heroes left (server authoritative)
      if (result.remainingCount === 0) {
        router.push('/onboarding');
        return;
      }

      // Refresh global profile cache
      await refreshProfiles();
    } catch (err: any) {
      console.error("Delete failed:", err);
      setDeleteError(err.message || "Failed to delete profile. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black text-ink font-fredoka drop-shadow-sm">
            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-accent">Heroes</span>
          </h1>
          <p className="text-ink-muted/70 font-bold font-nunito text-lg">Manage all your little explorers in one place.</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05, y: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAdding(true)}
          className="primary-btn h-14 md:h-16 px-6 md:px-8 flex items-center justify-center gap-3 text-lg md:text-xl font-black font-fredoka w-full md:w-auto"
        >
          <Plus className="w-5 h-5 md:w-6 md:h-6" />
          Add Explorer
        </motion.button>
      </div>

      {/* Hero Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {children.map((child) => {
            const isActive = activeChild?.id === child.id;
            const isSwitching = switchingId === child.id;

            return (
              <motion.div
                key={child.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                className="group relative"
              >
                <div className={cn(
                  "clay-card bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] border-4 shadow-xl transition-all h-full flex flex-col items-center text-center relative overflow-hidden",
                  isActive ? "border-purple-500 shadow-clay-purple" : "border-white hover:shadow-2xl"
                )}>

                  {/* Active Indicator Badge */}
                  {isActive && (
                    <div className="absolute top-6 right-6 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-md flex items-center gap-1">
                      <Sparkles size={12} /> Active
                    </div>
                  )}

                  {/* Avatar Circle */}
                  <div className="relative mb-6">
                    <div className={cn(
                      "absolute inset-0 rounded-full blur-xl opacity-40 transition-opacity",
                      isActive ? "bg-gradient-to-br from-purple-400 to-indigo-400 opacity-80" : "bg-gradient-to-br from-purple-100 to-indigo-100 group-hover:opacity-100"
                    )} />
                    <div className={cn(
                      "relative w-28 h-28 rounded-full border-4 overflow-hidden flex items-center justify-center bg-purple-50 transition-colors",
                      isActive ? "border-purple-200" : "border-white"
                    )}>
                      {child.avatar_asset_path ? (
                        <CachedImage
                          src={child.avatar_asset_path}
                          storagePath={child.avatar_paths?.[child.primary_avatar_index ?? 0] || child.avatar_asset_path}
                          updatedAt={child.updated_at}
                          alt={child.first_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-6xl">{child.gender === 'girl' ? '👧' : '👦'}</span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-ink font-fredoka mb-1">{child.first_name}</h3>
                  <p className="text-purple-500 font-bold font-nunito uppercase tracking-widest text-xs mb-4">
                    {new Date().getFullYear() - (child.birth_year || new Date().getFullYear())} Years Old
                  </p>

                  <div className="flex flex-wrap justify-center gap-2 mb-8 flex-grow">
                    {child.interests.slice(0, 3).map(interest => (
                      <span key={interest} className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-tight border border-purple-100">
                        {interest}
                      </span>
                    ))}
                    {child.interests.length > 3 && (
                      <span className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-tight">
                        +{child.interests.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3 w-full mt-auto pt-4 border-t border-purple-50/50">
                    {/* Switch / Active Button */}
                    <button
                      onClick={() => handleSwitch(child)}
                      disabled={isActive || isSwitching}
                      className={cn(
                        "w-full py-3 rounded-2xl font-black font-fredoka transition-all flex items-center justify-center gap-2 shadow-sm",
                        isActive
                          ? "bg-purple-100/50 text-purple-400 cursor-default"
                          : "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-clay-purple hover:scale-[1.02] active:scale-[0.98]"
                      )}
                    >
                      {isSwitching ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : isActive ? (
                        <>
                          <Check className="w-5 h-5" /> Selected
                        </>
                      ) : (
                        "Select Hero"
                      )}
                    </button>

                    <div className="flex items-center gap-3 w-full">
                      <button
                        onClick={() => setEditingChild(child)}
                        className="flex-grow flex items-center justify-center gap-2 py-3 rounded-2xl bg-purple-50 text-purple-600 font-black font-fredoka hover:bg-purple-100 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => setDeletingId(child.id)}
                        className="p-3 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {children.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
              <User className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-slate-400 font-fredoka">No heroes found.</h3>
            <p className="text-slate-300 font-bold font-nunito mb-8">Let&apos;s add your first explorer!</p>
          </div>
        )}
      </div>

      {/* ADD WIZARD MODAL */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto bg-ink/20 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-2xl my-auto"
            >
              <button
                onClick={() => setIsAdding(false)}
                className="absolute -top-3 -right-3 md:-top-4 md:-right-4 w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-ink hover:text-rose-500 z-20 border-4 border-purple-50"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <div className="max-h-[85dvh] overflow-y-auto rounded-[2.5rem] md:rounded-[3.5rem] custom-scrollbar">
                <ChildProfileWizard />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingChild && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto bg-ink/20 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingChild(null)}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-2xl my-auto"
            >
              <button
                onClick={() => setEditingChild(null)}
                className="absolute -top-3 -right-3 md:-top-4 md:-right-4 w-10 h-10 md:w-12 md:h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-ink hover:text-rose-500 z-20 border-4 border-purple-50"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <div className="max-h-[85dvh] overflow-y-auto rounded-[3rem] custom-scrollbar">
                <ChildProfileForm
                  initialData={editingChild}
                  onSuccess={() => {
                    setEditingChild(null);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingId(null)}
              className="absolute inset-0 bg-rose-900/10 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative z-10 w-full max-w-sm clay-card bg-white p-10 rounded-[2.5rem] text-center border-4 border-white shadow-2xl"
            >
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-ink font-fredoka mb-2">Are you sure?</h3>
              <p className="text-ink-muted font-bold font-nunito mb-6">This will permanently remove the hero&apos;s journey.</p>

              {deleteError && (
                <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl text-rose-500 text-sm font-bold animate-fade-in">
                  {deleteError}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  disabled={isDeleting}
                  onClick={() => handleDelete(deletingId)}
                  className="w-full py-4 rounded-2xl bg-rose-500 text-white font-black font-fredoka shadow-clay-pink flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <div className="h-5 w-5 relative">
                      <CachedImage
                        src="/logo.png"
                        alt="loading"
                        fill
                        className="animate-spin"
                      />
                    </div>
                  ) : "Delete Profile"}
                </button>
                <button
                  disabled={isDeleting}
                  onClick={() => setDeletingId(null)}
                  className="w-full py-4 rounded-2xl bg-slate-100 text-ink font-black font-fredoka"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
