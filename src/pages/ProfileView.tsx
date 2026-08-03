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
      window.scrollTo(0, 0);

      const page1 = document.getElementById('print-page-1');
      if (!page1) return;
      
      await new Promise(resolve => setTimeout(resolve, 80));
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      let canvas1: HTMLCanvasElement | null = await html2canvas(page1, {
        scale: 2.0,
        useCORS: true,
        scrollY: 0,
        logging: false
      });
      const imgData1 = canvas1.toDataURL('image/jpeg', 0.92);
      const pdfHeight = (canvas1.height * pdfWidth) / canvas1.width;
      pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      canvas1.width = 0;
      canvas1.height = 0;
      canvas1 = null;

      pdf.save(`${candidate.fullName}_Profile.pdf`);
    } catch (err) {
      console.error('[ProfileView] PDF Export Error:', err);
      alert('Could not export PDF. Please check system memory and try again.');
    } finally {
      window.scrollTo(0, originalScroll);
    }
  };

  // Helper for clear, unclipped, spacious readonly grid
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
      <div style={{ width: '310px', height: '310px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)', border: '2px solid #000', backgroundColor: '#fff' }}>
        <div style={{ gridColumn: '2 / 4', gridRow: '2 / 4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#000', border: '1px solid #718096' }}>{title}</div>
        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(house => (
          <div key={house} style={{ border: '1px solid #718096', padding: '4px 6px', gridArea: getGridArea(house), display: 'flex', flexDirection: 'column', fontSize: '0.78rem', lineHeight: 1.3, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
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
        <div id="print-page-1" style={{ backgroundColor: 'white', padding: '36px 40px', color: '#2d3748' }}>
          {/* Header */}
          <div style={{ position: 'relative', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '16px' }}>
            <img src="/images/logo_transparent.png" alt="Logo" style={{ position: 'absolute', top: 0, left: 0, height: '52px' }} className="print-logo" />
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '20px', margin: '0 0 4px 0', color: '#000', fontWeight: 700 }}>{t('kattamMatrimony')}</h1>
              <h2 style={{ fontSize: '14px', margin: 0, color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('candidateProfile')}</h2>
            </div>
            
            {/* Reg No (Left) & Reg Date (Right) directly below Candidate Profile title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '13px', fontWeight: 'bold', color: '#2d3748' }}>
              <div>{t('regNo')}: {candidate.registrationId || `TMM-${candidate.id}`}</div>
              <div>{t('regDate')}: {extraData.regDate || candidate.createdAt?.split(' ')[0]}</div>
            </div>
          </div>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          {candidate.photo1 && (
            <div style={{ width: '120px', height: '145px', flexShrink: 0, border: '1px solid #cbd5e0', borderRadius: '4px', overflow: 'hidden' }}>
              <img src={window.api.getLocalImage(candidate.photo1)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Candidate" />
            </div>
          )}
          <div style={{ flexGrow: 1 }}>
            <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#000', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>{candidate.fullName}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', fontSize: '13px' }}>
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
        
        {/* Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px', fontSize: '13px' }}>
          <div>
            <h4 style={{ color: '#000', borderBottom: '1px solid #cbd5e0', paddingBottom: '4px', marginBottom: '8px', fontSize: '14px', fontWeight: 700 }}>{t('familyDetails')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div><strong>{t('fatherName')}:</strong> {candidate.fatherName} ({candidate.fatherJob})</div>
              <div><strong>{t('motherName')}:</strong> {candidate.motherName} ({candidate.motherJob})</div>
              <div><strong>{t('brothers') || 'Brothers'}:</strong> {extraData.brothers || '0'} ({t('brothersMarried') || 'Married'}: {extraData.brothersMarried || '0'})</div>
              <div><strong>{t('sisters') || 'Sisters'}:</strong> {extraData.sisters || '0'} ({t('sistersMarried') || 'Married'}: {extraData.sistersMarried || '0'})</div>
              <div><strong>{t('nativity')}:</strong> {candidate.nativity}</div>
            </div>

            <h4 style={{ color: '#000', borderBottom: '1px solid #cbd5e0', paddingBottom: '4px', marginTop: '14px', marginBottom: '8px', fontSize: '14px', fontWeight: 700 }}>{t('physicalEducation')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div><strong>{t('qualification')}:</strong> {candidate.qualification}</div>
              <div><strong>{t('occupation')}:</strong> {candidate.occupation}</div>
              <div><strong>{t('income')}:</strong> {candidate.income}</div>
              <div><strong>{t('workLocation') || 'Work Location'}:</strong> {candidate.placeOfJob}</div>
              <div><strong>{t('height')}:</strong> {candidate.height} | <strong>{t('weight')}:</strong> {candidate.weight}</div>
              <div><strong>{t('diet')}:</strong> {candidate.diet}</div>
              <div><strong>{t('complexion')}:</strong> {candidate.complexion}</div>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#000', borderBottom: '1px solid #cbd5e0', paddingBottom: '4px', marginBottom: '8px', fontSize: '14px', fontWeight: 700 }}>{t('astrologicalDetails')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div><strong>{t('caste')}:</strong> {candidate.caste} ({candidate.subCaste})</div>
              <div><strong>{t('star')}:</strong> {candidate.star}</div>
              <div><strong>{t('raasi')}:</strong> {candidate.raasi}</div>
              <div><strong>லக்னம் (Laknam):</strong> {candidate.laknam}</div>
              <div><strong>{t('dasaBalance') || 'Dasa Balance'}:</strong> {candidate.horoscopeBalance}</div>
              <div><strong>{t('gothram')}:</strong> {candidate.gothram}</div>
            </div>

            <h4 style={{ color: '#000', borderBottom: '1px solid #cbd5e0', paddingBottom: '4px', marginTop: '14px', marginBottom: '8px', fontSize: '14px', fontWeight: 700 }}>{t('communicationDetails')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div><strong>{t('contactPerson')}:</strong> {candidate.contactPerson}</div>
              <div><strong>{t('contactNumber')}:</strong> {candidate.contactNumber}</div>
              <div style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}><strong>{t('address')}:</strong> {candidate.presentAddress}</div>
              <div style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}><strong>{t('expectation') || 'Expectations'}:</strong> {candidate.partnerComments}</div>
            </div>
          </div>
        </div>

        {/* Packed Horoscope Charts (Kattam) on Page 1 */}
        {(candidate.rasiKattam || candidate.amsamKattam) && (
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '2px solid #000' }}>
            <h4 style={{ color: '#000', fontSize: '15px', fontWeight: 700, marginBottom: '12px', textAlign: 'center' }}>{t('horoscopeCharts') || 'Horoscope Charts (Kattam)'}</h4>
            {chartDataError ? (
              <div style={{ padding: '12px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', color: '#856404', fontSize: '13px' }}>
                ⚠️ Chart data is unavailable for this profile.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '28px', justifyContent: 'center', alignItems: 'center' }}>
                {candidate.rasiKattam && (
                  <ReadOnlyGrid title={t('rasiTitle')} data={JSON.parse(candidate.rasiKattam)} />
                )}
                {candidate.amsamKattam && (
                  <ReadOnlyGrid title={t('amsamTitle')} data={JSON.parse(candidate.amsamKattam)} />
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
