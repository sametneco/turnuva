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
  AlertTriangle,
  Check,
  Star,
  Home,
  MapPin,
  Zap,
  BarChart3,
  Target,
  Award,
  Flame
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
          <div className="mb-6 bg-slate-950/50 p-4 rounded-xl border border-slate-800 flex gap-2 items-center">
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

  // Skor düzenleme modu için state
  const [scoreEditMode, setScoreEditMode] = useState({});

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
  
    // --- Son 5 Maç Fonksiyonu ---
    const getLastFiveMatches = (playerId) => {
      // Oyuncunun katıldığı tüm maçları bul
      const playerMatches = matches
        .filter(match => match.played && (match.home === playerId || match.away === playerId))
        .sort((a, b) => new Date(b.updatedAt || b.playedAt || 0) - new Date(a.updatedAt || a.playedAt || 0))
        .slice(0, 5);
      
      // Her maç için detaylı bilgi oluştur
      return playerMatches.map(match => {
        const isHome = match.home === playerId;
        const opponentId = isHome ? match.away : match.home;
        const opponent = players.find(p => p.id === opponentId);
        const playerScore = isHome ? parseInt(match.homeScore) : parseInt(match.awayScore);
        const opponentScore = isHome ? parseInt(match.awayScore) : parseInt(match.homeScore);
        
        let result = '';
        if (playerScore > opponentScore) result = 'W';
        else if (playerScore < opponentScore) result = 'L';
        else result = 'D';
        
        return {
          id: match.id,
          opponent: opponent ? opponent.name : 'Bilinmeyen',
          opponentTeam: opponent ? opponent.team : '',
          isHome,
          playerScore,
          opponentScore,
          result,
          date: match.updatedAt || match.playedAt
        };
      });
    };

  // --- Gelişmiş İstatistikler Fonksiyonu ---
  const getPlayerStats = (playerId) => {
    // Oyuncunun tüm maçlarını bul
    const playerMatches = matches.filter(match => 
      match.played && (match.home === playerId || match.away === playerId)
    );
    
    if (playerMatches.length === 0) {
      return {
        mostDefeatedOpponent: null,
        uniqueOpponent: null,
        unbeatenAtHome: true,
        moreGoalsAway: false,
        biggestWin: null,
        biggestLoss: null,
        homeRecord: { wins: 0, draws: 0, losses: 0 },
        awayRecord: { wins: 0, draws: 0, losses: 0 }
      };
    }
    
    // Rakip istatistiklerini hesapla
    const opponentStats = {};
    
    playerMatches.forEach(match => {
      const isHome = match.home === playerId;
      const opponentId = isHome ? match.away : match.home;
      const opponent = players.find(p => p.id === opponentId);
      
      if (opponent) {
        if (!opponentStats[opponentId]) {
          opponentStats[opponentId] = {
            id: opponentId,
            name: opponent.name,
            wins: 0,
            losses: 0,
            draws: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            matches: 0
          };
        }
        
        opponentStats[opponentId].matches++;
        
        const playerScore = isHome ? parseInt(match.homeScore) : parseInt(match.awayScore);
        const opponentScore = isHome ? parseInt(match.awayScore) : parseInt(match.homeScore);
        
        opponentStats[opponentId].goalsFor += playerScore;
        opponentStats[opponentId].goalsAgainst += opponentScore;
        
        if (playerScore > opponentScore) {
          opponentStats[opponentId].wins++;
        } else if (playerScore < opponentScore) {
          opponentStats[opponentId].losses++;
        } else {
          opponentStats[opponentId].draws++;
        }
      }
    });
    
    // En çok yenilen rakip
    let mostDefeatedOpponent = null;
    let maxWins = 0;
    
    Object.values(opponentStats).forEach(stats => {
      if (stats.wins > maxWins) {
        maxWins = stats.wins;
        mostDefeatedOpponent = stats;
      }
    });
    
    // En çok farklı sonuçla yenilen rakip (en fazla gol farkı)
    let uniqueOpponent = null;
    let maxGoalDifference = 0;
    
    Object.values(opponentStats).forEach(stats => {
      // Sadece kazanılan maçları hesaba kat
      if (stats.wins > 0) {
        const avgGoalDiff = stats.wins > 0 ? 
          (stats.goalsFor - stats.goalsAgainst) / stats.matches : 0;
        if (avgGoalDiff > maxGoalDifference) {
          maxGoalDifference = avgGoalDiff;
          uniqueOpponent = stats;
        }
      }
    });
    
    // Ev sahibi rekortmenlik
    const homeMatches = playerMatches.filter(m => m.home === playerId);
    const awayMatches = playerMatches.filter(m => m.away === playerId);
    
    const homeWins = homeMatches.filter(m => {
      const homeScore = parseInt(m.homeScore);
      const awayScore = parseInt(m.awayScore);
      return homeScore > awayScore;
    }).length;
    
    const homeLosses = homeMatches.filter(m => {
      const homeScore = parseInt(m.homeScore);
      const awayScore = parseInt(m.awayScore);
      return homeScore < awayScore;
    }).length;
    
    const awayGoals = awayMatches.reduce((total, m) => {
      const awayScore = m.away === playerId ? parseInt(m.awayScore) : parseInt(m.homeScore);
      return total + awayScore;
    }, 0);
    
    const homeGoals = homeMatches.reduce((total, m) => {
      const homeScore = m.home === playerId ? parseInt(m.homeScore) : parseInt(m.awayScore);
      return total + homeScore;
    }, 0);
    
    // En büyük galibiyet
    let biggestWin = null;
    let maxWinDiff = 0;
    
    playerMatches.forEach(match => {
      const isHome = match.home === playerId;
      const playerScore = isHome ? parseInt(match.homeScore) : parseInt(match.awayScore);
      const opponentScore = isHome ? parseInt(match.awayScore) : parseInt(match.homeScore);
      
      if (playerScore > opponentScore) {
        const diff = playerScore - opponentScore;
        if (diff > maxWinDiff) {
          maxWinDiff = diff;
          biggestWin = {
            match,
            opponent: isHome ? 
              players.find(p => p.id === match.away)?.name : 
              players.find(p => p.id === match.home)?.name,
            score: `${playerScore}-${opponentScore}`,
            goalDifference: diff
          };
        }
      }
    });
    
    // En büyük mağlubiyet
    let biggestLoss = null;
    let maxLossDiff = 0;
    
    playerMatches.forEach(match => {
      const isHome = match.home === playerId;
      const playerScore = isHome ? parseInt(match.homeScore) : parseInt(match.awayScore);
      const opponentScore = isHome ? parseInt(match.awayScore) : parseInt(match.homeScore);
      
      if (playerScore < opponentScore) {
        const diff = opponentScore - playerScore;
        if (diff > maxLossDiff) {
          maxLossDiff = diff;
          biggestLoss = {
            match,
            opponent: isHome ? 
              players.find(p => p.id === match.away)?.name : 
              players.find(p => p.id === match.home)?.name,
            score: `${playerScore}-${opponentScore}`,
            goalDifference: diff
          };
        }
      }
    });
    
    return {
      mostDefeatedOpponent: mostDefeatedOpponent && maxWins > 0 ? mostDefeatedOpponent : null,
      uniqueOpponent: uniqueOpponent,
      unbeatenAtHome: homeLosses === 0 && homeMatches.length > 0,
      moreGoalsAway: awayGoals > homeGoals,
      biggestWin,
      biggestLoss,
      homeRecord: {
        wins: homeWins,
        draws: homeMatches.length - homeWins - homeLosses,
        losses: homeLosses
      },
      awayRecord: {
        wins: awayMatches.filter(m => {
          const homeScore = parseInt(m.homeScore);
          const awayScore = parseInt(m.awayScore);
          return awayScore > homeScore;
        }).length,
        draws: awayMatches.filter(m => {
          const homeScore = parseInt(m.homeScore);
          const awayScore = parseInt(m.awayScore);
          return awayScore === homeScore;
        }).length,
        losses: awayMatches.filter(m => {
          const homeScore = parseInt(m.homeScore);
          const awayScore = parseInt(m.awayScore);
          return awayScore < homeScore;
        }).length
      }
    };
  };

  // --- Tahminler Fonksiyonu ---
  const getUpcomingRoundPredictions = () => {
    // Sadece oynanmamış maçları al
    const upcomingMatches = matches.filter(m => !m.played);
    
    if (upcomingMatches.length === 0) return [];
    
    // En yakın turu bul (en düşük round numarası)
    const nextRound = Math.min(...upcomingMatches.map(m => m.round));
    
    // Bu turdaki maçları al
    const nextRoundMatches = upcomingMatches.filter(m => m.round === nextRound);
    
    // Turnuvada oynanan maç sayısını kontrol et
    const playedMatchesCount = matches.filter(m => m.played).length;
    
    // Her maç için performansa dayalı olasılık hesapla
    return nextRoundMatches.map(match => {
      const homePlayer = players.find(p => p.id === match.home);
      const awayPlayer = players.find(p => p.id === match.away);
      
      if (!homePlayer || !awayPlayer) {
        return {
          ...match,
          homePlayer: { name: 'Bilinmeyen', team: '' },
          awayPlayer: { name: 'Bilinmeyen', team: '' },
          homeWinProbability: 50,
          awayWinProbability: 50
        };
      }
      
      // Eğer hiç maç oynanmamışsa, olasılıkları gösterme
      if (playedMatchesCount === 0) {
        return {
          ...match,
          homePlayer,
          awayPlayer,
          homeWinProbability: null, // null gösteriyoruz ki ? işareti gösterilebilsin
          awayWinProbability: null
        };
      }
      
      // Oyuncuların geçmiş performanslarını al
      const homePlayerMatches = matches.filter(m => m.played && (m.home === homePlayer.id || m.away === homePlayer.id));
      const awayPlayerMatches = matches.filter(m => m.played && (m.home === awayPlayer.id || m.away === awayPlayer.id));
      
      // Galibiyet oranlarını hesapla
      const homeWins = homePlayerMatches.filter(m => {
        if (m.home === homePlayer.id) return parseInt(m.homeScore) > parseInt(m.awayScore);
        if (m.away === homePlayer.id) return parseInt(m.awayScore) > parseInt(m.homeScore);
        return false;
      }).length;
      
      const awayWins = awayPlayerMatches.filter(m => {
        if (m.home === awayPlayer.id) return parseInt(m.homeScore) > parseInt(m.awayScore);
        if (m.away === awayPlayer.id) return parseInt(m.awayScore) > parseInt(m.homeScore);
        return false;
      }).length;
      
      const homeWinRate = homePlayerMatches.length > 0 ? (homeWins / homePlayerMatches.length) : 0.5;
      const awayWinRate = awayPlayerMatches.length > 0 ? (awayWins / awayPlayerMatches.length) : 0.5;
      
      // Ev sahibi avantajı
      const homeAdvantage = match.home === homePlayer.id ? 0.1 : 0; // %10 ev sahibi avantajı
      
      // Olasılıkları hesapla (toplam %100 olacak şekilde)
      let homeProbability = (homeWinRate + homeAdvantage) * 100;
      let awayProbability = awayWinRate * 100;
      
      // Normalize et
      const total = homeProbability + awayProbability;
      if (total > 0) {
        homeProbability = Math.round((homeProbability / total) * 100);
        awayProbability = 100 - homeProbability;
      } else {
        homeProbability = 50;
        awayProbability = 50;
      }
      
      // Minimum %10, maksimum %90 sınırlaması
      if (homeProbability < 10) homeProbability = 10;
      if (homeProbability > 90) homeProbability = 90;
      if (awayProbability < 10) awayProbability = 10;
      if (awayProbability > 90) awayProbability = 90;
      
      return {
        ...match,
        homePlayer,
        awayPlayer,
        homeWinProbability: Math.round(homeProbability),
        awayWinProbability: Math.round(awayProbability)
      };
    });
  };

  // --- Recent Round Matches Logic ---
  const getRecentRoundMatches = () => {
    // Sadece oynanan maçları al ve tarihe göre sırala
    const playedMatches = matches.filter(m => m.played);
    
    if (playedMatches.length === 0) return [];
    
    // En son oynanan turu bul
    const latestRound = Math.max(...playedMatches.map(m => m.round));
    
    // Bu turdaki tüm maçları al
    return matches.filter(m => m.played && m.round === latestRound);
  };
  
  // --- Live News Logic ---
  const liveNews = useMemo(() => {
    const news = [];
    
    // Fun emojis and icons for different events
    const emojis = {
      goal: ['⚽', '🥅', '⚡', '🎯'],
      win: ['🔥', '💪', '🏆', '👑'],
      streak: ['🧨', '☄️', '🌪️', '🌋'],
      rise: ['🚀', '📈', '🌟', '✨'],
      close: ['🤝', '⚔️', '🤼', '🎪'],
      upset: ['🤯', '😱', '💥', '💣'],
      cleanSheet: ['🛡️', '🧼', '✨', '💎']
    };
    
    // Turkish humorous tournament news templates
    const turkishNewsTemplates = {
      // A) TURNUVA ÖNCESİ (MAÇ BAŞLAMADAN)
      preTournament: [
        "Turnuva öncesi herkes kendini şampiyon ilan etti, topun ise bu konuda bir fikri yok.",
        "{player} daha maç başlamadan kupa konuşmaya başladı, hepimiz sessizce gülüyoruz.",
        "Oyuncular iddialı, yetenekler tartışmalı; turnuva tam bizlik.",
        "Turnuva öncesi açıklamalar: ‘Hazırım’ diyen çok, gerçekten hazır olan yok.",
        "Henüz topa vurulmadı ama dedikodu puanlaması yapılsa {player} liderdi.",
        "Turnuva başlamadan bazıları havaya girdi; umarız oyun menüsünü açmayı unutmamışlardır.",
        "Daha maç oynanmadan büyük laflar uçuşuyor; umarız kollar uçmaz.",
        "{player} ısınırken rakiplerine psikolojik baskı uyguladı: ‘Ben iyiyim’ dedi, herkes dağıldı."
      ],
      
      // B) KÜÇÜK FARKLI GALİBİYET (diff = 1-2)
      closeWin: [
        "{winner}, {loser} karşısında ince ince işledi ve 3 puanı aldı.",
        "{loser} direnmeye çalıştı ama {winner} ‘hadi kardeşim’ deyip işi bitirdi.",
        "Bir tık üstün olan {winner}, maçı çantasına koyup gitti.",
        "{loser} iyi oynadı ama yetmedi, {winner} biraz daha iyi oynadı o kadar.",
        "{winner} zor da olsa kazandı; bu maç tansiyon ölçerle izlenmelikti.",
        "{loser}, {winner}’ı yakalayacak gibiydi ama joystick izin vermedi.",
        "{winner} maçı aldı ama kalp krizi garantiliydi.",
        "{loser} ‘tamam geliyorum’ dedi ama asla yetişemedi."
      ],
      
      // C) BÜYÜK FARKLI GALİBİYET (diff ≥ 3)
      bigWin: [
        "{winner}, {loser}’a öyle bir fark attı ki kaç kere kol değiştirdi bilinmiyor.",
        "{loser} daha ne olduğunu anlamadan {winner} maçı paketledi.",
        "{loser}, bu maçtan sonra bir süre menü ekranına bakacak gibi.",
        "{winner}, {loser}’ı sahadan aldı, paket yaptı, kargoya verdi.",
        "Bu farktan sonra {loser} bir süre kimseyle konuşmayacak gibi.",
        "{winner} öyle oynadı ki {loser} sadece izledi… ve acı çekti.",
        "Turnuvada en büyük tokatlardan biri: {winner} → {loser}.",
        "{loser}’ın kolu değil, ruhu bile yetişemedi {winner}’a."
      ],
      
      // D) UPSET – ZAYIF OLAN FAVORİYİ YENERSE
      upset: [
        "Favori {loser} bugün sahada eridi, {winner} ise parladı.",
        "{winner}, ‘sürpriz yoktur, yapan vardır’ diyerek favoriyi devirdi.",
        "{loser} için üzücü, {winner} için tarihî bir gündü.",
        "Favori neye uğradığını şaşırdı, {winner} şaşırtmayı seviyor.",
        "Analistlerin hepsi yanıldı; {winner} kimsenin beklemediğini yaptı.",
        "{winner} bugün turnuvanın akışını değiştirdi.",
        "{loser} favoriydi ama kağıt üstünde; sahada {winner} konuştu.",
        "Favori gitti, sürpriz geldi; {winner} sahneyi devraldı."
      ],
      
      // F) BERABERLİK
      draw: [
        "{team1} ve {team2} öyle pozisyonlar kaçırdı ki VAR bile üzüldü.",
        "Maç berabere bitti ama iki taraf da ‘biz daha iyiydik’ modunda.",
        "Puanlar paylaşıldı, sinirler paylaşılmadı.",
        "{team1} ve {team2} gol atamadı ama seyirciye stres attırdı.",
        "Beraberlik geldi, maçın kazananı tansiyon cihazları oldu.",
        "Beraberlik hissi: ne sevindirir ne üzer, sadece yorar.",
        "{team1} ve {team2}, ‘sen vur ben kaçırayım’ modunda oynadı.",
        "Maç berabere, ama kaçan goller hâlâ sahada dolaşıyor."
      ],
      
      // G) ÇOK KÖTÜ OYNAYAN – FORM DÜŞÜK
      poorForm: [
        "{player} bugün joystick’i tost makinesine bağlamış gibi oynadı.",
        "{player}, rakibe gizli görevle yardım ediyor gibiydi.",
        "{player} bugün sahada mıydı yoksa menüde mi kaldı bilinmiyor.",
        "{player} topu görünce ürktü, rakip görünce dondu.",
        "Bu performanstan sonra {player}’a teknik servis bakmalı.",
        "{player} bugün offline gibiydi ama maça online girdi.",
        "{player}, ‘bu kadar kötü oynanır mı?’ dersinde hocaydı.",
        "{player}’ın kolu değil, ruhu bile geç tepki verdi."
      ],
      
      // H) ÇOK İYİ PERFORMANS – FORMDA OLAN
      goodForm: [
        "{winner} bugün öyle oynadı ki meteor düşse durmazdı.",
        "{winner} modu ‘efsane’ yapmış, herkes izledi.",
        "Bu performansı kaydedin, tarih kitaplarına girer.",
        "{winner} bugün oynadı, rakipler sadece baktı.",
        "{winner} hızlandı, geri kalanlar yaya kaldı.",
        "Sahada tek ışık saçan oyuncu: {winner}.",
        "{winner} bugün oyun mekaniğini çözdü, hatta hackledi.",
        "Rakipler terledi, {winner} eğlendi."
      ],
      
      // I) ŞANSI KALMAYAN OYUNCU
      noChance: [
        "{player}’ın şansı kalmadı; artık hatıralar oynuyor.",
        "{player} için turnuva bitti ama muhabbet yeni başlıyor.",
        "{player} artık sadece istatistiklerde yer kaplıyor.",
        "Matematik bile ‘yok’ diyor; {player} umudu bıraktı.",
        "{player}, turnuvada turist modunda dolanıyor.",
        "{player} artık sadece eğlenmek için geliyor.",
        "{player} için tek hedef: sonuncu olmamak.",
        "{player}, kupayı rüyasında bile göremiyor artık."
      ],
      
      // J) ŞAMPİYONLUK YARIŞINDA OLAN
      championshipRace: [
        "{player} şampiyonluk kokusunu aldı, durmuyor.",
        "Final yaklaşırken {player} rüzgar gibi esiyor.",
        "Kulislerde ‘{player} kupayı alır mı?’ fısıltıları yükseldi.",
        "{player} adım adım zirveye tırmanıyor.",
        "Şampiyonluk adayları içinde en tehlikelisi: {player}.",
        "{player}, bugün rakiplerine gözdağı verdi.",
        "Formu yükseldikçe rakiplerin kalbi düşüyor.",
        "{player} kupanın gölgesine girdi, sıra almaya kaldı."
      ],
      
      // K) İSTATİSTİKSEL ESPRİLER
      statistical: [
        "{player} gol kralı olma yolunda; rakipler ‘biraz yavaşla’ diye yalvarıyor.",
        "{player} o kadar gol attı ki fileler sendika kuracak.",
        "En çok gol yiyen aday: {player}. Defans değil süzgeç.",
        "{player}’ın yenilmezlik serisi devam ediyor; rakipler ise perişan.",
        "{player} üst üste kazandıkça turnuvada huzur kalmıyor.",
        "{player}’ın mağlubiyet serisi var… psikolojik destek lazım.",
        "Asistlerde zirve {player}: rakiplerin gözünden yaş geliyor.",
        "{player} bugün öyle istatistik yaptı ki bilgisayar bile lag girdi."
      ],
      
      // L) GENEL GOYGOY / HER DURUMA UYGUN
      general: [
        "Turnuvada ortalık karışık; dedikodu çok, yetenek az.",
        "{player} böyle giderse seyirciler popcornla izleyecek.",
        "Drama da var, komedi de; kaliteyi aramayın.",
        "Bugün turnuvada olanlar: kaos, stres ve bol kahkaha.",
        "{player} sahaya çıktı, rakipler huzurunu kaybetti.",
        "Turnuvanın tek garantisi: kimsenin ne yaptığını bilmemesi.",
        "{player} biraz oynadı, ortalık karıştı.",
        "Bu turnuva oyun değil; tam bir Türk aile dramı."
      ]
    };
    
    // Get random emoji from category
    const getRandomEmoji = (category) => {
      const emojiList = emojis[category] || ['📢', '📰', '📺'];
      return emojiList[Math.floor(Math.random() * emojiList.length)];
    };
    
    // Get random Turkish news template from category
    const getRandomTurkishTemplate = (category, variables = {}) => {
      const templates = turkishNewsTemplates[category] || turkishNewsTemplates.general;
      const template = templates[Math.floor(Math.random() * templates.length)];
      
      // Replace variables in template
      let result = template;
      Object.keys(variables).forEach(key => {
        result = result.replace(new RegExp(`{${key}}`, 'g'), variables[key]);
      });
      
      return result;
    };
    
    // En son oynanan maçlar
    const playedMatches = matches.filter(m => m.played);
    
    // Turnuva yeni başlamışsa (az sayıda maç varsa) genel duyurular yap
    if (playedMatches.length === 0) {
      // Turnuva başlangıç haberleri
      const preTournamentMessage = getRandomTurkishTemplate('preTournament', {
        player: players.length > 0 ? players[Math.floor(Math.random() * players.length)].name : 'Bilinmeyen'
      });
      
      news.push({
        id: 'start_message',
        type: 'start',
        text: `📣 ${preTournamentMessage}`,
        time: 'Başlangıç'
      });
    }
    
    // Yeterli sayıda maç oynandıysa detaylı analizler yap
    if (playedMatches.length > 0) {
      // En son 3 maçı al
      const recentMatches = playedMatches
        .sort((a, b) => new Date(b.updatedAt || b.playedAt || 0) - new Date(a.updatedAt || a.playedAt || 0))
        .slice(0, 3);
      
      recentMatches.forEach(match => {
        const homePlayer = players.find(p => p.id === match.home);
        const awayPlayer = players.find(p => p.id === match.away);
        if (homePlayer && awayPlayer) {
          const homeScore = parseInt(match.homeScore);
          const awayScore = parseInt(match.awayScore);
          const diff = Math.abs(homeScore - awayScore);
          
          // Close match (1-2 goal difference)
          if (diff >= 1 && diff <= 2) {
            const winner = homeScore > awayScore ? homePlayer : awayPlayer;
            const loser = homeScore > awayScore ? awayPlayer : homePlayer;
            const closeWinMessage = getRandomTurkishTemplate('closeWin', {
              winner: winner.name,
              loser: loser.name
            });
            news.push({
              id: `close_${match.id}`,
              type: 'close_match',
              text: `${getRandomEmoji('close')} ${closeWinMessage}`,
              time: 'Dramatik'
            });
          }
          // Big win (3+ goal difference)
          else if (diff >= 3) {
            const winner = homeScore > awayScore ? homePlayer : awayPlayer;
            const loser = homeScore > awayScore ? awayPlayer : homePlayer;
            const bigWinMessage = getRandomTurkishTemplate('bigWin', {
              winner: winner.name,
              loser: loser.name
            });
            news.push({
              id: `bigwin_${match.id}`,
              type: 'big_win',
              text: `${getRandomEmoji('goal')} ${bigWinMessage}`,
              time: 'Büyük Maç'
            });
          }
          // Regular match result (draw or small difference)
          else {
            // Draw
            if (homeScore === awayScore) {
              const drawMessage = getRandomTurkishTemplate('draw', {
                team1: homePlayer.name,
                team2: awayPlayer.name
              });
              news.push({
                id: `draw_${match.id}`,
                type: 'draw',
                text: `${getRandomEmoji('close')} ${drawMessage}`,
                time: 'Beraberlik'
              });
            }
            // Regular win
            else {
              const winner = homeScore > awayScore ? homePlayer : awayPlayer;
              const loser = homeScore > awayScore ? awayPlayer : homePlayer;
              const closeWinMessage = getRandomTurkishTemplate('closeWin', {
                winner: winner.name,
                loser: loser.name
              });
              news.push({
                id: `recent_${match.id}`,
                type: 'recent_match',
                text: `${getRandomEmoji('goal')} ${closeWinMessage}`,
                time: 'Sonuç'
              });
            }
          }
        }
      });
    }
    
    // En çok gol atan
    if (standings.length > 0) {
      const topScorer = standings.reduce((max, player) => player.gf > max.gf ? player : max, standings[0]);
      if (topScorer.gf > 0) {
        const statisticalMessage = getRandomTurkishTemplate('statistical', {
          player: `${topScorer.name} (${topScorer.gf} gol)`
        });
        
        news.push({
          id: 'top_scorer',
          type: 'top_scorer',
          text: `${getRandomEmoji('goal')} ${statisticalMessage}`,
          time: 'Güncel'
        });
      }
    }
    
    // Temiz file (clean sheet)
    const cleanSheets = standings.filter(player => player.ga === 0 && player.played > 0);
    cleanSheets.forEach(player => {
      const poorFormMessage = getRandomTurkishTemplate('poorForm', {
        player: `${player.name} (${player.ga} gol yedi)`
      });
      
      news.push({
        id: `cleansheet_${player.id}`,
        type: 'clean_sheet',
        text: `${getRandomEmoji('cleanSheet')} ${poorFormMessage}`,
        time: 'Kalecilerin Günü'
      });
    });
    
    // En çok gol yiyen
    if (standings.length > 0) {
      const mostGoalsConceded = standings.reduce((max, player) => player.ga > max.ga ? player : max, standings[0]);
      if (mostGoalsConceded.ga > 0) {
        const statisticalMessage = getRandomTurkishTemplate('statistical', {
          player: `${mostGoalsConceded.name} (${mostGoalsConceded.ga} gol yedi)`
        });
        
        news.push({
          id: 'most_goals_conceded',
          type: 'most_goals_conceded',
          text: `${getRandomEmoji('cleanSheet')} ${statisticalMessage}`,
          time: 'Delikli File'
        });
      }
    }
    
    // Çekişmeli maçlar (berabere kalanlar)
    const drawMatches = playedMatches.filter(m => {
      const homeScore = parseInt(m.homeScore);
      const awayScore = parseInt(m.awayScore);
      return homeScore === awayScore && homeScore > 0; // Only non-zero draws
    });
    
    if (drawMatches.length > 0) {
      const recentDraw = drawMatches[drawMatches.length - 1]; // Last draw
      const homePlayer = players.find(p => p.id === recentDraw.home);
      const awayPlayer = players.find(p => p.id === recentDraw.away);
      
      if (homePlayer && awayPlayer) {
        const drawMessage = getRandomTurkishTemplate('draw', {
          team1: homePlayer.name,
          team2: awayPlayer.name
        });
        
        news.push({
          id: `draw_${recentDraw.id}`,
          type: 'draw',
          text: `${getRandomEmoji('close')} ${drawMessage}`,
          time: 'Çekişme'
        });
      }
    }
    
    // Sürpriz galibiyet (düşük sıradaki oyuncu yüksek sıradakini yense)
    const upsetWins = playedMatches.filter(m => {
      if (!m.played) return false;
      const homeScore = parseInt(m.homeScore);
      const awayScore = parseInt(m.awayScore);
      
      // Only consider wins
      if (homeScore === awayScore) return false;
      
      const homePlayer = players.find(p => p.id === m.home);
      const awayPlayer = players.find(p => p.id === m.away);
      
      if (!homePlayer || !awayPlayer) return false;
      
      // Find standings positions
      const homePosition = standings.findIndex(s => s.id === homePlayer.id) + 1;
      const awayPosition = standings.findIndex(s => s.id === awayPlayer.id) + 1;
      
      // If lower ranked player beats higher ranked (at least 2 position difference)
      if (homeScore > awayScore && awayPosition >= homePosition + 2) {
        return true; // Away player was higher ranked but lost
      }
      if (awayScore > homeScore && homePosition >= awayPosition + 2) {
        return true; // Home player was higher ranked but lost
      }
      
      return false;
    });
    
    if (upsetWins.length > 0) {
      const recentUpset = upsetWins[upsetWins.length - 1]; // Last upset
      const homePlayer = players.find(p => p.id === recentUpset.home);
      const awayPlayer = players.find(p => p.id === recentUpset.away);
      const homeScore = parseInt(recentUpset.homeScore);
      const awayScore = parseInt(recentUpset.awayScore);
      
      if (homePlayer && awayPlayer) {
        const winner = homeScore > awayScore ? homePlayer : awayPlayer;
        const loser = homeScore > awayScore ? awayPlayer : homePlayer;
        
        const upsetMessage = getRandomTurkishTemplate('upset', {
          winner: winner.name,
          loser: loser.name
        });
        
        news.push({
          id: `upset_${recentUpset.id}`,
          type: 'upset',
          text: `${getRandomEmoji('upset')} ${upsetMessage}`,
          time: 'Sürpriz'
        });
      }
    }
    
    // En uzun galibiyet serisi
    if (standings.length > 0) {
      let bestWinStreak = 0;
      let bestWinStreakPlayer = null;
      
      standings.forEach(player => {
        // Sonuçlardan galibiyet serisini hesapla
        let currentStreak = 0;
        let maxStreak = 0;
        
        player.form.forEach(result => {
          if (result === 'W') {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          } else {
            currentStreak = 0;
          }
        });
        
        if (maxStreak > bestWinStreak) {
          bestWinStreak = maxStreak;
          bestWinStreakPlayer = player;
        }
      });
      
      if (bestWinStreak >= 2 && bestWinStreakPlayer) {
        const goodFormMessage = getRandomTurkishTemplate('goodForm', {
          winner: bestWinStreakPlayer.name
        });
        
        news.push({
          id: 'win_streak',
          type: 'win_streak',
          text: `${getRandomEmoji('streak')} ${goodFormMessage}`,
          time: 'Seri'
        });
      }
    }
    
    // İyi çıkış yapan (son 3 maçta en az 2 galibiyet)
    if (standings.length > 0) {
      const risingPlayers = standings.filter(player => {
        const recentForm = player.form.slice(-3);
        const wins = recentForm.filter(r => r === 'W').length;
        return wins >= 2 && recentForm.length >= 2;
      });
      
      risingPlayers.forEach(player => {
        const recentForm = player.form.slice(-3);
        const wins = recentForm.filter(r => r === 'W').length;
        
        const riseMessage = getRandomTurkishTemplate('rise', {
          player: player.name
        });
        
        news.push({
          id: `rising_${player.id}`,
          type: 'rising',
          text: `${getRandomEmoji('rise')} ${riseMessage}`,
          time: 'Çıkış'
        });
      });
    }
    
    // Oyuncuların geçmiş maçlarını analiz ederek istatistiksel haberler
    if (standings.length > 0 && playedMatches.length > 0) {
      // Oyuncular arasındaki geçmiş maçları kontrol et
      standings.forEach(player => {
        // Bu oyuncunun katıldığı tüm maçları bul
        const playerMatches = matches.filter(m => 
          m.played && (m.home === player.id || m.away === player.id)
        );
        
        // Rakip oyunculara göre istatistikleri hesapla
        const opponentStats = {};
        
        playerMatches.forEach(match => {
          const isHome = match.home === player.id;
          const opponentId = isHome ? match.away : match.home;
          const opponent = players.find(p => p.id === opponentId);
          
          if (opponent) {
            if (!opponentStats[opponentId]) {
              opponentStats[opponentId] = {
                name: opponent.name,
                wins: 0,
                losses: 0,
                draws: 0,
                totalMatches: 0
              };
            }
            
            opponentStats[opponentId].totalMatches++;
            
            const playerScore = isHome ? parseInt(match.homeScore) : parseInt(match.awayScore);
            const opponentScore = isHome ? parseInt(match.awayScore) : parseInt(match.homeScore);
            
            if (playerScore > opponentScore) {
              opponentStats[opponentId].wins++;
            } else if (playerScore < opponentScore) {
              opponentStats[opponentId].losses++;
            } else {
              opponentStats[opponentId].draws++;
            }
          }
        });
        
        // En çok kazanılan rakip (sadece 3 veya daha fazla maç yapıldıysa)
        let bestOpponent = null;
        let maxWins = 0;
        
        Object.values(opponentStats).forEach(stats => {
          if (stats.wins > maxWins && stats.totalMatches >= 3) {
            maxWins = stats.wins;
            bestOpponent = stats;
          }
        });
        
        if (bestOpponent && maxWins >= 2) {
          const statisticalMessage = getRandomTurkishTemplate('statistical', {
            player: `${player.name} (${maxWins} kez kazandı)`
          });
          
          news.push({
            id: `best_opponent_${player.id}`,
            type: 'best_opponent',
            text: `🔥 ${statisticalMessage}`,
            time: 'İstatistik'
          });
        }
        
        // En çok kaybedilen rakip (sadece 3 veya daha fazla maç yapıldıysa)
        let worstOpponent = null;
        let maxLosses = 0;
        
        Object.values(opponentStats).forEach(stats => {
          if (stats.losses > maxLosses && stats.totalMatches >= 3) {
            maxLosses = stats.losses;
            worstOpponent = stats;
          }
        });
        
        if (worstOpponent && maxLosses >= 2) {
          const poorFormMessage = getRandomTurkishTemplate('poorForm', {
            player: `${player.name} (${maxLosses} kez kaybetti)`
          });
          
          news.push({
            id: `worst_opponent_${player.id}`,
            type: 'worst_opponent',
            text: `⚠️ ${poorFormMessage}`,
            time: 'İstatistik'
          });
        }
      });
    }
    
    // Gelecek maçlar hakkında tahminler
    const upcomingMatches = matches.filter(m => !m.played);
    if (upcomingMatches.length > 0 && standings.length > 0) {
      // Rastgele 3 maç seç
      const sampleMatches = [...upcomingMatches]
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      
      sampleMatches.forEach(match => {
        const homePlayer = players.find(p => p.id === match.home);
        const awayPlayer = players.find(p => p.id === match.away);
        
        if (homePlayer && awayPlayer) {
          // Önceki karşılaşmaları kontrol et
          const previousMatches = matches.filter(m => 
            m.played && 
            ((m.home === homePlayer.id && m.away === awayPlayer.id) || 
             (m.home === awayPlayer.id && m.away === homePlayer.id))
          );
          
          if (previousMatches.length > 0) {
            // Önceki maçlardaki performansı incele
            const homeWins = previousMatches.filter(m => {
              if (m.home === homePlayer.id) return parseInt(m.homeScore) > parseInt(m.awayScore);
              if (m.away === homePlayer.id) return parseInt(m.awayScore) > parseInt(m.homeScore);
              return false;
            }).length;
            
            const awayWins = previousMatches.filter(m => {
              if (m.home === awayPlayer.id) return parseInt(m.homeScore) > parseInt(m.awayScore);
              if (m.away === awayPlayer.id) return parseInt(m.awayScore) > parseInt(m.homeScore);
              return false;
            }).length;
            
            // Tahmin yap
            let prediction = '';
            if (homeWins > awayWins) {
              const championshipRaceMessage = getRandomTurkishTemplate('championshipRace', {
                player: homePlayer.name
              });
              prediction = `${championshipRaceMessage} ${getRandomEmoji('win')}`;
            } else if (awayWins > homeWins) {
              const upsetMessage = getRandomTurkishTemplate('upset', {
                winner: awayPlayer.name,
                loser: homePlayer.name
              });
              prediction = `${upsetMessage} ${getRandomEmoji('win')}`;
            } else {
              const generalMessage = getRandomTurkishTemplate('general', {
                player: homePlayer.name
              });
              prediction = `${generalMessage} 🤔`;
            }
            
            news.push({
              id: `prediction_${match.id}`,
              type: 'prediction',
              text: `🔮 ${homePlayer.name} vs ${awayPlayer.name}: ${prediction}`,
              time: 'Tahmin'
            });
          }
          
          // İlginç eşleşmeler için özel tahminler
          if (standings.length > 0) {
            const homeStanding = standings.findIndex(s => s.id === homePlayer.id) + 1;
            const awayStanding = standings.findIndex(s => s.id === awayPlayer.id) + 1;
            
            // David vs Goliath (alt sıradaki üst sıradakini yenmeye çalışırsa) - sadece yeterli maç oynandıysa
            if (playedMatches.length >= 5 && Math.abs(homeStanding - awayStanding) >= 3) {
              const underdog = homeStanding > awayStanding ? homePlayer : awayPlayer;
              const favorite = homeStanding > awayStanding ? awayPlayer : homePlayer;
              
              const upsetMessage = getRandomTurkishTemplate('upset', {
                winner: underdog.name,
                loser: favorite.name
              });
              
              news.push({
                id: `upset_potential_${match.id}`,
                type: 'upset_potential',
                text: `🎪 ${upsetMessage}`,
                time: 'Potansiyel Sürpriz'
              });
            }
            
            // Form düşen favori (sadece yeterli maç oynandıysa)
            const homePlayerStats = standings.find(s => s.id === homePlayer.id);
            const awayPlayerStats = standings.find(s => s.id === awayPlayer.id);
            
            // Son 2 maçı kaybeden favori (sadece yeterli maç oynandıysa)
            if (playedMatches.length >= 4 && homePlayerStats && homePlayerStats.form.slice(-2).every(f => f === 'L')) {
              const riseMessage = getRandomTurkishTemplate('rise', {
                player: homePlayer.name
              });
              
              news.push({
                id: `comeback_${match.id}`,
                type: 'comeback',
                text: `🔄 ${riseMessage}`,
                time: 'Toparlanma'
              });
            }
            
            if (playedMatches.length >= 4 && awayPlayerStats && awayPlayerStats.form.slice(-2).every(f => f === 'L')) {
              const riseMessage = getRandomTurkishTemplate('rise', {
                player: awayPlayer.name
              });
              
              news.push({
                id: `comeback_${match.id}_away`,
                type: 'comeback',
                text: `🔄 ${riseMessage}`,
                time: 'Toparlanma'
              });
            }
          }
        }
      });
    }
    
    // İntikam maçı (2 kere yenilen kişi)
    if (standings.length > 0) {
      // En çok yenilen oyuncuları bul
      const mostLosses = standings
        .filter(p => p.lost >= 2)
        .sort((a, b) => b.lost - a.lost);
      
      if (mostLosses.length > 0) {
        const victim = mostLosses[0];
        // Bu oyuncunun gelecek maçları var mı?
        const victimUpcoming = matches.filter(m => 
          !m.played && (m.home === victim.id || m.away === victim.id)
        );
        
        if (victimUpcoming.length > 0) {
          const nextMatch = victimUpcoming[0];
          const opponentId = nextMatch.home === victim.id ? nextMatch.away : nextMatch.home;
          const opponent = players.find(p => p.id === opponentId);
          
          if (opponent) {
            // Daha eğlenceli intikam maçları
            const upsetMessage = getRandomTurkishTemplate('upset', {
              winner: victim.name,
              loser: opponent.name
            });
            
            news.push({
              id: `revenge_${nextMatch.id}`,
              type: 'revenge',
              text: `💥 ${upsetMessage}`,
              time: 'İntikam'
            });
          }
        }
      }
    }
    
    // Shuffle news for variety
    if (news.length > 1) {
      // Always keep the most recent match result first
      const firstNews = news[0];
      const restNews = news.slice(1);
      
      // Shuffle the rest
      for (let i = restNews.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [restNews[i], restNews[j]] = [restNews[j], restNews[i]];
      }
      
      return [firstNews, ...restNews];
    }
    
    return news;
  }, [matches, players, standings]);

  // --- Fixture Logic ---
  const generateFixtures = (selectedLegs) => {
    console.log('generateFixtures çağrıldı, selectedLegs:', selectedLegs);
    console.log('players.length:', players.length);
    console.log('players:', players);
    
    if (players.length < 2) {
      console.log('Oyuncu sayısı 2den az, fikstür oluşturulamıyor');
      return;
    }
    
    let schedule = [];
    // Oyuncuları filtreleyerek sadece geçerli olanları al
    const p = players.filter(player => player && player.id);
    console.log('Filtrelenmiş oyuncular:', p);
    
    if (p.length % 2 !== 0) {
      console.log('Tek sayıda oyuncu, Bay ekleniyor');
      p.push({ id: 'bye', name: 'Bay' });
    }

    const baseRounds = p.length - 1;
    const half = p.length / 2;
    // Sadece geçerli oyuncuların id'lerini al
    let list = p.map(x => x.id).filter(id => id);
    console.log('Base rounds:', baseRounds, 'Half:', half, 'List:', list);
    
    // Generate Base Schedule (Single Leg)
    let baseSchedule = [];
    for (let round = 0; round < baseRounds; round++) {
      let roundMatches = [];
      for (let i = 0; i < half; i++) {
        const p1 = list[i];
        const p2 = list[p.length - 1 - i];
        // undefined değerleri kontrol et
        if (p1 && p2 && p1 !== 'bye' && p2 !== 'bye') {
          roundMatches.push({ home: p1, away: p2 });
        }
      }
      baseSchedule.push(roundMatches);
      list.splice(1, 0, list.pop());
    }
    console.log('Base schedule:', baseSchedule);

    // Repeat for selected legs
    for (let leg = 0; leg < selectedLegs; leg++) {
      baseSchedule.forEach((roundMatches, roundIdx) => {
        const absoluteRound = (leg * baseRounds) + roundIdx + 1;
        roundMatches.forEach((m, i) => {
          // undefined değerleri kontrol et
          if (m && m.home && m.away) {
            schedule.push({
              id: `m-${leg}-${roundIdx}-${i}`,
              round: absoluteRound,
              home: leg % 2 === 0 ? m.home : m.away,
              away: leg % 2 === 0 ? m.away : m.home,
              homeScore: '', awayScore: '', played: false
            });
          }
        });
      });
    }
    console.log('Oluşturulan fikstür:', schedule);

    const newSettings = { ...settings, started: true, legs: selectedLegs };
    console.log('Yeni ayarlar:', newSettings);
    
    // Clean up player data before saving to prevent undefined values
    const cleanPlayers = players.map(player => ({
      id: player.id || '',
      name: player.name || '',
      team: player.team || '',
      avatar: player.avatar || null
    })).filter(player => player.id);
    
    saveData({ players: cleanPlayers, matches: schedule, settings: newSettings });
    updateStatus('Devam Ediyor');
    console.log('Fikstür başarıyla oluşturuldu');
  };

  const handleMatchUpdate = (matchId, field, value) => {
    const updatedMatches = matches.map(m => {
      if (m.id === matchId) {
        const newMatch = { ...m, [field]: value };
        // Check if both scores are entered and are numbers (even if strings, they should contain digits)
        const homeValid = newMatch.homeScore !== '' && !isNaN(parseInt(newMatch.homeScore));
        const awayValid = newMatch.awayScore !== '' && !isNaN(parseInt(newMatch.awayScore));
        
        newMatch.played = homeValid && awayValid;
        
        // Add timestamp when match is played
        if (newMatch.played && (!m.played || m.homeScore !== newMatch.homeScore || m.awayScore !== newMatch.awayScore)) {
          newMatch.updatedAt = new Date().toISOString();
        }
        
        return newMatch;
      }
      return m;
    });
    setMatches(updatedMatches);
    // Clean up player data before saving
    const cleanPlayers = players.map(player => ({
      id: player.id || '',
      name: player.name || '',
      team: player.team || '',
      avatar: player.avatar || null
    })).filter(player => player.id);
    
    saveData({ players: cleanPlayers, matches: updatedMatches, settings });
    
    // Check if the entire tournament is finished
    if (updatedMatches.every(m => m.played)) {
        updateStatus('Tamamlandı');
    } else {
        // Ensure status is 'Devam Ediyor' if at least one match is played but not all are
        if (updatedMatches.some(m => m.played)) updateStatus('Devam Ediyor');
    }
  };

  // Oyuncu için sabit renk paleti (her oyuncu için aynı renk)
  const getPlayerColor = (playerId) => {
    return 'from-slate-500 to-slate-600'; // Artık kullanılmayan fonksiyon
  };

  // Rakip için zıt renk seçimi (sabit ve tutarlı)
  const getContrastColor = (playerId) => {
    return 'from-slate-500 to-slate-600'; // Artık kullanılmayan fonksiyon
  };

  // Skor düzenleme modunu aç/kapat
  const toggleScoreEditMode = (matchId) => {
    setScoreEditMode(prev => ({
      ...prev,
      [matchId]: !prev[matchId]
    }));
  };

  // Mobil cihaz kontrolü
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Enter tuşu ile skor kaydetme
  const handleScoreKeyPress = (e, matchId) => {
    if (e.key === 'Enter') {
      toggleScoreEditMode(matchId);
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
            // Clean up player data before saving
            const cleanPlayers = players.map(player => ({
              id: player.id || '',
              name: player.name || '',
              team: player.team || '',
              avatar: player.avatar || null
            })).filter(player => player.id);
            
            await saveData({players: cleanPlayers, matches: [], settings: {...settings, started: false}});
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
      
      {/* Recent Round Results Bar - Fixed at Top */}
      {activeTab === 'standings' && getRecentRoundMatches().length > 0 && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 py-2 overflow-hidden sticky top-14 z-20">
          <div className="max-w-4xl mx-auto relative">
            <div className="flex items-center justify-between gap-2 px-2 flex-nowrap overflow-x-auto">
              <div className="flex-shrink-0 text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1 whitespace-nowrap">
                <Zap size={12} />
                Son Karşılaşmalar
              </div>
              <div className="flex items-center gap-2 flex-nowrap min-w-max">
                {getRecentRoundMatches().map((match) => {
                  const homePlayer = players.find(p => p.id === match.home);
                  const awayPlayer = players.find(p => p.id === match.away);
                  
                  if (!homePlayer || !awayPlayer) return null;
                  
                  const homeScore = parseInt(match.homeScore);
                  const awayScore = parseInt(match.awayScore);
                  const winner = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw';
                  
                  return (
                    <div key={match.id} className="flex items-center gap-2 bg-slate-900/80 rounded-lg border border-slate-700 px-3 py-1.5 flex-shrink-0">
                      <span className="text-xs font-bold text-slate-300 truncate max-w-[60px]">{homePlayer.name}</span>
                      <div className="flex items-center gap-1">
                        <span className={`font-bold text-xs ${winner === 'home' ? 'text-emerald-400' : winner === 'draw' ? 'text-slate-300' : 'text-slate-500'}`}>
                          {homeScore}
                        </span>
                        <span className="text-slate-500">-</span>
                        <span className={`font-bold text-xs ${winner === 'away' ? 'text-emerald-400' : winner === 'draw' ? 'text-slate-300' : 'text-slate-500'}`}>
                          {awayScore}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-300 truncate max-w-[60px]">{awayPlayer.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Live News Ticker */}
      {activeTab === 'standings' && liveNews.length > 0 && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 py-3 overflow-hidden">
          <div className="max-w-4xl mx-auto relative h-8">
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-slate-800 to-transparent z-10"></div>
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-slate-800 to-transparent z-10"></div>
            <div className={`whitespace-nowrap absolute inset-0 flex items-center ${
              matches.filter(m => m.played).length > 0 ? 'animate-marquee-fast' : 'animate-marquee'
            }`}>
              {liveNews.map((item, index) => (
                <div key={`${item.id}_${index}`} className="mx-6 flex items-center gap-3 text-base">
                  <span className="bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded font-bold text-sm">{item.time}</span>
                  <span className="text-slate-200 font-medium">{item.text}</span>
                </div>
              ))}
              {/* Duplicate for seamless loop */}
              {liveNews.map((item, index) => (
                <div key={`dup_${item.id}_${index}`} className="mx-6 flex items-center gap-3 text-base">
                  <span className="bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded font-bold text-sm">{item.time}</span>
                  <span className="text-slate-200 font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4">
        
        {/* STANDINGS */}
        {activeTab === 'standings' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            {!settings.started && players.length === 0 ? (
              <div className="text-center py-12 text-slate-500">Katılımcı eklemek için yönetici sekmesine gidin.</div>
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-white/50 bg-slate-900/50 shadow-xl">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-900 text-[10px] text-slate-400 uppercase font-bold">
                      <tr>
                        <th className="px-2 py-3 w-8 text-center">#</th>
                        <th className="px-2 py-3 text-left">Oyuncu</th>
                        <th className="px-2 py-3 text-center">Form</th>
                        <th className="px-1 py-3 w-8 text-center bg-slate-800/50 text-white">O</th>
                        <th className="px-1 py-3 w-8 text-center text-emerald-500/70">AG</th>
                        <th className="px-1 py-3 w-8 text-center text-red-500/70">YG</th>
                        <th className="px-1 py-3 w-8 text-center">Av</th>
                        <th className="px-3 py-3 w-12 text-center bg-slate-800/50 text-white">P</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/50">
                      {standings.map((row, idx) => {
                         const lastResult = row.form[row.form.length - 1];
                         let TrendIcon = Minus;
                         let trendColor = "text-slate-600";
                         if (lastResult === 'W') { TrendIcon = TrendingUp; trendColor = "text-emerald-500"; }
                         if (lastResult === 'L') { TrendIcon = TrendingDown; trendColor = "text-red-500"; }

                         return (
                          <tr 
                            key={row.id} 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedPlayer(row);
                            }}
                            className={`cursor-pointer hover:bg-slate-800/60 transition-colors ${idx < 1 ? 'bg-gradient-to-r from-emerald-900/10 to-transparent border-t border-white/50' : ''}`}
                          >
                            <td className="px-2 py-4 text-center font-medium text-slate-500 relative">
                              <div className="flex flex-col items-center justify-center gap-1">
                                 <span>{idx + 1}</span>
                                 {settings.started && row.played > 0 && <TrendIcon size={12} className={trendColor} />}
                              </div>
                              {idx === 0 && <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r"></div>}
                            </td>
                            <td className="px-2 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 flex items-center justify-center text-slate-400 text-sm font-bold shadow-lg ${idx === 0 ? 'first-place-glow border-amber-400' : 'border-slate-700'}`}>
                                  {row.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-white text-sm uppercase tracking-wide truncate">{row.name}</div>
                                  <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                     {row.team || 'Bağımsız'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-4">
                              <div className="flex justify-center gap-1">
                                {getLastFiveMatches(row.id).map((match, i) => (
                                  <div key={i} className={`w-1.5 h-4 rounded-full ${match.result==='W'?'bg-emerald-500':match.result==='D'?'bg-slate-500':'bg-red-500'}`}></div>
                                ))}
                              </div>
                            </td>
                            <td className="px-1 py-4 text-center font-bold text-slate-300 bg-slate-800/30">{row.played}</td>
                            <td className="px-1 py-4 text-center text-slate-400 font-medium">{row.gf}</td>
                            <td className="px-1 py-4 text-center text-slate-400 font-medium">{row.ga}</td>
                            <td className="px-1 py-4 text-center text-slate-300 font-bold">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                            <td className="px-3 py-4 text-center font-black text-white text-xl bg-slate-800/50">
                              {row.points}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Tahminler Bölümü */}
                {settings.started && matches.some(m => !m.played) && (
                  <div className="mt-4 bg-slate-900/50 rounded-xl border border-white/50 p-3">
                    <h3 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1">
                      <Star className="text-amber-400" size={14} />
                      Sıradaki Maç Potansiyel Sonuç - #{getUpcomingRoundPredictions()[0]?.round || ''} Tur
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {getUpcomingRoundPredictions().slice(0, 4).map((match, index) => (
                        <div key={match.id} className="flex-1 min-w-[150px] bg-slate-800 rounded-lg border border-slate-700/50 p-3 flex items-center gap-3 transition-all duration-300 hover:border-slate-600">
                          {/* Home Team */}
                          <div className="flex flex-col items-center flex-1">
                            <div className="text-[9px] font-bold text-slate-400 mb-1">EV</div>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 mb-2 transition-all duration-300"
                              style={{
                                background: match.homeWinProbability !== null && match.homeWinProbability > match.awayWinProbability ? '#10b981' : (match.homeWinProbability !== null && match.homeWinProbability < match.awayWinProbability ? '#ef4444' : '#64748b'),
                                borderColor: match.homeWinProbability !== null && match.homeWinProbability > match.awayWinProbability ? '#10b981' : (match.homeWinProbability !== null && match.homeWinProbability < match.awayWinProbability ? '#ef4444' : '#64748b')
                              }}>
                              {match.homeWinProbability !== null ? `${match.homeWinProbability}%` : '?'}
                            </div>
                            <div className="text-[9px] font-semibold text-slate-300 text-center max-w-[70px] truncate leading-tight">
                              {match.homePlayer.name}
                            </div>
                          </div>
                          
                          {/* VS Separator */}
                          <div className="flex flex-col items-center justify-center mx-1">
                            <div className="text-slate-500 font-bold text-[9px] mb-1">#</div>
                            <div className="text-slate-500 font-bold text-xs">VS</div>
                            <div className="text-[8px] font-bold text-slate-500 mt-1">{match.round}</div>
                          </div>
                          
                          {/* Away Team */}
                          <div className="flex flex-col items-center flex-1">
                            <div className="text-[9px] font-bold text-slate-400 mb-1">DEP</div>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 mb-2 transition-all duration-300"
                              style={{
                                background: match.awayWinProbability !== null && match.awayWinProbability > match.homeWinProbability ? '#10b981' : (match.awayWinProbability !== null && match.awayWinProbability < match.homeWinProbability ? '#ef4444' : '#64748b'),
                                borderColor: match.awayWinProbability !== null && match.awayWinProbability > match.homeWinProbability ? '#10b981' : (match.awayWinProbability !== null && match.awayWinProbability < match.homeWinProbability ? '#ef4444' : '#64748b')
                              }}>
                              {match.awayWinProbability !== null ? `${match.awayWinProbability}%` : '?'}
                            </div>
                            <div className="text-[9px] font-semibold text-slate-300 text-center max-w-[70px] truncate leading-tight">
                              {match.awayPlayer.name}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
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
                    <div key={round} className={`rounded-xl overflow-hidden border transition-all ${isFinished ? 'bg-gradient-to-r from-slate-900/30 to-slate-900/10 border-slate-800/50 opacity-70' : 'bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700 shadow-lg'}`}>
                      <div className="px-4 py-3 text-xs font-bold uppercase tracking-wider flex justify-between bg-slate-950/50 text-slate-300 border-b border-slate-800/50">
                        <span className="flex items-center gap-2">
                          <Calendar size={14} className="text-emerald-400" />
                          Hafta {round}
                        </span>
                        <span className="text-slate-500">
                          {roundMatches.filter(m => m.played).length}/{roundMatches.length}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-800/50">
                        {roundMatches.map(match => {
                          const h = players.find(p => p.id === match.home);
                          const a = players.find(p => p.id === match.away);
                          const isEditMode = scoreEditMode[match.id];
                          
                          // Maç durumu için renk sınıfı
                          let matchStatusClass = "bg-slate-800/30 hover:bg-slate-700/30 transition-all duration-300";
                          let scoreBackgroundClass = "bg-gradient-to-b from-slate-800/50 to-slate-900/50";
                          let winnerHighlight = null;
                          
                          if (match.played) {
                            const homeScore = parseInt(match.homeScore);
                            const awayScore = parseInt(match.awayScore);
                            
                            if (homeScore > awayScore) {
                              // Ev sahibi kazandı
                              matchStatusClass = "bg-gradient-to-r from-emerald-900/20 to-emerald-900/10 border-l-4 border-emerald-500/70 hover:from-emerald-900/30 hover:to-emerald-900/20 transition-all duration-300";
                              scoreBackgroundClass = "bg-gradient-to-b from-emerald-800/30 to-emerald-900/20 border border-emerald-700/50";
                              winnerHighlight = "home";
                            } else if (awayScore > homeScore) {
                              // Deplasman kazandı
                              matchStatusClass = "bg-gradient-to-r from-emerald-900/20 to-emerald-900/10 border-l-4 border-emerald-500/70 hover:from-emerald-900/30 hover:to-emerald-900/20 transition-all duration-300";
                              scoreBackgroundClass = "bg-gradient-to-b from-emerald-800/30 to-emerald-900/20 border border-emerald-700/50";
                              winnerHighlight = "away";
                            } else {
                              // Berabere
                              matchStatusClass = "bg-gradient-to-r from-slate-700/20 to-slate-700/10 border-l-4 border-slate-500/70 hover:from-slate-700/30 hover:to-slate-700/20 transition-all duration-300";
                              scoreBackgroundClass = "bg-gradient-to-b from-slate-700/30 to-slate-800/20 border border-slate-600/50";
                            }
                          }
                          
                          return (
                            <div key={match.id} className={`p-4 flex items-center justify-between transition-all duration-300 rounded-lg relative ${matchStatusClass}`}>
                              <div className="flex-1 text-right pr-3 flex items-center justify-end gap-3">
                                <div className="overflow-hidden">
                                   <div className={`font-bold text-slate-100 text-base truncate uppercase px-2 py-1 rounded-lg ${
                                     winnerHighlight === 'home' ? 'bg-emerald-500/20 text-emerald-400 font-black' : 
                                     winnerHighlight === 'away' ? 'bg-red-500/20 text-red-400' : 
                                     'bg-slate-500/20 text-slate-400'
                                   }`}>
                                     {h?.name}
                                   </div>
                                   {h?.team && <div className="text-[11px] text-slate-400 truncate">{h.team}</div>}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 min-w-[100px] justify-center">
                                {isAdmin ? (
                                  isEditMode ? (
                                    <div className="flex flex-col items-center gap-2 bg-slate-900/80 p-3 rounded-xl border border-emerald-500/30 shadow-lg w-full max-w-[180px]">
                                      <div className="flex items-center gap-2 w-full">
                                        <input 
                                          type="number" 
                                          pattern="[0-9]*"
                                          inputMode="numeric"
                                          value={match.homeScore} 
                                          onChange={(e) => handleMatchUpdate(match.id, 'homeScore', e.target.value)} 
                                          className="w-full h-12 border rounded text-center font-bold focus:border-emerald-500 outline-none p-0 bg-slate-900 border-slate-700 text-white text-xl" 
                                          autoFocus
                                          onFocus={(e) => e.target.select()}
                                          onKeyPress={(e) => handleScoreKeyPress(e, match.id)}
                                        />
                                        <span className="text-slate-400 font-bold text-xl">-</span>
                                        <input 
                                          type="number" 
                                          pattern="[0-9]*"
                                          inputMode="numeric"
                                          value={match.awayScore} 
                                          onChange={(e) => handleMatchUpdate(match.id, 'awayScore', e.target.value)} 
                                          className="w-full h-12 border rounded text-center font-bold focus:border-emerald-500 outline-none p-0 bg-slate-900 border-slate-700 text-white text-xl" 
                                          onFocus={(e) => e.target.select()}
                                          onKeyPress={(e) => handleScoreKeyPress(e, match.id)}
                                        />
                                      </div>
                                      <button 
                                        onClick={() => toggleScoreEditMode(match.id)}
                                        className="w-full py-2 text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 rounded-lg hover:bg-emerald-900/30 transition-colors font-bold text-sm"
                                      >
                                        TAMAM
                                      </button>
                                    </div>
                                  ) : (
                                    <div 
                                      className="flex items-center gap-2 cursor-pointer group"
                                      onClick={() => toggleScoreEditMode(match.id)}
                                    >
                                      <div className={`px-4 py-2 rounded-lg font-bold text-lg min-w-[80px] text-center shadow-md transition-all ${scoreBackgroundClass} ${match.played ? 'group-hover:scale-105' : 'group-hover:from-slate-700/50 group-hover:to-slate-800/50'}`}>
                                        {match.played ? (
                                          <div className="flex items-center justify-center gap-1">
                                            <span className={winnerHighlight === 'home' ? 'text-emerald-400 font-black' : ''}>{match.homeScore}</span>
                                            <span className="text-slate-500">-</span>
                                            <span className={winnerHighlight === 'away' ? 'text-emerald-400 font-black' : ''}>{match.awayScore}</span>
                                          </div>
                                        ) : 'vs'}
                                      </div>
                                      <Edit3 size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                                    </div>
                                  )
                                ) : (
                                  <div className={`px-4 py-2 rounded-lg font-bold text-lg min-w-[80px] text-center shadow-md ${scoreBackgroundClass}`}>
                                    {match.played ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <span className={winnerHighlight === 'home' ? 'text-emerald-400 font-black' : ''}>{match.homeScore}</span>
                                        <span className="text-slate-500">-</span>
                                        <span className={winnerHighlight === 'away' ? 'text-emerald-400 font-black' : ''}>{match.awayScore}</span>
                                      </div>
                                    ) : 'vs'}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 text-left pl-3 flex items-center justify-start gap-3">
                                <div className="overflow-hidden">
                                   <div className={`font-bold text-slate-100 text-base truncate uppercase px-2 py-1 rounded-lg ${
                                     winnerHighlight === 'away' ? 'bg-emerald-500/20 text-emerald-400 font-black' : 
                                     winnerHighlight === 'home' ? 'bg-red-500/20 text-red-400' : 
                                     'bg-slate-500/20 text-slate-400'
                                   }`}>
                                     {a?.name}
                                   </div>
                                   {a?.team && <div className="text-[11px] text-slate-400 truncate">{a.team}</div>}
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

        {/* STATISTICS */}
        {activeTab === 'stats' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
            {!settings.started ? (
              <div className="text-center py-12 text-slate-500">Turnuva başladığında istatistikler görünecek.</div>
            ) : (
              <>
                {/* Şampiyonluk Şansı */}
                <div className="bg-gradient-to-br from-amber-900/20 to-slate-900/50 rounded-xl border border-amber-500/30 p-5 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl"></div>
                  <h3 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2 relative z-10">
                    <Trophy className="animate-pulse" size={18} />
                    Şampiyonluk Şansı
                  </h3>
                  <div className="space-y-3 relative z-10">
                    {(() => {
                      // Önce şampiyonluk garantisi var mı kontrol et
                      let championGuaranteedId = null;
                      
                      const totalMatches = matches.length;
                      const playedMatches = matches.filter(m => m.played).length;
                      
                      if (playedMatches > 0 && playedMatches < totalMatches && standings.length > 1) {
                        const leader = standings[0];
                        const leaderMatches = matches.filter(m => m.home === leader.id || m.away === leader.id);
                        const leaderPlayedMatches = leaderMatches.filter(m => m.played).length;
                        const leaderRemainingMatches = leaderMatches.length - leaderPlayedMatches;
                        
                        const secondPlayer = standings[1];
                        const secondPlayerMatches = matches.filter(m => m.home === secondPlayer.id || m.away === secondPlayer.id);
                        const secondPlayerPlayedMatches = secondPlayerMatches.filter(m => m.played).length;
                        const secondPlayerRemainingMatches = secondPlayerMatches.length - secondPlayerPlayedMatches;
                        const secondMaxPoints = secondPlayer.points + (secondPlayerRemainingMatches * 3);
                        
                        if (secondMaxPoints < leader.points) {
                          championGuaranteedId = leader.id;
                        }
                      } else if (playedMatches === totalMatches && standings.length > 0) {
                        championGuaranteedId = standings[0].id;
                      }
                      
                      return standings.slice(0, 5).map((player, idx) => {
                        const playerMatches = matches.filter(m => m.home === player.id || m.away === player.id);
                        const playerPlayedMatches = playerMatches.filter(m => m.played).length;
                        const playerRemainingMatches = playerMatches.length - playerPlayedMatches;
                        
                        let isChampionGuaranteed = player.id === championGuaranteedId;
                        let championshipChance = 0;
                        
                        // Eğer bir şampiyon garantilendiyse
                        if (championGuaranteedId) {
                          if (isChampionGuaranteed) {
                            championshipChance = 100;
                          } else {
                            championshipChance = 0; // Diğerleri 0
                          }
                        } else if (playedMatches === 0) {
                          // Hiç maç oynanmadıysa
                          championshipChance = 0;
                        } else {
                          // Normal şans hesaplama
                          const currentPerformance = player.played > 0 ? (player.points / (player.played * 3)) * 100 : 0;
                          const formBonus = player.form.slice(-3).filter(f => f === 'W').length * 5;
                          championshipChance = Math.min(
                            100,
                            Math.max(
                              0,
                              (currentPerformance * 0.6) + 
                              ((standings.length - idx) / standings.length * 30) + 
                              formBonus
                            )
                          );
                        }
                        
                        const barWidth = championshipChance;
                        const isLeader = idx === 0;
                        
                        return (
                          <div key={player.id} className={`relative rounded-lg overflow-hidden transition-all duration-500 ${
                            playedMatches > 0 && isLeader ? 'bg-gradient-to-r from-amber-500/20 to-transparent border border-amber-500/40' : 'bg-slate-800/30 border border-slate-700/50'
                          }`}>
                            <div className="p-3 flex items-center gap-3 relative z-10">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                playedMatches > 0 && isLeader ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/50 animate-pulse' : 'bg-slate-700 text-slate-300'
                              }`}>
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="font-bold text-white text-sm uppercase truncate">{player.name}</div>
                                  {isChampionGuaranteed && (
                                    <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                                      <Trophy className="text-amber-400 fill-amber-400" size={12} />
                                      <span className="text-[9px] font-black text-amber-400 uppercase">ŞAMPİYON</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">{player.points} puan • {player.played} maç</div>
                              </div>
                              <div className={`text-xl font-black ${
                                isLeader ? 'text-amber-400' : championshipChance > 50 ? 'text-emerald-400' : championshipChance > 20 ? 'text-amber-500' : 'text-slate-500'
                              }`}>
                                {Math.round(championshipChance)}%
                              </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r transition-all duration-700 ease-out" 
                              style={{ 
                                width: `${barWidth}%`,
                                background: playedMatches === 0
                                  ? 'linear-gradient(to right, rgba(100, 116, 139, 0.1), transparent)' // Hiç maç oynanmadıysa gri
                                  : playedMatches > 0 && isLeader 
                                    ? 'linear-gradient(to right, rgba(245, 158, 11, 0.2), transparent)' // Lider sarı
                                    : championshipChance > 50 
                                      ? 'linear-gradient(to right, rgba(16, 185, 129, 0.15), transparent)' // Yüksek şans yeşil
                                      : 'linear-gradient(to right, rgba(251, 191, 36, 0.1), transparent)' // Diğerleri açık sarı
                              }}>
                            </div>
                            {isLeader && !isChampionGuaranteed && (
                              <div className="absolute right-2 top-2">
                                <Star className="text-amber-400 fill-amber-400 animate-pulse" size={14} />
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* İstatistik Kartları Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* En Çok Gol Atan */}
                  {(() => {
                    const topScorer = standings.reduce((max, p) => p.gf > max.gf ? p : max, standings[0]);
                    return topScorer && topScorer.gf > 0 ? (
                      <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900/50 rounded-xl border border-emerald-500/30 p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <Target className="text-emerald-400" size={16} />
                            <h4 className="text-xs font-bold text-emerald-400 uppercase">En Çok Gol</h4>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 font-bold shadow-lg">
                              {topScorer.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-white text-sm uppercase truncate">{topScorer.name}</div>
                              <div className="text-2xl font-black text-emerald-400">{topScorer.gf}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* En Çok Gol Yiyen */}
                  {(() => {
                    const worstDefense = standings.reduce((max, p) => p.ga > max.ga ? p : max, standings[0]);
                    return worstDefense && worstDefense.ga > 0 ? (
                      <div className="bg-gradient-to-br from-red-900/30 to-slate-900/50 rounded-xl border border-red-500/30 p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="text-red-400" size={16} />
                            <h4 className="text-xs font-bold text-red-400 uppercase">En Çok Yiyen</h4>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-400 flex items-center justify-center text-red-400 font-bold shadow-lg">
                              {worstDefense.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-white text-sm uppercase truncate">{worstDefense.name}</div>
                              <div className="text-2xl font-black text-red-400">{worstDefense.ga}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* En Uzun Galibiyet Serisi */}
                  {(() => {
                    const playersWithStreaks = standings.map(p => {
                      let maxStreak = 0;
                      let currentStreak = 0;
                      p.form.forEach(result => {
                        if (result === 'W') {
                          currentStreak++;
                          maxStreak = Math.max(maxStreak, currentStreak);
                        } else {
                          currentStreak = 0;
                        }
                      });
                      return { ...p, winStreak: maxStreak };
                    });
                    const bestStreak = playersWithStreaks.reduce((max, p) => p.winStreak > max.winStreak ? p : max, playersWithStreaks[0]);
                    return bestStreak && bestStreak.winStreak > 0 ? (
                      <div className="bg-gradient-to-br from-orange-900/30 to-slate-900/50 rounded-xl border border-orange-500/30 p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <Flame className="text-orange-400" size={16} />
                            <h4 className="text-xs font-bold text-orange-400 uppercase">Galibiyet Serisi</h4>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-orange-500/20 border-2 border-orange-400 flex items-center justify-center text-orange-400 font-bold shadow-lg">
                              {bestStreak.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-white text-sm uppercase truncate">{bestStreak.name}</div>
                              <div className="text-2xl font-black text-orange-400">{bestStreak.winStreak}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* En Çok Berabere Kalan */}
                  {(() => {
                    const mostDraws = standings.reduce((max, p) => p.drawn > max.drawn ? p : max, standings[0]);
                    return mostDraws && mostDraws.drawn > 0 ? (
                      <div className="bg-gradient-to-br from-slate-700/30 to-slate-900/50 rounded-xl border border-slate-500/30 p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-slate-500/10 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <Minus className="text-slate-400" size={16} />
                            <h4 className="text-xs font-bold text-slate-400 uppercase">En Çok Berabere</h4>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-500/20 border-2 border-slate-400 flex items-center justify-center text-slate-400 font-bold shadow-lg">
                              {mostDraws.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-white text-sm uppercase truncate">{mostDraws.name}</div>
                              <div className="text-2xl font-black text-slate-400">{mostDraws.drawn}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Gol Ortalaması */}
                <div className="bg-slate-900/50 rounded-xl border border-white/50 p-4">
                  <h3 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
                    <BarChart3 className="text-emerald-400" size={16} />
                    Gol Ortalaması (Maç Başına)
                  </h3>
                  <div className="space-y-2">
                    {standings
                      .filter(p => p.played > 0)
                      .map(p => ({ ...p, avgGoals: (p.gf / p.played).toFixed(2) }))
                      .sort((a, b) => b.avgGoals - a.avgGoals)
                      .slice(0, 5)
                      .map((player, idx) => (
                        <div key={player.id} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            idx === 0 ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-xs uppercase truncate">{player.name}</div>
                          </div>
                          <div className="text-emerald-400 font-black text-sm">{player.avgGoals}</div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
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
                    <AddPlayerForm onAdd={(name, team) => {
                      const newList = [...players, { id: Date.now().toString(), name, team, avatar: null }];
                      setPlayers(newList);
                      saveData({ players: newList, matches, settings });
                    }} />
                    <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                      {players.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs">{p.name[0]}</div>
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

                         <button onClick={() => { 
                           console.log('Fikstür başlat butonuna tıklandı'); 
                           console.log('Settings legs:', settings.legs);
                           console.log('Players length:', players.length);
                           generateFixtures(settings.legs || 2); 
                         }} disabled={players.length < 2} className="w-full bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-lg font-bold text-sm shadow-lg shadow-emerald-600/20">
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
              <div className="relative h-32 player-card-gradient flex items-center justify-center">
                 <button onClick={() => setSelectedPlayer(null)} className="absolute right-3 top-3 p-2 bg-black/20 rounded-full text-white/70 hover:text-white hover:bg-black/40"><X size={20}/></button>
                 <div className="text-center z-10 mt-8">
                    <h2 className="text-2xl font-bold text-white uppercase tracking-widest drop-shadow-lg">{selectedPlayer.name}</h2>
                    <div className="text-emerald-400 text-xs font-bold tracking-wide mt-1">{selectedPlayer.team}</div>
                 </div>
                 <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 border-4 border-slate-900 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                   {selectedPlayer.name.charAt(0)}
                 </div>
              </div>
              
              <div className="flex justify-around p-4 pt-8 border-b border-slate-800 bg-slate-900/50">
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
                 <div className="text-center">
                    <div className="text-2xl font-bold text-amber-400">{selectedPlayer.gd > 0 ? `+${selectedPlayer.gd}` : selectedPlayer.gd}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Av.</div>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {/* Maç istatistikleri */}
                 <div className="flex justify-between items-center">
                   <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                     <Calendar size={14} className="text-emerald-400" />
                     Maç Geçmişi
                   </h3>
                   <div className="text-xs text-slate-500">
                     {(() => {
                       const playerMatches = matches.filter(m => m.home === selectedPlayer.id || m.away === selectedPlayer.id);
                       const playedMatches = playerMatches.filter(m => m.played);
                       const remainingMatches = playerMatches.length - playedMatches.length;
                       return `${playedMatches.length}/${playerMatches.length} maç (${remainingMatches} kaldı)`;
                     })()}
                   </div>
                 </div>
                 
                 <div className="space-y-2 max-h-96 overflow-y-auto">
                 {matches
                   .filter(m => m.home === selectedPlayer.id || m.away === selectedPlayer.id)
                   .sort((a,b) => a.round - b.round)
                   .map(m => {
                      const isHome = m.home === selectedPlayer.id;
                      const opponentId = isHome ? m.away : m.home;
                      const opponent = players.find(p => p.id === opponentId);
                      
                      // Skor değerlerini başta tanımla
                      const myScore = m.played ? parseInt(isHome ? m.homeScore : m.awayScore) : 0;
                      const oppScore = m.played ? parseInt(isHome ? m.awayScore : m.homeScore) : 0;
                      
                      let resultClass = "bg-slate-800/50 border-slate-700";
                      let resultText = "";
                      if(m.played) {
                         if(myScore > oppScore) {
                           resultClass = "match-result-win";
                           resultText = "G";
                         }
                         else if(myScore < oppScore) {
                           resultClass = "match-result-loss";
                           resultText = "M";
                         }
                         else {
                           resultClass = "match-result-draw";
                           resultText = "B";
                         }
                      }

                      return (
                         <div key={m.id} className={`flex items-center justify-between p-3 rounded-xl border ${resultClass}`}>
                            <div className="flex items-center gap-3">
                               <span className="text-[10px] font-bold text-slate-500 w-8">#{m.round}</span>
                               <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-300">
                                 {opponent?.name.charAt(0) || '?'}
                               </div>
                               <div>
                                  <div className="text-xs text-slate-500">{isHome ? 'İç Saha' : 'Deplasman'}</div>
                                  <div className="text-sm font-bold text-white uppercase truncate max-w-[90px]">{opponent?.name || 'Bilinmeyen'}</div>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                               {m.played ? (
                                 <div className="flex items-center gap-1">
                                   <span className={`font-mono font-extrabold text-lg ${
                                     myScore > oppScore ? 'text-emerald-400' : 
                                     myScore < oppScore ? 'text-red-400' : 
                                     'text-slate-300'
                                   }`}>
                                     {isHome ? m.homeScore : m.awayScore}
                                   </span>
                                   <span className="text-slate-500 mx-0.5">-</span>
                                   <span className={`font-mono font-extrabold text-lg ${
                                     oppScore > myScore ? 'text-emerald-400' : 
                                     oppScore < myScore ? 'text-red-400' : 
                                     'text-slate-300'
                                   }`}>
                                     {isHome ? m.awayScore : m.homeScore}
                                   </span>
                                 </div>
                               ) : (
                                 <span className="text-slate-500 text-sm font-bold">VS</span>
                               )}
                               {m.played && (
                                 <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold form-indicator-${m.played ? (myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D') : ''}`}>
                                   {resultText}
                                 </div>
                               )}
                            </div>
                         </div>
                      );
                   })}
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-safe pt-1 z-40">
        <div className="flex justify-around items-center h-14">
          <NavBtn icon={Trophy} label="Puanlar" active={activeTab === 'standings'} onClick={() => setActiveTab('standings')} />
          <NavBtn icon={BarChart3} label="İstatistik" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
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
  
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <input placeholder="İsim" value={name} onChange={e => setName(e.target.value.toUpperCase())} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-emerald-500 outline-none font-bold uppercase" />
        </div>
        <div className="flex-1">
           <input placeholder="Takım (Ops.)" value={team} onChange={e => setTeam(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-emerald-500 outline-none" />
        </div>
      </div>
      <div className="flex gap-2">
        <button disabled={!name.trim()} onClick={() => { onAdd(name, team); setName(''); setTeam(''); }} className="bg-emerald-600 disabled:opacity-50 text-white p-2 rounded-lg w-full flex items-center justify-center">
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}