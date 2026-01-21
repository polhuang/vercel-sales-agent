import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';

interface CSVFileInputProps {
  onSubmit: (filePath: string) => void;
  onCancel: () => void;
}

export function CSVFileInput({ onSubmit, onCancel }: CSVFileInputProps) {
  const handleSubmit = (value: string) => {
    onSubmit(value);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Import Startups from CSV
      </Text>
      <Box marginTop={1}>
        <Text dimColor>Enter the path to your CSV file</Text>
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Text>CSV File Path:</Text>
        <Box marginTop={1}>
          <TextInput
            placeholder="e.g., ./startups.csv or /path/to/startups.csv"
            onSubmit={handleSubmit}
          />
        </Box>
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Text dimColor>CSV Format Requirements:</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text dimColor>- Must have header row with "name" or "company" column</Text>
          <Text dimColor>- Must have "url" or "website" column</Text>
          <Text dimColor>- Example: name,url</Text>
          <Text dimColor>           Acme Inc,https://acme.com</Text>
        </Box>
      </Box>

      <Box marginTop={2}>
        <Text dimColor>Press Ctrl+C to cancel and return to menu</Text>
      </Box>
    </Box>
  );
}
