import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, nisnToSyntheticEmail } from './lib/firebase';
import {
  supabase,
  type AnnouncementRow,
  type AttendanceRow,
  type EventRow,
  type GradeRow,
  type ProfileRow,
} from './lib/supabase';
import {
  User,
  AttendanceRecord,
  Announcement,
  Grade,
  SchoolEvent,
} from './types';

// ---------------------------------------------------------------------------
// Row (snake_case, Supabase) <-> App model (camelCase) mappers
// ---------------------------------------------------------------------------
const profileToUser = (r: ProfileRow): User => ({
  id: r.id,
  nisn: r.nisn,
  name: r.name,
  email: r.email,
  role: r.role,
  creditScore: r.credit_score,
  major: r.major ?? undefined,
  classGrade: r.class_grade ?? undefined,
  classType: (r.class_type as any) ?? undefined,
});

const attendanceToApp = (r: AttendanceRow): AttendanceRecord => ({
  id: r.id,
  studentId: r.student_id,
  date: r.date,
  timestamp: r.timestamp,
  status: r.status,
  locationValid: r.location_valid,
  faceValid: r.face_valid,
  notes: r.notes ?? undefined,
});

const announcementToApp = (r: AnnouncementRow): Announcement => ({
  id: r.id,
  title: r.title,
  content: r.content,
  date: r.date,
  authorId: r.author_id,
});

const gradeToApp = (r: GradeRow): Grade => ({
  id: r.id,
  studentId: r.student_id,
  subject: r.subject,
  score: r.score,
  date: r.date,
  teacherId: r.teacher_id,
});

const eventToApp = (r: EventRow): SchoolEvent => ({
  id: r.id,
  title: r.title,
  type: r.type,
  date: r.date,
  description: r.description ?? undefined,
});

// ---------------------------------------------------------------------------
// Friendly Indonesian error messages for common Firebase Auth error codes
// ---------------------------------------------------------------------------
export function firebaseAuthErrorToMessage(err: any): string {
  const code = err?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'NISN/NIP atau password salah.';
    case 'auth/email-already-in-use':
      return 'NISN/NIP ini sudah terdaftar. Silakan masuk.';
    case 'auth/weak-password':
      return 'Password terlalu lemah (minimal 6 karakter).';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.';
    case 'auth/network-request-failed':
      return 'Koneksi internet bermasalah. Periksa jaringan Anda.';
    default:
      return err?.message || 'Terjadi kesalahan. Silakan coba lagi.';
  }
}

interface AppState {
  currentUser: User | null;
  users: User[];
  attendanceRecords: AttendanceRecord[];
  announcements: Announcement[];
  grades: Grade[];
  events: SchoolEvent[];

  authReady: boolean;
  dataLoaded: boolean;

  // Bootstrap: subscribes to Firebase auth state + loads Supabase data.
  // Call once, e.g. in App.tsx's top-level useEffect.
  init: () => () => void;

  // Auth
  login: (nisn: string, password?: string) => Promise<User | null>;
  logout: () => Promise<void>;
  register: (user: Omit<User, 'id' | 'creditScore'>) => Promise<User | null>;

  // Actions
  addAttendance: (record: Omit<AttendanceRecord, 'id' | 'timestamp'>) => Promise<void>;
  addAnnouncement: (ann: Omit<Announcement, 'id' | 'date'>) => Promise<void>;
  addEvent: (event: Omit<SchoolEvent, 'id'>) => Promise<void>;
  addGrade: (grade: Omit<Grade, 'id' | 'date'>) => Promise<void>;
  updateCreditScore: (studentId: string, change: number) => Promise<void>;
}

export const useStore = create<AppState>()((set, get) => ({
  currentUser: null,
  users: [],
  attendanceRecords: [],
  announcements: [],
  grades: [],
  events: [],
  authReady: false,
  dataLoaded: false,

  init: () => {
    // Load all public/shared collections from Supabase.
    (async () => {
      const [profilesRes, attendanceRes, annRes, gradesRes, eventsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('attendance_records').select('*').order('timestamp', { ascending: false }),
        supabase.from('announcements').select('*').order('date', { ascending: false }),
        supabase.from('grades').select('*').order('date', { ascending: false }),
        supabase.from('events').select('*'),
      ]);

      set({
        users: (profilesRes.data ?? []).map(profileToUser),
        attendanceRecords: (attendanceRes.data ?? []).map(attendanceToApp),
        announcements: (annRes.data ?? []).map(announcementToApp),
        grades: (gradesRes.data ?? []).map(gradeToApp),
        events: (eventsRes.data ?? []).map(eventToApp),
        dataLoaded: true,
      });
    })();

    // Restore session if the user was already logged in (Firebase persists
    // this across reloads automatically).
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        set({ currentUser: null, authReady: true });
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', fbUser.uid)
        .maybeSingle();

      set({
        currentUser: data ? profileToUser(data as ProfileRow) : null,
        authReady: true,
      });
    });

    return unsubscribe;
  },

  login: async (nisn, password) => {
    try {
      const email = nisnToSyntheticEmail(nisn);
      const cred = await signInWithEmailAndPassword(auth, email, password ?? '');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', cred.user.uid)
        .maybeSingle();
      if (error || !data) return null;

      const user = profileToUser(data as ProfileRow);
      set({ currentUser: user });
      return user;
    } catch {
      return null;
    }
  },

  logout: async () => {
    await signOut(auth);
    set({ currentUser: null });
  },

  register: async (userData) => {
    const email = nisnToSyntheticEmail(userData.nisn);
    const cred = await createUserWithEmailAndPassword(auth, email, userData.password ?? '');

    const row: ProfileRow = {
      id: cred.user.uid,
      nisn: userData.nisn,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      credit_score: 100,
      major: userData.major ?? null,
      class_grade: userData.classGrade ?? null,
      class_type: (userData.classType as any) ?? null,
    };

    const { error } = await supabase.from('profiles').insert(row);
    if (error) {
      // Roll back the Firebase account so it doesn't become orphaned.
      await cred.user.delete().catch(() => {});
      throw error;
    }

    const newUser = profileToUser(row);
    set((state) => ({ users: [...state.users, newUser], currentUser: newUser }));
    return newUser;
  },

  addAttendance: async (record) => {
    const existing = get().attendanceRecords.find(
      (r) => r.studentId === record.studentId && r.date === record.date
    );
    if (existing) return; // Already checked in today

    const timestamp = Date.now();
    const row: Omit<AttendanceRow, 'id'> = {
      student_id: record.studentId,
      date: record.date,
      timestamp,
      status: record.status,
      location_valid: record.locationValid,
      face_valid: record.faceValid,
      notes: record.notes ?? null,
    };

    const { data, error } = await supabase
      .from('attendance_records')
      .insert(row)
      .select()
      .single();
    if (error || !data) return;

    let scoreChange = 0;
    if (record.status === 'alpha') scoreChange = -5;
    else if (record.status === 'sakit' || record.status === 'izin') scoreChange = -1;
    else if (record.status === 'hadir') scoreChange = 1;

    set((state) => ({
      attendanceRecords: [attendanceToApp(data as AttendanceRow), ...state.attendanceRecords],
    }));

    if (scoreChange !== 0) {
      await get().updateCreditScore(record.studentId, scoreChange);
    }
  },

  addAnnouncement: async (ann) => {
    const row = { title: ann.title, content: ann.content, date: Date.now(), author_id: ann.authorId };
    const { data, error } = await supabase.from('announcements').insert(row).select().single();
    if (error || !data) return;
    set((state) => ({
      announcements: [announcementToApp(data as AnnouncementRow), ...state.announcements],
    }));
  },

  addEvent: async (event) => {
    const row = { title: event.title, type: event.type, date: event.date, description: event.description ?? null };
    const { data, error } = await supabase.from('events').insert(row).select().single();
    if (error || !data) return;
    set((state) => ({ events: [eventToApp(data as EventRow), ...state.events] }));
  },

  addGrade: async (grade) => {
    const row = {
      student_id: grade.studentId,
      subject: grade.subject,
      score: grade.score,
      date: Date.now(),
      teacher_id: grade.teacherId,
    };
    const { data, error } = await supabase.from('grades').insert(row).select().single();
    if (error || !data) return;
    set((state) => ({ grades: [gradeToApp(data as GradeRow), ...state.grades] }));
  },

  updateCreditScore: async (studentId, change) => {
    const current = get().users.find((u) => u.id === studentId);
    if (!current) return;
    const newScore = Math.min(100, Math.max(0, current.creditScore + change));

    const { error } = await supabase
      .from('profiles')
      .update({ credit_score: newScore })
      .eq('id', studentId);
    if (error) return;

    set((state) => ({
      users: state.users.map((u) => (u.id === studentId ? { ...u, creditScore: newScore } : u)),
      currentUser:
        state.currentUser?.id === studentId
          ? { ...state.currentUser, creditScore: newScore }
          : state.currentUser,
    }));
  },
}));
