import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useLanguage } from '../i18n/LanguageContext';

export default function ProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<any>(null);
  const { t } = useLanguage();
  
  useEffect(() => {
    if (id) {
      window.api.db.get('SELECT * FROM candidates WHERE id = ?', [id]).then((row) => {
        setCandidate(row);
      });
    }
  }, [id]);

  if (!candidate) return <div>Loading...</div>;

  let rasiData: Record<number, string[]> = {};
  let amsamData: Record<number, string[]> = {};
  let extraData: Record<string, string> = {};
  let chartDataError = false;
  try {
    rasiData = JSON.parse(candidate.rasiKattam || '{}');
    amsamData = JSON.parse(candidate.amsamKattam || '{}');
    extraData = JSON.parse(candidate.additionalInfo || '{}');
  } catch (e) {
    // BUG-07: Was silent `catch(e) {}` — malformed JSON rendered blank charts with no feedback.
    // Now logs the error and sets a flag to show a visible warning in the UI.
    console.error('[ProfileView] Failed to parse chart/extra JSON data:', e);
    chartDataError = true;
  }

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const originalScroll = window.scrollY;
    try {
      // Scroll to top to prevent html2canvas out-of-viewport clipping bug
      window.scrollTo(0, 0);

      const page1 = document.getElementById('print-page-1');
      if (!page1) return;
      
      // Slight delay to allow DOM to settle after scroll
      await new Promise(resolve => setTimeout(resolve, 80));
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      let canvas: HTMLCanvasElement | null = await html2canvas(page1, {
        scale: 1.8,
        useCORS: true,
        scrollY: 0,
        logging: false
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const computedHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, computedHeight));

      // Free canvas V8 heap memory immediately
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
      
      pdf.save(`${candidate.fullName}_Profile.pdf`);
    } catch (err) {
      console.error('[ProfileView] PDF Export Error:', err);
      alert('Could not export PDF. Please check system memory and try again.');
    } finally {
      window.scrollTo(0, originalScroll);
    }
  };

  // Helper for readonly grid
  const ReadOnlyGrid = ({ title, data }: { title: string, data: Record<number, string[]> }) => {
    const getGridArea = (house: number) => {
      switch (house) {
        case 12: return '1 / 1 / 2 / 2'; case 1: return '1 / 2 / 2 / 3'; case 2: return '1 / 3 / 2 / 4'; case 3: return '1 / 4 / 2 / 5';
        case 4: return '2 / 4 / 3 / 5'; case 5: return '3 / 4 / 4 / 5'; case 6: return '4 / 4 / 5 / 5'; case 7: return '4 / 3 / 5 / 4';
        case 8: return '4 / 2 / 5 / 3'; case 9: return '4 / 1 / 5 / 2'; case 10: return '3 / 1 / 4 / 2'; case 11: return '2 / 1 / 3 / 2';
        default: return 'auto';
      }
    };
    return (
      <div style={{ width: '240px', height: '240px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)', border: '2px solid #000', backgroundColor: '#fff' }}>
        <div style={{ gridColumn: '2 / 4', gridRow: '2 / 4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 600, color: '#000', border: '1px solid #718096', textAlign: 'center' }}>{title}</div>
        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(house => (
          <div key={house} style={{ border: '1px solid #718096', padding: '2px', gridArea: getGridArea(house), display: 'flex', flexDirection: 'column', fontSize: '0.68rem', lineHeight: 1.15, overflow: 'hidden' }}>
            {(data[house] || []).map((g, i) => <div key={i} style={{ fontWeight: 'bold' }}>{t(g.trim() as any) || g.trim()}</div>)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="page-transition" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}><ArrowLeft size={16} /> {t('back')}</button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handlePrint}><Printer size={16} /> {t('printProfile')}</button>
          <button className="btn btn-primary" onClick={handleExportPDF}><Download size={16} /> {t('exportPdf')}</button>
        </div>
      </div>
      
      <div id="print-area" style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <div id="print-page-1" style={{ backgroundColor: 'white', padding: '24px 32px', color: '#2d3748' }}>
          {/* Header - Logo Top Left */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img src="/images/logo_transparent.png" alt="Logo" style={{ height: '54px', objectFit: 'contain' }} className="print-logo" />
              <div>
                <h1 style={{ fontSize: '18px', margin: '0', color: '#000', lineHeight: 1.2 }}>{t('kattamMatrimony')}</h1>
                <h2 style={{ fontSize: '12px', margin: '2px 0 0 0', color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('candidateProfile')}</h2>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 'bold', color: '#2d3748', lineHeight: 1.4 }}>
              <div>{t('regNo')}: {candidate.registrationId || `TMM-${candidate.id}`}</div>
              <div>{t('regDate')}: {extraData.regDate || candidate.createdAt?.split(' ')[0]}</div>
            </div>
          </div>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
          {candidate.photo1 && (
            <div style={{ width: '100px', height: '125px', flexShrink: 0, border: '1px solid #cbd5e0', borderRadius: '4px', overflow: 'hidden' }}>
              <img src={window.api.getLocalImage(candidate.photo1)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Candidate" />
            </div>
          )}
          <div style={{ flexGrow: 1 }}>
            <h3 style={{ fontSize: '16px', marginBottom: '8px', color: '#000' }}>{candidate.fullName}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '12px' }}>
              <div><strong>{t('gender')}:</strong> {candidate.gender ? t(candidate.gender.toLowerCase() as any) || candidate.gender : ''}</div>
              <div><strong>{t('dob')}:</strong> {candidate.dob}</div>
              <div><strong>{t('tob')}:</strong> {candidate.tobHour}:{candidate.tobMinute} {candidate.tobAmPm}</div>
              <div><strong>{t('placeOfBirth')}:</strong> {candidate.birthPlace}</div>
              <div><strong>{t('religion') || 'Religion'}:</strong> {candidate.religion}</div>
              <div><strong>{t('maritalStatus')}:</strong> {candidate.maritalStatus ? t(candidate.maritalStatus.toLowerCase() as any) || candidate.maritalStatus : ''}</div>
              <div><strong>{t('motherTongue')}:</strong> {candidate.motherTongue}</div>
            </div>
          </div>
        </div>
        
        {/* Detail Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px', fontSize: '12px' }}>
          <div>
            <h4 style={{ color: '#000', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '6px', fontSize: '13px' }}>{t('familyDetails')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>{t('fatherName')}:</strong> {candidate.fatherName} ({candidate.fatherJob})</div>
              <div><strong>{t('motherName')}:</strong> {candidate.motherName} ({candidate.motherJob})</div>
              <div>
                <span><strong>{t('brothers') || 'Brothers'}:</strong> {extraData.brothers} ({extraData.brothersMarried} m)</span> | 
                <span style={{ marginLeft: '4px' }}><strong>{t('sisters') || 'Sisters'}:</strong> {extraData.sisters} ({extraData.sistersMarried} m)</span>
              </div>
              <div><strong>{t('nativity')}:</strong> {candidate.nativity}</div>
            </div>
          </div>
          <div>
            <h4 style={{ color: '#000', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '6px', fontSize: '13px' }}>{t('physicalEducation')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>{t('qualification')}:</strong> {candidate.qualification}</div>
              <div><strong>{t('occupation')}:</strong> {candidate.occupation}</div>
              <div><strong>{t('income')}:</strong> {candidate.income} | <strong>{t('workLocation') || 'Work Location'}:</strong> {candidate.placeOfJob}</div>
              <div><strong>{t('assets') || 'Assets'}:</strong> {candidate.assets}</div>
              <div><strong>{t('height')}:</strong> {candidate.height} | <strong>{t('weight')}:</strong> {candidate.weight}</div>
              <div><strong>{t('diet')}:</strong> {candidate.diet} | <strong>{t('complexion')}:</strong> {candidate.complexion}</div>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px', fontSize: '12px' }}>
          <div>
            <h4 style={{ color: '#000', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '6px', fontSize: '13px' }}>{t('astrologicalDetails')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>{t('caste')}:</strong> {candidate.caste} | <strong>{t('subCaste')}:</strong> {candidate.subCaste}</div>
              <div><strong>{t('star')}:</strong> {candidate.star} | <strong>{t('raasi')}:</strong> {candidate.raasi}</div>
              <div><strong>லக்னம் (Laknam):</strong> {candidate.laknam} | <strong>{t('gothram')}:</strong> {candidate.gothram}</div>
              <div><strong>{t('dasaBalance') || 'Dasa Balance'}:</strong> {candidate.horoscopeBalance}</div>
            </div>
          </div>
          <div>
            <h4 style={{ color: '#000', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '6px', fontSize: '13px' }}>{t('communicationDetails')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>{t('contactPerson')}:</strong> {candidate.contactPerson} ({candidate.contactNumber})</div>
              <div><strong>{t('address')}:</strong> {candidate.presentAddress}</div>
              <div><strong>{t('expectation') || 'Expectations'}:</strong> {candidate.partnerComments}</div>
            </div>
          </div>
        </div>

        {/* Single-Page Kattam (Horoscope Charts) */}
        {(candidate.rasiKattam || candidate.amsamKattam) && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e0' }}>
            <h4 style={{ color: '#000', fontSize: '13px', margin: '0 0 10px 0', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>
              {t('horoscopeCharts') || 'Horoscope Charts (Kattam)'}
            </h4>
            {chartDataError ? (
              <div style={{ padding: '12px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', color: '#856404', fontSize: '12px' }}>
                ⚠️ Chart data is unavailable for this profile.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>
                {candidate.rasiKattam && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <ReadOnlyGrid title={t('rasiTitle')} data={JSON.parse(candidate.rasiKattam)} />
                  </div>
                )}
                {candidate.amsamKattam && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <ReadOnlyGrid title={t('amsamTitle')} data={JSON.parse(candidate.amsamKattam)} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
