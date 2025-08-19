"use client"
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  IconButton,
  Card,
  CardContent,
  Link,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  Info as InfoIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { useLocalStorage } from 'usehooks-ts';

// Types
export interface ApiSettings {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  apiKey: string;
  language: string;
}

interface ProviderConfig {
  name: string;
  models: string[];
  keyPrefix: string;
  website: string;
  docsUrl: string;
}

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

// Provider configurations
const PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    models: [
      'gpt-4', 
      'gpt-4-turbo', 
      'gpt-3.5-turbo', 
      'gpt-4o', 
      'gpt-4o-mini', 
      'o3', 
      'o3-mini', 
      'o1', 
      'o1-mini', 
      'o4-mini',
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano'
    ],
    keyPrefix: 'sk-',
    website: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs/quickstart',
  },
  anthropic: {
    name: 'Anthropic Claude',
    models: [
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-3-5-sonnet-latest',
      'claude-3-5-haiku-latest'
    ],
    keyPrefix: 'sk-ant-',
    website: 'https://console.anthropic.com/settings/keys',
    docsUrl: 'https://docs.anthropic.com/claude/docs/getting-started',
  },
  google: {
    name: 'Google Gemini',
    models: [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-pro'
    ],
    keyPrefix: 'AIza',
    website: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/docs',
  },
};

// Language options
const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹' },
];

const ModelSetting: React.FC = () => {
  // Default settings to ensure controlled components
  const defaultSettings: ApiSettings = {
    provider: 'openai',
    model: '',
    apiKey: '',
    language: 'English',
  };

  // Local storage hooks
  const [apiSettings, setApiSettings] = useLocalStorage<ApiSettings>('api-settings', defaultSettings);

  // Component state
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [tempSettings, setTempSettings] = useState<ApiSettings>(() => ({
    ...defaultSettings,
    ...apiSettings,
  }));

  // Update temp settings when apiSettings changes
  useEffect(() => {
    setTempSettings(({
      ...defaultSettings,
      ...apiSettings,
    }));
  }, [apiSettings]);

  // Validation function
  const validateApiKey = (provider: string, apiKey: string): boolean => {
    if (!provider || !apiKey) return false;
    
    const config = PROVIDERS[provider];
    if (!config) return false;
    
    return apiKey.startsWith(config.keyPrefix);
  };

  // Handle provider change
  const handleProviderChange = (provider: string) => {
    const config = PROVIDERS[provider];
    setTempSettings({
      ...tempSettings,
      provider: provider as ApiSettings['provider'],
      model: config?.models[0] || '',
    });
    setValidationError('');
  };

  // Handle save
  const handleSave = () => {
    // Validation
    if (!tempSettings.provider) {
      setValidationError('Please select a provider');
      return;
    }
    
    if (!tempSettings.model) {
      setValidationError('Please select a model');
      return;
    }
    
    if (!tempSettings.apiKey) {
      setValidationError('Please enter an API key');
      return;
    }
    
    if (!validateApiKey(tempSettings.provider, tempSettings.apiKey)) {
      const config = PROVIDERS[tempSettings.provider];
      const expectedPrefix = config?.keyPrefix;
      const providerName = config?.name;
      setValidationError(`Invalid API key format. ${providerName || 'This provider'} keys should start with "${expectedPrefix}"`);
      return;
    }

    // Save to localStorage
    setApiSettings(tempSettings);
    setValidationError('');
    setSaveSuccess(true);
    
 
    // Hide success message after 3 seconds
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Handle reset
  const handleReset = () => {
    setTempSettings(defaultSettings);
    setValidationError('');
  };

  // Get available models for selected provider
  const getAvailableModels = () => {
    if (!tempSettings.provider) return [];
    return PROVIDERS[tempSettings.provider]?.models || [];
  };

  // Get current provider config
  const currentProviderConfig = PROVIDERS[tempSettings.provider];

  // Get selected language info
  const selectedLanguage = LANGUAGES.find(lang => lang.name === (tempSettings.language || 'English')) || LANGUAGES[0];

  // Use theme colors or fallback to defaults
  const colors = {
    background: { card: '#1a1a1a', input: '#2a2a2a' },
    text: { primary: '#ffffff', secondary: '#cccccc', accent: '#bb86fc' },
    primary: '#bb86fc',
    primaryDark: '#9965f4',
    secondary: '#03dac6',
    accent: '#cf6679',
  };

  return (
    <Box>
      {/* Success Alert */}
      {saveSuccess && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 3,
            backgroundColor: `${colors.secondary}20`,
            color: colors.text.primary,
            '& .MuiAlert-icon': {
              color: colors.accent,
            },
          }}
        >
          Settings saved successfully!
        </Alert>
      )}

      {/* Validation Error */}
      {validationError && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            backgroundColor: '#d32f2f20',
            color: colors.text.primary,
          }}
        >
          {validationError}
        </Alert>
      )}

      {/* Provider Selection */}
      <Card 
        variant="outlined" 
        sx={{ 
          mb: 3, 
          backgroundColor: colors.background.card,
          borderColor: `${colors.secondary}60`,
        }}
      >
        <CardContent>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ color: colors.text.accent }}
          >
            Provider Configuration
          </Typography>
          
          <FormControl fullWidth margin="normal">
            <InputLabel sx={{ color: colors.text.secondary }}>
              AI Provider
            </InputLabel>
            <Select
              value={tempSettings.provider || ''}
              label="AI Provider"
              onChange={(e) => handleProviderChange(e.target.value)}
              sx={{
                backgroundColor: colors.background.input,
                color: colors.text.primary,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: `${colors.secondary}60`,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.secondary,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.primary,
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: colors.background.input,
                    color: colors.text.primary,
                  },
                },
              }}
            >
              <MenuItem value="">
                <em>Select a provider</em>
              </MenuItem>
              {Object.entries(PROVIDERS).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  {config.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Model Selection */}
          {tempSettings.provider && currentProviderConfig && (
            <FormControl fullWidth margin="normal">
              <InputLabel sx={{ color: colors.text.secondary }}>
                Model
              </InputLabel>
              <Select
                value={tempSettings.model || ''}
                label="Model"
                onChange={(e) => setTempSettings({ ...tempSettings, model: e.target.value })}
                sx={{
                  backgroundColor: colors.background.input,
                  color: colors.text.primary,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: `${colors.secondary}60`,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.secondary,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: colors.primary,
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: colors.background.input,
                      color: colors.text.primary,
                    },
                  },
                }}
              >
                {getAvailableModels().map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Card 
        variant="outlined" 
        sx={{ 
          mb: 3, 
          backgroundColor: colors.background.card,
          borderColor: `${colors.secondary}60`,
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <LanguageIcon sx={{ color: colors.text.accent }} />
            <Typography 
              variant="h6"
              sx={{ color: colors.text.accent }}
            >
              Output Language
            </Typography>
            {selectedLanguage && (
              <Chip 
                size="small" 
                label={`${selectedLanguage.flag} ${selectedLanguage.nativeName}`}
                sx={{
                  backgroundColor: `${colors.primary}30`,
                  color: colors.text.primary,
                  borderColor: colors.primary,
                }}
                variant="outlined"
              />
            )}
          </Box>
          
          <FormControl fullWidth>
            <InputLabel sx={{ color: colors.text.secondary }}>
              Preferred Language for AI Responses
            </InputLabel>
            <Select
              value={tempSettings.language || 'English'}
              label="Preferred Language for AI Responses"
              onChange={(e) => setTempSettings({ ...tempSettings, language: e.target.value })}
              sx={{
                backgroundColor: colors.background.input,
                color: colors.text.primary,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: `${colors.secondary}60`,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.secondary,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.primary,
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: colors.background.input,
                    color: colors.text.primary,
                    maxHeight: 400,
                  },
                },
              }}
            >
              {LANGUAGES.map((language) => (
                <MenuItem key={language.code} value={language.name}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Typography sx={{ fontSize: '1.2rem' }}>
                      {language.flag}
                    </Typography>
                    <Box>
                      <Typography variant="body2" sx={{ color: colors.text.primary }}>
                        {language.name}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: colors.text.secondary,
                          fontStyle: 'italic' 
                        }}
                      >
                        {language.nativeName}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Typography 
            variant="caption" 
            sx={{ 
              color: colors.text.secondary, 
              mt: 1, 
              display: 'block',
              fontStyle: 'italic'
            }}
          >
            The AI will attempt to respond in your selected language. Note that response quality may vary depending on the models training data for different languages.
          </Typography>
        </CardContent>
      </Card>

      {/* API Key Configuration */}
      {tempSettings.provider && currentProviderConfig && (
        <Card 
          variant="outlined" 
          sx={{ 
            mb: 3,
            backgroundColor: colors.background.card,
            borderColor: `${colors.secondary}60`,
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Typography 
                variant="h6"
                sx={{ color: colors.text.accent }}
              >
                API Key
              </Typography>
              <Chip 
                size="small" 
                label={currentProviderConfig.name}
                sx={{
                  backgroundColor: `${colors.secondary}30`,
                  color: colors.text.primary,
                  borderColor: colors.secondary,
                }}
                variant="outlined"
              />
            </Box>
            
            <TextField
              fullWidth
              label={`${currentProviderConfig.name} API Key`}
              type={showApiKey ? 'text' : 'password'}
              value={tempSettings.apiKey || ''}
              onChange={(e) => setTempSettings({ ...tempSettings, apiKey: e.target.value })}
              placeholder={`Enter your ${currentProviderConfig.name} API key...`}
              helperText={`Should start with "${currentProviderConfig.keyPrefix}"`}
              sx={{
                '& .MuiInputBase-root': {
                  backgroundColor: colors.background.input,
                },
                '& .MuiInputLabel-root': {
                  color: colors.text.secondary,
                },
                '& .MuiOutlinedInput-root': {
                  color: colors.text.primary,
                  '& fieldset': {
                    borderColor: `${colors.secondary}60`,
                  },
                  '&:hover fieldset': {
                    borderColor: colors.secondary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: colors.primary,
                  },
                },
                '& .MuiFormHelperText-root': {
                  color: colors.text.secondary,
                },
              }}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowApiKey(!showApiKey)}
                    edge="end"
                    sx={{ color: colors.text.secondary }}
                  >
                    {showApiKey ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
            
            <Box mt={2}>
              <Link 
                href={currentProviderConfig.website} 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  color: colors.accent,
                  '&:hover': {
                    color: colors.text.accent,
                  }
                }}
              >
                <InfoIcon fontSize="small" />
                Get your {currentProviderConfig.name} API key
              </Link>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Box display="flex" gap={2} justifyContent="flex-end">
        <Button 
          variant="outlined" 
          onClick={handleReset}
          sx={{
            borderColor: colors.secondary,
            color: colors.text.secondary,
            '&:hover': {
              borderColor: colors.text.accent,
              backgroundColor: `${colors.secondary}20`,
            }
          }}
        >
          Reset
        </Button>
        <Button 
          variant="contained" 
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!tempSettings.provider}
          sx={{
            backgroundColor: colors.primary,
            '&:hover': {
              backgroundColor: colors.primaryDark,
            },
            '&:disabled': {
              backgroundColor: `${colors.primary}50`,
              color: `${colors.text.primary}50`,
            }
          }}
        >
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export default ModelSetting;