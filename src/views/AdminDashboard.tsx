import React, { useState } from 'react';
import { useStore } from '../store';
import { LogOut, QrCode as QRIcon, Users, Plus, ShieldCheck, Send, RefreshCw, Clock } from 'lucide-react';
import QRCode from 'react-qr-code';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function AdminDashboard() {
  const currentUser = useStore(s => s.currentUser);
  const logout = useStore(s => s.logout);
  const users = useStore(s => s.users.filter(u => u.role === 'student'));
  const addAnnouncement = useStore(s => s.addAnnouncement);
  const addGrade = useStore(s => s.addGrade);
  const attendanceRecords = useStore(s => s.attendanceRecords);
  
  const [activeTab, setActiveTab] = useState<'qr' | 'students' | 'announcements'>('qr');
  
  // States for forms
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [gradeSubject, setGradeSubject] = useState('');
  const [gradeScore, setGradeScore] = useState('');

  // QR Code generation states
  const [qrExpiryMinutes, setQrExpiryMinutes] = useState(15);
  const [qrGeneratedAt, setQrGeneratedAt] = useState<Date>(new Date());
  const [qrRegeneratedCount, setQrRegeneratedCount] = useState(0);
  
  const todayDateStr = format(new Date(), 'yyyy-MM-dd');
  const timestamp = qrGeneratedAt.getTime();
  const dailyQRText = `EDUTRACK-${todayDateStr.replace(/-/g, '')}-REG${qrRegeneratedCount}-T${timestamp}`;
  
  // Calculate QR expiry
  const qrExpiryTime = new Date(qrGeneratedAt.getTime() + qrExpiryMinutes * 60000);
  const [timeRemaining, setTimeRemaining] = useState('');
  
  React.useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = qrExpiryTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Kadaluarsa');
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [qrExpiryTime]);

  const handleRegenerateQR = () => {
    setQrGeneratedAt(new Date());
    setQrRegeneratedCount(prev => prev + 1);
  };

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    addAnnouncement({ title: annTitle, content: annContent, authorId: currentUser!.id });
    setAnnTitle('');
    setAnnContent('');
    alert('Pengumuman terkirim!');
  };

  const handleInputGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !gradeSubject || !gradeScore) return;
    addGrade({
      studentId: selectedStudent,
      subject: gradeSubject,
      score: Number(gradeScore),
      teacherId: currentUser!.id
    });
    setGradeSubject('');
    setGradeScore('');
    alert('Nilai berhasil diinput!');
  };

  if (!currentUser) return null;

  const isQRExpired = timeRemaining === 'Kadaluarsa';

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white md:min-h-screen flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <ShieldCheck className="w-8 h-8 text-blue-400" />
          <h1 className="text-xl font-bold tracking-tight">AdminPanel</h1>
        </div>
        <div className="p-4 flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('qr')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'qr' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <QRIcon className="w-5 h-5" /> QR Absensi
          </button>
          <button 
            onClick={() => setActiveTab('students')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'students' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users className="w-5 h-5" /> Data Siswa & Nilai
          </button>
          <button 
            onClick={() => setActiveTab('announcements')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'announcements' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Send className="w-5 h-5" /> Pengumuman
          </button>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">
            Halo, {currentUser.name}
          </h2>
          <p className="text-slate-500 mt-1">Kelola sistem absensi dan data akademik siswa.</p>
        </header>

        {activeTab === 'qr' && (
          <div className="max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">QR Code Kehadiran Hari Ini</h3>
            <p className="text-slate-500 mb-6">{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id })}</p>
            
            {/* QR Code with expiry overlay */}
            <div className="relative inline-block mb-6">
              <div className={`bg-slate-50 p-6 rounded-2xl border-2 transition-all duration-300 ${
                isQRExpired ? 'border-red-300 opacity-40' : 'border-slate-200'
              }`}>
                <QRCode 
                  value={dailyQRText} 
                  size={256} 
                  className="mx-auto"
                />
              </div>
              
              {isQRExpired && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-red-500 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg">
                    QR Kadaluarsa
                  </div>
                </div>
              )}
            </div>

            {/* Timer and controls */}
            <div className="mb-6 space-y-4">
              {/* Timer display */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                isQRExpired 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono font-bold text-lg">
                  {isQRExpired ? 'Kadaluarsa' : timeRemaining}
                </span>
              </div>
              
              {/* Expiry settings */}
              <div className="flex items-center justify-center gap-4">
                <label className="text-sm text-slate-600">Masa berlaku:</label>
                <select 
                  value={qrExpiryMinutes}
                  onChange={(e) => setQrExpiryMinutes(Number(e.target.value))}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value={5}>5 menit</option>
                  <option value={10}>10 menit</option>
                  <option value={15}>15 menit</option>
                  <option value={30}>30 menit</option>
                  <option value={60}>1 jam</option>
                </select>
              </div>
            </div>

            {/* Regenerate button */}
            <button
              onClick={handleRegenerateQR}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors mb-6"
            >
              <RefreshCw className="w-5 h-5" />
              Generate QR Baru
            </button>

            {/* QR Info */}
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 max-w-sm mx-auto mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-blue-600">Teks QR Cadangan</p>
              <p className="font-mono text-xs font-bold tracking-wide break-all">{dailyQRText}</p>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">Dibuat pada</p>
                <p className="text-sm font-medium text-slate-800">
                  {format(qrGeneratedAt, 'HH:mm:ss')}
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">Regenerasi ke</p>
                <p className="text-sm font-medium text-slate-800">
                  #{qrRegeneratedCount + 1}
                </p>
              </div>
            </div>
            
            <p className="text-sm text-slate-400 mt-6 max-w-md mx-auto">
              Tampilkan QR Code ini di layar depan kelas. Siswa memindai QR ini dari perangkat mereka untuk absen. 
              QR akan kadaluarsa sesuai waktu yang ditentukan untuk mencegah penyalahgunaan.
            </p>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Daftar Siswa
                </h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {users.map(u => {
                  const todayRecord = attendanceRecords.find(r => r.studentId === u.id && r.date === todayDateStr);
                  return (
                    <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-semibold text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-500">NISN: {u.nisn} • Credit: {u.creditScore}</p>
                      </div>
                      <div>
                        {todayRecord ? (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            todayRecord.status === 'hadir' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {todayRecord.status.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                            Belum Absen
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-fit">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Input Nilai Siswa
              </h3>
              <form onSubmit={handleInputGrade} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Siswa</label>
                  <select 
                    value={selectedStudent} 
                    onChange={e => setSelectedStudent(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Pilih --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.nisn})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mata Pelajaran</label>
                  <input 
                    type="text" 
                    value={gradeSubject} 
                    onChange={e => setGradeSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Contoh: Matematika"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nilai (0-100)</label>
                  <input 
                    type="number" 
                    min="0" max="100"
                    value={gradeScore} 
                    onChange={e => setGradeScore(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="85"
                    required
                  />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 transition-colors">
                  Simpan Nilai
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-500" />
              Buat Pengumuman Baru
            </h3>
            <form onSubmit={handleSendAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Judul Pengumuman</label>
                <input 
                  type="text" 
                  value={annTitle} 
                  onChange={e => setAnnTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="Judul..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Isi Pesan</label>
                <textarea 
                  value={annContent} 
                  onChange={e => setAnnContent(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none h-32 resize-none"
                  placeholder="Isi detail pengumuman..."
                  required
                />
              </div>
              <button type="submit" className="w-full bg-amber-500 text-white font-medium py-2.5 rounded-lg hover:bg-amber-600 transition-colors">
                Kirim Notifikasi Push
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}