import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Home, UserPlus, Search, Languages, Users, Activity, Calendar, ArrowRight } from 'lucide-react';
import DataEntry from './pages/DataEntry';
import CandidateSearch from './pages/CandidateSearch';
import ProfileView from './pages/ProfileView';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import './App.css';

function TopNavbar() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <nav className="top-navbar">
      <div className="nav-brand" style={{ gridColumn: 1, justifySelf: 'start', display: 'flex', alignItems: 'center' }}>
        <img src="/images/logo_transparent.png" alt="App Logo" style={{ height: '36px', objectFit: 'contain' }} />
      </div>
      <div className="nav-links-horizontal">
        <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} end><Home size={18} /> {t('dashboard')}</NavLink>
        <NavLink to="/add" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><UserPlus size={18} /> {t('newRegistration')}</NavLink>
        <NavLink to="/search" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Search size={18} /> {t('searchDatabase')}</NavLink>
      </div>
      <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          className="lang-toggle-btn"
          onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
        >
          <Languages size={16} /> {language === 'en' ? 'தமிழ்' : 'English'}
        </button>
      </div>
    </nav>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [stats, setStats] = useState({ total: 0, male: 0, female: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    // BUG-05: Wrap all DB calls in try/catch with user-visible error state
    const loadDashboard = async () => {
      try {
        const rows: any[] = await window.api.db.all(
          'SELECT gender, COUNT(*) as count FROM candidates GROUP BY gender', []
        );
        let total = 0, male = 0, female = 0;
        rows.forEach(r => {
          total += r.count;
          if (r.gender === 'Male') male = r.count;
          if (r.gender === 'Female') female = r.count;
        });
        setStats({ total, male, female });

        const recentRows: any[] = await window.api.db.all(
          'SELECT id, registrationId, fullName, gender, dob, createdAt FROM candidates ORDER BY id DESC LIMIT 5', []
        );
        setRecent(recentRows);
      } catch (err: any) {
        console.error('[Dashboard] DB load failed:', err);
        setDbError('Could not load data. The database may be initializing — please restart the app.');
      }
    };
    loadDashboard();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning') || 'Good Morning';
    if (hour < 18) return t('goodAfternoon') || 'Good Afternoon';
    return t('goodEvening') || 'Good Evening';
  };

  return (
    <div className="dashboard-home page-transition">
      {/* BUG-05: Show error banner when DB load fails (e.g. first Windows install) */}
      {dbError && (
        <div style={{ backgroundColor: '#fed7d7', color: '#c53030', padding: '12px 20px', borderRadius: '8px', marginBottom: '20px', fontWeight: 500 }}>
          ⚠️ {dbError}
        </div>
      )}
      <div className="dashboard-hero" style={{ minHeight: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', margin: '40px 0' }}>
        <img src="/images/logo_transparent.png" alt="Kattam Matrimony" className="dashboard-logo" style={{ height: '220px', objectFit: 'contain', marginBottom: '24px' }} />
        <h1 className="dashboard-welcome" style={{ fontSize: '2.5rem', margin: 0 }}>{getGreeting()}!</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginTop: '8px' }}>{t('welcome')}</p>
      </div>

      <div className="dashboard-actions-row">
        <div className="card action-card-lg" onClick={() => navigate('/add')}>
          <div className="card-icon"><UserPlus size={40} /></div>
          <div className="card-text">
            <h3>{t('newRegistration')}</h3>
            <p>{t('addProfile')}</p>
          </div>
          <ArrowRight className="card-arrow" size={24} />
        </div>
        <div className="card action-card-lg" onClick={() => navigate('/search')}>
          <div className="card-icon"><Search size={40} /></div>
          <div className="card-text">
            <h3>{t('searchDatabase')}</h3>
            <p>{t('findRecords')}</p>
          </div>
          <ArrowRight className="card-arrow" size={24} />
        </div>
      </div>

      <div className="dashboard-main-split">
        <div className="dashboard-sidebar-stats">
          <div className="stat-card">
            <div className="stat-icon-wrapper"><Users size={24} /></div>
            <div className="stat-info">
              <h4>{t('totalProfiles')}</h4>
              <div className="stat-value">{stats.total}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ color: '#5B7A5E', backgroundColor: 'rgba(91, 122, 94, 0.1)' }}><Activity size={24} /></div>
            <div className="stat-info">
              <h4>{t('maleCandidates')}</h4>
              <div className="stat-value">{stats.male}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ color: '#C08A3E', backgroundColor: 'rgba(192, 138, 62, 0.1)' }}><Activity size={24} /></div>
            <div className="stat-info">
              <h4>{t('femaleCandidates')}</h4>
              <div className="stat-value">{stats.female}</div>
            </div>
          </div>
        </div>

        <div className="dashboard-recent-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <h3 className="section-title" style={{ margin: 0 }}>{t('recentlyAdded')}</h3>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 'var(--text-xs)' }} onClick={() => navigate('/search')}>{t('viewAll')}</button>
          </div>
          {recent.length === 0 ? (
            <div className="empty-state">
              <Calendar size={48} className="empty-icon" />
              <p>{t('noProfiles')}</p>
            </div>
          ) : (
            <div className="recent-list">
              {recent.map((candidate) => (
                <div key={candidate.id} className="recent-item" onClick={() => navigate(`/profile/${candidate.id}`)}>
                  <div className="recent-avatar">
                    {candidate.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="recent-details">
                    <div className="recent-name">{candidate.fullName}</div>
                    <div className="recent-meta">{candidate.registrationId || `TMM-${candidate.id}`} • {t(candidate.gender?.toLowerCase() as any) || candidate.gender} • {candidate.dob}</div>
                  </div>
                  <ArrowRight size={16} className="recent-arrow" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <TopNavbar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add" element={<DataEntry />} />
            <Route path="/edit/:id" element={<DataEntry />} />
            <Route path="/search" element={<CandidateSearch />} />
            <Route path="/profile/:id" element={<ProfileView />} />
          </Routes>
        </Layout>
      </Router>
    </LanguageProvider>
  );
}
