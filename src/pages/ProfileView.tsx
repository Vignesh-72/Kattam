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
      const page2 = document.getElementById('print-page-2');
      
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
      
      // Page 1 Export & Low-Mem Cleanup
      let canvas1: HTMLCanvasElement | null = await html2canvas(page1, {
        scale: 1.8,
        useCORS: true,
        scrollY: 0,
        logging: false
      });
      const imgData1 = canvas1.toDataURL('image/jpeg', 0.85);
      const pdfHeight1 = (canvas1.height * pdfWidth) / canvas1.width;
      pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight1);

      // Free Page 1 canvas V8 heap memory immediately
      canvas1.width = 0;
      canvas1.height = 0;
      canvas1 = null;
      
      // Page 2 Export & Low-Mem Cleanup
      if (page2 && (candidate.rasiKattam || candidate.amsamKattam)) {
        pdf.addPage();
        let canvas2: HTMLCanvasElement | null = await html2canvas(page2, {
          scale: 1.8,
          useCORS: true,
          scrollY: 0,
          logging: false
        });
        const imgData2 = canvas2.toDataURL('image/jpeg', 0.85);
        const pdfHeight2 = (canvas2.height * pdfWidth) / canvas2.width;
        pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, pdfHeight2);

        // Free Page 2 canvas V8 heap memory immediately
        canvas2.width = 0;
        canvas2.height = 0;
        canvas2 = null;
      }
      
      pdf.save(`${candidate.fullName}_Profile.pdf`);
    } catch (err) {
      console.error('[ProfileView] PDF Export Error:', err);
      alert('Could not export PDF. Please check system memory and try again.');
    } finally {
      // Restore scroll position cleanly
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
      <div style={{ width: '300px', height: '300px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)', border: '2px solid #000', backgroundColor: '#fff' }}>
        <div style={{ gridColumn: '2 / 4', gridRow: '2 / 4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 600, color: '#000', border: '1px solid #718096' }}>{title}</div>
        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(house => (
          <div key={house} style={{ border: '1px solid #718096', padding: '4px', gridArea: getGridArea(house), display: 'flex', flexDirection: 'column', fontSize: '0.75rem', lineHeight: 1.2 }}>
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
        <div id="print-page-1" style={{ backgroundColor: 'white', padding: '32px', color: '#2d3748' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }}>
            <img src="/images/logo_transparent.png" alt="Logo" style={{ height: '60px', marginBottom: '8px' }} className="print-logo" />
            <h1 style={{ fontSize: '20px', margin: '0 0 4px 0', color: '#000' }}>{t('kattamMatrimony')}</h1>
            <h2 style={{ fontSize: '14px', margin: 0, color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('candidateProfile')}</h2>
          </div>
        
        {/* Core Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>
          <div>{t('regNo')}: {candidate.registrationId || `TMM-${candidate.id}`}</div>
          <div>{t('regDate') || 'Reg Date'}: {extraData.regDate || candidate.createdAt?.split(' ')[0]}</div>
        </div>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          {candidate.photo1 && (
            <div style={{ width: '120px', height: '150px', flexShrink: 0, border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <img src={window.api.getLocalImage(candidate.photo1)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Candidate" />
            </div>
          )}
          <div style={{ flexGrow: 1 }}>
            <h3 style={{ fontSize: '18px', marginBottom: '12px', color: '#000' }}>{candidate.fullName}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
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
            <h4 style={{ color: '#000', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', fontSize: '14px' }}>{t('familyDetails')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>{t('fatherName')}:</strong> {candidate.fatherName} ({candidate.fatherJob})</div>
              <div><strong>{t('motherName')}:</strong> {candidate.motherName} ({candidate.motherJob})</div>
              <div>
                <div><strong>{t('brothers') || 'Brothers'}:</strong> {extraData.brothers}</div>
                <div><strong>{t('brothersMarried') || 'Married'}:</strong> {extraData.brothersMarried}</div>
              </div>
              <div>
                <div><strong>{t('sisters') || 'Sisters'}:</strong> {extraData.sisters}</div>
                <div><strong>{t('sistersMarried') || 'Married'}:</strong> {extraData.sistersMarried}</div>
              </div>
              <div><strong>{t('nativity')}:</strong> {candidate.nativity}</div>
            </div>
          </div>
          <div>
            <h4 style={{ color: '#000', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', fontSize: '14px' }}>{t('physicalEducation')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>{t('qualification')}:</strong> {candidate.qualification}</div>
              <div><strong>{t('occupation')}:</strong> {candidate.occupation}</div>
              <div><strong>{t('income')}:</strong> {candidate.income}</div>
              <div><strong>{t('workLocation') || 'Work Location'}:</strong> {candidate.placeOfJob}</div>
              <div><strong>{t('assets') || 'Assets'}:</strong> {candidate.assets}</div>
              <div><strong>{t('height')}:</strong> {candidate.height} <strong>{t('weight')}:</strong> {candidate.weight}</div>
              <div><strong>{t('diet')}:</strong> {candidate.diet} <strong>{t('complexion')}:</strong> {candidate.complexion}</div>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px', fontSize: '13px' }}>
          <div>
            <h4 style={{ color: '#000', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', fontSize: '14px' }}>{t('astrologicalDetails')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>{t('caste')}:</strong> {candidate.caste}</div>
              <div><strong>{t('subCaste')}:</strong> {candidate.subCaste}</div>
              <div><strong>{t('star')}:</strong> {candidate.star}</div>
              <div><strong>{t('raasi')}:</strong> {candidate.raasi}</div>
              <div><strong>லக்னம் (Laknam):</strong> {candidate.laknam}</div>
              <div><strong>{t('dasaBalance') || 'Dasa Balance'}:</strong> {candidate.horoscopeBalance}</div>
              <div><strong>{t('gothram')}:</strong> {candidate.gothram}</div>
            </div>
          </div>
          <div>
            <h4 style={{ color: '#000', borderBottom: '1px solid #ccc', paddingBottom: '4px', marginBottom: '8px', fontSize: '14px' }}>{t('communicationDetails')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>{t('contactPerson')}:</strong> {candidate.contactPerson}</div>
              <div><strong>{t('contactNumber')}:</strong> {candidate.contactNumber}</div>
              <div><strong>{t('address')}:</strong> {candidate.presentAddress}</div>
              <div style={{ marginTop: '10px' }}><strong>{t('expectation') || 'Expectations'}:</strong> {candidate.partnerComments}</div>
            </div>
          </div>
        </div>
        </div>

        {/* Charts Page */}
        {/* Visual separator for UI, acts as page break for print */}
        <div className="no-print" style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0 32px' }}></div>
        <div id="print-page-2" className="print-page-break" style={{ backgroundColor: 'white', padding: '32px', color: '#2d3748' }}>
          <h3 style={{ borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px', color: '#000', fontSize: '16px' }}>{t('horoscopeCharts') || 'Horoscope Charts (Kattam)'}</h3>
          {chartDataError ? (
            <div style={{ padding: '24px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', color: '#856404' }}>
              ⚠️ Chart data is unavailable for this profile. The stored horoscope data may be corrupt.
              Please re-enter and save the profile to rebuild the charts.
            </div>
          ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center' }}>
            {candidate.rasiKattam && (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <ReadOnlyGrid title={t('rasiTitle')} data={JSON.parse(candidate.rasiKattam)} />
              </div>
            )}
            {candidate.amsamKattam && (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <ReadOnlyGrid title={t('amsamTitle')} data={JSON.parse(candidate.amsamKattam)} />
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
