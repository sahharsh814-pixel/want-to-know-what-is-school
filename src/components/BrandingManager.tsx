import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Image as ImageIcon, Save, RefreshCw, Palette, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client (replace with your actual Supabase URL and anon key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface BrandingData {
  schoolName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

const BrandingManager = () => {
  const [branding, setBranding] = useState<BrandingData>({
    schoolName: "Royal Academy",
    tagline: "Excellence in Education",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#1e40af",
    secondaryColor: "#f59e0b",
    accentColor: "#10b981",
    contactEmail: "info@royalacademy.edu",
    contactPhone: "+1 (555) 123-4567",
    address: "123 Education Street, Knowledge City, ED 12345"
  });

  const [message, setMessage] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [faviconPreview, setFaviconPreview] = useState("");

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const { data, error } = await supabase
          .from('app_state')
          .select('value')
          .eq('key', 'branding')
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0 && data[0]?.value) {
          const brandingData = JSON.parse(data[0].value);
          setBranding(brandingData);
          if (brandingData.logoUrl) setLogoPreview(brandingData.logoUrl);
          if (brandingData.faviconUrl) setFaviconPreview(brandingData.faviconUrl);
        } else {
          // If no branding found in Supabase, load from localStorage
          const saved = localStorage.getItem('royal-academy-branding');
          if (saved) {
            const data = JSON.parse(saved);
            setBranding(data);
            if (data.logoUrl) setLogoPreview(data.logoUrl);
            if (data.faviconUrl) setFaviconPreview(data.faviconUrl);
          }
        }
      } catch (error: any) {
        console.error('[Supabase] Error fetching branding:', error.message);
        // Fallback to localStorage if Supabase fetch fails
        const saved = localStorage.getItem('royal-academy-branding');
        if (saved) {
          const data = JSON.parse(saved);
          setBranding(data);
          if (data.logoUrl) setLogoPreview(data.logoUrl);
          if (data.faviconUrl) setFaviconPreview(data.faviconUrl);
        }
      }
    };

    fetchBranding();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setLogoPreview(url);
        setBranding(prev => ({ ...prev, logoUrl: url }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setFaviconPreview(url);
        setBranding(prev => ({ ...prev, faviconUrl: url }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveBranding = async () => {
    // Save to localStorage
    localStorage.setItem('royal-academy-branding', JSON.stringify(branding));

    // Save to Supabase
    try {
      const { error } = await supabase
        .from('app_state')
        .upsert({ key: 'branding', value: JSON.stringify(branding) }, { onConflict: 'key' });

      if (error) throw error;

      setMessage("Branding updated successfully in Supabase and local storage!");
    } catch (error: any) {
      console.error('[Supabase] Error saving branding:', error.message);
      setMessage(`Error saving branding: ${error.message}. It has been saved to local storage.`);
    }

    // Update document title and favicon immediately for preview
    document.title = `${branding.schoolName} - ${branding.tagline}`;
    if (branding.faviconUrl) {
      const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (favicon) {
        favicon.href = branding.faviconUrl;
      } else {
        const newFavicon = document.createElement('link');
        newFavicon.rel = 'icon';
        newFavicon.href = branding.faviconUrl;
        document.head.appendChild(newFavicon);
      }
    }

    setTimeout(() => setMessage(""), 5000);
  };

  const updateField = (field: keyof BrandingData, value: string) => {
    setBranding(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
          Branding & Logo Management
        </h2>
        <p className="text-muted-foreground">
          Update your school's logo, colors, and branding information
        </p>
      </div>

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <div className="flex items-center space-x-3 mb-4">
            <ImageIcon className="h-5 w-5 text-gold" />
            <h3 className="text-lg font-semibold">School Logo</h3>
          </div>

          <div className="space-y-4">
            {logoPreview && (
              <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center p-4">
                <img src={logoPreview} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload"
            />
            <label htmlFor="logo-upload">
              <Button variant="outline" className="w-full" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </span>
              </Button>
            </label>
          </div>
        </motion.div>

        {/* Favicon Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <div className="flex items-center space-x-3 mb-4">
            <ImageIcon className="h-5 w-5 text-gold" />
            <h3 className="text-lg font-semibold">Favicon</h3>
          </div>

          <div className="space-y-4">
            {faviconPreview && (
              <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center p-4">
                <img src={faviconPreview} alt="Favicon Preview" className="max-h-full max-w-full object-contain" />
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleFaviconUpload}
              className="hidden"
              id="favicon-upload"
            />
            <label htmlFor="favicon-upload">
              <Button variant="outline" className="w-full" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Favicon
                </span>
              </Button>
            </label>
          </div>
        </motion.div>
      </div>

      {/* School Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Type className="h-5 w-5 text-gold" />
          <h3 className="text-lg font-semibold">School Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">School Name</label>
            <Input
              value={branding.schoolName}
              onChange={(e) => updateField('schoolName', e.target.value)}
              placeholder="Royal Academy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tagline</label>
            <Input
              value={branding.tagline}
              onChange={(e) => updateField('tagline', e.target.value)}
              placeholder="Excellence in Education"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contact Email</label>
            <Input
              type="email"
              value={branding.contactEmail}
              onChange={(e) => updateField('contactEmail', e.target.value)}
              placeholder="info@royalacademy.edu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contact Phone</label>
            <Input
              type="tel"
              value={branding.contactPhone}
              onChange={(e) => updateField('contactPhone', e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Address</label>
            <Textarea
              value={branding.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="123 Education Street, Knowledge City, ED 12345"
              rows={2}
            />
          </div>
        </div>
      </motion.div>

      {/* Color Scheme */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Palette className="h-5 w-5 text-gold" />
          <h3 className="text-lg font-semibold">Brand Colors</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Primary Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={branding.primaryColor}
                onChange={(e) => updateField('primaryColor', e.target.value)}
                className="w-12 h-10 rounded border border-border cursor-pointer"
              />
              <Input
                value={branding.primaryColor}
                onChange={(e) => updateField('primaryColor', e.target.value)}
                placeholder="#1e40af"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Secondary Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={branding.secondaryColor}
                onChange={(e) => updateField('secondaryColor', e.target.value)}
                className="w-12 h-10 rounded border border-border cursor-pointer"
              />
              <Input
                value={branding.secondaryColor}
                onChange={(e) => updateField('secondaryColor', e.target.value)}
                placeholder="#f59e0b"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Accent Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={branding.accentColor}
                onChange={(e) => updateField('accentColor', e.target.value)}
                className="w-12 h-10 rounded border border-border cursor-pointer"
              />
              <Input
                value={branding.accentColor}
                onChange={(e) => updateField('accentColor', e.target.value)}
                placeholder="#10b981"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Preview Changes
        </Button>
        <Button onClick={saveBranding} className="bg-gradient-to-r from-royal to-gold text-white">
          <Save className="h-4 w-4 mr-2" />
          Save Branding
        </Button>
      </div>
    </div>
  );
};

export default BrandingManager;