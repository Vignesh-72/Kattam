import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Edit, Eye, Trash2, ChevronLeft, ChevronRight, Filter, RefreshCw } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface SearchOptions {
  castes: string[];
  subCastes: string[];
  stars: string[];
  raasis: string[];
  qualifications: string[];
  occupations: string[];
}

const FALLBACK_STARS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshta",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

const FALLBACK_RAASIS = [
  "Mesham", "Rishabham", "Mithunam", "Kadagam", "Simmam", "Kanni",
  "Thulaam", "Viruchigam", "Dhanusu", "Makaramm", "Kumbam", "Meenam"
];

const initialFilterState = {
  gender: '',
  caste: '',
  subCaste: '',
  star: '',
  raasi: '',
  maritalStatus: '',
  qualification: '',
  occupation: '',
  minAge: '',
  maxAge: '',
};

export default function CandidateSearch() {
  const [searchMode, setSearchMode] = useState<'standard' | 'advanced'>('standard');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState(initialFilterState);
  const [activeFilters, setActiveFilters] = useState(initialFilterState);
  
  const [dbOptions, setDbOptions] = useState<SearchOptions>({
    castes: [], subCastes: [], stars: [], raasis: [], qualifications: [], occupations: []
  });
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const PAGE_SIZE = 30;

  // Asynchronously fetch distinct values from SQLite database on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchFilterOptions() {
      try {
        let res = null;
        if (window.api?.getSearchFilterOptions) {
          res = await window.api.getSearchFilterOptions();
        } else if (window.api?.db?.getSearchOptions) {
          res = await window.api.db.getSearchOptions();
        }
        if (isMounted && res) {
          setDbOptions(res);
        }
      } catch (err) {
        console.error('[CandidateSearch] Error fetching distinct filter options:', err);
      }
    }
    fetchFilterOptions();
    return () => { isMounted = false; };
  }, []);

  // Memoized options with fallback for Stars/Raasis if DB is fresh
  const casteOptions = useMemo(() => dbOptions.castes || [], [dbOptions.castes]);
  const subCasteOptions = useMemo(() => dbOptions.subCastes || [], [dbOptions.subCastes]);
  const starOptions = useMemo(() => (dbOptions.stars && dbOptions.stars.length > 0 ? dbOptions.stars : FALLBACK_STARS), [dbOptions.stars]);
  const raasiOptions = useMemo(() => (dbOptions.raasis && dbOptions.raasis.length > 0 ? dbOptions.raasis : FALLBACK_RAASIS), [dbOptions.raasis]);
  const qualificationOptions = useMemo(() => dbOptions.qualifications || [], [dbOptions.qualifications]);
  const occupationOptions = useMemo(() => dbOptions.occupations || [], [dbOptions.occupations]);

  // Debounce for standard text search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      // Reset dependent subCaste if caste is cleared
      ...(key === 'caste' && !value ? { subCaste: '' } : {})
    }));
  };

  const handleApplyFilters = () => {
    setActiveFilters(filters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(initialFilterState);
    setActiveFilters(initialFilterState);
    setPage(1);
  };

  const loadCandidates = useCallback(async () => {
    const CARD_COLS = 'id, registrationId, fullName, gender, caste, contactNumber';
    let countQuery = 'SELECT COUNT(*) as count FROM candidates';
    let dataQuery = `SELECT ${CARD_COLS} FROM candidates`;
    const countParams: any[] = [];
    const dataParams: any[] = [];
    const whereConditions: string[] = [];

    if (searchMode === 'standard') {
      if (debouncedSearch) {
        const term = `%${debouncedSearch}%`;
        whereConditions.push('(registrationId LIKE ? OR fullName LIKE ? OR contactNumber LIKE ? OR caste LIKE ? OR subCaste LIKE ? OR birthPlace LIKE ? OR raasi LIKE ? OR star LIKE ? OR dob LIKE ? OR additionalInfo LIKE ?)');
        for (let i = 0; i < 10; i++) {
          countParams.push(term);
          dataParams.push(term);
        }
      }
    } else {
      // Advanced Multi-Criteria Filter Query Builder
      if (activeFilters.gender) {
        whereConditions.push('LOWER(gender) = LOWER(?)');
        countParams.push(activeFilters.gender);
        dataParams.push(activeFilters.gender);
      }
      if (activeFilters.caste) {
        whereConditions.push('caste = ?');
        countParams.push(activeFilters.caste);
        dataParams.push(activeFilters.caste);
      }
      if (activeFilters.subCaste) {
        whereConditions.push('subCaste = ?');
        countParams.push(activeFilters.subCaste);
        dataParams.push(activeFilters.subCaste);
      }
      if (activeFilters.star) {
        whereConditions.push('star = ?');
        countParams.push(activeFilters.star);
        dataParams.push(activeFilters.star);
      }
      if (activeFilters.raasi) {
        whereConditions.push('raasi = ?');
        countParams.push(activeFilters.raasi);
        dataParams.push(activeFilters.raasi);
      }
      if (activeFilters.maritalStatus) {
        whereConditions.push('maritalStatus = ?');
        countParams.push(activeFilters.maritalStatus);
        dataParams.push(activeFilters.maritalStatus);
      }
      if (activeFilters.qualification) {
        whereConditions.push('qualification = ?');
        countParams.push(activeFilters.qualification);
        dataParams.push(activeFilters.qualification);
      }
      if (activeFilters.occupation) {
        whereConditions.push('occupation = ?');
        countParams.push(activeFilters.occupation);
        dataParams.push(activeFilters.occupation);
      }
      if (activeFilters.minAge) {
        whereConditions.push("CAST((strftime('%Y', 'now') - strftime('%Y', dob)) AS INT) >= ?");
        const minA = parseInt(activeFilters.minAge, 10);
        countParams.push(minA);
        dataParams.push(minA);
      }
      if (activeFilters.maxAge) {
        whereConditions.push("CAST((strftime('%Y', 'now') - strftime('%Y', dob)) AS INT) <= ?");
        const maxA = parseInt(activeFilters.maxAge, 10);
        countParams.push(maxA);
        dataParams.push(maxA);
      }
    }

    if (whereConditions.length > 0) {
      const clause = ' WHERE ' + whereConditions.join(' AND ');
      countQuery += clause;
      dataQuery += clause;
    }

    dataQuery += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    dataParams.push(PAGE_SIZE, (page - 1) * PAGE_SIZE);

    try {
      const countResult = await window.api.db.get(countQuery, countParams);
      const total = countResult ? countResult.count : 0;
      setTotalCount(total);
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));

      const rows = await window.api.db.all(dataQuery, dataParams);
      setCandidates(rows || []);
    } catch (e) {
      console.error('[CandidateSearch] Query Execution Error:', e);
    }
  }, [searchMode, debouncedSearch, activeFilters, page]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleDelete = async (id: number) => {
    if (confirm(t('confirmDelete'))) {
      await window.api.db.run('DELETE FROM candidates WHERE id = ?', [id]);
      loadCandidates();
    }
  };

  return (
    <div className="form-container page-transition" style={{ marginBottom: '40px' }}>
      {/* Header & Dual Search Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{t('candidateDatabase')}</h2>
        
        {/* Dual Tab Toggle Controls */}
        <div style={{ display: 'inline-flex', backgroundColor: '#edf2f7', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className="btn"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              backgroundColor: searchMode === 'standard' ? '#ffffff' : 'transparent',
              color: searchMode === 'standard' ? 'var(--primary-color)' : 'var(--text-muted)',
              boxShadow: searchMode === 'standard' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
              border: 'none',
              transition: 'all 0.15s ease-out',
            }}
            onClick={() => setSearchMode('standard')}
          >
            <Search size={15} style={{ marginRight: '6px' }} />
            {t('standardSearch')}
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              backgroundColor: searchMode === 'advanced' ? '#ffffff' : 'transparent',
              color: searchMode === 'advanced' ? 'var(--primary-color)' : 'var(--text-muted)',
              boxShadow: searchMode === 'advanced' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
              border: 'none',
              transition: 'all 0.15s ease-out',
            }}
            onClick={() => setSearchMode('advanced')}
          >
            <Filter size={15} style={{ marginRight: '6px' }} />
            {t('advancedSearch')}
          </button>
        </div>
      </div>

      {/* Tab 1: Standard Quick Search Bar */}
      {searchMode === 'standard' && (
        <div style={{ marginBottom: '28px', backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder={t('searchPlaceholder') || "Search by ID, Name, Phone, Caste, Raasi..."}
              style={{ paddingLeft: '42px', width: '100%' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            <strong>Quick Search:</strong> Type ID, Name, Phone, Caste, Sub-Caste, Star, Raasi, or DOB.
          </div>
        </div>
      )}

      {/* Tab 2: Advanced Multi-Filter Grid Panel */}
      {searchMode === 'advanced' && (
        <div style={{ marginBottom: '28px', backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            
            {/* Gender */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('gender')}</label>
              <select className="form-control" value={filters.gender} onChange={e => handleFilterChange('gender', e.target.value)}>
                <option value="">{t('allGenders')}</option>
                <option value="Male">{t('male')}</option>
                <option value="Female">{t('female')}</option>
              </select>
            </div>

            {/* Caste - Dynamically Populated from DB */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('caste')}</label>
              <select className="form-control" value={filters.caste} onChange={e => handleFilterChange('caste', e.target.value)}>
                <option value="">{t('allCastes')}</option>
                {casteOptions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Sub Caste - Dynamically Populated from DB */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('subCaste')}</label>
              <select className="form-control" value={filters.subCaste} onChange={e => handleFilterChange('subCaste', e.target.value)}>
                <option value="">{t('allSubCastes')}</option>
                {subCasteOptions.map(sc => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>

            {/* Star - Dynamically Populated from DB */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('star')}</label>
              <select className="form-control" value={filters.star} onChange={e => handleFilterChange('star', e.target.value)}>
                <option value="">{t('allStars')}</option>
                {starOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Raasi - Dynamically Populated from DB */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('raasi')}</label>
              <select className="form-control" value={filters.raasi} onChange={e => handleFilterChange('raasi', e.target.value)}>
                <option value="">{t('allRaasis')}</option>
                {raasiOptions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Marital Status */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('maritalStatus')}</label>
              <select className="form-control" value={filters.maritalStatus} onChange={e => handleFilterChange('maritalStatus', e.target.value)}>
                <option value="">{t('select')}</option>
                <option value="Unmarried">{t('unmarried')}</option>
                <option value="Married">{t('married')}</option>
                <option value="Divorced">{t('divorced')}</option>
                <option value="Widowed">{t('widowed')}</option>
              </select>
            </div>

            {/* Qualification - Dynamically Populated from DB */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('qualification')}</label>
              <select className="form-control" value={filters.qualification} onChange={e => handleFilterChange('qualification', e.target.value)}>
                <option value="">{t('allQualifications')}</option>
                {qualificationOptions.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>

            {/* Occupation - Dynamically Populated from DB */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('occupation')}</label>
              <select className="form-control" value={filters.occupation} onChange={e => handleFilterChange('occupation', e.target.value)}>
                <option value="">{t('allOccupations')}</option>
                {occupationOptions.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* Min Age */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('minAge')}</label>
              <input
                type="number"
                className="form-control"
                placeholder="18"
                min="18"
                max="80"
                value={filters.minAge}
                onChange={e => handleFilterChange('minAge', e.target.value)}
              />
            </div>

            {/* Max Age */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('maxAge')}</label>
              <input
                type="number"
                className="form-control"
                placeholder="60"
                min="18"
                max="80"
                value={filters.maxAge}
                onChange={e => handleFilterChange('maxAge', e.target.value)}
              />
            </div>

          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 16px' }}
              onClick={handleResetFilters}
            >
              <RefreshCw size={15} style={{ marginRight: '6px' }} />
              {t('resetFilters')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '8px 24px', backgroundColor: 'var(--accent-gold)' }}
              onClick={handleApplyFilters}
            >
              <Filter size={15} style={{ marginRight: '6px' }} />
              {t('applyFilters')}
            </button>
          </div>
        </div>
      )}

      {/* Candidate Card Results Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {candidates.map(candidate => (
          <div
            key={candidate.id}
            style={{
              backgroundColor: 'var(--card-bg)',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
              cursor: 'default'
            }} 
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.06)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'var(--text-on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 'bold' }}>
                  {candidate.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 700, fontFamily: 'var(--font-sans)' }}>{candidate.fullName}</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', backgroundColor: 'rgba(122, 46, 46, 0.1)', padding: '4px 10px', borderRadius: '12px', display: 'inline-block', marginTop: '6px', fontWeight: 600 }}>
                    {candidate.registrationId || `TMM-${candidate.id}`}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <div><strong>{t('gender')}:</strong> <span style={{ color: 'var(--text-main)' }}>{candidate.gender ? (t(candidate.gender.toLowerCase() as any) || candidate.gender) : ''}</span></div>
              <div><strong>{t('caste')}:</strong> <span style={{ color: 'var(--text-main)' }}>{candidate.caste}</span></div>
              <div style={{ gridColumn: 'span 2' }}><strong>{t('contact')}:</strong> <span style={{ color: 'var(--text-main)' }}>{candidate.contactNumber}</span></div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-primary" style={{ flexGrow: 1, padding: '10px', backgroundColor: 'var(--accent-gold)' }} onClick={() => navigate(`/profile/${candidate.id}`)}>
                <Eye size={16} />
              </button>
              <button className="btn btn-secondary" style={{ padding: '10px' }} onClick={() => navigate(`/edit/${candidate.id}`)}>
                <Edit size={16} />
              </button>
              <button className="btn" style={{ padding: '10px', color: '#e53e3e', backgroundColor: '#fed7d7' }} onClick={() => handleDelete(candidate.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {candidates.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '64px 32px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
            <Search size={40} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p style={{ fontSize: '1.1rem' }}>{t('noCandidates')}</p>
          </div>
        )}
      </div>

      {/* Pagination Footer Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', marginBottom: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} profiles
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '8px 12px', opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={18} /> Previous
            </button>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontWeight: 'bold' }}>
              Page {page} of {totalPages}
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '8px 12px', opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
