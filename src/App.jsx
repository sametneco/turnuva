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
  Flame,
  Sparkles,
  ChevronDown
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
  const [championships, setChampionships] = useState({});
  const [seriesTeams, setSeriesTeams] = useState({ teamA: {}, teamB: {} }); // Seri takımları

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

  // --- Championships Sync ---
  useEffect(() => {
    if (!user) return;
    const champRef = doc(db, 'artifacts', appId, 'public', 'data', 'organization', 'championships');
    const unsub = onSnapshot(champRef, async (docSnap) => {
      console.log('Championships snapshot:', docSnap.exists(), docSnap.data());
      if (docSnap.exists()) {
        const champData = docSnap.data().players || {};
        console.log('Championships data:', champData);
        
        // Bireysel oyuncu şampiyonluklarını otomatik temizle
        const needsCleaning = Object.keys(champData).some(key => !key.includes(' & '));
        console.log('Temizlik kontrolü:', { champData, needsCleaning, keys: Object.keys(champData) });
        if (needsCleaning && isAdmin) {
          console.log('Bireysel şampiyonluklar tespit edildi, temizleniyor...');
          const cleanedData = {};
          Object.keys(champData).forEach(key => {
            // Sadece takım isimlerini (" & " içeren) koru
            if (key.includes(' & ') && champData[key] > 0) {
              cleanedData[key] = champData[key];
              console.log('Korunuĝor:', key, champData[key]);
            } else {
              console.log('Siliniyor:', key, champData[key]);
            }
          });
          await setDoc(champRef, { players: cleanedData });
          console.log('Temizlenmiş şampiyonluklar:', cleanedData);
          setChampionships(cleanedData);
        } else {
          setChampionships(champData);
        }
      }
      else setChampionships({});
    }, (err) => { 
        console.error("Championships hatası:", err); 
        setChampionships({}); 
    });
    return () => unsub();
  }, [user, isAdmin]);

  // --- Series Teams Sync ---
  useEffect(() => {
    if (!user) return;
    const seriesRef = doc(db, 'artifacts', appId, 'public', 'data', 'organization', 'seriesTeams');
    const unsub = onSnapshot(seriesRef, (docSnap) => {
      if (docSnap.exists()) {
        setSeriesTeams(docSnap.data());
      } else {
        setSeriesTeams({ teamA: {}, teamB: {} });
      }
    }, (err) => { 
        console.error("Series teams hatası:", err); 
        setSeriesTeams({ teamA: {}, teamB: {} }); 
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
  const createTournament = async (name, mode = 'individual', teamConfig = null) => {
    if (!isAdmin) {
      console.error("Create tournament failed: User is not admin");
      return;
    }
    
    try {
        console.log("Creating tournament with name:", name, "mode:", mode);
        const newId = generateId();
        const newMeta = { 
          id: newId, 
          name: name || 'Yeni Turnuva', 
          createdAt: new Date().toISOString(), 
          status: 'Hazırlık',
          mode: mode // 'individual' or 'team'
        };
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
        const tournamentDoc = {
          players: [], 
          matches: [], 
          settings: { 
            started: false, 
            name: name,
            mode: mode,
            teamConfig: teamConfig // Takım modu için: { teamA: {name, players: []}, teamB: {name, players: []} }
          }
        };
        
        await setDoc(tournamentRef, tournamentDoc).catch(error => {
          console.error("Tournament creation error:", error);
          console.error("Tournament ref path:", tournamentRef.path);
          throw error;
        });
        
        console.log(`Tournament ${name} created successfully with mode: ${mode}`);
        
        // Takım modunda oluşturulduysa direkt turnuvaya git
        if (mode === 'team') {
          setActiveTournamentId(newId);
          setView('tournament');
        }
    } catch (e) {
        console.error("Error creating tournament:", e);
        alert("Turnuva oluşturulurken bir hata oluştu. Lütfen konsolu kontrol edin.");
    }
  };

  const deleteTournament = useCallback(async (id) => {
    if (!isAdmin) return;
    try {
        console.log('=== TURNUVA SİLME BAŞLADI ===', id);
        
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

  const updateChampionships = async (teamName, newValue) => {
    console.log('updateChampionships çağrıldı:', { teamName, newValue, isAdmin });
    if (!isAdmin) {
      console.log('Admin değil, işlem iptal edildi');
      return;
    }
    try {
      const champRef = doc(db, 'artifacts', appId, 'public', 'data', 'organization', 'championships');
      
      // Önce mevcut veriyi oku
      const docSnap = await getDoc(champRef);
      const currentData = docSnap.exists() ? docSnap.data().players || {} : {};
      
      // Yeni değeri set et
      const newChampionships = {...currentData, [teamName]: newValue};
      
      // Eğer 0 ise sil
      if (newValue === 0) {
        delete newChampionships[teamName];
      }
      
      console.log('Yeni championships:', newChampionships);
      
      // Dökümanı oluştur veya güncelle
      await setDoc(champRef, { players: newChampionships });
      console.log(`${teamName} şampiyonluk sayısı güncellendi: ${newValue}`);
    } catch (e) {
      console.error("Şampiyonluk güncelleme hatası:", e);
      console.error("Hata detayı:", e.code, e.message);
    }
  };

  const resetAllChampionships = async () => {
    if (!isAdmin) return;
    try {
      const champRef = doc(db, 'artifacts', appId, 'public', 'data', 'organization', 'championships');
      await setDoc(champRef, { players: {} });
      console.log('Tüm şampiyonluklar sıfırlandı');
    } catch (e) {
      console.error('Şampiyonluk sıfırlama hatası:', e);
    }
  };

  const updateSeriesTeams = async (teamAPlayer1, teamAPlayer2, teamBPlayer1, teamBPlayer2) => {
    if (!isAdmin) return;
    try {
      const seriesRef = doc(db, 'artifacts', appId, 'public', 'data', 'organization', 'seriesTeams');
      await setDoc(seriesRef, {
        teamA: { player1: teamAPlayer1, player2: teamAPlayer2 },
        teamB: { player1: teamBPlayer1, player2: teamBPlayer2 }
      });
      console.log('Seri takımları güncellendi');
    } catch (e) {
      console.error('Seri takımları güncelleme hatası:', e);
    }
  };

  if (view === 'lobby') {
    return (
      <>
        <LobbyView 
          loading={loading} registry={registry} isAdmin={isAdmin} setIsAdmin={setIsAdmin}
          adminPin={adminPin} setAdminPin={setAdminPin} handleAdminLogin={handleAdminLogin}
          createTournament={createTournament} handleDeleteClick={handleDeleteClick}
          onSelect={(id) => { setActiveTournamentId(id); setView('tournament'); }}
          championships={championships}
          updateChampionships={updateChampionships}
          resetAllChampionships={resetAllChampionships}
          seriesTeams={seriesTeams}
          updateSeriesTeams={updateSeriesTeams}
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
        updateChampionships={updateChampionships}
        championships={championships}
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


// Turnuva Kartı Bileşeni
function TournamentCard({ tournament, onSelect, isAdmin, handleDeleteClick, db, appId }) {
  const [tournamentStatus, setTournamentStatus] = useState(null);
  
  useEffect(() => {
    if (tournament.mode === 'team') {
      const fetchTournamentData = async () => {
        try {
          const tournamentRef = doc(db, 'artifacts', appId, 'public', 'data', 'tournaments', `t_${tournament.id}`);
          const tournamentSnap = await getDoc(tournamentRef);
          if (tournamentSnap.exists()) {
            const data = tournamentSnap.data();
            const matches = data.matches || [];
            const settings = data.settings || {};
            
            // Seri istatistiklerini hesapla
            let teamAWins = 0;
            let teamBWins = 0;
            matches.forEach(match => {
              if (match.played) {
                const hScore = parseInt(match.homeScore);
                const aScore = parseInt(match.awayScore);
                if (!isNaN(hScore) && !isNaN(aScore)) {
                  if (hScore > aScore) teamAWins++;
                  else if (aScore > hScore) teamBWins++;
                }
              }
            });
            
            const targetWins = settings.teamConfig?.extended ? 6 : 5;
            const seriesWon = teamAWins >= targetWins || teamBWins >= targetWins;
            
            if (seriesWon) {
              const winnerTeam = teamAWins >= targetWins ? settings.teamConfig?.teamA?.name : settings.teamConfig?.teamB?.name;
              setTournamentStatus({ completed: true, winner: winnerTeam });
            } else {
              setTournamentStatus({ completed: false });
            }
          }
        } catch (e) {
          console.error('Turnuva durumu çekme hatası:', e);
        }
      };
      fetchTournamentData();
    }
  }, [tournament.id, tournament.mode, db, appId]);
  
  return (
    <div className="group relative bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-12 cursor-pointer" onClick={() => onSelect(tournament.id)}>
          <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors truncate">{tournament.name}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(tournament.createdAt)}</span>
            {tournament.mode === 'team' && tournamentStatus?.completed ? (
              <span className="px-2 py-0.5 rounded-full font-bold bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
                <Trophy size={10} /> Tamamlandı
              </span>
            ) : (
              <span className={`px-1.5 py-0.5 rounded font-medium ${tournament.status === 'Tamamlandı' ? 'bg-slate-800 text-slate-500' : 'bg-emerald-900/30 text-emerald-400'}`}>{tournament.status}</span>
            )}
          </div>
          {tournament.mode === 'team' && tournamentStatus?.completed && tournamentStatus?.winner && (
            <div className="mt-2 text-[10px] text-yellow-300 font-semibold">
              🏆 {tournamentStatus.winner} Kazandı!
            </div>
          )}
        </div>
        {isAdmin && (
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              handleDeleteClick(tournament.id, tournament.name); 
            }} 
            className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 rounded-lg text-red-400 hover:bg-red-900/20 transition-all"
            title="Turnuvayı Sil"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// LOBBY VIEW
// ==========================================
function LobbyView({ loading, registry, isAdmin, setIsAdmin, adminPin, setAdminPin, handleAdminLogin, createTournament, handleDeleteClick, onSelect, championships, updateChampionships, resetAllChampionships, seriesTeams, updateSeriesTeams }) {
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1); // 1: Mod Seçimi, 2: Takım Kurulumu
  const [selectedMode, setSelectedMode] = useState('individual');
  
  // Takım modu için state
  const [teamAPlayer1, setTeamAPlayer1] = useState('');
  const [teamAPlayer2, setTeamAPlayer2] = useState('');
  const [teamBPlayer1, setTeamBPlayer1] = useState('');
  const [teamBPlayer2, setTeamBPlayer2] = useState('');
  
  // Accordion state'leri
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [showChampionships, setShowChampionships] = useState(false);
  const [showTeamA, setShowTeamA] = useState(false);
  const [showTeamB, setShowTeamB] = useState(false);
  
  // Genel seri durumu için seçilen takımlar - Firebase'den gelen veriyi kullan
  const seriesTeamAPlayer1 = seriesTeams?.teamA?.player1 || '';
  const seriesTeamAPlayer2 = seriesTeams?.teamA?.player2 || '';
  const seriesTeamBPlayer1 = seriesTeams?.teamB?.player1 || '';
  const seriesTeamBPlayer2 = seriesTeams?.teamB?.player2 || '';
  
  const PLAYERS = ['BURAK', 'HASAN', 'SAMET', 'ERHAN'];
  
  const resetCreateForm = () => {
    setShowCreate(false);
    setCreateStep(1);
    setSelectedMode('individual');
    setTeamAPlayer1('');
    setTeamAPlayer2('');
    setTeamBPlayer1('');
    setTeamBPlayer2('');
  };
  
  // Otomatik turnuva adı oluştur (örn: "2 ARALIK TURNUVA")
  const generateTournamentName = () => {
    const months = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
    const now = new Date();
    const day = now.getDate();
    const month = months[now.getMonth()];
    return `${day} ${month} TURNUVA`;
  };
  
  const handleCreateSubmit = () => {
    const autoName = generateTournamentName();
    
    if (selectedMode === 'individual') {
      createTournament(autoName, 'individual', null);
      resetCreateForm();
    } else {
      // Takım modu - validasyon
      if (!teamAPlayer1 || !teamAPlayer2 || !teamBPlayer1 || !teamBPlayer2) {
        alert('Lütfen tüm oyuncuları seçin!');
        return;
      }
      if (teamAPlayer1 === teamAPlayer2 || teamBPlayer1 === teamBPlayer2 ||
          teamAPlayer1 === teamBPlayer1 || teamAPlayer1 === teamBPlayer2 ||
          teamAPlayer2 === teamBPlayer1 || teamAPlayer2 === teamBPlayer2) {
        alert('Aynı oyuncu birden fazla kez seçilemez!');
        return;
      }
      
      // Takım isimlerini alfabetik sırala
      const teamAPlayers = [teamAPlayer1, teamAPlayer2].sort();
      const teamBPlayers = [teamBPlayer1, teamBPlayer2].sort();
      
      const teamConfig = {
        teamA: {
          name: `${teamAPlayers[0]} & ${teamAPlayers[1]}`,
          players: teamAPlayers
        },
        teamB: {
          name: `${teamBPlayers[0]} & ${teamBPlayers[1]}`,
          players: teamBPlayers
        },
        extended: false // Başlangıçta uzatılmamış
      };
      
      createTournament(autoName, 'team', teamConfig);
      resetCreateForm();
    }
  };

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

        {/* Genel Seri Durumu Takım Seçimi - Accordion (Sadece Admin) */}
        {isAdmin && (
          <div className="mb-4 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <button 
              onClick={() => setShowTeamSelection(!showTeamSelection)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-blue-400" />
                <h3 className="text-slate-300 font-bold text-xs uppercase">Seri Takımları</h3>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${showTeamSelection ? 'rotate-180' : ''}`} />
            </button>
            
            {showTeamSelection && (
              <div className="p-4 pt-0 border-t border-slate-800">
                <p className="text-xs text-slate-400 mb-3">Karşılaşacak 2 takımı seçin</p>
            
            {/* Takım A - Accordion */}
            <div className="mb-3 bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/30 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowTeamA(!showTeamA)}
                className="w-full p-2 flex items-center justify-between text-left hover:bg-blue-900/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Trophy size={12} className="text-blue-400" />
                  <h4 className="text-xs font-bold text-blue-300 uppercase">Takım A</h4>
                  {seriesTeamAPlayer1 && seriesTeamAPlayer2 && (
                    <span className="text-[10px] text-blue-400/60">({seriesTeamAPlayer1} & {seriesTeamAPlayer2})</span>
                  )}
                </div>
                <ChevronDown size={14} className={`text-blue-400 transition-transform ${showTeamA ? 'rotate-180' : ''}`} />
              </button>
              
              {showTeamA && (
                <div className="p-2 pt-0 border-t border-blue-700/30">
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={seriesTeamAPlayer1} 
                      onChange={(e) => updateSeriesTeams(e.target.value, seriesTeamAPlayer2, seriesTeamBPlayer1, seriesTeamBPlayer2)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-xs focus:border-blue-500 outline-none"
                    >
                      <option value="">Oyuncu 1</option>
                      {PLAYERS.filter(p => p !== seriesTeamAPlayer2 && p !== seriesTeamBPlayer1 && p !== seriesTeamBPlayer2).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select 
                      value={seriesTeamAPlayer2} 
                      onChange={(e) => updateSeriesTeams(seriesTeamAPlayer1, e.target.value, seriesTeamBPlayer1, seriesTeamBPlayer2)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-xs focus:border-blue-500 outline-none"
                    >
                      <option value="">Oyuncu 2</option>
                      {PLAYERS.filter(p => p !== seriesTeamAPlayer1 && p !== seriesTeamBPlayer1 && p !== seriesTeamBPlayer2).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center text-slate-500 text-xs mb-3 font-bold">VS</div>
            
            {/* Takım B - Accordion */}
            <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-700/30 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowTeamB(!showTeamB)}
                className="w-full p-2 flex items-center justify-between text-left hover:bg-red-900/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Trophy size={12} className="text-red-400" />
                  <h4 className="text-xs font-bold text-red-300 uppercase">Takım B</h4>
                  {seriesTeamBPlayer1 && seriesTeamBPlayer2 && (
                    <span className="text-[10px] text-red-400/60">({seriesTeamBPlayer1} & {seriesTeamBPlayer2})</span>
                  )}
                </div>
                <ChevronDown size={14} className={`text-red-400 transition-transform ${showTeamB ? 'rotate-180' : ''}`} />
              </button>
              
              {showTeamB && (
                <div className="p-2 pt-0 border-t border-red-700/30">
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={seriesTeamBPlayer1} 
                      onChange={(e) => updateSeriesTeams(seriesTeamAPlayer1, seriesTeamAPlayer2, e.target.value, seriesTeamBPlayer2)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-xs focus:border-red-500 outline-none"
                    >
                      <option value="">Oyuncu 1</option>
                      {PLAYERS.filter(p => p !== seriesTeamAPlayer1 && p !== seriesTeamAPlayer2 && p !== seriesTeamBPlayer2).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select 
                      value={seriesTeamBPlayer2} 
                      onChange={(e) => updateSeriesTeams(seriesTeamAPlayer1, seriesTeamAPlayer2, seriesTeamBPlayer1, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-xs focus:border-red-500 outline-none"
                    >
                      <option value="">Oyuncu 2</option>
                      {PLAYERS.filter(p => p !== seriesTeamAPlayer1 && p !== seriesTeamAPlayer2 && p !== seriesTeamBPlayer1).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
            )}
          </div>
        )}

        {/* Şampiyonluk Tablosu - Accordion */}
        {(() => {
          // Seçilen takımlardan isim oluştur
          const teamAName = seriesTeams?.teamA?.player1 && seriesTeams?.teamA?.player2 
            ? [seriesTeams.teamA.player1, seriesTeams.teamA.player2].sort().join(' & ')
            : null;
          const teamBName = seriesTeams?.teamB?.player1 && seriesTeams?.teamB?.player2
            ? [seriesTeams.teamB.player1, seriesTeams.teamB.player2].sort().join(' & ')
            : null;
          
          const selectedTeams = [];
          if (teamAName) selectedTeams.push([teamAName, championships[teamAName] || 0]);
          if (teamBName) selectedTeams.push([teamBName, championships[teamBName] || 0]);
          
          // Normal kullanıcı için: En az 1 takımın 0'dan büyük olması gerekir
          // Admin için: Takımlar seçiliyse her zaman göster
          if (selectedTeams.length === 0) return null;
          if (!isAdmin && selectedTeams.every(([_, count]) => count === 0)) return null;
          
          const teamChampionships = selectedTeams.sort((a, b) => b[1] - a[1]);
          const maxCount = teamChampionships.length > 0 ? teamChampionships[0][1] : 0;
          
          return (
            <div className="mb-4 bg-gradient-to-br from-yellow-900/30 via-amber-900/20 to-yellow-800/30 border-2 border-yellow-600/40 rounded-xl overflow-hidden shadow-lg shadow-yellow-900/20">
              <button 
                onClick={() => setShowChampionships(!showChampionships)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-yellow-900/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Trophy size={14} className="text-yellow-400 animate-pulse" />
                  <h3 className="text-xs font-bold text-yellow-300 uppercase tracking-wide">Genel Seri Durumu</h3>
                </div>
                <ChevronDown size={16} className={`text-yellow-400 transition-transform ${showChampionships ? 'rotate-180' : ''}`} />
              </button>
              
              {showChampionships && (
                <div className="p-3 pt-0 border-t border-yellow-700/30">
                  <div className="space-y-1.5">
                {teamChampionships.map(([teamName, count], index) => {
                  // "SAMET & BURAK" -> "SAMET | BURAK"
                  const displayName = teamName.replace(' & ', ' | ');
                  // Lider: En yüksek skora sahip VE tek başına olmalı (berabere değil)
                  const hasUniqueLeader = teamChampionships.length >= 2 && teamChampionships[0][1] > teamChampionships[1][1];
                  const isLeader = count === maxCount && count > 0 && index === 0 && hasUniqueLeader;
                  const isSecond = index === 1 && count > 0;
                  
                  return (
                    <div 
                      key={teamName} 
                      className={`relative overflow-hidden rounded-md p-2 border transition-all ${
                        isLeader 
                          ? 'bg-gradient-to-r from-yellow-600/20 via-yellow-500/10 to-yellow-600/20 border-yellow-500/60 shadow-md shadow-yellow-500/20'
                          : isSecond
                          ? 'bg-gradient-to-r from-slate-800/40 via-slate-700/20 to-slate-800/40 border-slate-600/40'
                          : 'bg-gradient-to-r from-slate-800/30 via-slate-700/10 to-slate-800/30 border-slate-700/30'
                      }`}
                    >
                      {/* Background Pattern */}
                      {isLeader && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/5 to-transparent animate-pulse" />
                      )}
                      
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {/* Trophy Icon */}
                          <div className={`p-1 rounded ${
                            isLeader 
                              ? 'bg-yellow-500/30 ring-1 ring-yellow-400/50' 
                              : 'bg-slate-700/50'
                          }`}>
                            <Trophy size={12} className={isLeader ? 'text-yellow-400' : 'text-slate-400'} />
                          </div>
                          
                          {/* Team Name */}
                          <div>
                            <div className={`font-bold uppercase tracking-wide leading-tight ${
                              isLeader 
                                ? 'text-yellow-300 text-xs' 
                                : 'text-slate-300 text-[10px]'
                            }`}>
                              {displayName}
                            </div>
                            {isLeader && (
                              <div className="text-[8px] text-yellow-500/80 font-semibold uppercase tracking-wider">Lider</div>
                            )}
                          </div>
                        </div>
                        
                        {/* Dropdown (Admin) veya Score Badge (Normal User) */}
                        {isAdmin ? (
                          <select
                            value={count}
                            onChange={(e) => updateChampionships(teamName, parseInt(e.target.value))}
                            className="px-2 py-1 rounded font-bold text-sm bg-slate-900 border border-yellow-600/50 text-yellow-300 focus:border-yellow-500 outline-none cursor-pointer"
                          >
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                              <option key={num} value={num} className="bg-slate-900 text-white font-bold">{num}</option>
                            ))}
                          </select>
                        ) : (
                          <div className={`px-2 py-1 rounded font-bold text-base ${
                            isLeader 
                              ? 'bg-yellow-500/30 text-yellow-300 ring-1 ring-yellow-400/50 shadow-md shadow-yellow-500/20' 
                              : 'bg-slate-700/50 text-slate-300'
                          }`}>
                            {count}
                          </div>
                        )}  
                      </div>
                    </div>
                  );
                })}
              </div>
                </div>
              )}
            </div>
          );
        })()}

        {isAdmin && (
          <div className="mb-6">
            {!showCreate ? (
              <button onClick={() => setShowCreate(true)} className="w-full py-3 bg-slate-900 border border-slate-800 border-dashed rounded-xl text-slate-400 hover:text-emerald-400 transition-all flex items-center justify-center gap-2 font-medium">
                <Plus size={20} /> Yeni Turnuva Oluştur
              </button>
            ) : (
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 animate-in fade-in zoom-in-95">
                {/* Step 1: Mod Seçimi */}
                {createStep === 1 && (
                  <>
                    <h3 className="text-sm font-bold text-white mb-4">Turnuva Modu</h3>
                    
                    <div className="space-y-3 mb-4">
                      <button
                        onClick={() => setSelectedMode('individual')}
                        className={`w-full p-4 rounded-lg border-2 transition-all ${
                          selectedMode === 'individual'
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-slate-700 bg-slate-950 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            selectedMode === 'individual' ? 'bg-emerald-500/20' : 'bg-slate-800'
                          }`}>
                            <Users size={20} className={selectedMode === 'individual' ? 'text-emerald-400' : 'text-slate-400'} />
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-white text-sm">Bireysel Mod</div>
                            <div className="text-xs text-slate-400">1v1 Maçlar</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => setSelectedMode('team')}
                        className={`w-full p-4 rounded-lg border-2 transition-all ${
                          selectedMode === 'team'
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-slate-700 bg-slate-950 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            selectedMode === 'team' ? 'bg-purple-500/20' : 'bg-slate-800'
                          }`}>
                            <Users size={20} className={selectedMode === 'team' ? 'text-purple-400' : 'text-slate-400'} />
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-white text-sm">Takım Modu</div>
                            <div className="text-xs text-slate-400">2v2 Takım Savaşları (First to 5)</div>
                          </div>
                        </div>
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      <button onClick={resetCreateForm} className="flex-1 bg-slate-800 text-slate-300 py-2 rounded-lg text-sm">İptal</button>
                      <button 
                        onClick={() => {
                          if (selectedMode === 'individual') {
                            handleCreateSubmit();
                          } else {
                            setCreateStep(2);
                          }
                        }} 
                        className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm"
                      >
                        {selectedMode === 'individual' ? 'Oluştur' : 'İleri →'}
                      </button>
                    </div>
                  </>
                )}
                
                {/* Step 2: Takım Kurulumu */}
                {createStep === 2 && selectedMode === 'team' && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-white">Takımları Kur</h3>
                      <button onClick={() => setCreateStep(1)} className="text-xs text-slate-400 hover:text-white">← Geri</button>
                    </div>
                    
                    {/* Takım A */}
                    <div className="mb-4 p-4 bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy size={14} className="text-blue-400" />
                        <h4 className="text-xs font-bold text-blue-300 uppercase">Takım A</h4>
                      </div>
                      <div className="space-y-2">
                        <select 
                          value={teamAPlayer1} 
                          onChange={(e) => setTeamAPlayer1(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none"
                        >
                          <option value="">Oyuncu 1 Seç</option>
                          {PLAYERS.filter(p => p !== teamAPlayer2 && p !== teamBPlayer1 && p !== teamBPlayer2).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <select 
                          value={teamAPlayer2} 
                          onChange={(e) => setTeamAPlayer2(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none"
                        >
                          <option value="">Oyuncu 2 Seç</option>
                          {PLAYERS.filter(p => p !== teamAPlayer1 && p !== teamBPlayer1 && p !== teamBPlayer2).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    <div className="text-center text-slate-500 text-xs mb-4 font-bold">VS</div>
                    
                    {/* Takım B */}
                    <div className="mb-4 p-4 bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-700/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy size={14} className="text-red-400" />
                        <h4 className="text-xs font-bold text-red-300 uppercase">Takım B</h4>
                      </div>
                      <div className="space-y-2">
                        <select 
                          value={teamBPlayer1} 
                          onChange={(e) => setTeamBPlayer1(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-red-500 outline-none"
                        >
                          <option value="">Oyuncu 1 Seç</option>
                          {PLAYERS.filter(p => p !== teamAPlayer1 && p !== teamAPlayer2 && p !== teamBPlayer2).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <select 
                          value={teamBPlayer2} 
                          onChange={(e) => setTeamBPlayer2(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-red-500 outline-none"
                        >
                          <option value="">Oyuncu 2 Seç</option>
                          {PLAYERS.filter(p => p !== teamAPlayer1 && p !== teamAPlayer2 && p !== teamBPlayer1).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button onClick={resetCreateForm} className="flex-1 bg-slate-800 text-slate-300 py-2 rounded-lg text-sm">İptal</button>
                      <button 
                        onClick={handleCreateSubmit} 
                        className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-bold"
                      >
                        Turnuvayı Başlat 🔥
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="text-center text-slate-500 py-10">Yükleniyor...</div>
          ) : registry.length === 0 ? (
            <div className="text-center text-slate-500 py-10 bg-slate-900/30 rounded-xl">Kayıtlı turnuva yok.</div>
          ) : (
            registry.map((t) => (
              <TournamentCard 
                key={t.id}
                tournament={t}
                onSelect={onSelect}
                isAdmin={isAdmin}
                handleDeleteClick={handleDeleteClick}
                db={db}
                appId={appId}
              />
            ))
          )}
        </div>
      </div>
      <style>{`.pb-safe { padding-bottom: env(safe-area-inset-bottom); }`}</style>
    </div>
  );
}

// ==========================================
// TOURNAMENT VIEW
// ==========================================
function TournamentView({ data, tournamentId, isAdmin, goBack, saveData, updateStatus, onRename, onDelete, openConfirmModal, updateChampionships, championships }) {
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
  
  // --- Takım Modu: Seri Hesaplama ---
  const teamSeriesStats = useMemo(() => {
    if (settings.mode !== 'team' || !settings.teamConfig) return null;
    
    let teamAWins = 0;
    let teamBWins = 0;
    
    matches.forEach(match => {
      if (match.played) {
        const hScore = parseInt(match.homeScore);
        const aScore = parseInt(match.awayScore);
        if (!isNaN(hScore) && !isNaN(aScore)) {
          if (hScore > aScore) {
            teamAWins++; // Takım A kazandı
          } else if (aScore > hScore) {
            teamBWins++; // Takım B kazandı
          }
          // Beraberlik saya durmuyor, seri devam ediyor
        }
      }
    });
    
    const targetWins = settings.teamConfig?.extended ? 6 : 5; // Uzatılmışsa 6, değilse 5
    const seriesWon = teamAWins >= targetWins || teamBWins >= targetWins;
    const winner = teamAWins >= targetWins ? 'teamA' : (teamBWins >= targetWins ? 'teamB' : null);
    
    return {
      teamAWins,
      teamBWins,
      seriesWon,
      winner,
      targetWins,
      totalGames: targetWins,
      extended: settings.teamConfig?.extended || false
    };
  }, [matches, settings]);

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

  if (!data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Yüklen iyor...</p>
      </div>
    </div>
  );
    
  // Takım Modu Kontrolü
  if (settings.mode === 'team' && settings.teamConfig) {
    return (
      <TeamModeView
        settings={settings}
        matches={matches}
        teamSeriesStats={teamSeriesStats}
        isAdmin={isAdmin}
        goBack={goBack}
        saveData={saveData}
        setMatches={setMatches}
        updateChampionships={updateChampionships}
        championships={championships}
        tournamentId={tournamentId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24">
      {/* HEADER */}
      <div className="bg-white/95 backdrop-blur border-b border-gray-200 p-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={goBack} className="p-2 -ml-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{settings.name || 'Turnuva'}</h1>
            <p className="text-[10px] text-purple-600 uppercase font-bold tracking-wider">{settings.started ? (matches.length > 0 && matches.every(m => m.played) ? 'Tamamlandı' : 'Canlı') : 'Hazırlık'}</p>
          </div>
          {isAdmin && <span className="text-[10px] bg-red-900/30 text-red-400 px-2 py-1 rounded border border-red-900/50">YÖNETİCİ</span>}
        </div>
      </div>
      

      <div className="max-w-4xl mx-auto p-4">
        
        {/* STANDINGS */}
        {activeTab === 'standings' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
            {!settings.started && players.length === 0 ? (
              <div className="text-center py-12 text-slate-500">Katılımcı eklemek için yönetici sekmesine gidin.</div>
            ) : (
              <>
                {/* Premier League Style Header */}
                <div className="mb-6">
                  <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 mb-1">
                    Puan Durumu
                  </h2>
                </div>

                {/* Puan Durumu ve Maçlar - Flex Layout */}
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Sol: Puan Durumu Tablosu */}
                  <div className="flex-1 overflow-hidden rounded-2xl bg-gradient-to-b from-gray-100 to-gray-200 shadow-2xl">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800">
                        <tr className="text-white">
                          <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider" colSpan="2">Takım</th>
                          <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-wider w-12">O</th>
                          <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-wider w-12">A</th>
                          <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-wider w-12">Y</th>
                          <th className="px-3 py-4 text-center text-xs font-bold uppercase tracking-wider w-12">Av</th>
                          <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider w-16">P</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {standings.map((row, idx) => {
                           const isTopFour = idx < 4;
                           const isBottomThree = idx >= standings.length - 3;
                           
                           return (
                            <tr 
                              key={row.id} 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedPlayer(row);
                              }}
                              className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                                isTopFour ? 'border-l-4 border-purple-500' : 
                                isBottomThree ? 'border-l-4 border-red-400' : 
                                'border-l-4 border-transparent'
                              }`}
                            >
                              <td className="px-4 py-4 w-12">
                                <div className="flex items-center justify-center">
                                  <span className="text-base font-bold text-gray-700">{idx + 1}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <div className="font-bold text-gray-900 text-base uppercase tracking-wide">{row.name}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-4 text-center font-semibold text-gray-700">{row.played}</td>
                              <td className="px-3 py-4 text-center font-semibold text-emerald-600">{row.gf}</td>
                              <td className="px-3 py-4 text-center font-semibold text-red-500">{row.ga}</td>
                              <td className="px-3 py-4 text-center font-semibold text-gray-700">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                              <td className="px-4 py-4 text-center font-black text-gray-900 text-xl">
                                {row.points}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Sağ: Maçlar Kutusu */}
                  <div className="w-full md:w-80 flex-shrink-0">
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-2xl p-4 space-y-4 h-full">
                      {/* Sıradaki Maçlar */}
                      {settings.started && matches.some(m => !m.played) && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider text-center">
                            Sıradaki Maçlar
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {getUpcomingRoundPredictions().slice(0, 2).map((match, idx) => (
                              <div 
                                key={match.id} 
                                className="bg-gradient-to-r from-slate-800/80 via-orange-900/40 to-slate-800/80 rounded-lg border border-orange-500/30 p-1.5"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  {/* Home Team */}
                                  <div className="flex-1 text-left min-w-0">
                                    <span className="text-[10px] font-black uppercase tracking-tight block truncate text-white">
                                      {match.homePlayer.name}
                                    </span>
                                  </div>
                                  
                                  {/* VS Badge */}
                                  <div className="flex items-center px-1.5 py-0.5 bg-gradient-to-r from-orange-600 to-yellow-600 rounded flex-shrink-0">
                                    <span className="text-xs font-black text-white">VS</span>
                                  </div>
                                  
                                  {/* Away Team */}
                                  <div className="flex-1 text-right min-w-0">
                                    <span className="text-[10px] font-black uppercase tracking-tight block truncate text-white">
                                      {match.awayPlayer.name}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Son Maç Skorları */}
                      {getRecentRoundMatches().length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider text-center">
                            Son Maç Skorları
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {getRecentRoundMatches().slice(0, 2).map((match, idx) => {
                              const homePlayer = players.find(p => p.id === match.home);
                              const awayPlayer = players.find(p => p.id === match.away);
                              
                              if (!homePlayer || !awayPlayer) return null;
                              
                              const homeScore = parseInt(match.homeScore);
                              const awayScore = parseInt(match.awayScore);
                              const winner = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw';
                              
                              return (
                                <div 
                                  key={match.id} 
                                  className="bg-gradient-to-r from-slate-800/80 via-purple-900/40 to-slate-800/80 rounded-lg border border-purple-500/30 p-1.5"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    {/* Home Team */}
                                    <div className="flex-1 text-left min-w-0 relative">
                                      <span className={`text-[10px] font-black uppercase tracking-tight block truncate ${
                                        winner === 'home' ? 'text-white' : 'text-slate-400'
                                      }`}>
                                        {homePlayer.name}
                                      </span>
                                      {/* Win/Draw/Loss Indicator */}
                                      <div className={`absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full ${
                                        winner === 'home' ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                                        winner === 'draw' ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                                        'bg-gradient-to-r from-red-500 to-rose-400'
                                      }`}></div>
                                    </div>
                                    
                                    {/* Score */}
                                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded flex-shrink-0">
                                      <span className="text-sm font-black text-white">{homeScore}</span>
                                      <span className="text-[10px] text-white/60">-</span>
                                      <span className="text-sm font-black text-white">{awayScore}</span>
                                    </div>
                                    
                                    {/* Away Team */}
                                    <div className="flex-1 text-right min-w-0 relative">
                                      <span className={`text-[10px] font-black uppercase tracking-tight block truncate ${
                                        winner === 'away' ? 'text-white' : 'text-slate-400'
                                      }`}>
                                        {awayPlayer.name}
                                      </span>
                                      {/* Win/Draw/Loss Indicator */}
                                      <div className={`absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full ${
                                        winner === 'away' ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                                        winner === 'draw' ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                                        'bg-gradient-to-r from-red-500 to-rose-400'
                                      }`}></div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
              <div className="space-y-6">
                {isAdmin ? (
                  // Admin Görünümü - Mevcut görünüm
                  Array.from(new Set(matches.map(m => m.round))).sort((a,b) => a-b).map(round => {
                    const roundMatches = matches.filter(m => m.round === round);
                    const isFinished = roundMatches.every(m => m.played);
                    return (
                      <div key={round} className="space-y-4">
                        {/* Premier League Style Header */}
                        <div>
                          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600">
                            {round}. Hafta <span className="font-normal">Sonuçları</span>
                          </h2>
                        </div>

                        <div className="space-y-3">
                        {roundMatches.map(match => {
                          const h = players.find(p => p.id === match.home);
                          const a = players.find(p => p.id === match.away);
                          const isEditMode = scoreEditMode[match.id];
                          
                          let winnerHighlight = null;
                          
                          if (match.played) {
                            const homeScore = parseInt(match.homeScore);
                            const awayScore = parseInt(match.awayScore);
                            
                            if (homeScore > awayScore) {
                              winnerHighlight = "home";
                            } else if (awayScore > homeScore) {
                              winnerHighlight = "away";
                            }
                          }
                          
                          return (
                            <div key={match.id} className="bg-gradient-to-b from-gray-100 to-gray-200 rounded-2xl p-4 shadow-lg hover:shadow-xl transition-shadow">
                              <div className="flex items-center justify-between gap-2">
                                {/* Home Team */}
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-base sm:text-xl shadow-md flex-shrink-0">
                                    {h?.name.charAt(0) || '?'}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className={`font-bold text-sm sm:text-lg uppercase truncate ${
                                      winnerHighlight === 'home' ? 'text-gray-900' : 'text-gray-600'
                                    }`}>
                                      {h?.name || 'Bilinmeyen'}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Score */}
                                <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-6 flex-shrink-0">
                                  {isAdmin ? (
                                    isEditMode ? (
                                      <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-xl border-2 border-purple-500 shadow-lg">
                                        <div className="flex items-center gap-2">
                                          <select
                                            value={match.homeScore} 
                                            onChange={(e) => handleMatchUpdate(match.id, 'homeScore', e.target.value)} 
                                            className="w-16 h-12 border-2 border-gray-300 rounded-lg text-center font-bold focus:border-purple-500 outline-none bg-white text-gray-900 text-xl cursor-pointer" 
                                            autoFocus
                                          >
                                            <option value="">-</option>
                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                                              <option key={num} value={num}>{num}</option>
                                            ))}
                                          </select>
                                          <span className="text-gray-400 font-bold text-xl">-</span>
                                          <select
                                            value={match.awayScore} 
                                            onChange={(e) => handleMatchUpdate(match.id, 'awayScore', e.target.value)} 
                                            className="w-16 h-12 border-2 border-gray-300 rounded-lg text-center font-bold focus:border-purple-500 outline-none bg-white text-gray-900 text-xl cursor-pointer" 
                                          >
                                            <option value="">-</option>
                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                                              <option key={num} value={num}>{num}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <button 
                                          onClick={() => toggleScoreEditMode(match.id)}
                                          className="w-full py-2 text-purple-600 hover:text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors font-bold text-sm"
                                        >
                                          TAMAM
                                        </button>
                                      </div>
                                    ) : (
                                      <div 
                                        className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
                                        onClick={() => toggleScoreEditMode(match.id)}
                                      >
                                        {match.played ? (
                                          <>
                                            <span className={`font-black text-xl sm:text-3xl ${
                                              winnerHighlight === 'home' ? 'text-gray-900' : 'text-gray-500'
                                            }`}>
                                              {match.homeScore}
                                            </span>
                                            <span className="text-gray-400 font-bold text-lg sm:text-2xl">-</span>
                                            <span className={`font-black text-xl sm:text-3xl ${
                                              winnerHighlight === 'away' ? 'text-gray-900' : 'text-gray-500'
                                            }`}>
                                              {match.awayScore}
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-gray-400 font-bold text-base sm:text-xl">vs</span>
                                        )}
                                        <Edit3 size={14} className="text-gray-400 group-hover:text-purple-500 transition-colors sm:w-4 sm:h-4" />
                                      </div>
                                    )
                                  ) : (
                                    match.played ? (
                                      <>
                                        <span className={`font-black text-xl sm:text-3xl ${
                                          winnerHighlight === 'home' ? 'text-gray-900' : 'text-gray-500'
                                        }`}>
                                          {match.homeScore}
                                        </span>
                                        <span className="text-gray-400 font-bold text-lg sm:text-2xl">-</span>
                                        <span className={`font-black text-xl sm:text-3xl ${
                                          winnerHighlight === 'away' ? 'text-gray-900' : 'text-gray-500'
                                        }`}>
                                          {match.awayScore}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-gray-400 font-bold text-base sm:text-xl">vs</span>
                                    )
                                  )}
                                </div>

                                {/* Away Team */}
                                <div className="flex items-center gap-2 flex-1 flex-row-reverse min-w-0">
                                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-base sm:text-xl shadow-md flex-shrink-0">
                                    {a?.name.charAt(0) || '?'}
                                  </div>
                                  <div className="min-w-0 flex-1 text-right">
                                    <div className={`font-bold text-sm sm:text-lg uppercase truncate ${
                                      winnerHighlight === 'away' ? 'text-gray-900' : 'text-gray-600'
                                    }`}>
                                      {a?.name || 'Bilinmeyen'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  </div>
                 );
                })
                ) : (
                  // Normal Kullanıcı Görünümü - Maçkolik Tarzı Minimal
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Maç Sonuçları</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {matches
                        .filter(m => m.played)
                        .sort((a, b) => b.round - a.round)
                        .slice(0, 5)
                        .map(match => {
                          const h = players.find(p => p.id === match.home);
                          const a = players.find(p => p.id === match.away);
                          const homeScore = parseInt(match.homeScore);
                          const awayScore = parseInt(match.awayScore);
                          const homeWon = homeScore > awayScore;
                          const awayWon = awayScore > homeScore;
                                  
                          return (
                            <div key={match.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                              {/* Sol - Ev Sahibi */}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className={`text-sm font-semibold truncate ${
                                  homeWon ? 'text-slate-900' : 'text-slate-400'
                                }`}>{h?.name || 'Bilinmeyen'}</span>
                              </div>
                                      
                              {/* Orta - Skor */}
                              <div className="flex items-center gap-1.5 px-3 flex-shrink-0">
                                <span className={`text-base font-black ${
                                  homeWon ? 'text-slate-900' : 'text-slate-400'
                                }`}>{homeScore}</span>
                                <span className="text-slate-300 text-xs font-bold">-</span>
                                <span className={`text-base font-black ${
                                  awayWon ? 'text-slate-900' : 'text-slate-400'
                                }`}>{awayScore}</span>
                              </div>
                                      
                              {/* Sağ - Deplasman */}
                              <div className="flex items-center gap-2 flex-1 min-w-0 flex-row-reverse">
                                <span className={`text-sm font-semibold truncate text-right ${
                                  awayWon ? 'text-slate-900' : 'text-slate-400'
                                }`}>{a?.name || 'Bilinmeyen'}</span>
                              </div>
                            </div>
                          );
                        })}
                      {matches.filter(m => m.played).length === 0 && (
                        <div className="p-6 text-center text-slate-400 text-sm">Henüz maç oynanmadı</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STATISTICS */}
        {activeTab === 'stats' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
            {!settings.started ? (
              <div className="text-center py-12 text-gray-500">Turnuva başladığında istatistikler görünecek.</div>
            ) : (
              <>
                {/* Şampiyonluk Şansı - Premier League Style */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700">
                      <Trophy className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-wide">Şampiyonluk Şansı</h3>
                      <p className="text-xs text-gray-500">Mevcut forma göre tahminler</p>
                    </div>
                  </div>
                  <div className="space-y-3">
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
                          <div key={player.id} className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
                            <div className="p-4 flex items-center gap-3 relative z-10">
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${
                                playedMatches > 0 && isLeader ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-gray-900 shadow-lg' : 'bg-gray-300 text-gray-700'
                              }`}>
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="font-black text-gray-900 text-base uppercase tracking-wide truncate">{player.name}</div>
                                  {isChampionGuaranteed && (
                                    <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full border border-yellow-400">
                                      <Trophy className="text-yellow-600 fill-yellow-600" size={12} />
                                      <span className="text-[9px] font-black text-yellow-700 uppercase">Şampİyon</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 font-semibold">{player.points} puan • {player.played} maç</div>
                              </div>
                              <div className={`text-2xl font-black ${
                                isLeader ? 'text-yellow-600' : championshipChance > 50 ? 'text-emerald-600' : championshipChance > 20 ? 'text-purple-600' : 'text-gray-400'
                              }`}>
                                {Math.round(championshipChance)}%
                              </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r transition-all duration-700 ease-out" 
                              style={{ 
                                width: `${barWidth}%`,
                                background: playedMatches === 0
                                  ? 'linear-gradient(to right, rgba(229, 231, 235, 0.5), transparent)'
                                  : playedMatches > 0 && isLeader 
                                    ? 'linear-gradient(to right, rgba(251, 191, 36, 0.2), transparent)'
                                    : championshipChance > 50 
                                      ? 'linear-gradient(to right, rgba(16, 185, 129, 0.15), transparent)'
                                      : 'linear-gradient(to right, rgba(168, 85, 247, 0.1), transparent)'
                              }}>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* İstatistik Kartları Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* En Çok Gol Atan */}
                  {(() => {
                    const topScorer = standings.reduce((max, p) => p.gf > max.gf ? p : max, standings[0]);
                    return topScorer && topScorer.gf > 0 ? (
                      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-lg">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-lg bg-emerald-100">
                            <Target className="text-emerald-600" size={18} />
                          </div>
                          <h4 className="text-sm font-black text-gray-900 uppercase">En Çok Gol</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-xl shadow-lg">
                            {topScorer.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-700 text-xs uppercase truncate">{topScorer.name}</div>
                            <div className="text-3xl font-black text-emerald-600">{topScorer.gf}</div>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* En Çok Gol Yiyen */}
                  {(() => {
                    const worstDefense = standings.reduce((max, p) => p.ga > max.ga ? p : max, standings[0]);
                    return worstDefense && worstDefense.ga > 0 ? (
                      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-lg">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-lg bg-red-100">
                            <AlertTriangle className="text-red-600" size={18} />
                          </div>
                          <h4 className="text-sm font-black text-gray-900 uppercase">En Çok Yiyen</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-black text-xl shadow-lg">
                            {worstDefense.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-700 text-xs uppercase truncate">{worstDefense.name}</div>
                            <div className="text-3xl font-black text-red-600">{worstDefense.ga}</div>
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
                      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-lg">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-lg bg-orange-100">
                            <Flame className="text-orange-600" size={18} />
                          </div>
                          <h4 className="text-sm font-black text-gray-900 uppercase">Galibiyet Serisi</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-black text-xl shadow-lg">
                            {bestStreak.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-700 text-xs uppercase truncate">{bestStreak.name}</div>
                            <div className="text-3xl font-black text-orange-600">{bestStreak.winStreak}</div>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* En Çok Berabere Kalan */}
                  {(() => {
                    const mostDraws = standings.reduce((max, p) => p.drawn > max.drawn ? p : max, standings[0]);
                    return mostDraws && mostDraws.drawn > 0 ? (
                      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-lg">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 rounded-lg bg-gray-200">
                            <Minus className="text-gray-600" size={18} />
                          </div>
                          <h4 className="text-sm font-black text-gray-900 uppercase">En Çok Berabere</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                            {mostDraws.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-700 text-xs uppercase truncate">{mostDraws.name}</div>
                            <div className="text-3xl font-black text-gray-600">{mostDraws.drawn}</div>
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

        {/* HEAD TO HEAD STATS */}
        {activeTab === 'predictions' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
            {!settings.started ? (
              <div className="text-center py-12 text-slate-500">Turnuva başladığında kafa kafaya istatistikler görünecek.</div>
            ) : (() => {
              const playedMatchesCount = matches.filter(m => m.played).length;
              
              if (playedMatchesCount === 0) {
                return (
                  <div className="text-center py-12 space-y-3">
                    <Sparkles size={48} className="mx-auto text-slate-600" />
                    <p className="text-slate-500">Henüz maç oynanmadı!</p>
                    <p className="text-xs text-slate-600">İlk skorlar girildikten sonra eğlenceli istatistikler burada görünecek.</p>
                  </div>
                );
              }

              // Kafa kafaya istatistikleri hesapla
              const headToHeadStats = [];
              
              players.forEach(p1 => {
                players.forEach(p2 => {
                  if (p1.id !== p2.id) {
                    const matchesBetween = matches.filter(m => 
                      m.played && 
                      ((m.home === p1.id && m.away === p2.id) || (m.home === p2.id && m.away === p1.id))
                    );
                    
                    if (matchesBetween.length > 0) {
                      let p1Wins = 0;
                      let p2Wins = 0;
                      let draws = 0;
                      let p1Goals = 0;
                      let p2Goals = 0;
                      let biggestWin = null;
                      let maxDiff = 0;
                      
                      matchesBetween.forEach(m => {
                        const p1IsHome = m.home === p1.id;
                        const p1Score = parseInt(p1IsHome ? m.homeScore : m.awayScore);
                        const p2Score = parseInt(p1IsHome ? m.awayScore : m.homeScore);
                        
                        p1Goals += p1Score;
                        p2Goals += p2Score;
                        
                        if (p1Score > p2Score) {
                          p1Wins++;
                          const diff = p1Score - p2Score;
                          if (diff > maxDiff) {
                            maxDiff = diff;
                            biggestWin = { winner: p1, loser: p2, score: `${p1Score}-${p2Score}`, diff };
                          }
                        } else if (p2Score > p1Score) {
                          p2Wins++;
                          const diff = p2Score - p1Score;
                          if (diff > maxDiff) {
                            maxDiff = diff;
                            biggestWin = { winner: p2, loser: p1, score: `${p2Score}-${p1Score}`, diff };
                          }
                        } else {
                          draws++;
                        }
                      });
                      
                      // Sadece bir kez ekle (p1 < p2 sıralamasında)
                      if (p1.id < p2.id) {
                        headToHeadStats.push({
                          p1,
                          p2,
                          p1Wins,
                          p2Wins,
                          draws,
                          p1Goals,
                          p2Goals,
                          totalMatches: matchesBetween.length,
                          biggestWin
                        });
                      }
                    }
                  }
                });
              });

              // En çok gol atan oyuncu
              const topScorer = standings.length > 0 ? standings.reduce((max, p) => p.gf > max.gf ? p : max, standings[0]) : null;
              
              // En çok gol yiyen
              const worstDefense = standings.length > 0 ? standings.reduce((max, p) => p.ga > max.ga ? p : max, standings[0]) : null;
              
              // En büyük farklı galibiyet
              let biggestVictory = null;
              let biggestVictoryDiff = 0;
              matches.filter(m => m.played).forEach(m => {
                const diff = Math.abs(parseInt(m.homeScore) - parseInt(m.awayScore));
                if (diff > biggestVictoryDiff) {
                  biggestVictoryDiff = diff;
                  const winner = parseInt(m.homeScore) > parseInt(m.awayScore) 
                    ? players.find(p => p.id === m.home)
                    : players.find(p => p.id === m.away);
                  const loser = parseInt(m.homeScore) > parseInt(m.awayScore)
                    ? players.find(p => p.id === m.away)
                    : players.find(p => p.id === m.home);
                  biggestVictory = { winner, loser, score: `${m.homeScore}-${m.awayScore}`, diff };
                }
              });

              return (
                <>
                  {/* Başlık */}
                  <div className="bg-gradient-to-br from-pink-900/20 to-slate-900/50 rounded-xl border border-pink-500/30 p-5 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl"></div>
                    <div className="relative z-10">
                      <h3 className="text-sm font-bold text-pink-400 mb-1 flex items-center gap-2">
                        <Sparkles className="animate-pulse" size={18} />
                        Eğlenceli İstatistikler
                      </h3>
                      <p className="text-xs text-slate-400">Kim kimi domine ediyor? 🔥</p>
                    </div>
                  </div>

                  {/* Genel İstatistikler */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* En Çok Gol Atan */}
                    {topScorer && topScorer.gf > 0 && (
                      <div className="bg-gradient-to-br from-emerald-900/30 to-slate-900/50 rounded-xl border border-emerald-500/30 p-4 relative overflow-hidden">
                        <div className="absolute -top-2 -right-2 w-16 h-16 bg-emerald-500/20 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                          <Target size={14} className="text-emerald-400 mb-2" />
                          <div className="text-[10px] text-emerald-400 font-bold uppercase mb-1">Gol Makinesi</div>
                          <div className="font-black text-white text-sm uppercase truncate">{topScorer.name}</div>
                          <div className="text-2xl font-black text-emerald-400 mt-1">{topScorer.gf} ⚽</div>
                        </div>
                      </div>
                    )}

                    {/* En Çok Gol Yiyen */}
                    {worstDefense && worstDefense.ga > 0 && (
                      <div className="bg-gradient-to-br from-red-900/30 to-slate-900/50 rounded-xl border border-red-500/30 p-4 relative overflow-hidden">
                        <div className="absolute -top-2 -right-2 w-16 h-16 bg-red-500/20 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                          <AlertTriangle size={14} className="text-red-400 mb-2" />
                          <div className="text-[10px] text-red-400 font-bold uppercase mb-1">Kale Tıkır</div>
                          <div className="font-black text-white text-sm uppercase truncate">{worstDefense.name}</div>
                          <div className="text-2xl font-black text-red-400 mt-1">{worstDefense.ga} 🥅</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* En Büyük Fark */}
                  {biggestVictory && biggestVictory.diff >= 2 && (
                    <div className="bg-gradient-to-br from-amber-900/20 to-slate-900/50 rounded-xl border border-amber-500/30 p-4 overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <Flame size={16} className="text-amber-400" />
                          <h4 className="text-xs font-bold text-amber-400 uppercase">Turnuvanın En Büyük Farkı</h4>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-xs text-slate-500 mb-1">Galibiyet</div>
                            <div className="font-black text-emerald-400 uppercase text-sm truncate">{biggestVictory.winner?.name}</div>
                          </div>
                          <div className="px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-700">
                            <div className="text-2xl font-black text-white">{biggestVictory.score}</div>
                          </div>
                          <div className="flex-1 text-right">
                            <div className="text-xs text-slate-500 mb-1">Mağlubiyet</div>
                            <div className="font-black text-red-400 uppercase text-sm truncate">{biggestVictory.loser?.name}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-center">
                          <span className="text-[10px] text-amber-400 font-bold">{biggestVictory.diff} GOL FARK!</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Kafa Kafaya Rekabetler */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-8 h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent flex-1"></div>
                      <h4 className="text-xs font-bold text-pink-400 uppercase">Kafa Kafaya</h4>
                      <div className="w-8 h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent flex-1"></div>
                    </div>

                    {headToHeadStats
                      .filter(stat => stat.totalMatches >= 2)
                      .sort((a, b) => b.totalMatches - a.totalMatches)
                      .map((stat, idx) => {
                        const isDominating = stat.p1Wins >= 2 && stat.p1Wins > stat.p2Wins;
                        const isDominating2 = stat.p2Wins >= 2 && stat.p2Wins > stat.p1Wins;
                        const isBalanced = Math.abs(stat.p1Wins - stat.p2Wins) <= 1;
                        
                        return (
                          <div key={`${stat.p1.id}-${stat.p2.id}`} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all">
                            {/* Header */}
                            <div className="p-3 bg-slate-900/30 border-b border-slate-800 flex items-center justify-between">
                              <div className="text-[10px] text-slate-500 font-bold uppercase">
                                {stat.totalMatches} Maç • {stat.p1Goals + stat.p2Goals} Gol
                              </div>
                              {isBalanced ? (
                                <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                                  <Zap size={10} className="text-amber-400" />
                                  <span className="text-[9px] font-bold text-amber-400">KAPIŞMA</span>
                                </div>
                              ) : isDominating || isDominating2 ? (
                                <div className="flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/30">
                                  <Flame size={10} className="text-red-400" />
                                  <span className="text-[9px] font-bold text-red-400">DOMİNASYON</span>
                                </div>
                              ) : null}
                            </div>

                            {/* Players */}
                            <div className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                {/* Player 1 */}
                                <div className="flex-1 text-center">
                                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center font-bold text-lg border-2 mb-2 ${
                                    isDominating
                                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-lg shadow-emerald-500/30'
                                      : 'bg-slate-800 border-slate-700 text-slate-300'
                                  }`}>
                                    {stat.p1.name.charAt(0)}
                                  </div>
                                  <div className={`font-bold text-xs uppercase truncate ${
                                    isDominating ? 'text-emerald-400' : 'text-white'
                                  }`}>
                                    {stat.p1.name}
                                  </div>
                                  {stat.p1.team && (
                                    <div className="text-[9px] text-slate-500 truncate mt-0.5">{stat.p1.team}</div>
                                  )}
                                  <div className="mt-2 space-y-1">
                                    <div className="text-2xl font-black text-emerald-400">{stat.p1Wins}</div>
                                    <div className="text-[9px] text-slate-500 uppercase font-bold">Galibiyet</div>
                                  </div>
                                </div>

                                {/* VS & Stats */}
                                <div className="flex flex-col items-center gap-2">
                                  <div className="text-xs font-bold text-slate-500">VS</div>
                                  {stat.draws > 0 && (
                                    <div className="bg-slate-800 px-2 py-1 rounded">
                                      <div className="text-xs font-bold text-slate-400">{stat.draws} Berabere</div>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                    <span className="font-bold text-emerald-400">{stat.p1Goals}</span>
                                    <span>-</span>
                                    <span className="font-bold text-red-400">{stat.p2Goals}</span>
                                  </div>
                                </div>

                                {/* Player 2 */}
                                <div className="flex-1 text-center">
                                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center font-bold text-lg border-2 mb-2 ${
                                    isDominating2
                                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-lg shadow-emerald-500/30'
                                      : 'bg-slate-800 border-slate-700 text-slate-300'
                                  }`}>
                                    {stat.p2.name.charAt(0)}
                                  </div>
                                  <div className={`font-bold text-xs uppercase truncate ${
                                    isDominating2 ? 'text-emerald-400' : 'text-white'
                                  }`}>
                                    {stat.p2.name}
                                  </div>
                                  {stat.p2.team && (
                                    <div className="text-[9px] text-slate-500 truncate mt-0.5">{stat.p2.team}</div>
                                  )}
                                  <div className="mt-2 space-y-1">
                                    <div className="text-2xl font-black text-emerald-400">{stat.p2Wins}</div>
                                    <div className="text-[9px] text-slate-500 uppercase font-bold">Galibiyet</div>
                                  </div>
                                </div>
                              </div>

                              {/* Eğlenceli Yorum */}
                              {isDominating && (
                                <div className="mt-3 p-2 bg-emerald-900/10 rounded-lg border border-emerald-500/20">
                                  <p className="text-[10px] text-emerald-400 text-center font-bold">
                                    🔥 {stat.p1.name}, {stat.p2.name}'ı {stat.p1Wins} kez yendi!
                                  </p>
                                </div>
                              )}
                              {isDominating2 && (
                                <div className="mt-3 p-2 bg-emerald-900/10 rounded-lg border border-emerald-500/20">
                                  <p className="text-[10px] text-emerald-400 text-center font-bold">
                                    🔥 {stat.p2.name}, {stat.p1.name}'ı {stat.p2Wins} kez yendi!
                                  </p>
                                </div>
                              )}
                              {stat.p1Goals > stat.p2Goals * 2 && (
                                <div className="mt-3 p-2 bg-purple-900/10 rounded-lg border border-purple-500/20">
                                  <p className="text-[10px] text-purple-400 text-center font-bold">
                                    ⚽ {stat.p1.name}, {stat.p2.name}'a karşı gol yağdırıyor!
                                  </p>
                                </div>
                              )}
                              {stat.p2Goals > stat.p1Goals * 2 && (
                                <div className="mt-3 p-2 bg-purple-900/10 rounded-lg border border-purple-500/20">
                                  <p className="text-[10px] text-purple-400 text-center font-bold">
                                    ⚽ {stat.p2.name}, {stat.p1.name}'a karşı gol yağdırıyor!
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Bilgi Notu */}
                  <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-3">
                    <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                      <span className="text-pink-400 font-bold">💡 İpucu:</span> Daha fazla maç oynandıkça istatistikler daha eğlenceli hale gelecek!
                    </p>
                  </div>
                </>
              );
            })()}
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

      {/* PLAYER DETAIL MODAL - Premier League Style */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
           <div className="bg-white w-full sm:max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col relative">
              {/* Close button */}
              <button 
                onClick={() => setSelectedPlayer(null)} 
                className="absolute right-4 top-4 z-20 p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-all shadow-lg"
              >
                <X size={20}/>
              </button>

              {/* Header with gradient background */}
              <div className="relative h-40 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center overflow-hidden">
                 {/* Subtle pattern overlay */}
                 <div className="absolute inset-0 opacity-10">
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"></div>
                 </div>
                 
                 <div className="text-center z-10 mt-6">
                    <h2 className="text-3xl font-black text-white uppercase tracking-wide drop-shadow-lg" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                      {selectedPlayer.name}
                    </h2>
                 </div>
              </div>
              
              {/* Stats Grid - Premier League Style */}
              <div className="grid grid-cols-4 gap-4 p-6 pt-6 border-b border-gray-200 bg-gray-50">
                 <div className="text-center">
                    <div className="text-2xl font-black text-gray-900" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{selectedPlayer.played}</div>
                    <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wide mt-1">Maç</div>
                 </div>
                 <div className="text-center">
                    <div className="text-2xl font-black text-emerald-600" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{selectedPlayer.gf}</div>
                    <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wide mt-1">Gol</div>
                 </div>
                 <div className="text-center">
                    <div className="text-2xl font-black text-gray-900" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{selectedPlayer.points}</div>
                    <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wide mt-1">Puan</div>
                 </div>
                 <div className="text-center">
                    <div className="text-2xl font-black text-purple-600" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{selectedPlayer.gd > 0 ? `+${selectedPlayer.gd}` : selectedPlayer.gd}</div>
                    <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wide mt-1">Av.</div>
                 </div>
              </div>

              {/* Match History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                 {/* Section Header */}
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                     <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-purple-700 rounded-full"></div>
                     <h3 className="text-xs font-black text-gray-900 uppercase tracking-wide" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                       Maç Geçmişi
                     </h3>
                   </div>
                   <div className="text-xs text-gray-500 font-semibold">
                     {(() => {
                       const playerMatches = matches.filter(m => m.home === selectedPlayer.id || m.away === selectedPlayer.id);
                       const playedMatches = playerMatches.filter(m => m.played);
                       return `${playedMatches.length}/${playerMatches.length} maç`;
                     })()}
                   </div>
                 </div>
                 
                 {/* Match cards */}
                 <div className="space-y-2">
                 {matches
                   .filter(m => m.home === selectedPlayer.id || m.away === selectedPlayer.id)
                   .sort((a,b) => a.round - b.round)
                   .map((m, idx) => {
                      const isHome = m.home === selectedPlayer.id;
                      const opponentId = isHome ? m.away : m.home;
                      const opponent = players.find(p => p.id === opponentId);
                      
                      const myScore = m.played ? parseInt(isHome ? m.homeScore : m.awayScore) : 0;
                      const oppScore = m.played ? parseInt(isHome ? m.awayScore : m.homeScore) : 0;
                      
                      let resultClass = "border-gray-200 bg-gray-50";
                      let resultText = "";
                      let resultColor = "";
                      
                      if(m.played) {
                         if(myScore > oppScore) {
                           resultClass = "border-emerald-200 bg-emerald-50";
                           resultText = "WIN";
                           resultColor = "text-emerald-600";
                         }
                         else if(myScore < oppScore) {
                           resultClass = "border-red-200 bg-red-50";
                           resultText = "LOSS";
                           resultColor = "text-red-600";
                         }
                         else {
                           resultClass = "border-gray-300 bg-gray-100";
                           resultText = "DRAW";
                           resultColor = "text-gray-600";
                         }
                      }

                      return (
                         <div 
                           key={m.id} 
                           className={`flex items-center justify-between p-3 rounded-xl border ${resultClass} hover:shadow-md transition-all`}
                         >
                            {/* Left side - Round & Opponent */}
                            <div className="flex items-center gap-3 flex-1">
                               <div className="flex flex-col items-center">
                                 <span className="text-[9px] font-bold text-purple-600 uppercase">Hafta</span>
                                 <span className="text-sm font-black text-gray-900" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>#{m.round}</span>
                               </div>
                               
                               <div className="w-px h-8 bg-gray-200"></div>
                               
                               <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                 {opponent?.name.charAt(0) || '?'}
                               </div>
                               <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold text-gray-900 uppercase truncate" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{opponent?.name || 'Bilinmeyen'}</div>
                                  <div className="text-[9px] text-gray-500 font-medium">{isHome ? 'İç Saha' : 'Deplasman'}</div>
                               </div>
                            </div>
                            
                            {/* Right side - Score or VS */}
                            <div className="flex items-center gap-3">
                               {m.played ? (
                                 <>
                                   <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                     <span className={`font-black text-lg ${myScore > oppScore ? 'text-emerald-600' : myScore < oppScore ? 'text-red-500' : 'text-gray-600'}`} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                                       {isHome ? m.homeScore : m.awayScore}
                                     </span>
                                     <span className="text-gray-400 text-xs font-bold">—</span>
                                     <span className={`font-black text-lg ${oppScore > myScore ? 'text-emerald-600' : oppScore < myScore ? 'text-red-500' : 'text-gray-600'}`} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                                       {isHome ? m.awayScore : m.homeScore}
                                     </span>
                                   </div>
                                   <div className="flex flex-col items-center min-w-[45px]">
                                     <span className={`text-[10px] font-black ${resultColor} uppercase`} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{resultText}</span>
                                   </div>
                                 </>
                               ) : (
                                 <div className="bg-gray-100 px-4 py-1.5 rounded-lg border border-gray-200">
                                   <span className="text-gray-500 text-sm font-bold">VS</span>
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

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 pb-safe pt-1 z-40">
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
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 ${active ? 'text-purple-600' : 'text-gray-500'}`}>
    <Icon size={20} className={active ? 'drop-shadow-[0_0_8px_rgba(147,51,234,0.5)]' : ''} />
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

// ==========================================
// TEAM MODE VIEW (2v2)
// ==========================================
function TeamModeView({ settings, matches, teamSeriesStats, isAdmin, goBack, saveData, setMatches, updateChampionships, championships, tournamentId }) {
  const [activeMatchInput, setActiveMatchInput] = useState(null);
  const [tempHomeScore, setTempHomeScore] = useState('');
  const [tempAwayScore, setTempAwayScore] = useState('');
  
  const teamA = settings.teamConfig.teamA;
  const teamB = settings.teamConfig.teamB;
  
  const handleAddMatch = async () => {
    const newMatch = {
      id: generateId(),
      home: 'teamA',
      away: 'teamB',
      homeScore: 0,
      awayScore: 0,
      played: false,
      round: matches.length + 1
    };
    
    const newMatches = [...matches, newMatch];
    setMatches(newMatches);
    await saveData({ players: [], matches: newMatches, settings });
  };
  
  const handleScoreSubmit = async (matchId) => {
    const hScore = tempHomeScore === '' ? 0 : parseInt(tempHomeScore);
    const aScore = tempAwayScore === '' ? 0 : parseInt(tempAwayScore);
    
    if (isNaN(hScore) || isNaN(aScore)) {
      alert('Lütfen geçerli skorlar girin!');
      return;
    }
    
    const updatedMatches = matches.map(m => 
      m.id === matchId 
        ? { ...m, homeScore: hScore, awayScore: aScore, played: true, updatedAt: new Date().toISOString() }
        : m
    );
    
    setMatches(updatedMatches);
    await saveData({ players: [], matches: updatedMatches, settings });
    
    setActiveMatchInput(null);
    setTempHomeScore('');
    setTempAwayScore('');
  };
  
  const handleDeleteMatch = async (matchId) => {
    const updatedMatches = matches.filter(m => m.id !== matchId);
    setMatches(updatedMatches);
    await saveData({ players: [], matches: updatedMatches, settings });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white font-sans pb-24">
      {/* HEADER */}
      <div className="bg-slate-900/95 backdrop-blur border-b border-slate-800 p-4 sticky top-0 z-30 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={goBack} className="p-2 -ml-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{settings.name || 'Takım Turnuvası'}</h1>
            <p className="text-[10px] text-purple-400 uppercase font-bold tracking-wider">
              {teamSeriesStats?.seriesWon ? 'Seri Tamamlandı' : 'Seri Devam Ediyor'}
            </p>
          </div>
          {isAdmin && <span className="text-[10px] bg-red-900/30 text-red-400 px-2 py-1 rounded border border-red-900/50">YÖNETİCİ</span>}
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* SERİ DURUMU - Dinamik Işıldama */}
        <div className={`border border-purple-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-fadeIn transition-all duration-1000 ${
          (() => {
            const teamAWins = teamSeriesStats?.teamAWins || 0;
            const teamBWins = teamSeriesStats?.teamBWins || 0;
            if (teamAWins > teamBWins) {
              return 'bg-gradient-to-br from-blue-900/50 via-blue-800/40 to-slate-900/60';
            } else if (teamBWins > teamAWins) {
              return 'bg-gradient-to-br from-red-900/50 via-red-800/40 to-slate-900/60';
            } else {
              return 'bg-gradient-to-br from-slate-900/50 via-slate-800/40 to-slate-900/60';
            }
          })()
        }`}>
          {/* Arkaplan Efektleri - Dinamik */}
          <div className={`absolute inset-0 animate-gradientShift transition-all duration-1000 ${
            (() => {
              const teamAWins = teamSeriesStats?.teamAWins || 0;
              const teamBWins = teamSeriesStats?.teamBWins || 0;
              if (teamAWins > teamBWins) {
                return 'bg-gradient-to-r from-blue-500/15 via-transparent to-blue-500/15';
              } else if (teamBWins > teamAWins) {
                return 'bg-gradient-to-r from-red-500/15 via-transparent to-red-500/15';
              } else {
                return 'bg-gradient-to-r from-slate-500/10 via-transparent to-slate-500/10';
              }
            })()
          }`}></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_70%)] animate-pulse"></div>
          
          {/* Partiücül Efekti */}
          <div className="absolute top-0 left-0 w-2 h-2 bg-purple-400 rounded-full animate-particle1"></div>
          <div className="absolute top-10 right-20 w-1.5 h-1.5 bg-blue-400 rounded-full animate-particle2"></div>
          <div className="absolute bottom-20 left-10 w-1 h-1 bg-pink-400 rounded-full animate-particle3"></div>
          
          <div className="relative z-10">
            {/* Başlık */}
            <div className="text-center mb-6">
              <h2 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-1 animate-pulse">Seri Durumu</h2>
              <p className="text-xs text-slate-400">
                {teamSeriesStats?.extended ? 'Uzatma (ilk 6 galibiyet kazanır)' : 'İlk 5 Galibiyet Kazanır'}
              </p>
            </div>
            
            {/* Takımlar ve Skorlar */}
            <div className="flex items-end justify-center gap-3 mb-6 px-2">
              {/* TAKIM A - Mavi */}
              <div className="flex flex-col items-center animate-slideInLeft">
                <div className="bg-blue-500/20 border-2 border-blue-500/40 rounded-lg px-3 py-1.5 mb-2">
                  <h3 className="text-[11px] font-black text-blue-300 uppercase text-center flex items-center gap-1 whitespace-nowrap">
                    <span>{teamA.players[0]}</span>
                    <span className="text-blue-500/60 font-light">|</span>
                    <span>{teamA.players[1]}</span>
                  </h3>
                </div>
                <div className="text-center animate-scaleIn">
                  <div className={`text-3xl font-black text-white w-14 h-14 rounded-lg flex items-center justify-center shadow-xl border-2 animate-glowPulseBlue relative overflow-hidden ${
                    (teamSeriesStats?.teamAWins || 0) > (teamSeriesStats?.teamBWins || 0) 
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-400/40' 
                      : (teamSeriesStats?.teamAWins || 0) === (teamSeriesStats?.teamBWins || 0)
                      ? 'bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400/40'
                      : 'bg-gradient-to-br from-red-500 to-red-700 border-red-400/40'
                  }`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent animate-shine"></div>
                    <span className="relative z-10">{teamSeriesStats?.teamAWins || 0}</span>
                  </div>
                  <div className="flex justify-center gap-0.5 mt-1.5">
                    {[...Array(teamSeriesStats?.totalGames || 5)].map((_, i) => (
                      <Trophy 
                        key={i} 
                        size={7} 
                        className={i < (teamSeriesStats?.teamAWins || 0) ? 'text-yellow-400 fill-yellow-400 animate-bounce' : 'text-slate-700'}
                        style={{ animationDelay: `${i * 100}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* AYIRICI */}
              <div className="text-xl font-black text-purple-400 animate-pulse pb-12">-</div>
              
              {/* TAKIM B - Kırmızı */}
              <div className="flex flex-col items-center animate-slideInRight">
                <div className="bg-red-500/20 border-2 border-red-500/40 rounded-lg px-3 py-1.5 mb-2">
                  <h3 className="text-[11px] font-black text-red-300 uppercase text-center flex items-center gap-1 whitespace-nowrap">
                    <span>{teamB.players[0]}</span>
                    <span className="text-red-500/60 font-light">|</span>
                    <span>{teamB.players[1]}</span>
                  </h3>
                </div>
                <div className="text-center animate-scaleIn" style={{ animationDelay: '200ms' }}>
                  <div className={`text-3xl font-black text-white w-14 h-14 rounded-lg flex items-center justify-center shadow-xl border-2 animate-glowPulseRed relative overflow-hidden ${
                    (teamSeriesStats?.teamBWins || 0) > (teamSeriesStats?.teamAWins || 0) 
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-400/40' 
                      : (teamSeriesStats?.teamAWins || 0) === (teamSeriesStats?.teamBWins || 0)
                      ? 'bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400/40'
                      : 'bg-gradient-to-br from-red-500 to-red-700 border-red-400/40'
                  }`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent animate-shine" style={{ animationDelay: '1s' }}></div>
                    <span className="relative z-10">{teamSeriesStats?.teamBWins || 0}</span>
                  </div>
                  <div className="flex justify-center gap-0.5 mt-1.5">
                    {[...Array(teamSeriesStats?.totalGames || 5)].map((_, i) => (
                      <Trophy 
                        key={i} 
                        size={7} 
                        className={i < (teamSeriesStats?.teamBWins || 0) ? 'text-yellow-400 fill-yellow-400 animate-bounce' : 'text-slate-700'}
                        style={{ animationDelay: `${i * 100 + 50}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* İstatistikler - Oyun Tarzı */}
            <div className="mt-4 px-4">
              {/* Takım İstatistikleri */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                {/* Takım A İstatistikleri */}
                <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-500/30 rounded-lg p-2">
                  <div className="text-center">
                    <div className="text-[9px] text-blue-300 uppercase tracking-wide mb-1 font-bold">Ort. Gol</div>
                    <div className="text-xl font-black text-blue-400">{(() => {
                      const playedMatches = matches.filter(m => m.played);
                      if (playedMatches.length === 0) return '0.0';
                      const totalGoals = playedMatches.reduce((sum, m) => sum + parseInt(m.homeScore || 0), 0);
                      return (totalGoals / playedMatches.length).toFixed(1);
                    })()}</div>
                  </div>
                </div>
                
                {/* Beraberlik - Ortada */}
                <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-500/30 rounded-lg p-2">
                  <div className="text-center">
                    <div className="text-[9px] text-yellow-300 uppercase tracking-wide mb-1 font-bold flex items-center justify-center gap-1">
                      <span>⚖️</span>
                      <span>Berabere</span>
                    </div>
                    <div className="text-xl font-black text-yellow-400">{(() => {
                      let draws = 0;
                      matches.forEach(m => {
                        if (m.played && parseInt(m.homeScore) === parseInt(m.awayScore)) draws++;
                      });
                      return draws;
                    })()}</div>
                  </div>
                </div>
                
                {/* Takım B İstatistikleri */}
                <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-500/30 rounded-lg p-2">
                  <div className="text-center">
                    <div className="text-[9px] text-red-300 uppercase tracking-wide mb-1 font-bold">Ort. Gol</div>
                    <div className="text-xl font-black text-red-400">{(() => {
                      const playedMatches = matches.filter(m => m.played);
                      if (playedMatches.length === 0) return '0.0';
                      const totalGoals = playedMatches.reduce((sum, m) => sum + parseInt(m.awayScore || 0), 0);
                      return (totalGoals / playedMatches.length).toFixed(1);
                    })()}</div>
                  </div>
                </div>
              </div>
              
              {/* Toplam Maç - Minimal */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-full px-3 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-slate-300">{matches.filter(m => m.played).length} Maç Oynandı</span>
                </div>
              </div>
            </div>
            
            {/* Kazanan Bilgisi */}
            {teamSeriesStats?.seriesWon && (
              <div className="mt-6 text-center animate-winnerReveal">
                <div className="inline-block bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 px-6 py-3 rounded-xl shadow-2xl animate-bounceWinner relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmerFast"></div>
                  <div className="flex items-center gap-2 relative z-10">
                    <Trophy size={20} className="text-white animate-spin" style={{ animationDuration: '2s' }} />
                    <span className="text-lg font-black text-white uppercase">
                      {teamSeriesStats.winner === 'teamA' ? teamA.name : teamB.name} KAZANDI!
                    </span>
                    <Sparkles size={20} className="text-white animate-pulse" />
                  </div>
                </div>
                {/* Uzat / Geri Al Butonları */}
                {isAdmin && (
                  <div className="mt-4 flex justify-center gap-2">
                    {!teamSeriesStats.extended ? (
                      <button
                        onClick={async () => {
                          const updatedSettings = {
                            ...settings,
                            teamConfig: {
                              ...settings.teamConfig,
                              extended: true
                            }
                          };
                          await saveData({ players: [], matches, settings: updatedSettings });
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                      >
                        <Plus size={16} /> Uzat (6'ya kadar)
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          const updatedSettings = {
                            ...settings,
                            teamConfig: {
                              ...settings.teamConfig,
                              extended: false
                            }
                          };
                          await saveData({ players: [], matches, settings: updatedSettings });
                        }}
                        className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                      >
                        <X size={16} /> Uzatmayı Geri Al
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* MAÇ GEÇMİŞİ */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Maç Geçmişi</h3>
            {isAdmin && !teamSeriesStats?.seriesWon && (
              <button 
                onClick={handleAddMatch}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
              >
                <Plus size={16} /> Yeni Maç
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {matches.length === 0 ? (
              <div className="text-center py-8 text-slate-500">Henüz maç eklenmedi</div>
            ) : (
              matches.slice().reverse().map((match, idx) => {
                const isEditMode = activeMatchInput === match.id;
                const homeWon = match.played && parseInt(match.homeScore) > parseInt(match.awayScore);
                const awayWon = match.played && parseInt(match.awayScore) > parseInt(match.homeScore);
                
                return (
                  <div 
                    key={match.id}
                    className={`bg-slate-800/50 border rounded-xl overflow-hidden ${
                      match.played 
                        ? 'border-slate-700' 
                        : 'border-yellow-500/30 bg-yellow-900/10'
                    }`}
                  >
                    {/* Maç Başlığı */}
                    <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-700/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                          <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Maç #{match.round}</span>
                        </div>
                        {!match.played && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse"></div>
                            <span className="text-[10px] text-yellow-400 font-semibold">Bekliyor</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Maç İçeriği */}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                      
                      {/* Skor veya Giriş */}
                      <div className="flex-1 flex items-center justify-center gap-4">
                        {isEditMode ? (
                          <div className="flex flex-col gap-3 w-full max-w-xs">
                            {/* Home Team Score */}
                            <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-500/30 rounded-lg p-2">
                              <div className="flex-1 text-xs text-blue-300 font-bold">{teamA.name}</div>
                              <select 
                                value={tempHomeScore}
                                onChange={(e) => setTempHomeScore(e.target.value)}
                                className="w-16 bg-slate-950 border border-blue-500 rounded-lg p-2 text-center text-white font-bold focus:border-blue-400 outline-none"
                              >
                                <option value="">-</option>
                                {[...Array(14)].map((_, i) => (
                                  <option key={i} value={i}>{i}</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Away Team Score */}
                            <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/30 rounded-lg p-2">
                              <div className="flex-1 text-xs text-red-300 font-bold">{teamB.name}</div>
                              <select 
                                value={tempAwayScore}
                                onChange={(e) => setTempAwayScore(e.target.value)}
                                className="w-16 bg-slate-950 border border-red-500 rounded-lg p-2 text-center text-white font-bold focus:border-red-400 outline-none"
                              >
                                <option value="">-</option>
                                {[...Array(14)].map((_, i) => (
                                  <option key={i} value={i}>{i}</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Butonlar */}
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleScoreSubmit(match.id)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-bold"
                              >
                                <Check size={16} className="inline" /> Kaydet
                              </button>
                              <button 
                                onClick={() => {
                                  setActiveMatchInput(null);
                                  setTempHomeScore('');
                                  setTempAwayScore('');
                                }}
                                className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            {/* Takım A - Sol (Mavi) */}
                            <div className={`text-center ${ homeWon ? 'scale-105' : '' } transition-transform`}>
                              <div className="px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 mb-1.5">
                                <div className="text-[10px] text-blue-300 font-bold uppercase tracking-wide">{teamA.name}</div>
                              </div>
                              <div className={`text-2xl font-bold rounded-lg px-3 py-1 ${
                                homeWon ? 'text-emerald-400 bg-emerald-500/10' : awayWon ? 'text-slate-600' : 'text-white bg-slate-700/30'
                              }`}>
                                {match.played ? match.homeScore : '-'}
                              </div>
                            </div>
                            
                            <div className="text-lg font-bold text-slate-600">vs</div>
                            
                            {/* Takım B - Sağ (Kırmızı) */}
                            <div className={`text-center ${ awayWon ? 'scale-105' : '' } transition-transform`}>
                              <div className="px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/30 mb-1.5">
                                <div className="text-[10px] text-red-300 font-bold uppercase tracking-wide">{teamB.name}</div>
                              </div>
                              <div className={`text-2xl font-bold rounded-lg px-3 py-1 ${
                                awayWon ? 'text-emerald-400 bg-emerald-500/10' : homeWon ? 'text-slate-600' : 'text-white bg-slate-700/30'
                              }`}>
                                {match.played ? match.awayScore : '-'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Admin Butonları */}
                      <div className="flex gap-2">
                        {isAdmin && !match.played && !isEditMode && (
                          <button 
                            onClick={() => {
                              setActiveMatchInput(match.id);
                              setTempHomeScore('');
                              setTempAwayScore('');
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-bold"
                          >
                            Skor Gir
                          </button>
                        )}
                        {isAdmin && (
                          <button 
                            onClick={() => handleDeleteMatch(match.id)}
                            className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 rounded-lg transition-colors"
                            title="Maçı Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Kazanan Göstergesi */}
                    {match.played && (
                      <div className="mt-3 text-center">
                        {homeWon || awayWon ? (
                          <div className={`inline-block px-4 py-1 rounded-full text-xs font-bold ${
                            homeWon ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            {homeWon ? `${teamA.name} KAZANDI` : `${teamB.name} KAZANDI`}
                          </div>
                        ) : (
                          <div className="inline-block px-4 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                            BERABERİKLİK
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        
        /* Animasyonlar */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        @keyframes shimmerFast {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        
        @keyframes shine {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
        
        @keyframes glowPulseBlue {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.5); }
        }
        
        @keyframes glowPulseRed {
          0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.8), 0 0 60px rgba(239, 68, 68, 0.5); }
        }
        
        @keyframes glow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }
        
        @keyframes gradientShift {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        @keyframes particle1 {
          0% { transform: translate(0, 0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(100vw, 50vh) scale(0.5); opacity: 0; }
        }
        
        @keyframes particle2 {
          0% { transform: translate(0, 0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(-80vw, 60vh) scale(0.3); opacity: 0; }
        }
        
        @keyframes particle3 {
          0% { transform: translate(0, 0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(50vw, -40vh) scale(0.7); opacity: 0; }
        }
        
        @keyframes winnerReveal {
          0% { opacity: 0; transform: scale(0) rotate(-10deg); }
          50% { transform: scale(1.1) rotate(2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        
        @keyframes bounceWinner {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-15px); }
          50% { transform: translateY(0); }
          75% { transform: translateY(-8px); }
        }
        
        .animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slideInLeft { animation: slideInLeft 0.8s ease-out; }
        .animate-slideInRight { animation: slideInRight 0.8s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.5s ease-out; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-shimmer { 
          background-size: 200% auto;
          animation: shimmer 3s linear infinite; 
        }
        .animate-shimmerFast { animation: shimmerFast 2s linear infinite; }
        .animate-shine { animation: shine 3s ease-in-out infinite; }
        .animate-glowPulseBlue { animation: glowPulseBlue 2s ease-in-out infinite; }
        .animate-glowPulseRed { animation: glowPulseRed 2s ease-in-out infinite; }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
        .animate-gradientShift { animation: gradientShift 4s ease-in-out infinite; }
        .animate-particle1 { animation: particle1 8s ease-in-out infinite; }
        .animate-particle2 { animation: particle2 10s ease-in-out infinite 2s; }
        .animate-particle3 { animation: particle3 7s ease-in-out infinite 1s; }
        .animate-winnerReveal { animation: winnerReveal 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
        .animate-bounceWinner { animation: bounceWinner 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}