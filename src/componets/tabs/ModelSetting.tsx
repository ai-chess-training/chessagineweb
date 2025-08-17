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
} from '@mui/icons-material';
import { useLocalStorage } from 'usehooks-ts';

// Types
export interface ApiSettings {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  apiKey: string;
}

interface ProviderConfig {
  name: string;
  models: string[];
  keyPrefix: string;
  website: string;
  docsUrl: string;
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

const ModelSetting: React.FC = () => {
  // Local storage hooks
  const [apiSettings, setApiSettings] = useLocalStorage<ApiSettings>('api-settings', {
    provider: 'openai',
    model: '',
    apiKey: '',
  });

  // Component state
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [tempSettings, setTempSettings] = useState<ApiSettings>(apiSettings);

  // Update temp settings when apiSettings changes
  useEffect(() => {
    setTempSettings(apiSettings);
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
    const resetSettings = {
      provider: 'openai' as const,
      model: '',
      apiKey: '',
    };
    
    setTempSettings(resetSettings);
    setValidationError('');
    
    // Call optional callback
   
  };

  // Get available models for selected provider
  const getAvailableModels = () => {
    if (!tempSettings.provider) return [];
    return PROVIDERS[tempSettings.provider]?.models || [];
  };

  // Get current provider config
  const currentProviderConfig = PROVIDERS[tempSettings.provider];

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
            backgroundColor: `${colors.accent}20`,
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
              value={tempSettings.provider}
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
                value={tempSettings.model}
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
              value={tempSettings.apiKey}
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