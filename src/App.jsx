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
// Bu değerleri kendi Firebase konfigürasyonunuzla değiştirmeniz gerekiyor
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
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
        // Özel token ile giriş (varsa)
        // __initial_auth_token global değişkenini kontrol ediyoruz
        if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
          await signInWithCustomToken(auth, window.__initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase Auth Error:", error);
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
    }, (err) => { console.error("Registry err:", err); setLoading(false); });
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
    }, (err) => { console.error("Data err:", err); setLoading(false); });
    return () => unsub();
  }, [user, activeTournamentId]);

  // --- Actions ---
  const createTournament = async (name) => {
    if (!isAdmin) return;
    try {
        const newId = generateId();
        const newMeta = { id: newId, name: name || 'Yeni Turnuva', createdAt: new Date().toISOString(), status: 'Hazırlık' };
        const newRegistry = [newMeta, ...registry];
        
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'organization', 'registry'), { list: newRegistry });
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tournaments', `t_${newId}`), {
          players: [], matches: [], settings: { started: false, name: name }
        });
        console.log(`Tournament ${name} created successfully.`);
    } catch (e) {
        console.error("Error creating tournament:", e);
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
        console.error("Error deleting tournament:", e);
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
        console.error("Error renaming tournament:", e);
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
             console.error("Error saving tournament data:", e);
          }
        }}
        updateStatus={async (status) => {
          try {
             const newRegistry = registry.map(t => t.id === activeTournamentId ? {...t, status} : t);
             await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'organization', 'registry'), { list: newRegistry });
          } catch (e) {
             console.error("Error updating tournament status:", e);
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
              <button 
                onClick={() => setShowCreate(true)} 
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-medium transition-colors"
              >
                <Plus size={20} />
                Yeni Turnuva Oluştur
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Turnuva Adı"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  onKeyPress={(e) => e.key === 'Enter' && createTournament(newName)}
                />
                <button 
                  onClick={() => {
                    createTournament(newName);
                    setNewName('');
                    setShowCreate(false);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 p-3 rounded-xl text-white"
                >
                  <Plus size={20} />
                </button>
                <button 
                  onClick={() => {
                    setShowCreate(false);
                    setNewName('');
                  }}
                  className="bg-slate-800 hover:bg-slate-700 p-3 rounded-xl text-slate-300"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="animate-spin text-slate-500" />
            </div>
          ) : registry.length > 0 ? (
            registry.map((tournament) => (
              <div 
                key={tournament.id} 
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors cursor-pointer"
                onClick={() => onSelect(tournament.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Trophy className="text-amber-500" size={18} />
                      {tournament.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(tournament.createdAt)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        tournament.status === 'Hazırlık' ? 'bg-blue-500/20 text-blue-400' :
                        tournament.status === 'Aktif' ? 'bg-green-500/20 text-green-400' :
                        tournament.status === 'Tamamlandı' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {tournament.status}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(tournament.id, tournament.name);
                      }}
                      className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Gamepad2 className="mx-auto text-slate-600 mb-3" size={48} />
              <p className="text-slate-500">Henüz turnuva oluşturulmadı</p>
              {isAdmin && (
                <button 
                  onClick={() => setShowCreate(true)} 
                  className="mt-4 text-emerald-500 hover:text-emerald-400 flex items-center justify-center gap-1 mx-auto"
                >
                  <Plus size={16} />
                  İlk turnuvanı oluştur
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TOURNAMENT VIEW
// ==========================================
function TournamentView({ data, tournamentId, isAdmin, goBack, saveData, updateStatus, onRename, onDelete, openConfirmModal }) {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [settings, setSettings] = useState({});
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  // Local state sync with props
  useEffect(() => {
    if (data) {
      setPlayers(data.players || []);
      setMatches(data.matches || []);
      setSettings(data.settings || {});
      setNewName(data.settings?.name || '');
    }
  }, [data]);

  // Save when local state changes
  useEffect(() => {
    if (data) {
      const newData = { players, matches, settings };
      saveData(newData);
    }
  }, [players, matches, settings]);

  const addPlayer = (name) => {
    if (!name.trim() || !isAdmin) return;
    const newPlayer = {
      id: generateId(),
      name: name.trim(),
      wins: 0,
      losses: 0,
      draws: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    };
    setPlayers([...players, newPlayer]);
  };

  const removePlayer = (id) => {
    if (!isAdmin) return;
    setPlayers(players.filter(p => p.id !== id));
    
    // Remove matches for this player
    setMatches(matches.filter(m => m.player1Id !== id && m.player2Id !== id));
  };

  const updatePlayerStats = (playerId, stats) => {
    if (!isAdmin) return;
    setPlayers(players.map(p => 
      p.id === playerId ? { ...p, ...stats } : p
    ));
  };

  const addMatch = () => {
    if (!isAdmin || players.length < 2) return;
    const newMatch = {
      id: generateId(),
      player1Id: players[0].id,
      player2Id: players[1].id,
      player1Score: 0,
      player2Score: 0,
      played: false,
      date: new Date().toISOString()
    };
    setMatches([...matches, newMatch]);
  };

  const updateMatch = (matchId, updates) => {
    if (!isAdmin) return;
    setMatches(matches.map(m => 
      m.id === matchId ? { ...m, ...updates } : m
    ));
  };

  const deleteMatch = (matchId) => {
    if (!isAdmin) return;
    setMatches(matches.filter(m => m.id !== matchId));
  };

  const calculateStandings = useMemo(() => {
    return [...players].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const goalDiffA = a.goalsFor - a.goalsAgainst;
      const goalDiffB = b.goalsFor - b.goalsAgainst;
      if (goalDiffB !== goalDiffA) return goalDiffB - goalDiffA;
      return b.goalsFor - a.goalsFor;
    });
  }, [players]);

  const getPlayerById = (id) => players.find(p => p.id === id);

  const handleStartTournament = () => {
    if (!isAdmin) return;
    setSettings({...settings, started: true});
    updateStatus('Aktif');
  };

  const handleFinishTournament = () => {
    if (!isAdmin) return;
    setSettings({...settings, started: false});
    updateStatus('Tamamlandı');
  };

  const handleResetTournament = () => {
    if (!isAdmin) return;
    openConfirmModal(
      'Turnuvayı Sıfırla',
      'Tüm maç sonuçlarını ve oyuncu istatistiklerini sıfırlamak istediğinizden emin misiniz?',
      () => {
        setPlayers(players.map(p => ({
          ...p,
          wins: 0,
          losses: 0,
          draws: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0
        })));
        setMatches(matches.map(m => ({
          ...m,
          player1Score: 0,
          player2Score: 0,
          played: false
        })));
      }
    );
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <RefreshCw className="animate-spin text-slate-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 font-sans pb-safe">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={goBack}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-white"
                  onKeyPress={(e) => e.key === 'Enter' && onRename(newName)}
                />
                <button 
                  onClick={() => {
                    onRename(newName);
                    setEditingName(false);
                  }}
                  className="p-1 text-emerald-500"
                >
                  <Plus size={16} />
                </button>
                <button 
                  onClick={() => setEditingName(false)}
                  className="p-1 text-slate-500"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                {settings.name || 'Turnuva'}
                {isAdmin && (
                  <button 
                    onClick={() => setEditingName(true)}
                    className="p-1 text-slate-500 hover:text-slate-300"
                  >
                    <Edit3 size={16} />
                  </button>
                )}
              </h1>
            )}
            
            <div className="flex items-center gap-4 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs ${
                settings.started ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {settings.started ? 'Aktif' : 'Hazırlık'}
              </span>
              
              {isAdmin && (
                <button 
                  onClick={settings.started ? handleFinishTournament : handleStartTournament}
                  className={`text-xs px-2 py-1 rounded ${
                    settings.started 
                      ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' 
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {settings.started ? 'Bitir' : 'Başlat'}
                </button>
              )}
            </div>
          </div>
          
          {isAdmin && (
            <button 
              onClick={onDelete}
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="mb-6 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Settings size={18} />
                Yönetici Kontrolleri
              </h3>
              <button 
                onClick={handleResetTournament}
                className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-slate-300"
              >
                Sıfırla
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Add Player */}
              <AddPlayerForm onAdd={addPlayer} />
              
              {/* Add Match */}
              <AddMatchForm 
                players={players} 
                onAdd={addMatch} 
                disabled={players.length < 2}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Standings */}
          <div className="lg:col-span-2">
            <StandingsTable 
              players={calculateStandings} 
              isAdmin={isAdmin}
              onRemove={removePlayer}
            />
          </div>
          
          {/* Matches */}
          <div>
            <MatchesList 
              matches={matches}
              players={players}
              isAdmin={isAdmin}
              onUpdate={updateMatch}
              onDelete={deleteMatch}
              getPlayerById={getPlayerById}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTS
// ==========================================
function AddPlayerForm({ onAdd }) {
  const [name, setName] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name);
      setName('');
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Oyuncu Adı"
        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <button 
        type="submit"
        className="bg-emerald-600 hover:bg-emerald-700 p-2 rounded-lg text-white"
      >
        <Plus size={18} />
      </button>
    </form>
  );
}

function AddMatchForm({ players, onAdd, disabled }) {
  return (
    <div className="flex gap-2">
      <button 
        onClick={onAdd}
        disabled={disabled}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-colors ${
          disabled 
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
        }`}
      >
        <PlayCircle size={18} />
        Maç Ekle
      </button>
    </div>
  );
}

function StandingsTable({ players, isAdmin, onRemove }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Trophy className="text-amber-500" size={18} />
          Puan Durumu
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800/50 text-slate-400 text-xs">
            <tr>
              <th className="p-3 text-left">Oyuncu</th>
              <th className="p-3 text-center">O</th>
              <th className="p-3 text-center">G</th>
              <th className="p-3 text-center">B</th>
              <th className="p-3 text-center">M</th>
              <th className="p-3 text-center">A</th>
              <th className="p-3 text-center">Y</th>
              <th className="p-3 text-center">P</th>
              {isAdmin && <th className="p-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {players.map((player, index) => (
              <tr key={player.id} className="hover:bg-slate-800/30">
                <td className="p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-4">#{index + 1}</span>
                    <span className="text-white">{player.name}</span>
                  </div>
                </td>
                <td className="p-3 text-center text-sm">{player.wins + player.draws + player.losses}</td>
                <td className="p-3 text-center text-sm">{player.wins}</td>
                <td className="p-3 text-center text-sm">{player.draws}</td>
                <td className="p-3 text-center text-sm">{player.losses}</td>
                <td className="p-3 text-center text-sm">{player.goalsFor}</td>
                <td className="p-3 text-center text-sm">{player.goalsAgainst}</td>
                <td className="p-3 text-center font-semibold">{player.points}</td>
                {isAdmin && (
                  <td className="p-3 text-center">
                    <button 
                      onClick={() => onRemove(player.id)}
                      className="p-1 text-slate-500 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchesList({ matches, players, isAdmin, onUpdate, onDelete, getPlayerById }) {
  const sortedMatches = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Calendar className="text-emerald-500" size={18} />
          Maçlar
        </h3>
      </div>
      
      <div className="divide-y divide-slate-800">
        {sortedMatches.length > 0 ? (
          sortedMatches.map(match => (
            <MatchItem 
              key={match.id}
              match={match}
              player1={getPlayerById(match.player1Id)}
              player2={getPlayerById(match.player2Id)}
              isAdmin={isAdmin}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))
        ) : (
          <div className="p-8 text-center text-slate-500">
            <PlayCircle className="mx-auto mb-2" size={24} />
            <p>Henüz maç eklenmedi</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchItem({ match, player1, player2, isAdmin, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [score1, setScore1] = useState(match.player1Score || 0);
  const [score2, setScore2] = useState(match.player2Score || 0);
  
  const handleSave = () => {
    const player1Score = parseInt(score1) || 0;
    const player2Score = parseInt(score2) || 0;
    
    // Calculate points based on score
    let player1Points = 0;
    let player2Points = 0;
    
    if (player1Score > player2Score) {
      player1Points = 3;
    } else if (player1Score < player2Score) {
      player2Points = 3;
    } else {
      player1Points = 1;
      player2Points = 1;
    }
    
    onUpdate(match.id, {
      player1Score,
      player2Score,
      played: true,
      player1Points,
      player2Points
    });
    
    setEditing(false);
  };
  
  const getResultClass = (playerScore, opponentScore) => {
    if (playerScore > opponentScore) return 'text-green-500';
    if (playerScore < opponentScore) return 'text-red-500';
    return 'text-yellow-500';
  };
  
  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-white truncate">
                {player1?.name || 'Bilinmeyen Oyuncu'}
              </span>
              {match.played && (
                <span className={`text-xs ${getResultClass(match.player1Score, match.player2Score)}`}>
                  ({match.player1Score})
                </span>
              )}
            </div>
            
            <span className="mx-2 text-slate-500">vs</span>
            
            <div className="flex items-center gap-2 min-w-0 justify-end">
              {match.played && (
                <span className={`text-xs ${getResultClass(match.player2Score, match.player1Score)}`}>
                  ({match.player2Score})
                </span>
              )}
              <span className="text-sm font-medium text-white truncate">
                {player2?.name || 'Bilinmeyen Oyuncu'}
              </span>
            </div>
          </div>
          
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-white"
                min="0"
              />
              <span className="text-slate-500">-</span>
              <input
                type="number"
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-white"
                min="0"
              />
            </div>
          ) : match.played ? (
            <div className="text-xs text-slate-400">
              {formatDate(match.date)}
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              Beklemede
            </div>
          )}
        </div>
        
        {isAdmin && (
          <div className="flex items-center gap-1 ml-3">
            {editing ? (
              <>
                <button 
                  onClick={handleSave}
                  className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                >
                  <Plus size={16} />
                </button>
                <button 
                  onClick={() => setEditing(false)}
                  className="p-1 text-slate-500 hover:bg-slate-700 rounded"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setEditing(true)}
                  className="p-1 text-slate-500 hover:bg-slate-700 rounded"
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={() => onDelete(match.id)}
                  className="p-1 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}