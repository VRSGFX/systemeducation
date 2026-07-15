import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import PublicDashboard from './views/PublicDashboard';
import StudentAuth from './views/StudentAuth';
import TeacherAuth from './views/TeacherAuth';
import StudentDashboard from './views/StudentDashboard';
import AdminDashboard from './views/AdminDashboard';
import ScannerFlow from './views/ScannerFlow';
import { GraduationCap } from 'lucide-react';

export default function App() {
  const currentUser = useStore(s => s.currentUser);
  const authReady = useStore(s => s.authReady);
  const init = useStore(s => s.init);
  const [currentView, setCurrentView] = useState('public');

  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, [init]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <GraduationCap className="w-10 h-10 text-blue-600 animate-pulse" />
        <p className="text-slate-500 text-sm">Memuat EduTrack...</p>
      </div>
    );
  }

  if (!currentUser) {
    if (currentView === 'student-auth') return <StudentAuth onBack={() => setCurrentView('public')} />;
    if (currentView === 'teacher-auth') return <TeacherAuth onBack={() => setCurrentView('public')} />;
    return <PublicDashboard onNavigate={setCurrentView} />;
  }

  if (currentUser.role === 'admin' || currentUser.role === 'teacher') {
    return <AdminDashboard />;
  }

  if (currentView === 'scanner') {
    return <ScannerFlow onNavigate={setCurrentView} />;
  }

  return <StudentDashboard onNavigate={setCurrentView} />;
}
