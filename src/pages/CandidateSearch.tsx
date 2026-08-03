import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Edit, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function CandidateSearch() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const PAGE_SIZE = 30;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on new search
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const loadCandidates = async () => {
    // MEM-04: SELECT * was loading 50+ columns including large rasiKattam/amsamKattam
    // JSON blobs for cards that only display 5 fields. Now fetches only what's needed.
    const CARD_COLS = 'id, registrationId, fullName, gender, caste, contactNumber';
    let countQuery = 'SELECT COUNT(*) as count FROM candidates';
    let dataQuery = `SELECT ${CARD_COLS} FROM candidates ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    let countParams: any[] = [];
    let dataParams: any[] = [];

    if (debouncedSearch) {
      const term = `%${debouncedSearch}%`;
      const whereClause = ` WHERE registrationId LIKE ? OR fullName LIKE ? OR contactNumber LIKE ? OR caste LIKE ? OR subCaste LIKE ? OR birthPlace LIKE ? OR raasi LIKE ? OR star LIKE ? OR dob LIKE ? OR additionalInfo LIKE ?`;
      countQuery += whereClause;
      dataQuery = `SELECT ${CARD_COLS} FROM candidates ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
      const searchParams = Array(10).fill(term);
      countParams = [...searchParams];
      dataParams = [...searchParams];
    }
    
    dataParams.push(PAGE_SIZE, (page - 1) * PAGE_SIZE);

    try {
      const countResult = await window.api.db.get(countQuery, countParams);
      const total = countResult ? countResult.count : 0;
      setTotalCount(total);
      setTotalPages(Math.ceil(total / PAGE_SIZE));

      const rows = await window.api.db.all(dataQuery, dataParams);
      setCandidates(rows || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [debouncedSearch, page]);

  const handleDelete = async (id: number) => {
    if (confirm(t('confirmDelete'))) {
      await window.api.db.run('DELETE FROM candidates WHERE id = ?', [id]);
      loadCandidates();
    }
  };

  return (
    <div className="form-container page-transition">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{t('candidateDatabase')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder={t('searchPlaceholder') || "Enter search criteria..."}
              style={{ paddingLeft: '38px', width: '100%', maxWidth: '450px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', maxWidth: '450px', textAlign: 'right' }}>
            <strong>Search by:</strong> ID, Name, Phone, Caste, Sub-Caste, Star, Raasi, Place of Birth, Date of Birth, or Reg Date (YYYY-MM-DD)
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {candidates.map(candidate => (
          <div key={candidate.id} style={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }} 
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

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
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
