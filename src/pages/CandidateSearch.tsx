import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Edit, Eye, Trash2, ChevronLeft, ChevronRight, Filter, RefreshCw, UserCheck, Compass, Briefcase, Heart } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface SearchOptions {
  castes: string[];
  subCastes: string[];
  gothrams: string[];
  stars: string[];
  raasis: string[];
  laknams: string[];
  qualifications: string[];
  occupations: string[];
  religions: string[];
  motherTongues: string[];
  nativities: string[];
  jobPlaces: string[];
  diets: string[];
  partnerJobReqs: string[];
  partnerHoroscopeReqs: string[];
}

const initialFilterState = {
  gender: '',
  caste: '',
  subCaste: '',
  gothram: '',
  star: '',
  raasi: '',
  laknam: '',
  maritalStatus: '',
  religion: '',
  motherTongue: '',
  nativity: '',
  qualification: '',
  occupation: '',
  placeOfJob: '',
  diet: '',
  partnerJobReq: '',
  partnerHoroscopeReq: '',
  minAge: '',
  maxAge: '',
};

export default function CandidateSearch() {
  const [searchMode, setSearchMode] = useState<'standard' | 'advanced'>('standard');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [filters, setFilters] = useState(initialFilterState);
  const [activeFilters, setActiveFilters] = useState(initialFilterState);
  
  const [dbOptions, setDbOptions] = useState<SearchOptions>({
    castes: [], subCastes: [], gothrams: [], stars: [], raasis: [], laknams: [],
    qualifications: [], occupations: [], religions: [], motherTongues: [], nativities: [], jobPlaces: [],
    diets: [], partnerJobReqs: [], partnerHoroscopeReqs: []
  });
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const PAGE_SIZE = 30;

  // Asynchronously fetch distinct values STRICTLY from SQLite database
  const fetchFilterOptions = useCallback(async (selectedCaste?: string) => {
    try {
      let res = null;
      if (window.api?.db?.getSearchOptions) {
        try {
          res = await window.api.db.getSearchOptions(selectedCaste);
        } catch (_) {}
      }
      if (!res && window.api?.getSearchFilterOptions) {
        try {
          res = await window.api.getSearchFilterOptions(selectedCaste);
        } catch (_) {}
      }
      if (res) {
        setDbOptions(prev => ({
          castes: res.castes && res.castes.length > 0 ? res.castes : prev.castes,
          subCastes: res.subCastes || [],
          gothrams: res.gothrams && res.gothrams.length > 0 ? res.gothrams : prev.gothrams,
          stars: res.stars && res.stars.length > 0 ? res.stars : prev.stars,
          raasis: res.raasis && res.raasis.length > 0 ? res.raasis : prev.raasis,
          laknams: res.laknams && res.laknams.length > 0 ? res.laknams : prev.laknams,
          qualifications: res.qualifications && res.qualifications.length > 0 ? res.qualifications : prev.qualifications,
          occupations: res.occupations && res.occupations.length > 0 ? res.occupations : prev.occupations,
          religions: res.religions && res.religions.length > 0 ? res.religions : prev.religions,
          motherTongues: res.motherTongues && res.motherTongues.length > 0 ? res.motherTongues : prev.motherTongues,
          nativities: res.nativities && res.nativities.length > 0 ? res.nativities : prev.nativities,
          jobPlaces: res.jobPlaces && res.jobPlaces.length > 0 ? res.jobPlaces : prev.jobPlaces,
          diets: res.diets && res.diets.length > 0 ? res.diets : prev.diets,
          partnerJobReqs: res.partnerJobReqs && res.partnerJobReqs.length > 0 ? res.partnerJobReqs : prev.partnerJobReqs,
          partnerHoroscopeReqs: res.partnerHoroscopeReqs && res.partnerHoroscopeReqs.length > 0 ? res.partnerHoroscopeReqs : prev.partnerHoroscopeReqs,
        }));
      }
    } catch (err) {
      console.error('[CandidateSearch] Error fetching DB filter options:', err);
    }
  }, []);

  // Fetch initial filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Re-fetch dependent Sub-Castes dynamically when Caste selection changes
  useEffect(() => {
    fetchFilterOptions(filters.caste);
  }, [filters.caste, fetchFilterOptions]);

  // Options derived strictly from database queries
  const casteOptions = useMemo(() => dbOptions.castes || [], [dbOptions.castes]);
  const subCasteOptions = useMemo(() => dbOptions.subCastes || [], [dbOptions.subCastes]);
  const gothramOptions = useMemo(() => dbOptions.gothrams || [], [dbOptions.gothrams]);
  const starOptions = useMemo(() => dbOptions.stars || [], [dbOptions.stars]);
  const raasiOptions = useMemo(() => dbOptions.raasis || [], [dbOptions.raasis]);
  const laknamOptions = useMemo(() => dbOptions.laknams || [], [dbOptions.laknams]);
  const qualificationOptions = useMemo(() => dbOptions.qualifications || [], [dbOptions.qualifications]);
  const occupationOptions = useMemo(() => dbOptions.occupations || [], [dbOptions.occupations]);
  const religionOptions = useMemo(() => dbOptions.religions || [], [dbOptions.religions]);
  const motherTongueOptions = useMemo(() => dbOptions.motherTongues || [], [dbOptions.motherTongues]);
  const nativityOptions = useMemo(() => dbOptions.nativities || [], [dbOptions.nativities]);
  const jobPlaceOptions = useMemo(() => dbOptions.jobPlaces || [], [dbOptions.jobPlaces]);
  const dietOptions = useMemo(() => dbOptions.diets || [], [dbOptions.diets]);
  const partnerJobReqOptions = useMemo(() => dbOptions.partnerJobReqs || [], [dbOptions.partnerJobReqs]);
  const partnerHoroscopeReqOptions = useMemo(() => dbOptions.partnerHoroscopeReqs || [], [dbOptions.partnerHoroscopeReqs]);

  // Triggers search query execution ONLY when user clicks Search / presses Enter
  const handleStandardSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveSearchTerm(searchTerm);
    setPage(1);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'caste' ? { subCaste: '' } : {})
    }));
  };

  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      if (activeSearchTerm) {
        const term = `%${activeSearchTerm}%`;
        whereConditions.push('(registrationId LIKE ? OR fullName LIKE ? OR contactNumber LIKE ? OR caste LIKE ? OR subCaste LIKE ? OR birthPlace LIKE ? OR raasi LIKE ? OR star LIKE ? OR dob LIKE ? OR additionalInfo LIKE ?)');
        for (let i = 0; i < 10; i++) {
          countParams.push(term);
          dataParams.push(term);
        }
      }
    } else {
      // Comprehensive Advanced Multi-Criteria Filter Query Builder
      if (activeFilters.gender) {
        whereConditions.push('LOWER(gender) = LOWER(?)');
        countParams.push(activeFilters.gender);
        dataParams.push(activeFilters.gender);
      }
      if (activeFilters.maritalStatus) {
        whereConditions.push('LOWER(TRIM(maritalStatus)) = LOWER(TRIM(?))');
        countParams.push(activeFilters.maritalStatus);
        dataParams.push(activeFilters.maritalStatus);
      }
      if (activeFilters.religion) {
        whereConditions.push('LOWER(TRIM(religion)) = LOWER(TRIM(?))');
        countParams.push(activeFilters.religion);
        dataParams.push(activeFilters.religion);
      }
      if (activeFilters.motherTongue) {
        whereConditions.push('LOWER(TRIM(motherTongue)) = LOWER(TRIM(?))');
        countParams.push(activeFilters.motherTongue);
        dataParams.push(activeFilters.motherTongue);
      }
      if (activeFilters.nativity) {
        whereConditions.push('LOWER(TRIM(nativity)) = LOWER(TRIM(?))');
        countParams.push(activeFilters.nativity);
        dataParams.push(activeFilters.nativity);
      }
      if (activeFilters.caste) {
        whereConditions.push('LOWER(TRIM(caste)) = LOWER(TRIM(?))');
        countParams.push(activeFilters.caste);
        dataParams.push(activeFilters.caste);
      }
      if (activeFilters.subCaste) {
        whereConditions.push('LOWER(TRIM(subCaste)) = LOWER(TRIM(?))');
        countParams.push(activeFilters.subCaste);
        dataParams.push(activeFilters.subCaste);
      }
      if (activeFilters.gothram) {
        whereConditions.push('LOWER(TRIM(gothram)) = LOWER(TRIM(?))');
        countParams.push(activeFilters.gothram);
        dataParams.push(activeFilters.gothram);
      }
      if (activeFilters.star) {
        whereConditions.push('LOWER(TRIM(star)) = LOWER(TRIM(?))');
        countParams.push(activeFilters.star);
        dataParams.push(activeFilters.star);
      }
      if (activeFilters.raasi) {
        whereConditions.push('LOWER(TRIM(raasi)) = LOWER(TRIM(?))');
        countParams.push(activeFilters.raasi);
        dataParams.push(activeFilters.raasi);
      }
      if (activeFilters.laknam) {
        whereConditions.push('LOWER(TRIM(laknam)) = LOWER(TRIM(?))');
        countParams.push(activeFilters.laknam);
        dataParams.push(activeFilters.laknam);
      }
      if (activeFilters.qualification) {
        whereConditions.push('LOWER(qualification) LIKE LOWER(?)');
        const qTerm = `%${activeFilters.qualification.trim()}%`;
        countParams.push(qTerm);
        dataParams.push(qTerm);
      }
      if (activeFilters.occupation) {
        whereConditions.push('LOWER(occupation) LIKE LOWER(?)');
        const oTerm = `%${activeFilters.occupation.trim()}%`;
        countParams.push(oTerm);
        dataParams.push(oTerm);
      }
      if (activeFilters.placeOfJob) {
        whereConditions.push('LOWER(TRIM(placeOfJob)) = LOWER(TRIM(?))');
        countParams.push(activeFilters.placeOfJob);
        dataParams.push(activeFilters.placeOfJob);
      }
      if (activeFilters.diet) {
        whereConditions.push('LOWER(TRIM(diet)) = LOWER(TRIM(?))');
        countParams.push(activeFilters.diet);
        dataParams.push(activeFilters.diet);
      }
      if (activeFilters.partnerJobReq) {
        whereConditions.push('LOWER(TRIM(partnerJobReq)) = LOWER(TRIM(?))');
        countParams.push(activeFilters.partnerJobReq);
        dataParams.push(activeFilters.partnerJobReq);
      }
      if (activeFilters.partnerHoroscopeReq) {
        whereConditions.push('LOWER(TRIM(partnerHoroscopeReq)) = LOWER(TRIM(?))');
        countParams.push(activeFilters.partnerHoroscopeReq);
        dataParams.push(activeFilters.partnerHoroscopeReq);
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
      if (window.api?.db?.get) {
        const countResult = await window.api.db.get(countQuery, countParams);
        const total = countResult ? countResult.count : 0;
        setTotalCount(total);
        setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));

        const rows = await window.api.db.all(dataQuery, dataParams);
        setCandidates(rows || []);
      }
    } catch (e) {
      console.error('[CandidateSearch] Query Execution Error:', e);
    }
  }, [searchMode, activeSearchTerm, activeFilters, page]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleDelete = async (id: number) => {
    if (confirm(t('confirmDelete'))) {
      if (window.api?.db?.run) {
        await window.api.db.run('DELETE FROM candidates WHERE id = ?', [id]);
        loadCandidates();
        fetchFilterOptions(filters.caste);
      }
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

      {/* Tab 1: Standard Quick Search Bar (Executes ONLY on Enter or Search Button click) */}
      {searchMode === 'standard' && (
        <form onSubmit={handleStandardSearchSubmit} style={{ marginBottom: '28px', backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flexGrow: 1 }}>
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
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', backgroundColor: 'var(--accent-gold)', whiteSpace: 'nowrap' }}>
              <Search size={16} style={{ marginRight: '6px' }} /> Search
            </button>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            <strong>Explicit Search:</strong> Press <strong>Enter</strong> or click <strong>Search</strong> to query the database.
          </div>
        </form>
      )}

      {/* Tab 2: Comprehensive Advanced Multi-Filter Panel (Executes ONLY on Apply Filters or Enter) */}
      {searchMode === 'advanced' && (
        <form onSubmit={handleApplyFilters} style={{ marginBottom: '28px', backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          
          {/* Section 1: Basic & Demographics */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <UserCheck size={16} /> Basic & Demographics
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
              {/* Gender */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('gender')}</label>
                <select className="form-control" value={filters.gender} onChange={e => handleFilterChange('gender', e.target.value)}>
                  <option value="">{t('allGenders')}</option>
                  <option value="Male">{t('male')}</option>
                  <option value="Female">{t('female')}</option>
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

              {/* Religion */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('religion')}</label>
                <select className="form-control" value={filters.religion} onChange={e => handleFilterChange('religion', e.target.value)}>
                  <option value="">{t('allReligions') || "All Religions"}</option>
                  {religionOptions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Mother Tongue */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('motherTongue')}</label>
                <select className="form-control" value={filters.motherTongue} onChange={e => handleFilterChange('motherTongue', e.target.value)}>
                  <option value="">{t('allMotherTongues') || "All Mother Tongues"}</option>
                  {motherTongueOptions.map(mt => (
                    <option key={mt} value={mt}>{mt}</option>
                  ))}
                </select>
              </div>

              {/* Nativity */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('nativity')}</label>
                <select className="form-control" value={filters.nativity} onChange={e => handleFilterChange('nativity', e.target.value)}>
                  <option value="">{t('allNativities') || "All Nativities"}</option>
                  {nativityOptions.map(n => (
                    <option key={n} value={n}>{n}</option>
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
          </div>

          {/* Section 2: Community & Horoscope */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <Compass size={16} /> Community & Horoscope
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
              {/* Caste */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('caste')}</label>
                <select className="form-control" value={filters.caste} onChange={e => handleFilterChange('caste', e.target.value)}>
                  <option value="">{t('allCastes')}</option>
                  {casteOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Sub Caste */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('subCaste')}</label>
                <select className="form-control" value={filters.subCaste} onChange={e => handleFilterChange('subCaste', e.target.value)}>
                  <option value="">{t('allSubCastes')}</option>
                  {subCasteOptions.map(sc => (
                    <option key={sc} value={sc}>{sc}</option>
                  ))}
                </select>
              </div>

              {/* Gothram */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('gothram')}</label>
                <select className="form-control" value={filters.gothram} onChange={e => handleFilterChange('gothram', e.target.value)}>
                  <option value="">{t('allGothrams') || "All Gothrams"}</option>
                  {gothramOptions.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Star */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('star')}</label>
                <select className="form-control" value={filters.star} onChange={e => handleFilterChange('star', e.target.value)}>
                  <option value="">{t('allStars')}</option>
                  {starOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Raasi */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('raasi')}</label>
                <select className="form-control" value={filters.raasi} onChange={e => handleFilterChange('raasi', e.target.value)}>
                  <option value="">{t('allRaasis')}</option>
                  {raasiOptions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Laknam */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('laknam')}</label>
                <select className="form-control" value={filters.laknam} onChange={e => handleFilterChange('laknam', e.target.value)}>
                  <option value="">{t('allLaknams') || "All Laknams"}</option>
                  {laknamOptions.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Education & Career */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <Briefcase size={16} /> Education & Career
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
              {/* Qualification */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('qualification')}</label>
                <select className="form-control" value={filters.qualification} onChange={e => handleFilterChange('qualification', e.target.value)}>
                  <option value="">{t('allQualifications')}</option>
                  {qualificationOptions.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              {/* Occupation */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('occupation')}</label>
                <select className="form-control" value={filters.occupation} onChange={e => handleFilterChange('occupation', e.target.value)}>
                  <option value="">{t('allOccupations')}</option>
                  {occupationOptions.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {/* Place of Job */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('placeOfJob')}</label>
                <select className="form-control" value={filters.placeOfJob} onChange={e => handleFilterChange('placeOfJob', e.target.value)}>
                  <option value="">{t('allJobPlaces') || "All Job Locations"}</option>
                  {jobPlaceOptions.map(jp => (
                    <option key={jp} value={jp}>{jp}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Lifestyle & Expectations (Dynamic SQLite data populated options) */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <Heart size={16} /> Lifestyle & Expectations
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
              {/* Diet */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('diet')}</label>
                <select className="form-control" value={filters.diet} onChange={e => handleFilterChange('diet', e.target.value)}>
                  <option value="">{t('allDiets') || "All Diets"}</option>
                  {dietOptions.length > 0 ? (
                    dietOptions.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))
                  ) : (
                    <>
                      <option value="Vegetarian">{t('vegetarian')}</option>
                      <option value="Non-Vegetarian">{t('nonVegetarian')}</option>
                      <option value="Eggetarian">{t('eggetarian')}</option>
                    </>
                  )}
                </select>
              </div>

              {/* Partner Job Requirement */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('partnerJobReq')}</label>
                <select className="form-control" value={filters.partnerJobReq} onChange={e => handleFilterChange('partnerJobReq', e.target.value)}>
                  <option value="">{t('select')}</option>
                  {partnerJobReqOptions.length > 0 ? (
                    partnerJobReqOptions.map(pj => (
                      <option key={pj} value={pj}>{pj}</option>
                    ))
                  ) : (
                    <>
                      <option value="Required">{t('required')}</option>
                      <option value="Not required">{t('notRequired')}</option>
                      <option value="Optional">{t('optional')}</option>
                    </>
                  )}
                </select>
              </div>

              {/* Partner Horoscope Requirement */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('partnerHoroscopeReq')}</label>
                <select className="form-control" value={filters.partnerHoroscopeReq} onChange={e => handleFilterChange('partnerHoroscopeReq', e.target.value)}>
                  <option value="">{t('select')}</option>
                  {partnerHoroscopeReqOptions.length > 0 ? (
                    partnerHoroscopeReqOptions.map(ph => (
                      <option key={ph} value={ph}>{ph}</option>
                    ))
                  ) : (
                    <>
                      <option value="Required">{t('required')}</option>
                      <option value="Not required">{t('notRequired')}</option>
                      <option value="Optional">{t('optional')}</option>
                    </>
                  )}
                </select>
              </div>
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
              type="submit"
              className="btn btn-primary"
              style={{ padding: '8px 24px', backgroundColor: 'var(--accent-gold)' }}
            >
              <Filter size={15} style={{ marginRight: '6px' }} />
              {t('applyFilters')}
            </button>
          </div>
        </form>
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
                  {candidate.fullName ? candidate.fullName.charAt(0).toUpperCase() : 'C'}
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
