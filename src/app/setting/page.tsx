"use client";
import React from "react";
import {
  Box,
  Container,
  Paper,
  ThemeProvider,
  createTheme,
} from "@mui/material";

import { purpleTheme } from "@/componets/lichess/UserGameSelect";
import ModelSetting from "@/componets/tabs/ModelSetting";

// Create Material-UI theme
const muiTheme = createTheme({
  palette: {
    mode: "dark",
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
          "& .MuiInputBase-root": {
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

const SettingsPage: React.FC = () => {
  return (
    <ThemeProvider theme={muiTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: purpleTheme.background.main,
          py: 4,
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
            <ModelSetting />
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default SettingsPage;
