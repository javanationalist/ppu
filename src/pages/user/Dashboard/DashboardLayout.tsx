import React from 'react';
import { X } from 'lucide-react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardNavigation } from './DashboardNavigation';
import { StatusTab, VoterCardTab, ScanQrTab, ProfileTab, InformasiTab } from './tabs';
import { ALL_CLASSES } from '../../../lib/classConstants';
import { Profile } from '../../../types';

interface DashboardLayoutProps {
  data: any;
}

export function DashboardLayout({ data }: DashboardLayoutProps) {
  const {
    profile,
    isDark,
    theme,
    toggleTheme,
    cardRef,
    qrRef,
    isDownloading,
    dashboardLoading,
    helpdeskButtons,
    isAllCompleted,
    isSessionConfigActive,
    userSession,
    userDapil,
    accessSettings,
    activeTab,
    setActiveTab,
    voteMode,
    announcements,
    infoLoading,
    isVoting,
    setIsVoting,
    isStatusPopoverOpen,
    setIsStatusPopoverOpen,
    isLogoutPopoverOpen,
    setIsLogoutPopoverOpen,
    statusRef,
    logoutRef,
    isEditModalOpen,
    setIsEditModalOpen,
    editFullName,
    setEditFullName,
    editClass,
    setEditClass,
    editLoading,
    editError,
    dropdownOpen,
    setDropdownOpen,
    triggerRef,
    dropdownRef,
    dropdownPosition,
    toggleDropdown,
    handleSaveProfile,
    handleLogout,
    handleDownload,
  } = data;

  if (!profile) return null;

  const col1 = ALL_CLASSES.filter(c => c.startsWith('X-'));
  const col2 = ALL_CLASSES.filter(c => c.startsWith('XI-'));
  const col3 = ALL_CLASSES.filter(c => c.startsWith('XII-'));
  const specialClasses = ALL_CLASSES.filter(c => !c.includes('-'));

  const renderBlurredEmail = (email: string) => {
    if (!email) return null;
    const parts = email.split('@');
    if (parts.length !== 2) return <span>{email}</span>;
    const [local, domain] = parts;

    if (local.length <= 3) {
      return <span>{email}</span>;
    }

    const prefix = local.slice(0, 2);
    const middle = local.slice(2, -1);
    const suffix = local.slice(-1);

    return (
      <span className="inline-flex items-center select-none" style={{ direction: 'ltr' }}>
        <span>{prefix}</span>
        <span 
          className="blur-[3px] select-none pointer-events-none mx-0.5 text-slate-100 opacity-80" 
          style={{ filter: 'blur(3px)', userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          {middle}
        </span>
        <span>{suffix}</span>
        <span>@{domain}</span>
      </span>
    );
  };

  return (
    <div className="h-screen bg-slate-50 dark:bg-[#1a1a1a] font-sans text-slate-900 dark:text-[#f5f5f5] flex flex-col overflow-hidden transition-colors duration-300">
      <DashboardHeader
        profile={profile}
        isDark={isDark}
        theme={theme}
        toggleTheme={toggleTheme}
        isStatusPopoverOpen={isStatusPopoverOpen}
        setIsStatusPopoverOpen={setIsStatusPopoverOpen}
        isLogoutPopoverOpen={isLogoutPopoverOpen}
        setIsLogoutPopoverOpen={setIsLogoutPopoverOpen}
        statusRef={statusRef}
        logoutRef={logoutRef}
        isVoting={isVoting}
        handleLogout={handleLogout}
      />

      <DashboardNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        voteMode={voteMode}
        isVoting={isVoting}
      />

      {/* Alert if Profile is Incomplete */}
      {accessSettings.edit_profil_enabled && (!profile.full_name || !profile.class) && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-4 py-3 sm:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 z-10 shrink-0 select-none animate-fade-in transition-colors">
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-xs">!</span>
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 font-semibold text-left transition-colors">
              Data profil Anda belum lengkap. Silakan lengkapi Nama Lengkap dan Kelas Anda agar kartu pemilih Anda sah & dapat diverifikasi oleh panitia.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs font-bold text-amber-900 dark:text-amber-350 hover:text-amber-700 dark:hover:text-amber-200 underline shrink-0 transition-colors focus:outline-none"
          >
            Lengkapi Profil Sekarang &rarr;
          </button>
        </div>
      )}

      {/* Main Scrollable Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-12 w-full max-w-7xl mx-auto transition-all duration-300">
        <div className="w-full h-full">
          {activeTab === 'status' && (
            <StatusTab
              profile={profile}
              isAllCompleted={isAllCompleted}
              isSessionConfigActive={isSessionConfigActive}
              userSession={userSession}
              userDapil={userDapil}
              accessSettings={accessSettings}
              helpdeskButtons={helpdeskButtons}
              loading={dashboardLoading}
              voteMode={voteMode}
              isVoting={isVoting}
              setIsEditModalOpen={setIsEditModalOpen}
            />
          )}

          {activeTab === 'kartu' && (
            <VoterCardTab
              profile={profile}
              isAllCompleted={isAllCompleted}
              accessSettings={accessSettings}
              isDownloading={isDownloading}
              handleDownload={handleDownload}
              cardRef={cardRef}
              qrRef={qrRef}
              renderBlurredEmail={renderBlurredEmail}
            />
          )}

          {activeTab === 'scan' && (
            <ScanQrTab 
              isAllCompleted={isAllCompleted} 
              onStateChange={(state) => {
                setIsVoting(state === 'voting');
              }}
              isSessionConfigActive={isSessionConfigActive}
              userSession={userSession}
              userDapil={userDapil}
              helpdeskButtons={helpdeskButtons}
            />
          )}

          {activeTab === 'profil' && (
            <ProfileTab
              profile={profile}
              accessSettings={accessSettings}
              setIsEditModalOpen={setIsEditModalOpen}
              isAllCompleted={isAllCompleted}
            />
          )}

          {activeTab === 'informasi' && (
            <InformasiTab
              announcements={announcements}
              infoLoading={infoLoading}
            />
          )}
        </div>
      </main>

      {/* Modal Edit Profil */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#2a2a2a] rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-[#333333] overflow-hidden animate-scale-up transition-colors">
            <div className="bg-indigo-900 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold">Lengkapi / Edit Profil</h3>
                <p className="text-xs text-indigo-200">Perbarui nama lengkap dan kelas Anda</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="text-white hover:text-indigo-200 transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {editError && (
                <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold p-3 rounded-xl border border-red-100 dark:border-red-900/50">
                  {editError}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#a3a3a3] uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#333333] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-[#f5f5f5] transition-colors"
                  placeholder="Nama Lengkap Anda"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#a3a3a3] uppercase tracking-wider mb-1.5">Kelas</label>
                <div className="relative">
                  <button
                    type="button"
                    ref={triggerRef}
                    onClick={toggleDropdown}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#333333] rounded-xl text-sm text-left bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-indigo-500 flex justify-between items-center transition-colors"
                  >
                    <span>{editClass || 'Pilih Kelas'}</span>
                    <span className="text-slate-400 text-xs">▼</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-[#333333] hover:bg-slate-200 dark:hover:bg-opacity-80 text-slate-700 dark:text-[#f5f5f5] font-bold text-sm rounded-xl transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-indigo-100 dark:shadow-none"
                >
                  {editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dropdown Portal */}
      {dropdownOpen && (
        <div 
          ref={dropdownRef}
          className="fixed z-[100] bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-xl shadow-xl p-3 max-h-60 overflow-y-auto transition-colors"
          style={{
            top: dropdownPosition.top + 'px',
            left: dropdownPosition.left + 'px',
            width: dropdownPosition.width + 'px',
          }}
        >
          {specialClasses.length > 0 && (
            <div className="mb-3 pb-2 border-b border-slate-100 dark:border-[#333333] flex flex-wrap gap-2">
              {specialClasses.map(cls => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => {
                    setEditClass(cls);
                    setDropdownOpen(false);
                  }}
                  className={`flex-1 py-1 text-[11px] text-center rounded hover:bg-indigo-50 dark:hover:bg-[#333333] hover:text-indigo-650 dark:hover:text-[#a3a3a3] font-bold transition-all border ${
                    editClass === cls ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-600 dark:text-[#a3a3a3] border-slate-150 dark:border-[#333333] bg-white dark:bg-[#1a1a1a]'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {['X', 'XI', 'XII'].map((grade, idx) => {
              const cols = [col1, col2, col3];
              return (
                <div key={grade} className="space-y-1">
                  <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-[#a3a3a3] border-b border-slate-100 dark:border-[#333333] pb-1 mb-1 text-center font-mono">{grade}</div>
                  {cols[idx].map(cls => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => {
                        setEditClass(cls);
                        setDropdownOpen(false);
                      }}
                      className={`w-full py-1 text-[11px] text-center rounded hover:bg-indigo-50 dark:hover:bg-[#333333] hover:text-indigo-650 dark:hover:text-white font-bold transition-all ${
                        editClass === cls ? 'bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white' : 'text-slate-600 dark:text-[#a3a3a3]'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
