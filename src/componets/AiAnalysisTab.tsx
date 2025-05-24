// // components/tabs/AiAnalysisTab.tsx
// "use client";

// import { Box, CircularProgress, Typography } from "@mui/material";
// import ReactMarkdown from "react-markdown";

// interface AiAnalysisTabProps {
//   result: string | null;
//   loading: boolean;
// }

// export default function AiAnalysisTab({ result, loading }: AiAnalysisTabProps) {
//   return (
//     <>
//       <Typography variant="h6" gutterBottom>
//         AI Analysis
//       </Typography>

//       {loading ? (
//         <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
//           <CircularProgress />
//         </Box>
//       ) : result ? (
//         <Box sx={{ color: "wheat", fontSize: "0.95rem" }}>
//           <ReactMarkdown>{result}</ReactMarkdown>
//         </Box>
//       ) : (
//         <Typography sx={{ color: "wheat" }}>
//           Click AI Analysis to get comprehensive analysis powered by Stockfish engine data and opening theory, or click Stockfish Only for raw engine evaluation. You can also click individual engine lines or opening moves for specific analysis.
//         </Typography>
//       )}
//     </>
//   );
// }