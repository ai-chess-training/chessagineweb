// // components/AnalysisButtons.tsx
// "use client";

// import { Button, Stack } from "@mui/material";
// import { RiRobot2Line } from "react-icons/ri";
// import { GiChessKing } from "react-icons/gi";
// import { BiBookOpen } from "react-icons/bi";

// interface AnalysisButtonsProps {
//   onAiAnalysis: () => void;
//   onStockfishAnalysis: () => void;
//   onOpeningExplorer: () => void;
//   isAiLoading: boolean;
//   isStockfishLoading: boolean;
//   isOpeningLoading: boolean;
//   engineReady: boolean;
// }

// export default function AnalysisButtons({
//   onAiAnalysis,
//   onStockfishAnalysis,
//   onOpeningExplorer,
//   isAiLoading,
//   isStockfishLoading,
//   isOpeningLoading,
//   engineReady,
// }: AnalysisButtonsProps) {
//   return (
//     <Stack spacing={1} sx={{ width: "100%" }}>
//       {/* Analysis Buttons */}
//       <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
//         <Button
//           variant="contained"
//           onClick={onAiAnalysis}
//           disabled={isAiLoading || !engineReady}
//           startIcon={<RiRobot2Line />}
//           fullWidth
//           sx={{ backgroundColor: "#9c27b0" }}
//         >
//           {isAiLoading ? "AI + Engine Analyzing..." : engineReady ? "AI Analysis" : "Engine Loading..."}
//         </Button>

//         <Button
//           variant="contained"
//           onClick={onStockfishAnalysis}
//           disabled={isStockfishLoading || !engineReady}
//           startIcon={<GiChessKing />}
//           fullWidth
//           sx={{ backgroundColor: "#2e7d32" }}
//         >
//           {isStockfishLoading ? "Stockfish Running..." : engineReady ? "Stockfish Only" : "SF Loading..."}
//         </Button>
//       </Stack>

//       {/* Opening Explorer Button */}
//       <Button
//         variant="contained"
//         onClick={onOpeningExplorer}
//         disabled={isOpeningLoading}
//         startIcon={<BiBookOpen />}
//         fullWidth
//         sx={{ backgroundColor: "#1976d2" }}
//       >
//         {isOpeningLoading ? "Loading Opening Data..." : "Lichess Opening Explorer"}
//       </Button>
//     </Stack>
//   );
// }