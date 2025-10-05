"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useMediaQuery,
  useTheme,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { 
  FaChessPawn, 
  FaChessBoard, 
  FaDiscord, 
  FaPuzzlePiece, 
  FaGear,
  FaBook
} from "react-icons/fa6";
import { useClerk } from "@clerk/nextjs";
import {
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { GitHub } from "@mui/icons-material";

export default function NavBar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { openSignIn, openSignUp } = useClerk();
  const router = useRouter();

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  const handleSignIn = () => {
    openSignIn();
  };

  const handleSignUp = () => {
    openSignUp();
  };

  const handleLogoClick = () => {
    router.push("/");
  };

  // Public navigation links (available to everyone)
  const publicNavLinks = [
    { 
      label: "Docs", 
      href: "/docs", 
      icon: <FaBook />
    },
    {
      label: "Github",
      href: "https://github.com/jalpp/chessagineweb",
      icon: <GitHub/>
    },
    {
      label: "Discord",
      href: "https://discord.gg/3RpEnvmZwp",
      icon: <FaDiscord />,
    },
  ];

  const authNavLinks = [
    { 
      label: "Analyze Position", 
      href: "/position", 
      icon: <FaChessBoard />
    },
    { 
      label: "Analyze Game", 
      href: "/game", 
      icon: <FaChessPawn />
    },
    { 
      label: "Puzzles", 
      href: "/puzzle", 
      icon: <FaPuzzlePiece />
    },
    { 
      label: "Settings", 
      href: "/setting", 
      icon: <FaGear />
    },
  ];

  

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: "#111", mb: 3 }}>
        <Toolbar>
          <Typography 
            variant="h6" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: "bold", 
              cursor: "pointer" 
            }}
            onClick={handleLogoClick}
          >
            ChessAgine
          </Typography>
          
          {isMobile ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SignedIn>
                <UserButton />
              </SignedIn>
              <IconButton color="inherit" onClick={toggleDrawer(true)}>
                <MenuIcon />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Public links - always visible */}
              {publicNavLinks.map((link) => (
                <Button 
                  key={link.href} 
                  color="inherit" 
                  href={link.href}
                  startIcon={link.icon}
                >
                  {link.label}
                </Button>
              ))}

              {/* Authenticated links - only when signed in */}
              <SignedIn>
                {authNavLinks.map((link) => (
                  <Button 
                    key={link.href} 
                    color="inherit" 
                    href={link.href}
                    startIcon={link.icon}
                  >
                    {link.label}
                  </Button>
                ))}

              </SignedIn>

              {/* Auth buttons for signed out users */}
              <SignedOut>
                <Button 
                  color="inherit" 
                  onClick={handleSignIn}
                  sx={{ 
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  Sign In
                </Button>
                <Button 
                  color="inherit" 
                  onClick={handleSignUp}
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                    }
                  }}
                >
                  Sign Up
                </Button>
              </SignedOut>
              
              {/* User button for signed in users */}
              <SignedIn>
                <UserButton />
              </SignedIn>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Mobile Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box
          sx={{
            width: 280,
            bgcolor: "#111",
            height: "100%",
            color: "white",
          }}
          role="presentation"
          onClick={toggleDrawer(false)}
        >
          <List>
            {/* Public navigation items */}
            {publicNavLinks.map((link) => (
              <ListItem
                key={link.href}
                component="a"
                href={link.href}
                sx={{
                  textDecoration: "none",
                  color: "inherit",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                  {link.icon}
                </ListItemIcon>
                <ListItemText primary={link.label} />
              </ListItem>
            ))}

            {/* Authenticated navigation items */}
            <SignedIn>
              <Divider sx={{ my: 1, bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
              
              {authNavLinks.map((link) => (
                <ListItem
                  key={link.href}
                  component="a"
                  href={link.href}
                  sx={{
                    textDecoration: "none",
                    color: "inherit",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.1)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                    {link.icon}
                  </ListItemIcon>
                  <ListItemText primary={link.label} />
                </ListItem>
              ))}

              <Divider sx={{ my: 1, bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
            </SignedIn>

            {/* Auth section for signed out users */}
            <SignedOut>
              <Divider sx={{ my: 1, bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
              <ListItem
                onClick={handleSignIn}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                <ListItemText primary="Sign In" />
              </ListItem>
              <ListItem
                onClick={handleSignUp}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                <ListItemText primary="Sign Up" />
              </ListItem>
            </SignedOut>
          </List>
        </Box>
      </Drawer>
    </>
  );
}