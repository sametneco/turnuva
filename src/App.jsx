import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Plus, 
  Trash2, 
  RefreshCw,
  Lock,
  Unlock,
  ArrowLeft,
  PlayCircle,
  Gamepad2,
  Image as ImageIcon,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Edit3,
  Settings,
  AlertTriangle
} from 'lucide-react';

// --- Firebase Init ---
const firebaseConfig = {
  apiKey: "AIzaSyCPSY_tZc3eZW4YU3YK0eTeia6bD2823Ew",
  authDomain: "turnuva-a53f0.firebaseapp.com",
  projectId: "turnuva-a53f0",
  storageBucket: "turnuva-a53f0.firebasestorage.app",
  messagingSenderId: "1045868018736",
  appId: "1:1045868018736:web:d339e491cd799cec60c1f5",
  measurementId: "G-TFVDQC69FT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'fifa-hub-v4';


// --- Yardımcı Fonksiyonlar ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return '';
  }
};

// --- Ana Uygulama ---
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('lobby');
  const [activeTournamentId, setActiveTournamentId] = useState(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  
  const [registry, setRegistry] = useState([]);
  const [tournamentData, setTournamentData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Confirmation Modal State ---
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Global Confirmation Handler
  const openConfirmModal = (title, message, onConfirm) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };
  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  };

  // --- Auth ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Sadece gerçek token varsa onu kullan, yoksa anonim giriş
        if (typeof window !== 'undefined' && window.__initial_auth_token) {
          await signInWithCustomToken(auth, window.__initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase Auth Error:", error);
        // Hata durumunda anonim giriş denemesi
        try {
          await signInAnonymously(auth);
        } catch (anonError) {
          console.error("Anonymous sign-in failed:", anonError);
        }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- Registry Sync ---
  useEffect(() => {
    if (!user) return;
    const registryRef = doc(db, 'artifacts', appId, 'public', 'data', 'organization', 'registry');
    const unsub = onSnapshot(registryRef, (docSnap) => {
      if (docSnap.exists()) setRegistry(docSnap.data().list || []);
      else setRegistry([]);
      setLoading(false);
    }, (err) => { 
        console.error("Registry hatası:", err); 
        // Eğer Firebase'e bağlanılamıyorsa, mock/boş veri göster
        setRegistry([]);
        setLoading(false); 
    });
    return () => unsub();
  }, [user]);

  // --- Tournament Data Sync ---
  useEffect(() => {
    if (!user || !activeTournamentId) {
      setTournamentData(null);
      return;
    }
    setLoading(true);
    const tRef = doc(db, 'artifacts', appId, 'public', 'data', 'tournaments', `t_${activeTournamentId}`);
    const unsub = onSnapshot(tRef, (docSnap) => {
      if (docSnap.exists()) setTournamentData(docSnap.data());
      setLoading(false);
    }, (err) => { 
        console.error("Turnuva Veri Hatası:", err); 
        setLoading(false); 
    });
    return () => unsub();
  }, [user, activeTournamentId]);

  // --- Actions ---
  const createTournament = async (name) => {
    if (!isAdmin) {
      console.error("Create tournament failed: User is not admin");
      return;
    }
    
    try {
        console.log("Creating tournament with name:", name);
        const newId = generateId();
        const newMeta = { id: newId, name: name || 'Yeni Turnuva', createdAt: new Date().toISOString(), status: 'Hazırlık' };
        const newRegistry = [newMeta, ...registry];
        
        console.log("New registry data:", newRegistry);
        
        // Registry oluşturma
        const registryRef = doc(db, 'artifacts', appId, 'public', 'data', 'organization', 'registry');
        await setDoc(registryRef, { list: newRegistry }).catch(error => {
          console.error("Registry creation error:", error);
          console.error("Registry ref path:", registryRef.path);
          throw error;
        });
        
        // Turnuva dokümanı oluşturma
        const tournamentRef = doc(db, 'artifacts', appId, 'public', 'data', 'tournaments', `t_${newId}`);
        await setDoc(tournamentRef, {
          players: [], matches: [], settings: { started: false, name: name }
        }).catch(error => {
          console.error("Tournament creation error:", error);
          console.error("Tournament ref path:", tournamentRef.path);
          throw error;
        });
        
        console.log(`Tournament ${name} created successfully.`);
    } catch (e) {
        console.error("Error creating tournament:", e);
        alert("Turnuva oluşturulurken bir hata oluştu. Lütfen konsolu kontrol edin.");
    }
  };

  const deleteTournament = useCallback(async (id) => {
    if (!isAdmin) return;
    try {
        // 1. Registry'den sil
        const newRegistry = registry.filter(t => t.id !== id);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'organization', 'registry'), { list: newRegistry });

        // 2. Turnuva dokümanını sil
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tournaments', `t_${id}`));
        
        console.log(`Tournament ${id} deleted successfully.`);

        // 3. UI'ı güncelle
        if(activeTournamentId === id) {
           setActiveTournamentId(null);
           setView('lobby');
        }
    } catch (e) {
        console.error("Turnuva silme hatası:", e);
    }
  }, [isAdmin, registry, activeTournamentId]);

  const handleDeleteClick = (id, name) => {
    if (!isAdmin) return;
    openConfirmModal(
      'Turnuvayı Sil',
      `"${name}" adlı turnuvayı ve tüm verilerini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      () => deleteTournament(id)
    );
  };

  const renameTournament = async (id, newName) => {
    if (!isAdmin || !newName.trim()) return;
    try {
        // 1. Registry güncelle
        const newRegistry = registry.map(t => t.id === id ? { ...t, name: newName } : t);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'organization', 'registry'), { list: newRegistry });

        // 2. Aktif turnuva verisini güncelle
        if (activeTournamentId === id && tournamentData) {
           const newSettings = { ...tournamentData.settings, name: newName };
           await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tournaments', `t_${id}`), {
              ...tournamentData,
              settings: newSettings
           });
        }
        console.log(`Tournament ${id} renamed to ${newName}.`);
    } catch (e) {
        console.error("Turnuva yeniden adlandırma hatası:", e);
    }
  };

  const handleAdminLogin = () => {
    if (adminPin === '1234') { setIsAdmin(true); setAdminPin(''); } 
    else alert('Hatalı PIN!'); // Simple alert is fine for non-critical UI feedback
  };

  if (view === 'lobby') {
    return (
      <>
        <LobbyView 
          loading={loading} registry={registry} isAdmin={isAdmin} setIsAdmin={setIsAdmin}
          adminPin={adminPin} setAdminPin={setAdminPin} handleAdminLogin={handleAdminLogin}
          createTournament={createTournament} handleDeleteClick={handleDeleteClick}
          onSelect={(id) => { setActiveTournamentId(id); setView('tournament'); }}
        />
        <CustomConfirmModal {...confirmModal} onClose={closeConfirmModal} />
      </>
    );
  }

  return (
    <>
      <TournamentView 
        data={tournamentData} tournamentId={activeTournamentId} isAdmin={isAdmin}
        goBack={() => { setActiveTournamentId(null); setView('lobby'); }}
        saveData={async (newData) => {
          if(!activeTournamentId) return;
          try {
             await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tournaments', `t_${activeTournamentId}`), newData);
          } catch (e) {
             console.error("Turnuva verisi kaydetme hatası:", e);
          }
        }}
        updateStatus={async (status) => {
          try {
             const newRegistry = registry.map(t => t.id === activeTournamentId ? {...t, status} : t);
             await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'organization', 'registry'), { list: newRegistry });
          } catch (e) {
             console.error("Turnuva durumu güncelleme hatası:", e);
          }
        }}
        onRename={(newName) => renameTournament(activeTournamentId, newName)}
        onDelete={() => handleDeleteClick(activeTournamentId, tournamentData?.settings?.name || 'Bu Turnuva')}
        openConfirmModal={openConfirmModal}
      />
      <CustomConfirmModal {...confirmModal} onClose={closeConfirmModal} />
    </>
  );
}

// ==========================================
// CUSTOM CONFIRM MODAL (Replaces confirm())
// ==========================================
function CustomConfirmModal({ isOpen, title, message, onConfirm, onClose }) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 w-full max-w-sm rounded-xl border border-slate-700 shadow-2xl p-6 transform transition-all scale-100">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={24} className="text-red-500" />
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <p className="text-sm text-slate-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Sil / Onayla
          </button>
        </div>
      </div>
    </div>
  );
}


// ==========================================
// LOBBY VIEW
// ==========================================
function LobbyView({ loading, registry, isAdmin, setIsAdmin, adminPin, setAdminPin, handleAdminLogin, createTournament, handleDeleteClick, onSelect }) {
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 font-sans pb-safe">
      <div className="max-w-md mx-auto p-4">
        <div className="flex justify-between items-center mb-8 mt-2">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-3 rounded-xl shadow-lg shadow-emerald-500/20">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Turnuva Merkezi</h1>
              <p className="text-xs text-slate-400">FIFA Organizasyon Paneli</p>
            </div>
          </div>
          <button onClick={() => isAdmin ? setIsAdmin(false) : null} className={`p-2 rounded-full ${isAdmin ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-600'}`}>
            {isAdmin ? <Unlock size={20} /> : <Lock size={20} onClick={() => document.getElementById('adminPinInput')?.focus()} />}
          </button>
        </div>

        {!isAdmin && (
          <div className="mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex gap-2 items-center">
            <Lock size={16} className="text-slate-500" />
            <input id="adminPinInput" type="password" placeholder="Yönetici PIN" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} className="bg-transparent border-none text-sm text-white placeholder:text-slate-600 focus:ring-0 w-full outline-none" />
            <button onClick={handleAdminLogin} className="text-xs bg-slate-800 px-3 py-1 rounded text-slate-300">Giriş</button>
          </div>
        )}

        {isAdmin && (
          <div className="mb-6">
            {!showCreate ? (
              <button onClick={() => setShowCreate(true)} className="w-full py-3 bg-slate-900 border border-slate-800 border-dashed rounded-xl text-slate-400 hover:text-emerald-400 transition-all flex items-center justify-center gap-2 font-medium">
                <Plus size={20} /> Yeni Turnuva Oluştur
              </button>
            ) : (
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 animate-in fade-in zoom-in-95">
                <h3 className="text-sm font-bold text-white mb-3">Turnuva Adı</h3>
                <input type="text" placeholder="Örn: OFİS LİGİ" value={newName} onChange={(e) => setNewName(e.target.value.toUpperCase())} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white mb-3 focus:border-emerald-500 outline-none font-bold" />
                <div className="flex gap-2">
                  <button onClick={() => setShowCreate(false)} className="flex-1 bg-slate-800 text-slate-300 py-2 rounded-lg text-sm">İptal</button>
                  <button onClick={() => { createTournament(newName); setNewName(''); setShowCreate(false); }} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm">Oluştur</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {loading ? <div className="text-center text-slate-500 py-10">Yükleniyor...</div> : registry.length === 0 ? <div className="text-center text-slate-500 py-10 bg-slate-900/30 rounded-xl">Kayıtlı turnuva yok.</div> : registry.map((t) => (
            <div key={t.id} className="group relative bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all" >
               <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-12 cursor-pointer" onClick={() => onSelect(t.id)}>
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors truncate">{t.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(t.createdAt)}</span>
                      <span className={`px-1.5 py-0.5 rounded font-medium ${t.status === 'Tamamlandı' ? 'bg-slate-800 text-slate-500' : 'bg-emerald-900/30 text-emerald-400'}`}>{t.status}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleDeleteClick(t.id, t.name); 
                      }} 
                      className="p-2 bg-slate-950 rounded-full text-slate-600 hover:text-red-500 hover:bg-red-900/20 z-10 transition-all absolute top-4 right-4"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  {!isAdmin && <div className="bg-slate-950 p-2 rounded-full text-slate-500 group-hover:text-white transition-colors cursor-pointer" onClick={() => onSelect(t.id)}><PlayCircle size={20} /></div>}
               </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`.pb-safe { padding-bottom: env(safe-area-inset-bottom); }`}</style>
    </div>
  );
}

// ==========================================
// TOURNAMENT VIEW
// ==========================================
function TournamentView({ data, tournamentId, isAdmin, goBack, saveData, updateStatus, onRename, onDelete, openConfirmModal }) {
  const [activeTab, setActiveTab] = useState('standings');
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [settings, setSettings] = useState({ started: false, legs: 2 });
  const [editNameMode, setEditNameMode] = useState(false);
  const [tempName, setTempName] = useState('');

  // Modal State
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    if (data) {
      setPlayers(data.players || []);
      setMatches(data.matches || []);
      setSettings(data.settings || { started: false, legs: 2 });
      setTempName(data.settings?.name || '');
    }
  }, [data]);

  // --- Standings Logic ---
  const standings = useMemo(() => {
    const stats = players.map(p => ({
      id: p.id, name: p.name, team: p.team, avatar: p.avatar,
      played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, form: []
    }));

    matches.forEach(match => {
      if (match.played) {
        const h = stats.find(s => s.id === match.home);
        const a = stats.find(s => s.id === match.away);
        if (h && a) {
          const hScore = parseInt(match.homeScore);
          const aScore = parseInt(match.awayScore);
          if (!isNaN(hScore) && !isNaN(aScore)) {
            h.played++; a.played++;
            h.gf += hScore; h.ga += aScore;
            a.gf += aScore; a.ga += hScore;
            h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;
            if (hScore > aScore) { 
              h.won++; h.points += 3; h.form.push('W');
              a.lost++; a.form.push('L');
            } else if (hScore < aScore) { 
              a.won++; a.points += 3; a.form.push('W');
              h.lost++; h.form.push('L');
            } else { 
              h.drawn++; h.points += 1; h.form.push('D');
              a.drawn++; a.points += 1; a.form.push('D');
            }
          }
        }
      }
    });
    return stats.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  }, [players, matches]);

  // --- Fixture Logic ---
  const generateFixtures = (selectedLegs) => {
    if (players.length < 2) return;
    let schedule = [];
    const p = [...players];
    if (p.length % 2 !== 0) p.push({ id: 'bye', name: 'Bay' });

    const baseRounds = p.length - 1;
    const half = p.length / 2;
    let list = p.map(x => x.id);
    
    // Generate Base Schedule (Single Leg)
    let baseSchedule = [];
    for (let round = 0; round < baseRounds; round++) {
      let roundMatches = [];
      for (let i = 0; i < half; i++) {
        const p1 = list[i];
        const p2 = list[p.length - 1 - i];
        if (p1 !== 'bye' && p2 !== 'bye') {
          roundMatches.push({ home: p1, away: p2 });
        }
      }
      baseSchedule.push(roundMatches);
      list.splice(1, 0, list.pop());
    }

    // Repeat for selected legs
    for (let leg = 0; leg < selectedLegs; leg++) {
      baseSchedule.forEach((roundMatches, roundIdx) => {
        const absoluteRound = (leg * baseRounds) + roundIdx + 1;
        roundMatches.forEach((m, i) => {
          schedule.push({
            id: `m-${leg}-${roundIdx}-${i}`,
            round: absoluteRound,
            home: leg % 2 === 0 ? m.home : m.away,
            away: leg % 2 === 0 ? m.away : m.home,
            homeScore: '', awayScore: '', played: false
          });
        });
      });
    }

    const newSettings = { ...settings, started: true, legs: selectedLegs };
    saveData({ players, matches: schedule, settings: newSettings });
    updateStatus('Devam Ediyor');
  };

  const handleMatchUpdate = (matchId, field, value) => {
    const updatedMatches = matches.map(m => {
      if (m.id === matchId) {
        const newMatch = { ...m, [field]: value };
        // Check if both scores are entered and are numbers (even if strings, they should contain digits)
        const homeValid = newMatch.homeScore !== '' && !isNaN(parseInt(newMatch.homeScore));
        const awayValid = newMatch.awayScore !== '' && !isNaN(parseInt(newMatch.awayScore));
        
        newMatch.played = homeValid && awayValid;
        return newMatch;
      }
      return m;
    });
    setMatches(updatedMatches);
    saveData({ players, matches: updatedMatches, settings });
    
    // Check if the entire tournament is finished
    if (updatedMatches.every(m => m.played)) {
        updateStatus('Tamamlandı');
    } else {
        // Ensure status is 'Devam Ediyor' if at least one match is played but not all are
        if (updatedMatches.some(m => m.played)) updateStatus('Devam Ediyor');
    }
  };

  const handleResetFixtures = () => {
    openConfirmModal(
        'Fikstür Sıfırlama',
        'Turnuva fikstürünü ve tüm maç sonuçlarını sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.',
        async () => {
            setMatches([]);
            setSettings({...settings, started: false});
            updateStatus('Hazırlık');
            await saveData({players, matches: [], settings: {...settings, started: false}});
        }
    );
  };

  if (!data) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 font-sans pb-24">
      {/* HEADER */}
      <div className="bg-slate-900/95 backdrop-blur border-b border-slate-800 p-4 sticky top-0 z-30 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={goBack} className="p-2 -ml-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{settings.name || 'Turnuva'}</h1>
            <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">{settings.started ? (matches.length > 0 && matches.every(m => m.played) ? 'Tamamlandı' : 'Canlı') : 'Hazırlık'}</p>
          </div>
          {isAdmin && <span className="text-[10px] bg-red-900/30 text-red-400 px-2 py-1 rounded border border-red-900/50">YÖNETİCİ</span>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        
        {/* STANDINGS */}
        {activeTab === 'standings' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            {!settings.started && players.length === 0 ? (
              <div className="text-center py-12 text-slate-500">Katılımcı eklemek için yönetici sekmesine gidin.</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 shadow-xl">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-slate-900 text-[10px] text-slate-400 uppercase font-bold">
                    <tr>
                      <th className="px-2 py-3 w-8 text-center">#</th>
                      <th className="px-2 py-3 text-left">Oyuncu</th>
                      <th className="px-1 py-3 w-8 text-center hidden sm:table-cell">O</th>
                      <th className="px-1 py-3 w-8 text-center text-emerald-500/70">AG</th>
                      <th className="px-1 py-3 w-8 text-center text-red-500/70">YG</th>
                      <th className="px-1 py-3 w-8 text-center">Av</th>
                      <th className="px-2 py-3 hidden md:table-cell text-center">Form</th>
                      <th className="px-3 py-3 w-16 text-center bg-slate-800/50 text-white">P</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {standings.map((row, idx) => {
                       const lastResult = row.form[row.form.length - 1];
                       let TrendIcon = Minus;
                       let trendColor = "text-slate-600";
                       if (lastResult === 'W') { TrendIcon = TrendingUp; trendColor = "text-emerald-500"; }
                       if (lastResult === 'L') { TrendIcon = TrendingDown; trendColor = "text-red-500"; }

                       return (
                        <tr 
                          key={row.id} 
                          onClick={() => setSelectedPlayer(row)}
                          className={`cursor-pointer hover:bg-slate-800/60 transition-colors ${idx < 1 ? 'bg-gradient-to-r from-emerald-900/10 to-transparent' : ''}`}
                        >
                          <td className="px-2 py-4 text-center font-medium text-slate-500 relative">
                            <div className="flex flex-col items-center justify-center gap-1">
                               <span>{idx + 1}</span>
                               {settings.started && row.played > 0 && <TrendIcon size={12} className={trendColor} />}
                            </div>
                            {idx === 0 && <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>}
                          </td>
                          <td className="px-2 py-4">
                            <div className="flex items-center gap-3">
                              {row.avatar ? (
                                <img src={row.avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-slate-700 bg-slate-800 shadow-lg" onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/40x40/1e293b/94a3b8?text=AV'}}/>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 text-sm font-bold shadow-lg">
                                  {row.name.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-white text-sm uppercase tracking-wide truncate">{row.name}</div>
                                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                   {row.team || 'Bağımsız'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-1 py-4 text-center text-slate-300 hidden sm:table-cell">{row.played}</td>
                          <td className="px-1 py-4 text-center text-slate-400 font-medium">{row.gf}</td>
                          <td className="px-1 py-4 text-center text-slate-400 font-medium">{row.ga}</td>
                          <td className="px-1 py-4 text-center text-slate-300 font-bold">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                          <td className="px-2 py-4 hidden md:table-cell">
                             <div className="flex justify-center gap-1">
                                {row.form.slice(-5).map((f, i) => (
                                  <div key={i} className={`w-1.5 h-4 rounded-full ${f==='W'?'bg-emerald-500':f==='D'?'bg-slate-500':'bg-red-500'}`}></div>
                                ))}
                             </div>
                          </td>
                          <td className="px-3 py-4 text-center font-black text-white text-xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 shadow-inner border-l border-slate-800">
                            {row.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* FIXTURES */}
        {activeTab === 'fixtures' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 pb-10">
            {!settings.started ? (
              <div className="text-center py-10 text-slate-500">Turnuva henüz başlamadı.</div>
            ) : (
              <div className="space-y-4">
                {Array.from(new Set(matches.map(m => m.round))).sort((a,b) => a-b).map(round => {
                   const roundMatches = matches.filter(m => m.round === round);
                   const isFinished = roundMatches.every(m => m.played);
                   return (
                    <div key={round} className={`rounded-xl overflow-hidden border transition-all ${isFinished ? 'bg-slate-900/30 border-slate-800/50 opacity-70' : 'bg-slate-900 border-slate-800'}`}>
                      <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider flex justify-between bg-slate-950/50 text-slate-400">
                        <span>Hafta {round}</span>
                      </div>
                      <div className="divide-y divide-slate-800/50">
                        {roundMatches.map(match => {
                          const h = players.find(p => p.id === match.home);
                          const a = players.find(p => p.id === match.away);
                          return (
                            <div key={match.id} className={`p-3 flex items-center justify-between transition-colors ${match.played ? 'bg-emerald-900/10' : ''}`}>
                              <div className="flex-1 text-right pr-3 flex items-center justify-end gap-2">
                                <div className="overflow-hidden">
                                   <div className="font-bold text-slate-200 text-sm truncate uppercase">{h?.name}</div>
                                   {h?.team && <div className="text-[10px] text-slate-500 truncate hidden xs:block">{h.team}</div>}
                                </div>
                                {h?.avatar && <img src={h.avatar} className="w-6 h-6 rounded-full object-cover hidden sm:block" onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/24x24/1e293b/94a3b8?text=AV'}}/>}
                              </div>
                              
                              <div className="flex items-center gap-1 min-w-[80px] justify-center">
                                {isAdmin ? (
                                  <>
                                    <input 
                                       type="number" 
                                       pattern="\d*"
                                       inputMode="numeric"
                                       value={match.homeScore} 
                                       onChange={(e) => handleMatchUpdate(match.id, 'homeScore', e.target.value)} 
                                       className={`w-8 h-8 border rounded text-center font-bold focus:border-emerald-500 outline-none p-0 ${match.played ? 'bg-emerald-950 border-emerald-900 text-emerald-400' : 'bg-slate-950 border-slate-700 text-white'}`} 
                                    />
                                    <span className="text-slate-600">-</span>
                                    <input 
                                       type="number" 
                                       pattern="\d*"
                                       inputMode="numeric"
                                       value={match.awayScore} 
                                       onChange={(e) => handleMatchUpdate(match.id, 'awayScore', e.target.value)} 
                                       className={`w-8 h-8 border rounded text-center font-bold focus:border-emerald-500 outline-none p-0 ${match.played ? 'bg-emerald-950 border-emerald-900 text-emerald-400' : 'bg-slate-950 border-slate-700 text-white'}`} 
                                    />
                                  </>
                                ) : (
                                  <div className={`px-3 py-1 rounded font-bold text-sm ${match.played ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50' : 'bg-slate-950 text-slate-300'}`}>
                                    {match.played ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 text-left pl-3 flex items-center justify-start gap-2">
                                {a?.avatar && <img src={a.avatar} className="w-6 h-6 rounded-full object-cover hidden sm:block" onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/24x24/1e293b/94a3b8?text=AV'}}/>}
                                <div className="overflow-hidden">
                                  <div className="font-bold text-slate-200 text-sm truncate uppercase">{a?.name}</div>
                                  {a?.team && <div className="text-[10px] text-slate-500 truncate hidden xs:block">{a.team}</div>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                   );
                })}
              </div>
            )}
          </div>
        )}

        {/* ADMIN SETTINGS */}
        {activeTab === 'admin' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
            {!isAdmin ? <div className="text-center py-10 text-slate-500">Yetkiniz yok.</div> : (
              <>
                {/* Turnuva İsmi ve Silme Ayarları */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <h3 className="text-slate-300 font-bold text-xs uppercase mb-3 flex items-center gap-2">
                      <Settings size={14} /> Turnuva Ayarları
                    </h3>
                    
                    {!editNameMode ? (
                      <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                         <span className="text-white font-bold">{settings.name}</span>
                         <button onClick={() => setEditNameMode(true)} className="text-emerald-400 hover:bg-emerald-900/20 p-2 rounded"><Edit3 size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex gap-2 mb-3">
                         <input 
                           value={tempName}
                           onChange={(e) => setTempName(e.target.value.toUpperCase())}
                           className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white font-bold uppercase"
                           placeholder="YENİ İSİM"
                         />
                         <button onClick={() => { onRename(tempName); setEditNameMode(false); }} className="bg-emerald-600 text-white px-3 rounded">OK</button>
                         <button onClick={() => { setTempName(settings.name); setEditNameMode(false); }} className="bg-slate-800 text-white px-3 rounded">İptal</button>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-slate-800">
                       <button onClick={onDelete} className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-900/10 p-3 rounded-lg text-xs font-bold transition-colors border border-transparent hover:border-red-900/30">
                          <Trash2 size={14} /> BU TURNUVAYI TAMAMEN SİL
                       </button>
                    </div>
                </div>

                {!settings.started && (
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <h3 className="text-slate-300 font-bold text-xs uppercase mb-3">Katılımcı Ekle</h3>
                    <AddPlayerForm onAdd={(name, team, avatar) => {
                      const newList = [...players, { id: Date.now().toString(), name, team, avatar }];
                      setPlayers(newList);
                      saveData({ players: newList, matches, settings });
                    }} />
                    <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                      {players.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <div className="flex items-center gap-2">
                            {p.avatar ? <img src={p.avatar} className="w-8 h-8 rounded-full object-cover" onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/32x32/1e293b/94a3b8?text=AV'}}/> : <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs">{p.name[0]}</div>}
                            <div>
                              <div className="text-white font-medium text-sm uppercase">{p.name}</div>
                              <div className="text-slate-500 text-[10px]">{p.team || 'Takımsız'}</div>
                            </div>
                          </div>
                          <button onClick={() => {
                             const newList = players.filter(x => x.id !== p.id);
                             setPlayers(newList);
                             saveData({ players: newList, matches, settings });
                          }} className="text-red-500 p-2 hover:bg-red-900/20 rounded"><Trash2 size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <h3 className="text-slate-300 font-bold text-xs uppercase mb-3">Fikstür İşlemleri</h3>
                    
                    {!settings.started ? (
                      <div className="space-y-3">
                         <div>
                           <label className="text-xs text-slate-400 block mb-1">Karşılaşma Sayısı (Devre)</label>
                           <div className="grid grid-cols-4 gap-2">
                             {[1,2,3,4].map(n => (
                               <button 
                                 key={n}
                                 onClick={() => setSettings({...settings, legs: n})}
                                 className={`py-2 rounded-lg text-sm font-bold border ${settings.legs === n ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                               >
                                 {n}x
                               </button>
                             ))}
                           </div>
                           <p className="text-[10px] text-slate-500 mt-1">
                             {settings.legs === 1 ? 'Herkes 1 kez karşılaşır (Tek maç).' : 
                              settings.legs === 2 ? 'İç saha ve Dış saha (Rövanşlı).' : 
                              `${settings.legs} kez karşılaşırlar.`}
                           </p>
                         </div>

                         <button onClick={() => generateFixtures(settings.legs || 2)} disabled={players.length < 2} className="w-full bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-lg font-bold text-sm shadow-lg shadow-emerald-600/20">
                           Fikstürü Başlat ({players.length} Kişi)
                         </button>
                         {players.length < 2 && <p className="text-red-400 text-xs text-center">Fikstür başlatmak için en az 2 oyuncu gerekli.</p>}
                      </div>
                    ) : (
                      <button onClick={handleResetFixtures} className="w-full border border-red-900 text-red-500 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-900/10">
                        <RefreshCw size={16} /> Fikstürü Sıfırla (Başa Dön)
                      </button>
                    )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* PLAYER DETAIL MODAL */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
           <div className="bg-slate-900 w-full sm:max-w-md max-h-[85vh] rounded-t-2xl sm:rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
              <div className="relative h-24 bg-gradient-to-r from-emerald-900 to-slate-900 flex items-center justify-center">
                 <button onClick={() => setSelectedPlayer(null)} className="absolute right-3 top-3 p-2 bg-black/20 rounded-full text-white/70 hover:text-white hover:bg-black/40"><X size={20}/></button>
                 <div className="text-center z-10 mt-8">
                    <h2 className="text-2xl font-bold text-white uppercase tracking-widest drop-shadow-lg">{selectedPlayer.name}</h2>
                    <div className="text-emerald-400 text-xs font-bold tracking-wide">{selectedPlayer.team}</div>
                 </div>
                 {selectedPlayer.avatar && <img src={selectedPlayer.avatar} className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay" onError={(e) => {e.target.onerror = null; e.target.src='https://placehold.co/400x100/1e293b/94a3b8?text=AV'}}/>}
              </div>
              
              <div className="flex justify-around p-4 border-b border-slate-800 bg-slate-900/50">
                 <div className="text-center">
                    <div className="text-2xl font-bold text-white">{selectedPlayer.played}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Maç</div>
                 </div>
                 <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400">{selectedPlayer.gf}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Gol</div>
                 </div>
                 <div className="text-center">
                    <div className="text-2xl font-bold text-white">{selectedPlayer.points}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Puan</div>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Fikstür Geçmişi</h3>
                 {matches.filter(m => m.home === selectedPlayer.id || m.away === selectedPlayer.id).sort((a,b) => a.round - b.round).map(m => {
                    const isHome = m.home === selectedPlayer.id;
                    const opponentId = isHome ? m.away : m.home;
                    const opponent = players.find(p => p.id === opponentId);
                    
                    let resultClass = "border-slate-800";
                    if(m.played) {
                       const myScore = parseInt(isHome ? m.homeScore : m.awayScore);
                       const oppScore = parseInt(isHome ? m.awayScore : m.homeScore);
                       if(myScore > oppScore) resultClass = "border-emerald-900/50 bg-emerald-900/10";
                       else if(myScore < oppScore) resultClass = "border-red-900/50 bg-red-900/10";
                       else resultClass = "border-slate-700 bg-slate-800/30";
                    }

                    return (
                       <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border ${resultClass}`}>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] font-bold text-slate-500 w-6">#{m.round}</span>
                             <div>
                                <div className="text-xs text-slate-400">{isHome ? 'İç Saha' : 'Deplasman'}</div>
                                <div className="text-sm font-bold text-white uppercase">{opponent?.name}</div>
                             </div>
                          </div>
                          <div className="font-mono font-bold text-white">
                             {m.played ? `${m.homeScore} - ${m.awayScore}` : <span className="text-slate-600 text-xs">v</span>}
                          </div>
                       </div>
                    );
                 })}
              </div>
           </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-safe pt-1 z-40">
        <div className="flex justify-around items-center h-14">
          <NavBtn icon={Trophy} label="Puanlar" active={activeTab === 'standings'} onClick={() => setActiveTab('standings')} />
          <NavBtn icon={Calendar} label="Fikstür" active={activeTab === 'fixtures'} onClick={() => setActiveTab('fixtures')} />
          {isAdmin && <NavBtn icon={Users} label="Yönetim" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />}
        </div>
      </div>
      <style>{`.pb-safe { padding-bottom: env(safe-area-inset-bottom); }`}</style>
    </div>
  );
}

const NavBtn = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 ${active ? 'text-emerald-400' : 'text-slate-500'}`}>
    <Icon size={20} className={active ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : ''} />
    <span className="text-[10px] font-medium mt-1">{label}</span>
  </button>
);

function AddPlayerForm({ onAdd }) {
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [avatar, setAvatar] = useState('');
  
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <input placeholder="İsim" value={name} onChange={e => setName(e.target.value.toUpperCase())} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-emerald-500 outline-none font-bold uppercase" />
        </div>
        <div className="flex-1">
           <input placeholder="Takım (Ops.)" value={team} onChange={e => setTeam(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-emerald-500 outline-none" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
           <ImageIcon size={14} className="absolute left-3 top-3 text-slate-500" />
           <input placeholder="Resim URL (Ops.)" value={avatar} onChange={e => setAvatar(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 pl-8 text-white text-sm focus:border-emerald-500 outline-none" />
        </div>
        <button disabled={!name.trim()} onClick={() => { onAdd(name, team, avatar); setName(''); setTeam(''); setAvatar(''); }} className="bg-emerald-600 disabled:opacity-50 text-white p-2 rounded-lg w-12 flex items-center justify-center">
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}