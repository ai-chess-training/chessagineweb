import React, { useState } from "react";
import {
    Button,
    Typography,
    Stack
} from "@mui/material";

interface PGNUploaderProps {
    loadPGN: (pgn: string) => void;
}

const UserPGNUploader: React.FC<PGNUploaderProps> = ({ loadPGN }) => {
    const [pgnContent, setPgnContent] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".pgn")) {
            alert("Please upload a valid .pgn file");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            console.log(pgnContent);
            setPgnContent(content);
            loadPGN(content);
        };
        reader.readAsText(file);
    };

    return (
      <>
      
            <Typography variant="subtitle1" sx={{ color: "wheat" }}>
                Upload a single PGN file
            </Typography>

            <Stack spacing={2} sx={{ mb: 3 }}>
                <Button
                    variant="contained"
                    component="label"
                >
                    Choose PGN File
                    <input
                        type="file"
                        accept=".pgn"
                        hidden
                        onChange={handleFileChange}
                    />
                </Button>
            </Stack>
        </>
    );
};

export default UserPGNUploader;
