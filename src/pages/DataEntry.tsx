import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import KattamGrid from '../components/KattamGrid';
import { Save, ArrowLeft, RefreshCw, Camera } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { calculateVedicChart } from '../utils/astrology';

export default function DataEntry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  // BUG-01: Removed duplicate keys (caste, subCaste, gothram, height, complexion were
  // declared twice in the original object — JS silently kept only the last declaration).
  const [formData, setFormData] = useState<any>({
    registrationId: '', dob: '', tobHour: '12', tobMinute: '00', tobAmPm: 'AM',
    fullName: '', gender: '', religion: 'Hindu',
    birthPlace: '', birthLat: '13.0827', birthLon: '80.2707', nativity: '', motherTongue: 'Tamil', maritalStatus: 'Unmarried',
    fatherName: '', fatherAlive: 'Yes', fatherJob: '',
    motherName: '', motherAlive: 'Yes', motherJob: '',
    siblings: '{}', additionalInfo: '', assets: '',
    height: '', weight: '', bloodGroup: '', diet: 'Vegetarian', disability: 'No', complexion: 'Fair',
    qualification: '', occupation: '', placeOfJob: '', income: '',
    caste: '', subCaste: '', gothram: '', star: '', raasi: '', padam: '', laknam: '',
    horoscopeBalance: '',
    rasiKattam: '{}', amsamKattam: '{}',
    permanentAddress: '', presentAddress: '', contactPerson: '', contactNumber: '',
    partnerQualification: '', partnerJob: '', partnerJobReq: 'Not required', partnerIncome: '',
    partnerAgeFrom: '', partnerAgeTo: '', partnerDiet: "Doesn't Matter",
    partnerHoroscopeReq: 'No', partnerMaritalStatus: "Doesn't Matter",
    partnerCaste: '', partnerSubCaste: '', partnerComments: '',
    photo1: '', photo2: ''
  });

  const [rasiData, setRasiData] = useState<Record<number, string[]>>({});
  const [amsamData, setAmsamData] = useState<Record<number, string[]>>({});
  const [extraData, setExtraData] = useState({
    regDate: new Date().toISOString().split('T')[0],
    brothers: '0',
    brothersMarried: '0',
    sisters: '0',
    sistersMarried: '0'
  });

  const [activeSection, setActiveSection] = useState('personal');

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (id) {
      window.api.db.get('SELECT * FROM candidates WHERE id = ?', [id]).then((row) => {
        if (row) {
          setFormData(row);
          try {
            setRasiData(JSON.parse(row.rasiKattam || '{}'));
            setAmsamData(JSON.parse(row.amsamKattam || '{}'));
            const extra = JSON.parse(row.additionalInfo || '{}');
            if (extra.regDate || extra.brothers) {
              setExtraData(prev => ({ ...prev, ...extra }));
            }
          } catch (e) {
            console.error(e);
          }
        }
      });
    } else {
      // Auto-generate Registration ID for new candidate
      window.api.db.get('SELECT MAX(id) as maxId FROM candidates', []).then((row) => {
        const nextId = (row?.maxId || 0) + 1;
        setFormData((prev: any) => ({ ...prev, registrationId: `TMM-${String(nextId).padStart(3, '0')}` }));
      });
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev: any) => {
        const currentVals = prev[name] ? prev[name].split(',').filter(Boolean) : [];
        if (checked) currentVals.push(value);
        else {
          const idx = currentVals.indexOf(value);
          if (idx > -1) currentVals.splice(idx, 1);
        }
        return { ...prev, [name]: currentVals.join(',') };
      });
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  // MEM-02 / MEM-05: Replaced FileReader + Base64 + IPC transfer with native OS dialog.
  // The old approach created a ~14.8MB RAM spike per photo (Base64 string + structured clone).
  // Now only an ~80-byte file path string crosses the IPC bridge — zero memory overhead.
  const handlePhotoUpload = async (fieldName: string) => {
    const savedPath = await window.api.pickAndSaveImage(`${Date.now()}_photo.jpg`);
    if (savedPath) setFormData((prev: any) => ({ ...prev, [fieldName]: savedPath }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const saveRasi = JSON.stringify(rasiData);
    const saveAmsam = JSON.stringify(amsamData);
    const saveExtra = JSON.stringify(extraData);
    
    const dataToSave = { ...formData, rasiKattam: saveRasi, amsamKattam: saveAmsam, additionalInfo: saveExtra };
    const keys = Object.keys(dataToSave).filter(k => k !== 'id' && k !== 'createdAt');
    const values = keys.map(k => dataToSave[k]);
    
    if (id) {
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      await window.api.db.run(`UPDATE candidates SET ${setClause} WHERE id = ?`, [...values, id]);
    } else {
      const placeholders = keys.map(() => '?').join(', ');
      await window.api.db.run(`INSERT INTO candidates (${keys.join(', ')}) VALUES (${placeholders})`, values);
    }
    navigate('/search');
  };

  const handleAutoCalc = async () => {
    if (!formData.dob || !formData.tobHour || !formData.tobMinute) {
      alert('Please enter Date of Birth and Time of Birth first.');
      return;
    }
    let hour24 = parseInt(formData.tobHour);
    if (formData.tobAmPm === 'PM' && hour24 !== 12) hour24 += 12;
    if (formData.tobAmPm === 'AM' && hour24 === 12) hour24 = 0;
    const timeStr = `${String(hour24).padStart(2, '0')}:${formData.tobMinute.padStart(2, '0')}`;
    const lat = parseFloat(formData.birthLat) || 13.0827;
    const lon = parseFloat(formData.birthLon) || 80.2707;

    // BUG-06: Removed dead VedAstro API call. The original code fetched the API,
    // waited up to 3 seconds, then discarded the response and used the local engine anyway.
    // The local astronomy-engine is the sole calculation engine.
    const result = calculateVedicChart(formData.dob, timeStr, lat, lon, language === 'ta');
    if (result) {
      setRasiData(result.rasiData);
      setAmsamData(result.amsamData);
    }
  };

  // CPU-01: useCallback ensures stable function references so KattamGrid
  // does NOT re-render when the user types in any other form field.
  const handleRasiChange = useCallback((h: number, g: string[]) => {
    setRasiData(prev => ({ ...prev, [h]: g }));
  }, []);

  const handleAmsamChange = useCallback((h: number, g: string[]) => {
    setAmsamData(prev => ({ ...prev, [h]: g }));
  }, []);

  return (
    <div className="form-layout-wrapper page-transition">
      <div className="form-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> {t('back')}
          </button>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--text-main)' }}>{id ? t('editProfile') : t('newProfile')}</h2>
          <div style={{ width: '80px' }}></div>
        </div>

        {/* BUG-04: Removed onSubmit={handleSave}. Both save buttons are type="button"
            with explicit onClick, so Enter-key presses no longer trigger a double-submit
            that would create duplicate database records. */}
        <form>
          <div id="personal" className="form-section">
            <div className="form-section-title">{t('personalFamilyDetails')}</div>
            <div className="form-grid">
              <div className="form-group col-4">
                <label>{t('regNo')}</label>
                <input type="text" className="form-control" name="registrationId" value={formData.registrationId} onChange={handleChange} placeholder="e.g. TMM-002" />
              </div>
              <div className="form-group col-4">
                <label>Registration Date</label>
                <input type="date" className="form-control" value={extraData.regDate} onChange={(e) => setExtraData({...extraData, regDate: e.target.value})} />
              </div>
              <div className="form-group col-4">
                <label>{t('fullName')}</label>
                <input required type="text" className="form-control" name="fullName" value={formData.fullName} onChange={handleChange} />
              </div>
              <div className="form-group col-4">
                <label>{t('gender')}</label>
                <select required className="form-control" name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="">{t('select')}</option>
                  <option value="Male">{t('male')}</option>
                  <option value="Female">{t('female')}</option>
                </select>
              </div>
              
              <div className="form-sub-header">Birth Details</div>
              <div className="form-group col-4">
                <label>{t('dob')}</label>
                <input required type="date" className="form-control" name="dob" value={formData.dob} onChange={handleChange} />
              </div>
              <div className="form-group col-8">
                <label>{t('tob')}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <select className="form-control" name="tobHour" value={formData.tobHour} onChange={handleChange} style={{ flex: 1, minWidth: '70px', maxWidth: '80px' }}>
                    {[...Array(12)].map((_, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')}</option>)}
                  </select>
                  <select className="form-control" name="tobMinute" value={formData.tobMinute} onChange={handleChange} style={{ flex: 1, minWidth: '70px', maxWidth: '80px' }}>
                    {[...Array(60)].map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}
                  </select>
                  <select className="form-control" name="tobAmPm" value={formData.tobAmPm} onChange={handleChange} style={{ flex: 1, minWidth: '70px', maxWidth: '80px' }}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div className="form-group col-6">
                <label>{t('placeOfBirth')}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <input type="text" className="form-control" name="birthPlace" value={formData.birthPlace} onChange={handleChange} placeholder="City name" style={{ flexGrow: 1, minWidth: '120px' }} />
                  <input type="text" className="form-control" name="birthLat" value={formData.birthLat} onChange={handleChange} placeholder="Lat (13.08)" style={{ flex: 1, minWidth: '80px', maxWidth: '100px' }} />
                  <input type="text" className="form-control" name="birthLon" value={formData.birthLon} onChange={handleChange} placeholder="Lon (80.27)" style={{ flex: 1, minWidth: '80px', maxWidth: '100px' }} />
                </div>
              </div>
              <div className="form-group col-3">
                <label>{t('nativity')}</label>
                <input type="text" className="form-control" name="nativity" value={formData.nativity} onChange={handleChange} />
              </div>
              <div className="form-group col-3">
                <label>{t('religion')}</label>
                <input type="text" className="form-control" name="religion" value={formData.religion} onChange={handleChange} />
              </div>

              <div className="form-group col-6">
                <label>{t('motherTongue')}</label>
                <input 
                  type="text" 
                  className="form-control" 
                  name="motherTongue" 
                  list="mother-tongue-list"
                  value={formData.motherTongue} 
                  onChange={handleChange} 
                  placeholder="Type or select mother tongue..."
                />
                <datalist id="mother-tongue-list">
                  <option value="Tamil" />
                  <option value="Telugu" />
                  <option value="Malayalam" />
                  <option value="Kannada" />
                  <option value="Hindi" />
                  <option value="English" />
                  <option value="Saurashtra" />
                  <option value="Marathi" />
                </datalist>
              </div>
              <div className="form-group col-6">
                <label>{t('maritalStatus')}</label>
                <select className="form-control" name="maritalStatus" value={formData.maritalStatus} onChange={handleChange}>
                  <option value="Unmarried">{t('unmarried')}</option>
                  <option value="Married">{t('married')}</option>
                  <option value="Divorced">{t('divorced')}</option>
                  <option value="Widowed">{t('widowed')}</option>
                </select>
              </div>

              <div className="form-sub-header">{t('familyDetails') || 'Family Details'}</div>
              <div className="form-group col-6">
                <label>{t('fatherName')}</label>
                <input type="text" className="form-control" name="fatherName" value={formData.fatherName || ''} onChange={handleChange} />
              </div>
              <div className="form-group col-6">
                <label>{t('fatherJob') || "Father's Occupation"}</label>
                <input type="text" className="form-control" name="fatherJob" value={formData.fatherJob || ''} onChange={handleChange} />
              </div>
              <div className="form-group col-6">
                <label>{t('motherName')}</label>
                <input type="text" className="form-control" name="motherName" value={formData.motherName || ''} onChange={handleChange} />
              </div>
              <div className="form-group col-6">
                <label>{t('motherJob') || "Mother's Occupation"}</label>
                <input type="text" className="form-control" name="motherJob" value={formData.motherJob || ''} onChange={handleChange} />
              </div>
              <div className="form-group col-3">
                <label>{t('brothers')}</label>
                <input type="text" className="form-control" value={extraData.brothers} onChange={(e) => setExtraData({...extraData, brothers: e.target.value})} />
              </div>
              <div className="form-group col-3">
                <label>{t('brothersMarried')}</label>
                <input type="text" className="form-control" value={extraData.brothersMarried} onChange={(e) => setExtraData({...extraData, brothersMarried: e.target.value})} />
              </div>
              <div className="form-group col-3">
                <label>{t('sisters')}</label>
                <input type="text" className="form-control" value={extraData.sisters} onChange={(e) => setExtraData({...extraData, sisters: e.target.value})} />
              </div>
              <div className="form-group col-3">
                <label>{t('sistersMarried')}</label>
                <input type="text" className="form-control" value={extraData.sistersMarried} onChange={(e) => setExtraData({...extraData, sistersMarried: e.target.value})} />
              </div>
            </div>
          </div>

          <div id="astrology" className="form-section">
            <div className="form-section-title">
              {t('horoscopeDetails')}
            </div>
            <div className="form-grid">
              <div className="form-group col-4">
                <label>{t('caste')}</label>
                <input required type="text" className="form-control" name="caste" value={formData.caste} onChange={handleChange} />
              </div>
              <div className="form-group col-4">
                <label>{t('subCaste')}</label>
                <input type="text" className="form-control" name="subCaste" value={formData.subCaste} onChange={handleChange} />
              </div>
              <div className="form-group col-4">
                <label>{t('gothram')}</label>
                <input type="text" className="form-control" name="gothram" value={formData.gothram} onChange={handleChange} />
              </div>
              
              <div className="form-sub-header">Star & Zodiac</div>
              <div className="form-group col-3">
                <label>{t('star')}</label>
                <input type="text" className="form-control" name="star" value={formData.star} onChange={handleChange} />
              </div>
              <div className="form-group col-3">
                <label>{t('raasi')}</label>
                <input type="text" className="form-control" name="raasi" value={formData.raasi} onChange={handleChange} />
              </div>
              <div className="form-group col-3">
                <label>லக்னம்</label>
                <input type="text" className="form-control" name="laknam" value={formData.laknam} onChange={handleChange} />
              </div>
              <div className="form-group col-3">
                <label>{t('dasaBalance')}</label>
                <input type="text" className="form-control" name="horoscopeBalance" value={formData.horoscopeBalance} onChange={handleChange} />
              </div>
            </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '8px' }}>
            <div style={{ fontWeight: 600 }}>{t('horoscopeCharts')}</div>
            <button type="button" className="btn" style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#e2a325', color: '#fff', border: 'none', boxShadow: '0 2px 4px rgba(226,163,37,0.3)' }} onClick={handleAutoCalc}>
              <RefreshCw size={14} /> {t('autoCalc')}
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#718096', marginBottom: '16px' }}>{t('autoCalcWarning')}</p>
          <div className="kattam-container">
            {/* CPU-01: Stable useCallback refs — KattamGrid won't re-render on every keypress */}
            <KattamGrid title={t('rasiTitle')} data={rasiData} onChange={handleRasiChange} />
            <KattamGrid title={t('amsamTitle')} data={amsamData} onChange={handleAmsamChange} />
          </div>
        </div>

          <div id="education" className="form-section">
            <div className="form-section-title">{t('educationOccupation')}</div>
            <div className="form-grid">
              <div className="form-group col-6">
                <label>{t('qualification')}</label>
                <input type="text" className="form-control" name="qualification" value={formData.qualification} onChange={handleChange} />
              </div>
              <div className="form-group col-6">
                <label>{t('occupation')}</label>
                <input type="text" className="form-control" name="occupation" value={formData.occupation} onChange={handleChange} />
              </div>
              <div className="form-group col-4">
                <label>{t('income')}</label>
                <input type="text" className="form-control" name="income" value={formData.income} onChange={handleChange} />
              </div>
              <div className="form-group col-4">
                <label>{t('workLocation')}</label>
                <input type="text" className="form-control" name="placeOfJob" value={formData.placeOfJob} onChange={handleChange} />
              </div>
              <div className="form-group col-4">
                <label>{t('assets')}</label>
                <input type="text" className="form-control" name="assets" value={formData.assets} onChange={handleChange} placeholder="e.g. House" />
              </div>
            </div>
          </div>

          <div id="physical" className="form-section">
            <div className="form-section-title">{t('physicalDetails')}</div>
            <div className="form-grid">
              <div className="form-group col-3">
                <label>{t('complexion')}</label>
                <input type="text" className="form-control" name="complexion" value={formData.complexion} onChange={handleChange} placeholder="e.g. Fair" />
              </div>
              <div className="form-group col-3">
                <label>{t('height')}</label>
                <input type="text" className="form-control" name="height" value={formData.height} onChange={handleChange} placeholder="e.g. 6ft" />
              </div>
              <div className="form-group col-3">
                <label>{t('weight')}</label>
                <input type="text" className="form-control" name="weight" value={formData.weight || ''} onChange={handleChange} placeholder="e.g. 65kg" />
              </div>
              <div className="form-group col-12" style={{ marginTop: '8px' }}>
                <label>{t('expectation')}</label>
                <textarea 
                  className="form-control" 
                  name="partnerComments" 
                  rows={4}
                  value={formData.partnerComments} 
                  onChange={handleChange} 
                  placeholder="Enter detailed expectations and requirements (multiple lines supported)..." 
                />
              </div>
            </div>
          </div>

          <div id="communication" className="form-section">
            <div className="form-section-title">{t('communicationDetails')}</div>
            <div className="form-grid">
              <div className="form-group col-4">
                <label>{t('contactPerson') || 'Contact Person'}</label>
                <input type="text" className="form-control" name="contactPerson" value={formData.contactPerson || ''} onChange={handleChange} />
              </div>
              <div className="form-group col-4">
                <label>{t('contactNumber')}</label>
                <input required type="text" className="form-control" name="contactNumber" value={formData.contactNumber} onChange={handleChange} />
              </div>
              <div className="form-group col-8">
                <label>{t('presentAddress')}</label>
                <textarea className="form-control" name="presentAddress" value={formData.presentAddress} onChange={handleChange} rows={2} />
              </div>
            </div>
          </div>

          <div id="photos" className="form-section">
            <div className="form-section-title">{t('candidatePhotos')}</div>
            {/* MEM-02/MEM-05: Replaced file input + FileReader + Base64 IPC with native dialog.
                Clicking the button opens the OS file picker in the main process.
                Only an ~80-byte file path crosses the IPC bridge. */}
            <div className="form-grid">
              <div className="form-group col-6">
                <label>{t('photo1')}</label>
                <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => handlePhotoUpload('photo1')}>
                  <Camera size={16} style={{ marginRight: '6px' }} /> {formData.photo1 ? 'Change Photo 1' : 'Select Photo 1'}
                </button>
                {formData.photo1 && <img src={window.api.getLocalImage(formData.photo1)} alt="Preview 1" style={{ marginTop: '16px', height: '120px', borderRadius: '8px', objectFit: 'cover' }} />}
              </div>
              <div className="form-group col-6">
                <label>{t('photo2')}</label>
                <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => handlePhotoUpload('photo2')}>
                  <Camera size={16} style={{ marginRight: '6px' }} /> {formData.photo2 ? 'Change Photo 2' : 'Select Photo 2'}
                </button>
                {formData.photo2 && <img src={window.api.getLocalImage(formData.photo2)} alt="Preview 2" style={{ marginTop: '16px', height: '120px', borderRadius: '8px', objectFit: 'cover' }} />}
              </div>
            </div>
          </div>
          
          <div className="form-section" style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--card-bg)', padding: '20px 24px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {id ? 'Ready to apply changes to this profile?' : 'Ready to save this new profile to the database?'}
            </div>
            <button type="button" className="btn btn-primary" onClick={handleSave} style={{ minWidth: '180px', padding: '12px 24px', fontSize: '1rem', fontWeight: 600 }}>
              <Save size={18} /> {t('saveProfile')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
