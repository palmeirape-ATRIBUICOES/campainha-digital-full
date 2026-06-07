import React, { useState, useEffect, useRef } from 'react';
import { Users, Building2, Gift, History, Settings2, LogOut, ChevronRight, RefreshCw, Search, ToggleRight, ToggleLeft, QrCode, Copy, Check, Download, X, Hash, Layers, Sparkles, Bell, Eye, EyeOff, Home, Zap, Sun, Moon, Plus, Trash2, Phone, Star, Save, Settings, Printer } from 'lucide-react';
import Logo from '../components/Logo';
import PlateProductionPanel from '../components/PlateProductionPanel';
import PrintablePlate from '../components/PrintablePlate';

const PRESETS = {
  internet: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=600&h=300&fit=crop',
  iptv: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&h=300&fit=crop',
  general: 'https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=600&h=300&fit=crop'
};
import { useNavigate } from 'react-router-dom';
import { API } from '../config';

export default function MasterAdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [qrModal, setQrModal] = useState(null); // { user, mode: 'option1'|'option2' }
  const [qrImage, setQrImage] = useState('');
  const [plateInput, setPlateInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [visiblePassMap, setVisiblePassMap] = useState({});
  const [editModal, setEditModal] = useState(null); // null or user to edit
  const navigate = useNavigate();

  // Estados para o painel de propriedades
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [subTab, setSubTab] = useState('houses'); // 'houses' | 'condos'

  // Demo state
  const [demoUsers, setDemoUsers] = useState([]);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [settingUpDemo, setSettingUpDemo] = useState(false);
  const [demoFeedback, setDemoFeedback] = useState(null);
  const [showDemoPassMap, setShowDemoPassMap] = useState({});

  // Plate Customizer States
  const [platesSubTab, setPlatesSubTab] = useState('lab');
  const [savingStyle, setSavingStyle] = useState(false);
  const [selectedPlates, setSelectedPlates] = useState([]);
  const [plateStyle, setPlateStyle] = useState({
    templateId: 'standard',
    fontFamily: 'Inter',
    shadowDepth: 'none',
    qrRadius: '24px',
    backgroundPattern: 'none',
    borderStyle: 'solid',
    headerBadgeText: '',
    headerBadgeBg: '#3B82F6',
    headerBadgeColor: '#FFFFFF',
    logoPosition: 'top-center',
    logoSize: 36,
    logoLayout: 'horizontal',
    showPhoneIllustration: false,
    phoneIllustrationPosition: 'right',
    phoneIllustrationText: 'Aproxime o Celular',
    logoTextMain: 'CAMPAINHA',
    logoTextSub: 'DIGITAL',
    logoIcon: 'bell',
    plateSizeFormat: 'a4',
    plateWidthCustom: 21.0,
    plateHeightCustom: 29.7,
    plateSizeUnit: 'cm',
    showFooter: true,
    showUnitFooter: true,
    footerTextOverride: '',
    footerFontSize: 14,
    footerUnitFontSize: 12,
    footerFontFamily: 'inherit',
    qrBgColor: '#FFFFFF',
    qrFgColor: '#000000',
    titleText: "CAMPAINHA DIGITAL",
    subTitleText: "Para tocar o interfone:",
    instructionText: "Aproxime a câmera do seu celular do QR Code abaixo para chamar o morador",
    primaryColor: "#0F172A",
    secondaryColor: "#00E5FF",
    accentColor: "#F59E0B",
    backgroundColor: "#FFFFFF",
    textColor: "#1E293B",
    showBorder: true,
    borderColor: "#E2E8F0",
    borderWidth: "4px",
    logoColor: "#0F172A"
  });

  const [savedPresets, setSavedPresets] = useState([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [sequentialPlates, setSequentialPlates] = useState([]);
  const [activeSection, setActiveSection] = useState('logo');
  const [previewOffset, setPreviewOffset] = useState(0);

  const palettes = [
    { bg: '#0F172A', text: '#F8FAFC', accent: '#3B82F6', logo: '#60A5FA', primary: '#1E293B', name: 'Midnight Blue' },
    { bg: '#FAF8F5', text: '#1A1A1A', accent: '#D4AF37', logo: '#D4AF37', primary: '#D4AF37', name: 'Luxury Gold' },
    { bg: '#F4EAD4', text: '#4E3629', accent: '#8D5B4C', logo: '#4E3629', primary: '#6E473B', name: 'Retro Warm' },
    { bg: '#0B3C5D', text: '#FFFFFF', accent: '#F5D76E', logo: '#FFFFFF', primary: '#328CC1', name: 'Classic Royal' },
    { bg: '#1E232A', text: '#ECF0F1', accent: '#E74C3C', logo: '#E74C3C', primary: '#34495E', name: 'Crimson Slate' },
    { bg: '#E8F5E9', text: '#1B5E20', accent: '#4CAF50', logo: '#1B5E20', primary: '#2E7D32', name: 'Mint Breeze' },
    { bg: '#FFF3E0', text: '#E65100', accent: '#FF9800', logo: '#E65100', primary: '#F57C00', name: 'Peach Velvet' },
    { bg: '#F3E5F5', text: '#4A148C', accent: '#AB47BC', logo: '#4A148C', primary: '#7B1FA2', name: 'Lavender Dreams' },
    { bg: '#E0F7FA', text: '#006064', accent: '#00ACC1', logo: '#006064', primary: '#00838F', name: 'Teal Lagoon' },
    { bg: '#FFF5F5', text: '#C53030', accent: '#E53E3E', logo: '#C53030', primary: '#9B2C2C', name: 'Coral Pop' },
    { bg: '#080710', text: '#F8FAFC', accent: '#00E5FF', logo: '#00E5FF', primary: '#111', name: 'Neon Cyberpunk' },
    { bg: '#FAF9F6', text: '#2C3E50', accent: '#7F8C8D', logo: '#2C3E50', primary: '#95A5A6', name: 'Minimalist Ivory' }
  ];
  useEffect(() => {
    const updateOffset = () => {
      const idMap = {
        logo: 'editor-logo-section',
        header: 'editor-header-section',
        qr: 'editor-qr-section',
        phone: 'editor-phone-section',
        footer: 'editor-footer-section'
      };
      const elementId = idMap[activeSection];
      if (!elementId) return;
      const element = document.getElementById(elementId);
      if (element) {
        setPreviewOffset(element.offsetTop);
      }
    };

    updateOffset();
    
    const t1 = setTimeout(updateOffset, 50);
    const t2 = setTimeout(updateOffset, 150);
    const t3 = setTimeout(updateOffset, 300);

    window.addEventListener('resize', updateOffset);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', updateOffset);
    };
  }, [activeSection, plateStyle]);

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) {
      alert('Por favor, insira um nome para o estilo.');
      return;
    }
    const newPreset = {
      id: 'preset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name: newPresetName.trim(),
      style: { ...plateStyle }
    };
    const updatedPresets = [...savedPresets, newPreset];
    setSavedPresets(updatedPresets);
    setNewPresetName('');

    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify({ 
          key: 'plate_presets', 
          value: JSON.stringify(updatedPresets) 
        })
      });
      if (res.ok) {
        alert(`Estilo "${newPreset.name}" salvo com sucesso como preset!`);
      } else {
        alert('Erro ao persistir preset no servidor.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar preset.');
    }
  };

  const handleApplyPreset = async (preset) => {
    const updatedStyle = { ...plateStyle, ...preset.style };
    setPlateStyle(updatedStyle);

    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify({ 
          key: 'plate_style', 
          value: JSON.stringify(updatedStyle) 
        })
      });
      if (res.ok) {
        alert(`Estilo do preset "${preset.name}" aplicado e salvo com sucesso para todos os usuários!`);
      } else {
        alert('Preset aplicado localmente, mas erro ao salvar no servidor.');
      }
    } catch (err) {
      console.error(err);
      alert('Preset aplicado localmente, mas erro de conexão ao salvar.');
    }
  };

  const handleDeletePreset = async (presetId) => {
    if (!confirm('Excluir este estilo salvo?')) return;
    const updatedPresets = savedPresets.filter(p => p.id !== presetId);
    setSavedPresets(updatedPresets);

    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify({ 
          key: 'plate_presets', 
          value: JSON.stringify(updatedPresets) 
        })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRandomizeStyle = () => {
    const templates = [
      'standard', 'minimalist', 'premiumDark', 'aurora', 'bento', 
      'splitDiagonal', 'neonCyberpunk', 'classicStreet', 'luxuryMarble', 
      'carbonFiber', 'vintage', 'cleanCorporate', 'abstractGeometric', 
      'giantCenteredQR', 'glassmorphism'
    ];
    const fonts = ['Inter', 'Outfit', 'Montserrat', 'Playfair Display', 'Fira Code', 'Space Grotesk', 'Cinzel'];
    const textures = ['none', 'dots', 'grid', 'stripes'];
    const shadows = ['none', 'soft', 'medium', 'hard'];
    const borders = ['solid', 'dashed', 'double', 'dotted'];
    
    const templateId = templates[Math.floor(Math.random() * templates.length)];
    const fontFamily = fonts[Math.floor(Math.random() * fonts.length)];
    const backgroundPattern = textures[Math.floor(Math.random() * textures.length)];
    const shadowDepth = shadows[Math.floor(Math.random() * shadows.length)];
    const borderStyle = borders[Math.floor(Math.random() * borders.length)];
    
    const logoPosition = [
      'top-left', 'top-center', 'top-right', 
      'mid-left', 'mid-center', 'mid-right', 
      'bottom-left', 'bottom-center', 'bottom-right'
    ][Math.floor(Math.random() * 9)];
    
    const palette = palettes[Math.floor(Math.random() * palettes.length)];
    const showBorder = Math.random() > 0.4;
    const qrRadius = ['0px', '8px', '16px', '24px', '32px', '50%'][Math.floor(Math.random() * 6)];
    const showPhoneIllustration = Math.random() > 0.4;
    const logoSize = Math.floor(Math.random() * 30) + 24; // 24 to 54
    
    const newStyle = {
      ...plateStyle,
      templateId,
      fontFamily,
      backgroundPattern,
      shadowDepth,
      borderStyle,
      logoPosition,
      logoSize,
      showPhoneIllustration,
      qrRadius,
      backgroundColor: palette.bg,
      textColor: palette.text,
      accentColor: palette.accent,
      logoColor: palette.logo,
      primaryColor: palette.primary,
      showBorder,
      borderColor: palette.accent,
      borderWidth: '4px',
      qrBgColor: '#FFFFFF',
      qrFgColor: '#000000'
    };

    if (templateId === 'neonCyberpunk') {
      newStyle.backgroundColor = '#05050A';
      newStyle.textColor = '#F8FAFC';
      newStyle.accentColor = palette.accent;
      newStyle.qrBgColor = '#0B0B14';
      newStyle.qrFgColor = palette.accent;
    } else if (templateId === 'premiumDark') {
      newStyle.backgroundColor = '#0F172A';
      newStyle.textColor = '#F8FAFC';
      newStyle.qrBgColor = '#1E293B';
      newStyle.qrFgColor = '#FFFFFF';
    } else if (templateId === 'glassmorphism' || templateId === 'aurora') {
      newStyle.textColor = '#FFFFFF';
      newStyle.accentColor = '#FFFFFF';
      newStyle.qrBgColor = 'rgba(255,255,255,0.9)';
      newStyle.qrFgColor = '#0F172A';
    }

    setPlateStyle(newStyle);
  };

  const scrollToField = (sectionId) => {
    const idMap = {
      logo: 'editor-logo-section',
      header: 'editor-header-section',
      qr: 'editor-qr-section',
      phone: 'editor-phone-section',
      footer: 'editor-footer-section'
    };
    const elementId = idMap[sectionId];
    if (!elementId) return;
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      element.style.transition = 'all 0.3s ease-in-out';
      element.style.outline = '3px solid #3B82F6';
      element.style.outlineOffset = '4px';
      element.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.4)';
      
      setTimeout(() => {
        element.style.outline = 'none';
        element.style.boxShadow = 'none';
      }, 1500);

      const input = element.querySelector('input, select, textarea');
      if (input) {
        input.focus();
      }
    }
  };

  const handleSaveStyle = async () => {
    setSavingStyle(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify({ 
          key: 'plate_style', 
          value: JSON.stringify(plateStyle) 
        })
      });
      if (res.ok) {
        alert('Visual das placas atualizado com sucesso para todos os usuários!');
      } else {
        alert('Erro ao salvar visual das placas.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar.');
    } finally {
      setSavingStyle(false);
    }
  };

  const handleToggleSelectAll = () => {
    const list = properties || [];
    if (selectedPlates.length === list.length) {
      setSelectedPlates([]);
    } else {
      setSelectedPlates(list.map(p => p.id));
    }
  };

  const handleToggleSelectClient = (id) => {
    if (selectedPlates.includes(id)) {
      setSelectedPlates(selectedPlates.filter(pid => pid !== id));
    } else {
      setSelectedPlates([...selectedPlates, id]);
    }
  };

  const handlePrintSelected = () => {
    if (selectedPlates.length === 0) {
      alert('Selecione pelo menos uma placa para imprimir.');
      return;
    }
    window.print();
  };

  const fetchProperties = async () => {
    setLoadingProperties(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/master/properties`, { headers: { 'Authorization': token } });
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (err) {
      console.error('[Properties] Erro ao buscar:', err);
    } finally {
      setLoadingProperties(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'properties' || activeTab === 'production') {
      fetchProperties();
    }
    if (activeTab === 'demo') {
      fetchDemoUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchGlobalSettings = async () => {
      try {
        const res = await fetch(`${API}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.plate_style) {
            setPlateStyle(prev => ({ ...prev, ...data.plate_style }));
          }
          if (data.plate_presets) {
            try {
              setSavedPresets(JSON.parse(data.plate_presets));
            } catch (e) {
              setSavedPresets([]);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de estilo:', err);
      }
    };
    fetchGlobalSettings();
  }, []);

  // Suporte a Modo Noturno (Dark Mode)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('cd_dark_mode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('cd_dark_mode', 'true');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('cd_dark_mode', 'false');
    }
  }, [darkMode]);

  // Configurações globais de sistema
  const [planPrice, setPlanPrice] = useState('39.90');
  const [savingSettings, setSavingSettings] = useState(false);

  // Estados para o Banner de Parcerias
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerDesc, setBannerDesc] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerBtnText, setBannerBtnText] = useState('');
  const [bannerPreset, setBannerPreset] = useState('internet');
  const [bannerCustomUrl, setBannerCustomUrl] = useState('');
  const [savingBanner, setSavingBanner] = useState(false);

  // Estados para Parceiros Locais
  const [localPartners, setLocalPartners] = useState([]);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerCategory, setNewPartnerCategory] = useState('image');
  const [newPartnerTel, setNewPartnerTel] = useState('');
  const [newPartnerImg, setNewPartnerImg] = useState('');
  const [newPartnerTag, setNewPartnerTag] = useState('WhatsApp');
  const [savingPartners, setSavingPartners] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setNewPartnerImg(event.target.result);
      if (file.type.startsWith('video/')) {
        setNewPartnerCategory('video');
      } else {
        setNewPartnerCategory('image');
      }
      setFileLoading(false);
    };
    reader.onerror = () => {
      alert('Erro ao ler o arquivo.');
      setFileLoading(false);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const token = localStorage.getItem('cd_token');
    if (!token) {
      navigate('/auth');
      return;
    }
    fetchUsers();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API}/api/settings`);
      const data = await res.json();
      if (data.plan_price) setPlanPrice(data.plan_price);
      if (data.partner_banner) {
        try {
          const parsed = JSON.parse(data.partner_banner);
          setBannerEnabled(parsed.enabled ?? false);
          setBannerTitle(parsed.title || '');
          setBannerDesc(parsed.description || '');
          setBannerLink(parsed.link || '');
          setBannerBtnText(parsed.btnText || '');
          setBannerPreset(parsed.imagePreset || 'internet');
          setBannerCustomUrl(parsed.imageUrl || '');
        } catch (e) {
          console.error('[Settings] Erro ao parsear banner:', e);
        }
      }
      if (data.local_partners) {
        try {
          const parsed = JSON.parse(data.local_partners);
          setLocalPartners(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          console.error('[Settings] Erro ao parsear parceiros locais:', e);
          setLocalPartners([]);
        }
      } else {
        setLocalPartners([]);
      }
    } catch (err) {
      console.error('[Settings] Erro ao buscar:', err);
    }
  };

  const handleSaveBannerSettings = async (e) => {
    e.preventDefault();
    setSavingBanner(true);
    try {
      const token = localStorage.getItem('cd_token');
      const bannerData = {
        enabled: bannerEnabled,
        title: bannerTitle,
        description: bannerDesc,
        link: bannerLink,
        btnText: bannerBtnText,
        imagePreset: bannerPreset,
        imageUrl: bannerPreset === 'custom' ? bannerCustomUrl : PRESETS[bannerPreset]
      };

      const res = await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          key: 'partner_banner',
          value: JSON.stringify(bannerData)
        })
      });

      if (res.ok) {
        alert('Configuração de banner salva com sucesso!');
      } else {
        alert('Erro ao salvar configuração de banner.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar.');
    } finally {
      setSavingBanner(false);
    }
  };

  const handleAddLocalPartner = async (e) => {
    e.preventDefault();

    const newPartner = {
      id: Date.now().toString(),
      name: newPartnerName.trim(),
      category: newPartnerCategory, // 'image' or 'video'
      rating: 5.0,
      dist: '',
      tel: newPartnerTel.trim(),
      img: newPartnerImg.trim(),
      tag: newPartnerTag.trim() || 'WhatsApp'
    };

    const updatedPartners = [...localPartners, newPartner];
    await saveLocalPartners(updatedPartners);
    
    // Reset form
    setNewPartnerName('');
    setNewPartnerTel('');
    setNewPartnerImg('');
    setNewPartnerTag('WhatsApp');
    setShowAddPartner(false);
  };

  const handleDeleteLocalPartner = async (id) => {
    if (!window.confirm('Excluir este parceiro local?')) return;
    const updatedPartners = localPartners.filter(p => p.id !== id);
    await saveLocalPartners(updatedPartners);
  };

  const saveLocalPartners = async (updatedList) => {
    setSavingPartners(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          key: 'local_partners',
          value: JSON.stringify(updatedList)
        })
      });
      if (res.ok) {
        setLocalPartners(updatedList);
      } else {
        alert('Erro ao salvar parceiros locais no banco.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar parceiros.');
    } finally {
      setSavingPartners(false);
    }
  };

  const fetchDemoUsers = async () => {
    setLoadingDemo(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/master/demo/users`, { headers: { 'Authorization': token } });
      if (res.ok) setDemoUsers(await res.json());
    } catch (err) { console.error('[Demo]', err); }
    setLoadingDemo(false);
  };

  const setupDemo = async () => {
    setSettingUpDemo(true);
    setDemoFeedback(null);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/master/demo/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok) {
        setDemoFeedback({ type: 'success', text: 'Dados de demonstração criados/atualizados com sucesso!' });
        fetchDemoUsers();
      } else {
        setDemoFeedback({ type: 'error', text: data.error || 'Erro ao configurar demo.' });
      }
    } catch { setDemoFeedback({ type: 'error', text: 'Erro de conexão.' }); }
    setSettingUpDemo(false);
    setTimeout(() => setDemoFeedback(null), 5000);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ key: 'plan_price', value: planPrice })
      });
      if (res.ok) {
        alert('Configuração salva com sucesso!');
      } else {
        alert('Erro ao salvar configuração.');
      }
    } catch {
      alert('Erro de conexão ao salvar.');
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/master/users`, { headers: { 'Authorization': token } });
      if (res.status === 401 || res.status === 403) {
        [
          'residentUnitId', 'residentName', 'residentPropertyName', 'residentPropertyId', 'residentAccessCode',
          'cd_unit_name', 'cd_quick_msgs', 'cd_read_msgs', 'cd_user_id', 'cd_token',
          'cd_doorman_email', 'cd_doorman_propertyId', 'cd_doorman_propertyName',
          'cd_admin_email', 'cd_admin_role', 'cd_admin_propertyId', 'cd_admin_clientCode', 'cd_admin_propertyName',
          'cd_admin_name', 'cd_admin_password', 'cd_property_type'
        ].forEach(k => localStorage.removeItem(k));
        navigate('/auth');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleModule = async (userId, module, currentVal) => {
    try {
      const token = localStorage.getItem('cd_token');
      await fetch(`${API}/api/master/users/${userId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ [module]: !currentVal })
      });
      fetchUsers();
    } catch (err) { console.error(err); }
  };

  const giveFreeMonth = async (userId) => {
    if (!window.confirm('Dar 1 mês grátis?')) return;
    const token = localStorage.getItem('cd_token');
    const res = await fetch(`${API}/api/master/users/${userId}/promo`, { method: 'POST', headers: { 'Authorization': token } });
    if (res.ok) { alert('Promoção ativada!'); fetchUsers(); }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este usuário e todos os seus dados? Esta ação não pode ser desfeita.')) return;
    const token = localStorage.getItem('cd_token');
    try {
      const res = await fetch(`${API}/api/master/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        alert('Usuário excluído com sucesso!');
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir usuário.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao excluir usuário.');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('cd_token');
    try {
      const res = await fetch(`${API}/api/master/users/${editModal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          name: editModal.name,
          email: editModal.email,
          phone: editModal.phone,
          password: editModal.password
        })
      });
      if (res.ok) {
        alert('Usuário atualizado com sucesso!');
        setEditModal(null);
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao atualizar usuário.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao atualizar usuário.');
    }
  };

  // Gerar QR Code a partir de texto
  const loadQrCode = async (text, isPlate = false) => {
    if (!text) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const finalUrl = isPlate 
      ? `${baseUrl}#/auth?plate=${text}`
      : `${baseUrl}#/chamada/${text}`; // Aqui text será o ID da propriedade/unidade
    
    try {
      const res = await fetch(`${API}/api/qrcode?text=${encodeURIComponent(finalUrl)}&json=true`);
      const data = await res.json();
      setQrImage(data.qrcode || '');
    } catch { setQrImage(''); }
  };

  // Opção 2: gerar clientCode para o usuário
  const generateClientCode = async (userId) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/master/users/${userId}/generate-client-code`, {
        method: 'POST', headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (data.clientCode) {
        await fetchUsers();
        const updated = users.map(u => u.id === userId ? { ...u, clientCode: data.clientCode } : u);
        const user = updated.find(u => u.id === userId) || { ...qrModal.user, clientCode: data.clientCode };
        setQrModal(m => ({ ...m, user: { ...m.user, clientCode: data.clientCode } }));
        // Se o usuário tem uma propriedade, usamos o ID dela para o QR de chamada
        const propId = data.propertyId || userId; 
        await loadQrCode(propId, false);
      }
    } catch { alert('Erro ao gerar código.'); }
    finally { setActionLoading(false); }
  };

  // Opção 1: definir plateCode para o usuário
  const setPlateCode = async (userId) => {
    if (!plateInput.trim()) return alert('Digite o código da placa.');
    setActionLoading(true);
    try {
      const token = localStorage.getItem('cd_token');
      const res = await fetch(`${API}/api/master/users/${userId}/set-plate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ plateCode: plateInput.trim().toUpperCase() })
      });
      const data = await res.json();
      if (res.ok) {
        setQrModal(m => ({ ...m, user: { ...m.user, plateCode: data.plateCode } }));
        await loadQrCode(data.plateCode, true);
        fetchUsers();
      } else {
        alert(data.error || 'Erro ao definir placa.');
      }
    } catch { alert('Erro de conexão.'); }
    finally { setActionLoading(false); }
  };

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const downloadQr = (name) => {
    const a = document.createElement('a');
    a.href = qrImage;
    a.download = `QR_${name}.png`;
    a.click();
  };

  const openQrModal = async (user, mode) => {
    setQrModal({ user, mode });
    setPlateInput('');
    setQrImage('');
    // Se já tem código, carrega o QR automaticamente
    if (mode === 'option2') {
      // Para o cliente, tentamos pegar o ID da propriedade dele
      const propId = user.properties?.[0]?.id || user.id;
      await loadQrCode(propId, false);
    }
    if (mode === 'option1' && user.plateCode) {
      await loadQrCode(user.plateCode, true);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const addressMatch = u.propertiesManaged?.some(p => p.clientAddress?.toLowerCase().includes(q));
    return u.name?.toLowerCase().includes(q) ||
           u.email?.toLowerCase().includes(q) ||
           u.phone?.includes(searchQuery) ||
           addressMatch;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--text-main)', display: 'flex', fontFamily: 'Inter, sans-serif', transition: 'background-color 0.3s, color 0.3s' }}>

      {/* SIDEBAR */}
      <aside style={{ width: '260px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', transition: 'background-color 0.3s, border-color 0.3s' }}>
        <div style={{ padding: '20px 24px' }}><Logo size={38} /></div>
        <nav style={{ padding: '0 12px', flex: 1 }}>
          <SidebarLink icon={Users} label="Usuários & Módulos" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <SidebarLink icon={Building2} label="Propriedades" active={activeTab === 'properties'} onClick={() => setActiveTab('properties')} />
          <SidebarLink icon={QrCode} label="Produção de Placas" active={activeTab === 'production'} onClick={() => setActiveTab('production')} />
          <SidebarLink icon={Sparkles} label="Demonstração" active={activeTab === 'demo'} onClick={() => setActiveTab('demo')} />
          <SidebarLink icon={Gift} label="Promoções" active={activeTab === 'promos'} onClick={() => setActiveTab('promos')} />
          <SidebarLink icon={History} label="Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <SidebarLink icon={Settings2} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, paddingLeft: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            👤 Logado como: <strong style={{ color: 'var(--text-main)' }}>{localStorage.getItem('cd_admin_email') || localStorage.getItem('cd_user_contact') || 'Master Admin'}</strong>
          </div>

          {/* Dark Mode Toggle */}
          <button type="button" onClick={() => setDarkMode(!darkMode)} style={{ 
            width: '100%', 
            padding: '12px', 
            borderRadius: '12px', 
            border: 'none', 
            color: 'var(--text-muted)', 
            background: 'var(--bg-deep)', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '4px'
          }}>
            {darkMode ? <><Sun size={14} color="#F59E0B" /> Modo Claro</> : <><Moon size={14} color="#3B82F6" /> Modo Noturno</>}
          </button>

          <button onClick={() => {
            [
              'residentUnitId', 'residentName', 'residentPropertyName', 'residentPropertyId', 'residentAccessCode',
              'cd_unit_name', 'cd_quick_msgs', 'cd_read_msgs', 'cd_user_id', 'cd_token',
              'cd_doorman_email', 'cd_doorman_propertyId', 'cd_doorman_propertyName',
              'cd_admin_email', 'cd_admin_role', 'cd_admin_propertyId', 'cd_admin_clientCode', 'cd_admin_propertyName',
              'cd_admin_name', 'cd_admin_password', 'cd_property_type', 'cd_is_super_admin'
            ].forEach(k => localStorage.removeItem(k));
            document.body.classList.remove('dark-theme');
            navigate('/auth');
          }} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', color: '#DC2626', background: 'rgba(239, 68, 68, 0.08)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
            <LogOut size={16} /> Sair do Painel
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-1px', margin: 0 }}>
              {activeTab === 'users' ? 'Usuários & QR Codes' : 
               activeTab === 'production' ? 'Produção de Placas' : 'Controle Master'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '4px' }}>Gerencie permissões, QR Codes e placas dos clientes.</p>
          </div>
          <button onClick={fetchUsers} style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <RefreshCw size={20} />
          </button>
        </header>

        {/* SEARCH */}
        <div style={{ marginBottom: '24px', background: 'var(--bg-surface)', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-subtle)', display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" placeholder="Buscar por nome, email ou celular..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 42px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--bg-deep)', color: 'var(--text-main)', outline: 'none', fontSize: '14px' }} />
          </div>
        </div>

        {/* USERS TABLE */}
        {activeTab === 'users' && (
          <div style={{ background: 'var(--bg-surface)', borderRadius: '20px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--bg-deep)' }}>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '18px 24px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuário</th>
                  <th style={{ padding: '18px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Módulos</th>
                  <th style={{ padding: '18px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>QR Code</th>
                  <th style={{ padding: '18px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trial</th>
                  <th style={{ padding: '18px 24px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Carregando...</td></tr>
                ) : filteredUsers.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '18px 24px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '15px' }}>{user.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{user.email || user.phone}</span>
                        <span style={{ color: 'var(--border-subtle)' }}>|</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Senha:</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)' }}>
                          {visiblePassMap[user.id] ? user.password : '••••••'}
                        </span>
                        <button onClick={() => setVisiblePassMap(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                          style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                          {visiblePassMap[user.id] ? 'ocultar' : 'revelar'}
                        </button>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Desde {new Date(user.createdAt).toLocaleDateString('pt-BR')}</div>
                    </td>
                    <td style={{ padding: '18px 24px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '280px' }}>
                        <ModuleBadge label="Cliente Final" active={user.isResident} onClick={() => toggleModule(user.id, 'isResident', user.isResident)} />
                        <ModuleBadge label="Admin de Vilas" active={user.isVilaAdmin} onClick={() => toggleModule(user.id, 'isVilaAdmin', user.isVilaAdmin)} />
                        <ModuleBadge label="Admin Condo" active={user.isAdmin} onClick={() => toggleModule(user.id, 'isAdmin', user.isAdmin)} />
                        <ModuleBadge label="Portaria" active={user.isDoorman} onClick={() => toggleModule(user.id, 'isDoorman', user.isDoorman)} />
                        <ModuleBadge label="Revendedor" active={user.isReseller} onClick={() => toggleModule(user.id, 'isReseller', user.isReseller)} />
                        <ModuleBadge label="Morador de Casas" active={user.isHouseResident} onClick={() => toggleModule(user.id, 'isHouseResident', user.isHouseResident)} />
                        <ModuleBadge label="Morador Vilas/Condomínios" active={user.isCondoResident} onClick={() => toggleModule(user.id, 'isCondoResident', user.isCondoResident)} />
                      </div>
                    </td>
                    <td style={{ padding: '18px 24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* Opção 1: Placa Pré-configurada */}
                        <button onClick={() => openQrModal(user, 'option1')}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: `1px solid ${user.plateCode ? '#10B981' : '#E2E8F0'}`, background: user.plateCode ? 'rgba(16,185,129,0.06)' : '#F8FAFC', color: user.plateCode ? '#047857' : '#64748B', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                          <Layers size={13} /> Placa Física {user.plateCode ? '✓' : '—'}
                        </button>
                        {/* Opção 2: QR gerado pelo cliente */}
                        <button onClick={() => openQrModal(user, 'option2')}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: `1px solid ${user.clientCode ? '#3B82F6' : '#E2E8F0'}`, background: user.clientCode ? 'rgba(59,130,246,0.06)' : '#F8FAFC', color: user.clientCode ? '#1D4ED8' : '#64748B', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                          <QrCode size={13} /> QR do Cliente {user.clientCode ? '✓' : '—'}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '18px 24px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: user.trialEndsAt && new Date(user.trialEndsAt) > new Date() ? '#10B981' : '#EF4444' }}>
                        {user.trialEndsAt ? `Exp. ${new Date(user.trialEndsAt).toLocaleDateString('pt-BR')}` : 'Vitalício'}
                      </div>
                    </td>
                    <td style={{ padding: '18px 24px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button onClick={() => giveFreeMonth(user.id)} title="Dar +1 Mês Grátis"
                          style={{ padding: '8px 12px', borderRadius: '10px', background: '#3B82F6', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          +1 Mês
                        </button>
                        <button onClick={() => setEditModal(user)} title="Editar dados e senha"
                          style={{ padding: '8px 12px', borderRadius: '10px', background: '#F59E0B', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Editar
                        </button>
                        <button onClick={() => deleteUser(user.id)} title="Excluir Usuário"
                          style={{ padding: '8px 12px', borderRadius: '10px', background: '#EF4444', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'settings' && (() => {
          const partnersList = Array.isArray(localPartners) ? localPartners : [];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
              {/* 1. CONFIGURAÇÕES DE PREÇO */}
              <div style={{ background: 'var(--bg-surface)', borderRadius: '24px', border: '1px solid var(--border-subtle)', padding: '36px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                <div style={{ marginBottom: '32px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '20px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>⚙️ Configurações do Sistema</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px', margin: 0 }}>Gerencie as preferências globais e precificação da plataforma Campainha Digital.</p>
                </div>

                <form onSubmit={handleSaveSettings} style={{ maxWidth: '480px' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Preço do Plano Anual (moradores)
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '16px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '15px' }}>R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="39.90"
                        value={planPrice}
                        onChange={e => setPlanPrice(e.target.value)}
                        required
                        style={{
                          width: '100%', padding: '14px 16px 14px 44px', borderRadius: '12px', border: '2px solid var(--border-subtle)',
                          fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', background: 'var(--bg-deep)', outline: 'none', transition: 'border-color 0.2s',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                        }}
                      />
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px', lineHeight: 1.4 }}>
                      Este valor será exibido no fluxo de cadastro dos moradores e será cobrado dinamicamente via Mercado Pago (PIX e Cartão de Crédito).
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={savingSettings}
                    style={{
                      background: '#3B82F6', color: '#FFF', border: 'none', padding: '14px 28px', borderRadius: '12px',
                      fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                      gap: '8px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)', transition: 'all 0.2s',
                      opacity: savingSettings ? 0.7 : 1
                    }}
                  >
                    {savingSettings ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </form>
              </div>



              {/* 3. CONFIGURAÇÕES DE PARCEIROS LOCAIS */}
              <div style={{ background: 'var(--bg-surface)', borderRadius: '24px', border: '1px solid var(--border-subtle)', padding: '36px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={20} color="#3B82F6" /> 🏪 Parceiros Locais
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px', margin: 0 }}>Gerencie a lista de comércios parceiros exibidos na aba de moradores.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddPartner(!showAddPartner)}
                    style={{
                      background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#FFF', border: 'none', padding: '10px 18px', borderRadius: '10px',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Plus size={16} />
                    {showAddPartner ? 'Fechar Formulário' : 'Novo Parceiro'}
                  </button>
                </div>

                {/* Form to Add Partner */}
                {showAddPartner && (
                  <form onSubmit={handleAddLocalPartner} style={{ background: 'var(--bg-deep)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-subtle)', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Cadastrar Novo Anúncio / Parceiro</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Título / Descrição (Opcional)</label>
                        <input 
                          type="text" 
                          value={newPartnerName} 
                          onChange={e => setNewPartnerName(e.target.value)} 
                          placeholder="Ex: Internet Fibra Óptica 500 Mega" 
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Tipo de Mídia</label>
                        <select 
                          value={newPartnerCategory} 
                          onChange={e => setNewPartnerCategory(e.target.value)} 
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                        >
                          <option value="image">Imagem 🖼️</option>
                          <option value="video">Vídeo (MP4) 🎥</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Texto da Tag / Botão</label>
                        <input 
                          type="text" 
                          value={newPartnerTag} 
                          onChange={e => setNewPartnerTag(e.target.value)} 
                          placeholder="Ex: WhatsApp, Ver Site, Promoção" 
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Link de Ação / WhatsApp / Site (Opcional)</label>
                        <input 
                          type="text" 
                          value={newPartnerTel} 
                          onChange={e => setNewPartnerTel(e.target.value)} 
                          placeholder="Ex: https://wa.me/5511999998888 ou (11) 99999-8888" 
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Subir Arquivo (Imagem ou Vídeo)</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <input 
                            type="file" 
                            accept="image/*,video/*" 
                            onChange={handleFileChange}
                            required={!newPartnerImg}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                          />
                          {fileLoading && (
                            <span style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 700 }}>
                              Lendo arquivo...
                            </span>
                          )}
                          {!fileLoading && newPartnerImg && (
                            <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>
                              ✓ Pronto ({newPartnerCategory === 'video' ? 'Vídeo' : 'Imagem'})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      style={{
                        alignSelf: 'flex-start',
                        background: '#3B82F6', color: '#FFF', border: 'none', padding: '10px 20px', borderRadius: '8px',
                        fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <Plus size={14} /> Cadastrar Anúncio
                    </button>
                  </form>
                )}

                {/* Table / List of existing partners */}
                {partnersList.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', border: '2px dashed var(--border-subtle)', borderRadius: '16px' }}>
                    Nenhum anúncio ou parceiro cadastrado ainda.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ background: 'var(--bg-deep)' }}>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mídia</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Título / Descrição</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tipo</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tag / Botão</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Link / Ação</th>
                          <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partnersList.map((partner, index) => {
                          const isVideo = partner.category === 'video';
                          return (
                            <tr key={partner.id || index} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '12px 16px' }}>
                                {isVideo ? (
                                  <video src={partner.img} style={{ width: '60px', height: '45px', borderRadius: '6px', objectFit: 'cover', background: '#000' }} muted />
                                ) : (
                                  <img src={partner.img} alt={partner.name} style={{ width: '60px', height: '45px', borderRadius: '6px', objectFit: 'cover' }} />
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{partner.name || 'Sem título'}</td>
                              <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <span style={{ padding: '4px 8px', borderRadius: '12px', background: 'var(--bg-deep)', fontSize: '11px', fontWeight: 700 }}>
                                  {isVideo ? '🎥 Vídeo' : '🖼️ Imagem'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <span style={{ padding: '4px 8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', fontSize: '11px', fontWeight: 700 }}>
                                  {partner.tag || 'WhatsApp'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{partner.tel || 'Nenhum'}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLocalPartner(partner.id)}
                                  disabled={savingPartners}
                                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                                  title="Excluir parceiro"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {activeTab === 'production' && (
          <div style={{ padding: '10px' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px', gap: '24px' }}>
              <button 
                onClick={() => setPlatesSubTab('lab')} 
                style={{ 
                  padding: '12px 16px', 
                  background: 'none', 
                  border: 'none', 
                  borderBottom: platesSubTab === 'lab' ? '2px solid #3B82F6' : '2px solid transparent', 
                  color: platesSubTab === 'lab' ? '#3B82F6' : 'var(--text-muted)', 
                  fontWeight: 700, 
                  cursor: 'pointer' 
                }}
              >
                Laboratório de Estilização
              </button>
              <button 
                onClick={() => setPlatesSubTab('production')} 
                style={{ 
                  padding: '12px 16px', 
                  background: 'none', 
                  border: 'none', 
                  borderBottom: platesSubTab === 'production' ? '2px solid #3B82F6' : '2px solid transparent', 
                  color: platesSubTab === 'production' ? '#3B82F6' : 'var(--text-muted)', 
                  fontWeight: 700, 
                  cursor: 'pointer' 
                }}
              >
                Impressão em Lote (Clientes)
              </button>
              <button 
                onClick={() => setPlatesSubTab('sequential')} 
                style={{ 
                  padding: '12px 16px', 
                  background: 'none', 
                  border: 'none', 
                  borderBottom: platesSubTab === 'sequential' ? '2px solid #3B82F6' : '2px solid transparent', 
                  color: platesSubTab === 'sequential' ? '#3B82F6' : 'var(--text-muted)', 
                  fontWeight: 700, 
                  cursor: 'pointer' 
                }}
              >
                Produzir Placas (Sequencial)
              </button>
            </div>

            {platesSubTab === 'lab' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '40px', position: 'relative' }}>
                {/* Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Settings size={18} color="#3B82F6" />
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>Configuração Visual Avançada</h3>
                    </div>
                    {/* Estilo Aleatorio */}
                    <button
                      type="button"
                      onClick={handleRandomizeStyle}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
                        color: '#FFF',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 10px rgba(139, 92, 246, 0.2)'
                      }}
                      title="Gera uma combinação harmônica aleatória de cores e templates"
                    >
                      ✨ Estilo Aleatório
                    </button>
                  </div>

                  {/* PRESETS DE ESTILO SALVOS */}
                  <div style={{ padding: '16px', background: 'var(--bg-deep)', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>PRESETS E ESTILOS SALVOS</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{savedPresets.length} salvos</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Nome do novo preset (ex: Royal Gold)..."
                        value={newPresetName}
                        onChange={e => setNewPresetName(e.target.value)}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={handleSavePreset}
                        style={{ padding: '8px 14px', borderRadius: '8px', background: '#10B981', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                      >
                        Salvar Preset
                      </button>
                    </div>

                    {savedPresets.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                        {savedPresets.map((preset) => (
                          <div
                            key={preset.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                          >
                            <span
                              onClick={() => handleApplyPreset(preset)}
                              style={{ cursor: 'pointer', color: 'var(--text-main)' }}
                              title="Clique para aplicar"
                            >
                              📁 {preset.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeletePreset(preset.id)}
                              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0 2px', fontSize: '12px', fontWeight: 800 }}
                              title="Excluir preset"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* TAMANHO E PROPORÇÃO DA PLACA */}
                  <div style={{ padding: '16px', background: 'var(--bg-deep)', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-main)' }}>DIMENSIONAMENTO DA PLACA (PARA IMPRESSÃO)</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Formato do Tamanho</label>
                        <select
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                          value={plateStyle.plateSizeFormat || 'a4'}
                          onChange={e => setPlateStyle({ ...plateStyle, plateSizeFormat: e.target.value })}
                        >
                          <option value="a4">Placa A4 Padrão (21 x 29.7 cm)</option>
                          <option value="a5">Placa A5 Média (14.8 x 21 cm)</option>
                          <option value="a6">Placa A6 De Bolso (10.5 x 14.8 cm)</option>
                          <option value="square">Placa Quadrada (20 x 20 cm)</option>
                          <option value="custom">Dimensões Personalizadas</option>
                        </select>
                      </div>

                      {plateStyle.plateSizeFormat === 'custom' && (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                          <div style={{ width: '33%' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>Largura</label>
                            <input
                              type="number"
                              step="0.1"
                              value={plateStyle.plateWidthCustom || 21}
                              onChange={e => setPlateStyle({ ...plateStyle, plateWidthCustom: parseFloat(e.target.value) || 0 })}
                              style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '11px', textAlign: 'center' }}
                            />
                          </div>
                          <div style={{ width: '33%' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>Altura</label>
                            <input
                              type="number"
                              step="0.1"
                              value={plateStyle.plateHeightCustom || 29.7}
                              onChange={e => setPlateStyle({ ...plateStyle, plateHeightCustom: parseFloat(e.target.value) || 0 })}
                              style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '11px', textAlign: 'center' }}
                            />
                          </div>
                          <div style={{ width: '34%' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>Unidade</label>
                            <select
                              value={plateStyle.plateSizeUnit || 'cm'}
                              onChange={e => setPlateStyle({ ...plateStyle, plateSizeUnit: e.target.value })}
                              style={{ width: '100%', padding: '7px 4px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '11px', cursor: 'pointer' }}
                            >
                              <option value="cm">cm</option>
                              <option value="mm">mm</option>
                              <option value="px">px</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 1. MODEL TEMPLATE SELECTOR */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                      MODELO DA PLACA (15 TEMPLATES)
                    </label>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                      gap: '10px', 
                      maxHeight: '200px', 
                      overflowY: 'auto', 
                      padding: '8px', 
                      background: 'var(--bg-deep)', 
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      {[
                        { id: 'standard', name: 'Padrão Moderno', desc: 'Limpo e clássico' },
                        { id: 'minimalist', name: 'Minimalista Chic', desc: 'Espaçoso e elegante' },
                        { id: 'premiumDark', name: 'Dark Premium', desc: 'Estética futurista escura' },
                        { id: 'aurora', name: 'Aurora Mesh', desc: 'Gradiente neon fluido' },
                        { id: 'bento', name: 'Bento Grid', desc: 'Blocos modulares' },
                        { id: 'splitDiagonal', name: 'Divisão Diagonal', desc: 'Bipartido moderno' },
                        { id: 'neonCyberpunk', name: 'Cyberpunk Glow', desc: 'Brilho neon de alta tech' },
                        { id: 'classicStreet', name: 'Placa de Rua', desc: 'Clássico tradicional' },
                        { id: 'luxuryMarble', name: 'Mármore Imperial', desc: 'Luxuoso com dourados' },
                        { id: 'carbonFiber', name: 'Fibra de Carbono', desc: 'Industrial e robusto' },
                        { id: 'vintage', name: 'Retrô Vintage', desc: 'Acolhedor em tons creme' },
                        { id: 'cleanCorporate', name: 'Corporativo Clean', desc: 'Design executivo limpo' },
                        { id: 'abstractGeometric', name: 'Geométrico', desc: 'Formas contemporâneas' },
                        { id: 'giantCenteredQR', name: 'QR Gigante', desc: 'Foco na leitura rápida' },
                        { id: 'glassmorphism', name: 'Glassmorphism', desc: 'Vidro fosco translúcido' }
                      ].map((t) => {
                        const isSelected = plateStyle.templateId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setPlateStyle({ ...plateStyle, templateId: t.id })}
                            style={{
                              padding: '10px 8px',
                              borderRadius: '8px',
                              border: isSelected ? '2px solid #3B82F6' : '1px solid var(--border-subtle)',
                              background: isSelected ? 'rgba(59,130,246,0.08)' : 'var(--bg-surface)',
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              transition: 'all 0.2s',
                              boxShadow: isSelected ? '0 4px 6px rgba(59,130,246,0.1)' : 'none'
                            }}
                          >
                            <span style={{ fontWeight: 800, fontSize: '11px', color: isSelected ? '#3B82F6' : 'var(--text-main)' }}>{t.name}</span>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{t.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CUSTOMIZAÇÃO DE LOGO (TAMANHO, POSIÇÃO, ÍCONE & TEXTO) */}
                  <div id="editor-logo-section" onClickCapture={() => setActiveSection('logo')} onFocusCapture={() => setActiveSection('logo')} style={{ padding: '16px', background: 'var(--bg-deep)', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-main)' }}>PERSONALIZAÇÃO E ALINHAMENTO DO LOGO</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                      {/* Logo Size */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>
                          Tamanho do Logo: <strong style={{ color: 'var(--text-main)' }}>{plateStyle.logoSize || 36}px</strong>
                        </label>
                        <input
                          type="range"
                          min="16"
                          max="72"
                          value={plateStyle.logoSize || 36}
                          onChange={e => setPlateStyle({ ...plateStyle, logoSize: parseInt(e.target.value) })}
                          style={{ width: '100%', cursor: 'pointer', height: '6px', background: '#CBD5E1', borderRadius: '4px', outline: 'none' }}
                        />
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>* Tamanhos abaixo de 24px ocultam o texto</span>
                      </div>

                      {/* 9-Quadrant Position Grid */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>
                          Posição do Logo na Placa:
                        </label>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 1fr 1fr', 
                          gap: '4px', 
                          width: '108px', 
                          height: '80px', 
                          margin: '0 auto',
                          background: '#E2E8F0', 
                          padding: '4px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1'
                        }}>
                          {[
                            { pos: 'top-left', label: '↖️' }, { pos: 'top-center', label: '⬆️' }, { pos: 'top-right', label: '↗️' },
                            { pos: 'mid-left', label: '⬅️' }, { pos: 'mid-center', label: '🎯' }, { pos: 'mid-right', label: '➡️' },
                            { pos: 'bottom-left', label: '↙️' }, { pos: 'bottom-center', label: '⬇️' }, { pos: 'bottom-right', label: '↘️' }
                          ].map((gridItem) => {
                            const isSelected = (plateStyle.logoPosition || 'top-center') === gridItem.pos;
                            return (
                              <button
                                key={gridItem.pos}
                                type="button"
                                onClick={() => setPlateStyle({ ...plateStyle, logoPosition: gridItem.pos })}
                                style={{
                                  background: isSelected ? '#3B82F6' : '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                  transition: 'all 0.1s'
                                }}
                                title={`Logo posicionado em: ${gridItem.pos}`}
                              >
                                {gridItem.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Logo Custom Text & Icons */}
                    <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Texto Principal do Logo</label>
                          <input 
                            type="text"
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}
                            value={plateStyle.logoTextMain !== undefined ? plateStyle.logoTextMain : 'CAMPAINHA'} 
                            onChange={e => setPlateStyle({ ...plateStyle, logoTextMain: e.target.value })} 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Subtexto do Logo</label>
                          <input 
                            type="text"
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}
                            value={plateStyle.logoTextSub !== undefined ? plateStyle.logoTextSub : 'DIGITAL'} 
                            onChange={e => setPlateStyle({ ...plateStyle, logoTextSub: e.target.value })} 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Ícone do Logo</label>
                          <select
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                            value={plateStyle.logoIcon || 'bell'}
                            onChange={e => setPlateStyle({ ...plateStyle, logoIcon: e.target.value })}
                          >
                            <option value="bell">🔔 Sino</option>
                            <option value="home">🏠 Casa</option>
                            <option value="building">🏢 Prédio</option>
                            <option value="key">🔑 Chave</option>
                            <option value="qrcode">📱 Código QR</option>
                            <option value="none">❌ Nenhum Ícone</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Layout do Logo</label>
                          <select
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                            value={plateStyle.logoLayout || 'horizontal'}
                            onChange={e => setPlateStyle({ ...plateStyle, logoLayout: e.target.value })}
                          >
                            <option value="horizontal">↔️ Lado a Lado</option>
                            <option value="vertical">↕️ Símbolo Acima</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Cor do Logo</label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                              type="color" 
                              value={plateStyle.logoColor || '#0F172A'} 
                              onChange={e => setPlateStyle({ ...plateStyle, logoColor: e.target.value })}
                              style={{ width: '36px', height: '30px', padding: 0, border: '1px solid var(--border-subtle)', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}
                            />
                            <input 
                              type="text" 
                              value={plateStyle.logoColor || '#0F172A'} 
                              onChange={e => setPlateStyle({ ...plateStyle, logoColor: e.target.value })}
                              style={{ flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '11px', outline: 'none', fontFamily: 'monospace' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CELULAR AO LADO DO QR CODE */}
                  <div id="editor-phone-section" onClickCapture={() => setActiveSection('phone')} onFocusCapture={() => setActiveSection('phone')} style={{ padding: '16px', background: 'var(--bg-deep)', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input 
                        type="checkbox" 
                        id="showPhoneIllustration" 
                        checked={plateStyle.showPhoneIllustration || false} 
                        onChange={e => setPlateStyle({ ...plateStyle, showPhoneIllustration: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label htmlFor="showPhoneIllustration" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', cursor: 'pointer' }}>
                        VISUAL DO CELULAR AO LADO DO QR CODE (APOIO VISUAL)
                      </label>
                    </div>

                    {plateStyle.showPhoneIllustration && (
                      <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Texto de Apoio do Celular</label>
                            <input 
                              type="text"
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}
                              value={plateStyle.phoneIllustrationText !== undefined ? plateStyle.phoneIllustrationText : 'Aproxime o Celular'} 
                              onChange={e => setPlateStyle({ ...plateStyle, phoneIllustrationText: e.target.value })} 
                              placeholder="Ex: Aproxime o Celular, Use o Celular..."
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Posição Lateral do Celular</label>
                            <select
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                              value={plateStyle.phoneIllustrationPosition || 'right'}
                              onChange={e => setPlateStyle({ ...plateStyle, phoneIllustrationPosition: e.target.value })}
                            >
                              <option value="right">👉 À Direita do QR Code</option>
                              <option value="left">👈 À Esquerda do QR Code</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. TEXT CONTENT CUSTOMIZATION */}
                  <div id="editor-header-section" onClickCapture={() => setActiveSection('header')} onFocusCapture={() => setActiveSection('header')} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--bg-deep)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-main)' }}>CONTEÚDO TEXTUAL</div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Título Principal</label>
                      <input 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                        value={plateStyle.titleText} 
                        onChange={e => setPlateStyle({ ...plateStyle, titleText: e.target.value })} 
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Subtítulo / Chamada</label>
                      <input 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                        value={plateStyle.subTitleText} 
                        onChange={e => setPlateStyle({ ...plateStyle, subTitleText: e.target.value })} 
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Texto de Instruções</label>
                      <textarea 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '13px', outline: 'none', minHeight: '60px', fontFamily: 'inherit', resize: 'vertical' }}
                        value={plateStyle.instructionText} 
                        onChange={e => setPlateStyle({ ...plateStyle, instructionText: e.target.value })} 
                      />
                    </div>
                  </div>

                  {/* 2.2 FOOTER TEXT & DESIGN CUSTOMIZATION */}
                  <div id="editor-footer-section" onClickCapture={() => setActiveSection('footer')} onFocusCapture={() => setActiveSection('footer')} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--bg-deep)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-main)' }}>CONTEÚDO E ESTILO DO RODAPÉ</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          id="showFooter" 
                          checked={plateStyle.showFooter !== false} 
                          onChange={e => setPlateStyle({ ...plateStyle, showFooter: e.target.checked })}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="showFooter" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)', cursor: 'pointer' }}>Exibir Nome da Propriedade no Rodapé</label>
                      </div>

                      {plateStyle.showFooter !== false && (
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Texto de Sobrescrever Nome da Propriedade (Opcional)</label>
                          <input 
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}
                            value={plateStyle.footerTextOverride || ''} 
                            onChange={e => setPlateStyle({ ...plateStyle, footerTextOverride: e.target.value })} 
                            placeholder="Ex: Bloco Principal, Portaria Central..."
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          id="showUnitFooter" 
                          checked={plateStyle.showUnitFooter !== false} 
                          onChange={e => setPlateStyle({ ...plateStyle, showUnitFooter: e.target.checked })}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="showUnitFooter" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)', cursor: 'pointer' }}>Exibir Unidade / Bloco no Rodapé</label>
                      </div>

                      {/* Personalização da Fonte e Tamanho do Rodapé */}
                      {((plateStyle.showFooter !== false) || (plateStyle.showUnitFooter !== false)) && (
                        <div style={{ 
                          marginTop: '8px', 
                          paddingTop: '12px', 
                          borderTop: '1px dashed var(--border-subtle)',
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '12px' 
                        }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>ESTILO DO TEXTO DO RODAPÉ</div>
                          
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>Fonte do Rodapé</label>
                            <select
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                              value={plateStyle.footerFontFamily || 'inherit'}
                              onChange={e => setPlateStyle({ ...plateStyle, footerFontFamily: e.target.value })}
                            >
                              <option value="inherit">Herdar da Placa ({plateStyle.fontFamily || 'Inter'})</option>
                              <option value="Inter">Inter (Padrão Clean)</option>
                              <option value="Outfit">Outfit (Moderna/Redonda)</option>
                              <option value="Montserrat">Montserrat (Esportiva/Negrito)</option>
                              <option value="Playfair Display">Playfair Display (Serif Elegante)</option>
                              <option value="Fira Code">Fira Code (Tecnológica/Monospace)</option>
                              <option value="Space Grotesk">Space Grotesk (Tech/Industrial)</option>
                              <option value="Cinzel">Cinzel (Luxo Clássico)</option>
                            </select>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {plateStyle.showFooter !== false && (
                              <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>
                                  Tam. Propriedade: <strong style={{ color: 'var(--text-main)' }}>{plateStyle.footerFontSize !== undefined ? plateStyle.footerFontSize : 14}px</strong>
                                </label>
                                <input
                                  type="range"
                                  min="10"
                                  max="24"
                                  value={plateStyle.footerFontSize !== undefined ? plateStyle.footerFontSize : 14}
                                  onChange={e => setPlateStyle({ ...plateStyle, footerFontSize: parseInt(e.target.value) })}
                                  style={{ width: '100%', cursor: 'pointer', height: '6px', background: '#CBD5E1', borderRadius: '4px', outline: 'none' }}
                                />
                              </div>
                            )}

                            {plateStyle.showUnitFooter !== false && (
                              <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>
                                  Tam. Unidade: <strong style={{ color: 'var(--text-main)' }}>{plateStyle.footerUnitFontSize !== undefined ? plateStyle.footerUnitFontSize : 12}px</strong>
                                </label>
                                <input
                                  type="range"
                                  min="8"
                                  max="20"
                                  value={plateStyle.footerUnitFontSize !== undefined ? plateStyle.footerUnitFontSize : 12}
                                  onChange={e => setPlateStyle({ ...plateStyle, footerUnitFontSize: parseInt(e.target.value) })}
                                  style={{ width: '100%', cursor: 'pointer', height: '6px', background: '#CBD5E1', borderRadius: '4px', outline: 'none' }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. FONTS, TEXTURES & LAYOUT POSITIONS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>Fonte da Placa</label>
                      <select
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-deep)', color: 'var(--text-main)', fontSize: '13px', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                        value={plateStyle.fontFamily || 'Inter'}
                        onChange={e => setPlateStyle({ ...plateStyle, fontFamily: e.target.value })}
                      >
                        <option value="Inter">Inter (Padrão Clean)</option>
                        <option value="Outfit">Outfit (Moderna/Redonda)</option>
                        <option value="Montserrat">Montserrat (Esportiva/Negrito)</option>
                        <option value="Playfair Display">Playfair Display (Serif Elegante)</option>
                        <option value="Fira Code">Fira Code (Tecnológica/Monospace)</option>
                        <option value="Space Grotesk">Space Grotesk (Tech/Industrial)</option>
                        <option value="Cinzel">Cinzel (Luxo Clássico)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>Textura de Fundo</label>
                      <select
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-deep)', color: 'var(--text-main)', fontSize: '13px', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                        value={plateStyle.backgroundPattern || 'none'}
                        onChange={e => setPlateStyle({ ...plateStyle, backgroundPattern: e.target.value })}
                      >
                        <option value="none">Sem Textura (Liso)</option>
                        <option value="dots">Pontos (Dot Matrix)</option>
                        <option value="grid">Malha de Grade</option>
                        <option value="stripes">Linhas Diagonais</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>Sombra da Placa</label>
                      <select
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-deep)', color: 'var(--text-main)', fontSize: '13px', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                        value={plateStyle.shadowDepth || 'none'}
                        onChange={e => setPlateStyle({ ...plateStyle, shadowDepth: e.target.value })}
                      >
                        <option value="none">Sem Sombra</option>
                        <option value="soft">Sombra Suave</option>
                        <option value="medium">Sombra Média</option>
                        <option value="hard">Sombra Projetada 3D</option>
                      </select>
                    </div>
                  </div>

                  {/* 4. BASE COLOR CUSTOMIZATION */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>Cor do Texto</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="color" 
                          value={plateStyle.textColor.startsWith('linear-gradient') ? '#1E293B' : plateStyle.textColor} 
                          onChange={e => setPlateStyle({ ...plateStyle, textColor: e.target.value })} 
                          style={{ width: '40px', height: '40px', border: '1px solid var(--border-subtle)', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <input 
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-deep)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
                          value={plateStyle.textColor} 
                          onChange={e => setPlateStyle({ ...plateStyle, textColor: e.target.value })} 
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>Cor do Logo</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="color" 
                          value={plateStyle.logoColor || '#4F46E5'} 
                          onChange={e => setPlateStyle({ ...plateStyle, logoColor: e.target.value })} 
                          style={{ width: '40px', height: '40px', border: '1px solid var(--border-subtle)', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <input 
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-deep)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
                          value={plateStyle.logoColor || ''} 
                          onChange={e => setPlateStyle({ ...plateStyle, logoColor: e.target.value })} 
                          placeholder="Igual ao texto..."
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>Cor de Destaque (Accent)</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="color" 
                          value={plateStyle.accentColor} 
                          onChange={e => setPlateStyle({ ...plateStyle, accentColor: e.target.value })} 
                          style={{ width: '40px', height: '40px', border: '1px solid var(--border-subtle)', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <input 
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-deep)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
                          value={plateStyle.accentColor} 
                          onChange={e => setPlateStyle({ ...plateStyle, accentColor: e.target.value })} 
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>Fundo (Hex ou Gradient)</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="color" 
                          value={plateStyle.backgroundColor.startsWith('linear-gradient') ? '#FFFFFF' : plateStyle.backgroundColor} 
                          onChange={e => setPlateStyle({ ...plateStyle, backgroundColor: e.target.value })} 
                          style={{ width: '40px', height: '40px', border: '1px solid var(--border-subtle)', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <input 
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-deep)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
                          value={plateStyle.backgroundColor} 
                          onChange={e => setPlateStyle({ ...plateStyle, backgroundColor: e.target.value })} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. ADVANCED QR CODE DESIGN */}
                  <div id="editor-qr-section" onClickCapture={() => setActiveSection('qr')} onFocusCapture={() => setActiveSection('qr')} style={{ padding: '16px', background: 'var(--bg-deep)', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-main)' }}>DESIGN DO BOX DO QR CODE</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Cantos Arredondados</label>
                        <select
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                          value={plateStyle.qrRadius || '24px'}
                          onChange={e => setPlateStyle({ ...plateStyle, qrRadius: e.target.value })}
                        >
                          <option value="0px">Quadrado (0px)</option>
                          <option value="8px">Leve (8px)</option>
                          <option value="16px">Médio (16px)</option>
                          <option value="24px">Arredondado (24px)</option>
                          <option value="32px">Super Arredondado (32px)</option>
                          <option value="50%">Círculo (50%)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Fundo QR / Código QR (Frente)</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input 
                            type="color" 
                            value={plateStyle.qrBgColor || '#FFFFFF'} 
                            onChange={e => setPlateStyle({ ...plateStyle, qrBgColor: e.target.value })} 
                            style={{ width: '32px', height: '32px', border: '1px solid var(--border-subtle)', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                            title="Fundo do QR"
                          />
                          <input 
                            type="color" 
                            value={plateStyle.qrFgColor || '#000000'} 
                            onChange={e => setPlateStyle({ ...plateStyle, qrFgColor: e.target.value })} 
                            style={{ width: '32px', height: '32px', border: '1px solid var(--border-subtle)', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                            title="Frente (Código)"
                          />
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>Hex: {plateStyle.qrFgColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6. HEADER BADGE / TAG DE DESTAQUE */}
                  <div style={{ padding: '16px', background: 'var(--bg-deep)', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-main)' }}>TAG DE DESTAQUE SUPERIOR (OPCIONAL)</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Texto da Tag (Deixe vazio p/ ocultar)</label>
                        <input 
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}
                          value={plateStyle.headerBadgeText || ''} 
                          onChange={e => setPlateStyle({ ...plateStyle, headerBadgeText: e.target.value })} 
                          placeholder="Ex: SISTEMA 24h, PORTARIA DIGITAL..."
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Fundo Tag / Cor Fonte</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="color" 
                            value={plateStyle.headerBadgeBg || '#3B82F6'} 
                            onChange={e => setPlateStyle({ ...plateStyle, headerBadgeBg: e.target.value })} 
                            style={{ width: '32px', height: '32px', border: '1px solid var(--border-subtle)', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                            title="Fundo Tag"
                          />
                          <input 
                            type="color" 
                            value={plateStyle.headerBadgeColor || '#FFFFFF'} 
                            onChange={e => setPlateStyle({ ...plateStyle, headerBadgeColor: e.target.value })} 
                            style={{ width: '32px', height: '32px', border: '1px solid var(--border-subtle)', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                            title="Fonte Tag"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 7. CUSTOM BORDERS */}
                  <div style={{ padding: '16px', background: 'var(--bg-deep)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="checkbox" 
                          id="showBorder" 
                          checked={plateStyle.showBorder} 
                          onChange={e => setPlateStyle({ ...plateStyle, showBorder: e.target.checked })}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="showBorder" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', cursor: 'pointer' }}>7. EXIBIR BORDA NA PLACA</label>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Cantos da Placa:</label>
                        <select
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                          value={plateStyle.plateCorners || 'rounded'}
                          onChange={e => setPlateStyle({ ...plateStyle, plateCorners: e.target.value })}
                        >
                          <option value="rounded">Arredondados</option>
                          <option value="straight">Retos</option>
                        </select>
                      </div>
                    </div>

                    {plateStyle.showBorder && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Cor da Borda</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input 
                              type="color" 
                              value={plateStyle.borderColor} 
                              onChange={e => setPlateStyle({ ...plateStyle, borderColor: e.target.value })} 
                              style={{ width: '28px', height: '28px', border: '1px solid var(--border-subtle)', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}
                            />
                            <input 
                              style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '11px', outline: 'none' }}
                              value={plateStyle.borderColor} 
                              onChange={e => setPlateStyle({ ...plateStyle, borderColor: e.target.value })} 
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Espessura</label>
                          <input 
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}
                            value={plateStyle.borderWidth} 
                            onChange={e => setPlateStyle({ ...plateStyle, borderWidth: e.target.value })} 
                            placeholder="Ex: 4px"
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>Estilo Borda</label>
                          <select
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                            value={plateStyle.borderStyle || 'solid'}
                            onChange={e => setPlateStyle({ ...plateStyle, borderStyle: e.target.value })}
                          >
                            <option value="solid">Linha Contínua (Solid)</option>
                            <option value="dashed">Tracejado (Dashed)</option>
                            <option value="double">Borda Dupla (Double)</option>
                            <option value="dotted">Pontilhado (Dotted)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleSaveStyle} 
                    disabled={savingStyle}
                    style={{ 
                      padding: '16px', 
                      borderRadius: '12px', 
                      background: '#3B82F6', 
                      color: '#FFF', 
                      border: 'none', 
                      fontWeight: 700, 
                      fontSize: '16px', 
                      cursor: 'pointer',
                      opacity: savingStyle ? 0.7 : 1,
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {savingStyle ? 'Salvando Alterações...' : 'SALVAR E PROPAGAR DESIGN'}
                  </button>
                </div>

                {/* Preview Container Column */}
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0,
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    transform: `translateY(${previewOffset}px)`,
                    transition: 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>PRÉ-VISUALIZAÇÃO AO VIVO</div>
                    <div style={{ width: '325px', boxShadow: '0 15px 35px rgba(0,0,0,0.15)', borderRadius: '32px', overflow: 'hidden' }}>
                      <PrintablePlate 
                        propertyId="SCAN-MASTER-LAB"
                        propertyName="Condomínio Residencial Solar"
                        unitName="Bloco B - Apto 204"
                        customStyle={plateStyle}
                        animateLogo={true}
                        onSectionClick={scrollToField}
                      />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px', maxWidth: '280px', textAlign: 'center', lineHeight: 1.4 }}>
                      * A previsualização utiliza dados de simulação. As alterações salvas serão propagadas para todos os residentes do sistema.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {platesSubTab === 'production' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '18px', color: 'var(--text-main)' }}>Fila de Impressão ({selectedPlates.length} selecionadas)</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>Selecione as placas das propriedades para gerar o layout de impressão A4.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={handleToggleSelectAll}
                      style={{ padding: '10px 16px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                    >
                      {selectedPlates.length === (properties || []).length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                    </button>
                    <button 
                      onClick={handlePrintSelected}
                      disabled={selectedPlates.length === 0}
                      style={{ padding: '10px 20px', borderRadius: '10px', background: '#10B981', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: selectedPlates.length === 0 ? 0.6 : 1 }}
                    >
                      <Download size={14} style={{ display: 'inline-block', marginRight: '6px', transform: 'rotate(180deg)' }} /> Imprimir Selecionadas
                    </button>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-surface)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-deep)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '14px 16px', width: '48px' }}></th>
                        <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>Propriedade</th>
                        <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>Tipo / Unidades</th>
                        <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>Código QR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(properties || []).map(prop => (
                        <tr key={prop.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <input 
                              type="checkbox"
                              checked={selectedPlates.includes(prop.id)}
                              onChange={() => handleToggleSelectClient(prop.id)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>{prop.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{prop.clientAddress || 'Sem endereço'}</div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '11px', background: 'var(--bg-deep)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>
                              {(prop.type || 'house').toUpperCase()}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                              {prop.units?.length || 0} unid.
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <code style={{ fontSize: '12px', background: 'var(--bg-deep)', color: 'var(--text-main)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{prop.id}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {platesSubTab === 'sequential' && (
              <PlateProductionPanel customStyle={plateStyle} plates={sequentialPlates} setPlates={setSequentialPlates} />
            )}
          </div>
        )}

        {activeTab === 'properties' && (
          <div>
            {/* SUB-TABS NAVIGATION */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <button
                onClick={() => setSubTab('houses')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: subTab === 'houses' ? 'linear-gradient(135deg,#3B82F6,#2563EB)' : 'transparent',
                  color: subTab === 'houses' ? '#FFF' : '#64748B',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: subTab === 'houses' ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                🏡 Casas Isoladas
              </button>
              <button
                onClick={() => setSubTab('condos')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: subTab === 'condos' ? 'linear-gradient(135deg,#3B82F6,#2563EB)' : 'transparent',
                  color: subTab === 'condos' ? '#FFF' : '#64748B',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: subTab === 'condos' ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                🏢 Condomínios & Vilas
              </button>
            </div>

            {loadingProperties ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Carregando propriedades...</div>
            ) : subTab === 'houses' ? (
              /* CASAS ISOLADAS GROUPED BY BAIRRO */
              <div>
                {(() => {
                  const houses = properties.filter(p => p.type === 'house' || !p.type);
                  if (houses.length === 0) {
                    return <div style={{ background: '#FFF', borderRadius: '16px', padding: '32px', textAlign: 'center', color: '#94A3B8', border: '1px solid #E2E8F0' }}>Nenhuma casa cadastrada no sistema.</div>;
                  }

                  // Agrupa por Bairro
                  const groupedHouses = {};
                  houses.forEach(h => {
                    let bairro = 'Geral / Outros';
                    if (h.clientAddress) {
                      const parts = h.clientAddress.split(',');
                      if (parts.length > 1) {
                        bairro = parts[1].trim();
                      } else {
                        bairro = h.clientAddress.trim();
                      }
                    }
                    if (!groupedHouses[bairro]) groupedHouses[bairro] = [];
                    groupedHouses[bairro].push(h);
                  });

                  return Object.keys(groupedHouses).map(bairro => (
                    <div key={bairro} style={{ marginBottom: '36px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        📍 Bairro: <span style={{ color: '#2563EB' }}>{bairro}</span>
                        <span style={{ fontSize: '12px', background: '#E2E8F0', padding: '3px 8px', borderRadius: '20px', color: '#475569', fontWeight: 700 }}>
                          {groupedHouses[bairro].length} {groupedHouses[bairro].length === 1 ? 'casa' : 'casas'}
                        </span>
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                        {groupedHouses[bairro].map(house => (
                          <div key={house.id} style={{ background: '#FFF', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{house.name || house.clientName || 'Proprietário'}</h4>
                                <span style={{ fontSize: '10px', background: house.plan === 'PREMIUM' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)', color: house.plan === 'PREMIUM' ? '#D97706' : '#2563EB', fontWeight: 800, padding: '3px 8px', borderRadius: '20px' }}>
                                  {house.plan}
                                </span>
                              </div>
                              <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0' }}>{house.clientAddress || 'Sem endereço.'}</p>
                            </div>

                            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div><strong>👤 Contato:</strong> {house.clientPhone || '—'}</div>
                              {house.admin && <div><strong>🔑 Código Único:</strong> <code style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563EB' }}>{house.admin.clientCode || 'Sem código'}</code></div>}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                              <button
                                onClick={() => navigate(`/chamada/${house.id}`)}
                                style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFF', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              >
                                🔔 Testar Placa
                              </button>
                              
                              <button
                                onClick={async () => {
                                  // Abre modal do QR
                                  if (house.admin) {
                                    openQrModal(house.admin, 'option2');
                                  } else {
                                    alert('Esta casa ainda não possui administrador associado.');
                                  }
                                }}
                                style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#3B82F6,#2563EB)', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              >
                                <QrCode size={13} /> Ver QR Code
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              /* CONDOMINIOS / VILAS GROUPED BY VILA NAME */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {(() => {
                  const condos = properties.filter(p => p.type === 'village' || p.type === 'condo');
                  if (condos.length === 0) {
                    return <div style={{ background: '#FFF', borderRadius: '16px', padding: '32px', textAlign: 'center', color: '#94A3B8', border: '1px solid #E2E8F0' }}>Nenhum condomínio ou vila cadastrado no sistema.</div>;
                  }

                  return condos.map(condo => {
                    const unitsList = condo.units || [];
                    const adminObj = condo.admin;
                    const doormanObj = condo.doorman;

                    return (
                      <div key={condo.id} style={{ background: '#FFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 10px rgba(0,0,0,0.01)' }}>
                        {/* CONDO HEADER */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '20px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0 }}>🏢 {condo.name}</h3>
                              <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.1)', color: '#047857', fontWeight: 800, padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>
                                Vila Ativa
                              </span>
                            </div>
                            {condo.subdomain && (
                              <p style={{ fontSize: '13px', color: '#3B82F6', fontWeight: 700, margin: '4px 0 0' }}>
                                🔗 Subdomínio: {condo.subdomain}.campainhadigital.com.br
                              </p>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ background: '#F8FAFC', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', border: '1px solid #E2E8F0' }}>
                              <span style={{ color: '#64748B' }}>Plano:</span> <strong style={{ color: '#0F172A' }}>{condo.plan}</strong>
                            </div>
                            <div style={{ background: '#F8FAFC', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', border: '1px solid #E2E8F0' }}>
                              <span style={{ color: '#64748B' }}>Portaria:</span> <strong style={{ color: '#0F172A' }}>{doormanObj?.name || 'Não atribuído'}</strong>
                            </div>
                          </div>
                        </div>

                        {/* UNITS LIST */}
                        <div>
                          <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                            🏡 Casas / Apartamentos Cadastrados ({unitsList.length})
                          </h4>

                          {unitsList.length === 0 ? (
                            <p style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>Nenhuma unidade adicionada a este condomínio.</p>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                              {unitsList.map(unit => {
                                const residentNames = unit.residents?.map(r => r.name).join(', ') || 'Nenhum morador';
                                return (
                                  <div key={unit.id} style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>
                                        Unidade {unit.name} {unit.block ? `(Bloco ${unit.block})` : ''}
                                      </span>
                                      <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700 }}>#{unit.inviteCode || ''}</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={residentNames}>
                                      👥 {residentNames}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'promos' && (
          <div style={{ background: '#FFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: '#94A3B8', fontSize: '16px' }}>Módulo de promoções e cupons em construção.</p>
          </div>
        )}

        {activeTab === 'demo' && (
          <div>
            {/* Header */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', margin: 0 }}>✨ Usuários de Demonstração</h2>
                <p style={{ color: '#64748B', fontSize: '14px', marginTop: '6px' }}>
                  Contas pré-configuradas para apresentação comercial. Sempre disponíveis, trial até 2099.
                </p>
              </div>
              <button
                onClick={setupDemo}
                disabled={settingUpDemo}
                style={{
                  padding: '12px 24px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#FFF',
                  fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(124,58,237,0.3)', opacity: settingUpDemo ? 0.7 : 1
                }}
              >
                <Zap size={16} />
                {settingUpDemo ? 'Configurando...' : 'Criar / Resetar Dados Demo'}
              </button>
            </div>

            {/* Feedback */}
            {demoFeedback && (
              <div style={{
                padding: '14px 18px', borderRadius: '14px', marginBottom: '24px',
                background: demoFeedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${demoFeedback.type === 'success' ? '#86EFAC' : '#FECACA'}`,
                color: demoFeedback.type === 'success' ? '#166534' : '#991B1B',
                fontWeight: 600, fontSize: '14px'
              }}>
                {demoFeedback.type === 'success' ? '✅' : '❌'} {demoFeedback.text}
              </div>
            )}

            {/* Demo users */}
            {loadingDemo ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>Carregando dados de demonstração...</div>
            ) : demoUsers.length === 0 ? (
              <div style={{ background: '#FFF', borderRadius: '20px', border: '2px dashed #E2E8F0', padding: '60px', textAlign: 'center' }}>
                <Sparkles size={40} color="#C4B5FD" style={{ marginBottom: '16px' }} />
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#6B7280', margin: 0 }}>Nenhum dado de demonstração configurado ainda.</p>
                <p style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '8px' }}>Clique em "Criar / Resetar Dados Demo" para configurar.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
                {demoUsers.map(user => {
                  const isVila = user.isVilaAdmin;
                  const vilaProperty = user.propertiesVilaAdmin?.[0];
                  const showPass = showDemoPassMap[user.id];

                  return (
                    <div key={user.id} style={{
                      background: '#FFF', borderRadius: '20px', border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden'
                    }}>
                      {/* Card Header */}
                      <div style={{
                        padding: '20px 24px',
                        background: isVila
                          ? 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(91,33,182,0.04))'
                          : 'linear-gradient(135deg,rgba(59,130,246,0.08),rgba(29,78,216,0.04))',
                        borderBottom: '1px solid #F1F5F9',
                        display: 'flex', alignItems: 'center', gap: '14px'
                      }}>
                        <div style={{
                          width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                          background: isVila ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isVila ? <Bell size={22} color="#FFF" /> : <Home size={22} color="#FFF" />}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{user.name}</div>
                          <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                            background: isVila ? 'rgba(124,58,237,0.12)' : 'rgba(59,130,246,0.12)',
                            color: isVila ? '#6D28D9' : '#1D4ED8'
                          }}>
                            {isVila ? '🏘️ Admin de Vila' : '🏠 Morador de Casa'}
                          </span>
                        </div>
                      </div>

                      {/* Credentials */}
                      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Email */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#F8FAFC', borderRadius: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', minWidth: '50px', textTransform: 'uppercase' }}>Email</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', flex: 1 }}>{user.email}</span>
                          <button onClick={() => { navigator.clipboard.writeText(user.email); setCopiedId(`email-${user.id}`); setTimeout(() => setCopiedId(null), 2000); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === `email-${user.id}` ? '#10B981' : '#94A3B8' }}>
                            {copiedId === `email-${user.id}` ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>

                        {/* Password */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#F8FAFC', borderRadius: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', minWidth: '50px', textTransform: 'uppercase' }}>Senha</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', flex: 1, fontFamily: 'monospace', letterSpacing: showPass ? '2px' : '4px' }}>
                            {showPass ? user.password : '••••••••'}
                          </span>
                          <button onClick={() => setShowDemoPassMap(p => ({ ...p, [user.id]: !p[user.id] }))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', marginRight: '4px' }}>
                            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button onClick={() => { navigator.clipboard.writeText(user.password); setCopiedId(`pass-${user.id}`); setTimeout(() => setCopiedId(null), 2000); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === `pass-${user.id}` ? '#10B981' : '#94A3B8' }}>
                            {copiedId === `pass-${user.id}` ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>

                        {/* Código Único */}
                        {user.clientCode && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#F8FAFC', borderRadius: '10px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', minWidth: '50px', textTransform: 'uppercase' }}>Código</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', flex: 1, fontFamily: 'monospace' }}>{user.clientCode}</span>
                            <button onClick={() => { navigator.clipboard.writeText(user.clientCode); setCopiedId(`ccode-${user.id}`); setTimeout(() => setCopiedId(null), 2000); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === `ccode-${user.id}` ? '#10B981' : '#94A3B8' }}>
                              {copiedId === `ccode-${user.id}` ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        )}

                        {/* Placa */}
                        {user.plateCode && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#F8FAFC', borderRadius: '10px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', minWidth: '50px', textTransform: 'uppercase' }}>Placa</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', flex: 1, fontFamily: 'monospace' }}>{user.plateCode}</span>
                            <button onClick={() => { navigator.clipboard.writeText(user.plateCode); setCopiedId(`plate-${user.id}`); setTimeout(() => setCopiedId(null), 2000); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === `plate-${user.id}` ? '#10B981' : '#94A3B8' }}>
                              {copiedId === `plate-${user.id}` ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        )}

                        {/* Vila property info */}
                        {isVila && vilaProperty && (
                          <div style={{ padding: '14px', background: 'rgba(124,58,237,0.06)', borderRadius: '12px', border: '1px solid rgba(124,58,237,0.12)' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#6D28D9', marginBottom: '10px' }}>🏘️ {vilaProperty.name}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {vilaProperty.units?.map((unit, i) => (
                                <div key={unit.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', background: '#FFF', borderRadius: '8px' }}>
                                  <div style={{ width: '24px', height: '24px', borderRadius: '7px', background: `hsl(${i * 80},60%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Bell size={12} color="#FFF" />
                                  </div>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', flex: 1 }}>{unit.name}</span>
                                  <code style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', background: 'rgba(124,58,237,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                                    {unit.inviteCode || '—'}
                                  </code>
                                  <button onClick={() => { navigator.clipboard.writeText(unit.inviteCode || ''); setCopiedId(`code-${unit.id}`); setTimeout(() => setCopiedId(null), 2000); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === `code-${unit.id}` ? '#10B981' : '#94A3B8' }}>
                                    {copiedId === `code-${unit.id}` ? <Check size={12} /> : <Copy size={12} />}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Resident unit info */}
                        {!isVila && user.units && user.units.length > 0 && (
                          <div style={{ padding: '14px', background: 'rgba(59,130,246,0.06)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.12)' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1D4ED8' }}>
                              🏡 {user.units[0].property?.name || 'Propriedade'} - {user.units[0].name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                              Código de Acesso (Campainha): <code style={{ color: '#1D4ED8', fontWeight: 700 }}>{user.units[0].inviteCode || '—'}</code>
                            </div>
                          </div>
                        )}

                        {/* Trial info */}
                        <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ✅ Trial ativo até 31/12/2099
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div style={{ background: '#FFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: '#94A3B8', fontSize: '16px' }}>Logs de atividades do sistema em construção.</p>
          </div>
        )}

      </main>

      {/* QR CODE MODAL */}
      {qrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'grid', placeItems: 'center', overflowY: 'auto', zIndex: 1000, padding: '40px 24px', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setQrModal(null); }}>
          <div style={{ background: '#FFF', borderRadius: '28px', padding: '40px', width: '100%', maxWidth: '520px', boxShadow: '0 40px 100px rgba(0,0,0,0.2)', position: 'relative', margin: 'auto' }}>

            <button onClick={() => setQrModal(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="#64748B" />
            </button>

            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', marginBottom: '4px' }}>
                {qrModal.mode === 'option1' ? '📦 Placa Física Pré-configurada' : '📱 QR Code do Cliente'}
              </h3>
              <p style={{ color: '#64748B', fontSize: '14px' }}>
                {qrModal.mode === 'option1'
                  ? 'Defina o código da placa entregue ao cliente. Quando ele escanear, o sistema gera o código único dele.'
                  : 'Gere um código único para o cliente. Ele pode imprimir e usar como QR Code próprio.'}
              </p>
              <div style={{ marginTop: '8px', padding: '8px 14px', background: '#F8FAFC', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{qrModal.user.name}</span>
                <span style={{ color: '#64748B', fontSize: '13px' }}>{qrModal.user.email || qrModal.user.phone}</span>
              </div>
            </div>

            {/* OPÇÃO 1 */}
            {qrModal.mode === 'option1' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Código da Placa Física</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      value={plateInput}
                      onChange={e => setPlateInput(e.target.value.toUpperCase())}
                      placeholder={qrModal.user.plateCode || 'Ex: PLACA-A1B2C3'}
                      style={{ flex: 1, padding: '14px 16px', borderRadius: '12px', border: '2px solid #E2E8F0', fontSize: '15px', fontWeight: 700, letterSpacing: '2px', outline: 'none', textTransform: 'uppercase' }}
                    />
                    <button onClick={() => setPlateCode(qrModal.user.id)} disabled={actionLoading}
                      style={{ padding: '14px 20px', borderRadius: '12px', background: '#10B981', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {actionLoading ? '...' : 'Definir'}
                    </button>
                  </div>
                  {qrModal.user.plateCode && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>✓ Código atual:</span>
                      <code style={{ fontSize: '13px', fontWeight: 800, color: '#047857', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '6px' }}>{qrModal.user.plateCode}</code>
                      <button onClick={() => copyText(qrModal.user.plateCode, 'plate')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === 'plate' ? '#10B981' : '#94A3B8' }}>
                        {copiedId === 'plate' ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ padding: '16px', background: 'rgba(16,185,129,0.05)', borderRadius: '16px', border: '1px dashed rgba(16,185,129,0.3)', fontSize: '13px', color: '#047857', lineHeight: 1.6 }}>
                  <strong>Como funciona:</strong> Defina o código acima e grave-o na placa física. Quando o cliente escanear o QR da placa com o app, o sistema vincula automaticamente e gera o código único dele.
                </div>
              </div>
            )}

            {/* OPÇÃO 2 */}
            {qrModal.mode === 'option2' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  {qrModal.user.clientCode ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: 'rgba(59,130,246,0.06)', borderRadius: '14px', border: '1px solid rgba(59,130,246,0.2)' }}>
                      <Hash size={20} color="#3B82F6" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Código Único do Cliente</div>
                        <code style={{ fontSize: '22px', fontWeight: 900, color: '#1D4ED8', letterSpacing: '4px' }}>{qrModal.user.clientCode}</code>
                      </div>
                      <button onClick={() => copyText(qrModal.user.clientCode, 'client')}
                        style={{ padding: '8px', borderRadius: '8px', background: copiedId === 'client' ? '#10B981' : '#3B82F6', border: 'none', cursor: 'pointer', color: '#FFF' }}>
                        {copiedId === 'client' ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '14px', border: '1px dashed #E2E8F0', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                      Nenhum código gerado ainda.
                    </div>
                  )}
                </div>

                <button onClick={() => generateClientCode(qrModal.user.id)} disabled={actionLoading}
                  style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#FFF', border: 'none', fontWeight: 800, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
                  <QrCode size={20} /> {actionLoading ? 'Gerando...' : (qrModal.user.clientCode ? 'Gerar Novo Código' : 'Gerar Código Único')}
                </button>

                <div style={{ padding: '14px', background: 'rgba(59,130,246,0.05)', borderRadius: '14px', border: '1px dashed rgba(59,130,246,0.2)', fontSize: '13px', color: '#1D4ED8', lineHeight: 1.6 }}>
                  <strong>Como funciona:</strong> Gere o código e compartilhe com o cliente. Ele usa este código para acessar o sistema e pode imprimir o QR Code abaixo.
                </div>
              </div>
            )}

            {/* QR CODE IMAGE */}
            {qrImage && (
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <div style={{ padding: '20px', background: '#FFF', borderRadius: '16px', border: '2px solid #E2E8F0', display: 'inline-block' }}>
                  <img src={qrImage} alt="QR Code" style={{ width: '200px', height: '200px' }} />
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button onClick={() => downloadQr(qrModal.user.name)}
                    style={{ padding: '12px 24px', borderRadius: '12px', background: '#0F172A', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={16} /> Baixar QR Code
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'grid', placeItems: 'center', overflowY: 'auto', zIndex: 1000, padding: '40px 24px', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditModal(null); }}>
          <div style={{ background: '#FFF', borderRadius: '28px', padding: '40px', width: '100%', maxWidth: '500px', boxShadow: '0 40px 100px rgba(0,0,0,0.2)', position: 'relative', margin: 'auto' }}>

            <button onClick={() => setEditModal(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="#64748B" />
            </button>

            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', marginBottom: '4px' }}>
                ✏️ Editar Dados do Usuário
              </h3>
              <p style={{ color: '#64748B', fontSize: '14px' }}>
                Altere o nome, contato ou a senha de acesso do usuário.
              </p>
            </div>

            <form onSubmit={handleEditUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Nome do Usuário</label>
                <input
                  type="text"
                  required
                  value={editModal.name || ''}
                  onChange={e => setEditModal({ ...editModal, name: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>E-mail</label>
                <input
                  type="email"
                  value={editModal.email || ''}
                  onChange={e => setEditModal({ ...editModal, email: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Celular</label>
                <input
                  type="text"
                  value={editModal.phone || ''}
                  onChange={e => setEditModal({ ...editModal, phone: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Senha de Acesso</label>
                <input
                  type="text"
                  required
                  value={editModal.password || ''}
                  onChange={e => setEditModal({ ...editModal, password: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setEditModal(null)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#F1F5F9', border: 'none', color: '#64748B', fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#F59E0B', border: 'none', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
                  Salvar Alterações
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
      {/* PRINT LAYER (HIDDEN IN UI, ONLY FOR window.print()) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media screen {
          #print-area { display: none !important; }
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body { visibility: hidden !important; background: #fff !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #fff !important;
            display: block !important;
          }
          .print-page-break { page-break-inside: avoid; page-break-after: auto; }
          .a4-page {
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always;
            page-break-inside: avoid;
          }
        }
      `}} />
      <div id="print-area">
        {platesSubTab === 'sequential' ? (
          <div>
            {(() => {
              const isA4 = plateStyle?.plateSizeFormat === 'a4' || !plateStyle?.plateSizeFormat;
              if (isA4) {
                const pages = [];
                for (let i = 0; i < sequentialPlates.length; i += 4) {
                  pages.push(sequentialPlates.slice(i, i + 4));
                }
                return pages.map((pagePlates, pageIndex) => (
                  <div key={pageIndex} className="a4-page print-page-break" style={{ 
                    width: '210mm', minHeight: '297mm', background: '#FFF', 
                    margin: '0 auto 32px', padding: '10mm', 
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '10mm',
                    boxSizing: 'border-box'
                  }}>
                    {pagePlates.map(plate => (
                      <div key={plate.code} style={{ 
                        position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column'
                      }}>
                        <div style={{ position: 'absolute', top: '-15px', left: 0, width: '100%', textAlign: 'center', fontSize: '10px', color: '#94A3B8', fontWeight: 700, letterSpacing: '1px' }}>
                          CORTE AQUI ✂️ --- {plate.code} --- ✂️
                        </div>

                        <PrintablePlate 
                          propertyId={plate.code}
                          propertyName="Campainha Digital"
                          unitName={plate.code}
                          customStyle={plateStyle}
                          qrUrl={plate.url}
                          isPrintGrid={true}
                        />
                      </div>
                    ))}
                  </div>
                ));
              } else {
                return sequentialPlates.map(plate => (
                  <div key={plate.code} className="print-page-break" style={{ 
                    width: 'auto', margin: '0 auto 32px', display: 'flex', justifyContent: 'center', pageBreakAfter: 'always', position: 'relative'
                  }}>
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ position: 'absolute', top: '-18px', left: 0, width: '100%', textAlign: 'center', fontSize: '10px', color: '#94A3B8', fontWeight: 700, letterSpacing: '1px' }}>
                        CORTE AQUI ✂️ --- {plate.code} --- ✂️
                      </div>

                      <PrintablePlate 
                        propertyId={plate.code}
                        propertyName="Campainha Digital"
                        unitName={plate.code}
                        customStyle={plateStyle}
                        qrUrl={plate.url}
                        isPrintGrid={false}
                      />
                    </div>
                  </div>
                ));
              }
            })()}
          </div>
        ) : (
          <div style={
            plateStyle?.plateSizeFormat === 'a4' || !plateStyle?.plateSizeFormat
              ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px' }
              : { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', padding: '20px' }
          }>
            {(properties || []).filter(p => selectedPlates.includes(p.id)).map(prop => (
              <div 
                key={prop.id} 
                className="print-page-break" 
                style={
                  plateStyle?.plateSizeFormat === 'a4' || !plateStyle?.plateSizeFormat
                    ? { width: '100%' }
                    : { width: 'auto', pageBreakAfter: 'always', display: 'flex', justifyContent: 'center' }
                }
              >
                <PrintablePlate 
                  propertyId={prop.id} 
                  propertyName={prop.name} 
                  customStyle={plateStyle} 
                  animateLogo={false} 
                  isPrintGrid={plateStyle?.plateSizeFormat === 'a4' || !plateStyle?.plateSizeFormat}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarLink({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: active ? 'rgba(59,130,246,0.08)' : 'transparent', color: active ? '#3B82F6' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '4px' }}>
      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
      <span style={{ fontWeight: active ? 700 : 500, fontSize: '14px' }}>{label}</span>
      {active && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
    </button>
  );
}

function ModuleBadge({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: '5px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 700, border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', background: active ? '#10B98115' : 'var(--bg-deep)', borderColor: active ? '#10B981' : 'var(--border-subtle)', color: active ? '#047857' : 'var(--text-muted)' }}>
      {active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
      {label}
    </button>
  );
}
