"use client"
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  CardContent,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
  Chip,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import {
  Help as HelpIcon,
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useLocalStorage } from 'usehooks-ts';
import { purpleTheme } from '@/componets/lichess/UserGameSelect';


// Create Material-UI theme
const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: purpleTheme.primary,
      dark: purpleTheme.primaryDark,
    },
    secondary: {
      main: purpleTheme.secondary,
    },
    background: {
      default: purpleTheme.background.main,
      paper: purpleTheme.background.paper,
    },
    text: {
      primary: purpleTheme.text.primary,
      secondary: purpleTheme.text.secondary,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: purpleTheme.background.card,
          borderColor: purpleTheme.secondary,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            backgroundColor: purpleTheme.background.input,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: purpleTheme.background.input,
        },
      },
    },
  },
});

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
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini', "o3", "o3-mini", "o1", "o1-mini", "o4-mini"],
    keyPrefix: 'sk-',
    website: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs/quickstart',
  },
  anthropic: {
    name: 'Anthropic Claude',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022'],
    keyPrefix: 'sk-ant-',
    website: 'https://console.anthropic.com/settings/keys',
    docsUrl: 'https://docs.anthropic.com/claude/docs/getting-started',
  },
  google: {
    name: 'Google Gemini',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
    keyPrefix: 'AIza',
    website: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/docs',
  },
};

const SettingsPage: React.FC = () => {
  // Local storage hooks
  const [apiSettings, setApiSettings] = useLocalStorage<ApiSettings>('api-settings', {
    provider: 'openai',
    model: '',
    apiKey: '',
  });

  // Component state
  const [showApiKey, setShowApiKey] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
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
    setTempSettings({
      ...tempSettings,
      provider: provider as ApiSettings['provider'],
      model: provider ? PROVIDERS[provider]?.models[0] || '' : '',
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
      const expectedPrefix = PROVIDERS[tempSettings.provider]?.keyPrefix;
      setValidationError(`Invalid API key format. ${PROVIDERS[tempSettings.provider]?.name} keys should start with "${expectedPrefix}"`);
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
    setTempSettings({
      provider: 'openai',
      model: '',
      apiKey: '',
    });
    setValidationError('');
  };

  // Get available models for selected provider
  const getAvailableModels = () => {
    if (!tempSettings.provider) return [];
    return PROVIDERS[tempSettings.provider]?.models || [];
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <Box 
        sx={{ 
          minHeight: '100vh',
          backgroundColor: purpleTheme.background.main,
          py: 4 
        }}
      >
        <Container maxWidth="md">
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              backgroundColor: purpleTheme.background.paper,
              border: `1px solid ${purpleTheme.secondary}40`,
            }}
          >
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Typography 
                variant="h4" 
                component="h1"
                sx={{ color: purpleTheme.text.primary, fontWeight: 'bold' }}
              >
                API Settings
              </Typography>
              <IconButton 
                onClick={() => setHelpDialogOpen(true)}
                sx={{ 
                  color: purpleTheme.secondary,
                  '&:hover': { 
                    backgroundColor: `${purpleTheme.secondary}20` 
                  }
                }}
                size="large"
              >
                <HelpIcon />
              </IconButton>
            </Box>

            <Typography 
              variant="body1" 
              sx={{ color: purpleTheme.text.secondary, mb: 4 }}
            >
              Configure your AI provider settings. Your API keys are stored locally in your browser.
            </Typography>

            {/* Success Alert */}
            {saveSuccess && (
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 3,
                  backgroundColor: `${purpleTheme.accent}20`,
                  color: purpleTheme.text.primary,
                  '& .MuiAlert-icon': {
                    color: purpleTheme.accent,
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
                  color: purpleTheme.text.primary,
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
                backgroundColor: purpleTheme.background.card,
                borderColor: `${purpleTheme.secondary}60`,
              }}
            >
              <CardContent>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ color: purpleTheme.text.accent }}
                >
                  Provider Configuration
                </Typography>
                
                <FormControl fullWidth margin="normal">
                  <InputLabel sx={{ color: purpleTheme.text.secondary }}>
                    AI Provider
                  </InputLabel>
                  <Select
                    value={tempSettings.provider}
                    label="AI Provider"
                    onChange={(e) => handleProviderChange(e.target.value)}
                    sx={{
                      color: purpleTheme.text.primary,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: `${purpleTheme.secondary}60`,
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: purpleTheme.secondary,
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: purpleTheme.primary,
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
                {tempSettings.provider && (
                  <FormControl fullWidth margin="normal">
                    <InputLabel sx={{ color: purpleTheme.text.secondary }}>
                      Model
                    </InputLabel>
                    <Select
                      value={tempSettings.model}
                      label="Model"
                      onChange={(e) => setTempSettings({ ...tempSettings, model: e.target.value })}
                      sx={{
                        color: purpleTheme.text.primary,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: `${purpleTheme.secondary}60`,
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: purpleTheme.secondary,
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: purpleTheme.primary,
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
            {tempSettings.provider && (
              <Card 
                variant="outlined" 
                sx={{ 
                  mb: 3,
                  backgroundColor: purpleTheme.background.card,
                  borderColor: `${purpleTheme.secondary}60`,
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Typography 
                      variant="h6"
                      sx={{ color: purpleTheme.text.accent }}
                    >
                      API Key
                    </Typography>
                    <Chip 
                      size="small" 
                      label={PROVIDERS[tempSettings.provider].name}
                      sx={{
                        backgroundColor: `${purpleTheme.secondary}30`,
                        color: purpleTheme.text.primary,
                        borderColor: purpleTheme.secondary,
                      }}
                      variant="outlined"
                    />
                  </Box>
                  
                  <TextField
                    fullWidth
                    label={`${PROVIDERS[tempSettings.provider].name} API Key`}
                    type={showApiKey ? 'text' : 'password'}
                    value={tempSettings.apiKey}
                    onChange={(e) => setTempSettings({ ...tempSettings, apiKey: e.target.value })}
                    placeholder={`Enter your ${PROVIDERS[tempSettings.provider].name} API key...`}
                    helperText={`Should start with "${PROVIDERS[tempSettings.provider].keyPrefix}"`}
                    sx={{
                      '& .MuiInputLabel-root': {
                        color: purpleTheme.text.secondary,
                      },
                      '& .MuiOutlinedInput-root': {
                        color: purpleTheme.text.primary,
                        '& fieldset': {
                          borderColor: `${purpleTheme.secondary}60`,
                        },
                        '&:hover fieldset': {
                          borderColor: purpleTheme.secondary,
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: purpleTheme.primary,
                        },
                      },
                      '& .MuiFormHelperText-root': {
                        color: purpleTheme.text.secondary,
                      },
                    }}
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={() => setShowApiKey(!showApiKey)}
                          edge="end"
                          sx={{ color: purpleTheme.text.secondary }}
                        >
                          {showApiKey ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      ),
                    }}
                  />
                  
                  <Box mt={2}>
                    <Link 
                      href={PROVIDERS[tempSettings.provider].website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        color: purpleTheme.accent,
                        '&:hover': {
                          color: purpleTheme.text.accent,
                        }
                      }}
                    >
                      <InfoIcon fontSize="small" />
                      Get your {PROVIDERS[tempSettings.provider].name} API key
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
                  borderColor: purpleTheme.secondary,
                  color: purpleTheme.text.secondary,
                  '&:hover': {
                    borderColor: purpleTheme.text.accent,
                    backgroundColor: `${purpleTheme.secondary}20`,
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
                  backgroundColor: purpleTheme.primary,
                  '&:hover': {
                    backgroundColor: purpleTheme.primaryDark,
                  },
                  '&:disabled': {
                    backgroundColor: `${purpleTheme.primary}50`,
                    color: `${purpleTheme.text.primary}50`,
                  }
                }}
              >
                Save Settings
              </Button>
            </Box>
          </Paper>

          {/* Help Dialog */}
          <Dialog 
            open={helpDialogOpen} 
            onClose={() => setHelpDialogOpen(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: {
                backgroundColor: purpleTheme.background.paper,
                color: purpleTheme.text.primary,
              }
            }}
          >
            <DialogTitle sx={{ color: purpleTheme.text.accent }}>
              How to Get API Keys
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph sx={{ color: purpleTheme.text.secondary }}>
                Follow these steps to obtain API keys from each provider:
              </Typography>
              
              {Object.entries(PROVIDERS).map(([key, config]) => (
                <Box key={key} mb={3}>
                  <Typography 
                    variant="h6" 
                    gutterBottom
                    sx={{ color: purpleTheme.text.accent }}
                  >
                    {config.name}
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="1. Create an account"
                        secondary={
                          <Link 
                            href={config.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            sx={{ color: purpleTheme.accent }}
                          >
                            {config.website}
                          </Link>
                        }
                        sx={{
                          '& .MuiListItemText-primary': {
                            color: purpleTheme.text.primary,
                          }
                        }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="2. Navigate to API Keys section"
                        sx={{
                          '& .MuiListItemText-primary': {
                            color: purpleTheme.text.primary,
                          }
                        }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="3. Create a new API key"
                        sx={{
                          '& .MuiListItemText-primary': {
                            color: purpleTheme.text.primary,
                          }
                        }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="4. Copy the key (starts with)"
                        secondary={
                          <code style={{ color: purpleTheme.accent }}>
                            {config.keyPrefix}...
                          </code>
                        }
                        sx={{
                          '& .MuiListItemText-primary': {
                            color: purpleTheme.text.primary,
                          }
                        }}
                      />
                    </ListItem>
                  </List>
                  <Link 
                    href={config.docsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    sx={{ 
                      ml: 2,
                      color: purpleTheme.accent,
                      '&:hover': {
                        color: purpleTheme.text.accent,
                      }
                    }}
                  >
                    📚 Documentation
                  </Link>
                  {key !== Object.keys(PROVIDERS)[Object.keys(PROVIDERS).length - 1] && (
                    <Divider sx={{ mt: 2, borderColor: `${purpleTheme.secondary}40` }} />
                  )}
                </Box>
              ))}
              
              <Alert 
                severity="info" 
                sx={{ 
                  mt: 2,
                  backgroundColor: `${purpleTheme.accent}20`,
                  color: purpleTheme.text.primary,
                  '& .MuiAlert-icon': {
                    color: purpleTheme.accent,
                  },
                }}
              >
                <Typography variant="body2">
                  <strong>Privacy Note:</strong> Your API keys are stored locally in your browser localStorage 
                  and are never sent to our servers. Keep your keys secure and never share them publicly.
                </Typography>
              </Alert>
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => setHelpDialogOpen(false)}
                sx={{
                  color: purpleTheme.text.secondary,
                  '&:hover': {
                    backgroundColor: `${purpleTheme.secondary}20`,
                  }
                }}
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default SettingsPage;